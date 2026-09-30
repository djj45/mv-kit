#!/usr/bin/env python3
"""Offline renderer: drives a project's index.html in headless Chrome and pipes frames into ffmpeg.

  uv run tools/render.py projects/my-song                   # video -> projects/my-song/out/<title>.mp4
  uv run tools/render.py projects/my-song video --from 30 --to 45 --samples 4
  uv run tools/render.py projects/my-song stills --t 12.5,20,31.2
  uv run tools/render.py projects/my-song sheet --cuts      # 3 frames per shot (start / middle / end)
  uv run tools/render.py projects/my-song sheet --n 24      # 24 evenly spaced frames
  uv run tools/render.py projects/my-song strip --t 40.2 --dur 1.2   # a frame every 0.2 s from 40.2 s (key actions)
  uv run tools/render.py projects/my-song check             # load, list shots, render one frame per shot, report errors

Video: the frames are split into --workers contiguous segments, each rendered by its own headless browser and
x264 encoder in parallel, then joined losslessly (no re-encode) and muxed with the song. Frames travel from the
page as JPEG (quality 0.98, ~47 dB against lossless; x264 at crf 18 loses more than that); --png sends lossless
PNG frames instead (about 1.7x slower per frame).

Options: --fps N (override), --samples N (motion blur: average N sub-frames), --shutter 0.5 (fraction of a
frame), --crf 18, --preset slow, --tune animation|film|grain, --workers N (0 = auto), --png, --noaudio,
--out PATH. Stills and sheets are PNG (--jpeg: JPEG stills).
Browser: Google Chrome if installed (channel "chrome"), else Playwright's Chromium (`uv run playwright
install chromium` once). Set CHROME=/path/to/chrome to force one.
"""
import argparse
import base64
import io
import math
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import load_project  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('mode', nargs='?', default='video', choices=['video', 'stills', 'sheet', 'strip', 'check'])
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
ap.add_argument('--jpeg', action='store_true', help='stills: save JPEG instead of PNG')
ap.add_argument('--noaudio', action='store_true')
ap.add_argument('--t', help='stills: comma-separated times; strip: start time')
ap.add_argument('--times', help='sheet: comma-separated times')
ap.add_argument('--n', type=int, default=0, help='sheet: N evenly spaced frames')
ap.add_argument('--cuts', action='store_true', help='sheet: start / middle / end of every shot')
ap.add_argument('--dur', type=float, default=1.2, help='strip: seconds to cover')
ap.add_argument('--step', type=float, default=0.2, help='strip: seconds between frames')
ap.add_argument('--cols', type=int, default=3)
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
        self.page.goto((PD / 'index.html').as_uri() + '?export=1')
        try:
            self.page.wait_for_function('window.MV_READY === true || !!window.MV_FATAL', timeout=120000)
        except Exception:
            pass
        fatal = self.page.evaluate('window.MV_FATAL || null')
        if fatal or not self.page.evaluate('window.MV_READY === true'):
            self.browser.close()
            raise RuntimeError('PROJECT FAILED TO LOAD:\n  ' + '\n  '.join([fatal or '(timeout)', *errors]))
        self.info = self.page.evaluate('MV_EXPORT.info')

    def frame(self, t, samples, fmt, scene_errors, lock=None):
        """Render the frame at t, return (encoded image bytes). Scene errors are recorded once per scene."""
        url, err = self.page.evaluate('([t, n, s, ty, q]) => [MV_EXPORT.frame(t, n, s, ty, q), MV_EXPORT.error()]',
                                      [t, samples, a.shutter, fmt[0], fmt[1]])
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
                cols = (a.cols if a.cols != 3 else 4) if strip else a.cols
                rows = (len(imgs) + cols - 1) // cols
                sheet = Image.new('RGB', (cols * tw, rows * th), 'black')
                dr = ImageDraw.Draw(sheet)
                for i, (t, png) in enumerate(imgs):
                    im = Image.open(io.BytesIO(png)).convert('RGB').resize((tw, th), Image.LANCZOS)
                    x, y = (i % cols) * tw, (i // cols) * th
                    sheet.paste(im, (x, y))
                    shot = next((s['name'] for s in info['shots'] if s['from'] <= t < s['to']), '')
                    label = f'{t:.2f}  {shot}'
                    dr.rectangle([x, y, x + 8 + 8 * len(label), y + 18], fill=(0, 0, 0))
                    dr.text((x + 4, y + 3), label, fill=(255, 255, 255))
                f = Path(a.out) if a.out else OUT / ('strip.png' if strip else 'sheet.png')
                f.parent.mkdir(parents=True, exist_ok=True)
                sheet.save(f)
                print(f)
        report_browser_errors(errors)
        pg.close()


def video():
    """Parallel export: N workers, each a browser + an x264 encoder on a contiguous run of frames."""
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
    nw = a.workers or max(1, min(4, (os.cpu_count() or 2) // 2))
    nw = max(1, min(nw, math.ceil(n / 48)))          # a worker costs a browser start-up: give each ≥ 2 s of frames
    per = math.ceil(n / nw)
    runs = [(k * per, min(n, (k + 1) * per)) for k in range(nw) if k * per < n]

    out = Path(a.out) if a.out else OUT / f"{cfg.get('title', 'mv').replace(' ', '-')}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    segdir = out.parent / f'.{out.stem}.segs-{os.getpid()}'
    segdir.mkdir()
    enc = ['-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-pix_fmt', 'yuv420p']
    if a.tune:
        enc += ['-tune', a.tune]

    done = [0] * len(runs)
    stop = threading.Event()
    failures = []
    procs = []

    # Ctrl-C / SIGTERM: let every worker finish its current frame and close its browser (interrupting a Playwright
    # call mid-flight can hang it); a second Ctrl-C quits at once.
    def on_signal(sig, frm):
        if stop.is_set():
            for ff in procs:
                if ff.poll() is None:
                    ff.kill()
            shutil.rmtree(segdir, ignore_errors=True)
            os._exit(130)
        failures.append('interrupted')
        stop.set()
        print('\nstopping after the current frames… (Ctrl-C again to quit at once)', flush=True)
    handlers = {s: signal.signal(s, on_signal) for s in (signal.SIGINT, signal.SIGTERM)}

    def work(k, pg=None, pw=None):
        s, e = runs[k]
        ff = None
        try:
            if pg is None:
                pw = sync_playwright().start()
                if stop.is_set():
                    return
                pg = Page(pw, errors)
            ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', codec, '-i', '-',
                                   *enc, f'seg_{k:03d}.mp4'], stdin=subprocess.PIPE, cwd=segdir, start_new_session=True)
            procs.append(ff)
            for i in range(s, e):
                if stop.is_set():
                    break
                ff.stdin.write(pg.frame(t0 + (i + 0.5) / fps, a.samples, fmt, scene_errors, lock))
                done[k] += 1
            if stop.is_set():
                ff.kill()
                return
            ff.stdin.close()
            if ff.wait() != 0:
                raise RuntimeError(f'ffmpeg failed on segment {k}')
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

    print(f"{info['title']}: {n} frames ({t0:.2f}–{t1:.2f} s @ {fps} fps), {len(runs)} worker{'s' if len(runs) > 1 else ''}, "
          f"{'PNG' if a.png else 'JPEG'} frames{f', motion blur ×{a.samples}' if a.samples > 1 else ''}")
    start = time.time()
    try:
        # the other workers start their browsers while worker 0 (the page that's already loaded) renders on this thread
        threads = [threading.Thread(target=work, args=(k,), daemon=True) for k in range(1, len(runs))]
        for th in threads:
            th.start()
        ticker = threading.Thread(target=progress, args=(done, n, start, stop), daemon=True)
        ticker.start()
        work(0, first, p0)
        for th in threads:
            th.join()
        stop.set()
        print()
        for sig_, h in handlers.items():
            signal.signal(sig_, h)
        if failures:
            print('RENDER STOPPED:' if failures == ['interrupted'] else 'RENDER FAILED:', *failures, sep='\n  ')
            report_browser_errors(errors)
            sys.exit(130 if failures == ['interrupted'] else 1)
        (segdir / 'list.txt').write_text(''.join(f"file 'seg_{k:03d}.mp4'\n" for k in range(len(runs))))
        cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(segdir / 'list.txt')]
        audio = (PD / info['audio']).resolve() if info.get('audio') else None
        fo = float(cfg.get('audioFadeOut', 0.2)) if a.t1 is None else 0.2  # project.audioFadeOut: seconds of fade at the end
        if audio and audio.exists() and not a.noaudio:
            cmd += ['-ss', f'{t0:.3f}', '-t', f'{n / fps:.3f}', '-i', str(audio), '-map', '0:v', '-map', '1:a',
                    '-af', f'afade=t=in:d=0.02,afade=t=out:st={max(0, n / fps - fo):.3f}:d={fo:.3f}', '-c:a', 'aac', '-b:a', '256k']
        cmd += ['-c:v', 'copy', '-movflags', '+faststart', str(out)]
        subprocess.run(cmd, check=True)
        el = time.time() - start
        print(f'wrote {out}  ({el:.0f} s, {n / el:.1f} frames/s)')
        report_browser_errors(errors)
    finally:
        stop.set()
        shutil.rmtree(segdir, ignore_errors=True)


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
