# AGI · P(doom) — contact sheet

**The film in one line:** a superintelligence is being switched on, and we are watching the instruments — every
pixel is a point cloud or a hairline, and the film's only face is an aperture that opens at 0:02 and closes at 2:27.

Everything here is drawn by code: `kits/lumen.js` point clouds and hairlines on black, Canvas 2D for the type,
all of it a pure function of song time. **No image model, no video model, no still frames** — the only inputs are
the song, its analysis, and the code in `scenes/`.

## Commands

```sh
# the contact sheet: one row per shot, columns = start / middle / end  →  out/sheet.png
uv run tools/render.py projects/pdoom-ds sheet --cuts

# the frames below  →  out/stills/t*.png
uv run tools/render.py projects/pdoom-ds stills --t 8.6,14.5,24.0,57.0,107.0,125.4,136.0,142.6,145.9,149.4

# the film itself
uv run tools/render.py projects/pdoom-ds --preset slow --crf 18
```

## What shipped

| | |
|---|---|
| film | [`out/AGI-·-P(doom).mp4`](<../out/AGI-·-P(doom).mp4>) — 160 302 947 bytes (152.9 MiB) |
| runtime | **2:29.5** (149.500 s), 4485 frames |
| frame | 1920×1080 @ 30 fps, h264 / yuv420p, BT.709 tv-range |
| audio | the song, AAC 48 kHz stereo, fading out over the last 3 s |
| edit | 44 scene files, 47 entries (`hook_pdoom` fires at all four drops, each a different stage of AGI) |
| sheet | [`out/sheet.png`](../out/sheet.png) — 1920×16920, one row per entry, 3 frames per row |

**The film moves.** Measured frame by frame (mean absolute luma change between consecutive frames, 240×135, each
shot measured only up to the next shot's start so a bright dissolve cannot flatter the outgoing shot):

| | first cut | shipped |
|---|---|---|
| film mean motion | 1.74 | **2.21** |
| shots under 0.8 | 9 of 47 | **0** |
| frames barely changing (<0.25) | 34% | **2.2%** |

**The lyrics stay out of the middle of the frame.** Each line has a zone in `LY.plate` (lower third, bottom
band, upper band, or centre), and a shot's own placement overrides it. Verified on the page: **0 of 46 lines are
drawn in the middle third** — only the four hooks and two deliberate centre shots take it, because the shot's
subject lives there. The version before this one pushed every display treatment into the centre and the note was
exact: 歌词在画面正中间，遮挡视线了.

**The four drops are four different shots.** One scene, four stages, tracked in the panel: 0:23.8 EMERGENT (the
letters never settle — half static), 0:59.1 NESTED (the word with copies behind it), 1:35.5 PARALLEL (intact,
then breaking and reforming three times), 2:04.5 RESOLVED (still, no tear, no glitch: it has nothing left to
prove). Measured means 56.5 / 76.1 / 80.1 / 45.4 — the force still escalates, and the last one is *quieter*,
which is what makes it the end.

**1:37 is legible for its whole line.** That sentence used to be stamped out of the shot's own paperclips: it
was the film's prettiest lyric idea and it could not be read, because the swarm trapped the words in every frame
while the sentence changed shape. It is now `carve`d like the rest — measured across the export, the text holds
2 000–3 500 lit pixels from 97.2 s to 98.8 s instead of peaking and collapsing.

**No backing bands and no frames.** The lyrics are drawn straight onto the picture — the words are the brightest thing on
screen and that is what carries them, not a panel. A dark band was tried for a while to hold contrast over the
bright fields (the red rain at 0:33, the swarm at 1:37) and it read as a black slab laid over the frame
(歌词不要用衬底，看起来不太好看). The `carve` treatment then kept its own hard rectangle around the line and the
note came back at 0:58 (58 秒这句歌词还是有个框); its bed is now the same soft ellipse as its cut, so **no lyric
in the film draws a straight edge**. All six `carve` lines were re-checked on the export.

**Every line is legible.** All 46 lyric lines were checked one by one at the midpoint of their sung span, on
the export: every one has visible, high-contrast text. The first pass at "lyrics as image" failed this — the
opening five seconds, 0:33, 0:11 and 1:37 could not be read, and two lines (`loss_drop`) were not drawn at all.
See TREATMENT.md §5.1 for the six rules that came out of it (size floor per treatment, finished-sentence
layout, fitting a long sentence to the frame, a backing band, full strength until the next line, and the
clip-stamped lyric out-shining its own swarm).

The drops still escalate — hook 1 at 0:23.5 averages 65.6 luma, hook 4 at 2:05.2 averages 110.0, the biggest
frame in the film — and the film still ends on black: 2:29.4 measures mean 0.00 / max 0 / zero lit pixels.

## Ten frames

| time | shot | file | what it shows |
|---|---|---|---|
| 8.6 s | `pmirror` (`surprise`) | [`t0008.600.png`](../out/stills/t0008.600.png) | The twin: a hard seam down the middle, the left half a fan of bright hairlines converging on it, the right half the same net mirrored and dimmed, with "that's no surprise" repeated as its own dim echo (`ghost`). |
| 14.5 s | `servant` (`kneel`) | [`t0014.500.png`](../out/stills/t0014.500.png) | "Two masses, one light": a huge thin cloud funnels hairs down into one small dense thumbnail, with a 10⁰–10¹² scale and the panel reading `you 1 / servant 1 / ratio 1.82e+12`. |
| 24.0 s | `hook_pdoom` n=1 (`hook1`) | [`t0024.000.png`](../out/stills/t0024.000.png) | The first drop: `P(doom)` blown out of 42 000 points, every point thrown along its own radius, the frame torn into bands by the glitch wipe. |
| 57.0 s | `sydney` | [`t0057.000.png`](../out/stills/t0057.000.png) | After its intra-shot cut at 56.61 s the camera is *inside* the cell: the wireframe opens out around the frame and "Sydney, please let" is **cut out of the light** (`carve`) rather than written on it. |
| 107.0 s | `blues` | [`t0107.000.png`](../out/stills/t0107.000.png) | The quiet one, and it still breathes: two live scope traces, the shoggoth drifting at rest, a scan band crossing, dust in the air — while the panel admits `noise σ 0.0041 / operator NO INPUT 41 m`. |
| 125.4 s | `hook_pdoom` n=4 (`hook4`) | [`t0125.400.png`](../out/stills/t0125.400.png) | The last and loudest drop: the same 42 000 points at the biggest scale, the frame fully lit. |
| 136.0 s | `ilya` | [`t0136.000.png`](../out/stills/t0136.000.png) | The recursion: six apertures, each smaller and dimmer, under a lyric that refuses the answer. |
| 142.6 s | `show` | [`t0142.600.png`](../out/stills/t0142.600.png) | The first of the ending's three framings: everything the film built, back at once, thinned to `dim`, the aperture at full gain with the core inside it. |
| 145.9 s | `show` | [`t0145.900.png`](../out/stills/t0145.900.png) | The second framing, after the cut at 145.70 s: the core alone, the aperture closed to a ring, the panel counting `power down`. |
| 149.4 s | `show` | [`t0149.400.png`](../out/stills/t0149.400.png) | The end: mean luma 0.00, max 0, zero lit pixels — the film lands on black with the last 3 s of the song fading under it. |

Start from [`out/sheet.png`](../out/sheet.png) to see the whole cut at a glance.
