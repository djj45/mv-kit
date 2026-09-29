// mv-kit — core utilities.
// Exposed as globals (p5-style) so scene code stays terse. Everything here is deterministic:
// never use Math.random(), Date.now() or performance.now() for visuals — a frame must be a pure
// function of song time t (the export renders frames out of order and averages sub-frames).
(function (G) {
'use strict';
const MV = (G.MV = G.MV || {});

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const remap = (x, a, b, c = 0, d = 1) => c + (d - c) * clamp((x - a) / (b - a));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};
/** Progress of t through [a, b], clamped to 0..1, optionally eased. */
const prog = (t, a, b, e) => { const x = clamp((t - a) / (b - a)); return e ? e(x) : x; };
/** Keyframes: keys(t, [[t0, v0], [t1, v1, ease], ...]) — the ease on a key shapes the segment arriving at it. */
function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const [a, va] = ks[i - 1], [b, vb, e] = ks[i]; return lerp(va, vb, prog(t, a, b, e)); }
  return ks[ks.length - 1][1];
}
/** 1 at `at`, falling linearly to 0 over `len` seconds. */
const pulse = (t, at, len) => (t >= at && t < at + len ? 1 - (t - at) / len : 0);

// ---- seeded randomness
function hash(a, b = 0, c = 0) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1440662683)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Smooth value noise in [-1, 1]. */
function noise1(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i, s), hash(i + 1, s), u) * 2 - 1; }
function noise2(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
function fbm1(x, s = 0, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise1(x * f, s + i * 17); a *= 0.5; f *= 2; } return v; }

// ---- drawing cadence: hand-drawn animation holds each drawing for several frames.
// MV.drawRate = drawings per second (12 = "on twos" at 24 fps). tick(t) = drawing index,
// onTwos(t) = t quantized to the drawing. Use tick(t) to seed per-drawing jitter (line boil, grain).
MV.drawRate = 12;
const tick = t => Math.floor(t * MV.drawRate + 1e-6);
const onTwos = t => tick(t) / MV.drawRate;

function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

MV.util = { TAU, clamp, lerp, remap, smoothstep, ease, prog, keys, pulse, hash, mulberry32, noise1, noise2, fbm1, tick, onTwos, mk };
Object.assign(G, MV.util);
})(window);
