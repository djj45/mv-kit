#!/usr/bin/env python3
"""Turn the lights off in an illustration: find its lit windows, paint them out, and list them, so code can switch
them back on one by one (a city waking up, a wave of light following something).

  uv run tools/lightsoff.py projects/X C2 --below 0.4 --add     # → frames/C2off.js + the line for lib/spots.js
  uv run tools/lightsoff.py projects/X C2 --below 0.4 --sheet out/c2off.jpg   # + before / after / mask to check

Reads the still's frame pack (frames/<id>.js), so the windows line up with what the film draws. Writes the dark
version as frames/<id>off.js (same size and JPEG quality; --add lists it in project.js). Prints
`AK_SPOT.<id>.lit = [[u0, v0, w, h], …]`: each window's box in fractions of the picture, padded to take in its glow —
draw that box from the lit picture over the dark one to switch a window on.

A window: warm, bright pixels (red and green well above blue — lamp light, not the pink horizon), the panes of one
window merged (they sit a few pixels apart), plus the soft glow the painter put around it. Painted out with the
colour of the wall around it, a little darker (unlit glass).
--below V  only look below this height (fraction from the top: skip the sky)
--warm N   how much redder than blue a lit pixel is (default 28)
--min L    how bright (luma 0..255, default 120)
"""
import argparse
import base64
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mvproject import load_project, save_project  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('still')
ap.add_argument('--below', type=float, default=0.0)
ap.add_argument('--warm', type=int, default=28)
ap.add_argument('--min', type=int, default=120)
ap.add_argument('--glass', type=float, default=0.86, help='unlit glass = wall colour × this')
ap.add_argument('--quality', type=int, default=92)
ap.add_argument('--add', action='store_true')
ap.add_argument('--sheet')
a = ap.parse_args()

cfg = load_project(a.project)
src = (cfg['_dir'] / 'frames' / f'{a.still}.js').read_text()
meta = json.loads(re.search(r'= (\{.*?"frames": )', src).group(1) + '[]}')
img = Image.open(io.BytesIO(base64.b64decode(re.search(r'"data:image/jpeg;base64,([^"]+)"', src).group(1)))).convert('RGB')
A = np.asarray(img, np.int16)
H, W = A.shape[:2]
R, G, B = A[..., 0], A[..., 1], A[..., 2]
L = 0.3 * R + 0.59 * G + 0.11 * B
below = (np.arange(H)[:, None] / H) >= a.below

core = (R - B > a.warm) & (G - B > a.warm // 2) & (L > a.min) & below
near = ndimage.binary_dilation(core, iterations=6)
glow = (((R - B > a.warm // 2) & (L > a.min * 0.75)) | (L > 185)) & below & near   # + the white-hot centre of a small, far window
win = core | glow
lab, n = ndimage.label(ndimage.binary_dilation(core, iterations=2))   # the panes of one window: one group
out = A.copy()
boxes = []
for i, sl in enumerate(ndimage.find_objects(lab)):
    ys, xs = sl
    pad = 8
    y0, y1, x0, x1 = max(0, ys.start - pad), min(H, ys.stop + pad), max(0, xs.start - pad), min(W, xs.stop + pad)
    grp = ndimage.binary_dilation(lab[y0:y1, x0:x1] == i + 1, iterations=4) & win[y0:y1, x0:x1]
    if not grp.any():
        continue
    wall = ~win[y0:y1, x0:x1]
    col = np.median(A[y0:y1, x0:x1][wall], axis=0) if wall.sum() > 8 else np.median(A[y0:y1, x0:x1].reshape(-1, 3), axis=0)
    patch = out[y0:y1, x0:x1]
    patch[grp] = (col * a.glass).astype(np.int16)
    boxes.append([round(x0 / W, 4), round(y0 / H, 4), round((x1 - x0) / W, 4), round((y1 - y0) / H, 4)])
# soften the painted-out edges a touch so they read as paint, not cut-outs
m = ndimage.binary_dilation(win, iterations=1)
soft = np.stack([ndimage.uniform_filter(out[..., c].astype(np.float32), 3) for c in range(3)], -1)
out = np.where(m[..., None], soft, out).clip(0, 255).astype(np.uint8)
dark = Image.fromarray(out)

name = f'{a.still}off'
b = io.BytesIO()
dark.save(b, 'JPEG', quality=a.quality, optimize=True)
url = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
pack = {'t0': 0.0, 'rate': meta.get('rate', 12), 'w': W, 'h': H, 'still': True, 'source': f'{a.still} (lights off, tools/lightsoff.py)'}
dest = cfg['_dir'] / 'frames' / f'{name}.js'
dest.write_text(f'// frame pack "{name}" — {a.still} with its lit windows painted out, made by tools/lightsoff.py\n'
                f'(window.MV_FRAMES = window.MV_FRAMES || {{}})[{json.dumps(name)}] = {json.dumps(pack)[:-1]}, "frames": [\n{json.dumps(url)}\n]}};\n',
                encoding='utf-8')
if a.add:
    scripts = cfg.setdefault('scripts', [])
    rel = f'frames/{name}.js'
    if rel not in scripts:
        after = f'frames/{a.still}.js'
        scripts.insert(scripts.index(after) + 1 if after in scripts else 0, rel)
        save_project(cfg)
        print(f'listed "{rel}" in project.js scripts', file=sys.stderr)
print(f'AK_SPOT.{a.still}.lit = {json.dumps(boxes, separators=(",", ":"))};   // lit windows (tools/lightsoff.py --below {a.below})')
print(f'{a.still}: {len(boxes)} lit windows painted out → frames/{name}.js ({len(b.getvalue()) / 1e6:.1f} MB)', file=sys.stderr)

if a.sheet:
    vis = np.asarray(img).copy()
    vis[win] = [255, 0, 255]
    w2 = 1200
    rows = [img, dark, Image.fromarray(vis)]
    hh = round(H * w2 / W)
    sheet = Image.new('RGB', (w2, hh * 3))
    for k, im in enumerate(rows):
        sheet.paste(im.resize((w2, hh), Image.LANCZOS), (0, k * hh))
    sheet.save(a.sheet)
    print(f'sheet: {a.sheet}', file=sys.stderr)
