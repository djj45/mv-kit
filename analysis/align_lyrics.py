#!/usr/bin/env python3
"""Word-level lyric timing -> PROJECT/data/lyrics.json + lyrics.js

  uv run --extra align analysis/align_lyrics.py projects/my-song --lang en      # Whisper + alignment
  uv run analysis/align_lyrics.py projects/my-song --no-whisper                 # LRC line times only

Input: PROJECT/lyrics.txt — one sung line per line. Blank lines and lines starting with # are ignored.
A line may start with an LRC timestamp, e.g. `[01:02.50] I'm upping my P(doom)`: with Whisper those
times keep matches from drifting to the wrong line; with --no-whisper they are the only timing and the
words are spread over each line by length. Chinese / Japanese / Korean are timed per character.

Steps
  1. Transcribe the vocals (stems/vocals.wav if present, else the mix) with Whisper word timestamps:
     mlx-whisper on Apple Silicon (install the `mlx` extra), else faster-whisper (`align` extra).
     The result is cached in data/whisper_words.json (--retranscribe to redo).
  2. Align the lyric words to the recognised words (global Needleman–Wunsch with fuzzy matching).
     Matched words take Whisper's times; the rest are interpolated between their neighbours.
  3. Apply manual fixes from data/lyrics_fix.json, e.g.
       [ {"line": "sudden drop", "word": "drop", "start": 11.2},
         {"line": 5, "word": 3, "start": 20.27, "end": 20.8} ]
     (line = index or text contained in the line; word = index or the word itself).
  4. Write lyrics.json/.js and print a report of low-confidence words to check by ear in the preview
     (index.html, press d for the debug overlay that shows the word timings).
  5. Write data/timing.json: the same timing (and the fixes) without the lyric text, so git can keep it while
     the lyric files stay local (tools/lyric_timing.py merge rebuilds them from lyrics.txt).
"""
import argparse
import json
import re
import sys
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'tools'))
from mvproject import audio_path, load_project, stems_dir, write_data  # noqa: E402

CJK = '぀-ヿ㐀-䶿一-鿿豈-﫿가-힯'
TOKEN = re.compile(f'[{CJK}]|[^\\s{CJK}]+')
LRC = re.compile(r'^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*')


def key(s):
    s = unicodedata.normalize('NFKC', s).lower().replace('’', "'").replace('‘', "'")
    return re.sub(r"[^\w']", '', s).strip("'")


def is_cjk(tok):
    return bool(re.fullmatch(f'[{CJK}]', tok))


def read_lyrics(path):
    lines = []
    for raw in path.read_text(encoding='utf-8').splitlines():
        if not raw.strip() or raw.lstrip().startswith('#'):
            continue
        t = None
        m = LRC.match(raw)
        if m:
            t = int(m.group(1)) * 60 + float(m.group(2))
            raw = raw[m.end():]
        text = raw.strip()
        if not text:
            continue
        toks = TOKEN.findall(text)
        words = []
        for i, tk in enumerate(toks):
            w = {'w': tk}
            if is_cjk(tk) and i + 1 < len(toks) and is_cjk(toks[i + 1]):
                w['join'] = True  # no space after it in display
            words.append(w)
        lines.append({'text': text, 'lrc': t, 'words': words})
    return lines


# ---------------------------------------------------------------- transcription
def transcribe(audio, lang, model, backend, prompt):
    if backend in ('auto', 'mlx'):
        try:
            import mlx_whisper
            print(f'mlx-whisper {model} …')
            r = mlx_whisper.transcribe(str(audio), path_or_hf_repo=f'mlx-community/whisper-{model}', word_timestamps=True,
                                       language=lang, initial_prompt=prompt, condition_on_previous_text=False)
            return [{'w': w['word'].strip(), 'start': float(w['start']), 'end': float(w['end']), 'p': float(w.get('probability', 1))}
                    for seg in r['segments'] for w in seg.get('words', [])]
        except ImportError:
            if backend == 'mlx':
                raise SystemExit('mlx-whisper is not installed: uv run --extra mlx …')
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise SystemExit('No Whisper backend installed. Use `uv run --extra align …` (faster-whisper) or '
                         '`--extra mlx` on Apple Silicon, or --no-whisper with LRC timestamps in lyrics.txt.')
    print(f'faster-whisper {model} …')
    m = WhisperModel(model, device='auto', compute_type='auto')
    segs, _ = m.transcribe(str(audio), language=lang, word_timestamps=True, initial_prompt=prompt,
                           condition_on_previous_text=False, vad_filter=False)
    return [{'w': w.word.strip(), 'start': float(w.start), 'end': float(w.end), 'p': float(w.probability)}
            for s in segs for w in (s.words or [])]


def split_rec(words):
    """Recognised words -> tokens comparable with the lyric tokens (CJK split per character)."""
    out = []
    for w in words:
        toks = TOKEN.findall(w['w'])
        if not toks:
            continue
        n = len(toks)
        for i, tk in enumerate(toks):
            a = w['start'] + (w['end'] - w['start']) * i / n
            b = w['start'] + (w['end'] - w['start']) * (i + 1) / n
            k = key(tk)
            if k:
                out.append({'w': tk, 'k': k, 'start': a, 'end': b, 'p': w.get('p', 1)})
    return out


# ---------------------------------------------------------------- alignment
def sim(a, b):
    if a == b:
        return 2.0
    if not a or not b:
        return -1.0
    r = SequenceMatcher(None, a, b).ratio()
    return 1.0 if r >= 0.75 else (0.0 if r >= 0.5 else -1.0)


def needleman_wunsch(A, B, gap=-0.6):
    n, m = len(A), len(B)
    import numpy as np
    S = np.zeros((n + 1, m + 1))
    T = np.zeros((n + 1, m + 1), np.int8)  # 0 diag, 1 up (lyric gap), 2 left (rec gap)
    S[1:, 0] = gap * np.arange(1, n + 1)
    S[0, 1:] = gap * np.arange(1, m + 1)
    T[1:, 0] = 1
    T[0, 1:] = 2
    for i in range(1, n + 1):
        ai = A[i - 1]
        for j in range(1, m + 1):
            d = S[i - 1, j - 1] + sim(ai, B[j - 1])
            u = S[i - 1, j] + gap
            l_ = S[i, j - 1] + gap
            if d >= u and d >= l_:
                S[i, j], T[i, j] = d, 0
            elif u >= l_:
                S[i, j], T[i, j] = u, 1
            else:
                S[i, j], T[i, j] = l_, 2
    pairs, i, j = [], n, m
    while i > 0 or j > 0:
        t = T[i, j]
        if i > 0 and j > 0 and t == 0:
            pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i > 0 and (t == 1 or j == 0):
            i -= 1
        else:
            j -= 1
    return pairs[::-1]


def interpolate(words):
    """Fill words without times between timed neighbours, proportional to their length."""
    n = len(words)
    i = 0
    while i < n:
        if words[i].get('start') is not None:
            i += 1
            continue
        j = i
        while j < n and words[j].get('start') is None:
            j += 1
        lo = words[i - 1]['end'] if i > 0 else None
        hi = words[j]['start'] if j < n else None
        wts = [len(key(w['w'])) + 1 for w in words[i:j]]
        tot = sum(wts)
        if lo is None and hi is None:
            raise SystemExit('no timing at all: need Whisper matches or LRC timestamps')
        if lo is None:
            lo = hi - 0.3 * (j - i)
        if hi is None:
            hi = lo + 0.3 * (j - i)
        if hi - lo < 0.08 * (j - i):  # squeezed: borrow a little on both sides
            mid = (lo + hi) / 2
            lo, hi = mid - 0.04 * (j - i), mid + 0.04 * (j - i)
        t = lo
        for w, wt in zip(words[i:j], wts):
            d = (hi - lo) * wt / tot
            w['start'], w['end'], w['conf'] = round(t, 3), round(t + d, 3), 0.2
            t += d
        i = j


def finalize(lines):
    for l in lines:  # fixed words given only a start: last until the next word of the line starts
        ws = l['words']
        for i, w in enumerate(ws):
            if w.pop('_end_auto', False):
                w['end'] = ws[i + 1]['start'] if i + 1 < len(ws) else w['start'] + max(0.3, min(2.5, w.get('_dur', 0.5)))
            w.pop('_dur', None)
    flat = [w for l in lines for w in l['words']]
    for a, b in zip(flat, flat[1:]):  # monotonic, no overlaps, minimum length
        if b['start'] < a['start']:
            b['start'] = a['start'] + 0.02
        if a['end'] > b['start']:
            a['end'] = b['start']
        if a['end'] - a['start'] < 0.05:
            a['end'] = min(a['start'] + 0.05, b['start']) if b['start'] > a['start'] + 0.01 else a['start'] + 0.05
    for w in flat:
        w['start'], w['end'] = round(w['start'], 3), round(max(w['end'], w['start'] + 0.03), 3)
    for l in lines:
        l['start'], l['end'] = l['words'][0]['start'], l['words'][-1]['end']


def apply_fixes(lines, fixes):
    for fx in fixes:
        L = fx['line']
        if isinstance(L, str):
            cand = [l for l in lines if key(L) in key(l['text'].replace(' ', ''))] or [l for l in lines if L.lower() in l['text'].lower()]
            if not cand:
                print(f'fix: no line containing "{L}"')
                continue
            line = cand[fx.get('nth', 0)]
        else:
            line = lines[L]
        W = fx.get('word', 0)
        if isinstance(W, str):
            idx = [i for i, w in enumerate(line['words']) if key(w['w']) == key(W)]
            if not idx:
                print(f'fix: no word "{W}" in "{line["text"]}"')
                continue
            W = idx[fx.get('word_nth', 0)]
        w = line['words'][W]
        if w.get('start') is not None and w.get('end') is not None:
            w['_dur'] = w['end'] - w['start']
        for k in ('start', 'end', 'syl'):
            if k in fx:
                w[k] = fx[k]
        if 'end' not in fx:
            w['_end_auto'] = True  # finalize() runs it up to the next word
            w['end'] = w['start'] + 0.05
        w['conf'] = 1.0
        w['fixed'] = True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project')
    ap.add_argument('--lang', default=None, help='en, zh, ja, ko … (default: detect)')
    ap.add_argument('--model', default='large-v3-turbo')
    ap.add_argument('--backend', choices=['auto', 'mlx', 'faster'], default='auto')
    ap.add_argument('--vocals', help='audio to transcribe (default: stems/vocals.wav, else the song)')
    ap.add_argument('--retranscribe', action='store_true')
    ap.add_argument('--no-whisper', action='store_true', help='use only the LRC timestamps in lyrics.txt')
    ap.add_argument('--words', help='use this JSON list of recognised words [{w,start,end}] instead of Whisper')
    ap.add_argument('--max-drift', type=float, default=4.0, help='with LRC times: drop matches further than this from their line')
    a = ap.parse_args()

    cfg = load_project(a.project)
    PD = cfg['_dir']
    lf = PD / 'lyrics.txt'
    if not lf.exists():
        raise SystemExit(f'{lf} not found — one sung line per line')
    lines = read_lyrics(lf)
    print(f'{len(lines)} lines, {sum(len(l["words"]) for l in lines)} words')

    if a.no_whisper:
        if any(l['lrc'] is None for l in lines):
            raise SystemExit('--no-whisper needs an LRC timestamp on every line')
        for i, l in enumerate(lines):  # spread each line's words from its time to the next line's
            end = lines[i + 1]['lrc'] - 0.15 if i + 1 < len(lines) else l['lrc'] + 0.4 * len(l['words'])
            wts = [len(key(w['w'])) + 1 for w in l['words']]
            t, tot = l['lrc'], sum(wts)
            for w, wt in zip(l['words'], wts):
                d = (end - l['lrc']) * wt / tot
                w['start'], w['end'], w['conf'] = round(t, 3), round(t + d, 3), 0.3
                t += d
    else:
        cache = PD / 'data' / 'whisper_words.json'
        if a.words:
            rec = json.loads(Path(a.words).read_text())
        elif cache.exists() and not a.retranscribe:
            rec = json.loads(cache.read_text())
            print(f'using cached {cache.name} ({len(rec)} words; --retranscribe to redo)')
        else:
            st = stems_dir(cfg)
            src = Path(a.vocals) if a.vocals else (st / 'vocals.wav' if st and (st / 'vocals.wav').exists() else audio_path(cfg))
            prompt = ' '.join(l['text'] for l in lines)[:600]
            rec = transcribe(src, a.lang, a.model, a.backend, prompt)
            cache.parent.mkdir(exist_ok=True)
            cache.write_text(json.dumps(rec, ensure_ascii=False, indent=0))
        R = split_rec(rec)
        flat = [w for l in lines for w in l['words']]
        line_of = [li for li, l in enumerate(lines) for _ in l['words']]
        A = [key(w['w']) for w in flat]
        pairs = needleman_wunsch(A, [r['k'] for r in R])
        matched = 0
        for i, j in pairs:
            s_ = sim(A[i], R[j]['k'])
            if s_ < 0:
                continue
            lrc = lines[line_of[i]]['lrc']
            if lrc is not None and abs(R[j]['start'] - lrc) > a.max_drift:
                continue
            flat[i]['start'], flat[i]['end'] = R[j]['start'], R[j]['end']
            flat[i]['conf'] = 1.0 if s_ >= 2 else 0.7
            matched += 1
        print(f'aligned {matched}/{len(flat)} words to {len(R)} recognised words')
        interpolate(flat)

    fix = PD / 'data' / 'lyrics_fix.json'
    if fix.exists():
        apply_fixes(lines, json.loads(fix.read_text()))
        print(f'applied {fix.name}')
        if not a.no_whisper:  # fixed words are anchors: re-spread the interpolated words between them
            flat = [w for l in lines for w in l['words']]
            for w in flat:
                if not w.get('fixed') and w.get('conf', 1) < 0.5:
                    w['start'] = w['end'] = None
            interpolate(flat)
    finalize(lines)

    doc = {'version': 1, 'lines': [{'text': l['text'], 'start': l['start'], 'end': l['end'],
                                    'words': [{k: w[k] for k in ('w', 'start', 'end', 'conf', 'join', 'syl', 'fixed') if k in w} for w in l['words']]}
                                   for l in lines]}
    f = write_data(cfg, 'lyrics', doc)
    low = [(li, w) for li, l in enumerate(doc['lines']) for w in l['words'] if w.get('conf', 1) < 0.5]
    rep = [f'{len(low)} words with low confidence (interpolated) — check them in the preview (press d):']
    for li, w in low:
        rep.append(f'  line {li:3d}  {w["start"]:8.2f}  {w["w"]}   ({doc["lines"][li]["text"][:60]})')
    (PD / 'data' / 'lyrics_report.txt').write_text('\n'.join(rep) + '\n', encoding='utf-8')
    print('\n'.join(rep[:25]) + ('\n  …' if len(rep) > 25 else ''))
    print(f'-> {f}')
    from lyric_timing import export   # the same timing without the text: data/timing.json, the part git keeps
    print(f'-> {export(cfg, quiet=True)}')


if __name__ == '__main__':
    main()
