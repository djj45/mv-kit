# Palette / composition audit — A `pdoom-video` plates vs B `pdoom-ds` film

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

### 1. Project A — per frame (960×540)
`fig · film time`. `edge_n` = mean normalised Sobel; `compF` = fine element count; colour metrics are resolution-independent.

| t (s) / fig | luma | blk<.06 | hi>.75 | S(lit) | chr% | hueR | sig±25° | 5-bit | top6 | inpal | edge_n | compF | empty | top hue lobes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 · 7.5s | 0.120 | 46% | 3% | 0.46 | 43% | 0.78 | 80% | 7444 | 50% | 87% | 0.0126 | 62 | 44% | 15deg:72% 345deg:8% |
| 02 · 14.3s | 0.190 | 17% | 6% | 0.25 | 40% | 0.60 | 69% | 4826 | 28% | 77% | 0.0230 | 302 | 23% | 15deg:61% 225deg:10% |
| 03 · 27.4s | 0.153 | 29% | 1% | 0.24 | 29% | 0.78 | 79% | 1494 | 38% | 84% | 0.0350 | 858 | 27% | 15deg:49% 345deg:31% |
| 04 · 31.9s | 0.178 | 50% | 7% | 0.25 | 25% | 0.96 | 97% | 2606 | 61% | 89% | 0.0144 | 171 | 50% | 15deg:93% 45deg:3% |
| 05 · 44.4s | 0.139 | 30% | 3% | 0.44 | 47% | 0.90 | 91% | 2071 | 43% | 80% | 0.0178 | 109 | 31% | 15deg:80% 345deg:12% |
| 06 · 64.0s | 0.858 | 0% | 88% | 0.09 | 5% | 0.76 | 69% | 3385 | 61% | 84% | 0.0181 | 181 | 58% | 15deg:57% 45deg:23% |
| 07 · 73.3s | 0.807 | 4% | 89% | 0.08 | 3% | 0.90 | 92% | 1637 | 76% | 94% | 0.0165 | 360 | 53% | 15deg:91% 255deg:3% |
| 08 · 84.3s | 0.110 | 50% | 2% | 0.31 | 20% | 0.83 | 86% | 3994 | 58% | 90% | 0.0151 | 113 | 52% | 15deg:75% 345deg:11% |
| 09 · 100.2s | 0.137 | 37% | 0% | 0.20 | 20% | 0.84 | 85% | 2055 | 47% | 86% | 0.0265 | 393 | 34% | 15deg:71% 345deg:14% |
| 10 · 104.5s | 0.083 | 54% | 0% | 0.52 | 46% | 0.99 | 99% | 2024 | 59% | 92% | 0.0061 | 129 | 30% | 15deg:99% 45deg:1% |
| 11 · 113.0s | 0.130 | 52% | 2% | 0.09 | 1% | 0.53 | 64% | 1863 | 67% | 89% | 0.0100 | 104 | 61% | 15deg:57% 225deg:9% |
| 12 · 117.6s | 0.263 | 57% | 20% | 0.35 | 21% | 0.87 | 90% | 3322 | 68% | 95% | 0.0177 | 128 | 53% | 15deg:85% 345deg:5% |
| 13 · 127.9s | 0.064 | 77% | 1% | 0.33 | 7% | 0.98 | 99% | 1085 | 86% | 97% | 0.0129 | 176 | 83% | 15deg:92% 345deg:7% |
| 14 · 133.6s | 0.331 | 24% | 14% | 0.25 | 52% | 0.95 | 94% | 3659 | 32% | 68% | 0.0078 | 49 | 9% | 15deg:93% 345deg:3% |


### 2. Project B — per frame (960×540, uniform samples, t in seconds)


| t (s) / fig | luma | blk<.06 | hi>.75 | S(lit) | chr% | hueR | sig±25° | 5-bit | top6 | inpal | edge_n | compF | empty | top hue lobes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3.9 | 0.034 | 92% | 1% | 0.11 | 3% | 0.98 | 0% | 369 | 93% | 98% | 0.0072 | 52 | 88% | 195deg:63% 225deg:30% |
| 11.8 | 0.025 | 95% | 0% | 0.15 | 1% | 0.43 | 68% | 463 | 95% | 99% | 0.0086 | 147 | 91% | 15deg:63% 195deg:16% |
| 19.7 | 0.032 | 91% | 1% | 0.29 | 8% | 0.98 | 99% | 930 | 90% | 98% | 0.0043 | 54 | 80% | 15deg:97% 345deg:2% |
| 27.5 | 0.037 | 86% | 0% | 0.30 | 9% | 0.76 | 9% | 1818 | 84% | 98% | 0.0135 | 38 | 67% | 255deg:29% 285deg:29% |
| 35.4 | 0.099 | 12% | 0% | 0.46 | 42% | 0.98 | 93% | 937 | 68% | 91% | 0.0132 | 152 | 62% | 15deg:80% 345deg:18% |
| 43.3 | 0.128 | 0% | 1% | 0.26 | 7% | 0.93 | 94% | 1001 | 84% | 93% | 0.0064 | 227 | 57% | 15deg:85% 345deg:8% |
| 51.1 | 0.069 | 54% | 0% | 0.32 | 15% | 0.79 | 70% | 1678 | 61% | 95% | 0.0229 | 498 | 37% | 15deg:56% 45deg:14% |
| 59.0 | 0.050 | 76% | 0% | 0.34 | 7% | 0.68 | 46% | 566 | 79% | 99% | 0.0114 | 101 | 54% | 15deg:32% 285deg:21% |
| 66.9 | 0.072 | 48% | 0% | 0.24 | 19% | 0.86 | 6% | 765 | 89% | 98% | 0.0074 | 88 | 71% | 225deg:91% 15deg:5% |
| 74.8 | 0.039 | 84% | 0% | 0.31 | 15% | 0.92 | 4% | 660 | 97% | 99% | 0.0072 | 88 | 55% | 225deg:95% 15deg:3% |
| 82.6 | 0.046 | 77% | 0% | 0.36 | 19% | 0.74 | 11% | 902 | 88% | 98% | 0.0138 | 197 | 59% | 225deg:79% 15deg:7% |
| 90.5 | 0.032 | 90% | 0% | 0.31 | 7% | 0.68 | 12% | 2987 | 87% | 98% | 0.0129 | 228 | 69% | 255deg:34% 285deg:25% |
| 98.4 | 0.083 | 54% | 0% | 0.35 | 29% | 0.58 | 16% | 4710 | 48% | 90% | 0.0351 | 681 | 38% | 285deg:31% 255deg:17% |
| 106.2 | 0.026 | 92% | 0% | 0.28 | 10% | 0.97 | 0% | 558 | 89% | 99% | 0.0148 | 180 | 74% | 285deg:85% 315deg:11% |
| 114.1 | 0.047 | 75% | 0% | 0.34 | 19% | 0.79 | 9% | 1050 | 86% | 98% | 0.0114 | 134 | 54% | 225deg:80% 15deg:8% |
| 122.0 | 0.030 | 91% | 1% | 0.29 | 7% | 0.93 | 0% | 478 | 89% | 98% | 0.0069 | 35 | 73% | 315deg:50% 285deg:37% |
| 129.8 | 0.019 | 96% | 0% | 0.14 | 2% | 0.91 | 1% | 313 | 95% | 100% | 0.0138 | 409 | 81% | 285deg:58% 255deg:28% |
| 137.7 | 0.132 | 0% | 0% | 0.21 | 3% | 0.97 | 0% | 543 | 94% | 98% | 0.0084 | 262 | 94% | 195deg:63% 165deg:27% |
| 145.6 | 0.034 | 91% | 0% | 0.15 | 4% | 0.98 | 0% | 457 | 91% | 98% | 0.0080 | 233 | 83% | 195deg:75% 165deg:21% |


## 3. Aggregate comparison (960×540 pass, mean ± SD over frames)

| metric | A (14 plates) | B (19 uniform) | B stills (125) | direction @960 / @1920 |
|---|---|---|---|---|
| mean luma | 0.2544 ± 0.255 | 0.05441 ± 0.034 | 0.0904 ± 0.088 | A>B A>B |
| median luma | 0.1988 ± 0.295 | 0.03848 ± 0.0332 | 0.06454 ± 0.0772 | A>B A>B |
| deep-black share (luma<0.06) | 0.3759 ± 0.216 | 0.6862 ± 0.323 | 0.6206 ± 0.336 | B>A B>A |
| highlight share (luma>0.75) | 0.1676 ± 0.309 | 0.002907 ± 0.00301 | 0.005921 ± 0.0103 | A>B A>B |
| lit share (V>0.15) | 0.429 ± 0.271 | 0.07286 ± 0.067 | 0.2337 ± 0.329 | A>B A>B |
| mean HSV S (raw, all pixels) | 0.2221 ± 0.103 | 0.4997 ± 0.191 | 0.4033 ± 0.158 | B>A B>A |
| mean HSV S (V>0.15 only) | 0.2771 ± 0.138 | 0.2743 ± 0.0886 | 0.2716 ± 0.114 | ≈ ≈ |
| mean HSV S (chromatic px only) | 0.4974 ± 0.11 | 0.4028 ± 0.0627 | 0.3962 ± 0.0773 | A>B A>B |
| chromatic share (S>.25 & V>.08) | 0.2571 ± 0.176 | 0.1186 ± 0.104 | 0.1603 ± 0.128 | A>B A>B |
| per-frame hue concentration R | 0.8335 ± 0.138 | 0.8351 ± 0.159 | 0.7654 ± 0.214 | ≈ ≈ |
| pooled hue R (across whole film) | 0.8509 | 0.4156 | 0.5049 | A>B A>B |
| circular spread of per-frame mean hue | 5.336 | 69.06 | 56.51 | B>A B>A |
| chromatic px within ±25° of #FF4D12 | 0.8528 ± 0.117 | 0.2834 ± 0.367 | 0.2865 ± 0.337 | A>B A>B |
| hue families ≥10% of chromatic px | 1.429 ± 0.514 | 2.263 ± 1.19 | 2.36 ± 0.817 | B>A B>A |
| frame-to-frame hue change | 6.94 ± 4.42 | 36.17 ± 39 | 23.36 ± 36.7 | B>A B>A |
| hue entropy (bits) | 5.333 ± 1.01 | 4.822 ± 1.5 | 5.192 ± 1.73 | A>B A>B |
| distinct 5-bit colours | 2962 ± 1.68e+03 | 1115 ± 1.08e+03 | 2209 ± 2.43e+03 | A>B A>B |
| share held by top-6 colours | 0.5523 ± 0.168 | 0.8461 ± 0.126 | 0.7918 ± 0.164 | B>A B>A |
| share within 40/255 of A's palette | 0.8663 ± 0.0778 | 0.971 ± 0.0283 | 0.9009 ± 0.176 | B>A B>A |
| mean distance to nearest palette colour | 0.06663 ± 0.022 | 0.04686 ± 0.0124 | 0.06226 ± 0.0393 | A>B A>B |
| mean Sobel gradient (raw) | 0.02633 ± 0.0107 | 0.009129 ± 0.00557 | 0.01166 ± 0.0092 | A>B A>B |
| mean Sobel gradient (normalised) | 0.01668 ± 0.00759 | 0.01196 ± 0.00705 | 0.01416 ± 0.00815 | A>B A>B |
| edge coverage (norm. gradient>0.10) | 0.03435 ± 0.0237 | 0.02487 ± 0.0143 | 0.02967 ± 0.0217 | A>B A>B |
| texture coverage (5×5 local SD>0.05) | 0.1503 ± 0.103 | 0.09909 ± 0.0697 | 0.1254 ± 0.0982 | A>B A>B |
| flat area (brightness-independent) | 0.6109 ± 0.191 | 0.7179 ± 0.198 | 0.6484 ± 0.206 | B>A B>A |
| elements, coarse (≥0.008% of frame) | 110.7 ± 99.9 | 94.16 ± 78.4 | 125.7 ± 135 | A>B A>B |
| elements, fine (≥0.001% of frame) | 223.9 ± 211 | 200.2 ± 169 | 261.5 ± 294 | A>B B>A |
| area covered by elements | 0.03169 ± 0.0216 | 0.02266 ± 0.0137 | 0.02708 ± 0.0196 | A>B A>B |
| empty space (within 8/255 of modal colour) | 0.4326 ± 0.188 | 0.6772 ± 0.164 | 0.6223 ± 0.178 | B>A B>A |
| colour-histogram drift (consecutive) | 0.6087 ± 0.211 | 0.547 ± 0.297 | 0.3385 ± 0.338 | A>B A>B |

## 4. Robustness

| metric | A@960 | A@1920 | B@960 | B@1920 | B stills@1920 |
|---|---|---|---|---|---|
| pooled_hue_R | 0.8509 | 0.8437 | 0.4156 | 0.413 | 0.4992 |
| hue_spread_deg | 5.336 | 5.368 | 69.06 | 68.84 | 56.45 |
| signal_pm25_frac | 0.8528 | 0.8444 | 0.2834 | 0.2808 | 0.2862 |
| n_components_fine | 223.9 | 335.3 | 200.2 | 442.1 | 376.4 |
| flat_frac_norm | 0.6109 | 0.606 | 0.7179 | 0.7804 | 0.7242 |
| edge_mean_norm | 0.01668 | 0.01663 | 0.01196 | 0.01006 | 0.0113 |
| distinct_5bit | 2962 | 4796 | 1115 | 2014 | 3703 |

* Changing resolution (960 → 1920) leaves every hue/colour-assignment metric within ±0.01
  (pooled hue R 0.851 → 0.844 for A, 0.416 → 0.413 for B; signal share 85% → 84% for A, 28% → 28% for B;
  in-palette 87% / 97% unchanged) and leaves all directions intact. Only raw counts scale with resolution
  (distinct 5-bit colours 2962 → 4796 for A,
  1115 → 2014 for B; fine element count
  224 → 335 for A,
  200 → 442 for B) —
  which is why the element-count comparison is reported at both.
* B's 125 authored stills are biased toward busy moments relative to the uniform sample in colour terms
  (chromatic 16% vs 12%,
  distinct colours 2209 vs 1115,
  signal-orange share 29% vs 28%);
  a stills-based comparison would therefore have made B look *more* colourful, which is exactly the impression
  under test — the uniform sample avoids that selection bias. (Fine-element count does not follow that bias:
  376 vs 442.)
* `pdoom-video/out/pdoom-anime-demo.mp4` is a **separate piece** in `anime-demo/`, not the film the plates come
  from (`app/`, the style `palette.ts` documents): it is a bright pastel violet/pink anime sequence
  (chromatic 82% of pixels, pooled hue R 0.73,
  top lobe 255°, luma 0.36). It was excluded from the verdict — it says nothing
  about the plates' style — and it is flagged here only because it is the sole exported video in A's `out/`.
* A's plates were rendered with the HUD off, while B's frames carry B's on-screen read-outs; that asymmetry
  works in A's favour, and A still measures *more* edge/texture/ink per frame, which makes the "B is busier"
  refutation stronger rather than weaker.
* `colour_drift_TV` is 0.61 for A vs 0.55 for B,
  but for A that distance is driven by alternating near-black and bone-white scenes, not by hue: A's hue drift is
  6.9° per step against B's 36.2°.

## 5. Verdict

![palette and composition comparison](fig_palette_composition.png)

The "palette-unified" half of the impression is **strongly confirmed, but only across frames, not within
them**: A's chromatic pixels are 85% within ±25° of the signal orange
(pooled hue R 0.85, per-frame mean hue virtually fixed at σ=5.3°,
frame-to-frame hue change 6.9°), whereas B spreads the same kind of per-frame
concentration (R 0.84 vs A 0.83, i.e. each B frame is just as
monochromatic internally) over 2.3 hue families per frame and three film-wide
lobes — blue-cyan 225° 31%, orange 15° 29%, violet 285° 13% — matching B's documented per-chapter palettes
(`ice`/`ember`/`rose`/`alert`),
with per-frame mean hue scattering σ=69° and jumping 36° between
sampled frames. So B is "more colourful" in exactly one measurable sense — it rotates its accent hue chapter by
chapter — and not in saturation (0.28 vs 0.27 exposure-gated,
A's chromatic pixels actually slightly *more* saturated: 0.50 vs 0.40)
nor in colour variety per frame, where A wins on every count (distinct 5-bit colours 4796 vs
2014; top-6 colours cover 55% of A's pixels vs
85% of B's, because A alternates black terminal scenes with bone-white "paper" scenes —
highlight share 17% vs 0.3% — while B is tonally uniform and very dark).

The "fewer simultaneous elements / more negative space" half is **not supported**; the honest picture is
more specific and partly inverted (all figures below are the 1920 pass). By every brightness-fair structure
measure A carries *more* per frame than
B — normalised edge density 0.0166 vs 0.0101,
texture coverage 15% vs 8%,
element ink coverage 3.1% vs 1.6% —
and B has by far the *emptier* frames (brightness-independent flat area 61% vs
78%; 69% of B's pixels are below luma 0.06 and only
7% are above V 0.15, against A's 43%). The one
measure that does flatter the impression is element *count* at fine granularity: B's frames hold more separate small
marks (442 ± 426 vs A's
335 ± 297), but each is tiny and dim —
at coarse granularity A has the more elements again (113 vs 96).
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
