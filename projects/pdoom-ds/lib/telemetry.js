// telemetry.js — the film's instrument panel. The rule: if the machine is thinking, you can see the numbers move.
// These are drawn in crisp Canvas 2D on top of the light, in the palette of whichever shot is live, and they are
// the reason a frame holds up when you freeze it.
//
//   TL.block(g, d, [[label, value], ...], { x, y })   a column of label/value rows
//   TL.log(g, d, [line, line, ...], { x, y, rows })   a terminal log that scrolls one line at a time
//   TL.gauge(g, d, x, y, w, v, { label })             a hairline bar
//   TL.spark(g, d, x, y, w, h, fn)                    a live trace drawn by code
//   TL.matrix(g, d, x, y, w, h, { seed })             a field of running characters
//   TL.stamp(g, d, text, x, y)                        a wide-tracked label
//   TL.code(g, d, lines, x, y)                        a code block whose lines light up in order

const TL = {};

// label/value rows. Values may be numbers (formatted) or strings; `hot` row indices flash on the beat.
TL.block = function (g, d, rows, o) {
  o = o || {};
  const x = o.x == null ? W - 470 : o.x, y = o.y == null ? 150 : o.y;
  const size = o.size || 15, lh = o.lh || 24, colW = o.colW || 200;
  g.save();
  g.textBaseline = 'middle';
  rows.forEach((r, i) => {
    const [k, v] = r;
    const hot = o.hot && o.hot.indexOf(i) >= 0;
    const flash = hot ? 0.35 + 0.65 * clamp(1 - d.beatPhase * 2.2) : 1;
    g.font = dsMono(size, 400);
    g.fillStyle = dsTone(d, 'dim', 0.8 * (o.alpha == null ? 1 : o.alpha));
    g.fillText(String(k), x, y + i * lh);
    g.font = dsMono(size, 500);
    g.fillStyle = dsTone(d, hot ? 'hot' : (o.valueColor || 'accent'), (o.alpha == null ? 1 : o.alpha) * flash);
    g.fillText(typeof v === 'number' ? TL.num(v) : String(v), x + colW, y + i * lh);
  });
  g.restore();
};

// A terminal log: `lines` is the whole history; one new line lands every `every` seconds. The last line gets a
// blinking cursor, so the log is always the thing that is "happening" on screen.
TL.log = function (g, d, lines, o) {
  o = o || {};
  const x = o.x == null ? W - 640 : o.x, y = o.y == null ? H - 250 : o.y;
  const size = o.size || 16, lh = size * 1.7, rows = o.rows || 6;
  const every = o.every || 0.5, t0 = o.t0 == null ? 0 : o.t0;
  const n = Math.floor(Math.max(0, (d.t - t0) / every));
  const first = Math.max(0, n - rows + 1);
  g.save();
  g.textBaseline = 'middle';
  for (let i = first; i <= Math.min(n, lines.length - 1); i++) {
    const age = n - i;
    const a = (age === 0 ? 1 : age === 1 ? 0.62 : age === 2 ? 0.38 : 0.18) * (o.alpha == null ? 1 : o.alpha);
    const r = i - first;
    g.font = dsMono(size, 400);
    g.fillStyle = dsTone(d, age === 0 ? 'hot' : 'dim', a);
    const txt = (o.prompt == null ? '› ' : o.prompt) + lines[i];
    g.fillText(txt, x, y - (rows - 1 - r) * lh);
    if (age === 0 && o.cursor !== false && d.beatPhase < 0.55) {
      g.fillStyle = dsTone(d, 'accent', 0.9);
      g.fillRect(x + g.measureText(txt).width + 6, y - (rows - 1 - r) * lh - size * 0.55, size * 0.5, size * 1.1);
    }
  }
  g.restore();
};

// A hairline bar gauge with a cap tick. Hairline = 1px line + a few points of light; no filled rectangles.
TL.gauge = function (g, d, x, y, w, v, o) {
  o = o || {};
  const h = o.h || 6, k = clamp(v);
  g.save();
  g.strokeStyle = dsTone(d, 'dim', 0.5); g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w, h);
  g.fillStyle = dsTone(d, o.color || 'accent', 0.85);
  for (let i = 0; i < w * k; i += 2) g.fillRect(x + i, y + 1, 1, h - 1);
  if (o.label) {
    g.font = dsMono(o.size || 13, 400);
    g.fillStyle = dsTone(d, 'dim', 0.8);
    g.textBaseline = 'middle';
    g.fillText(o.label, x + w + 14, y + h / 2);
  }
  g.restore();
};

// A trace drawn live: fn(u) → 0..1 across the bar. Cheaper than a point cloud and reads as an instrument.
TL.spark = function (g, d, x, y, w, h, fn, o) {
  o = o || {};
  const n = o.n || 96, t = d.t;
  g.save();
  if (o.frame !== false) { g.strokeStyle = dsTone(d, 'dim', 0.35); g.lineWidth = 1; g.strokeRect(x + 0.5, y - h + 0.5, w, h); }
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const v = clamp(fn(u, t));
    const px = x + u * w, py = y - v * h;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.strokeStyle = dsTone(d, o.color || 'accent', 0.9);
  g.lineWidth = o.width || 1.4;
  dsGlow(g, dsTone(d, o.color || 'accent', 0.55), 5);
  g.stroke();
  g.restore();
};

// A field of running characters. Deterministic per (cell, time bucket) — the noise is in the glyph choice,
// not in a random number generator.
TL.matrix = function (g, d, x, y, w, h, o) {
  o = o || {};
  const size = o.size || 14, cw = size * 1.35, ch = size * 1.5;
  const cols = Math.floor(w / cw), rows = Math.floor(h / ch);
  const speed = o.speed == null ? 9 : o.speed, seed = o.seed || 3;
  g.save();
  g.font = dsMono(size, 400);
  g.textBaseline = 'middle';
  for (let c = 0; c < cols; c++) {
    const stream = hash(c, seed) * 100;
    const head = (d.t * speed + stream) % (rows + 8) - 4;
    for (let r = 0; r < rows; r++) {
      const local = head - r;
      if (local < -1 || local > (o.tail || 7)) continue;
      const a = clamp(1 - Math.abs(local) / (o.tail || 7));
      const gi = Math.floor((c * 31 + r * 17 + Math.floor(d.t * speed)) * 3.7) % DS_GLYPH.length;
      g.fillStyle = dsTone(d, local < 0.6 ? 'hot' : 'accent', a * (o.alpha == null ? 0.55 : o.alpha));
      g.fillText(DS_GLYPH[gi], x + c * cw, y + r * ch);
    }
  }
  g.restore();
};

// A small wide-tracked label. Used for the film's own annotations ("P(doom)", "TOKEN 41", "β = 0.98").
TL.stamp = function (g, d, text, x, y, o) {
  o = o || {};
  dsLine(g, text, x, y, {
    font: dsMono(o.size || 14, 400), size: o.size || 14,
    color: dsTone(d, o.color || 'dim', o.alpha == null ? 0.9 : o.alpha),
    track: o.track == null ? 3 : o.track, glow: 0, align: o.align || 'left',
  });
};

// A code block whose lines arrive one after another, with the current line highlighted. The film's "machine
// writes itself" motif; the source can be anything, including the scene's own body.
TL.code = function (g, d, lines, x, y, o) {
  o = o || {};
  const size = o.size || 17, lh = size * 1.55, per = o.per || 0.34, t0 = o.t0 == null ? 0 : o.t0;
  const live = Math.floor(Math.max(0, d.t - t0) / per);
  g.save();
  g.textBaseline = 'middle';
  const rows = o.rows || lines.length;
  for (let i = 0; i < Math.min(lines.length, rows); i++) {
    const a = i <= live ? (i === live ? 1 : 0.5) : 0;
    if (a <= 0) continue;
    g.font = dsMono(size, 400);
    g.fillStyle = dsTone(d, 'dim', 0.55 * a);
    g.fillText(String(i + 1).padStart(3, ' '), x, y + i * lh);
    g.fillStyle = dsTone(d, i === live ? 'hot' : 'fg', 0.9 * a);
    g.fillText(lines[i], x + size * 2.6, y + i * lh);
  }
  g.restore();
};

// 1234567 → 1 234 567
TL.num = function (v) {
  const n = Math.round(v);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

// A rolling counter that never quite settles: base value + a small deterministic wobble in `place` digits.
// This is the number that makes a static frame feel like it is measuring something real.
TL.roll = function (t, value, place, speed) {
  const sp = speed == null ? 24 : speed;
  const wob = noise1(Math.floor(t * sp) * 0.37, place || 1) * Math.pow(10, place || 1) * 0.5;
  return Math.max(0, value + wob);
};
