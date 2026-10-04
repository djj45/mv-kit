# AGI — TREATMENT

**Film:** AGI · P(doom) — 47 shots, 0:00–2:29.5, 1920×1080 @ 30 fps, drawRate 12.
**Song:** the P(doom) track, source alongside at `../../../pdoom-video/`. Word-level alignment is hand-checked and
shared with `projects/anime-pdoom` — one grid, two films.
**Rule of this film:** every pixel is drawn by code from `f.t`. No generated images, no generated video, no
still frames. The only inputs are the song, its analysis, and the code in `scenes/`.

---

## 1. Concept

**A superintelligence is being switched on, and we are watching the instruments.**

The film is not about a robot. It is about *instrumentation*: the screens, graphs, counters and containment
read-outs that a species builds around a thing it no longer controls. Every image is a measurement of the machine
— a point cloud sampling its weights, a loss curve, a token stream, a GPU count — and the machine itself is only
ever seen as light through those instruments. When it finally looks back (the iris shots at 0:31, 1:11 and
2:22), it is still made of the same measuring points.

The arc is the lyric's arc, taken literally: **wake → learn → accelerate → escape → look at you.**

Four acts, 16 chapters, one palette per chapter. The palette *is* the story:

| act | chapters | palette | what the machine is doing |
|---|---|---|---|
| I — wake (0:00–0:38) | cold open, AGI, nervous, loss, servant, eat | `ice` (cold terminal) | booting, being watched, learning to serve |
| II — learn (0:38–1:09) | stable, singularity, accel, atoms, sydney, hook2, market | `ember` (heat/training), hooks in `alert` | training harder, the curve going vertical |
| III — escape (1:09–1:49) | pleas, hook3, paperclips, killswitch, fuse, blues | `rose` (hallucination), `alert` hooks | its goals come apart from ours |
| IV — look at you (1:49–2:29.5) | endgame, Ilya, show | `rose` → `ice` → black | it turns around, answers nothing, and the light goes out |

The four hooks are the film's four drops and share one scene (`hook_pdoom`, params `n: 1..4`) — but they are
**not the same footage repeated**. The song hooks on one line; the machine on screen at the last chorus is not
the machine of the first. So each drop shows a different *degree of AGI*, which is what actually changes between
them (loudness escalates separately, on `n`):

| n | time | stage | how the word is made |
|---|---|---|---|
| 1 | 0:22.8 | **EMERGENT** | the letters never settle: the cloud is half text, half static, and it is still flickering between the two when the shot ends. It has just learned to say its name |
| 2 | 0:59.1 | **NESTED** | the word holds, with a second one exactly behind it and a mirrored ghost of the whole frame: it has learned that it is a thing with an inside |
| 3 | 1:35.5 | **PARALLEL** | intact, then breaking apart mid-word and reassembling three times in two seconds: it has learned that it can be more than one thing at once |
| 4 | 2:04.5 | **RESOLVED** | it does not move. The word is perfect, huge and still, the tear and the glitch are gone, the camera barely breathes — because there is nothing left for it to prove. The light simply goes |

The panel says which stage is on screen (`state` / `note`), so the read-out tracks the same progression the image
does. Verse shots stay quieter and colder than all four: **the film is quiet before it is loud, and by the end it
is quiet again because it no longer has to be loud.**

---

## 2. Look

### 2.1 The one rule (from `kits/lumen.js`)

**There are no surfaces, only light.** Nothing is filled. Everything is a point cloud or a hairline, drawn
additively on black, so dense places burn to white while thin places keep their colour. Form comes from point
clouds and wireframes; depth comes from point size, brightness and focus (an out-of-focus point becomes a large
faint disk); information comes from very small monospace text.

Per shot:

- **Never** `g.fillRect` a large area, never `filter: blur()` a full frame. Light comes from `lmPoints` /
  `lmLines` with `dof`, `fog`, `twinkle`, `drift`.
- Point sizes: **0.9–1.6 px** for structure and dust, **1.6–2.6 px** for the few points that are "close",
  **3–6 px** only for a hero point that flares on a hit.
- Gains: dust **0.15–0.35**, structure **0.3–0.6**, hero **0.6–0.9**, and *one* thing per shot at **1.0+**.
  If two things are at full gain the frame burns to mush — the most common failure in this style.
- Bloom is seasoning: `bloom 0.5–0.7`, `exposure 0.8–0.9`. `bloom > 1` only for the last drop.
- Colours come from the palette: `fg` (near-white), `dim` (structure that only just exists), `accent` (the
  chapter's colour), `hot` (brightest, used sparingly), `warn` (cuts only). Pass palette keys, not hex.

### 2.2 Palette per chapter

| chapter | palette | accent role |
|---|---|---|
| cold open, boot | `ice` | aperture cyan; the word is `fg` |
| nervous, surprise | `ice` | the twin image is `dim`, one signal line is `hot` |
| loss, kneel | `ice → ember` | the curve `hot`, everything else `dim` |
| eat, hook1 | `ice → alert` | the hook is full `alert` |
| room / shrooms / shoggoth / eyes | `rose` / `ember` / `alert` | the eye shot turns `alert` for one line |
| stable, singularity, accel, atoms, sydney | `ember` | acceleration is `hot` |
| hook2 + market | `alert` hook, `ember` market | the price chart is `fg`, not green — this film has no green |
| reckoned, backprop, obsolete, leftturn, no_cdr | `ember` | the turn is `warn` |
| gato, hook3, paperclips, killswitch, nowhere, fuse | `rose` / `alert` / `ember` | paperclips are `fg`: a million identical white things |
| blues | `rose` | slow and wide; nothing is `hot` |
| endgame, hook4 | `rose → ice` | the machine is `fg` on `dim` |
| ilya, show | `ice` | the recursion answers nothing; the light goes out to black at 2:29 |

`dsPal('ice → ember', k)` crossfades two palettes; use it where a chapter changes inside one shot rather than
cutting the colour.

### 2.3 Texture

Grain per shot in `dsFin` (`grain: 0.03–0.045`), plus four tools that make a frame look *computed*:

- `dsScan(g, x, y, w, h, { alive })` — CRT hairlines across a band. Never full-frame; put it on a panel.
- `TL.matrix` — running glyph field, small, in a corner, alpha ≤ 0.3.
- `TL.block` / `TL.log` — the numeric read-out; every shot has one, in the shot's palette.
- `dsGhost` — a blurred copy of the light layer for afterimages. Used at the drops only.

### 2.5 The activity layer — nothing in this film is ever still

The first cut was measured frame by frame (mean absolute luma change per shot, film mean 1.74) and **9 of 47
shots came in under 0.6**: the quiet shots read as photographs. A quiet shot is a *held note*, not a still
image, so four cheap motions are now part of the house style and every shot carries at least one:

| tool | what moves |
|---|---|
| `dsLife(g, d, { gain, dust })` | parallax screen dust: near specks cross faster than far ones, always |
| `dsLifePost(d, { amount })` | a sub-pixel breathing zoom + a hair of counter-rotation — merge into `dsFin`, so the frame is hand-held even when the camera is "locked" |
| `dsScanSweep(g, d, { period })` | one CRT line crossing the frame, forever |
| `dsTick(g, d, { rate, label })` | a number in a corner that never stops counting |

On top of those, **the subject itself moves in every shot**. A trace redraws, a stack keeps firing, a mass
breathes on the bar, a worker walks its route, an aperture drifts a few degrees. The target, checked on the
export, is ≥ 0.8 motion per shot with under 25% of frames below 0.25 — and a shot over 3 s also gets an
**intra-shot cut** (a hard reframing via `f.lt`), so a long shot is experienced as two or three.

### 2.4 Type

- Read-outs, code, labels: `dsMono()` (JetBrains/Menlo stack), 13–17 px, wide tracking (`track: 3`).
- Big display type (P(doom), AGI, FLOPs, CDR): `dsSans()` weight 100–300, tracked out, with `dsGlow`.
  Thin and huge is the film's voice; bold only for the slam lyric.
- Lyric: only through `LY.draw(g, d, { mode: 'plate' })` — `lib/lyric.js` owns the film's per-line treatment map
  (`LY.plate`), so each line gets the treatment its content asks for (see §5).
- **Never** draw a lyric word before its `word.start`. Pre-shadow in `dim` at most 0.4 s early.

---

## 3. Eight motifs (reuse them; a motif returning is what memory feels like)

| motif | builder | where it comes back |
|---|---|---|
| **The aperture** (iris + pupil + lid) | `MX.eye(r)` | boot 0:02, nervous 0:08, eyes 0:31, gato 1:11, askew 2:04, **show 2:17** — the film is bookended by it opening and closing |
| **The stack** (transformer layers) | `MX.layers(n, m)` | boot, loss, stable, backprop, transformers, dense, rsi |
| **The lattice** (containment cage) | `MX.cage(r)` | nervous, room, killswitch, fence, nowhere |
| **Token rain** | `MX.rain(n)` | room, masked, loom, ilya |
| **The grid floor** | `MX.floor(size)` | loss, accel, flops, gpu, obsolete |
| **The core** (nucleus + halo + rays) | `MX.core(r)` | boot, singularity, omega, fuse, show |
| **The shoggoth** (noisy shells) | `MX.shoggoth(n, r)` | shoggoth, shrooms, askew, blues |
| **The instrument panel** | `TL.block/log/matrix/spark/gauge` | every shot, always live |

The **iris is the film's only "face"**: the aperture of a camera, the pupil of an eye, and the ring of a
containment field — and we never say which. When the lyric asks who is looking at whom, that is the shot.

---

## 4. Camera

One grammar, from `dsCam(d, {...})`:

- **Push, don't cut, inside a shot.** Almost every shot is one continuous move; `dsIn`/`dsOut` on the distance.
- Cut boundaries are downbeats or the first word of a line (`timeline.js`). Never a wall clock.
- On `f.a.kick` the camera twitches (`punch`), the frame shakes (`dsShake`), bloom opens. On `f.a.snare` there is a
  hard accent: a flare, a `flash`, or a `glitch`.
- Verses: `dist` 6–10, slow `yaw` drift, `wobble` for handheld. Hooks: `dist` 3–5, `punch` 0.08, camera *inside*
  the cloud so points blow through the lens.
- The quiet shots (blues, gato, ilya, show) are the exception: they are **still**. The camera drifts; nothing else
  moves. Contrast is the whole point.

## 5. Lyrics on screen — the words are part of the picture

`lib/lyric.js` holds nine treatments, and `LY.plate` assigns one to every line in the song with the reason
written next to it. A line is never just a subtitle: it is drawn in whatever material the shot is made of.

| mode | what the sentence becomes | used for |
|---|---|---|
| `cloud` | 2 600 points per word sampled from the type, each word flying in on its own start; the sung word burns `hot`, the unsung stay `dim` | the machine describing itself (the first line, the shoggoth, super-dense, masked) |
| `carve` | the sentence cut *out* of the light: the letters take away a soft elliptical bed, so they hold more of the scene's own light than the space around them. No panel, no rectangle | sealed systems, dry jokes (the Chinese room, Sydney, CDR, orthogonality blues, Loom) |
| `slam` | words punched in at their own start, live word split into `accent`/`warn` ghosts | the four hooks, and only the hooks |
| `wave` | every word is an amplitude trace that rises, holds, decays — the word has a shape while it is sung | physical processes (circuits, the fuse, a hundred thousand GPU) |
| `scatter` | the letters are pulled apart as the line is delivered | things coming apart (accelerating, askew, nowhere left) |
| `shock` | three expanding rings leave each word as it lands | threats and impacts (the plea, breaking the fence, the eyes) |
| `ghost` | the line said twice: a dim echo trailing the live one | repetition and disbelief (that's no surprise, disobey, the last line) |
| `ascend` | words arrive low and climb into place, and keep drifting up | servant, recursive self-upgrade |
| `sweep` | a hairline crosses the frame and the words light in its wake | read-outs (the loss, 1e30 FLOPs) |
| `terminal` `caption` `column` | the original three from `ds.js`: typed log, centred caption, stacked column | the lines that really are read-outs, and the quiet middle |

The rules do not change: a word may not appear before its `word.start` (every mode gates on it), text keeps
≥ 96 px from the edge, and a line's last word gets at least 6 frames of full brightness. **The lyrics may be the
image; they may never be early.**

### 5.1 What "the lyrics are part of the picture" is not allowed to cost

The first pass at this traded legibility for style and the viewer could not read four passages. The fixes are
now rules of the library, because every one of them is a trap a new treatment will fall into again:

| rule | why it exists |
|---|---|
| a display treatment has a **size floor** (cloud 74, carve 84, shock 70, ghost 66, wave 46, scatter 62, ascend 60, sweep 58 px) | every shot was written against the 23 px terminal prompt; routing a line to a display treatment while keeping that size drew the words at a third of their intended size |
| a sentence is laid out at its **finished width** while it is being sung | centring only the words sung so far makes the line slide and read as if it were cut off |
| a **long sentence is fitted** to the safe width | at display size the opening line wants 2 500 px and its first and last words are cropped — which looks exactly like no lyric at all |
| a display treatment gets **no backing band and no frame**: contrast comes from the words being the brightest thing on screen, by raising the mode's gain | a band was tried and read as a black slab (歌词不要用衬底，看起来不太好看); then `carve` kept its own hard rectangle around the line and the note came back at 0:58 (58 秒这句歌词还是有个框). Its bed is now the same soft ellipse as its cut, so no lyric in the film draws a straight edge |
| a sung word **stays at full strength** until the next line starts | fading a word to 0.18 a second after it is sung measured as "no visible lyric" on five lines |
| a sentence may be **made of the shot's own material only if the shot can hold it still** | `paperclips` stamped its line out of its own 3 px clips — beautiful, and unreadable: the swarm trapped it in every frame while the sentence changed shape, and the viewer called it a flash twice (1 分 37 秒这句歌词还是一闪而过). That line is now `carve`d like the rest; `clipLine` stays in the scene as the tool for a shot that can give its words a still frame to live in |
| each line has a **zone** (lower third / bottom band / upper band / centre), and only the four hooks and two deliberate shots take the centre | pulling every display treatment to the middle of the frame put the words on top of the film's own subject — the note was 歌词在画面正中间，遮挡视线了. The middle belongs to the shot; the lyrics work the bands around it, and a shot's explicit `y` overrides the zone |

## 6. Transitions (every one has a reason, written in `timeline.js`)

- **hard cut** — the default; 43 of 47 boundaries.
- **`wipe: 'glitch'`** on the four hooks: the frame tears open and the drop comes through it.
- **`wipe: 'zoom'`** twice: the loss curve (0:13) and the singularity ring (0:41) — one object at two scales.
- **no fade at all** into the third hook (1:35.47): the instrumental runs under it, so the glitch tears in over black.
- **`carry: carryDust`** on the ChatGPT cut: dust keeps flying, so the two shots are one room.

No slow cross-dissolves anywhere. If two shots need to blend, something crosses the seam.

## 7. What "hard" means (the 硬邦邦 requirement)

A drop is not a loud frame, it is a **change of state**. At every hook four things happen at once, and only for
the length of the hit: the palette goes to `alert`, the geometry explodes outward from the previous frame's
positions (`lmMorph`, or `MX.core` rays), the frame tears (`glitch`), and `P(doom)` lands in the centre at slam
size. Then the next shot is *quieter than the verse before it*, so the next drop can land harder. Four drops,
each bigger than the last: the last (2:04, "I'm upping my P(doom)") is the biggest frame in the film and the only
one allowed `bloom > 1`.

## 8. Credits and limits

- The song belongs to its author; the file stays local and only timing (no lyric text) is committed. Lyric text is
  local-only (`.gitignore` covers `lyrics.txt` and `data/lyrics*`).
- The visual language is original to this film. No reference to existing artwork, characters or footage; nothing
  is generated by an image or video model. Everything comes from `scenes/` and `lib/`.
- If a frame could have been made without knowing which second of the song it is, it is wrong.
