#!/usr/bin/env python3
"""Offline renderer: drives a project's index.html in headless Chrome and pipes frames into ffmpeg.

  uv run tools/render.py projects/my-song                   # video -> projects/my-song/out/<title>.mp4
  uv run tools/render.py projects/my-song video --from 30 --to 45 --samples 4
  uv run tools/render.py projects/my-song stills --t 12.5,20,31.2
  uv run tools/render.py projects/my-song sheet --cuts      # 3 frames per shot (start / middle / end)
  uv run tools/render.py projects/my-song sheet --n 24      # 24 evenly spaced frames
  uv run tools/render.py projects/my-song check             # load, list shots, render one frame per shot, report errors

Options: --fps N (override), --samples N (motion blur: average N sub-frames), --shutter 0.5 (fraction of a
frame), --crf 18, --preset slow, --jpeg (faster frame transfer), --noaudio, --out PATH.
Browser: Google Chrome if installed (channel "chrome"), else Playwright's Chromium (`uv run playwright
install chromium` once). Set CHROME=/path/to/chrome to force one.
"""
import argparse
import base64
import io
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import load_project  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('mode', nargs='?', default='video', choices=['video', 'stills', 'sheet', 'check'])
ap.add_argument('--from', dest='t0', type=float)
ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--fps', type=int)
ap.add_argument('--samples', type=int, default=1)
ap.add_argument('--shutter', type=float, default=0.5)
ap.add_argument('--crf', type=int, default=18)
ap.add_argument('--preset', default='slow')
ap.add_argument('--tune', default=None, help='x264 tune, e.g. animation / film')
ap.add_argument('--jpeg', action='store_true')
ap.add_argument('--noaudio', action='store_true')
ap.add_argument('--t', help='stills: comma-separated times')
ap.add_argument('--times', help='sheet: comma-separated times')
ap.add_argument('--n', type=int, default=0, help='sheet: N evenly spaced frames')
ap.add_argument('--cuts', action='store_true', help='sheet: start / middle / end of every shot')
ap.add_argument('--cols', type=int, default=3)
ap.add_argument('--out')
a = ap.parse_args()

cfg = load_project(a.project)
PD = cfg['_dir']
OUT = PD / 'out'


def launch(p):
    args = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--allow-file-access-from-files',
            '--disable-backgrounding-occluded-windows']
    if os.environ.get('CHROME'):
        return p.chromium.launch(executable_path=os.environ['CHROME'], args=args)
    try:
        return p.chromium.launch(channel='chrome', args=args)
    except Exception:
        return p.chromium.launch(args=args)


def main():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = launch(p)
        page = b.new_page(viewport={'width': 1280, 'height': 720})
        errors = []
        # missing optional data files are reported as warnings by the engine; required ones set MV_FATAL
        page.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errors.append(m.text))
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto((PD / 'index.html').as_uri() + '?export=1')
        try:
            page.wait_for_function('window.MV_READY === true || !!window.MV_FATAL', timeout=120000)
        except Exception:
            pass
        fatal = page.evaluate('window.MV_FATAL || null')
        if fatal or not page.evaluate('window.MV_READY === true'):
            print('PROJECT FAILED TO LOAD:\n ', fatal or '(timeout)', *errors, sep='\n  ')
            sys.exit(1)
        info = page.evaluate('MV_EXPORT.info')
        for w in info['warnings']:
            print('warning:', w)
        fmt = ('image/jpeg', 0.95) if a.jpeg else ('image/png', 1)
        scene_errors = {}

        def frame(t, samples=None):
            url = page.evaluate('([t, n, s, ty, q]) => MV_EXPORT.frame(t, n, s, ty, q)',
                                [t, samples or a.samples, a.shutter, fmt[0], fmt[1]])
            err = page.evaluate('MV_EXPORT.error()')
            if err and err.split(':')[0] not in scene_errors:
                scene_errors[err.split(':')[0]] = err
                print(f'SCENE ERROR at t={t:.3f}: {err}')
            return base64.b64decode(url.split(',', 1)[1])

        fps = a.fps or info['fps']
        t0 = info['from'] if a.t0 is None else a.t0
        t1 = info['to'] if a.t1 is None else a.t1

        if a.mode == 'check':
            print(f"{info['title']}: {info['width']}x{info['height']} @ {info['fps']} fps, {info['from']:.2f}–{info['to']:.2f} s")
            for s in info['shots']:
                ms = time.time()
                frame((s['from'] + s['to']) / 2, 1)
                print(f"  {s['from']:8.3f} – {s['to']:8.3f}  {s['name']:<16} {(time.time() - ms) * 1000:6.0f} ms")
            print('OK' if not scene_errors and not errors else 'ERRORS above')

        elif a.mode in ('stills', 'sheet'):
            if a.mode == 'stills':
                ts = [float(x) for x in (a.t or f'{t0}').split(',')]
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
                tw, th = 640, round(640 * info['height'] / info['width'])
                cols = a.cols
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
                f = Path(a.out) if a.out else OUT / 'sheet.png'
                f.parent.mkdir(parents=True, exist_ok=True)
                sheet.save(f)
                print(f)

        else:  # video
            n = round((t1 - t0) * fps)
            out = Path(a.out) if a.out else OUT / f"{cfg.get('title', 'mv').replace(' ', '-')}.mp4"
            out.parent.mkdir(parents=True, exist_ok=True)
            audio = (PD / info['audio']).resolve() if info.get('audio') else None
            cmd = ['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(fps),
                   '-c:v', 'mjpeg' if a.jpeg else 'png', '-i', '-']
            fo = float(cfg.get('audioFadeOut', 0.2)) if a.t1 is None else 0.2  # project.audioFadeOut: seconds of fade at the end
            if audio and audio.exists() and not a.noaudio:
                cmd += ['-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', str(audio),
                        '-af', f'afade=t=in:d=0.02,afade=t=out:st={max(0, t1 - t0 - fo):.3f}:d={fo:.3f}', '-c:a', 'aac', '-b:a', '256k', '-shortest']
            cmd += ['-c:v', 'libx264', '-preset', a.preset, '-crf', str(a.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
            if a.tune:
                cmd += ['-tune', a.tune]
            ff = subprocess.Popen(cmd + [str(out)], stdin=subprocess.PIPE)
            start = time.time()
            for i in range(n):
                ff.stdin.write(frame(t0 + (i + 0.5) / fps))
                if i % fps == 0 or i == n - 1:
                    el = time.time() - start
                    eta = el / (i + 1) * (n - i - 1)
                    print(f'\rframe {i + 1}/{n}  {el:5.0f}s elapsed  ~{eta:4.0f}s left', end='', flush=True)
            ff.stdin.close()
            ff.wait()
            print(f'\nwrote {out}')
        uniq = list(dict.fromkeys(e.split('\n')[0] for e in errors))
        if uniq:
            print('BROWSER ERRORS:', *uniq[:10], sep='\n  ')
        b.close()


if __name__ == '__main__':
    main()
