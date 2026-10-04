# AGI · P(doom) — a music video drawn entirely in code

**2:29.5, 1920×1080, 30 fps. 47 shots over 44 scene files. No image model, no video model, no still frames:** every pixel is a
function of the song time, drawn by the code in `scenes/` and `lib/` on top of `kits/lumen.js` (WebGL2 point
clouds and hairlines, additively blended on black, with bloom / depth of field / chromatic aberration) and
Canvas 2D for the typography.

The song and its hand-checked word alignment come from the source project next door
(`../../../pdoom-video/`), shared with `projects/anime-pdoom` — one analysis grid, two films.

```sh
uv run tools/render.py projects/pdoom-ds check      # 44 shots, one frame each, per-shot ms, edit lint
uv run tools/render.py projects/pdoom-ds            # export -> out/AGI · P(doom).mp4
uv run tools/render.py projects/pdoom-ds sheet --cuts   # contact sheet -> out/sheet.png
open projects/pdoom-ds/index.html                   # live preview (space play, d debug, l loop shot)
```

## What it is

A superintelligence is being switched on and we are watching the instruments. Nothing in the film is a
character: it is a machine rendered as *measurement* — point clouds that sample its weights, a loss curve, a
token stream, a GPU count, containment latches — and it only ever looks back through the same instruments (the
aperture motif, which opens at 0:02, 0:08, 0:31, 1:11, 2:04 and closes at 2:22).

The palette is the story: `ice` (cold terminal) for waking and being watched, `ember` (heat) for training,
`rose` for hallucination, `alert` for the four drops — and the four hooks are the *same shot* (`hook_pdoom`,
`params.n` 1→4), each one measurably harder than the last, each followed by a shot quieter than the one before
it. The last frame is black.

## Files

| file | what |
|---|---|
| `TREATMENT.md` | the style law: concept, palettes per chapter, point sizes and gains, type, camera grammar, the eight motifs, what a "drop" means |
| `SHOTS.md` | the shot list with the owner of each cluster and the working method |
| `timeline.js` | the edit. Every boundary is a downbeat or the exact instant a word is sung; four transitions, each with a written reason |
| `project.js` | title, audio, range 0–149.5 s, 30 fps, drawRate 12, kits, scripts, the 44 scenes |
| `lib/ds.js` | the shared language: palette ramp + crossfade, camera, beat/hit helpers, the light call, post, text-as-points, and the activity layer (`dsLife` / `dsLifePost` / `dsScanSweep` / `dsTick`) |
| `lib/lyric.js` | the lyrics as part of the picture: nine treatments (`cloud carve wave scatter shock ghost ascend sweep columnstack`) plus the film's per-line map `LY.plate` |
| `lib/mind.js` | the recurring geometry: `MX.layers cage rain tokens floor eye shoggoth tower core graph glyphs` |
| `lib/telemetry.js` | the instrument panel: `TL.block log gauge spark matrix stamp code roll` |
| `lib/pmirror.js` | mirrored geometry (the "reflection" shots) |
| `scenes/*.js` | one file per shot, 44 of them (hook_pdoom plays four times) |
| `art/STILLS.md` | the contact sheet and the chosen frames |

## Reproducing a frame

Each frame depends only on `f.t` (no `Math.random`, no `Date.now`, no accumulated state), so the preview, a
still, and the exported video are identical, and the export can render segments in parallel.

```sh
uv run tools/render.py projects/pdoom-ds stills --t 24.6,53.2,125.4,136.0,142.6,149.4
uv run tools/render.py projects/pdoom-ds strip --t 22.76 --dur 1.6    # a drop, frame by frame
uv run tools/render.py projects/pdoom-ds --from 45 --to 60 --preset veryfast
```

## Keeping it alive

A music video in this style fails in a specific way: the quiet shots turn into photographs. This film was
measured frame by frame for that — mean absolute luma change between consecutive frames, at 240×135, per shot —
and the first cut had **34% of its frames barely changing** and 9 of 47 shots below 0.6 where the film averaged
1.74. After the activity pass: film mean **2.21**, every shot ≥ 0.8, and **2.2%** of frames barely changing.

The rule that came out of it, now in `TREATMENT.md` §2.5: a quiet shot is a held note, not a still image. Every
shot carries at least one of the house motions, the subject itself moves, and any shot over 3 s also gets a hard
intra-shot reframing (`f.lt`) so a long take is experienced as two or three. The measurement is reproducible:

```sh
uv run tools/render.py projects/pdoom-ds --preset ultrafast --noaudio --out /tmp/x.mp4
ffmpeg -v error -i /tmp/x.mp4 -vf "scale=240:135,format=gray" -f rawvideo -pix_fmt gray /tmp/x.gray
# then mean |Δ| between consecutive frames, per shot, measuring each shot to the NEXT shot's start
```

Measure each shot only up to the next shot's start: a bright cross-fade otherwise leaks into the outgoing shot
and flatters it (that error made one shot read 1.91 when it was 0.50).

## Credits

The song belongs to its author and stays local; only timing without lyric text would be committed. The visual
language is original to this film and generated from its own source.
