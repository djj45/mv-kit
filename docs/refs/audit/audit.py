#!/usr/bin/env python3
"""
palette/composition audit: project A (pdoom-video plates) vs project B (pdoom-ds film).

Read-only with respect to both project trees: this script only opens source images
for reading and writes every output under /tmp/palette-audit/.

Frame sets
----------
A      : /Users/djj45/code/mv/pdoom-video/app/public/plates/fig01..fig14.jpg  (primary reference, n=14)
A_demo : 4 frames from pdoom-video/out/pdoom-anime-demo.mp4 (10 s film, sanity check only)
B      : 19 stratified-uniform samples from pdoom-ds/out/AGI-*-P(doom).mp4 over 0..149.5 s (primary)
B_stills: all 125 author stills in pdoom-ds/out/stills/ (robustness check, hand-picked moments)

Definitions
-----------
* All frames are resized to 960x540 (LANCZOS) before measurement so that Sobel
  gradient magnitudes are comparable across sources of different encoding history.
* luma  : Rec.709 on sRGB-encoded values, Y = .2126R + .7152G + .0722B  (0..1)
* HSV   : standard sRGB->HSV, H in degrees, S,V in 0..1
* chromatic pixel : S > 0.25 and V > 0.08
* hue concentration R : |mean(exp(i*theta))| over chromatic pixels, 0=uniform, 1=single hue
* signal share : chromatic pixels whose hue is within +/-25 deg of the hue of #FF4D12
* quantisation : 5 bits/channel -> 32768 possible bins
* nearest palette colour : min RGB Euclidean distance to A's 9 documented palette colours;
  "in palette" = that min distance <= 40/255
* edge  : Sobel (kernels /8, edge-replicated borders) on luma; mag = hypot(gx, gy)
* empty space : fraction of pixels whose max-channel (Chebyshev) distance to the frame's
  single most common 5-bit colour (bin centre) is <= 8/255
* drift : total-variation distance 0.5*sum|p_i - p_{i+1}| between 5-bit colour histograms
  of consecutive frames in film order (0 = identical palettes, 1 = disjoint)

Brightness-fair (added) metrics
-------------------------------
B's film is far darker than A's plates, and Sobel magnitude is contrast-weighted, so the raw
edge/empty metrics above can flatter a dark film. Three extra families remove that confound:

* *_norm : luma percentile-stretched to its own 1..99% range, Gaussian-blurred (sigma=1.2) to
  kill sensor/grain/compression noise, then Sobel. Measures structure, not contrast.
* local_std / flat_frac_norm : 5x5 local standard deviation on the same blurred normalised
  luma -> texture coverage and true (brightness-independent) negative space.
* n_components / component_ink_frac : 8-connected components of the normalised edge mask
  (labelled at 480x270, components >= 5 px) -> a proxy for "how many separate things are on
  screen at once" and how much area they cover.
* pooled_hue_R / hue_spread : per-frame hue statistics are pooled across the whole film to
  measure palette unity ACROSS frames (per-frame R only says a frame is internally
  monochromatic).
"""

import csv
import json
import glob
import math
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

Image.MAX_IMAGE_PIXELS = None

OUT = "/tmp/palette-audit"
W, H = 960, 540
BIN5 = 32
SIGNAL_HEX = "#FF4D12"
DIST_THRESH = 40.0 / 255.0
EMPTY_THRESH = 8.0 / 255.0

PALETTE = {
    "ink": "#0A0A0B",
    "ink2": "#151517",
    "graphite": "#5E5B57",
    "ash": "#9C978F",
    "bone": "#EEE9DF",
    "signal": "#FF4D12",
    "ember": "#FF8A3D",
    "blood": "#C21D0B",
    "acid": "#D8FF3C",
}


def hex_to_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


PAL_KEYS = list(PALETTE.keys())
PAL_RGB = np.stack([hex_to_rgb(PALETTE[k]) for k in PAL_KEYS])  # (9,3)


def _hue_of_hex(h):
    r, g, b = hex_to_rgb(h)
    mx, mn = max(r, g, b), min(r, g, b)
    d = mx - mn
    if d <= 1e-12:
        return 0.0
    if mx == r:
        hh = ((g - b) / d) % 6.0
    elif mx == g:
        hh = (b - r) / d + 2.0
    else:
        hh = (r - g) / d + 4.0
    return (hh * 60.0) % 360.0


SIGNAL_HUE = _hue_of_hex(SIGNAL_HEX)  # ~15 deg for #FF4D12


def hue_deg(rgb):
    """Vectorised hue in degrees for an (N,3) array in 0..1 (undefined where S=0)."""
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    mx = rgb.max(axis=1)
    mn = rgb.min(axis=1)
    d = mx - mn
    h = np.zeros_like(mx)
    nz = d > 1e-12
    idx = nz & (mx == r)
    h[idx] = ((g[idx] - b[idx]) / d[idx]) % 6.0
    idx = nz & (mx == g)
    h[idx] = (b[idx] - r[idx]) / d[idx] + 2.0
    idx = nz & (mx == b)
    h[idx] = (r[idx] - g[idx]) / d[idx] + 4.0
    return (h * 60.0) % 360.0


def sobel_mag(luma):
    p = np.pad(luma, 1, mode="edge")
    gx = (
        -p[:-2, :-2] + p[:-2, 2:]
        - 2 * p[1:-1, :-2] + 2 * p[1:-1, 2:]
        - p[2:, :-2] + p[2:, 2:]
    ) / 8.0
    gy = (
        -p[:-2, :-2] - 2 * p[:-2, 1:-1] - p[:-2, 2:]
        + p[2:, :-2] + 2 * p[2:, 1:-1] + p[2:, 2:]
    ) / 8.0
    return np.hypot(gx, gy)


def histogram5(rgb):
    q = np.clip((rgb * BIN5).astype(np.int64), 0, BIN5 - 1)
    code = q[:, 0] * BIN5 * BIN5 + q[:, 1] * BIN5 + q[:, 2]
    hist = np.bincount(code, minlength=BIN5 ** 3).astype(np.float64)
    return q, hist / hist.sum()


def measure(path, label, t, size=(W, H)):
    img = Image.open(path).convert("RGB")
    if size is not None and img.size != size:
        img = img.resize(size, Image.LANCZOS)
    h, w = img.size[1], img.size[0]
    rgb = np.asarray(img, dtype=np.float64).reshape(-1, 3) / 255.0

    luma = rgb @ np.array([0.2126, 0.7152, 0.0722])
    mx = rgb.max(axis=1)
    mn = rgb.min(axis=1)
    sat = np.where(mx > 1e-12, (mx - mn) / np.maximum(mx, 1e-12), 0.0)
    val = mx
    hue = hue_deg(rgb)

    chroma = (sat > 0.25) & (val > 0.08)
    lit = val > 0.15  # pixels bright enough for S to be meaningful rather than quantisation noise
    n = rgb.shape[0]
    nch = int(chroma.sum())

    if nch > 0:
        th = np.deg2rad(hue[chroma])
        R = float(np.hypot(np.cos(th).mean(), np.sin(th).mean()))
        hh = np.bincount((hue[chroma].astype(np.int64) % 360), minlength=360).astype(np.float64)
        hp = hh / hh.sum()
        hue_entropy = float(-(hp[hp > 0] * np.log2(hp[hp > 0])).sum())
        sig = np.deg2rad(hue[chroma])
        dh = np.abs(np.rad2deg(np.angle(np.exp(1j * (sig - np.deg2rad(SIGNAL_HUE))))))
        signal_share = float((dh <= 25.0).mean())
        h30 = hh.reshape(12, 30).sum(axis=1) / hh.sum()
        top30 = sorted(range(12), key=lambda i: -h30[i])[:3]
        hue_peaks = ";".join(f"{i*30+15}deg:{h30[i]*100:.0f}%" for i in top30 if h30[i] > 0)
        hue_mean = float(np.rad2deg(np.angle(np.mean(np.exp(1j * th))))) % 360.0
        # how many distinct hue families coexist in this frame?
        n_lobes_chr = int((h30 >= 0.10).sum())            # >=10% of chromatic pixels
        n_lobes_area = int((hh.reshape(12, 30).sum(axis=1) / n >= 0.02).sum())  # >=2% of all pixels
        sat_chromatic = float(sat[chroma].mean())
    else:
        R = hue_entropy = signal_share = hue_mean = sat_chromatic = 0.0
        hue_peaks = ""
        n_lobes_chr = n_lobes_area = 0

    # palette assignment
    d = np.empty((n, len(PAL_KEYS)))
    for i, c in enumerate(PAL_RGB):
        d[:, i] = np.sqrt(((rgb - c) ** 2).sum(axis=1))
    nearest = d.argmin(axis=1)
    min_dist = d.min(axis=1)
    pal_share = {k: float((nearest == i).mean()) for i, k in enumerate(PAL_KEYS)}
    in_palette = float((min_dist <= DIST_THRESH).mean())

    # 5-bit colours
    q, hist = histogram5(rgb)
    nz = np.nonzero(hist)[0]
    order = nz[np.argsort(-hist[nz])]
    top = order[:6]
    top6 = []
    for o in top:
        o = int(o)
        r = (o // (BIN5 * BIN5)) % BIN5
        g = (o // BIN5) % BIN5
        b = o % BIN5
        hexs = "#%02X%02X%02X" % tuple(int(round((c + 0.5) / BIN5 * 255)) for c in (r, g, b))
        top6.append((hexs, float(hist[o])))
    distinct = int(len(nz))
    top1_share = float(hist[order[0]])
    top6_share = float(hist[order[:6]].sum())

    # empty space: Chebyshev distance to modal 5-bit colour centre
    o = int(order[0])
    r = (o // (BIN5 * BIN5)) % BIN5
    g = (o // BIN5) % BIN5
    b = o % BIN5
    modal = np.array([(r + 0.5) / BIN5, (g + 0.5) / BIN5, (b + 0.5) / BIN5])
    empty = float((np.abs(rgb - modal).max(axis=1) <= EMPTY_THRESH).mean())

    gmag = sobel_mag(luma.reshape(h, w))

    # ---- brightness-fair structure metrics ------------------------------------
    lo, hi = np.percentile(luma, 1.0), np.percentile(luma, 99.0)
    ln = np.clip((luma - lo) / (hi - lo + 1e-9), 0.0, 1.0).reshape(h, w)
    ln = ndi.gaussian_filter(ln, 1.2)
    gmag_n = sobel_mag(ln)
    m1 = ndi.uniform_filter(ln, 5)
    m2 = ndi.uniform_filter(ln * ln, 5)
    lstd = np.sqrt(np.maximum(m2 - m1 * m1, 0.0))
    edge_mask = gmag_n > 0.10
    small = edge_mask[::2, ::2]  # label at half the measurement resolution
    lab, nlab = ndi.label(small, structure=np.ones((3, 3), dtype=int))
    # minimum element size kept a constant fraction of the frame (5 px at 480x270)
    min_area = max(4, int(round(5.0 * (small.shape[1] / 480.0) ** 2)))
    if nlab:
        areas = np.bincount(lab.ravel())[1:]
        keep = areas >= min_area
        n_comp = int(keep.sum())
        comp_ink = float(areas[keep].sum() * 4.0 / n)  # x4 back to measurement-res pixels
    else:
        n_comp, comp_ink = 0, 0.0

    # fine granularity: label at full measurement resolution so that B's tiny monospace
    # read-outs and 1-2 px point marks count as separate elements
    min_area_fine = max(5, int(round(20.0 * (w / 1920.0) ** 2)))
    labf, nlabf = ndi.label(edge_mask, structure=np.ones((3, 3), dtype=int))
    if nlabf:
        areasf = np.bincount(labf.ravel())[1:]
        keepf = areasf >= min_area_fine
        n_comp_fine = int(keepf.sum())
        med_area = float(np.median(areasf[keepf]) / n) if keepf.any() else 0.0
    else:
        n_comp_fine, med_area = 0, 0.0

    return {
        "res_px": w,
        "label": label,
        "file": os.path.basename(path),
        "t_s": t,
        "luma_mean": float(luma.mean()),
        "luma_median": float(np.median(luma)),
        "black_lt006": float((luma < 0.06).mean()),
        "highlight_gt075": float((luma > 0.75).mean()),
        "sat_mean": float(sat.mean()),
        "sat_median": float(np.median(sat)),
        "sat_p90": float(np.percentile(sat, 90)),
        "sat_mean_lit": float(sat[lit].mean()) if lit.any() else 0.0,
        "frac_v_gt015": float(lit.mean()),
        "chromatic_frac": nch / n,
        "hue_R": R,
        "hue_mean_deg": hue_mean,
        "hue_entropy_bits": hue_entropy,
        "signal_pm25_frac": signal_share,
        "n_hue_lobes_chromatic10": n_lobes_chr,
        "n_hue_families_area2": n_lobes_area,
        "sat_mean_chromatic": sat_chromatic,
        "hue_peaks_30deg": hue_peaks,
        "distinct_5bit": distinct,
        "top1_share": top1_share,
        "top6_share": top6_share,
        "top6_colours": " ".join(f"{h}:{s*100:.1f}%" for h, s in top6),
        "modal_colour": "#%02X%02X%02X" % tuple(int(round(c * 255)) for c in modal),
        "in_palette_frac": in_palette,
        "palette_min_dist_mean": float(min_dist.mean()),
        "palette_min_dist_median": float(np.median(min_dist)),
        **{f"pal_{k}": v for k, v in pal_share.items()},
        "edge_mean": float(gmag.mean()),
        "edge_frac_gt005": float((gmag > 0.05).mean()),
        "edge_frac_gt010": float((gmag > 0.10).mean()),
        "empty_frac": empty,
        "edge_mean_norm": float(gmag_n.mean()),
        "edge_frac_norm_gt010": float(edge_mask.mean()),
        "local_std_frac_gt005": float((lstd > 0.05).mean()),
        "flat_frac_norm": float((lstd < 0.01).mean()),
        "n_components": n_comp,
        "component_ink_frac": comp_ink,
        "n_components_fine": n_comp_fine,
        "median_component_area_frac": med_area,
        "_hist": hist,
        "_huehist": hh if nch > 0 else np.zeros(360),
    }


def tv_drift(h1, h2):
    return float(0.5 * np.abs(h1 - h2).sum())


def agg(rows):
    keys = [
        "luma_mean", "luma_median", "black_lt006", "highlight_gt075",
        "sat_mean", "sat_median", "sat_mean_lit", "frac_v_gt015", "chromatic_frac", "hue_R", "hue_entropy_bits",
        "signal_pm25_frac", "distinct_5bit", "top1_share", "top6_share",
        "n_hue_lobes_chromatic10", "n_hue_families_area2", "sat_mean_chromatic",
        "in_palette_frac", "palette_min_dist_mean", "edge_mean",
        "edge_frac_gt005", "edge_frac_gt010", "empty_frac",
        "edge_mean_norm", "edge_frac_norm_gt010", "local_std_frac_gt005",
        "flat_frac_norm", "n_components", "component_ink_frac", "n_components_fine", "median_component_area_frac",
    ]
    out = {}
    for k in keys:
        v = np.array([r[k] for r in rows], dtype=np.float64)
        out[k] = (float(v.mean()), float(v.std(ddof=1)) if len(v) > 1 else 0.0)
    drifts = []
    for a, b in zip(rows, rows[1:]):
        if a["t_s"] is not None and b["t_s"] is not None and b["t_s"] < a["t_s"]:
            continue
        drifts.append(tv_drift(a["_hist"], b["_hist"]))
    out["colour_drift_TV"] = (float(np.mean(drifts)) if drifts else float("nan"),
                              float(np.std(drifts, ddof=1)) if len(drifts) > 1 else 0.0)

    # ---- cross-frame palette unity (pooled over the whole film) ---------------
    pool = np.sum([r["_huehist"] for r in rows], axis=0)
    tot = pool.sum()
    if tot > 0:
        p = pool / tot
        th = np.deg2rad(np.arange(360) + 0.5)
        pooled_R = float(np.hypot((p * np.cos(th)).sum(), (p * np.sin(th)).sum()))
        h30 = pool.reshape(12, 30).sum(axis=1) / tot
        top30 = sorted(range(12), key=lambda i: -h30[i])[:3]
        lobes = ";".join(f"{i*30+15}deg:{h30[i]*100:.0f}%" for i in top30 if h30[i] > 0)
        mean_hue = float(np.rad2deg(np.angle((p * np.exp(1j * th)).sum()))) % 360.0
        # circular spread of per-frame mean hues, weighted by chromatic pixel count
        mh = np.array([r["hue_mean_deg"] for r in rows if r["chromatic_frac"] > 0.02])
        if len(mh) > 1:
            z = np.exp(1j * np.deg2rad(mh))
            hue_spread = float(np.rad2deg(np.sqrt(max(-2 * np.log(max(abs(z.mean()), 1e-9)), 0.0))))
        else:
            hue_spread = 0.0
    else:
        pooled_R, lobes, mean_hue, hue_spread = 0.0, "", 0.0, 0.0
    out["pooled_hue_R"] = (pooled_R, float("nan"))
    out["hue_spread_deg"] = (hue_spread, float("nan"))
    out["pooled_hue_lobes"] = lobes
    hd = []
    for a, b in zip(rows, rows[1:]):
        if a["chromatic_frac"] > 0.02 and b["chromatic_frac"] > 0.02:
            d = abs((b["hue_mean_deg"] - a["hue_mean_deg"] + 180.0) % 360.0 - 180.0)
            hd.append(d)
    out["hue_drift_deg"] = (float(np.mean(hd)) if hd else float("nan"),
                            float(np.std(hd, ddof=1)) if len(hd) > 1 else float("nan"))
    out["n"] = len(rows)
    return out


def load_set(name, paths, times, size=(W, H)):
    rows = []
    for p, t in zip(paths, times):
        rows.append(measure(p, name, t, size))
    print(f"  {name:16s} n={len(rows)} res={size}", file=sys.stderr)
    return rows


def a_times():
    """Real film timestamps of fig01..fig14, from pdoom-video's own plates.json (scene order).
    Falls back to plate index if the file is missing."""
    figs = ["open", "loss", "room", "shoggoth", "spacetime", "ascent", "bureau",
            "leftturn", "paperclips", "fuse", "stack", "dense", "loom", "ilya"]
    p = "/Users/djj45/code/mv/pdoom-video/app/plates.json"
    try:
        with open(p) as f:
            ov = json.load(f)
        return [float(ov[k]) for k in figs]
    except Exception as e:  # pragma: no cover
        print(f"  (plates.json unavailable: {e}; using plate index as t)", file=sys.stderr)
        return list(range(1, 15))


def main():
    A_DIR = "/Users/djj45/code/mv/pdoom-video/app/public/plates"
    B_DIR = "/Users/djj45/code/mv/mv-kit/projects/pdoom-ds/out"
    NATIVE = None  # sources are all 1920x1080

    src = {
        "A": ([f"{A_DIR}/fig{i:02d}.jpg" for i in range(1, 15)], a_times()),
        "A_demo": (
            sorted(glob.glob(f"{OUT}/frames/Ademo/*.png")),
            None,
        ),
        "B": (sorted(glob.glob(f"{OUT}/frames/B_full/*.png")), None),
        "B_stills": (sorted(glob.glob(f"{B_DIR}/stills/*.png")), None),
    }
    src["A_demo"] = (src["A_demo"][0], [float(re.search(r"_t([\d.]+)\.png", p).group(1)) for p in src["A_demo"][0]])
    src["B"] = (src["B"][0], [float(re.search(r"_t([\d.]+)\.png", p).group(1)) for p in src["B"][0]])
    src["B_stills"] = (src["B_stills"][0], [float(re.search(r"t([\d.]+)\.png", p).group(1)) for p in src["B_stills"][0]])

    sets = {}
    for name in ("A", "A_demo", "B", "B_stills"):
        sets[f"{name}@960"] = load_set(f"{name}@960", src[name][0], src[name][1], (W, H))
    for name in ("A", "A_demo", "B", "B_stills"):
        sets[f"{name}@native"] = load_set(f"{name}@native", src[name][0], src[name][1], NATIVE)

    order = ["A@960", "A_demo@960", "B@960", "B_stills@960",
             "A@native", "A_demo@native", "B@native", "B_stills@native"]
    cols = [k for k in sets[order[0]][0].keys() if not k.startswith("_")]
    csv_path = f"{OUT}/frame_metrics.csv"
    with open(csv_path, "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        wr.writeheader()
        for name in order:
            for r in sets[name]:
                wr.writerow(r)

    aggs = {k: agg(v) for k, v in sets.items()}
    with open(f"{OUT}/aggregates.csv", "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["set", "n", "metric", "mean", "sd", "note"])
        for name, a in aggs.items():
            for k, v in a.items():
                if k == "n":
                    continue
                if isinstance(v, str):
                    wr.writerow([name, a["n"], k, "", "", v])
                else:
                    m, s = v
                    wr.writerow([name, a["n"], k, f"{m:.5f}",
                                 "" if math.isnan(s) else f"{s:.5f}", ""])

    import json

    def clean(v):
        if isinstance(v, tuple):
            return [None if (isinstance(x, float) and math.isnan(x)) else x for x in v]
        return v

    with open(f"{OUT}/aggregates.json", "w") as f:
        json.dump({k: {kk: clean(vv) for kk, vv in v.items()} for k, v in aggs.items()}, f, indent=1)
    with open(f"{OUT}/rows.json", "w") as f:
        json.dump(
            {k: [{kk: vv for kk, vv in r.items() if not kk.startswith("_")} for r in v] for k, v in sets.items()},
            f, indent=1,
        )
    print(f"wrote {csv_path}", file=sys.stderr)

    # pooled hue histograms (all chromatic pixels of a whole set) for figures
    pooled = {}
    for k, v in sets.items():
        h = np.sum([r["_huehist"] for r in v], axis=0)
        pooled[k] = (h / h.sum()).tolist() if h.sum() > 0 else h.tolist()
    with open(f"{OUT}/hue_pooled.json", "w") as f:
        json.dump(pooled, f)


if __name__ == "__main__":
    main()
