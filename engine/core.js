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

// ---- output scale (1080p and 4K from the same project)
// Scenes and kits draw in DESIGN units: W × H is the project's width / height (1920 × 1080), and every coordinate,
// font size, line width, blur and shadow is in those units. The output and the full-frame layers have MV.scale times
// as many pixels (render.py --scale 2 / --4k: 3840 × 2160). A layer made with mkHi(w, h) has w·k × h·k pixels and a
// 2D context that already draws in design units; on such layers (and only there) the context is patched so that
//   setTransform / resetTransform / getTransform work in design units (setTransform(1, 0, 0, 1, 0, 0) = "reset"),
//   drawImage of a scaled layer takes its size and source rectangle in design units (drawImage(layer, 0, 0) fits),
//   shadowBlur / shadowOffsetX / Y and the px lengths in filter ('blur(6px)') are in design units (Chrome measures
//   them in bitmap pixels, untouched by the transform),
//   createPattern of a scaled layer tiles it at its design size.
// Raw pixel access is NOT translated: canvas.width / height, getImageData / putImageData are bitmap pixels (use
// MV.sizeOf(c) for the design size). Ordinary mk() canvases stay 1× (analysis, textures, low-res soft buffers);
// drawn onto a scaled layer they are scaled up — correct, just soft. At MV.scale = 1 nothing is patched or flagged:
// a 1080p render is exactly what it was before this existed.
MV.scale = (() => { try { const s = +new URLSearchParams(G.location.search).get('scale'); return s > 0 ? s : 1; } catch (e) { return 1; } })();
/** A canvas of w × h DESIGN units with MV.scale × as many pixels; its 2D context draws in design units. */
function mkHi(w, h) {
  const k = MV.scale;
  if (k === 1) return mk(w, h);
  const c = mk(w * k, h * k);
  c.__k = c.width / Math.max(1, Math.round(w));
  c.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);
  return c;
}
/** [w, h] in design units of a canvas / image (a mkHi layer reports its design size, anything else its pixels). */
MV.sizeOf = c => { const k = c.__k || 1; return [(c.naturalWidth || c.videoWidth || c.width) / k, (c.naturalHeight || c.videoHeight || c.height) / k]; };
/** Does canvas c match a w × h design-unit layer at the current scale (for "make it once, remake on resize" caches)? */
MV.fits = (c, w, h) => !!c && c.width === Math.max(1, Math.round(w * MV.scale)) && c.height === Math.max(1, Math.round(h * MV.scale));

function installScale() {
  const P = CanvasRenderingContext2D.prototype, K = ctx => ctx.canvas && ctx.canvas.__k;
  const st = P.setTransform, rt = P.resetTransform, gt = P.getTransform, di = P.drawImage, cp = P.createPattern;
  P.setTransform = function (a, b, c, d, e, f) {
    const s = K(this);
    if (!s) return st.apply(this, arguments);
    if (a === undefined || (typeof a === 'object' && a)) { const m = new DOMMatrix(a === undefined ? undefined : [a.a ?? a.m11 ?? 1, a.b ?? a.m12 ?? 0, a.c ?? a.m21 ?? 0, a.d ?? a.m22 ?? 1, a.e ?? a.m41 ?? 0, a.f ?? a.m42 ?? 0]); ({ a, b, c, d, e, f } = m); }
    return st.call(this, a * s, b * s, c * s, d * s, e * s, f * s);
  };
  P.resetTransform = function () { return K(this) ? this.setTransform(1, 0, 0, 1, 0, 0) : rt.call(this); };
  P.getTransform = function () { const m = gt.call(this), s = K(this); return s ? new DOMMatrix([m.a / s, m.b / s, m.c / s, m.d / s, m.e / s, m.f / s]) : m; };
  P.drawImage = function (img, ...r) {
    const s = img && img.__k;
    if (!s) return di.call(this, img, ...r);
    if (r.length === 2) return di.call(this, img, r[0], r[1], img.width / s, img.height / s);
    if (r.length === 8) return di.call(this, img, r[0] * s, r[1] * s, r[2] * s, r[3] * s, r[4], r[5], r[6], r[7]);
    return di.call(this, img, ...r);
  };
  for (const key of ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY']) {
    const dsc = Object.getOwnPropertyDescriptor(P, key);
    Object.defineProperty(P, key, { configurable: true, enumerable: dsc.enumerable,
      get() { const v = dsc.get.call(this), s = K(this); return s ? v / s : v; },
      set(v) { const s = K(this); dsc.set.call(this, s ? v * s : v); } });
  }
  const fd = Object.getOwnPropertyDescriptor(P, 'filter'), PX = /(-?\d*\.?\d+(?:e[-+]?\d+)?)px/gi;
  Object.defineProperty(P, 'filter', { configurable: true, enumerable: fd.enumerable,
    get() { const v = fd.get.call(this), s = K(this); return s ? v.replace(PX, (m, n) => `${+n / s}px`) : v; },
    set(v) { const s = K(this); fd.set.call(this, s ? String(v).replace(PX, (m, n) => `${+n * s}px`) : v); } });
  P.createPattern = function (img, rep) {
    const p = cp.call(this, img, rep), s = img && img.__k;
    if (p && s && p.setTransform) p.setTransform(new DOMMatrix([1 / s, 0, 0, 1 / s, 0, 0]));
    return p;
  };
}
if (MV.scale !== 1 && G.CanvasRenderingContext2D) installScale();

MV.util = { TAU, clamp, lerp, remap, smoothstep, ease, prog, keys, pulse, hash, mulberry32, noise1, noise2, fbm1, tick, onTwos, mk, mkHi };
Object.assign(G, MV.util);
})(window);
