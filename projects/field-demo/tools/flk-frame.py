#!/usr/bin/env python3
"""Where the flock sits in the frame: the bounding box of the bright content that is not UI, as a % of the frame.

  uv run python tools/flk-frame.py out/stills/t0014.400.png [...]

The UI (the code panel top-left, the HUD top-right, the section label, the terminal bottom-left) is masked out; what
is left is the flock. Prints the margins to each edge as a percentage of the frame, and the box.
"""
import sys
from PIL import Image

UI = [(0, 0, 620, 420), (1450, 0, 1920, 260), (0, 30, 460, 90), (0, 920, 1010, 1080),
      (640, 985, 1300, 1065), (1180, 1010, 1920, 1070)]
for p in sys.argv[1:]:
    im = Image.open(p).convert('L')
    w, h = im.size
    px = im.load()
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if px[x, y] < 60:
                continue
            if any(a <= x < c and b <= y < d for a, b, c, d in UI):
                continue
            xs.append(x); ys.append(y)
    if not xs:
        print(f'{p}: nothing bright outside the UI')
        continue
    xs.sort(); ys.sort()
    q = lambda v, f: v[min(len(v) - 1, int(len(v) * f))]
    x0, x1, y0, y1 = q(xs, 0.05), q(xs, 0.95), q(ys, 0.05), q(ys, 0.95)
    print(f'{p}: 5–95 % box {x0},{y0} – {x1},{y1}   margins  L {x0 / w * 100:4.1f} %  R {(w - x1) / w * 100:4.1f} %  '
          f'T {y0 / h * 100:4.1f} %  B {(h - y1) / h * 100:4.1f} %')
