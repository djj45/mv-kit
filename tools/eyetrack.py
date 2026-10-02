#!/usr/bin/env python3
"""Measure an eye in a frame pack, drawing by drawing: how open it is and where the pupil went. Code that draws on
the pupil (a HUD ring, reflected lights) reads this, so the drawing follows the eye and goes out when the lid shuts.

  uv run tools/eyetrack.py projects/X A3v --eye 0.52,0.5 --r 0.07                  # prints the line for lib/spots.js
  uv run tools/eyetrack.py projects/X A3v --eye 0.52,0.5 --r 0.07 --sheet out/eye.jpg   # + a contact sheet to check by eye

--eye u,v   the pupil in the pack's first drawing (fractions of the frame; the illustration's AK_SPOT pupil, usually)
--r R       the iris radius, as a fraction of the frame width
Output (one entry per packed drawing): open 0..1 (0 = lid shut: the iris disc is no longer dark), dx / dy (the pupil's
offset from the first drawing, fractions of width / height; held through a blink, when there is no iris to follow),
and blinks [[shut, open again], …] in seconds into the pack.

Tracking: phase correlation of a window around the eye against the first drawing (numpy FFT), chained from the
previous drawing's offset so slow drift is followed, and only while the eye is open. Openness: how much the iris disc
still looks like the first drawing's (normalized correlation, so brightening or warming does not read as a blink).
"""
import argparse
import base64
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('project')
ap.add_argument('pack')
ap.add_argument('--eye', required=True, help='u,v of the pupil in the first drawing')
ap.add_argument('--r', type=float, required=True, help='iris radius (fraction of width)')
ap.add_argument('--search', type=float, default=1.5, help='how far the eye may move between drawings (× r)')
ap.add_argument('--sheet', help='write a contact sheet of the eye with the measurement drawn on')
a = ap.parse_args()

proj = Path(a.project)
src = (proj / 'frames' / f'{a.pack}.js').read_text()
meta = json.loads(re.search(r'= (\{.*?"frames": )', src).group(1) + '[]}')
frames = [Image.open(io.BytesIO(base64.b64decode(b))).convert('L') for b in re.findall(r'"data:image/jpeg;base64,([^"]+)"', src)]
if len(frames) < 2:
    sys.exit(f'{a.pack}: not a clip pack ({len(frames)} drawing)')
rate, (W, H) = meta.get('rate', 12), frames[0].size
F = [np.asarray(f, np.float32) for f in frames]
u, v = map(float, a.eye.split(','))
cx0, cy0, r = u * W, v * H, a.r * W
S = int(2 ** np.ceil(np.log2(4 * r + 2 * a.search * r)))          # FFT window: the eye, its lids, room to move
hann = np.outer(np.hanning(S), np.hanning(S)).astype(np.float32)


def window(img, cx, cy):
    x0, y0 = int(round(cx - S / 2)), int(round(cy - S / 2))
    pad = np.pad(img, S, mode='edge')
    return pad[y0 + S:y0 + 2 * S, x0 + S:x0 + 2 * S]


def phase_shift(a0, b0):
    """(dy, dx) such that b ≈ a moved by (dy, dx), and the correlation peak (1 = identical)."""
    A, B = np.fft.fft2((a0 - a0.mean()) * hann), np.fft.fft2((b0 - b0.mean()) * hann)
    R = A.conj() * B
    c = np.fft.ifft2(R / (np.abs(R) + 1e-6)).real
    py, px = np.unravel_index(np.argmax(c), c.shape)

    def sub(cm, c0, cp):                                            # parabolic sub-pixel peak
        d = cm - 2 * c0 + cp
        return 0.0 if abs(d) < 1e-9 else 0.5 * (cm - cp) / d
    dy = py + sub(c[py - 1, px], c[py, px], c[(py + 1) % S, px])
    dx = px + sub(c[py, px - 1], c[py, px], c[py, (px + 1) % S])
    dy, dx = (dy + S / 2) % S - S / 2, (dx + S / 2) % S - S / 2
    return dy, dx, float(c[py, px])


yy, xx = np.mgrid[0:S, 0:S] - S / 2
disc = (xx ** 2 + yy ** 2) <= (0.85 * r) ** 2
around = ((xx ** 2 + yy ** 2) <= (1.9 * r) ** 2) & ~((xx ** 2 + yy ** 2) <= (1.2 * r) ** 2)
w0 = window(F[0], cx0, cy0)
d0 = w0[disc] - w0[disc].mean()


def likeness(w):
    """How much the iris disc still looks like the first drawing's (normalized correlation: 1 = the same open eye,
    ~0 = lid and lashes across it; blind to brightness and contrast, so a clip that slowly brightens still reads open)."""
    d = w[disc] - w[disc].mean()
    return float((d * d0).sum() / (np.sqrt((d * d).sum() * (d0 * d0).sum()) + 1e-6))


opens, offs, sx, sy = [], [], 0.0, 0.0
for img in F:
    dy, dx, _ = phase_shift(w0, window(img, cx0 + sx, cy0 + sy))
    # the window was taken at the previous offset s: the eye sits at (offset - s) in it, so offset = s + shift
    nx, ny = sx + dx, sy + dy
    o_new, o_old = likeness(window(img, cx0 + nx, cy0 + ny)), likeness(window(img, cx0 + sx, cy0 + sy))
    if o_new > 0.6 and o_new >= o_old and np.hypot(nx - sx, ny - sy) < a.search * r:   # follow only an open eye; hold through a blink
        sx, sy = nx, ny
    opens.append(max(o_new, o_old) if (sx, sy) == (nx, ny) else o_old)
    offs.append((sx, sy))

op = np.clip((np.array(opens) - 0.3) / (0.7 - 0.3), 0, 1)        # likeness 0.3 = shut, 0.7 = open
op = op * op * (3 - 2 * op)
blinks, shut = [], None
for i, o in enumerate(op):
    if shut is None and o < 0.4:
        shut = i
    elif shut is not None and o > 0.7:
        blinks.append([round(shut / rate, 3), round(i / rate, 3)]); shut = None
eye = {'open': [round(float(o), 2) for o in op], 'dx': [round(x / W, 4) for x, _ in offs], 'dy': [round(y / H, 4) for _, y in offs],
       'blinks': blinks}
print(f'  {a.pack}: {{ eye: {json.dumps(eye, separators=(",", ":"))} }},')
print(f'{a.pack}: {len(F)} drawings at {rate}/s; blinks (s into the pack): {blinks or "none"}; '
      f'pupil moved up to {max(np.hypot(x, y) for x, y in offs):.1f} px', file=sys.stderr)

if a.sheet:
    cw = int(min(W, 5 * r))
    tiles = []
    for i, img in enumerate(frames):
        x, y = cx0 + offs[i][0], cy0 + offs[i][1]
        t = img.convert('RGB').crop((int(x - cw / 2), int(y - cw / 2), int(x + cw / 2), int(y + cw / 2)))
        d = ImageDraw.Draw(t)
        col = (255, 106, 26) if op[i] > 0.5 else (60, 160, 255)
        d.ellipse((cw / 2 - r, cw / 2 - r, cw / 2 + r, cw / 2 + r), outline=col, width=max(1, int(cw / 120)))
        d.text((4, 4), f'{i / rate:.2f}s open {op[i]:.2f}', fill=col)
        tiles.append(t.resize((240, 240)))
    cols = 8
    sheet = Image.new('RGB', (240 * cols, 240 * ((len(tiles) + cols - 1) // cols)))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 240, (i // cols) * 240))
    sheet.save(a.sheet)
    print(f'sheet: {a.sheet}', file=sys.stderr)
