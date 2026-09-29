#!/usr/bin/env python3
"""Lyric timing tuner — calibrate every word/character against a spectrogram, by ear and by eye.

  uv run tools/tune_lyrics.py projects/my-song              # opens http://127.0.0.1:8765 in the browser
  uv run tools/tune_lyrics.py projects/my-song --port 9000 --no-open

The page shows the song's spectrogram (vocal range, log frequency), a vocal-onset curve, the beat grid and
the lyrics: one vertical line per word (per character for Chinese / Japanese / Korean). Drag a line onto the
moment the singer starts that sound, play the stretch between two lines as often as needed (space, loop),
then save: the changes are merged into data/lyrics_fix.json and analysis/align_lyrics.py re-runs (with the
cached Whisper result, so it takes seconds). Fixed words become anchors — the words Whisper could not place
are re-spread between them.

Needs numpy + pillow + ffmpeg (already mv-kit dependencies). Uses stems/vocals.wav too if it exists
(analysis/separate.py): a much cleaner picture of where each syllable starts.
"""
import argparse
import base64
import json
import subprocess
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'analysis'))
from mvproject import KIT, audio_path, decode, load_project, stems_dir  # noqa: E402

SPEC_VERSION = 2
SR = 22050
HOP = 110                 # ≈ 200 columns per second (5 ms)
NFFT = 1024
ROWS, FMIN, FMAX = 240, 60.0, 8000.0
CHUNK = 8192              # columns per PNG tile

# magma-like colour map
_CM = [(0.0, (0, 0, 4)), (0.13, (28, 16, 68)), (0.25, (79, 18, 123)), (0.38, (129, 37, 129)), (0.5, (181, 54, 122)),
       (0.63, (229, 80, 100)), (0.75, (251, 135, 97)), (0.88, (254, 194, 135)), (1.0, (252, 253, 191))]


def lut():
    import numpy as np
    xs = np.array([p for p, _ in _CM]); cs = np.array([c for _, c in _CM], float)
    v = np.linspace(0, 1, 256)
    return np.stack([np.interp(v, xs, cs[:, k]) for k in range(3)], 1).astype(np.uint8)


def band_matrix(freqs):
    """Triangular log-frequency filters: ROWS × bins, each row summing to 1."""
    import numpy as np
    c = np.geomspace(FMIN, FMAX, ROWS)
    r = c[1] / c[0]
    M = np.zeros((ROWS, len(freqs)), np.float32)
    for i, f in enumerate(c):
        lo, hi = f / r, f * r
        w = np.where(freqs < f, (freqs - lo) / (f - lo), (hi - freqs) / (hi - f))
        w = np.clip(w, 0, None)
        if w.sum() == 0:  # narrower than a bin: linear interpolation
            j = np.searchsorted(freqs, f); j0 = max(1, j) - 1; t = (f - freqs[j0]) / (freqs[j0 + 1] - freqs[j0])
            w[j0], w[j0 + 1] = 1 - t, t
        M[i] = w / w.sum()
    return M, c


def build_spec(src, out_dir):
    """Spectrogram tiles + vocal onset curve for one audio file, cached in out_dir."""
    import numpy as np
    from numpy.lib.stride_tricks import sliding_window_view
    from PIL import Image
    meta_f = out_dir / 'meta.json'
    st = src.stat()
    stamp = f'{SPEC_VERSION}:{st.st_size}:{int(st.st_mtime)}'
    if meta_f.exists():
        m = json.loads(meta_f.read_text())
        if m.get('stamp') == stamp and all((out_dir / f'{k}.png').exists() for k in range(m['tiles'])):
            return m
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f'spectrogram of {src.name} …', flush=True)
    x = decode(src, SR).astype(np.float32)
    x = np.concatenate([np.zeros(NFFT // 2, np.float32), x, np.zeros(NFFT, np.float32)])  # column k is centred on k*HOP
    frames = sliding_window_view(x, NFFT)[::HOP]
    n = frames.shape[0]
    win = np.hanning(NFFT).astype(np.float32)
    M, centers = band_matrix(np.fft.rfftfreq(NFFT, 1 / SR))
    S = np.empty((ROWS, n), np.float32)
    for a in range(0, n, 4096):
        P = np.abs(np.fft.rfft(frames[a:a + 4096] * win, axis=1)) ** 2
        S[:, a:a + 4096] = (M @ P.T.astype(np.float32))
    D = 10 * np.log10(S + 1e-10)
    vmax = float(np.percentile(D, 99.7)); vmin = vmax - 72
    V = np.clip((D - vmin) / (vmax - vmin), 0, 1)
    img = lut()[(V[::-1] * 255).astype(np.uint8)]           # high frequencies on top
    tiles = (n + CHUNK - 1) // CHUNK
    for k in range(tiles):
        Image.fromarray(img[:, k * CHUNK:(k + 1) * CHUNK]).save(out_dir / f'{k}.png', optimize=False, compress_level=3)
    # vocal onset curve: positive spectral flux in 150–4000 Hz, lightly smoothed
    sel = (centers > 150) & (centers < 4000)
    flux = np.maximum(0, np.diff(D[sel], axis=1, prepend=D[sel][:, :1])).sum(0)
    flux = np.convolve(flux, np.hanning(5) / np.hanning(5).sum(), mode='same')
    flux = np.clip(flux / (np.percentile(flux, 99.5) + 1e-9), 0, 1)
    m = {'stamp': stamp, 'fps': SR / HOP, 'rows': ROWS, 'fmin': FMIN, 'fmax': FMAX, 'cols': int(n), 'chunk': CHUNK, 'tiles': tiles,
         'onset': base64.b64encode((flux * 255).astype(np.uint8).tobytes()).decode()}
    meta_f.write_text(json.dumps(m))
    return m


def build_wav(src, dst):
    """Playback copy decoded by ffmpeg (same decoder as the analysis and the renderer: identical timing)."""
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return dst
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', str(dst)], check=True)
    return dst


# ---------------------------------------------------------------- lyrics_fix.json
def resolve(fx, lines, AL):
    """(line index, word index) a fix entry refers to — same rules as align_lyrics.apply_fixes."""
    L = fx.get('line')
    if isinstance(L, str):
        cand = [i for i, l in enumerate(lines) if AL.key(L) in AL.key(l['text'].replace(' ', ''))] or \
               [i for i, l in enumerate(lines) if L.lower() in l['text'].lower()]
        if len(cand) <= fx.get('nth', 0):
            return None
        li = cand[fx.get('nth', 0)]
    elif isinstance(L, int) and 0 <= L < len(lines):
        li = L
    else:
        return None
    W = fx.get('word', 0)
    words = lines[li]['words']
    if isinstance(W, str):
        idx = [i for i, w in enumerate(words) if AL.key(w['w']) == AL.key(W)]
        if len(idx) <= fx.get('word_nth', 0):
            return None
        W = idx[fx.get('word_nth', 0)]
    if not (isinstance(W, int) and 0 <= W < len(words)):
        return None
    return li, W


class Tuner:
    def __init__(self, project):
        import align_lyrics as AL
        self.AL = AL
        self.cfg = load_project(project)
        self.PD = self.cfg['_dir']
        self.cache = self.PD / 'out' / 'tuner'
        self.fix_f = self.PD / 'data' / 'lyrics_fix.json'
        self.lock = threading.Lock()
        self.srcs = {'mix': audio_path(self.cfg)}
        st = stems_dir(self.cfg)
        if st and (st / 'vocals.wav').exists():
            self.srcs['vocals'] = st / 'vocals.wav'

    def lines(self):
        return self.AL.read_lyrics(self.PD / 'lyrics.txt')

    def fixes(self):
        """Current fixes as {(li, wi): entry}."""
        if not self.fix_f.exists():
            return {}
        lines, out = self.lines(), {}
        for fx in json.loads(self.fix_f.read_text(encoding='utf-8')):
            r = resolve(fx, lines, self.AL)
            if r:
                out[r] = fx
            else:
                print('lyrics_fix.json: could not resolve', fx)
        return out

    def save(self, body):
        with self.lock:
            lines, cur = self.lines(), self.fixes()
            for li, wi in body.get('remove', []):
                cur.pop((li, wi), None)
            for e in body.get('set', []):
                li, wi = int(e['line']), int(e['word'])
                old = cur.get((li, wi), {})
                ent = {'line': li, 'word': wi, 'start': round(float(e['start']), 3)}
                end = e.get('end', old.get('end'))
                if end is not None and float(end) > ent['start']:
                    ent['end'] = round(float(end), 3)
                if 'syl' in old:
                    ent['syl'] = old['syl']
                cur[(li, wi)] = ent
            out = []
            for (li, wi), fx in sorted(cur.items()):
                ent = {'line': li, 'word': wi, **{k: fx[k] for k in ('start', 'end', 'syl') if k in fx}}
                ent['at'] = f"{lines[li]['words'][wi]['w']} · {lines[li]['text']}"   # for people; ignored by the aligner
                out.append(ent)
            self.fix_f.parent.mkdir(exist_ok=True)
            self.fix_f.write_text('[\n' + ',\n'.join(' ' + json.dumps(e, ensure_ascii=False) for e in out) + '\n]\n', encoding='utf-8')
            args = [sys.executable, str(KIT / 'analysis' / 'align_lyrics.py'), str(self.PD)]
            if not (self.PD / 'data' / 'whisper_words.json').exists():
                args.append('--no-whisper')
            r = subprocess.run(args, capture_output=True, text=True, cwd=KIT)
            log = (r.stdout + r.stderr).strip()
            print(log.splitlines()[-1] if log else '', flush=True)
            return {'ok': r.returncode == 0, 'log': log, 'fixes': len(out)}


def serve(tuner, port, open_browser):
    page_f = Path(__file__).resolve().parent / 'tuner.html'   # read on every request: edits show up on reload

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def send(self, body, ctype='application/json', code=200):
            if isinstance(body, (dict, list)):
                body = json.dumps(body, ensure_ascii=False).encode()
            elif isinstance(body, str):
                body = body.encode()
            self.send_response(code)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            p = self.path.split('?')[0]
            T = tuner
            try:
                if p in ('/', '/index.html'):
                    return self.send(page_f.read_bytes(), 'text/html; charset=utf-8')
                if p == '/api/project':
                    c = T.cfg
                    return self.send({'title': c.get('title'), 'from': c.get('from', 0), 'to': c.get('to'), 'sources': list(T.srcs)})
                if p == '/api/lyrics':
                    f = T.PD / 'data' / 'lyrics.json'
                    return self.send(f.read_bytes() if f.exists() else b'{"lines":[]}')
                if p == '/api/fixes':
                    return self.send([{'line': k[0], 'word': k[1], **{x: v[x] for x in ('start', 'end') if x in v}} for k, v in T.fixes().items()])
                if p == '/api/beats':
                    f = T.PD / 'data' / 'audio.json'
                    if not f.exists():
                        return self.send({'beats': [], 'downbeats': []})
                    a = json.loads(f.read_text())
                    return self.send({'beats': a.get('beats', []), 'downbeats': a.get('downbeats', [])})
                if p.startswith('/api/spec/'):
                    src = p.split('/')[-1]
                    return self.send(build_spec(T.srcs[src], T.cache / src))
                if p.startswith('/spec/'):
                    _, _, src, name = p.split('/')
                    return self.send((T.cache / src / name).read_bytes(), 'image/png')
                if p.startswith('/wav/'):
                    src = p.split('/')[-1]
                    return self.send(build_wav(T.srcs[src], T.cache / f'{src}.wav').read_bytes(), 'audio/wav')
                self.send({'error': 'not found'}, code=404)
            except Exception as e:  # noqa: BLE001
                self.send({'error': str(e)}, code=500)

        def do_POST(self):
            if self.path != '/api/save':
                return self.send({'error': 'not found'}, code=404)
            n = int(self.headers.get('Content-Length', 0))
            try:
                self.send(tuner.save(json.loads(self.rfile.read(n))))
            except Exception as e:  # noqa: BLE001
                self.send({'ok': False, 'log': str(e)}, code=500)

    srv = ThreadingHTTPServer(('127.0.0.1', port), H)
    url = f'http://127.0.0.1:{port}/'
    print(f'lyric tuner for {tuner.PD.name}: {url}   (Ctrl+C to stop)', flush=True)
    if open_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project')
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--no-open', action='store_true')
    a = ap.parse_args()
    t = Tuner(a.project)
    for s in t.srcs:  # build caches up front so the page opens straight away
        build_spec(t.srcs[s], t.cache / s)
        build_wav(t.srcs[s], t.cache / f'{s}.wav')
    serve(t, a.port, not a.no_open)


if __name__ == '__main__':
    main()
