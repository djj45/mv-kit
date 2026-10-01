// 青花瓷 — the reign mark 「烟雨年製」 in 隶书 (clerical script), as brush strokes in a unit box per character
// (x 0..1, y 0..1; clerical characters are wide and flat — the box is drawn 1.25 : 1). Kinds:
//   h  horizontal · v vertical · pie 撇 (falling left, thinning) · na 捺 (falling right, thickening)
//   yan 蚕头燕尾 (the one long horizontal: a round "silkworm head", a lifted, flaring "swallow tail") · dot
// Written in the order listed; qhcMark() draws a character up to k (0..1 of its strokes by length).
const QMARK = {
  烟: [
    ['dot', [[0.08, 0.24], [0.13, 0.38]]], ['dot', [[0.33, 0.2], [0.28, 0.34]]],
    ['pie', [[0.2, 0.08], [0.21, 0.46], [0.14, 0.66], [0.03, 0.84]]], ['na', [[0.21, 0.5], [0.28, 0.66], [0.38, 0.82]]],
    ['v', [[0.46, 0.08], [0.46, 0.9]]], ['h', [[0.46, 0.08], [0.95, 0.08], [0.95, 0.9]]],
    ['h', [[0.54, 0.38], [0.87, 0.38]]], ['pie', [[0.71, 0.16], [0.71, 0.42], [0.62, 0.62], [0.53, 0.74]]], ['na', [[0.72, 0.46], [0.8, 0.6], [0.9, 0.72]]],
    ['h', [[0.46, 0.88], [0.95, 0.88]]],
  ],
  雨: [
    ['h', [[0.14, 0.08], [0.86, 0.08]]],
    ['v', [[0.12, 0.3], [0.12, 0.92]]], ['h', [[0.12, 0.3], [0.88, 0.3], [0.88, 0.86], [0.8, 0.92]]],
    ['v', [[0.5, 0.1], [0.5, 0.86]]],
    ['dot', [[0.24, 0.44], [0.33, 0.52]]], ['dot', [[0.26, 0.64], [0.35, 0.72]]],
    ['dot', [[0.64, 0.44], [0.73, 0.52]]], ['dot', [[0.66, 0.64], [0.75, 0.72]]],
  ],
  年: [
    ['pie', [[0.36, 0.02], [0.3, 0.14], [0.18, 0.26]]], ['h', [[0.26, 0.18], [0.84, 0.18]]],
    ['h', [[0.3, 0.4], [0.78, 0.4]]], ['v', [[0.3, 0.4], [0.3, 0.62]]], ['h', [[0.3, 0.6], [0.52, 0.6]]],
    ['yan', [[0.04, 0.76], [0.96, 0.76]]], ['v', [[0.55, 0.18], [0.55, 0.98]]],
  ],
  製: [
    ['pie', [[0.2, 0.0], [0.12, 0.1]]], ['h', [[0.1, 0.09], [0.46, 0.09]]], ['h', [[0.06, 0.2], [0.5, 0.2]]],
    ['v', [[0.28, 0.0], [0.28, 0.44]]], ['v', [[0.14, 0.28], [0.14, 0.42]]], ['h', [[0.14, 0.28], [0.42, 0.28], [0.42, 0.42]]],
    ['v', [[0.62, 0.06], [0.62, 0.34]]], ['v', [[0.82, 0.0], [0.82, 0.44], [0.76, 0.42]]],
    ['dot', [[0.48, 0.46], [0.53, 0.52]]], ['yan', [[0.06, 0.57], [0.94, 0.57]]],
    ['pie', [[0.48, 0.58], [0.34, 0.72], [0.12, 0.92]]], ['v', [[0.42, 0.68], [0.42, 0.98]]],
    ['na', [[0.5, 0.66], [0.7, 0.82], [0.94, 0.96]]], ['pie', [[0.8, 0.6], [0.66, 0.72]]],
  ],
};
/** One stroke as a filled brush shape (kind, unit points → canvas via T, width w px, up to u). */
function qhcMarkStroke(c, kind, P, w, u, a = 0.95) {
  if (u <= 0) return;
  let pts = resamplePolyline(P, 3).pts; if (u < 1) pts = cutPolyline(pts, u);
  if (pts.length < 2) return;
  const n = pts.length, full = resamplePolyline(P, 3).pts.length;
  const prof = {
    h: s => 0.9 + 0.2 * Math.sin(Math.PI * s),
    v: s => 0.95 + 0.1 * Math.sin(Math.PI * s),
    pie: s => 1.1 - 0.75 * s,
    na: s => 0.6 + 0.9 * Math.pow(s, 1.4),
    dot: s => 0.8 + 0.7 * Math.sin(Math.PI * Math.min(1, s * 1.2)),
    yan: s => (s < 0.12 ? 1.4 - s * 3 : s > 0.72 ? 1 + 1.4 * Math.pow((s - 0.72) / 0.28, 1.5) : 1),
  }[kind];
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(n - 1, i + 1)], r = pts[Math.max(0, i - 1)];
    let dx = q[0] - r[0], dy = q[1] - r[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const s = i / Math.max(1, full - 1), hw = w * prof(s) / 2;
    let lift = kind === 'yan' && s > 0.72 ? -w * 0.9 * Math.pow((s - 0.72) / 0.28, 2) : 0;
    L.push([p[0] - dy * hw, p[1] + dx * hw + lift]); R.push([p[0] + dy * hw, p[1] - dx * hw + lift]);
  }
  c.save(); c.fillStyle = qa(a); qhPath(c, L.concat(R.reverse())); c.fill();
  // the round head where the brush went down (蚕头 on the long stroke)
  c.beginPath(); c.arc(pts[0][0], pts[0][1], w * (kind === 'yan' ? 0.78 : 0.52), 0, TAU); c.fill();
  c.restore();
}
/** Draw character ch in the box (x, y, w, h) into context c, up to k (0..1). Returns the pen position. */
function qhcMark(c, ch, x, y, w, h, k = 1, o = {}) {
  const S = QMARK[ch], T = P => P.map(([u, v]) => [x + u * w, y + v * h]);
  const lens = S.map(([, P]) => polylineLength(T(P)) + 40), tot = lens.reduce((a, b) => a + b, 0);
  let acc = 0, pen = null;
  S.forEach(([kind, P], i) => {
    const u = clamp((k * tot - acc) / lens[i]); acc += lens[i];
    if (u > 0) { qhcMarkStroke(c, kind, T(P), o.w || w * 0.075, u, o.a ?? 0.95); if (u < 1 || (!pen && i === S.length - 1)) { const q = cutPolyline(T(P), u); pen = q[q.length - 1]; } }
    else if (!pen) pen = T(P)[0];
  });
  return pen;
}
