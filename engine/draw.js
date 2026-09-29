// mv-kit — drawing helpers shared by every style: paths, curves, brush strokes, generic karaoke layout.
(function (G) {
'use strict';
const MV = G.MV;

function pathPoly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
/** Closed smooth path through the midpoints of pts (quadratic B-spline look). */
function pathSmooth(g, pts) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  g.beginPath(); const m = mid(pts[n - 1], pts[0]); g.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], mm = mid(p, q); g.quadraticCurveTo(p[0], p[1], mm[0], mm[1]); }
  g.closePath();
}
/** Sample a quadratic / cubic Bézier into n+1 points. */
function bez2(p0, p1, p2, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const s = i / n, u = 1 - s; o.push([u * u * p0[0] + 2 * u * s * p1[0] + s * s * p2[0], u * u * p0[1] + 2 * u * s * p1[1] + s * s * p2[1]]); } return o; }
function bez3(p0, p1, p2, p3, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const s = i / n, u = 1 - s; o.push([u * u * u * p0[0] + 3 * u * u * s * p1[0] + 3 * u * s * s * p2[0] + s * s * s * p3[0], u * u * u * p0[1] + 3 * u * u * s * p1[1] + 3 * u * s * s * p2[1] + s * s * s * p3[1]]); } return o; }
function polylineLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }

/** Pen-pressure profiles for brush(): width multiplier along the stroke, s = 0..1. */
const TAPER = {
  both: s => Math.pow(Math.sin(Math.PI * s), 0.6),
  tail: s => Math.pow(1 - s, 0.75),
  head: s => Math.pow(s, 0.75),
  flat: () => 1,
  lash: s => (s < 0.7 ? 0.15 + 0.85 * Math.sin(s / 0.7 * Math.PI / 2) : 1 - 0.55 * (s - 0.7) / 0.3),
};
/** A brush stroke as a polygon: the polyline offset by ±width/2 along its normals. */
function brushPoly(pts, w, taper) {
  const f = typeof taper === 'function' ? taper : TAPER[taper || 'both'];
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = w * f(i / (n - 1)) / 2;
    L.push([p[0] - dy * hw, p[1] + dx * hw]); R.push([p[0] + dy * hw, p[1] - dx * hw]);
  }
  return L.concat(R.reverse());
}
function brush(g, pts, w, fill, taper, outline, lw) {
  pathPoly(g, brushPoly(pts, w, taper));
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (outline) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = outline; g.stroke(); }
}
function fillStroke(g, fill, outline, lw) {
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (outline) { g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = outline; g.stroke(); }
}
/** Per-drawing jitter ("line boil"): J(x, y, id, amp) moves a point by a hash of (tick, id). */
function boiler(tk, amp = 1) { return (x, y, i, a = amp) => [x + (hash(tk, i, 1) - 0.5) * 2 * a, y + (hash(tk, i, 2) - 0.5) * 2 * a]; }

/**
 * Generic karaoke row: lays tokens out left to right and calls draw(g, tok, x, y, st) for each token
 * that has started (or all, with opts.showUnsung). st = { sung: 0..1 progress, active, age, i, w }.
 * Tokens: [{text, start, end, join}] (join = no space after). Returns the row width.
 */
function karaoke(g, toks, t, x, y, opts = {}) {
  g.save(); g.font = opts.font || `900 64px sans-serif`; g.textBaseline = 'alphabetic';
  const sp = opts.space ?? g.measureText(' ').width; let cx = x;
  const draw = opts.draw || ((g, tk, x, y, st) => { g.fillStyle = st.sung > 0 ? '#fff' : 'rgba(255,255,255,0.35)'; g.fillText(tk.text, x, y); });
  toks.forEach((tk, i) => {
    const w = g.measureText(tk.text).width;
    if (opts.showUnsung || t >= tk.start - (opts.lead || 0)) {
      g.save(); draw(g, tk, cx, y, { sung: clamp((t - tk.start) / Math.max(1e-3, tk.end - tk.start)), active: t >= tk.start && t < tk.end, age: t - tk.start, i, w }); g.restore();
    }
    cx += w + (tk.join ? 0 : sp);
  });
  g.restore();
  return cx - x;
}

MV.draw = { pathPoly, pathSmooth, bez2, bez3, polylineLength, TAPER, brushPoly, brush, fillStroke, boiler, karaoke };
Object.assign(G, MV.draw);
})(window);
