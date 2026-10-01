// mv-kit style kit: qinghua.js — 青花 (blue-and-white porcelain) decoration: 勾勒 + 分水 on clay and glaze.
//
// Everything is drawn as pigment DENSITY into pigment.js layers (L.dry for lines, L.wet for 分水 washes, L.col for
// the two real colours), then composited with preset 'raw' (生料 on unfired 素胚) or 'cobalt' (青花 on glaze).
// Needs kits ink.js (cutPolyline, resamplePolyline, ink, blobPts) and pigment.js.
//
//   QH                                   palette + densities (QH.D.ying / dan / er / zheng / tou) + FONT
//   qhLine(c, pts, {w, a, closed, upto, dot, tk, jit, wob, seed})   even-width 勾线 with an entry dot, hand shake, boil
//   qhFill(c, pts, a, {k, from, seed})   分水: a flat tone that spreads from a drop at `from` (k = 0..1)
//   qhBegonia(cx, cy, w, h)              海棠形 panel outline (four lobes, cusps between)
//   qhRuyi(cx, top, w, h)                如意云头 pendant outline
//   qhCurl(x, y, r, turns, dir, rot)     云纹 curl (spiral) — smoke, waves, clouds all use it
//   qhSmoke(x, y, len, t, seed)          a rising 一缕 of smoke: a wavy line ending in curls
//   qhHuiwen(x0, x1, y, h)               回纹 key band → polylines
//   qhWaves(x0, x1, y0, y1, phase)       海水: rows of scale arcs + crest curls → polylines
//   qhPetal(cx, cy, a, r0, r1, w, seed)  ruffled petal outline
//   qhPeony(L, cx, cy, s, {line, fill, tk, heart})   a peony head (petals appear one after another)
//   qhCylinder(tex, {...})               WebGL: wrap an unwrap texture round a surface of revolution, lit (matte / glaze)
//   qhLyrics(g, f, x, y, {size, fired, dark, lines, place})   vertical, right to left; each character fires in when sung
(function (G) {
'use strict';
const MV = G.MV;

const QH = {
  biscuit: '#E4DCCB', rawN: '#34322F', rawM: '#6E6A64', rawD: '#A8A297',
  glaze: '#F1F3EE', tou: '#0F1C48', zheng: '#1E3A8A', er: '#3558A6', dan: '#7593C8', ying: '#BDCCE5',
  tianqing: '#AFC7C2', hong: '#A83A3C', fire: '#FFF8EA',
  D: { ying: 0.16, dan: 0.34, er: 0.6, zheng: 0.84, tou: 0.97 },
  FONT: '"QHFang", "STFangsong", "FangSong", "Noto Serif CJK SC", serif',
};
const rgbOf = h => { const n = parseInt(h.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgba = (h, a) => { const c = rgbOf(h); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(a)})`; };
const qa = a => `rgba(0,0,0,${clamp(a)})`;          // density

// ---------------------------------------------------------------- lines and washes
/**
 * Even-width 勾线 (a liner brush: the width barely changes). pts in canvas px. o.w width, o.a density,
 * o.closed, o.upto 0..1 (how much of it is drawn; a small bead sits on the wet tip), o.dot (entry dot, default true),
 * o.wob (px, slow hand shake, stable), o.jit (px, per-drawing boil, needs o.tk), o.seed.
 */
/** Chaikin corner cutting: round a polyline (closed or open), `it` iterations. */
function qhSmooth(pts, closed = false, it = 2) {
  let P = pts;
  for (let k = 0; k < it; k++) {
    const o = [], n = P.length;
    if (!closed) o.push(P[0]);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = P[i], b = P[(i + 1) % n];
      o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) o.push(P[n - 1]);
    P = o;
  }
  return P;
}
/** A capsule (finger, sleeve, ribbon piece) from a to b with radii ra, rb → closed polygon. */
function qhCapsule(a, b, ra, rb = ra, n = 10) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), o = [];
  for (let i = 0; i <= n; i++) { const t = ang + Math.PI / 2 + Math.PI * i / n; o.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]); }
  for (let i = 0; i <= n; i++) { const t = ang - Math.PI / 2 + Math.PI * i / n; o.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]); }
  return o;
}

function qhLine(c, pts, o = {}) {
  if (!pts || pts.length < 2) return;
  if (o.smooth) { pts = qhSmooth(pts, !!o.closed, o.smooth); if (o.closed) pts = pts.slice(); }
  const w = o.w ?? 3, a = o.a ?? 0.9, seed = o.seed || 1, wob = o.wob ?? 0.9, jit = o.jit ?? 0.7, tk = o.tk || 0;
  let P = o.closed ? pts.concat([pts[0]]) : pts;
  P = resamplePolyline(P, o.step || 5).pts;
  const n = P.length;
  if (n < 2) return;
  const Lt = polylineLength(P);
  // hand shake along the normal (depends on arc length only → stable), and a small boil per drawing
  let acc = 0;
  P = P.map((p, i) => {
    if (i) acc += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]);
    const q = P[Math.min(n - 1, i + 1)], r = P[Math.max(0, i - 1)];
    let dx = q[0] - r[0], dy = q[1] - r[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const s = wob * noise1(acc / 90, seed) + (jit ? jit * noise1(acc / 40 + tk * 7.3, seed + tk * 13) : 0);
    return [p[0] - dy * s, p[1] + dx * s];
  });
  if (o.closed && (o.upto ?? 1) >= 1) P[P.length - 1] = P[0];
  const u = o.upto ?? 1;
  if (u <= 0) return;
  const Q = u < 1 ? cutPolyline(P, u) : P;
  if (Q.length < 2) return;
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = qa(a); c.fillStyle = qa(a); c.lineWidth = w;
  c.beginPath(); c.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) c.lineTo(Q[i][0], Q[i][1]); c.stroke();
  if (o.dot !== false) { c.beginPath(); c.arc(Q[0][0], Q[0][1], w * (o.closed ? 0.62 : 0.8), 0, TAU); c.fill(); }
  if (u < 1) { const e = Q[Q.length - 1]; c.beginPath(); c.arc(e[0], e[1], w * 0.75, 0, TAU); c.fill(); }
  c.restore();
  if (c.qhClear) { const m = c.qhClear; m.save(); m.globalCompositeOperation = 'destination-out'; m.lineCap = 'round'; m.lineJoin = 'round'; m.strokeStyle = '#000'; m.lineWidth = w + 2; m.beginPath(); m.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) m.lineTo(Q[i][0], Q[i][1]); m.stroke(); m.restore(); }
  if (c.qhMask) { const m = c.qhMask; m.save(); m.lineCap = 'round'; m.lineJoin = 'round'; m.strokeStyle = '#000'; m.lineWidth = w + 3; m.beginPath(); m.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) m.lineTo(Q[i][0], Q[i][1]); m.stroke(); m.restore(); }
  return Lt;
}
function qhPath(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
/**
 * 分水: a flat tone of density a inside the closed polygon pts. With o.k < 1 the tone is still spreading
 * from a drop at o.from (default: the polygon's centroid) — a soft-edged blob clipped to the shape.
 * o.deep adds a slightly darker pool round the drop point (where the brush touched first).
 */
function qhFill(c, pts, a, o = {}) {
  const k = o.k ?? 1; if (k <= 0 || a <= 0) return;
  if (o.smooth) pts = qhSmooth(pts, true, o.smooth);
  if (c.qhClear && k >= 1) { const m = c.qhClear; m.save(); m.globalCompositeOperation = 'destination-out'; qhPath(m, pts); m.fillStyle = '#000'; m.fill(); m.restore(); }
  if (c.qhMask && k >= 1) { const m = c.qhMask; m.save(); qhPath(m, pts); m.fillStyle = '#000'; m.fill(); m.restore(); }
  c.save(); qhPath(c, pts);
  if (k >= 1 && !o.deep) { c.fillStyle = qa(a); c.fill(); c.restore(); return; }
  c.clip();
  let cx = 0, cy = 0; pts.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= pts.length; cy /= pts.length;
  const [fx, fy] = o.from || [cx, cy];
  let R = 1; pts.forEach(p => { R = Math.max(R, Math.hypot(p[0] - fx, p[1] - fy)); });
  R *= 1.08;
  if (k >= 1) { c.fillStyle = qa(a); c.fillRect(fx - R, fy - R, 2 * R, 2 * R); }
  else { pathSmooth(c, blobPts(fx, fy, Math.max(1, R * ease.outQuad(k)), o.seed || 5, 0.2, 40)); c.fillStyle = qa(a); c.fill(); }
  if (o.deep) {
    const gr = c.createRadialGradient(fx, fy, 0, fx, fy, R * 0.55 * Math.min(1, k * 1.5));
    gr.addColorStop(0, qa(o.deep)); gr.addColorStop(1, qa(0));
    c.fillStyle = gr; c.fillRect(fx - R, fy - R, 2 * R, 2 * R);
  }
  c.restore();
}

// ---------------------------------------------------------------- ornament shapes (point lists)
/** 海棠形 (quatrefoil with pointed cusps) centred at (cx, cy), w × h. */
function qhBegonia(cx, cy, w, h, n = 160) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i / n * TAU;
    // four lobes: radius dips to a cusp at the diagonals
    const lobe = Math.abs(Math.cos(2 * a));
    const r = 0.86 + 0.14 * Math.pow(lobe, 0.45);
    pts.push([cx + Math.cos(a) * w / 2 * r, cy + Math.sin(a) * h / 2 * r]);
  }
  return pts;
}
/** 如意云肩 lobe hanging from a flat top edge at `top`: scalloped sides, a ruyi-cloud tip at the bottom (closed pts). */
function qhRuyi(cx, top, w, h) {
  const arc = (a, b, bulge, n = 14) => {           // quadratic arc from a to b, bulging to the left of a→b by `bulge`
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return bez2(a, [mx - dy / d * bulge, my + dx / d * bulge], b, n).slice(1);
  };
  const hw = w / 2, P = (x, y) => [cx + x, top + y];
  // right half from the top-right corner down to the tip, then mirrored
  const r = [P(hw, 0)];
  r.push(...arc(P(hw, 0), P(hw * 0.62, h * 0.36), -h * 0.14));
  r.push(...arc(P(hw * 0.62, h * 0.36), P(hw * 0.3, h * 0.64), -h * 0.12));
  // ruyi tip: a round lobe each side and a small point
  r.push(...arc(P(hw * 0.3, h * 0.64), P(hw * 0.08, h * 0.9), -h * 0.13));
  r.push(...arc(P(hw * 0.08, h * 0.9), P(0, h), -h * 0.03, 6));
  const l = r.slice(0, -1).reverse().map(([x, y]) => [2 * cx - x, y]);
  return r.concat(l);
}
/** A 云纹 curl: a spiral from radius r inward, `turns` turns, dir ±1, starting at angle rot. */
function qhCurl(x, y, r, turns = 1.3, dir = 1, rot = 0, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = rot + dir * u * turns * TAU, rr = r * (1 - 0.82 * u);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return pts;
}
/**
 * A rising 一缕 of smoke from (x, y): a wavy line of length len drawn upward, curling at its head.
 * t = age (s): the head rises and the tail thins. Returns polylines (draw each with qhLine).
 */
function qhSmoke(x, y, len, t, seed = 1, o = {}) {
  const rise = o.rise ?? 60, amp = o.amp ?? 26, drift = o.drift ?? 0.25;
  const head = Math.min(len, t * rise), out = [];
  const main = [];
  for (let s = 0; s <= head; s += 6) {
    const k = s / Math.max(1, len);
    main.push([x + amp * (noise1(s / 110 - t * 0.35, seed) + drift * k * 3) * (0.3 + k), y - s]);
  }
  if (main.length > 1) {
    out.push(main);
    const e = main[main.length - 1], p = main[Math.max(0, main.length - 4)];
    const ang = Math.atan2(e[1] - p[1], e[0] - p[0]);
    const r = 12 + 10 * noise1(seed + 0.3, 3);
    const dir = hash(seed, 9) < 0.5 ? 1 : -1;
    out.push(qhCurl(e[0] + Math.cos(ang + dir * Math.PI / 2) * r, e[1] + Math.sin(ang + dir * Math.PI / 2) * r, r, 1.15, dir, ang - dir * Math.PI / 2));
  }
  return out;
}
/** 回纹 key band between x0..x1 around baseline y (height h): a continuous meander → one polyline. */
function qhHuiwen(x0, x1, y, h) {
  const u = h, pts = []; let x = x0;
  while (x < x1 - u) {
    pts.push([x, y + h / 2], [x, y - h / 2], [x + u * 0.8, y - h / 2], [x + u * 0.8, y + h * 0.2], [x + u * 0.35, y + h * 0.2], [x + u * 0.35, y - h * 0.08]);
    pts.push([x + u * 0.35, y + h / 2]);
    x += u * 1.15;
  }
  return [pts];
}
/** 海水: rows of overlapping scale arcs between y0 (top) and y1, phase shifts them; plus crest curls on the top row. */
function qhWaves(x0, x1, y0, y1, phase = 0, o = {}) {
  const rows = o.rows || 5, out = [], rh = (y1 - y0) / rows, aw = o.aw || rh * 2.2;
  for (let r = 0; r < rows; r++) {
    const y = y0 + (r + 0.5) * rh, off = (r % 2) * aw / 2 + phase * aw;
    for (let k = 0; k < 3; k++) {                  // three nested arcs per scale
      const pts = [];
      for (let x = x0 - aw + ((off % aw) + aw) % aw; x <= x1 + aw; x += 3) {
        const u = (((x - x0 - off) % aw) + aw) % aw / aw;
        pts.push([x, y - Math.sin(Math.PI * u) * rh * (0.55 - k * 0.16)]);
      }
      out.push(pts);
    }
  }
  return out;
}
/** A ruffled petal as a closed polyline: base near (cx, cy), tip r1 away along angle a, half-width w. */
function qhPetal(cx, cy, a, r0, r1, w, seed, o = {}) {
  const ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => [cx + ca * u - sa * v, cy + sa * u + ca * v];
  const bulge = o.bulge ?? 1.1, n = 16;
  const left = bez3(P(r0, 0), P(r0 + (r1 - r0) * 0.2, -w * bulge), P(r0 + (r1 - r0) * 0.85, -w * 1.0), P(r1, -w * 0.25), n);
  const right = bez3(P(r1, w * 0.25), P(r0 + (r1 - r0) * 0.85, w * 1.0), P(r0 + (r1 - r0) * 0.2, w * bulge), P(r0, 0), n);
  // the peony's ragged outer edge: a few notches across the tip
  const tip = [];
  for (let i = 1; i < 6; i++) { const v = -w * 0.25 + (w * 0.5) * i / 6, notch = (i % 2 ? -1 : 1) * w * 0.07; tip.push(P(r1 + w * 0.12 + notch, v)); }
  const pts = left.concat(tip, right);
  return pts.map((p, i) => {
    const s = i / (pts.length - 1), rf = w * 0.06 * Math.sin(s * Math.PI) * noise1(s * 11, seed);
    return [p[0] + rf * -sa, p[1] + rf * ca];
  });
}
/**
 * A peony head at (cx, cy), size s (1 ≈ 220 px across): three rings of ruffled petals round a heart.
 * o.line 0..1 petals outlined one after another, o.fill 0..1 分水 spreading from each petal's base,
 * o.tk boil, o.a density of the lines, o.heart = draw the heart dots. Returns the petal polygons.
 */
function qhPeony(L, cx, cy, s, o = {}) {
  const line = o.line ?? 1, fill = o.fill ?? 1, tk = o.tk || 0, a = o.a ?? 0.9, lw = (o.w ?? 3.2) * Math.max(0.6, Math.min(1.4, s));
  const petals = [];
  const ring = (n, r0, r1, w, a0, d, seed) => { for (let i = 0; i < n; i++) petals.push({ pts: qhPetal(cx, cy, a0 + i * TAU / n, r0 * s, r1 * s, w * s, seed + i), d, base: a0 + i * TAU / n }); };
  // front view, slightly squashed vertically: outer ring, middle, inner cup
  ring(7, 30, 112, 34, -Math.PI / 2 + 0.2, QH.D.dan, 11);
  ring(6, 22, 80, 28, -Math.PI / 2 + 0.55, QH.D.er, 31);
  ring(5, 10, 50, 20, -Math.PI / 2 + 0.1, QH.D.zheng * 0.92, 51);
  const N = petals.length;
  petals.forEach((pt, i) => {
    const P = pt.P = pt.pts.map(p => [p[0], cy + (p[1] - cy) * 0.86]);
    let lp = clamp(line * N * 1.08 - i), fp = clamp(fill * N * 0.8 - i * 0.8 + 0.5);
    if (o.P != null) { lp = clamp(o.P - i); fp = clamp((o.P - i - 0.35) * 1.2); }
    pt.lp = lp;
    if (fp > 0) qhFill(L.wet, P, pt.d, { k: fp, from: [cx + Math.cos(pt.base) * 18 * s, cy + Math.sin(pt.base) * 16 * s], seed: 60 + i, deep: pt.d + 0.12 });
    if (lp > 0) qhLine(L.dry, P, { w: lw, a, closed: true, upto: lp, tk, seed: 70 + i, jit: o.jit ?? 0.6 });
  });
  if (o.heart !== false && (o.P != null ? o.P >= N : line >= 0.95)) for (let k = 0; k < 7; k++) {
    const ang = k * 2.4, r = (k ? 9 + 4 * (k % 3) : 0) * s;
    L.dry.fillStyle = qa(0.97); L.dry.beginPath(); L.dry.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.86, (k ? 3.2 : 5.5) * Math.max(0.6, s), 0, TAU); L.dry.fill();
  }
  return petals;
}
/** A leaf: outline + midrib + 分水. */
function qhLeaf(L, x, y, a, len, o = {}) {
  const pts = qhPetal(x, y, a, 0, len, len * 0.26, 90 + (o.seed || 0), { bulge: 1.0 });
  const fk = o.fill ?? 1, lk = o.line ?? 1;
  if (fk > 0) qhFill(L.wet, pts, o.d ?? QH.D.er, { k: fk, from: [x, y], seed: o.seed || 3 });
  if (lk > 0) {
    qhLine(L.dry, pts, { w: o.w || 2.8, a: o.a ?? 0.88, closed: true, upto: lk, tk: o.tk, seed: 91 + (o.seed || 0) });
    qhLine(L.dry, [[x, y], [x + Math.cos(a) * len * 0.8, y + Math.sin(a) * len * 0.8]], { w: (o.w || 2.8) * 0.7, a: o.a ?? 0.85, upto: clamp(lk * 1.5 - 0.5), tk: o.tk, dot: false });
  }
  return pts;
}

// ---------------------------------------------------------------- stickers: figures that hide what is behind them
/** With c.qhClear = L.col set on L.wet / L.dry, washes and lines also clear the colour layer under them (a sky
 * painted first stays behind the figures). */
/** Pigment layers plus a silhouette mask: every full qhFill / qhLine drawn into L.wet / L.dry also lands in L.mask. */
function qhStickerLayers(w = W, h = H) {
  const L = pigmentLayers(w, h), m = mk(w, h);
  L.maskCanvas = m; L.mask = m.getContext('2d');
  const clear0 = L.clear;
  L.clear = () => { clear0(); L.mask.setTransform(1, 0, 0, 1, 0, 0); L.mask.clearRect(0, 0, w, h); L.wet.qhMask = L.dry.qhMask = L.mask; return L; };
  L.clear();
  return L;
}
let STK = null;
/** Composite a sticker layer set (preset/paper as pigmentDraw) and draw only inside its silhouette. */
function qhSticker(g, L, o = {}, x = 0, y = 0) {
  const c = pigmentComp(L, o);
  if (!STK || STK.width !== L.w || STK.height !== L.h) STK = mk(L.w, L.h);
  const s = STK.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.globalCompositeOperation = 'copy'; s.drawImage(c, 0, 0);
  s.globalCompositeOperation = 'destination-in'; s.drawImage(L.maskCanvas, 0, 0); s.globalCompositeOperation = 'source-over';
  g.drawImage(STK, x, y);
}
/** Knock a shape out of the density layers (a reserve: what is drawn later sits on clean ground); o.col also clears colour. */
function qhErase(L, pts, o = {}) {
  for (const c of (o.col ? [L.wet, L.dry, L.col] : [L.wet, L.dry])) { c.save(); qhPath(c, o.smooth ? qhSmooth(pts, true, o.smooth) : pts); c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.fill(); c.restore(); }
}

// ---------------------------------------------------------------- the cylinder (WebGL)
const CYL_VS = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0., 1.); }`;
const CYL_FS = `#version 300 es
precision highp float; out vec4 o;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uBox;          // cx, top, height (px), v0 (texture v at top — for cropping)
uniform float uR[97];       // radius / height at v = i/96
uniform float uRot, uGlaze, uV1, uSpec, uAmb, uFlip;
uniform vec3 uEnv, uLight;
float R(float v) { float x = clamp(v, 0., 1.) * 96.; int i = int(floor(x)); int j = min(i + 1, 96); return mix(uR[i], uR[j], x - float(i)); }
void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float v = (fc.y - uBox.y) / uBox.z;
  if (uFlip > .5) v = 1. - v;
  if (v < 0. || v > 1.) { o = vec4(0.); return; }
  float r = R(v) * uBox.z, dx = fc.x - uBox.x;
  float edge = r - abs(dx);
  if (edge < -1.) { o = vec4(0.); return; }
  float s = clamp(dx / max(r, 1e-3), -1., 1.), th = asin(s), c = sqrt(max(0., 1. - s * s));
  float dr = (R(v + .004) - R(v - .004)) / .008;                  // dr/dv (v downward); sign flips if upside down
  if (uFlip > .5) dr = -dr;
  vec3 n = normalize(vec3(s, -dr, c));
  float u = fract((th + uRot) / 6.28318530718);
  float tv = mix(uBox.w, uV1, v);
  vec3 tex = texture(uTex, vec2(u, tv)).rgb;
  vec3 L = normalize(uLight);
  float dif = max(dot(n, L), 0.);
  vec3 col = tex * (uAmb + (1. - uAmb) * dif);
  // glaze: environment tint at grazing angles, a soft vertical highlight fixed to the camera, a broad sheen
  float fr = pow(1. - max(n.z, 0.), 3.);
  col = mix(col, uEnv, uGlaze * fr * .35);
  float streak = exp(-pow((s + .42) / .085, 2.)) * (.55 + .45 * (1. - min(1., abs(dr) * .8)));
  float sheen = pow(max(dot(n, normalize(L + vec3(0, 0, 1))), 0.), 24.);
  col += uGlaze * uSpec * (streak * .42 + sheen * .12);
  // matte clay: a touch of limb darkening
  col *= mix(1., .93 + .07 * c, 1. - uGlaze);
  o = vec4(clamp(col, 0., 1.), clamp(edge + .5, 0., 1.));
}`;
let CYL = null;
function cylInit() {
  if (CYL) return CYL;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  if (!gl) throw new Error('qinghua.js qhCylinder needs WebGL2');
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('qhCylinder: ' + gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, CYL_VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, CYL_FS));
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('qhCylinder: ' + gl.getProgramInfoLog(p));
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
  const tex = gl.createTexture();
  CYL = { c, gl, p, u, tex, src: null };
  return CYL;
}
/**
 * Draw the texture `tex` (a canvas: x = angle all the way round, y = height top→bottom) onto a surface of
 * revolution. o.prof: 97 radii (as a fraction of the height) from top to bottom. o.cx, o.top, o.h: where it
 * sits (px). o.rot: turn (radians; the texture's x = 0 faces us at rot 0 … increasing rot brings larger u to the front).
 * o.glaze 0 matte biscuit … 1 glossy glaze; o.env glaze reflection colour; o.v0/o.v1 texture rows used; o.flip
 * upside down (the base facing the camera top). o.fresh: re-upload the texture (it changed this frame).
 * Returns a W×H canvas with alpha (draw it right away: the next call reuses it).
 */
function qhCylinder(tex, o = {}) {
  const C = cylInit(), gl = C.gl, u = C.u;
  if (C.c.width !== W || C.c.height !== H) { C.c.width = W; C.c.height = H; }
  gl.viewport(0, 0, W, H); gl.useProgram(C.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, C.tex);
  if (C.src !== tex || o.fresh) {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    C.src = tex;
  }
  gl.uniform1i(u.uTex, 0);
  gl.uniform2f(u.uRes, W, H);
  gl.uniform4f(u.uBox, o.cx ?? W / 2, o.top ?? 100, o.h ?? 800, o.v0 ?? 0);
  gl.uniform1f(u.uV1, o.v1 ?? 1);
  gl.uniform1fv(u.uR, o.prof);
  gl.uniform1f(u.uRot, o.rot || 0);
  gl.uniform1f(u.uGlaze, o.glaze ?? 0);
  gl.uniform1f(u.uSpec, o.spec ?? 1);
  gl.uniform1f(u.uAmb, o.amb ?? 0.74);
  gl.uniform1f(u.uFlip, o.flip ? 1 : 0);
  gl.uniform3fv(u.uEnv, rgbOf(o.env || QH.ying).map(v => v / 255));
  gl.uniform3fv(u.uLight, o.light || [-0.55, -0.45, 0.75]);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return C.c;
}

// ---------------------------------------------------------------- lyrics
/** Split a line into columns of at most maxRows characters (evenly). */
function qhColumns(line, maxRows) {
  const toks = line.words.map(w => ({ text: w.w, start: w.start, end: w.end }));
  const n = toks.length, nc = Math.max(1, Math.ceil(n / maxRows)), per = Math.ceil(n / nc), cols = [];
  for (let i = 0; i < n; i += per) cols.push(toks.slice(i, i + per));
  return cols;
}
let QCH = null;
/**
 * One character firing in: a faint presage (lead ≤ 0.4 s), then from the moment it is sung the colour runs down it
 * in 0.12 s; fired characters get a pale cobalt 晕散 halo that grows in 0.3 s and stays.
 */
function qhChar(g, text, x, y, size, age, lead, fade, st) {
  if (fade <= 0.002) return;
  const REV = 0.12, font = `${size}px ${QH.FONT}`;
  const ghost = st.ghost * smoothstep(-lead, 0, age) * fade;
  const rev = age <= 0 ? 0 : clamp(age / REV);
  g.save(); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (ghost > 0.003 && rev < 1) { g.fillStyle = rgba(st.pre, ghost); g.fillText(text, x, y); }
  if (st.halo && age > 0) {
    const hk = smoothstep(0, 0.3, age);
    g.filter = `blur(${(size * (0.05 + 0.05 * hk)).toFixed(1)}px)`;
    g.fillStyle = rgba(st.halo, 0.75 * hk * fade); g.fillText(text, x, y); g.fillText(text, x, y);
    g.filter = 'none';
  }
  if (rev >= 1) { g.fillStyle = rgba(st.col, fade); g.fillText(text, x, y); }
  else if (rev > 0) {
    const w = Math.ceil(size * 1.5), h = Math.ceil(size * 1.6);
    if (!QCH || QCH.width < w || QCH.height < h) QCH = mk(Math.max(w, QCH ? QCH.width : 0), Math.max(h, QCH ? QCH.height : 0));
    const c = QCH.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, QCH.width, QCH.height);
    c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = st.col; c.fillText(text, w / 2, h / 2);
    const fe = size * 0.35, a0 = h / 2 - size * 0.55, edge = lerp(a0, a0 + size * 1.1 + fe, rev);
    const gr = c.createLinearGradient(0, edge - fe, 0, edge); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = gr; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
    g.globalAlpha = fade; g.drawImage(QCH, 0, 0, w, h, x - w / 2, y - h / 2, w, h);
  }
  g.restore();
}
/** One line as vertical columns: first column at x (right), going left; y = top. Returns its box. */
function qhColumn(g, line, t, x, y, o = {}) {
  const size = o.size || 64, gap = size * 1.16, colGap = size * 1.5, lead = o.lead ?? 0.4, fade = o.fade ?? 1;
  const maxRows = o.maxRows || Math.max(3, Math.floor((H - 96 - y - size * 0.2) / gap));
  const cols = qhColumns(line, maxRows);
  const st = o.style;
  let maxH = 0;
  cols.forEach((col, c) => {
    const cx = x - c * colGap; let cy = y + size / 2;
    for (const tk of col) { qhChar(g, tk.text, cx, cy, size, t - tk.start, lead, fade, st); cy += gap; }
    maxH = Math.max(maxH, cy - y - (gap - size));
  });
  const wBox = (cols.length - 1) * colGap + size * 1.3;
  return { x: x - wBox + size * 0.65, y: y - size * 0.3, w: wBox, h: maxH + size * 0.6 };
}
/** The palette a character is drawn in: unfired grey, fired cobalt, or pale on dark water. */
function qhStyle(o) {
  if (o.dark) return { col: QH.glaze, pre: QH.dan, halo: QH.dan, ghost: 0.55 };
  if (o.fired) return { col: QH.zheng, pre: QH.ying, halo: QH.ying, ghost: 0.7 };
  return { col: QH.rawN, pre: QH.rawD, halo: null, ghost: 0.6 };
}
/**
 * The lyric line being sung at f.t (and the previous one drying away), vertical, right to left, at (x, y).
 * o.lines restrict to these line indices; o.place(line) → [x, y] per line; o.fired / o.dark palette (or
 * o.styleOf(line) → {fired, dark}); o.size; o.hold (s a finished line lingers); o.fade multiplies.
 */
function qhLyrics(g, f, x, y, o = {}) {
  const L = f.lyrics.lines.filter(l => l.words.length && (!o.lines || o.lines.includes(l.i))), lead = o.lead ?? 0.4, t = f.t, hold = o.hold ?? 1.2;
  let cur = -1; for (let i = 0; i < L.length; i++) if (L[i].words[0].start - lead - 0.3 <= t) cur = i;
  if (cur < 0) return null;
  let box = null, prevVis = 0;
  for (let i = Math.max(0, cur - 1); i <= cur; i++) {
    const l = L[i], next = L[i + 1];
    let fade = 1;
    if (next) {
      const ns = next.words[0].start, lastS = l.words[l.words.length - 1].start;
      const f0 = Math.max(ns - lead - 0.25, Math.min(ns - 0.3, lastS + 0.35));
      fade = 1 - clamp((t - f0) / 0.3);
    }
    fade *= 1 - clamp((t - (l.end + hold)) / 0.8);
    if (o.fade != null) fade *= o.fade;
    if (i === cur - 1) prevVis = Math.max(0, fade);
    if (fade <= 0) continue;
    const [lx, ly] = (o.place && o.place(l)) || [x, y];
    const sty = qhStyle(o.styleOf ? o.styleOf(l) : o);
    sty.ghost *= i === cur ? 1 - prevVis : 1;
    const b = qhColumn(g, l, t, lx, ly, { ...o, fade, style: sty });
    if (i === cur) box = b;
  }
  return box;
}

MV.qinghua = { QH, rgba, qa, qhSmooth, qhCapsule, qhStickerLayers, qhSticker, qhErase, qhLine, qhPath, qhFill, qhBegonia, qhRuyi, qhCurl, qhSmoke, qhHuiwen, qhWaves, qhPetal, qhPeony, qhLeaf, qhCylinder, qhColumns, qhChar, qhColumn, qhStyle, qhLyrics };
Object.assign(G, MV.qinghua);
})(window);
