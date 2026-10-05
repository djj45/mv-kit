#!/usr/bin/env python3
"""Offline renderer: drives a project's index.html in headless Chrome and pipes frames into ffmpeg.

  uv run tools/render.py projects/my-song                   # video -> projects/my-song/out/<title>.mp4
  uv run tools/render.py projects/my-song video --from 30 --to 45 --samples 4
  uv run tools/render.py projects/my-song stills --t 12.5,20,31.2
  uv run tools/render.py projects/my-song sheet --cuts      # 3 frames per shot (start / middle / end)
  uv run tools/render.py projects/my-song sheet --n 24      # 24 evenly spaced frames
  uv run tools/render.py projects/my-song strip --t 40.2 --dur 1.2   # a frame every 0.2 s from 40.2 s (key actions) → out/strip-<t>.png
  uv run tools/render.py projects/my-song model             # the characters' model sheets (MV.model) → out/model-<name>.png
  uv run tools/render.py projects/my-song check             # load, list shots, render one frame per shot, report errors,
                                                            # then the edit's problems no frame shows (MV.lint)
  uv run tools/render.py projects/my-song qa                # measure what a viewer sees: every sung word really on screen,
                                                            # text inside its boxes, the subject in frame, no dead shots
                                                            # (tools/qa.py; exit status 1 on errors; crops in out/qa/)

Video: the frames are split into --workers contiguous segments, each rendered by its own headless browser and
x264 encoder in parallel, then joined losslessly (no re-encode) and muxed with the song. Frames travel from the
page as JPEG (quality 0.98, ~47 dB against lossless; x264 at crf 18 loses more than that); --png sends lossless
PNG frames instead (about 1.7x slower per frame). The video is BT.709, converted and tagged as such.

Options: --fps N (override), --samples N (motion blur: average N sub-frames), --shutter 0.5 (fraction of a
frame), --crf 18, --preset slow, --tune animation|film|grain, --workers N (0 = auto: half the cores, at most 4, fewer when the
frame packs would not fit in memory that many times), --png, --noaudio,
--out PATH. Stills and sheets are PNG (--jpeg: JPEG stills).
Browser: Google Chrome if installed (channel "chrome"), else Playwright's Chromium (`uv run playwright
install chromium` once). Set CHROME=/path/to/chrome to force one.
"""
import argparse
import base64
import io
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import KIT, check_audio, load_project  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('mode', nargs='?', default='video', choices=['video', 'stills', 'sheet', 'strip', 'check', 'qa', 'model'])
ap.add_argument('--from', dest='t0', type=float)
ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--fps', type=int)
ap.add_argument('--samples', type=int, default=1)
ap.add_argument('--shutter', type=float, default=0.5)
ap.add_argument('--crf', type=int, default=18)
ap.add_argument('--preset', default='slow')
ap.add_argument('--tune', default=None, help='x264 tune, e.g. animation / film / grain')
ap.add_argument('--workers', type=int, default=0, help='video: parallel browsers + encoders (0 = auto)')
ap.add_argument('--png', action='store_true', help='video: lossless PNG frame transfer (slower)')
ap.add_argument('--chunk', type=float, default=4.0, help='video: seconds per chunk (the unit that is kept and reused)')
ap.add_argument('--fresh', action='store_true', help='video: render every chunk again, ignoring the kept ones')
ap.add_argument('--clean', action='store_true', help='video: delete the kept chunks after the export')
ap.add_argument('--jpeg', action='store_true', help='stills: save JPEG instead of PNG')
ap.add_argument('--noaudio', action='store_true')
ap.add_argument('--t', help='stills: comma-separated times; strip: start time')
ap.add_argument('--times', help='sheet: comma-separated times')
ap.add_argument('--n', type=int, default=0, help='sheet: N evenly spaced frames')
ap.add_argument('--cuts', action='store_true', help='sheet: start / middle / end of every shot')
ap.add_argument('--dur', type=float, default=1.2, help='strip: seconds to cover')
ap.add_argument('--step', type=float, default=0.2, help='strip: seconds between frames')
ap.add_argument('--cols', type=int, default=0, help='sheet: 3 (one shot per row with --cuts); strip: one row, up to 8 a row')
ap.add_argument('--name', help='model: only this model sheet (default: all of them)')
ap.add_argument('--out')
a = ap.parse_args()

cfg = load_project(a.project)
PD = cfg['_dir']
OUT = PD / 'out'
JPEG_Q = 0.98


_launch_note = []


def launch(p):
    """Start headless Chrome. Tries, in order: $CHROME, or Google Chrome then Playwright's Chromium; each first with the
    GPU flags (WebGL for kits/pigment.js), then without them. Every failure is reported, so the real cause is visible."""
    base = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--allow-file-access-from-files',
            '--disable-backgrounding-occluded-windows']
    # WebGL on the GPU: headless Chrome on macOS needs Metal asked for explicitly, or it may fall back to software
    # rendering. MV_ANGLE=metal|gl|vulkan|swiftshader overrides; MV_ANGLE=default passes nothing.
    angle = os.environ.get('MV_ANGLE') or ('metal' if sys.platform == 'darwin' else 'default')
    gpu = ['--enable-gpu', '--ignore-gpu-blocklist'] + ([f'--use-angle={angle}'] if angle != 'default' else [])
    kw = dict(handle_sigint=False, handle_sigterm=False)   # render.py decides how to stop on Ctrl-C
    if os.environ.get('CHROME'):
        tries = [(f"CHROME={os.environ['CHROME']}", dict(executable_path=os.environ['CHROME']))]
    else:
        tries = [('Google Chrome', dict(channel='chrome')), ("Playwright's Chromium", {})]
    errs = []
    for name, extra in tries:
        for flags in (gpu, []):
            try:
                b = p.chromium.launch(args=base + flags, **kw, **extra)
            except Exception as e:  # noqa: BLE001
                msg = str(e).strip().splitlines()
                errs.append(f"{name}{' (GPU flags)' if flags else ''}: {msg[0] if msg else e}")
                continue
            missing = all('not found' in e or "doesn't exist" in e for e in errs)   # Chrome simply isn't installed: nothing to say
            if errs and not missing and not _launch_note:
                _launch_note.append(1)
                print(f"note: using {name}{'' if flags else ' without the GPU flags'}; earlier attempts failed:\n  " + '\n  '.join(errs))
            return b
    raise RuntimeError('could not start a browser:\n  ' + '\n  '.join(errs) +
                       '\nInstall Google Chrome, or download Playwright\'s own once: uv run playwright install chromium')


class Page:
    """One headless browser with the project loaded in export mode."""

    def __init__(self, p, errors):
        self.browser = launch(p)
        self.page = self.browser.new_page(viewport={'width': 1280, 'height': 720})
        # missing optional data files are reported as warnings by the engine; required ones set MV_FATAL
        self.page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(m.text))
        self.page.on('pageerror', lambda e: errors.append(str(e)))
        self.page.goto((PD / 'index.html').as_uri() + '?export=1' + ('&qa=1' if a.mode == 'qa' else ''))
        try:
            self.page.wait_for_function('window.MV_READY === true || !!window.MV_FATAL', timeout=120000)
        except Exception:
            pass
        fatal = self.page.evaluate('window.MV_FATAL || null')
        if fatal or not self.page.evaluate('window.MV_READY === true'):
            self.browser.close()
            raise RuntimeError('PROJECT FAILED TO LOAD:\n  ' + '\n  '.join([fatal or '(timeout)', *errors]))
        self.info = self.page.evaluate('MV_EXPORT.info')

    def frame(self, t, samples, fmt, scene_errors, lock=None, errs=None):
        """Render the frame at t, return (encoded image bytes). Scene errors are recorded once per scene (and, when
        errs is a list, appended to it every time)."""
        url, err = self.page.evaluate('([t, n, s, ty, q]) => [MV_EXPORT.frame(t, n, s, ty, q), MV_EXPORT.error()]',
                                      [t, samples, a.shutter, fmt[0], fmt[1]])
        if err and errs is not None:
            errs.append(err)
        if err:
            key = err.split(':')[0]
            if lock:
                lock.acquire()
            try:
                if key not in scene_errors:
                    scene_errors[key] = err
                    print(f'\nSCENE ERROR at t={t:.3f}: {err}')
            finally:
                if lock:
                    lock.release()
        return base64.b64decode(url.split(',', 1)[1])

    def close(self):
        self.browser.close()


def report_browser_errors(errors):
    uniq = list(dict.fromkeys(e.split('\n')[0] for e in errors))
    if uniq:
        print('BROWSER ERRORS:', *uniq[:10], sep='\n  ')


def main():
    from playwright.sync_api import sync_playwright
    for w in check_audio(cfg):
        print('warning:', w)
    if a.mode == 'video':
        return video()
    errors, scene_errors = [], {}
    with sync_playwright() as p:
        try:
            pg = Page(p, errors)
        except RuntimeError as e:
            print(e)
            sys.exit(1)
        info = pg.info
        for w in info['warnings']:
            print('warning:', w)
        fps = a.fps or info['fps']
        t0 = info['from'] if a.t0 is None else a.t0
        t1 = info['to'] if a.t1 is None else a.t1
        fmt = ('image/jpeg', 0.95) if a.jpeg and a.mode == 'stills' else ('image/png', 1)

        def frame(t, samples=None):
            return pg.frame(t, samples or a.samples, fmt, scene_errors)

        if a.mode == 'qa':
            import qa
            code = qa.run(pg, info, a, cfg, OUT)
            report_browser_errors(errors)
            pg.close()
            sys.exit(code)

        if a.mode == 'model':
            names = [a.name] if a.name else info.get('models') or []
            if not names:
                print('no model sheets: register one with MV.model(name, { rows, draw }) next to the character (docs/ENGINE.md «act.js»)')
            for nm in names:
                try:
                    url = pg.page.evaluate('n => MV_EXPORT.model(n)', nm)
                except Exception as e:  # noqa: BLE001
                    print(f'model {nm}: {str(e).splitlines()[0]}')
                    continue
                err = pg.page.evaluate('MV_EXPORT.error()')
                if err:
                    print(f'MODEL ERROR: {err.splitlines()[0]}')
                f = Path(a.out) if a.out and len(names) == 1 else OUT / f'model-{nm}.png'
                f.parent.mkdir(parents=True, exist_ok=True)
                f.write_bytes(base64.b64decode(url.split(',', 1)[1]))
                print(f)
            report_browser_errors(errors)
            pg.close()
            return

        if a.mode == 'check':
            print(f"{info['title']}: {info['width']}x{info['height']} @ {info['fps']} fps, {info['from']:.2f}–{info['to']:.2f} s")
            gpu = pg.page.evaluate('''() => { const c = document.createElement('canvas'), g = c.getContext('webgl2'); if (!g) return null;
              const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }''')
            soft = gpu and any(k in gpu.lower() for k in ('swiftshader', 'llvmpipe', 'software'))
            print(f"WebGL2: {gpu or 'not available'}" + ('  (software: WebGL kits will be slow)' if soft else ''))
            for s in info['shots']:
                ms = time.time()
                frame((s['from'] + s['to']) / 2, 1)
                print(f"  {s['from']:8.3f} – {s['to']:8.3f}  {s['name']:<16} {(time.time() - ms) * 1000:6.0f} ms")
            if info.get('models'):
                print(f"model sheets: {', '.join(info['models'])} (render.py model)")
            lint = info.get('lint') or []
            if lint:
                print(f'timeline / lyric notes ({len(lint)}; red ticks on the preview\'s shot strip; project.lint tunes them):')
                for w in lint:
                    print(f"  {w['t']:8.2f}  {w['kind']:<8} {w['msg']}")
            print('OK' if not scene_errors and not errors else 'ERRORS above')

        else:
            if a.mode == 'stills':
                ts = [float(x) for x in (a.t or f'{t0}').split(',')]
            elif a.mode == 'strip':
                s0 = float(a.t) if a.t else t0
                ts = [s0 + i * a.step for i in range(int(a.dur / a.step + 1e-6) + 1)]
            elif a.times:
                ts = [float(x) for x in a.times.split(',')]
            elif a.cuts or not a.n:
                ts = []
                for s in info['shots']:
                    if s['to'] <= t0 or s['from'] >= t1:
                        continue
                    ts += [s['from'] + 0.5 / fps, (s['from'] + s['to']) / 2, s['to'] - 1.5 / fps]
            else:
                ts = [t0 + (i + 0.5) * (t1 - t0) / a.n for i in range(a.n)]
            imgs = [(t, frame(t)) for t in ts]
            if a.mode == 'stills':
                d = Path(a.out) if a.out else OUT / 'stills'
                d.mkdir(parents=True, exist_ok=True)
                for t, png in imgs:
                    f = d / f't{t:08.3f}.{"jpg" if a.jpeg else "png"}'
                    f.write_bytes(png)
                    print(f)
            else:
                from PIL import Image, ImageDraw
                strip = a.mode == 'strip'
                tw = 480 if strip else 640
                th = round(tw * info['height'] / info['width'])
                n = len(imgs)
                if a.cols:
                    cols = a.cols
                elif strip:                                  # one row; longer strips in even rows (no empty tail)
                    rows = (n + 7) // 8
                    cols = (n + rows - 1) // rows
                else:
                    cols = 3
                rows = (n + cols - 1) // cols
                sheet = Image.new('RGB', (cols * tw, rows * th), 'black')
                dr = ImageDraw.Draw(sheet)
                for i, (t, png) in enumerate(imgs):
                    im = Image.open(io.BytesIO(png)).convert('RGB').resize((tw, th), Image.LANCZOS)
                    x, y = (i % cols) * tw, (i // cols) * th
                    sheet.paste(im, (x, y))
                    # The LAST entry covering t is the shot being watched: where one shot dissolves in over its
                    # neighbour, the first match names the shot that is already leaving.
                    shot = next((s['name'] for s in reversed(info['shots']) if s['from'] <= t < s['to']), '')
                    label = f'{t:.2f}  {shot}'
                    dr.rectangle([x, y, x + 8 + 8 * len(label), y + 18], fill=(0, 0, 0))
                    dr.text((x + 4, y + 3), label, fill=(255, 255, 255))
                for i in range(n, rows * cols):              # unused tiles: say so, so nobody reads them as black frames
                    x, y = (i % cols) * tw, (i // cols) * th
                    dr.rectangle([x, y, x + tw - 1, y + th - 1], fill=(40, 40, 40))
                    dr.text((x + tw // 2 - 30, y + th // 2 - 6), '(no frame)', fill=(150, 150, 150))
                # a strip is named after where it starts, so looking at a second action keeps the first
                f = Path(a.out) if a.out else OUT / (f'strip-{ts[0]:07.2f}.png' if strip else 'sheet.png')
                f.parent.mkdir(parents=True, exist_ok=True)
                sheet.save(f)
                print(f)
        report_browser_errors(errors)
        pg.close()


def auto_workers():
    """Half the cores (at most 4), but no more browsers than fit in memory: every browser loads all the frame packs
    (measured: ~0.8 GB + 6× the packs' size on disk, the decoded drawings included), and the export keeps within 60 %
    of the machine's RAM. A project with big video packs on an 8–16 GB laptop gets 1–2 workers instead of 4."""
    nw = max(1, min(4, (os.cpu_count() or 2) // 2))
    packs = sum((cfg['_dir'] / s).stat().st_size for s in cfg.get('scripts', [])
                if s.startswith('frames/') and (cfg['_dir'] / s).exists())
    try:
        ram = os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES')
    except (ValueError, OSError, AttributeError):
        ram = 0
    if ram and packs:
        per = 0.8e9 + 6 * packs
        fit = max(1, int(0.6 * ram // per))
        if fit < nw:
            print(f'{fit} worker(s), not {nw}: each browser holds the frame packs ({packs / 1e6:.0f} MB on disk, ~{per / 1e9:.1f} GB '
                  f'in memory) and this machine has {ram / 1e9:.0f} GB (--workers N overrides)')
            nw = fit
    return nw


# ---------------------------------------------------------------------------------------------- video export
# The film is cut into chunks of about --chunk seconds. Workers (a browser + an x264 encoder each) take the next
# chunk from a queue, so a heavy stretch (WebGL, frame packs) doesn't hold one worker while the others idle. Every
# finished chunk is kept in out/.chunks/ under a name made of the render settings, its frame range and a hash of
# the files its frames come from (the shared code, plus the scene files of the shots it shows). So:
#   · an export that stops (Ctrl-C, a crash, the laptop sleeps) picks up where it stopped: run the same command again;
#   · after an edit, an export renders again only the chunks whose scenes (or the shared code) changed.
# Frames depend on f.t only (CLAUDE.md), which is what makes a kept chunk identical to a fresh one.

SKIP_DIRS = {'out', 'stems', 'audio', '.git', 'node_modules', 'dreamina', '__pycache__'}
SKIP_EXT = {'.md', '.txt', '.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.mp4', '.mov', '.webm', '.mkv', '.py', '.pyc'}
BIG = 16 << 20          # files above this are keyed on size + mtime instead of their content


def file_key(path):
    st = path.stat()
    if st.st_size > BIG:
        return f'{st.st_size}:{st.st_mtime_ns}'
    import hashlib
    return hashlib.sha1(path.read_bytes()).hexdigest()


def url_path(src):
    from urllib.parse import unquote, urlparse
    return Path(unquote(urlparse(src).path)).resolve() if src else None


TOP_NAME = None


def top_names(text):
    """Names a classic script puts in the shared global scope (top-level function / const / let / var / class,
    window.x = …): another file that uses one of them depends on this file."""
    import re
    global TOP_NAME
    if TOP_NAME is None:
        TOP_NAME = re.compile(r'^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)'
                              r'|^\s*(?:window|globalThis)\.([A-Za-z_$][\w$]*)\s*=', re.M)
    return {n for m in TOP_NAME.finditer(text) for n in m.groups() if n}


def idents(text):
    """The bare identifiers a script mentions (not property names after a dot)."""
    import re
    return set(re.findall(r'(?<![\w$.])[A-Za-z_$][\w$]*', text))


def input_keys(info):
    """(shared, per_scene_file): shared = one hash of every file all frames may depend on (engine, the project's
    kits, project.js, index.html, lib/, timeline.js, data, art, frame packs …); per_scene_file = {path: hash of that
    scene file and every scene file it leans on}. A scene file that defines a global another scene file uses
    (classic scripts share one scope) counts for that one too; one that lib/ or timeline.js uses counts as shared."""
    import hashlib
    scene_files = {url_path(s) for s in (info.get('sceneSrc') or {}).values() if s}
    files = set(p for p in (KIT / 'engine').glob('*.js'))
    files |= {KIT / 'kits' / f'{k}.js' for k in cfg.get('kits', [])}
    files |= {p for p in (KIT / 'kits').rglob('*') if p.is_file() and p.suffix != '.js' and p.suffix not in SKIP_EXT}
    for root, dirs, names in os.walk(PD):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        for n in names:
            p = Path(root) / n
            if p.suffix.lower() not in SKIP_EXT and not n.startswith('.'):
                files.add(p.resolve())
    for rel in [*(cfg.get('data') or []), *(cfg.get('scripts') or [])]:     # data / scripts may live outside the project
        p = (PD / rel).resolve()
        if p.exists():
            files.add(p)
    files = {p.resolve() for p in files if p.exists()}
    text = {p: p.read_text(encoding='utf-8', errors='replace') for p in scene_files if p in files}
    scene_files = set(text)
    names = {p: top_names(t) for p, t in text.items()}
    used = {p: idents(t) for p, t in text.items()}
    shared = files - scene_files
    # a scene file whose globals the project's own shared scripts (lib/, timeline.js) call is shared too
    shared_used = set()
    for p in shared:
        if p.suffix == '.js' and PD in p.parents and p.stat().st_size < 2_000_000 and \
                not ({'data', 'frames'} & set(p.relative_to(PD).parts[:-1])):
            shared_used |= idents(p.read_text(encoding='utf-8', errors='replace'))
    for p in list(scene_files):
        if names[p] & shared_used:
            scene_files.discard(p)
            shared.add(p)
    deps = {}
    for p in scene_files:
        if 'MV.scenes' in text[p]:                     # reaches into other scenes: depends on all of them
            deps[p] = set(scene_files)
            continue
        d, todo = {p}, [p]
        while todo:
            q = todo.pop()
            for o in scene_files - d:
                if names[o] & used[q]:
                    d.add(o)
                    todo.append(o)
        deps[p] = d
    h = hashlib.sha1()
    for p in sorted(shared):
        h.update(f'{p.relative_to(KIT) if KIT in p.parents else p}={file_key(p)}\n'.encode())
    shared_key = h.hexdigest()
    keys = {}
    for p, d in deps.items():
        h = hashlib.sha1()
        for q in sorted(d):
            h.update(f'{q.name}={file_key(q)}\n'.encode())
        keys[p] = h.hexdigest()
    return shared_key, keys


def plan_chunks(info, t0, n, fps):
    """[(start frame, end frame, file name, shot names)] for the whole export."""
    import hashlib
    C = max(1, round(a.chunk * fps))
    settings = dict(v=1, fps=fps, t0=round(t0, 6), C=C, samples=a.samples, shutter=a.shutter if a.samples > 1 else None,
                    crf=a.crf, preset=a.preset, tune=a.tune, png=a.png, size=[info['width'], info['height']])
    skey = hashlib.sha1(repr(sorted(settings.items())).encode()).hexdigest()[:10]
    shared, per_file = input_keys(info)
    out = []
    for s in range(0, n, C):
        e = min(n, s + C)
        lo, hi = t0 + (s - 1) / fps, t0 + (e + 1) / fps          # a frame's motion-blur samples reach half a frame out
        shots = [x for x in info['shots'] if x['from'] < hi and x['to'] > lo]
        h = hashlib.sha1(shared.encode())
        for x in shots:
            p = url_path(x.get('src'))
            h.update(f"|{x['scene']}={per_file.get(p, '-')}".encode())
        out.append((s, e, f'{skey}-{s:06d}-{e:06d}-{h.hexdigest()[:12]}.mp4', [x['name'] for x in shots]))
    return skey, out


def video():
    """Chunked, resumable export: a queue of short chunks, N workers (each a browser + an x264 encoder), kept chunks
    reused; then the chunks are joined losslessly and muxed with the song."""
    from playwright.sync_api import sync_playwright
    fmt = ('image/png', 1) if a.png else ('image/jpeg', JPEG_Q)
    codec = 'png' if a.png else 'mjpeg'
    errors, scene_errors, lock = [], {}, threading.Lock()

    # a first page reads the project info (and fails fast if the project doesn't load); it becomes worker 0
    p0 = sync_playwright().start()
    try:
        first = Page(p0, errors)
    except RuntimeError as e:
        p0.stop()
        print(e)
        sys.exit(1)
    info = first.info
    for w in info['warnings']:
        print('warning:', w)
    fps = a.fps or info['fps']
    t0 = info['from'] if a.t0 is None else a.t0
    t1 = info['to'] if a.t1 is None else a.t1
    n = round((t1 - t0) * fps)
    if n <= 0:
        first.close(); p0.stop()
        sys.exit('nothing to render: --to must be after --from')

    out = Path(a.out) if a.out else OUT / f"{cfg.get('title', 'mv').replace(' ', '-')}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    cache = OUT / '.chunks'
    cache.mkdir(parents=True, exist_ok=True)
    for f in cache.glob('.tmp-*'):                       # half-written chunks of an export that was killed
        try:
            pid = int(f.name.split('-')[1])
            os.kill(pid, 0)                              # still running (another export of this project): leave it
        except (ValueError, IndexError, ProcessLookupError):
            f.unlink(missing_ok=True)
        except PermissionError:
            pass
    skey, chunks = plan_chunks(info, t0, n, fps)
    have = {f.name for f in cache.glob(f'{skey}-*.mp4')}
    todo = [c for c in chunks if a.fresh or c[2] not in have]
    reused = len(chunks) - len(todo)

    # The frames are sRGB. Convert them with the BT.709 matrix and say so in the file: left untagged (or tagged with
    # JPEG's BT.601 matrix), players and upload transcoders that assume BT.709 for HD shift the colours (saturated
    # reds by ~9 levels).
    enc = ['-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', a.preset,
           '-crf', str(a.crf), '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv']
    if a.tune:
        enc += ['-tune', a.tune]

    nframes = sum(e - s for s, e, _, _ in todo)
    done = [0]
    stop = threading.Event()
    failures, procs, errored = [], [], set()
    queue = list(todo)
    tmp = lambda name: cache / f'.tmp-{os.getpid()}-{name}'

    def drop_tmp():
        for f in cache.glob(f'.tmp-{os.getpid()}-*'):
            f.unlink(missing_ok=True)

    # Ctrl-C / SIGTERM: let every worker finish its current frame and close its browser (interrupting a Playwright
    # call mid-flight can hang it); finished chunks stay. A second Ctrl-C quits at once (finished chunks still stay).
    def on_signal(sig, frm):
        if stop.is_set():
            for ff in procs:
                if ff.poll() is None:
                    ff.kill()
            drop_tmp()
            os._exit(130)
        failures.append('interrupted')
        stop.set()
        print('\nstopping after the current frames… (Ctrl-C again to quit at once; finished chunks are kept either way)', flush=True)
    handlers = {s: signal.signal(s, on_signal) for s in (signal.SIGINT, signal.SIGTERM)}

    def next_chunk():
        with lock:
            return queue.pop(0) if queue and not stop.is_set() else None

    def work(k, pg=None, pw=None):
        ff = None
        try:
            if pg is None:
                pw = sync_playwright().start()
                if stop.is_set():
                    return
                pg = Page(pw, errors)
            while (c := next_chunk()) is not None:
                s, e, name, _ = c
                errs = []
                ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', codec, '-i', '-',
                                       *enc, '-f', 'mp4', str(tmp(name))], stdin=subprocess.PIPE, start_new_session=True)
                procs.append(ff)
                for i in range(s, e):
                    if stop.is_set():
                        break
                    ff.stdin.write(pg.frame(t0 + (i + 0.5) / fps, a.samples, fmt, scene_errors, lock, errs))
                    with lock:
                        done[0] += 1
                if stop.is_set():
                    ff.kill(); ff.wait()
                    tmp(name).unlink(missing_ok=True)
                    return
                ff.stdin.close()
                if ff.wait() != 0:
                    raise RuntimeError(f'ffmpeg failed on frames {s}–{e}')
                os.replace(tmp(name), cache / name)
                if errs:
                    errored.add(name)                    # in this video, but not kept: the next export renders it again
                ff = None
        except Exception as ex:  # noqa: BLE001 — report and stop the other workers
            if not stop.is_set():
                failures.append(f'worker {k}: {ex}')
            stop.set()
            if ff and ff.poll() is None:
                ff.kill()
        finally:
            try:
                if pg:
                    pg.close()
            except Exception:
                pass
            try:
                if pw:
                    pw.stop()
            except Exception:
                pass

    nw = max(1, min(a.workers or auto_workers(), len(todo))) if todo else 0
    say = f"{info['title']}: {n} frames ({t0:.2f}–{t1:.2f} s @ {fps} fps) in {len(chunks)} chunks of {a.chunk:g} s"
    if reused:
        say += f'; {reused} already rendered and unchanged, kept'
    if todo:
        say += (f"; rendering {len(todo)} ({nframes} frames) with {nw} worker{'s' if nw > 1 else ''}, "
                f"{'PNG' if a.png else 'JPEG'} frames{f', motion blur ×{a.samples}' if a.samples > 1 else ''}")
    print(say)
    if reused and todo and not a.fresh:
        names = list(dict.fromkeys(x for c in todo for x in c[3]))
        print('  the chunks to render show: ' + ', '.join(names[:16]) + (' …' if len(names) > 16 else ''))
    start = time.time()
    try:
        if todo:
            # the other workers start their browsers while worker 0 (the page that's already loaded) renders on this thread
            threads = [threading.Thread(target=work, args=(k,), daemon=True) for k in range(1, nw)]
            for th in threads:
                th.start()
            ticker = threading.Thread(target=progress, args=(done, nframes, start, stop), daemon=True)
            ticker.start()
            work(0, first, p0)
            for th in threads:
                th.join()
            stop.set()
            print()
        else:
            first.close(); p0.stop()
        for sig_, h in handlers.items():
            signal.signal(sig_, h)
        if failures:
            kept = sum((cache / c[2]).exists() for c in chunks)
            print('RENDER STOPPED:' if failures == ['interrupted'] else 'RENDER FAILED:', *failures, sep='\n  ')
            again = 'run it again without --fresh' if a.fresh else 'run the same command again'
            print(f'{kept} of {len(chunks)} chunks are done and kept in {cache}: {again} to go on from there')
            report_browser_errors(errors)
            sys.exit(130 if failures == ['interrupted'] else 1)
        lst = cache / f'.list-{os.getpid()}.txt'
        lst.write_text(''.join(f"file '{(cache / c[2]).as_posix()}'\n" for c in chunks))
        cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst)]
        audio = (PD / info['audio']).resolve() if info.get('audio') else None
        fo = float(cfg.get('audioFadeOut', 0.2)) if a.t1 is None else 0.2  # project.audioFadeOut: seconds of fade at the end
        if audio and audio.exists() and not a.noaudio:
            cmd += ['-ss', f'{t0:.3f}', '-t', f'{n / fps:.3f}', '-i', str(audio), '-map', '0:v', '-map', '1:a',
                    '-af', f'afade=t=in:d=0.02,afade=t=out:st={max(0, n / fps - fo):.3f}:d={fo:.3f}', '-c:a', 'aac', '-b:a', '256k']
        cmd += ['-c:v', 'copy', '-movflags', '+faststart', str(out)]
        try:
            subprocess.run(cmd, check=True)
        finally:
            lst.unlink(missing_ok=True)
        el = time.time() - start
        print(f'wrote {out}  ({el:.0f} s' + (f', {nframes / el:.1f} frames/s' if nframes and el else '') + ')')
        report_browser_errors(errors)
        # keep the cache tidy: chunks with a scene error are not reused; older versions of these chunks (same settings,
        # same start, other inputs) are superseded
        for name in errored:
            (cache / name).unlink(missing_ok=True)
        current = {c[2] for c in chunks}
        starts = {c[2].split('-')[1] for c in chunks}
        for f in cache.glob(f'{skey}-*.mp4'):
            if f.name not in current and f.name.split('-')[1] in starts:
                f.unlink(missing_ok=True)
        if errored:
            print(f'{len(errored)} chunk(s) had scene errors: they are in the video but not kept')
        if a.clean:
            shutil.rmtree(cache, ignore_errors=True)
        else:
            size = sum(f.stat().st_size for f in cache.glob('*.mp4'))
            print(f'chunks kept in {cache} ({size / 1e6:.0f} MB): the next export re-renders only the shots you changed '
                  f'(--fresh renders everything, --clean deletes them after the export)')
    finally:
        stop.set()
        drop_tmp()


def progress(done, n, start, stop):
    last = -1
    while not stop.is_set():
        d = sum(done)
        if d != last:
            el = time.time() - start
            eta = el / d * (n - d) if d else 0
            print(f'\rframe {d}/{n}  {el:5.0f}s elapsed  ~{eta:4.0f}s left  ({d / el if el else 0:4.1f} frames/s)', end='', flush=True)
            last = d
        if d >= n:
            return
        time.sleep(1)


if __name__ == '__main__':
    main()
