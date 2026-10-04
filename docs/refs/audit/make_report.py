#!/usr/bin/env python3
"""Generate REPORT.md (+ figure) from rows.json / aggregates.json produced by audit.py."""
import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

OUT = "/tmp/palette-audit"
rows = json.load(open(f"{OUT}/rows.json"))
aggs = json.load(open(f"{OUT}/aggregates.json"))

SIG = 15.0  # hue of #FF4D12


def hue_lobes(r):
    return " ".join(x for x in r["hue_peaks_30deg"].split(";")[:2])


def per_frame_table(setname, title, note=""):
    cols = [
        ("t (s) / fig", lambda r: f"{r['t_s']:.1f}" if setname.startswith("B") else f"{r['file'][3:5]} · {r['t_s']:.1f}s"),
        ("luma", lambda r: f"{r['luma_mean']:.3f}"),
        ("blk<.06", lambda r: f"{r['black_lt006']*100:.0f}%"),
        ("hi>.75", lambda r: f"{r['highlight_gt075']*100:.0f}%"),
        ("S(lit)", lambda r: f"{r['sat_mean_lit']:.2f}"),
        ("chr%", lambda r: f"{r['chromatic_frac']*100:.0f}%"),
        ("hueR", lambda r: f"{r['hue_R']:.2f}"),
        ("sig±25°", lambda r: f"{r['signal_pm25_frac']*100:.0f}%"),
        ("5-bit", lambda r: f"{r['distinct_5bit']}"),
        ("top6", lambda r: f"{r['top6_share']*100:.0f}%"),
        ("inpal", lambda r: f"{r['in_palette_frac']*100:.0f}%"),
        ("edge_n", lambda r: f"{r['edge_mean_norm']:.4f}"),
        ("compF", lambda r: f"{r['n_components_fine']}"),
        ("empty", lambda r: f"{r['empty_frac']*100:.0f}%"),
        ("top hue lobes", hue_lobes),
    ]
    head = "| " + " | ".join(c[0] for c in cols) + " |"
    sep = "|" + "|".join("---" for _ in cols) + "|"
    body = "\n".join("| " + " | ".join(f(r) for _, f in cols) + " |" for r in rows[setname])
    return f"### {title}\n{note}\n\n{head}\n{sep}\n{body}\n"


METRICS = [
    ("luma_mean", "mean luma", "A higher: A has bright scenes, B is a black film"),
    ("luma_median", "median luma", ""),
    ("black_lt006", "deep-black share (luma<0.06)", "B higher"),
    ("highlight_gt075", "highlight share (luma>0.75)", "A higher"),
    ("frac_v_gt015", "lit share (V>0.15)", "A higher"),
    ("sat_mean", "mean HSV S (raw, all pixels)", "artefact-prone in near-black frames"),
    ("sat_mean_lit", "mean HSV S (V>0.15 only)", "exposure-gated; ~equal"),
    ("sat_mean_chromatic", "mean HSV S (chromatic px only)", "A slightly higher"),
    ("chromatic_frac", "chromatic share (S>.25 & V>.08)", "A higher"),
    ("hue_R", "per-frame hue concentration R", "equal"),
    ("pooled_hue_R", "pooled hue R (across whole film)", "A much higher"),
    ("hue_spread_deg", "circular spread of per-frame mean hue", "A far lower"),
    ("signal_pm25_frac", "chromatic px within ±25° of #FF4D12", "A much higher"),
    ("n_hue_lobes_chromatic10", "hue families ≥10% of chromatic px", "B higher"),
    ("hue_drift_deg", "frame-to-frame hue change", "A far lower"),
    ("hue_entropy_bits", "hue entropy (bits)", "A higher"),
    ("distinct_5bit", "distinct 5-bit colours", "A higher"),
    ("top6_share", "share held by top-6 colours", "B higher"),
    ("in_palette_frac", "share within 40/255 of A's palette", "B higher"),
    ("palette_min_dist_mean", "mean distance to nearest palette colour", "B lower"),
    ("edge_mean", "mean Sobel gradient (raw)", "A higher"),
    ("edge_mean_norm", "mean Sobel gradient (normalised)", "A higher"),
    ("edge_frac_norm_gt010", "edge coverage (norm. gradient>0.10)", "A higher"),
    ("local_std_frac_gt005", "texture coverage (5×5 local SD>0.05)", "A higher"),
    ("flat_frac_norm", "flat area (brightness-independent)", "B higher"),
    ("n_components", "elements, coarse (≥0.008% of frame)", "A higher"),
    ("n_components_fine", "elements, fine (≥0.001% of frame)", "B higher"),
    ("component_ink_frac", "area covered by elements", "A higher"),
    ("empty_frac", "empty space (within 8/255 of modal colour)", "B higher"),
    ("colour_drift_TV", "colour-histogram drift (consecutive)", "weak for A, see note"),
]


def direction(k):
    """Direction of the A->B difference, computed from the data at both resolutions."""
    out = []
    for res in ("960", "native"):
        a = aggs[f"A@{res}"][k][0]
        b = aggs[f"B@{res}"][k][0]
        rel = (b - a) / max(abs(a), abs(b), 1e-12)
        out.append("≈" if abs(rel) < 0.02 else ("B>A" if b > a else "A>B"))
    return " ".join(out)


def agg_table():
    lines = ["| metric | A (14 plates) | B (19 uniform) | B stills (125) | direction @960 / @1920 |",
             "|---|---|---|---|---|"]
    for k, label, note in METRICS:
        cells = []
        for s in ("A@960", "B@960", "B_stills@960"):
            m, sd = aggs[s][k]
            if sd is None:
                cells.append(f"{m:.4g}")
            else:
                cells.append(f"{m:.4g} ± {sd:.3g}")
        lines.append(f"| {label} | {cells[0]} | {cells[1]} | {cells[2]} | {direction(k)} |")
    return "\n".join(lines)


def robustness_table():
    keys = ["pooled_hue_R", "hue_spread_deg", "signal_pm25_frac", "n_components_fine",
            "flat_frac_norm", "edge_mean_norm", "distinct_5bit"]
    lines = ["| metric | A@960 | A@1920 | B@960 | B@1920 | B stills@1920 |", "|---|---|---|---|---|---|"]
    for k in keys:
        c = [f"{aggs[s][k][0]:.4g}" for s in ("A@960", "A@native", "B@960", "B@native", "B_stills@native")]
        lines.append(f"| {k} | " + " | ".join(c) + " |")
    return "\n".join(lines)


# ---------------------------------------------------------------- figure
fig, axes = plt.subplots(2, 2, figsize=(12.5, 7.6), dpi=130)
ax = axes[0][0]
hue_pooled = json.load(open(f"{OUT}/hue_pooled.json"))
bins = np.arange(12) * 30 + 15
wid = 6.0
for i, (s, lab, col) in enumerate((
    ("A@native", "A plates (n=14)", "#FF4D12"),
    ("B@native", "B uniform (n=19)", "#2E7FA8"),
    ("B_stills@native", "B stills (n=125)", "#9CC7DC"),
)):
    h = np.array(hue_pooled[s]).reshape(12, 30).sum(axis=1) * 100
    ax.bar(bins + (i - 1) * wid, h, width=wid, color=col, label=lab)
ax.axvspan(SIG - 25, SIG + 25, color="#FF4D12", alpha=0.10)
ax.set_xlim(0, 360)
ax.set_xticks(np.arange(0, 361, 60))
ax.set_xlabel("hue (deg)")
ax.set_ylabel("% of all chromatic pixels")
ax.set_title("a. Pooled hue: A = one orange lobe,\nB = cyan + orange + violet", fontsize=10)
ax.legend(fontsize=8)

ax = axes[0][1]
a = [r for r in rows["A@native"]]
b = [r for r in rows["B@native"]]
ax.axhspan(SIG - 25, SIG + 25, color="#FF4D12", alpha=0.12)
ax.scatter(range(1, len(a) + 1), [r["hue_mean_deg"] for r in a], s=60, color="#FF4D12", label="A plates (index)", zorder=3)
ax.scatter([r["t_s"] for r in b], [r["hue_mean_deg"] for r in b], s=60, color="#2E7FA8", label="B uniform (time)", zorder=3)
ax.set_xlabel("plate index  /  film time (s)")
ax.set_ylabel("mean hue of chromatic pixels (deg)")
ax.set_ylim(0, 360)
ax.set_yticks(np.arange(0, 361, 60))
ax.set_title("b. Per-frame mean hue: A flat (σ=5.4°),\nB rotates (σ=68.8°)", fontsize=10)
ax.legend(fontsize=8)

ax = axes[1][0]
names = ["edge_mean_norm", "local_std_frac_gt005", "component_ink_frac", "flat_frac_norm", "empty_frac"]
labs = ["edge density\n(norm)", "texture\ncoverage", "element ink\ncoverage", "flat area\n(norm)", "empty\nspace"]
x = np.arange(len(names))
va = [aggs["A@native"][k][0] for k in names]
vb = [aggs["B@native"][k][0] for k in names]
ax.bar(x - 0.2, va, 0.4, color="#FF4D12", label="A")
ax.bar(x + 0.2, vb, 0.4, color="#2E7FA8", label="B")
for xi, (p, q) in enumerate(zip(va, vb)):
    ax.text(xi - 0.2, p, f"{p:.3f}", ha="center", va="bottom", fontsize=7)
    ax.text(xi + 0.2, q, f"{q:.3f}", ha="center", va="bottom", fontsize=7)
ax.set_xticks(x)
ax.set_xticklabels(labs, fontsize=8)
ax.set_title("c. Composition: A = more edge/texture/ink,\nB = more flat, empty area", fontsize=10)
ax.legend(fontsize=8)

ax = axes[1][1]
for s, lab, col, mk in (("A@native", "A plates", "#FF4D12", "o"), ("B@native", "B uniform", "#2E7FA8", "o"),
                        ("B_stills@native", "B stills", "#2E7FA8", ".")):
    ax.scatter([r["n_components_fine"] for r in rows[s]], [r["component_ink_frac"] * 100 for r in rows[s]],
               s=55 if mk == "o" else 12, alpha=0.75, color=col, marker=mk, label=lab)
ax.set_xlabel("number of separate elements (fine granularity)")
ax.set_ylabel("area covered by elements (% of frame)")
ax.set_title("d. B has more, smaller, dimmer elements;\nA has fewer, heavier ones", fontsize=10)
ax.legend(fontsize=8)
fig.tight_layout()
fig.savefig(f"{OUT}/fig_palette_composition.png")
print("wrote figure")

# ---------------------------------------------------------------- report
md = f"""# Palette / composition audit — A `pdoom-video` plates vs B `pdoom-ds` film

Objective test of the impression: *"A looks palette-unified and its frames have few simultaneous
elements; B feels busier and more colourful."*

**Sources (read-only).**
A = `pdoom-video/app/public/plates/fig01..fig14.jpg` (14 frames, the documented
9-colour palette in `app/src/engine/palette.ts`). The 14 plates are one frame from each of A's 14 scenes, at
the film times recorded in `app/plates.json` (7.5, 14.3, 27.4, …, 133.6 s), captured by `render.ts plates`
with the debug HUD switched off (`hudOff = true`) as JPEG q90 — i.e. genuine, scene-representative film frames
with A's overlay hidden. A_demo = 4 frames of `pdoom-video/out/pdoom-anime-demo.mp4`, a **separate
anime-styled piece** in `anime-demo/` (`excluded from the verdict`).
B = 19 stratified-uniform frames sampled from `pdoom-ds/out/AGI-·-P(doom).mp4` (149.5 s, one frame every
≈7.9 s, t = 3.9 … 145.6 s) plus, as a robustness check, all 125 authored stills in `pdoom-ds/out/stills/`.
B's frames include B's own HUD read-outs, so the HUD asymmetry favours A.

**Method.** Every frame measured at 960×540 and again at native 1920×1080:
Rec.709 luma on sRGB; HSV saturation; chromatic = S>0.25 & V>0.08; hue resultant length R;
5-bit/channel colour quantisation (32 768 bins); nearest-RGB-distance to A's 9 palette colours
(threshold 40/255); Sobel/8 on luma; empty space = within 8/255 (Chebyshev) of the frame's modal 5-bit
colour; drift = total-variation distance between consecutive frames' colour histograms (both sets are in film
order — A's from `plates.json`, B's by time — but A's plates are unevenly spaced, 3.8–19.6 s apart).
Because B is a very dark film and Sobel is contrast-weighted, every
structure metric is also computed on each frame's own percentile-normalised luma (blur σ=1.2, to
suppress grain/compression noise), plus a brightness-independent flatness measure and connected-component
counts at two granularities (coarse ≥0.008 %, fine ≥0.001 % of frame area). Two known artefacts are
handled explicitly: raw HSV saturation is inflated by quantisation noise in near-black pixels, so the
headline saturation figure is exposure-gated (V>0.15); and 5-bit colour counts depend on resolution
(both are reported).

{per_frame_table("A@960", "1. Project A — per frame (960×540)", "`fig · film time`. `edge_n` = mean normalised Sobel; `compF` = fine element count; colour metrics are resolution-independent.")}

{per_frame_table("B@960", "2. Project B — per frame (960×540, uniform samples, t in seconds)")}

## 3. Aggregate comparison (960×540 pass, mean ± SD over frames)

{agg_table()}

## 4. Robustness

{robustness_table()}

* Changing resolution (960 → 1920) leaves every hue/colour-assignment metric within ±0.01
  (pooled hue R 0.851 → 0.844 for A, 0.416 → 0.413 for B; signal share 85% → 84% for A, 28% → 28% for B;
  in-palette 87% / 97% unchanged) and leaves all directions intact. Only raw counts scale with resolution
  (distinct 5-bit colours {aggs['A@960']['distinct_5bit'][0]:.0f} → {aggs['A@native']['distinct_5bit'][0]:.0f} for A,
  {aggs['B@960']['distinct_5bit'][0]:.0f} → {aggs['B@native']['distinct_5bit'][0]:.0f} for B; fine element count
  {aggs['A@960']['n_components_fine'][0]:.0f} → {aggs['A@native']['n_components_fine'][0]:.0f} for A,
  {aggs['B@960']['n_components_fine'][0]:.0f} → {aggs['B@native']['n_components_fine'][0]:.0f} for B) —
  which is why the element-count comparison is reported at both.
* B's 125 authored stills are biased toward busy moments relative to the uniform sample in colour terms
  (chromatic {aggs['B_stills@960']['chromatic_frac'][0]*100:.0f}% vs {aggs['B@960']['chromatic_frac'][0]*100:.0f}%,
  distinct colours {aggs['B_stills@960']['distinct_5bit'][0]:.0f} vs {aggs['B@960']['distinct_5bit'][0]:.0f},
  signal-orange share {aggs['B_stills@960']['signal_pm25_frac'][0]*100:.0f}% vs {aggs['B@960']['signal_pm25_frac'][0]*100:.0f}%);
  a stills-based comparison would therefore have made B look *more* colourful, which is exactly the impression
  under test — the uniform sample avoids that selection bias. (Fine-element count does not follow that bias:
  {aggs['B_stills@native']['n_components_fine'][0]:.0f} vs {aggs['B@native']['n_components_fine'][0]:.0f}.)
* `pdoom-video/out/pdoom-anime-demo.mp4` is a **separate piece** in `anime-demo/`, not the film the plates come
  from (`app/`, the style `palette.ts` documents): it is a bright pastel violet/pink anime sequence
  (chromatic {aggs['A_demo@960']['chromatic_frac'][0]*100:.0f}% of pixels, pooled hue R {aggs['A_demo@960']['pooled_hue_R'][0]:.2f},
  top lobe 255°, luma {aggs['A_demo@960']['luma_mean'][0]:.2f}). It was excluded from the verdict — it says nothing
  about the plates' style — and it is flagged here only because it is the sole exported video in A's `out/`.
* A's plates were rendered with the HUD off, while B's frames carry B's on-screen read-outs; that asymmetry
  works in A's favour, and A still measures *more* edge/texture/ink per frame, which makes the "B is busier"
  refutation stronger rather than weaker.
* `colour_drift_TV` is {aggs['A@960']['colour_drift_TV'][0]:.2f} for A vs {aggs['B@960']['colour_drift_TV'][0]:.2f} for B,
  but for A that distance is driven by alternating near-black and bone-white scenes, not by hue: A's hue drift is
  {aggs['A@960']['hue_drift_deg'][0]:.1f}° per step against B's {aggs['B@960']['hue_drift_deg'][0]:.1f}°.

## 5. Verdict

![palette and composition comparison](fig_palette_composition.png)

The "palette-unified" half of the impression is **strongly confirmed, but only across frames, not within
them**: A's chromatic pixels are {aggs['A@960']['signal_pm25_frac'][0]*100:.0f}% within ±25° of the signal orange
(pooled hue R {aggs['A@960']['pooled_hue_R'][0]:.2f}, per-frame mean hue virtually fixed at σ={aggs['A@960']['hue_spread_deg'][0]:.1f}°,
frame-to-frame hue change {aggs['A@960']['hue_drift_deg'][0]:.1f}°), whereas B spreads the same kind of per-frame
concentration (R {aggs['B@960']['hue_R'][0]:.2f} vs A {aggs['A@960']['hue_R'][0]:.2f}, i.e. each B frame is just as
monochromatic internally) over {aggs['B@960']['n_hue_lobes_chromatic10'][0]:.1f} hue families per frame and three film-wide
lobes — blue-cyan 225° 31%, orange 15° 29%, violet 285° 13% — matching B's documented per-chapter palettes
(`ice`/`ember`/`rose`/`alert`),
with per-frame mean hue scattering σ={aggs['B@960']['hue_spread_deg'][0]:.0f}° and jumping {aggs['B@960']['hue_drift_deg'][0]:.0f}° between
sampled frames. So B is "more colourful" in exactly one measurable sense — it rotates its accent hue chapter by
chapter — and not in saturation ({aggs['A@960']['sat_mean_lit'][0]:.2f} vs {aggs['B@960']['sat_mean_lit'][0]:.2f} exposure-gated,
A's chromatic pixels actually slightly *more* saturated: {aggs['A@960']['sat_mean_chromatic'][0]:.2f} vs {aggs['B@960']['sat_mean_chromatic'][0]:.2f})
nor in colour variety per frame, where A wins on every count (distinct 5-bit colours {aggs['A@native']['distinct_5bit'][0]:.0f} vs
{aggs['B@native']['distinct_5bit'][0]:.0f}; top-6 colours cover {aggs['A@960']['top6_share'][0]*100:.0f}% of A's pixels vs
{aggs['B@960']['top6_share'][0]*100:.0f}% of B's, because A alternates black terminal scenes with bone-white "paper" scenes —
highlight share {aggs['A@960']['highlight_gt075'][0]*100:.0f}% vs {aggs['B@960']['highlight_gt075'][0]*100:.1f}% — while B is tonally uniform and very dark).

The "fewer simultaneous elements / more negative space" half is **not supported**; the honest picture is
more specific and partly inverted (all figures below are the 1920 pass). By every brightness-fair structure
measure A carries *more* per frame than
B — normalised edge density {aggs['A@native']['edge_mean_norm'][0]:.4f} vs {aggs['B@native']['edge_mean_norm'][0]:.4f},
texture coverage {aggs['A@native']['local_std_frac_gt005'][0]*100:.0f}% vs {aggs['B@native']['local_std_frac_gt005'][0]*100:.0f}%,
element ink coverage {aggs['A@native']['component_ink_frac'][0]*100:.1f}% vs {aggs['B@native']['component_ink_frac'][0]*100:.1f}% —
and B has by far the *emptier* frames (brightness-independent flat area {aggs['A@native']['flat_frac_norm'][0]*100:.0f}% vs
{aggs['B@native']['flat_frac_norm'][0]*100:.0f}%; {aggs['B@960']['black_lt006'][0]*100:.0f}% of B's pixels are below luma 0.06 and only
{aggs['B@960']['frac_v_gt015'][0]*100:.0f}% are above V 0.15, against A's {aggs['A@960']['frac_v_gt015'][0]*100:.0f}%). The one
measure that does flatter the impression is element *count* at fine granularity: B's frames hold more separate small
marks ({aggs['B@native']['n_components_fine'][0]:.0f} ± {aggs['B@native']['n_components_fine'][1]:.0f} vs A's
{aggs['A@native']['n_components_fine'][0]:.0f} ± {aggs['A@native']['n_components_fine'][1]:.0f}), but each is tiny and dim —
at coarse granularity A has the more elements again ({aggs['A@native']['n_components'][0]:.0f} vs {aggs['B@native']['n_components'][0]:.0f}).
In short: the metrics that carry the signal are the cross-frame hue ones (`pooled_hue_R`, `hue_spread_deg`,
`signal_pm25_frac`, `n_hue_lobes_chromatic10`, `hue_drift_deg`); the "busier / less negative space" feeling is
not in the pixels — what B actually has is a mostly black frame containing many small, low-contrast, low-saturation
marks in a *different* accent hue each chapter, which reads as "more going on" even though A paints more ink,
more texture and more colour per frame.

*Caveats: A's 14 plates are one scene-representative frame per scene (a curated montage set) while B's 19 are an
unbiased uniform sample — and B's own stills are busier than that sample in colour terms, so the sampling choices
do not favour the conclusions drawn here. A's plates were captured with the HUD off while B's frames include B's
HUD: that asymmetry favours A, and A still measures the busier, inkier frame. A's plates are JPEG q90 and B's
frames H.264, which inflates A's noise-derived edge figures slightly. Finally, `colour_drift_TV` for A is driven
by its dark/paper tonal alternation rather than by hue (A's hue drift is 6.9° against B's 36.2°), so it should not
be read as "A's palette changes more".*
"""

with open(f"{OUT}/REPORT.md", "w") as f:
    f.write(md)
print("wrote REPORT.md")
