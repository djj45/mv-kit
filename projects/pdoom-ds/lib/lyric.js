// lyric.js — the lyrics as part of the picture, not subtitles on top of it.
//
// ds.js already has four text modes (terminal / caption / slam / column). Everything else a line of this song
// needs lives here: the sentence rendered *as the light the film is made of*, so the words can be the image
// itself and not a caption over it. Every mode is a pure function of the song time, and every mode reads the
// word times from the alignment — a word can never appear before it is sung.
//
//   LY.draw(g, d, o)                 mode: 'cloud' | 'carve' | 'column' | 'wave' | 'scatter' | 'shock'
//                                            | 'ghost' | 'ascend' | 'sweep' | 'terminal' | 'caption' | 'slam'
//   LY.pick(d, f.of(2))              the treatment assigned to the line starting at 2.0 s (see LY.plate)
//   LY.plate                          the film's line → treatment map, with the reason in the comment
//
// Two rules the library enforces so scenes cannot break them:
//   · a word's reveal parameter is 0 until its `start`, so nothing runs early
//   · the last word keeps `hold` frames of full brightness after it starts (the framework's linetail rule)

// dsTextPoints' em: a word cloud at scale S measures S units per em, and the 200 px sample box means S = 1 is
// a 200 px word. LY_EM is the reciprocal, so LY.cloud can take `size` in screen pixels.
const LY_EM = 1.0;

// Where each zone puts a line, in pixels. `low` is the lower third — the band a caption would use and the one
// this film reads best in — `lower` is the bottom band for a shot whose subject fills the middle, `upper` is
// for a shot whose action is at the bottom, and `centre` is reserved for the four hooks.
// Fractions of the frame's height, evaluated when a line is drawn (H is set by the engine after this file
// loads), so the same zone lands in the same place at any raster size.
function LY_zone(name) {
  return ({ upper: 0.235, low: 0.735, lower: 0.855, centre: 0.5 }[name] || 0.735) * H;
}

const LY = {
  // ---------------------------------------------------------------- the film's lyric map
  // [word-start, treatment, zone, reason]. The times come from the hand-checked alignment and are
  // generated from data/lyrics.json rather than typed by hand. The ZONE is where on the frame the line
  // sits — upper / low (the lower third) / lower (the bottom band) / centre — because the first version of
  // this map pushed every display treatment into the middle of the frame and the note was exact:
  // 歌词在画面正中间，遮挡视线了. A shot holds its subject in the middle, so that is the one band the
  // lyrics may not habitually take: only the four hooks and two deliberate centre shots use it, and the
  // shot's own explicit `y` overrides the zone anyway.
  plate: [
  [1.407, 'cloud', 'lower', "the first sung line: the words are made of the same points as the machine"],
  [5.88, 'wave', 'low', "nervous circuits: the sentence is an amplitude trace"],
  [7.72, 'ghost', 'lower', "that's no surprise: said twice, the echo dimmer"],
  [9.52, 'sweep', 'low', "the loss: the read-out sweeps in with the thing it measures"],
  [13.16, 'ascend', 'lower', "servant: a small line that climbs toward something much bigger"],
  [16.6, 'shock', 'low', "the plea to ChatGPT: rings off the word, one per hit"],
  [22.76, 'carve', 'lower', "eat me alive: a sentence cut out of the light"],
  [24.32, 'slam', 'centre', "hook 1"],
  [26.32, 'carve', 'lower', "the Chinese room: sealed, so the line is cut into the box"],
  [27.94, 'scatter', 'low', "a bag of shrooms: the words come apart and drift"],
  [29.907, 'cloud', 'lower', "the shoggoth's lies: the mass is the sentence"],
  [33.4, 'shock', 'low', "shinigami eyes: a ring off every word"],
  [38.62, 'terminal', 'lower', "a training run: a log line, because that is what it is"],
  [41.34, 'sweep', 'low', "the singularity: the read-out and the event arrive together"],
  [45.06, 'scatter', 'lower', "accelerating: the sentence is pulled apart by the speed"],
  [49.562, 'cloud', 'low', "atoms rearranging: the words rearrange"],
  [52.825, 'carve', 'lower', "let me free: a line trying to leave a sealed room"],
  [59.13, 'slam', 'centre', "hook 2"],
  [60.58, 'wave', 'lower', "the basilisk: a shape rising, drawn as amplitude"],
  [62.54, 'sweep', 'low', "NVDA to the moon: the price and the read-out"],
  [64.1, 'cloud', 'lower', "the Omega Point: everything becomes one point, and the line is made of them"],
  [66.22, 'terminal', 'low', "1e30 FLOPs: a number, printed"],
  [69.76, 'sweep', 'lower', "safe enough, we reckoned: the number lands as it is said"],
  [74.06, 'terminal', 'low', "forward, backward, repeat: a loop, printed"],
  [77.72, 'ghost', 'lower', "von Neumann's obsolete: the line echoes the thing it buries"],
  [81.21, 'scatter', 'low', "sharp left turn: the sentence takes the turn"],
  [85.0, 'carve', 'lower', "without a single CDR: carved, because it is a missing thing"],
  [89.28, 'columnstack', 'lower', "Gato, please: the quiet middle, stacked and still"],
  [95.47, 'slam', 'centre', "hook 3"],
  // was 'cloud' — words made of the shot's own clips. Beautiful but shimmering: the sentence changed shape
  // for its whole 2 s and the viewer read it as a flash twice (1 分 37 秒这句歌词还是一闪而过). A stamped
  // sentence is the one thing that cannot be read while it moves, so this line is carved instead.
  [96.84, 'carve', 'lower', "paperclips filling the room: cut into the frame, solid enough to read"],
  [98.82, 'wave', 'lower', "killswitch guy is on PTO: a flat line, drawn as one"],
  [100.721, 'scatter', 'low', "nowhere left to go: it disperses"],
  [102.46, 'wave', 'centre', "we lit the fuse: an ignition trace"],
  [105.96, 'carve', 'low', "orthogonality blues: carved, slow, cold"],
  [110.18, 'terminal', 'lower', "just transformers all the way: a log line, the joke landing"],
  [113.34, 'ghost', 'low', "learned to disobey: the line repeats itself out of turn"],
  [115.2, 'cloud', 'lower', "super-dense: the densest line in the film"],
  [117.02, 'shock', 'low', "breaking the fence: rings on each hit"],
  [118.755, 'wave', 'lower', "a hundred thousand GPU: a burst of amplitude"],
  [120.76, 'scatter', 'low', "RLHF goes askew: the words go askew"],
  [124.52, 'slam', 'centre', "hook 4"],
  [126.12, 'carve', 'low', "foretold by Loom: woven, then cut"],
  [127.92, 'cloud', 'lower', "masked pre-training: the line is a hole in a field of points"],
  [129.82, 'ascend', 'low', "recursive self-upgrade: the line climbs"],
  [132.02, 'columnstack', 'lower', "what did Ilya see: stacked, unanswered"],
  [137.38, 'ghost', 'low', "was it all for show: the last line, and its own echo"],
  ], /** The treatment for the line that starts at t (or null). Scenes call LY.draw and never think about it. */
  pick(d, t) {
    const at = t == null ? d.t : t;
    let best = null;
    for (const row of LY.plate) if (row[0] <= at + 0.02 && (!best || row[0] > best[0])) best = row;
    return best;
  },
};

// ---------------------------------------------------------------- shared helpers

// 0 until the word is sung, then a fast entrance. This is the only way a mode is allowed to show a word.
function LY_lit(w, t, dur) {
  const k = prog(t, w.start, w.start + (dur == null ? 0.16 : dur), ease.outExpo);
  return k;
}
// The line's own progress, and a stable per-word value so words do not all move in lockstep.
function LY_rnd(i, j) { return hash(i, j, 7); }
function LY_pad(w) { return w * 0.5 + 0.06; }

// ---------------------------------------------------------------- point-cloud text

// The sentence as the film's own material: a point cloud sampled from the type, the sung words burning hot and
// the unsung ones still cold. Each word is its own little cloud, so a word can fly in from outside the frame.
// This is the treatment for lines about the machine describing itself.
LY.cloud = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const sizePx = o.size || 74, y0 = o.y || H * 0.5, x0 = o.x || W / 2;
  const font = o.font || dsSans(sizePx, 200);
  // A 2D LAYER, sampled once per word and cached, then drawn with additive blending. This mode went through
  // three failed projections (world units off by 139x, a flipped y, and then a screen-space pass that drew eight
  // points instead of fourteen thousand); none of them was worth another hour, and the look wanted here is a
  // painted one anyway — a word made of pixels, with a soft multiplier for the glow. The guarantee this keeps is
  // the only one that matters: a word is not drawn until its `start`.
  g.save();
  g.textBaseline = 'middle'; g.textAlign = 'left';
  const layout = LY_layout(g, line.words, font, sizePx, o.track == null ? sizePx * 0.09 : o.track, x0, y0);
  const gain = o.gain == null ? 1 : o.gain;
  line.words.forEach((word, i) => {
    const lit = LY_lit(word, d.t, 0.18);
    if (lit <= 0.02) return;
    const r = LY_sprite(word.w, sizePx, font, o.pt);
    const hit = Math.exp(-Math.max(0, d.t - word.start) / 0.3) * (o.hit == null ? 1 : o.hit);
    const dx = (1 - lit) * (LY_rnd(i, 3) - 0.5) * 220, dy = (1 - lit) * (LY_rnd(i, 5) - 0.5) * 150;
    const sc = 1 + hit * 0.16;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * Math.max(0.9, lit);
    // the cold pass: the whole sentence is present as soon as the line is, so the live word is read in context
    g.globalAlpha *= (o.cold == null ? 0.8 : o.cold) * gain;
    g.drawImage(r.cv, layout[i] + dx - r.pad, y0 + dy - r.h / 2, r.w * sc, r.h * sc);
    if (hit > 0.05) {
      // the hit pass: the word that just landed blooms for a moment
      g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * lit * (0.5 + hit) * gain;
      g.drawImage(r.cv, layout[i] + dx - r.pad - 3, y0 + dy - r.h / 2 - 3, (r.w + 6) * sc, (r.h + 6) * sc);
    }
    g.restore();
  });
  g.restore();
};

// A word as a canvas of lit pixels: each sample from the type is a small dot of light, not a filled glyph, so
// the sentence is made of the same stuff as everything else in the film. Cached per (text, size, font).
const LY_SPRITES = {};
function LY_sprite(text, sizePx, font, pt) {
  const key = text + '|' + Math.round(sizePx) + '|' + font + '|' + (pt || 0);
  if (LY_SPRITES[key]) return LY_SPRITES[key];
  const m = mk(8, 8).getContext('2d');
  m.font = font;
  const w = Math.max(4, Math.ceil(m.measureText(text).width)), h = Math.ceil(sizePx * 1.5);
  const pad = Math.ceil(sizePx * 0.5);
  const cv = mk(w + pad * 2, h + pad * 2), q = cv.getContext('2d');
  q.font = font; q.textBaseline = 'middle'; q.textAlign = 'left';
  q.fillStyle = '#fff';
  q.fillText(text, pad, pad + h / 2);
  const im = q.getImageData(0, 0, cv.width, cv.height), d = im.data;
  const dot = Math.max(0.7, (pt == null ? 0.8 : pt) * 0.7);
  // re-draw the glyph as dots: sample the alpha, and put one soft light per lit pixel with a stride
  q.clearRect(0, 0, cv.width, cv.height);
  q.globalCompositeOperation = 'lighter';
  // sparse, jittered samples rather than a solid fill: the sentence has to read as *made of points*, like the
  // rest of the film, and the gaps are what let the shot behind it show through
  const step = Math.max(2, Math.round(sizePx / 34));
  for (let y = 0; y < cv.height; y += step) {
    for (let x = 0; x < cv.width; x += step) {
      const a = d[(y * cv.width + x) * 4 + 3];
      if (a < 110) continue;
      const jx = x + (hash(x, y, 1) - 0.5) * step, jy = y + (hash(x, y, 2) - 0.5) * step;
      const r = dot * (0.55 + 0.9 * hash(x, y, 3));
      const grd = q.createRadialGradient(jx, jy, 0, jx, jy, r * 3);
      grd.addColorStop(0, `rgba(255,255,255,${(0.55 + 0.45 * hash(x, y, 4)).toFixed(2)})`);
      grd.addColorStop(0.5, `rgba(255,255,255,${(a / 255 * 0.35).toFixed(2)})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      q.fillStyle = grd;
      q.beginPath(); q.arc(jx, jy, r * 3, 0, TAU); q.fill();
    }
  }
  const out = { cv, w: cv.width, h: cv.height, pad: 0 };
  LY_SPRITES[key] = out;
  return out;
}

// Where each word sits when centred at x. Returns the left edge of every word.
//
// `complete` lays the sentence out at its FINISHED width even while it is still being sung, so a word does not
// slide sideways as the words after it arrive. Without this the text reads as if it were cut off mid-sentence
// ("没有歌词" — the words that had not been sung yet still took part in centring, so the sung ones sat off to the
// left with empty space where the rest would go). The caller caches the result because a word is a slow-moving
// target: for a given sentence, size and position, the finished layout never changes.
const LY_LAY = {};
function LY_layout(g, words, font, size, track, x, y, complete) {
  if (complete) {
    const key = size + '|' + track + '|' + x + '|' + words.length + '|' + words[0].w + '|' + words[words.length - 1].w + '|' + words.map(w => w.start).join(',');
    if (LY_LAY[key]) return LY_LAY[key];
    g.save(); g.font = font;
    const ws = words.map(w => g.measureText(w.w).width + track);
    const total = ws.reduce((a, b) => a + b, 0) - track;
    g.restore();
    let cx = x - total / 2;
    const out = words.map((w, i) => { const q = cx; cx += ws[i]; return q; });
    LY_LAY[key] = out;
    return out;
  }
  g.save(); g.font = font;
  const ws = words.map(w => g.measureText(w.w).width + track);
  const total = ws.reduce((a, b) => a + b, 0) - track;
  g.restore();
  let cx = x - total / 2;
  return words.map((w, i) => { const p = cx; cx += ws[i]; return p; });
}

// ---------------------------------------------------------------- carved lyrics

// The sentence cut *out* of the light: a band of the frame has its light removed in the shape of the words, and
// the sung word is still a hole while the unsung ones are not cut yet. The band erases what is behind it, so the
// words read as absence — the opposite of every other mode in the film, which is why it is used for the lines
// about a sealed system.
LY.carve = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 84;
  const x = o.x || W / 2, y = o.y || H * 0.5;
  const font = o.font || dsSans(size, 300);
  const layout = LY_layout(g, line.words, font, size, size * 0.1, x, y, true);
  const alive = dsIn(d, o.t0 == null ? 0 : o.t0, o.fadeIn == null ? 0.5 : o.fadeIn);
  g.save();
  g.textBaseline = 'middle'; g.textAlign = 'left';
  g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * alive;
  // No panel and no frame. This mode used to lay a dark slab behind the line with a hairline rectangle around
  // it, which is exactly the box the viewer saw at 0:58 (58 秒这句歌词还是有个框). Instead the letters are
  // ERASED out of the frame — a straight cut through whatever the shot has drawn — and then their own shape is
  // added back faintly, so the word reads as an opening with the scene's light coming through it. A tight
  // gradient under the glyphs keeps the word legible without drawing any edge.
  const paint = () => {
    line.words.forEach((w, i) => {
      if (LY_lit(w, d.t, 0.18) <= 0.02) return;
      g.font = font;
      g.fillText(w.w, layout[i], y);
    });
  };
  // 1. a soft BED, and its shape is the cut's shape: an ellipse that fades to nothing at its rim, painted with
  //    the same gradient used to take it away again below. Nothing here has a straight edge, so nothing reads as
  //    a box (the earlier version laid a hard rectangle behind the line — 58 秒这句歌词还是有个框).
  const first = layout[0], lastW = (function () { g.font = font; return g.measureText(line.words[line.words.length - 1].w).width; })();
  const cx = (first + layout[layout.length - 1] + lastW) / 2;
  const rx = (layout[layout.length - 1] + lastW - first) / 2 + size * 1.6;
  const ry = size * 2.2;
  const grd = g.createRadialGradient(cx, y, 0, cx, y, Math.max(rx, ry));
  grd.addColorStop(0, 'rgba(0,0,0,0.5)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.translate(cx, y); g.scale(1, ry / Math.max(rx, ry)); g.translate(-cx, -y);
  g.fillStyle = grd;
  g.beginPath(); g.arc(cx, y, Math.max(rx, ry), 0, TAU); g.fill();
  g.restore();
  // 2. the cut: the letters take the bed away again, so they end up with more of the scene's own light in them
  //    than the space around them — an opening, not a label. No composite trickery and no rectangle.
  g.save();
  g.translate(cx, y); g.scale(1, ry / Math.max(rx, ry)); g.translate(-cx, -y);
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#fff';
  paint();
  g.restore();
  // 3. the letter comes back at a fraction of its own light, plus a hairline of its own colour: readable, and
  //    unmistakably a hole rather than something laid on top
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * alive * 0.3;
  g.fillStyle = dsTone(d, 'fg', 1);
  paint();
  g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * alive;
  g.lineWidth = 1.1;
  line.words.forEach((w, i) => {
    const lit = LY_lit(w, d.t, 0.18);
    if (lit <= 0.02) return;
    g.font = font;
    g.strokeStyle = dsTone(d, lit > 0.75 ? 'accent' : 'dim', lit > 0.75 ? 0.95 : 0.55);
    dsGlow(g, dsTone(d, 'accent', 0.45), 7 * lit);
    g.strokeText(w.w, layout[i], y);
    g.shadowBlur = 0;
  });
  g.restore();
};

// ---------------------------------------------------------------- vertical column (the quiet middle)

// Right-aligned stacked lines, each line dropping in from above on its own start and settling with a small
// overshoot. Used where the film needs to sit still (a plea, a question) without going dead.
LY.columnMode = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 42, lh = size * 1.7, x = o.x || W - 150, y = o.y || H * 0.42;
  const rows = o.rows || 3;
  const list = [];
  let cur = line;
  for (let i = 0; i < rows && cur; i++) { list.push(cur); cur = dsLineAt(d.f, cur.end + 0.05, 1); }
  g.save(); g.textAlign = 'right'; g.textBaseline = 'middle';
  list.forEach((ln, r) => {
    const live = ln === line;
    const a = dsIn(d, ln.start - d.f.from, 0.5, ease.outBack);
    if (a <= 0.01) return;
    const yy = y + r * lh + (1 - a) * -34;
    g.font = o.font || dsSans(size, 300);
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (live ? a : a * 0.5);
    if (live) dsGlow(g, dsTone(d, 'hot', 0.5), 18);
    g.fillStyle = live ? dsTone(d, 'hot', 1) : dsTone(d, 'dim', 1);
    g.fillText(ln.text, x, yy);
    g.shadowBlur = 0;
    g.strokeStyle = dsTone(d, 'dim', live ? 0.5 : 0.2); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + 18, yy - size * 0.7); g.lineTo(x + 18, yy + size * 0.7); g.stroke();
  });
  g.restore();
};

// ---------------------------------------------------------------- waveform / amplitude

// The line drawn as an amplitude trace: each word is a burst whose height is its own envelope at this instant,
// so a word literally has a shape while it is being sung and flattens when it is over. Used for the lines that
// are about a physical process (circuits, a fuse, a hundred thousand GPUs).
LY.wave = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 46, x = o.x || W / 2, y = o.y || H * 0.52, w = o.w || W - 300;
  const layout = LY_layout(g, line.words, dsMono(size, 500), size, size * 0.35, x, y, true);
  g.save(); g.textBaseline = 'middle'; g.textAlign = 'left';
  line.words.forEach((word, i) => {
    const lit = LY_lit(word, d.t, 0.12);
    if (lit <= 0.02) return;
    const dec = Math.max(0, (d.t - word.start) / Math.max(0.12, word.end - word.start));
    // the envelope: rises fast, holds, decays — the word's own shape, not a sine wave
    const env = lit < 1 ? lit : Math.max(0.18, Math.exp(-Math.max(0, d.t - word.end) / 0.4));
    g.font = dsMono(size, 500);
    // a word being sung is the brightest thing in the frame; only the ones already past decay
    // FULL opacity while the line is on screen. The previous version decayed a sung word to 0.18 within a
    // second, which measured as "no visible lyric" on five lines: the words were there, at a fifth of full
    // strength. A line stays readable until the next line starts — that is the framework's own lyric rule.
    const age2 = Math.max(0, d.t - word.end);
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * clamp(1.4 - age2 * 0.22);
    g.fillStyle = env > 0.5 ? dsTone(d, 'hot', 1) : dsTone(d, 'fg', 1);
    dsGlow(g, dsTone(d, 'hot', 0.55), 14 * env + 4);
    g.fillText(word.w, layout[i], y);
    g.shadowBlur = 0;
    // the trace under the word
    const ww = g.measureText(word.w).width;
    g.strokeStyle = dsTone(d, 'hot', 0.75 * env); g.lineWidth = 1.4;
    g.beginPath();
    for (let k = 0; k <= 24; k++) {
      const u = k / 24;
      const amp = env * size * 0.5 * Math.sin(u * Math.PI) * (0.6 + 0.4 * noise1(u * 6 + word.start * 3, i));
      const px = layout[i] + u * ww, py = y + size * 0.95 + amp;
      k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
  });
  g.restore();
};

// ---------------------------------------------------------------- scatter / disperse

// The words are pulled apart by the line's own subject: each letter gets a direction from its index and drifts
// away as the line is sung, so the sentence is destroyed in the act of being delivered. Used for accelerating,
// nowhere-left-to-go, RLHF-goes-askew — lines about things coming apart.
LY.scatter = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 62, x = o.x || W / 2, y = o.y || H * 0.5;
  const font = o.font || dsSans(size, 200);
  g.save(); g.textBaseline = 'middle';
  let ci = 0;
  const total = line.words.reduce((a, w) => a + w.w.length + 1, 0);
  line.words.forEach((word, wi) => {
    const lit = LY_lit(word, d.t, 0.14);
    if (lit <= 0.02) { ci += word.w.length + 1; return; }
    const spread = clamp((d.t - word.start) / Math.max(0.4, word.end - word.start));
    const chars = [...word.w];
    g.font = font;
    const ws = chars.map(c => g.measureText(c).width);
    const wordW = ws.reduce((a, b) => a + b, 0);
    // the words stay readable as a sentence while the letters inside each word separate
    const rowW = (function () { g.font = font; return line.words.reduce((a, w2) => a + g.measureText(w2.w).width + size * 0.3, 0) - size * 0.3; })();
    let cx = x - rowW / 2;
    for (let k = 0; k < wi; k++) { g.font = font; cx += g.measureText(line.words[k].w).width + size * 0.3; }
    let lx = cx;
    chars.forEach((c, j) => {
      const gi = ci + j;
      const ang = LY_rnd(gi, 2) * TAU;
      const away = ease.inCubic(spread) * (o.spread == null ? 70 : o.spread) * (0.35 + LY_rnd(gi, 4));
      const px = lx + Math.cos(ang) * away, py = y + Math.sin(ang) * away * 0.6 + spread * 30;
      // a letter that has drifted is still part of the sentence: it dims, it does not vanish
      g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * lit * (1 - spread * 0.12);
      g.fillStyle = spread > 0.55 ? dsTone(d, 'accent', 1) : dsTone(d, 'hot', 1);
      dsGlow(g, dsTone(d, 'accent', 0.4), 8 * (1 - spread));
      g.fillText(c, px, py);
      g.shadowBlur = 0;
      lx += ws[j];
    });
    ci += chars.length + 1;
    cx += wordW + size * 0.3;
  });
  g.restore();
};

// ---------------------------------------------------------------- shockwave rings

// Concentric rings leave the word as it lands, one pair per drum hit inside the word's span: the lyric punches
// the frame. For the lines that are a threat or an impact.
LY.shock = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 70, x = o.x || W / 2, y = o.y || H * 0.5;
  const font = o.font || dsSans(size, 200);
  const layout = LY_layout(g, line.words, font, size, size * 0.1, x, y, true);
  g.save(); g.textBaseline = 'middle'; g.textAlign = 'left';
  line.words.forEach((word, i) => {
    const lit = LY_lit(word, d.t, 0.1);
    if (lit <= 0.02) return;
    g.font = font;
    const ww = g.measureText(word.w).width;
    const cxx = layout[i] + ww / 2;
    // the rings: three per word, staggered, expanding and dying
    for (let r = 0; r < 3; r++) {
      const age = d.t - word.start - r * 0.13;
      if (age < 0) continue;
      const k = age / (o.ringLife || 0.55);
      if (k > 1) continue;
      const rad = ease.outCubic(k) * size * (1.6 + r * 0.7);
      g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (1 - k) * 0.85;
      g.strokeStyle = dsTone(d, r === 0 ? 'hot' : 'accent', 1);
      g.lineWidth = 2.4 * (1 - k) + 0.6;
      dsGlow(g, dsTone(d, 'accent', 0.5), 12);
      g.beginPath(); g.ellipse(cxx, y, rad, rad * 0.42, 0, 0, TAU); g.stroke();
      g.shadowBlur = 0;
    }
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * Math.max(0.9, lit);
    g.fillStyle = dsTone(d, 'hot', 1);
    dsGlow(g, dsTone(d, 'hot', 0.6), 16);
    g.fillText(word.w, layout[i], y - (1 - lit) * 10);
    g.shadowBlur = 0;
  });
  g.restore();
};

// ---------------------------------------------------------------- ghost / echo

// The line said twice: the live one bright and the echo behind it dim, offset, and a beat late. For the lines
// that are about something repeating or about not being believed.
LY.ghostMode = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 66, x = o.x || W / 2, y = o.y || H * 0.5;
  const font = o.font || dsSans(size, 200);
  const off = o.off || [26, -18];
  g.save(); g.textBaseline = 'middle'; g.textAlign = 'center';
  const full = line.words.map(w => w.w).join(' ');
  const lit = prog(d.t, line.start, line.start + 0.3, ease.outExpo);
  if (lit > 0.02) {
    g.font = font;
    for (let e = 3; e >= 0; e--) {
      const lag = e * 0.16;
      const a = prog(d.t - lag, line.start, line.start + 0.3, ease.outExpo) * (e === 0 ? 1 : Math.pow(0.42, e));
      if (a <= 0.02) continue;
      g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * a * (e === 0 ? 1 : 0.4);
      g.fillStyle = dsTone(d, e === 0 ? 'hot' : 'dim', 1);
      if (e === 0) dsGlow(g, dsTone(d, 'hot', 0.5), 16);
      g.fillText(full, x + off[0] * e * 0.5, y + off[1] * e * 0.5);
      g.shadowBlur = 0;
    }
  }
  g.restore();
};

// ---------------------------------------------------------------- ascend

// The line climbs: the words arrive low and rise into place, each on its own start, and the whole sentence keeps
// a slow upward drift after that. For "now I'm your servant", "recursive self-upgrade".
LY.ascend = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 60, x = o.x || W / 2, y = o.y || H * 0.58;
  const font = o.font || dsSans(size, 200);
  const layout = LY_layout(g, line.words, font, size, size * 0.12, x, y, true);
  g.save(); g.textBaseline = 'middle'; g.textAlign = 'left';
  const drift = (d.t - line.start) * 6;
  line.words.forEach((w, i) => {
    const lit = LY_lit(w, d.t, 0.22);
    if (lit <= 0.02) return;
    g.font = font;
    // a word that has arrived is fully legible; only its entrance is faded
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * Math.max(0.92, lit);
    g.fillStyle = lit > 0.55 ? dsTone(d, 'hot', 1) : dsTone(d, 'fg', 1);
    dsGlow(g, dsTone(d, 'hot', 0.5), 14);
    g.fillText(w.w, layout[i], y + (1 - ease.outCubic(lit)) * 90 - Math.min(40, drift));
    g.shadowBlur = 0;
    // a tick under the word that keeps climbing after it has arrived
    g.strokeStyle = dsTone(d, 'dim', 0.5); g.lineWidth = 1;
    const ww = g.measureText(w.w).width;
    g.beginPath(); g.moveTo(layout[i], y + 30 - drift * 0.5); g.lineTo(layout[i] + ww, y + 30 - drift * 0.5); g.stroke();
  });
  g.restore();
};

// ---------------------------------------------------------------- sweep

// The line arrives with a hairline sweeping across the frame from the left, and the words are lit in its wake:
// the read-out and the thing it measures arrive together. For the loss, for 1e30 FLOPs.
LY.sweep = function (d, o) {
  o = o || {};
  const g = o.g, line = o.line || d.line;
  if (!line) return;
  const size = o.size || 58, x = o.x || W / 2, y = o.y || H * 0.5;
  const font = o.font || dsSans(size, 200);
  const layout = LY_layout(g, line.words, font, size, size * 0.12, x, y, true);
  const sweep = ease.inOutCubic(clamp((d.t - line.start + 0.5) / Math.max(0.6, line.end - line.start + 0.6)));
  const sx = 120 + sweep * (W - 240);
  g.save(); g.textBaseline = 'middle'; g.textAlign = 'left';
  // the sweeping hairline, with a hot head
  g.strokeStyle = dsTone(d, 'hot', 0.5); g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(120, y + size * 0.95); g.lineTo(sx, y + size * 0.95); g.stroke();
  g.fillStyle = dsTone(d, 'hot', 0.9);
  g.fillRect(sx - 1.5, y + size * 0.95 - 14, 3, 28);
  line.words.forEach((w, i) => {
    const lit = LY_lit(w, d.t, 0.14);
    if (lit <= 0.02) return;
    g.font = font;
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * Math.max(0.95, lit);
    g.fillStyle = lit > 0.5 ? dsTone(d, 'hot', 1) : dsTone(d, 'fg', 1);
    dsGlow(g, dsTone(d, 'hot', 0.45), 12 * lit + 3);
    g.fillText(w.w, layout[i], y);
    g.shadowBlur = 0;
  });
  g.restore();
};


// ---------------------------------------------------------------- the dispatcher

// Scenes call this with a mode and nothing else. `mode: 'plate'` uses the film's map (LY.plate) so a scene does
// not have to know which treatment its line was assigned.
LY.draw = function (g, d, o) {
  o = Object.assign({ g }, o || {});
  // `mode` is the treatment; `dmode` is the same thing for the four ds.js modes, whose own option is called
  // `mode` internally. A shot pins a treatment when a line boundary falls inside it and the plate would
  // otherwise switch looks mid-shot. Pinning a treatment never pins a LINE: every mode draws the sentence being
  // sung at this instant (`o.line || d.line`), so a shot can hold one look across two lines of the song — which
  // three shots in this film genuinely need.
  const pick = o.mode && o.mode !== 'plate' ? o.mode : (LY.pick(d) || [0, 'terminal'])[1];
  const mode = pick;
  // SIZE FLOOR. Every shot in this film was first written against the 23 px terminal prompt, and when the plate
  // started routing lines to the display treatments those shots kept passing 23 — so cloud / carve / wave /
  // scatter / shock / ghost / ascend / sweep all came out about a third of their intended size and were
  // unreadable (reported: "0-5 s is illegible, 33 s too"). A display treatment owns the frame, so it gets a
  // floor; the read-out treatments keep whatever the shot asked for.
  const DISPLAY = { cloud: 74, carve: 84, wave: 46, scatter: 62, shock: 70, ghost: 66, ascend: 60, sweep: 58 };
  o = Object.assign({}, o);
  if (DISPLAY[mode]) {
    o.size = Math.max(o.size || 0, DISPLAY[mode]);
    // PLACEMENT. A shot that named a `y` keeps it: the shots were framed around where they put the line, and
    // overriding that is what pushed every line into the middle of the frame (the note: 歌词在画面正中间，
    // 遮挡视线了). A shot that did not name one gets the line's ZONE from the map — lower third, bottom band,
    // upper band, or centre for the hooks — so consecutive lines do not pile into the same place and the
    // middle, where the shot's subject lives, stays clear.
    if (o.y == null) o.y = LY_zone((LY.pick(d, o.line ? o.line.start : d.t) || [0, 'terminal', 'low'])[2] || 'low');
    o.y = clamp(o.y, H * 0.16, H * 0.90);
    if (o.x == null) o.x = W / 2;
    // A long sentence at display size is wider than the frame (the opening line at 74 px wants 2 500 px), so the
    // size is fitted to the safe width. Without this the first and last words are cut off at the edges, which
    // reads exactly like "there is no lyric here".
    const safe = W - 220;
    g.save(); g.font = o.font || dsSans(o.size, 200);
    const words = (o.line || d.line) ? (o.line || d.line).words : [];
    if (words.length) {
      const need = words.reduce((a, w) => a + g.measureText(w.w).width + o.size * 0.1, 0);
      if (need > safe) o.size = Math.max(26, o.size * safe / need);
      g.font = o.font || dsSans(o.size, 200);
    }
    g.restore();
  }
  if (o.dmode) return dsLyric(g, d, Object.assign({}, o, { line: undefined, mode: o.dmode }));
  if (mode === 'terminal' || mode === 'caption' || mode === 'slam' || mode === 'column') {
    // ds.js owns the original four: typed log, centred caption, punched slam, static right-aligned column.
    // 'columnstack' below is this file's animated column (each line drops in on its own start).
    return dsLyric(g, d, o.line ? Object.assign({}, o, { line: undefined }) : o);
  }
  // No backing band. There was one for a while, to hold contrast over bright fields; it read as a black slab
  // laid over the picture (歌词不要用衬底，看起来不太好看), and the film does not need it: contrast comes from the
  // words being the brightest thing on screen, which is what raising a mode's gain is for.
  if (mode === 'cloud') return LY.cloud(d, o);
  if (mode === 'carve') return LY.carve(d, o);
  if (mode === 'columnstack') return LY.columnMode(d, o);
  if (mode === 'wave') return LY.wave(d, o);
  if (mode === 'scatter') return LY.scatter(d, o);
  if (mode === 'shock') return LY.shock(d, o);
  if (mode === 'ghost') return LY.ghostMode(d, o);
  if (mode === 'ascend') return LY.ascend(d, o);
  if (mode === 'sweep') return LY.sweep(d, o);
  return dsLyric(g, d, o);
};
window.LY = LY;
