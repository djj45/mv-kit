// 雨爱 — her profile, close (shot 6). Facing right, eyes lowered, long hair tucked behind the ear.
// Coordinates u, v in face units (F px): v = 0 at the top of the head, the chin at ≈ 0.71.

const YCU = {
  F: 700, X0: 180, Y0: 90,
  front: [[0.60, 0.10], [0.665, 0.15], [0.70, 0.22], [0.715, 0.29], [0.722, 0.325], [0.712, 0.365], [0.73, 0.40], [0.765, 0.46], [0.79, 0.505], [0.785, 0.52],
    [0.765, 0.535], [0.745, 0.54], [0.752, 0.565], [0.758, 0.578], [0.745, 0.592], [0.752, 0.605], [0.745, 0.62], [0.728, 0.638], [0.735, 0.665], [0.73, 0.69],
    [0.71, 0.71], [0.67, 0.725], [0.625, 0.735]],
  neck: [[0.625, 0.735], [0.622, 0.85], [0.616, 1.0]],
  jaw: [[0.665, 0.726], [0.58, 0.70], [0.505, 0.655], [0.478, 0.59]],
  ear: [[0.445, 0.44], [0.478, 0.452], [0.492, 0.51], [0.478, 0.568], [0.455, 0.577]],
  brow: [[0.62, 0.333], [0.66, 0.323], [0.705, 0.325]],
  lid: [[0.636, 0.389], [0.665, 0.399], [0.693, 0.393]],
  hairOut: [[0.60, 0.10], [0.55, 0.035], [0.45, 0.0], [0.33, 0.01], [0.22, 0.07], [0.13, 0.18], [0.09, 0.33], [0.085, 0.5], [0.1, 0.72], [0.13, 0.95], [0.16, 1.2], [0.19, 1.5]],
  hairIn: [[0.60, 0.10], [0.55, 0.15], [0.50, 0.24], [0.46, 0.34], [0.43, 0.42], [0.415, 0.5], [0.42, 0.6], [0.41, 0.72], [0.39, 0.9], [0.37, 1.15], [0.36, 1.5]],
  body: [[0.40, 0.93], [0.60, 0.975], [0.616, 1.0], [0.64, 1.06], [0.69, 1.13], [0.74, 1.22], [0.78, 1.5], [0.0, 1.5], [0.05, 1.1], [0.2, 1.0]],
  heart: [0.60, 1.21],
  tear: [[0.672, 0.405], [0.69, 0.46], [0.683, 0.53], [0.662, 0.6]],
};

/** o: bow 0..1, tear {t0 (appears), t1 (absorbed)}, heart t (starts), heartFade 0..1 */
function ycuHer(g, t, o = {}) {
  const A = INK.A, { F, X0, Y0 } = YCU, tk = tick(t), bow = o.bow || 0;
  // head tips forward a little around the neck
  const cx = 0.6, cy = 0.95, rot = 0.035 * bow;
  const P = (u, v, i = 0) => {
    let du = u - cx, dv = v - cy; const r = v < 0.95 ? rot : 0;
    const uu = cx + du * Math.cos(r) - dv * Math.sin(r), vv = cy + du * Math.sin(r) + dv * Math.cos(r);
    return [X0 + (uu + (hash(tk, i, 71) - 0.5) * 0.0022) * F, Y0 + (vv + (hash(tk, i, 72) - 0.5) * 0.0022) * F];
  };
  const S = (pts, b = 0, per = 7) => spline(pts.map((p, i) => P(p[0], p[1], b + i)), per);
  const poly = (pts, c = g) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
  const st = (pts, b, w, extra) => inkStroke(g, S(pts, b), w, { alpha: A.nong, dry: 0.25, wet: 0.7, seed: 1600 + b, ...extra });
  // paper under skin, neck and clothes
  const skin = YCU.front.concat(YCU.neck.slice(1), [[0.40, 0.95]], YCU.hairIn.slice(0, 9).reverse());
  poly(S(skin, 0, 3)); g.fillStyle = INK.paper; g.fill();
  const bodyPts = S(YCU.body, 40, 4); poly(bodyPts); g.fillStyle = INK.paper; g.fill();
  // hair: soft wet mass + dry strands sweeping back and down
  const hairPoly = YCU.hairOut.concat(YCU.hairIn.slice().reverse());
  inkSoft(g, s => { poly(S(hairPoly, 80, 4), s); s.fillStyle = ink(A.nong * 0.9); s.fill(); }, { scale: 0.5, grain: 0.35 });
  g.save(); poly(S(hairPoly, 80, 4)); g.clip();
  for (let i = 0; i < 8; i++) inkStrokePaper(g, S([[0.56 - i * 0.05, 0.06 + i * 0.012], [0.4 - i * 0.035, 0.18 + i * 0.03], [0.26 - i * 0.02, 0.5 + i * 0.05], [0.22 - i * 0.01, 1.0 + i * 0.05]], 120 + i * 5), 6 + 4 * hash(i, 2), 0.3, 1650 + i);
  g.restore();
  for (let i = 0; i < 14; i++) {
    const k = i / 13;
    st([[0.59 - k * 0.1, 0.1 + k * 0.02], [lerp(0.5, 0.2, k), lerp(0.2, 0.12, k)], [lerp(0.44, 0.1, k), lerp(0.46, 0.4, k)], [lerp(0.4, 0.12, k), lerp(0.9, 0.95, k)], [lerp(0.37, 0.17, k), 1.45]], 160 + i * 6, 2 + 1.5 * hash(i, 3),
      { alpha: A.jiao * (0.5 + 0.4 * hash(i, 4)), dry: 0.6, taper: BRUSH.both, wet: 0.15 });
  }
  st([[0.585, 0.105], [0.6, 0.2], [0.585, 0.28]], 260, 1.6, { taper: BRUSH.hair, alpha: A.nong * 0.8, dry: 0.4 });        // a loose strand at the temple
  // the face
  st(YCU.front, 300, 5.5, { taper: s => 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, s * 1.05)), dry: 0.2 });
  st(YCU.neck, 330, 4, { taper: BRUSH.both });
  st(YCU.jaw, 340, 2.6, { taper: BRUSH.both, alpha: A.zhong });
  poly(S(YCU.ear, 350)); g.fillStyle = INK.paper; g.fill();
  st(YCU.ear, 350, 3, { taper: BRUSH.both });
  st([[0.462, 0.47], [0.475, 0.51], [0.466, 0.545]], 356, 1.8, { taper: BRUSH.both, alpha: A.dan });
  st(YCU.brow, 360, 3.2, { taper: BRUSH.both, alpha: A.zhong });
  st(YCU.lid, 364, 3.4, { taper: BRUSH.both, alpha: A.jiao });
  for (let i = 0; i < 5; i++) { const u = 0.645 + i * 0.011, v = 0.395 + 0.004 * Math.sin(i); st([[u, v], [u + 0.006, v + 0.018]], 370 + i * 2, 1.6, { taper: BRUSH.tail, alpha: A.jiao }); }
  st([[0.752, 0.512], [0.762, 0.522], [0.755, 0.529]], 382, 2, { taper: BRUSH.both, alpha: A.zhong });
  st([[0.745, 0.592], [0.728, 0.595]], 386, 2.2, { taper: BRUSH.both });
  // clothes: round neckline, the edge of the cardigan, the line of the chest
  st([[0.39, 0.945], [0.5, 0.985], [0.6, 0.98]], 390, 3.2, { taper: BRUSH.both });
  st([[0.616, 1.0], [0.64, 1.06], [0.69, 1.13], [0.74, 1.22], [0.78, 1.5]], 395, 4.5);
  st([[0.5, 0.99], [0.53, 1.15], [0.55, 1.5]], 402, 3, { taper: BRUSH.both, alpha: A.zhong });
  // the tear: forms on the lower lid, runs down the cheek, sinks in
  if (o.tear && t > o.tear.t0) {
    const T = o.tear, grow = prog(t, T.t0, T.t0 + 0.35, ease.outQuad), run = prog(t, T.t0 + 0.35, T.t1, ease.inQuad), gone = prog(t, T.t1, T.t1 + 0.35);
    const path = S(YCU.tear, 420, 10), p = cutPolyline(path, Math.max(0.001, run)).pop();
    if (run > 0) inkStroke(g, cutPolyline(path, run), 2.2, { alpha: A.dan * 0.8 * (1 - gone), dry: 0.2, seed: 1680, taper: BRUSH.head, wet: 0.8 });
    const r = 7.5 * grow * (1 - 0.4 * run) * (1 - gone);
    if (r > 0.3) {
      g.fillStyle = ink(A.jiao * (1 - gone)); g.beginPath(); g.ellipse(p[0], p[1], r * 0.8, r * (1 + 0.5 * run), 0, 0, TAU); g.fill();
      g.fillStyle = `rgba(245,240,228,${0.8 * (1 - gone)})`; g.beginPath(); g.arc(p[0] - r * 0.25, p[1] - r * 0.3, r * 0.22, 0, TAU); g.fill();
    }
  }
  return { bodyPts, heart: P(YCU.heart[0], YCU.heart[1], 500) };
}

/** The ink that spreads inside her chest — only within her outline. */
function ycuHeart(g, t, geo, t0, fade = 0) {
  const age = t - t0; if (age <= 0 || fade >= 1) return;
  const [x, y] = geo.heart, A = INK.A;
  g.save(); g.beginPath(); geo.bodyPts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip();
  g.globalAlpha = 1 - fade;
  inkBloom(g, x - 20, y + 30, age - 0.25, { r: 340, alpha: A.dan * 0.9, seed: 6, k: 0.7 });
  inkBloom(g, x, y, age, { r: 210, alpha: A.jiao, seed: 3, k: 1.1 });
  inkBloom(g, x + 25, y - 15, age - 0.1, { r: 90, alpha: A.jiao, seed: 9, k: 2.0, dilute: false });
  g.restore();
}
