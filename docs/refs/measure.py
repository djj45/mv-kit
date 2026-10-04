"""measure.py — 对比两个 MV 的配色与构图（给 docs/REFERENCE-pdoom-video.md 用的量尺）

用法：
    /Users/djj45/code/mv/mv-kit/.venv/bin/python docs/refs/measure.py <A的帧> <B的帧>
    # 例：<A> = '/Users/djj45/code/mv/pdoom-video/app/public/plates/fig*.jpg'
    #     <B> = '/tmp/mine/f*.jpg'   （从成片抽同刻的帧）

输出四组指标（都是逐帧算、再取中位/汇总）：
  1. 色相纪律：帧内色相集中度 R、有颜色像素占比、落在信号橙 ±25° 的比例
  2. 跨帧色相漂移：每帧平均色相的圆标准差、用到的 30° 色相区间数  ← "统一配色"的判据
  3. 元素结构：最大单元素占画面面积、可见元素数（>0.1% 画面）
  4. 墨量与留白：墨覆盖率、最大团块的墨占比

依赖 numpy / PIL（mv-kit 的 .venv 里都有）。
"""
import sys
import glob
import numpy as np
from PIL import Image

SIGNAL_HUE = 17.0  # #FF4D12


def load(p, w=480, h=270):
    return np.asarray(Image.open(p).convert('RGB').resize((w, h), Image.LANCZOS), dtype=np.float32) / 255.0


def hsv(rgb):
    mx, mn = rgb.max(2), rgb.min(2)
    d = mx - mn
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hh = np.zeros_like(mx)
    m = d > 1e-6
    i = m & (mx == r); hh[i] = ((g - b)[i] / d[i]) % 6
    i = m & (mx == g); hh[i] = ((b - r)[i] / d[i]) + 2
    i = m & (mx == b); hh[i] = ((r - g)[i] / d[i]) + 4
    return hh * 60.0, s, mx


def frame_metrics(p):
    rgb = load(p)
    hue, s, v = hsv(rgb)
    chroma = (s > 0.25) & (v > 0.08)
    out = {}
    if chroma.sum() >= 50:
        a = np.deg2rad(hue[chroma])
        out['R'] = float(np.hypot(np.cos(a).mean(), np.sin(a).mean()))
        dist = np.rad2deg(np.abs((hue[chroma] + 180) % 360 - 180) - SIGNAL_HUE)
        out['orange'] = float((dist < 25).mean())
        wgt = (s * v)[chroma]
        aa = np.deg2rad(hue[chroma])
        out['mean_hue'] = float(np.rad2deg(np.arctan2((np.sin(aa) * wgt).sum(), (np.cos(aa) * wgt).sum())) % 360)
    else:
        out.update(R=0.0, orange=0.0, mean_hue=None)
    out['chroma_share'] = float(chroma.mean())

    g = np.asarray(Image.open(p).convert('L').resize((640, 360), Image.LANCZOS), dtype=np.float32) / 255.0
    hist = np.bincount(np.clip((g * 64).astype(np.int32).ravel(), 0, 63), minlength=64)
    ink = g > hist.argmax() / 64.0 + 0.05
    out['ink'] = float(ink.mean())
    if ink.sum() >= 200:
        try:
            from scipy import ndimage as ndi
        except ImportError:
            ndi = None
        if ndi is not None:
            lab, _ = ndi.label(ink, structure=np.ones((3, 3)))
            sizes = np.sort(np.bincount(lab.ravel())[1:])[::-1]
            out['top1'] = float(sizes[0] / ink.size)
            out['n_elems'] = float((sizes >= 0.001 * ink.size).sum())
    out.setdefault('top1', 0.0)
    out.setdefault('n_elems', 0.0)
    return out


def circular_stats(rows):
    hs = np.array([r['mean_hue'] for r in rows if r['mean_hue'] is not None])
    if not len(hs):
        return 0.0, 0.0, 0
    a = np.deg2rad(hs)
    R = float(np.hypot(np.cos(a).mean(), np.sin(a).mean()))
    sd = float(np.rad2deg(np.sqrt(-2 * np.log(max(R, 1e-9)))))
    bins = np.zeros(12)
    for r in rows:
        if r['mean_hue'] is not None:
            bins[int(r['mean_hue'] // 30) % 12] += r['chroma_share']
    used = int((bins > bins.sum() * 0.05).sum()) if bins.sum() else 0
    return R, sd, used


def report(name, files):
    rows = [frame_metrics(f) for f in sorted(files)]
    if not rows:
        print(f"{name}: no frames"); return None
    med = lambda k: float(np.median([r[k] for r in rows]))
    R, sd, used = circular_stats(rows)
    print(f"\n=== {name}  ({len(rows)} frames)")
    print(f"  帧内色相集中度 R      {med('R'):.3f}")
    print(f"  有颜色像素占比        {med('chroma_share'):.3f}")
    print(f"  信号橙 ±25° 占比      {med('orange'):.3f}")
    print(f"  跨帧色相圆标准差      {sd:.1f}°   (越小越统一)")
    print(f"  用到的 30° 色相区间   {used}")
    print(f"  最大单元素占画面      {med('top1'):.3f}")
    print(f"  可见元素数(>0.1%)     {med('n_elems'):.1f}")
    print(f"  墨覆盖率              {med('ink'):.3f}")
    return rows


if __name__ == '__main__':
    a = sorted(glob.glob(sys.argv[1])) if len(sys.argv) > 1 else []
    b = sorted(glob.glob(sys.argv[2])) if len(sys.argv) > 2 else []
    report("A  " + (sys.argv[1] if a else "(none)"), a)
    if b:
        report("B  " + sys.argv[2], b)
