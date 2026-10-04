# SHOOTING SCRIPT — 47 shots over 44 scene files, owner by owner

Read `TREATMENT.md` first (it is the style law), then this. Every cut below is already in `timeline.js`; the
boundaries come from the song's downbeats and from the exact instant each word is sung, never from a clock.

**The four owners.** Each owner writes only their own `scenes/<name>.js` files. Nobody else touches them.
`lib/` and `project.js` are shared: append only, and only what you need.

| cluster | what it is | owner |
|---|---|---|
| A `mind` | the machine looking: apertures, nerves, loss, the room, the shoggoth | lead |
| B `train` | the machine learning: the curve going vertical, atoms, the three pleas | teammate b |
| C `threat` | the machine escaping: containment, paperclips, the fuse, the blues | teammate c |
| D `endgame` | the machine turning around: the dense years, Ilya, and getting out | teammate d |

**The shared contract — every shot is exactly this:**

```js
// one line saying what the shot is, and which lyric pays for it
MV.scene('name', {
  init() {
    // build every point cloud, segment buffer and canvas ONCE. No work that depends on t.
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');        // palette + drum envelope + lyric lines + camera helpers
    d.g = g;
    // geometry -> dsLight(...), then Canvas 2D text with TL.* / dsLyric / dsTele
    return dsFin(d, { shake: dsShake(d, 1 + d.kick), vignette: 0.2 });
  },
});
```

Hard requirements (a shot that breaks one of these is not done):

1. **Deterministic.** Only `hash / mulberry32 / noise1 / noise2 / fbm1`. No `Math.random`, `Date.now`,
   `performance.now`. Frozen preview and exported file must be identical.
2. **No state across frames.** No counters or particle sims in `render`. A particle's position is a function of
   `f.t`. Anything static is built in `init()`.
3. **Fast.** ≤ 150 ms per frame on this machine (`check` prints the per-shot time). Prefer one `dsLight` call per
   shot; 2–3 is fine for hooks. Big arrays stay put; never rebuild a 40 000-point cloud per frame.
4. **Full frame.** `render` must paint the whole 1920×1080, or `lmEnd`'s background will not be what you meant.
5. **Beat-locked.** Entrances on `f.a.kick` / `f.beatPhase` / `f.barPhase`, hard actions on `f.a.snare`.
   Never `if (f.t > 3.2)`.
6. **Lyric timing** comes from `f.lyrics` / `dsLyric`. A word may not appear before its `word.start`; pre-shadow
   at most 0.4 s in `dim`. A line's last word must stay on screen ≥ 6 frames after it starts.
7. **Text:** ≥ 96 px from every edge, never under a character or an effect, never overlapping the telemetry panel.
8. **Names:** every top-level `const` / `let` / `function` you add gets your cluster prefix (`B_`, `C_`, `D_`) or
   lives inside the scene object. All four of us share one global scope.
9. **`check` must be clean** for your shots: `uv run tools/render.py projects/pdoom-ds check` must list no error
   for your scene names. Look at the PNGs yourself before you call it done — run `sheet --cuts` or
   `stills --t a,b,c` and open the image.

---

## Cluster A — `mind` (owner: lead)

`hook_pdoom` writes four of the 47 rows (0:22.76, 0:59.13, 1:35.47, 2:04.52).

| shot | name | time | what it is |
|---|---|---|---|
| 1 | `title_rise` | 0.00–1.82 | one light, a burst of hairlines, the title |
| 2 | `agi_boot` | 1.82–7.52 | nucleus → the word AGI → iris. *The reference shot: read it.* |
| 3 | `nervous` | 7.52–11.16 | a nerve net of 12 000 nodes, every edge firing on the kick; the aperture is in the middle and it is looking at us |
| 4 | `pmirror` | 11.16–12.97 | the same net, mirrored and dimmed: "that's no surprise". One signal line crosses from one half to the other, once |
| 5 | `loss_drop` | 12.97–16.61 | a loss curve that falls off the bottom of the frame; the camera follows it down. Anchors `curve` for the zoom transition |
| 6 | `servant` | 16.61–18.85 | one small figure-shaped cloud low in the frame, one huge thin one above; the huge one gets the light |
| 7 | `eat_alive` | 18.85–22.76 | a mouth of light that opens *inside* the point cloud; points are pulled in (function of distance, not a sim) |
| 8 | `hook_pdoom` | 22.76 / 59.13 / 95.47 / 124.52 | the drop. `params.n` = 1..4. Same shot, bigger each time |
| 9 | `foom` | 24.32–26.32 | everything expands: one cloud, per-point velocity by `hash(i)`, 2 s |
| 10 | `room_cn` | 26.32–27.94 | the Chinese room: a closed wire room, one point walking inside it, symbols on the walls |
| 11 | `shrooms` | 27.94–29.91 | rose; the room melts into drifting spores, the geometry breathes |
| 12 | `shoggoth` | 29.91–33.40 | the noisy blob, warm at the core and cold at the rim. The only shot with per-point colours |
| 13 | `shinigami` | 33.40–38.43 | two apertures open at hook scale, `alert`; eyes that see the death of the thing they look at |

## Cluster B — `train` (owner: teammate b)

| shot | name | time | what it is |
|---|---|---|---|
| 14 | `stable_run` | 38.43–41.69 | a training run that is *stable*: a flat loss trace, a stack that fires evenly, a green (use `fg`) status. Deliberately calm, so the next shot can break it |
| 15 | `singularity` | 41.69–45.06 | the ring closes: a lattice collapsing into a core. Anchors `full` for the zoom transition |
| 16 | `accel` | 45.06–49.56 | the grid floor stretches to the horizon, speed lines, the stack is a blur of layers going up |
| 17 | `atoms` | 49.56–52.83 | one cloud of 30 000 points where every point moves to a new position and back — "rearranging" — per-point, deterministic |
| 18 | `sydney` | 52.83–59.13 | the longest note in the film: a huge thin wireframe, a small cloud inside it, nothing else moves for 6 s. The quiet before hook 2 |
| 19 | `basilisk` | 60.58–62.54 | something rises behind the stack: a spiral that grows and rotates, `alert`. Do not draw a creature — it must stay unreadable |
| 20 | `nvda` | 62.54–64.10 | a price chart going vertical, drawn as light: candlesticks as hairlines, one point at the top |
| 21 | `omega` | 64.10–66.22 | everything in the frame converges on one point; the point gets brighter as the frame empties |
| 22 | `flops` | 66.22–69.76 | a counter at display size, 1e30, with the exponent rolling on the kick. Read-out type, thin and huge |
| 23 | `reckoned` | 69.76–72.97 | the same counter, an error term, a red `warn` correction appearing. "That was safe enough, we reckoned" |
| 24 | `backprop` | 72.97–77.72 | the forward/backward pass as a literal loop of light through 8 layers, once per bar, perfect and mechanical |
| 25 | `obsolete` | 77.72–81.21 | a von Neumann box, greyed to `dim`, all its wires going out one by one |
| 26 | `leftturn` | 81.21–85.00 | a corridor junction: the light turns 90° and the geometry follows, one hard snap on the snare |
| 27 | `no_cdr` | 85.00–89.28 | an empty landscape of checkmarks that are not there: hairline boxes with nothing in them |
| 28 | `prompt_plea` | 89.28–95.47 | Gato: the aperture again, huge, with a `column` lyric. The quietest shot in the film; almost no motion |

## Cluster C — `threat` (owner: teammate c)

| shot | name | time | what it is |
|---|---|---|---|
| 29 | `paperclips` | 96.84–98.82 | a swarm that fills the room: 20 000 identical small wire clips, count going up, the frame getting crowded |
| 30 | `killswitch` | 98.82–100.72 | a big red switch, lit, and nobody at the station: an empty chair-shaped hole in the light |
| 31 | `nowhere` | 100.72–102.46 | the lattice from `nervous` again, but the cage is *outside* the core and the core is bigger than the cage |
| 32 | `fuse` | 102.46–105.96 | a fuse lit: one bright point runs along a wire and the wire lights up behind it |
| 33 | `blues` | 105.96–109.34 | the wide, slow one: the shoggoth at rest, drifting, nothing happening. Let the camera be still |
| 34 | `transformers` | 109.34–113.34 | 12 layers, full frame, every one firing in sequence, faster than is comfortable |
| 35 | `disobey` | 113.34–115.20 | the stack ignores its input: a signal enters and comes out somewhere it should not be able to |
| 36 | `dense` | 115.20–117.02 | density: 60 000 points in one frame, the most crowded image in the film |
| 37 | `fence` | 117.02–118.76 | the containment lattice breaks: segments fly outward, per-point, and the hole gets bigger |
| 38 | `gpu` | 118.76–120.76 | a hundred thousand GPU: a grid of small boxes, each one lit in turn, the count in the corner reading 100 000 |
| 39 | `askew` | 120.76–124.52 | RLHF going wrong: the shoggoth, the aperture, and the reward curve all disagree in the same frame |
| 40 | `loom` | 126.12–127.92 | the loom: token rain falling in a warp/weft grid, the pattern almost readable |
| 41 | `masked` | 127.92–129.82 | masked pre-training: half the tokens are holes, light passes through the holes |
| 42 | `recursive` | 129.82–132.02 | the stack builds a copy of itself, then that copy builds one, one level per beat |

## Cluster D — `endgame` (owner: teammate d)

| shot | name | time | what it is |
|---|---|---|---|
| 43 | `ilya` | 133.63–137.38 | what did Ilya see: the aperture opens fully, and inside it there is only more aperture. Do not answer the question |
| 44 | `show` | 137.38–149.50 | the out. Everything the film built is present at once, thinned to `dim`, then the light goes out over 4 s |

`hook_pdoom` writes four of the 47 entries (0:22.76, 0:59.13, 1:35.47, 2:04.52) with `params.n = 1, 2, 3, 4`.
Owner A builds it; nobody else may edit it. Each repeat must be measurably bigger than the last — more points,
wider rays, harder tear — driven by `n`, not by `f.t`.

---

## Working method (per shot, no exceptions)

```sh
# 1. it loads and it is not slow
uv run tools/render.py projects/pdoom-ds check

# 2. LOOK AT IT. three frames per shot, then open the PNG yourself
uv run tools/render.py projects/pdoom-ds sheet --cuts

# 3. the money shot: is the entrance on the beat and is the lyric live?
uv run tools/render.py projects/pdoom-ds stills --t 24.9,25.1,25.3

# 4. motion: does it move like the film and not like a slideshow?
uv run tools/render.py projects/pdoom-ds --from 45 --to 52 --preset veryfast
```

While the other three are writing, the film's real `project.js` cannot `check` (the timeline references scenes
that do not exist yet). Use the scaffold: `projects/pdoom-ds/project.anchor.js` + `timeline.anchor.js` are loaded
by `index.html` right now. Add your own scene names to a **copy** (`project.<you>.js`, `timeline.<you>.js`) and
point `index.html` at it only if you need to; otherwise wait for the lead to merge and check the film at the end.

Report back with: scene names, the exact command you ran to look at the frames, what you saw, and anything you
needed from `lib/`.
