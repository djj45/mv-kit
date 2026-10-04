// words.js — the only way a lyric reaches the screen in "SAFETY NOTICE" (TREATMENT.md §7.2). Scenes never
// fillText a lyric themselves: they call WD.line(g, f, { treat, zone, … }) and the nine treatments below do
// the rest. Each word is its own fillText (so `render.py qa` can measure it), a word is never drawn before its
// start, the whole sentence is fitted with BOX.fit to o.maxW (default W − 2·M) and reported with MV.keep, and
// the sentence stays up until the next line starts or the shot ends.
//
//   WD.current(f)            { line, i } | null — the line this shot should be showing
//   WD.words(f, line)        [{ text, start, end, sung, i }]
//   WD.line(g, f, o)         draw it; o: treat, zone ('top'|'mid'|'low') or x / y, size ('S'…'XXL' or px),
//                            align, maxW, color, key, only (+ per-treatment extras below)
//
// The nine treatments and their extras:
//   stamp  — words stamped on one by one (1.18→1, 0.10 s, ease.outCubic); o.key = word(s) with a yellow block;
//            long sentences wrap onto two rows.
//   sign   — the sentence printed on an SG.plate (up 0.2 s before the line); o.fill / o.color for a black LED
//            board; the plate is sized from the fitted text + o.pad.
//   step   — o.split = [i0, i1, …]: numbered ink discs (mono) + the words of that step, stacked in the zone.
//   tape   — a hazard tape (height 1.6×size) across (x, y) at o.angle with a paper band carrying the words;
//            the stripes travel with f.t; o.dy shifts it (shot 33 lets the lower half of a broken tape fall).
//   label  — o.at = [x, y] on the object: a 3 px leader (0.2 s before the line) to small (S) text; o.dx / o.dy
//            move the text off the point (default 150, −90) and it is kept inside the margin.
//   wall   — pure lyric screen: one word per row (o.rows groups them), heavy, left aligned, the row being sung
//            gets a yellow block, the wall scrolls so that row stays in frame; o.grow widens the block to the
//            full width after the last word (shot 40).
//   count  — a heavy XXL number that jumps per o.steps ([[wordIndex, 'text'], …]) with a 0.12 s roll, and the
//            lyric itself as a stamp in M under it.
//   redact — every word starts under an ink bar; at its start the bar slides right over 0.10 s. o.leave = word
//            indices whose bar never moves (unsung decoration only), o.barH / o.extra = extra dead bars.
//   write  — a yellow pen tip (r 10) runs left to right; a word only appears once the tip has passed it
//            (0.12 s per word). The tip is reported with MV.focus every frame.
(function (G) {
'use strict';
const MV = G.MV, SG = G.SG;
const TAU = Math.PI * 2;

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
// W / H only exist once the engine has started, so these are read at draw time
const L = () => SG.SAFE;                            // where text may sit: M + U from each edge (see SG.SAFE)
const R = () => W - SG.SAFE;
const MAXW = () => W - 2 * SG.SAFE;
const sizeOf = (v, def) => v == null ? def : (typeof v === 'string' ? (SG.SIZE[v] || def) : v);
const spOf = (g, size) => g.measureText(' ').width;

/** the words of a line as the treatments want them: [{ text, start, end, sung, i }] */
function wordsOf(f, line) {
  return line.words.map((w, i) => ({ text: w.w, start: w.start, end: w.end, sung: f.t >= w.start, i }));
}
function isKey(w, key) {
  if (key == null) return false;
  if (typeof key === 'number') return w.i === key;
  return [].concat(key).some(k => (typeof k === 'number' ? w.i === k : norm(k) === norm(w.text)));
}
// the baseline matters for measurement: actualBoundingBoxAscent / Descent are relative to it
function setFace(g, face, size) { SG[face](g, size); g.textBaseline = 'alphabetic'; }

/** measure one row of words: { w, parts: [{ text, w, x, wi }], sp } */
function measureRow(g, ws, size, face, o, x0) {
  setFace(g, face, size);
  const sp = o.space == null ? spOf(g, size) : o.space;
  const parts = []; let x = x0 || 0;
  ws.forEach((w, i) => {
    const tw = g.measureText(w.text).width;
    parts.push({ text: w.text, w: tw, x, wi: w.i, word: w, room: sp });
    x += tw + sp;
  });
  return { w: Math.max(0, x - (x0 || 0) - sp), parts, sp, x1: x - sp };
}
/** greedy wrap of words into rows at `size`, never wider than maxW */
function wrapRows(g, ws, size, face, maxW, o) {
  setFace(g, face, size);
  const sp = o.space == null ? spOf(g, size) : o.space;
  const rows = []; let cur = [], w = 0;
  for (const word of ws) {
    const tw = g.measureText(word.text).width;
    if (cur.length && w + sp + tw > maxW) { rows.push(cur); cur = []; w = 0; }
    if (!cur.length) w = tw; else w += sp + tw;
    cur.push(word);
  }
  if (cur.length) rows.push(cur);
  return rows;
}
function rowWidth(g, ws, size, face, o) { return measureRow(g, ws, size, face, o, 0).w; }

/** zone → baseline, from the real ink of the words in that row */
function inkOf(g, ws, size, face) {
  setFace(g, face, size);
  let asc = 0, desc = 0;
  for (const w of ws) { const m = g.measureText(w.text); asc = Math.max(asc, m.actualBoundingBoxAscent); desc = Math.max(desc, m.actualBoundingBoxDescent); }
  return { asc, desc };
}
function baseFor(zone, y, ink, height) {
  const h = height || 0;
  if (y != null) return y;
  if (zone === 'top') return 120 + ink.asc;
  if (zone === 'low') return (H - SG.SAFE) - ink.desc - h;   // 960: 984 would be skipped by the camera's MV.keep guard
  return 540 + (ink.asc - ink.desc) / 2 - h / 2;      // mid: the ink's vertical middle at y 540
}
function keepBox(g, x0, y0, x1, y1) { if (x1 > x0 && y1 > y0) MV.keep(g, x0, y0, x1 - x0, y1 - y0); }

/** draw one word with the stamp animation (scale 1.18→1 over 0.10 s) */
function stampWord(g, f, part, base, o) {
  const w = part.word;
  if (f.t < w.start) return;
  const k = ease.outCubic(clamp((f.t - w.start) / 0.10));
  if (k >= 1) { g.fillText(part.text, part.x, base); return; }
  const m = g.measureText(part.text);
  // The stamp grows from the word's LEFT edge, and never wider than half the gap to the next word: anchored at the
  // centre it ate the gap in front of it ("as paperclips" read "aspaperclips" in shot 27).
  const room = part.room == null ? Infinity : part.room;
  const grow = m.width > 0 ? Math.min(0.18, room * 0.5 / m.width) : 0;
  const s = 1 + grow * (1 - k);
  g.save(); g.translate(part.x, base); g.scale(s, s); g.translate(-part.x, -base);
  g.fillText(part.text, part.x, base); g.restore();
}
/** the yellow block behind a key word (the only word background in the film); never before the word is sung */
function keyBlock(g, part, base, size, f) {
  if (f.t < part.word.start) return;
  const m = g.measureText(part.text), p = size * 0.14;
  g.fillStyle = SG.C.yellow;
  g.fillRect(part.x - p, base - m.actualBoundingBoxAscent - p * 0.6, m.width + 2 * p, (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + p * 1.2);
}

// ---------------------------------------------------------------- the nine treatments
const T = {};

/** 默认：词按顺序盖上去；超过 maxW 折成两行 */
T.stamp = function (g, f, o, C) {
  const maxW = o.maxW || MAXW(), face = o.face || 'display';
  let size = sizeOf(o.size, SG.SIZE.M);
  let rows = null;
  if (o.rows === 1) {                                   // one row: BOX.fit the whole sentence instead of wrapping
    size = BOX.fit(g, C.ws.map(w => w.text).join(' '), size, maxW, { font: (gg, s2) => setFace(gg, face, s2) });
    rows = [C.ws];
  } else {
    for (let it = 0; it < 10; it++) {
      rows = wrapRows(g, C.ws, size, face, maxW, o);
      const widest = Math.max(...rows.map(r => rowWidth(g, r, size, face, o)));
      if (rows.length <= 2 && widest <= maxW) break;
      const k = rows.length > 2 ? 0.94 : Math.min(1, maxW / Math.max(widest, 1) * 0.995);   // shrink only
      size *= Math.max(0.86, k);
      if (size < 24) break;
    }
  }
  const lh = size * 1.12, ink = inkOf(g, C.ws, size, face);
  const base = baseFor(o.zone, o.y, ink, (rows.length - 1) * lh) + lh * (rows.length - 1);
  setFace(g, face, size);
  const col = o.color || SG.C.ink;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  rows.forEach((row, ri) => {
    const rw = rowWidth(g, row, size, face, o);
    const x0 = o.x != null ? o.x : (o.align === 'left' ? L() : W / 2 - rw / 2);
    const rbase = base - (rows.length - 1 - ri) * lh;
    const mm = measureRow(g, row, size, face, o, x0);
    for (const part of mm.parts) {
      if (isKey(part.word, o.key)) keyBlock(g, part, rbase, size, f);
    }
    g.fillStyle = col;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const part of mm.parts) {
      g.fillStyle = isKey(part.word, o.key) ? SG.C.ink : col;
      stampWord(g, f, part, rbase, o);
    }
    bx0 = Math.min(bx0, x0); bx1 = Math.max(bx1, mm.x1);
    by0 = Math.min(by0, rbase - ink.asc); by1 = Math.max(by1, rbase + ink.desc);
  });
  keepBox(g, bx0, by0, bx1, by1);
  return { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0, size };
};

/** 整句印在一块牌子上（LED 牌：o.fill / o.color） */
T.sign = function (g, f, o, C) {
  const line = C.line;
  if (f.t < line.start - 0.2) return null;
  const maxW = (o.maxW || MAXW()) - 2 * (o.pad == null ? 60 : o.pad);
  const face = o.face || 'display';
  let size = sizeOf(o.size, SG.SIZE.M);
  let rows = null, widest = 0;
  for (let it = 0; it < 10; it++) {
    rows = wrapRows(g, C.ws, size, face, maxW, o);
    widest = Math.max(...rows.map(r => rowWidth(g, r, size, face, o)));
    if (rows.length <= 2 && widest <= maxW) break;
    const k = rows.length > 2 ? 0.94 : Math.min(1, maxW / Math.max(widest, 1) * 0.995);   // shrink only
    size *= Math.max(0.86, k);
    if (size < 24) break;
  }
  const lh = size * 1.12, ink = inkOf(g, C.ws, size, face);
  const base = baseFor(o.zone, o.y, ink, (rows.length - 1) * lh) + lh * (rows.length - 1);
  const pad = o.pad == null ? size * 0.55 : o.pad;
  const x0 = o.x != null ? o.x : (W / 2 - widest / 2);
  const top = base - (rows.length - 1) * lh - ink.asc, bot = base + ink.desc;
  const P = SG.plate(g, x0 - pad, top - pad, widest + 2 * pad, (bot - top) + 2 * pad,
                     { fill: o.fill == null ? SG.C.paper2 : o.fill, border: o.border || SG.C.ink, stripes: o.stripes, name: o.name || 'lyric plate', pad: pad * 0.55 });
  const col = o.color || SG.C.ink;
  setFace(g, face, size);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  rows.forEach((row, ri) => {
    const rbase = base - (rows.length - 1 - ri) * lh;
    const mm = measureRow(g, row, size, face, o, x0);
    for (const part of mm.parts) {
      if (isKey(part.word, o.key)) keyBlock(g, part, rbase, size, f);
      g.fillStyle = isKey(part.word, o.key) ? SG.C.ink : col;
      stampWord(g, f, part, rbase, o);
    }
  });
  keepBox(g, x0 - pad, top - pad, x0 - pad + widest + 2 * pad, bot + pad);
  return { x: P.x, y: P.y, w: P.w, h: P.h, size, owner: P.owner };
};

/** 拆成 2–3 步：编号圆点 + 那一步的词 */
T.step = function (g, f, o, C) {
  const split = (o.split || [0]).slice();
  const face = o.face || 'display';
  const maxW = o.maxW || MAXW();
  const size = sizeOf(o.size, SG.SIZE.M);
  const groups = split.map((s, i) => C.ws.slice(s, i + 1 < split.length ? split[i + 1] : C.ws.length)).filter(gr => gr.length);
  const lh = size * 1.5, R = size * 0.42, gap = size * 0.55;
  const total = (groups.length - 1) * lh + size;
  const ink = inkOf(g, C.ws, size, face);
  const firstBase = baseFor(o.zone, o.y, ink, total - size);
  const x0 = o.x != null ? o.x : (o.align === 'left' ? L() : W / 2 - Math.min(maxW, 1200) / 2);
  const col = o.color || SG.C.ink;
  groups.forEach((gr, i) => {
    const w0 = gr[0], base = firstBase + i * lh;
    if (f.t < w0.start) return;
    const mm = measureRow(g, gr, size, face, o, x0 + R * 2 + gap);
    g.save();
    g.fillStyle = col; g.beginPath(); g.arc(x0 + R, base - size * 0.34, R, 0, TAU); g.fill();
    g.restore();
    // BOX.center: the digit's real ink centred in the disc (textBaseline 'middle' centres the em box, and mono's
    // letterSpacing pushes it off to the left)
    BOX.center(g, String(i + 1), x0 + R, base - size * 0.34,
               { size: R * 1.05, font: (gg, sz) => SG.mono(gg, sz, true),
                 color: o.stepColor || (col === SG.C.ink ? SG.C.paper : SG.C.ink) });
    setFace(g, face, size);
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const part of mm.parts) {
      if (isKey(part.word, o.key)) keyBlock(g, part, base, size, f);
      g.fillStyle = isKey(part.word, o.key) ? SG.C.ink : col;
      stampWord(g, f, part, base, o);
    }
    keepBox(g, x0, base - ink.asc, mm.x1, base + ink.desc);
  });
  return { size };
};

/** 一条警戒胶带横穿 (x, y)，中间纸带上是词 */
T.tape = function (g, f, o, C) {
  const face = o.face || 'display';
  let size = sizeOf(o.size, SG.SIZE.M);
  const maxW = o.maxW || MAXW() * 0.86;         // the tape is slanted: the ends must clear the margin
  const w0 = rowWidth(g, C.ws, size, face, o);
  if (w0 > maxW) size *= maxW / w0 * 0.995;
  const h = size * 1.7;
  const ink = inkOf(g, C.ws, size, face);
  const tw = rowWidth(g, C.ws, size, face, o);
  const bandW = tw + size * 1.1, L = bandW + h * 2.2;
  const cx = o.x != null ? o.x : W / 2;
  let cy = o.y != null ? o.y : (o.zone === 'low' ? 984 - h / 2 : o.zone === 'top' ? 120 + h / 2 : 540);
  cy += (o.dy || 0);
  g.save();
  g.translate(cx, cy); g.rotate((o.angle || 0) * Math.PI / 180);
  SG.stripes(g, -L / 2, -h / 2, L, h, { angle: 45, period: h * 0.75, phase: f.t * 90 });
  g.fillStyle = o.band || SG.C.paper;
  g.fillRect(-bandW / 2, -h * 0.40, bandW, h * 0.80);
  setFace(g, face, size);
  g.fillStyle = o.color || SG.C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const base = (ink.asc - ink.desc) / 2;
  const mm = measureRow(g, C.ws, size, face, o, -tw / 2);
  for (const part of mm.parts) {
    if (isKey(part.word, o.key)) keyBlock(g, part, base, size, f);
    g.fillStyle = isKey(part.word, o.key) ? SG.C.ink : (o.color || SG.C.ink);
    stampWord(g, f, part, base, o);
  }
  keepBox(g, -bandW / 2, -h / 2, bandW / 2, h / 2);
  g.restore();
  return { size, cx, cy };
};

/** 从物体上的点拉一条引线，标小字 */
T.label = function (g, f, o, C) {
  const at = o.at || [W / 2, H / 2];
  const face = o.face || 'display';
  const size = sizeOf(o.size, SG.SIZE.S);
  const ink = inkOf(g, C.ws, size, face);
  const tw = rowWidth(g, C.ws, size, face, o);
  let x = o.x != null ? o.x : at[0] + (o.dx == null ? 150 : o.dx);
  let base = o.y != null ? o.y : at[1] + (o.dy == null ? -90 : o.dy);
  x = clamp(x, L(), R() - tw);
  base = clamp(base, 120 + ink.asc, (H - SG.SAFE) - ink.desc);
  const first = C.ws[0];
  if (f.t >= first.start - 0.2) {
    g.save();
    g.strokeStyle = o.leader || (o.color || SG.C.ink); g.lineWidth = SG.LW.rule; g.lineCap = 'round'; g.lineJoin = 'round';
    const ex = x - 16, ey = base - size * 0.34;
    g.beginPath(); g.moveTo(at[0], at[1]); g.lineTo(ex - 60, ey); g.lineTo(ex, ey); g.stroke();
    g.restore();
  }
  setFace(g, face, size);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const mm = measureRow(g, C.ws, size, face, o, x);
  for (const part of mm.parts) {
    if (isKey(part.word, o.key)) keyBlock(g, part, base, size, f);
    g.fillStyle = isKey(part.word, o.key) ? SG.C.ink : (o.color || SG.C.ink);
    stampWord(g, f, part, base, o);
  }
  keepBox(g, x, base - ink.asc, mm.x1, base + ink.desc);
  MV.focus(at[0], at[1], o.name || 'label');
  return { size, x, base, w: tw };
};

/** 纯歌词画面：一行一个词，正在唱的那一行垫黄，墙跟着滚 */
T.wall = function (g, f, o, C) {
  const face = o.face || 'heavy';
  const rows = o.rows ? o.rows.map(g2 => g2.map(i => C.ws[i]).filter(Boolean)) : C.ws.map(w => [w]);
  let size = sizeOf(o.size, 420);
  const left = o.x != null ? o.x : SG.SAFE + 24;          // XXL ink can start ~12 px left of its origin
  const maxW = o.maxW || (W - 2 * left);
  const widest = Math.max(...rows.map(r => rowWidth(g, r, size, face, o)));
  if (widest > maxW) size *= maxW / widest * 0.995;
  const lh = size * 1.06, total = (rows.length - 1) * lh + size;
  // which row is being sung (the last row with a started word)
  let active = -1;
  rows.forEach((r, i) => { if (r.some(w => f.t >= w.start)) active = i; });
  const ink = inkOf(g, C.ws, size, face);
  // before the first word is sung the wall still stands on its first row: the shot must not open on blank paper
  // with the focus reported off frame (qa: focus-out) — the row that owns the block is max(active, 0).
  const focusRow = Math.max(active, 0);
  let top = (H - total) / 2;
  const ay0 = top + focusRow * lh;
  if (ay0 < 120) top += 120 - ay0;
  if (ay0 + lh > H - 120) top -= (ay0 + lh) - (H - 120);
  const inkH = (rows.length - 1) * lh + ink.asc + ink.desc;
  if (inkH <= 984 - 120) top = clamp(top, 120, 984 - inkH);
  const last = C.ws[C.ws.length - 1];
  const grow = o.grow ? ease.inOutQuad(clamp((f.t - last.start) / o.grow)) : 0;
  setFace(g, face, size);
  rows.forEach((row, i) => {
    const base = top + i * lh + ink.asc;
    const mm = measureRow(g, row, size, face, o, left);
    if (i === focusRow) {
      // before the first word the block is already there, as wide as that word; from its start it is the whole row
      const w0 = active >= 0 ? mm.w : (mm.parts.length ? mm.parts[0].w : 0);
      const gw = lerp(w0 + size * 0.24, Math.max(W, mm.w + size * 0.24), grow);
      g.fillStyle = SG.C.yellow;
      g.fillRect(left - size * 0.12, base - ink.asc - size * 0.04, gw, ink.asc + ink.desc + size * 0.08);
    }
    g.fillStyle = i === focusRow ? SG.C.ink : (o.color || SG.C.ink);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const part of mm.parts) stampWord(g, f, part, base, o);
    if (i === focusRow) {
      const w0 = active >= 0 ? mm.w : (mm.parts.length ? mm.parts[0].w : 0);
      keepBox(g, left, base - ink.asc, left + Math.max(w0, 10), base + ink.desc);
      MV.focus(left + Math.max(w0, 10) / 2, base - (ink.asc - ink.desc) / 2, o.name || 'lyric row');
    }
  });
  return { size, top, left, lh };
};

/** 巨大数字按词跳，歌词另用 stamp M 放在下面 */
T.count = function (g, f, o, C) {
  const steps = o.steps || [];
  let cur = '', at = -1;
  for (const [wi, s] of steps) { const w = C.ws[wi]; if (w && f.t >= w.start) { if (w.start >= at) { at = w.start; cur = s; } } }
  if (cur) {
    const k = clamp((f.t - at) / 0.12), e = ease.outCubic(k);
    let size = sizeOf(o.size, SG.SIZE.XXL);
    size = BOX.fit(g, cur, size, W - 2 * (SG.SAFE + 24), { font: (gg, s) => SG.heavy(gg, s) });
    SG.heavy(g, size);
    g.save();
    g.translate(0, (1 - e) * size * 0.35);
    g.globalAlpha *= 0.25 + 0.75 * e;
    g.fillStyle = o.color || SG.C.ink;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const w = g.measureText(cur).width, x = W / 2 - w / 2, base = (o.numY == null ? 470 : o.numY);
    g.fillText(cur, x, base);
    keepBox(g, x, base - size * 0.72, x + w, base + size * 0.08);
    MV.focus(x + w, base - size * 0.32 + (1 - e) * size * 0.35, o.name || 'number');
    g.restore();
  }
  T.stamp(g, f, Object.assign({}, o, { size: o.lyricSize || 'M', numY: undefined }), C);
  return { size: 0 };
};

/** 每个词先被涂黑条盖住，唱到时条子滑走 */
T.redact = function (g, f, o, C) {
  const face = o.face || 'display';
  const maxW = o.maxW || MAXW();
  let size = sizeOf(o.size, SG.SIZE.L);
  let rows = null, widest = 0;
  for (let it = 0; it < 10; it++) {
    rows = wrapRows(g, C.ws, size, face, maxW, o);
    widest = Math.max(...rows.map(r => rowWidth(g, r, size, face, o)));
    if (rows.length <= 2 && widest <= maxW) break;
    const k = rows.length > 2 ? 0.94 : Math.min(1, maxW / Math.max(widest, 1) * 0.995);   // shrink only
    size *= Math.max(0.86, k);
    if (size < 24) break;
  }
  const lh = size * 1.14, ink = inkOf(g, C.ws, size, face);
  const base = baseFor(o.zone, o.y, ink, (rows.length - 1) * lh) + lh * (rows.length - 1);
  const col = o.color || SG.C.ink, barH = o.barH == null ? size * 1.02 : o.barH;
  setFace(g, face, size);
  rows.forEach((row, ri) => {
    const rw = rowWidth(g, row, size, face, o);
    const x0 = o.x != null ? o.x : (o.align === 'left' ? L() : W / 2 - rw / 2);
    const rbase = base - (rows.length - 1 - ri) * lh;
    const mm = measureRow(g, row, size, face, o, x0);
    // a bar that has slid off its word must not stay on screen: keep the row inside its own box
    g.save();
    g.beginPath(); g.rect(x0 - size * 0.35, rbase - ink.asc - barH * 0.6, mm.w + size * (1.1 + (o.extra || 0) * 2.4), ink.asc + ink.desc + barH * 1.2);
    g.clip();
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const part of mm.parts) {
      const w = part.word, off = size * 0.16;
      const bx = part.x - off, bw = part.w + off * 2;
      const leave = (o.leave || []).includes(w.i);
      const k = leave ? 0 : clamp((f.t - w.start) / 0.10);
      const dx = ease.outCubic(k) * (bw + part.w + size * 0.3);
      if (!leave && f.t >= w.start) { g.fillStyle = col; g.fillText(part.text, part.x, rbase); }
      // the bar slides off its own word and is clipped there: it must never come to rest on the next word
      g.save();
      g.beginPath(); g.rect(bx, rbase - ink.asc - barH * 0.5, bw, ink.asc + ink.desc + barH); g.clip();
      g.fillStyle = o.bar || SG.C.ink;
      g.fillRect(bx + dx, rbase - ink.asc - barH * 0.10, bw, barH);
      g.restore();
    }
    for (let e2 = 0; e2 < (o.extra || 0); e2++) {          // dead bars after the sentence: the answer, redacted
      const bw = size * (1.2 + 0.35 * ((e2 * 7) % 3)), bx = mm.x1 + size * 0.35 + e2 * (bw + size * 0.28);
      g.fillStyle = o.bar || SG.C.ink;
      g.fillRect(bx, rbase - ink.asc - barH * 0.10, bw, barH);
    }
    g.restore();
    const extraW = (o.extra || 0) ? size * 0.35 + size * (1.2 + 0.35 * (((o.extra - 1) * 7) % 3)) : 0;
    keepBox(g, x0, rbase - ink.asc - barH * 0.1, mm.x1 + extraW, rbase + ink.desc);
  });
  return { size };
};

/** 笔尖走过去，字才出现 */
T.write = function (g, f, o, C) {
  const face = o.face || 'display';
  const maxW = o.maxW || MAXW();
  let size = sizeOf(o.size, SG.SIZE.L);
  const widest = rowWidth(g, C.ws, size, face, o);
  if (widest > maxW) size *= maxW / widest * 0.995;
  const ink = inkOf(g, C.ws, size, face);
  const base = baseFor(o.zone, o.y, ink, 0);
  const mm = measureRow(g, C.ws, size, face, o, o.x != null ? o.x : (o.align === 'left' ? L() : W / 2 - rowWidth(g, C.ws, size, face, o) / 2));
  // the tip is at the furthest point any started word has been written to (0.12 s per word)
  let penX = mm.parts[0].x, started = false;
  for (const part of mm.parts) {
    const k = clamp((f.t - part.word.start) / 0.12);
    if (f.t >= part.word.start) { penX = Math.max(penX, part.x + part.w * ease.outCubic(k)); started = true; }
  }
  setFace(g, face, size);
  g.save();
  g.beginPath(); g.rect(0, 0, penX + 2, H); g.clip();
  g.fillStyle = o.color || SG.C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  for (const part of mm.parts) {
    if (isKey(part.word, o.key)) keyBlock(g, part, base, size, f);
    g.fillStyle = isKey(part.word, o.key) ? SG.C.ink : (o.color || SG.C.ink);
    if (f.t >= part.word.start) g.fillText(part.text, part.x, base);
  }
  g.restore();
  // the pen tip itself
  const py = base - (ink.asc - ink.desc) / 2 + Math.sin(f.t * 6) * 2;
  g.save();
  g.fillStyle = SG.C.yellow; g.beginPath(); g.arc(penX, py, 10, 0, TAU); g.fill();
  g.strokeStyle = o.color || SG.C.ink; g.lineWidth = 3; g.beginPath(); g.arc(penX, py, 10, 0, TAU); g.stroke();
  g.restore();
  if (started) MV.focus(penX, py, o.name || 'pen tip');
  keepBox(g, mm.parts[0].x, base - ink.asc, mm.parts[mm.parts.length - 1].x + mm.parts[mm.parts.length - 1].w, base + ink.desc);
  return { size, penX };
};

// ---------------------------------------------------------------- the public object
const WD = {
  /**
   * The line this shot shows: the last one that started, but only while it still has words to sing after the cut.
   * A line sung out before the cut is not drawn again here (that would flash the previous shot's sentence in this
   * shot's style — qa: lyric-carryover); this shot shows nothing until its own line starts. A cut in the middle of a
   * line still carries it over. (= MV.lyrics.lineAt(f.t, f.from), without the tail.)
   */
  current(f) {
    const lines = MV.lyrics.lines.filter(l => l.words.length);
    let cur = null;
    for (const l of lines) if (l.start <= f.t) cur = l;
    if (!cur || cur.words[cur.words.length - 1].start < f.from - 1e-6) return null;
    return { line: cur, i: cur.i };
  },
  words(f, line) { return wordsOf(f, line); },
  /** draw the current line with one of the nine treatments; returns the box it used (or null) */
  line(g, f, o) {
    o = o || {};
    const cur = o.line ? { line: o.line, i: o.line.i } : WD.current(f);
    if (!cur || !cur.line) return null;
    let ws = wordsOf(f, cur.line);
    if (o.only) ws = o.only.map(i => ws[i]).filter(Boolean);
    if (!ws.length) return null;
    const fn = T[o.treat || 'stamp'];
    if (!fn) throw new Error('WD.line: unknown treat "' + o.treat + '"');
    const save = g.textAlign;
    const r = fn(g, f, o, { line: cur.line, ws, i: cur.i });
    g.textAlign = save;
    return r;
  },
  /**
   * The box a treatment would use, without drawing it (scenes put signs around a line). Pass the SAME o.zone /
   * o.treat / o.size you will draw with: the default zone is the mid zone, so reading .y without a zone gives a
   * baseline 400 px from the one the line will use (round 2 hit this in shot 12).
   */
  measure(g, f, o) {
    o = Object.assign({}, o, { _measure: true });
    const cur = WD.current(f);
    if (!cur) return null;
    let ws = wordsOf(f, cur.line);
    if (o.only) ws = o.only.map(i => ws[i]).filter(Boolean);
    if (!ws.length) return null;
    const face = o.face || 'display';
    const size = sizeOf(o.size, SG.SIZE.M);
    const maxW = o.maxW || MAXW();
    const widest = rowWidth(g, ws, size, face, o);
    const s = widest > maxW ? size * maxW / widest * 0.995 : size;
    const ink = inkOf(g, ws, s, face);
    const base = baseFor(o.zone, o.y, ink, 0);
    const x0 = o.x != null ? o.x : (o.align === 'left' ? L() : W / 2 - rowWidth(g, ws, s, face, o) / 2);
    const x1 = x0 + rowWidth(g, ws, s, face, o);
    return { x: x0, y: base - ink.asc, w: x1 - x0, h: ink.asc + ink.desc, base, size: s, asc: ink.asc, desc: ink.desc };
  },
  /** ink metrics of a line at a size: { asc, desc, w } (scenes size plates around a lyric) */
  ink(g, f, o) {
    o = o || {};
    const cur = WD.current(f);
    if (!cur) return null;
    const face = o.face || 'display';
    const size = sizeOf(o.size, SG.SIZE.M);
    const ws = wordsOf(f, cur.line);
    setFace(g, face, size);
    return Object.assign(inkOf(g, ws, size, face), { text: ws.map(w => w.text).join(' '), size });
  },
};

G.WD = WD;
})(window);
