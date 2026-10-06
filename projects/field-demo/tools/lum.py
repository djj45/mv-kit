#!/usr/bin/env python3
"""Mean luminance of a rendered frame, and how much of it is a highlight.

  uv run python tools/lum.py out/stills/t0008.300.png [more.png …]

Prints, per file: mean luminance (0–255), the 99.5th percentile, and the share of pixels above 200.
"""
import sys
from PIL import Image

for p in sys.argv[1:]:
    im = Image.open(p).convert('L')
    h = im.histogram()
    n = sum(h)
    tot = sum(i * c for i, c in enumerate(h))
    cum = 0
    p995 = 0
    for i, c in enumerate(h):
        cum += c
        if cum >= n * 0.995:
            p995 = i
            break
    hi = sum(h[201:]) / n * 100
    print(f'{p}: mean {tot / n:5.1f}   p99.5 {p995:3d}   pixels > 200: {hi:4.2f} %')
