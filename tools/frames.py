#!/usr/bin/env python3
"""Pack footage or a still into a frame pack for kits/roto.js.

  uv run tools/frames.py projects/X J clips/sdJ.mp4 --t0 123.3          # a video clip that starts at song time 123.3
  uv run tools/frames.py projects/X J path/to/frames/ --src-fps 24 --t0 123.3   # a folder of numbered frames
  uv run tools/frames.py projects/X K5 stills/corridor.jpg              # a still (kept at --width 1920)

Writes projects/X/frames/<name>.js: JPEG data URLs in a <script>, so the preview works opened straight from disk
(an <img> loaded from file:// would taint the canvas, and WebGL refuses it). Add "frames/<name>.js" to
project.scripts; roto.js preloads every pack before the first frame.

Only the drawings the film shows are kept: --rate defaults to the project's drawRate (12 = on twos), so a 24 fps
clip keeps every other frame. Source resolution beyond --width is wasted: the cel pass redraws everything, and
480p generations look the same as 1080p ones once inked.

Options:
  --t0 S          song time of the clip's first frame (lip-synced clips: where the audio slice you generated from starts)
  --start / --dur trim the source (seconds into the clip)
  --rate N        drawings per second to keep (default: project drawRate)
  --width PX      output width (default 960 for clips, 1920 for stills)
  --quality Q     JPEG quality (default 84; 92 for generated clips that the camera zooms into)
  --sharpen P     unsharp mask of P percent (radius 1.5 px, after resizing): generated video is softer than the
                  illustration it starts from; 70 brings its lines back close to the still's without halos
  --src-fps N     frame rate of a frame folder (default 24)
  --delogo x,y,w,h  remove a watermark (source pixels), e.g. the generator's "AI生成" tag
  --add           also list frames/<name>.js in project.js "scripts" (if it is not there yet)
  --unmark STILL  cover the generator's "AI生成" tag with the same corner of STILL (the picture the clip was made from,
                  so the corner is the same scene), colour-matched to each frame and feathered; --mark-box x0,y0,x1,y1
                  (fractions of the frame) is where the tag is (default: 即梦's top-left tag). For a corner that moves
                  in the clip, use --delogo instead. (The film itself still says it is AI-made: credit + platform label.)
"""
import argparse
import base64
import io
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import load_project, save_project  # noqa: E402

IMG = {'.jpg', '.jpeg', '.png', '.webp'}

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('name')
ap.add_argument('source')
ap.add_argument('--t0', type=float, default=0.0)
ap.add_argument('--start', type=float)
ap.add_argument('--dur', type=float)
ap.add_argument('--rate', type=float)
ap.add_argument('--width', type=int)
ap.add_argument('--quality', type=int, default=84)
ap.add_argument('--sharpen', type=float, default=0)
ap.add_argument('--src-fps', type=float, default=24.0)
ap.add_argument('--delogo')
ap.add_argument('--add', action='store_true')
ap.add_argument('--unmark')
ap.add_argument('--mark-box', default='0.006,0.012,0.102,0.102')
a = ap.parse_args()

cfg = load_project(a.project)
src = Path(a.source).expanduser().resolve()
if not src.exists():
    raise SystemExit(f'not found: {src}')
still = src.is_file() and src.suffix.lower() in IMG
rate = a.rate or cfg.get('drawRate', 12)
width = a.width or (1920 if still else 960)


_patch = {}


def unmark(im):
    """Cover the tag box with the still's pixels there, shifted to the frame's colour around the box, feathered."""
    import numpy as np
    w, h = im.size
    if (w, h) not in _patch:
        x0, y0, x1, y1 = (float(v) for v in a.mark_box.split(','))
        bx = (round(x0 * w), round(y0 * h), round(x1 * w), round(y1 * h))
        still = np.asarray(Image.open(a.unmark).convert('RGB').resize((w, h), Image.LANCZOS), np.float32)
        f = max(4, round(0.006 * w))                                    # feather width
        yy, xx = np.mgrid[0:h, 0:w]
        dx = np.maximum(bx[0] - xx, xx - bx[2]); dy = np.maximum(bx[1] - yy, yy - bx[3])
        dist = np.maximum(np.maximum(dx, dy), 0)                        # 0 inside the box, px outside
        alpha = np.clip(1 - dist / f, 0, 1)[..., None]
        ring = (dist > f) & (dist <= 3 * f)                             # where we read the frame's own colour
        _patch[(w, h)] = (still, alpha, ring, alpha[..., 0] > 0)
    still, alpha, ring, near = _patch[(w, h)]
    fr = np.asarray(im.convert('RGB'), np.float32)
    shift = fr[ring].mean(0) - still[ring].mean(0)                      # the clip's colour drift since the first frame
    out = fr.copy()
    out[near] = (fr * (1 - alpha) + np.clip(still + shift, 0, 255) * alpha)[near]
    return Image.fromarray(out.astype(np.uint8))


def encode(im):
    im = im.convert('RGB')
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width / 2) * 2), Image.LANCZOS)
    if a.sharpen > 0:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.5, percent=int(a.sharpen), threshold=2))
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=a.quality, optimize=True, progressive=False)
    return im.size, 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()


if still:
    size, url = encode(Image.open(src))
    frames = [url]
else:
    if not shutil.which('ffmpeg'):
        raise SystemExit('ffmpeg not found (brew install ffmpeg)')
    with tempfile.TemporaryDirectory() as td:
        inp = ['-i', str(src)]
        if src.is_dir():
            files = sorted(p for p in src.iterdir() if p.suffix.lower() in IMG)
            if not files:
                raise SystemExit(f'no images in {src}')
            ext = files[0].suffix
            inp = ['-framerate', str(a.src_fps), '-pattern_type', 'glob', '-i', str(src / f'*{ext}')]
        trim = (['-ss', str(a.start)] if a.start else []) + (['-t', str(a.dur)] if a.dur else [])
        vf = [f'fps={rate}']
        if a.delogo:
            x, y, w, h = a.delogo.split(',')
            vf.insert(0, f'delogo=x={x}:y={y}:w={w}:h={h}')
        cmd = ['ffmpeg', '-v', 'error', '-y', *inp, *trim, '-vf', ','.join(vf), str(Path(td) / '%05d.png')]
        subprocess.run(cmd, check=True)
        outs = sorted(Path(td).glob('*.png'))
        if not outs:
            raise SystemExit('ffmpeg produced no frames')
        frames = []
        for p in outs:
            im = Image.open(p)
            size, url = encode(unmark(im) if a.unmark else im)
            frames.append(url)

pack = {'t0': a.t0, 'rate': rate, 'w': size[0], 'h': size[1], 'still': still, 'source': src.name}
out = cfg['_dir'] / 'frames' / f'{a.name}.js'
out.parent.mkdir(exist_ok=True)
head = json.dumps(pack, ensure_ascii=False)[:-1]
body = ',\n'.join(json.dumps(f) for f in frames)
out.write_text(f'// frame pack "{a.name}" for kits/roto.js — made by tools/frames.py from {src.name}\n'
               f'(window.MV_FRAMES = window.MV_FRAMES || {{}})[{json.dumps(a.name)}] = {head}, "frames": [\n{body}\n]}};\n',
               encoding='utf-8')
mb = out.stat().st_size / 1e6
span = '' if still else f', {len(frames) / rate:.2f} s from song time {a.t0:g}'
print(f'{out.relative_to(cfg["_dir"])}: {len(frames)} drawing{"s" * (len(frames) != 1)} at {size[0]}×{size[1]}{span}, {mb:.1f} MB')
scripts = cfg.get('scripts', [])
if f'frames/{a.name}.js' not in scripts:
    if a.add:
        at = 1 if scripts[:1] == ['lib/fonts.js'] else 0
        cfg['scripts'] = scripts[:at] + [f'frames/{a.name}.js'] + scripts[at:]
        save_project(cfg)
        print(f'listed "frames/{a.name}.js" in project.js scripts')
    else:
        print(f'add "frames/{a.name}.js" to "scripts" in project.js (or run again with --add)')
