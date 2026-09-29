// 雨爱 — the two of them, full length, seen from the side (for the scroll shots).
// Units: U = head height in px; feet at (o.x, o.y); u across (negative = the way they face), v up is negative.
// o.dir = 1 faces left (the scroll's her-direction), −1 faces right. Line boil on twos.

function yfigMap(o, t, salt) {
  const U = o.U, dir = o.dir ?? 1, tk = tick(t);
  const P = (u, v, i = 0) => [o.x + (u + (hash(tk, i, salt) - 0.5) * 0.014) * U * dir, o.y + (v + (hash(tk, i, salt + 1) - 0.5) * 0.014) * U];
  const S = (pts, b = 0, per = 6) => spline(pts.map((p, i) => P(p[0], p[1], b + i)), per);
  return { P, S };
}
function yfigFill(g, pts, style) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = style; g.fill(); }

/**
 * Her, walking (or standing, walk = 0). o: x, y, U, dir, phase (walk cycle, radians), walk 0..1, alpha 0..1.
 * Long hair gathered low, cardigan to the hip, long A-line skirt; the skirt and the hair lag the step.
 */
function yfigHer(g, t, o) {
  const A = INK.A, a = o.alpha ?? 1, ph = o.phase || 0, wk = o.walk ?? 0;
  const bob = -0.06 * wk * Math.abs(Math.sin(ph)), sw = 0.1 * wk * Math.sin(ph - 0.5), arm = 0.2 * wk * Math.sin(ph + Math.PI), lag = 0.07 * wk * Math.sin(ph - 1.1);
  const { P, S } = yfigMap({ ...o, y: o.y + bob * o.U }, t, 41);
  const st = (pts, b, w, extra) => inkStroke(g, S(pts, b), w * o.U, { alpha: A.nong * a, dry: 0.3, wet: 0.65, seed: 1200 + b, ...extra });
  // paper silhouette (head, body, skirt)
  const body = [[-0.14, -5.72], [-0.3, -5.5], [-0.36, -5.0], [-0.3, -4.4], [-0.34, -3.7], [-0.47, -2.5], [-0.62 + sw * 0.6, -1.2], [-0.72 + sw, -0.35],
    [0.68 + sw, -0.3], [0.6 + sw * 0.6, -1.2], [0.47, -2.4], [0.36, -3.66], [0.24, -4.3], [0.3, -4.9], [0.32, -5.5], [0.12, -5.72]];
  const head = [[-0.28, -6.9], [-0.36, -6.62], [-0.44, -6.42], [-0.38, -6.28], [-0.32, -6.1], [-0.12, -6.02], [0.12, -5.9], [0.3, -6.2], [0.4, -6.5], [0.3, -6.9], [0.05, -7.02]];
  g.save(); g.globalAlpha = a;
  yfigFill(g, S(body, 0), INK.paper); yfigFill(g, S(head, 30), INK.paper);
  g.restore();
  // skirt, cardigan
  st([[-0.33, -3.7], [-0.47, -2.5], [-0.62 + sw * 0.6, -1.2], [-0.72 + sw, -0.35]], 60, 0.11);
  st([[0.35, -3.66], [0.47, -2.4], [0.6 + sw * 0.6, -1.2], [0.68 + sw, -0.3]], 64, 0.11);
  st([[-0.72 + sw, -0.35], [-0.25 + sw, -0.27 + 0.04 * Math.sin(ph)], [0.25 + sw, -0.33], [0.68 + sw, -0.3]], 68, 0.07, { taper: BRUSH.both });
  st([[-0.05, -3.6], [-0.1 + sw * 0.5, -2.0], [-0.16 + sw, -0.45]], 72, 0.05, { alpha: A.dan * a, taper: BRUSH.both });
  st([[0.14, -3.55], [0.2 + sw * 0.5, -1.8], [0.26 + sw, -0.4]], 76, 0.05, { alpha: A.dan * a, taper: BRUSH.both });
  st([[-0.14, -5.72], [-0.3, -5.5], [-0.36, -5.0], [-0.3, -4.4], [-0.34, -3.7]], 80, 0.09);
  st([[0.12, -5.72], [0.32, -5.5], [0.3, -4.9], [0.24, -4.3], [0.36, -3.66]], 86, 0.09);
  st([[-0.34, -3.7], [0, -3.61], [0.36, -3.66]], 92, 0.06, { taper: BRUSH.both });
  // near arm
  st([[0.12, -5.5], [0.1 + arm * 0.5, -4.65], [0.06 + arm, -3.95]], 96, 0.07, { taper: BRUSH.both });
  st([[-0.08, -5.4], [-0.08 + arm * 0.5, -4.62], [-0.12 + arm, -3.97]], 100, 0.06, { taper: BRUSH.both });
  st([[-0.12 + arm, -3.97], [-0.06 + arm * 1.1, -3.72], [0.06 + arm, -3.95]], 104, 0.05, { taper: BRUSH.both });
  // feet under the hem
  for (const [k, s] of [[0, 1], [1, -1]]) {
    const fx = s * 0.3 * wk * Math.sin(ph), lift = Math.max(0, s * Math.cos(ph)) * 0.12 * wk;
    st([[fx, -0.33], [fx - 0.02, -0.08 - lift]], 110 + k * 4, 0.05, { taper: BRUSH.both, alpha: A.zhong * a });
    st([[fx + 0.1, -0.03 - lift], [fx - 0.22, -0.01 - lift]], 112 + k * 4, 0.09, { taper: BRUSH.both });
  }
  // face, neck
  st([[-0.28, -6.88], [-0.35, -6.68], [-0.37, -6.6], [-0.35, -6.55], [-0.44, -6.42], [-0.38, -6.36], [-0.39, -6.3], [-0.36, -6.25], [-0.34, -6.15], [-0.27, -6.06], [-0.12, -6.03]], 120, 0.055, { taper: BRUSH.hair, dry: 0.15 });
  st([[-0.12, -6.03], [-0.14, -5.72]], 132, 0.045, { taper: BRUSH.both });
  st([[-0.26, -6.56], [-0.19, -6.54]], 134, 0.045, { taper: BRUSH.both });   // lowered eye
  // hair: mass with the tail lagging the step
  const hair = [[-0.28, -6.9], [-0.05, -7.03], [0.25, -6.96], [0.41, -6.65], [0.38, -6.25], [0.24, -6.0], [0.31 + lag, -5.6], [0.37 + lag * 1.5, -5.0], [0.32 + lag * 2, -4.45],
    [0.22 + lag * 2, -4.55], [0.2 + lag, -5.2], [0.08, -5.95], [0.0, -6.2], [-0.12, -6.55], [-0.25, -6.8]];
  g.save(); g.globalAlpha = a; yfigFill(g, S(hair, 140, 5), ink(A.nong * 0.92)); g.restore();
  st([[0.05, -6.95], [0.3, -6.6], [0.24, -6.05], [0.3 + lag, -5.3], [0.28 + lag * 2, -4.6]], 160, 0.035, { alpha: INK.A.jiao * a, dry: 0.6, taper: BRUSH.both });
}

/**
 * Him, standing, in pale ink (淡墨). o: x, y, U, dir, alpha, drain 0..1 (his ink is drawn out of him, leaving a
 * paper-white figure), d0/d1 (drain start/end times, for the particles that leave him).
 */
const YHIM_SIL = [[-0.32, -7.1], [-0.37, -6.9], [-0.46, -6.78], [-0.38, -6.66], [-0.4, -6.6], [-0.34, -6.42], [-0.16, -6.4], [-0.17, -6.05], [-0.38, -5.8], [-0.42, -5.1],
  [-0.38, -4.2], [-0.3, -4.1], [-0.25, -2.2], [-0.2, -0.12], [-0.46, -0.02], [-0.04, 0], [-0.02, -0.14], [0.02, -2.0], [0.08, -0.14], [0.02, 0], [0.34, -0.02], [0.2, -0.12], [0.26, -2.2], [0.32, -4.1],
  [0.4, -4.2], [0.43, -5.1], [0.4, -5.85], [0.16, -6.05], [0.18, -6.5], [0.36, -6.62], [0.43, -6.86], [0.36, -7.2], [0.05, -7.42], [-0.3, -7.3]];
function yfigHim(g, t, o) {
  const A = INK.A, a = o.alpha ?? 1, d = o.drain || 0, sway = 0.015 * Math.sin(t * TAU / 5.2);
  const { P, S } = yfigMap({ ...o, x: o.x + sway * o.U }, t, 61);
  const la = A.dan * 1.15 * a * (1 - 0.88 * d);
  const st = (pts, b, w, extra) => inkStroke(g, S(pts, b), w * o.U, { alpha: la, dry: 0.4 + 0.4 * d, wet: 0.55, seed: 1400 + b, ...extra });
  // paper figure, lightly toned while he is still "there"
  g.save(); g.globalAlpha = a;
  const sil = S(YHIM_SIL, 0, 4);
  yfigFill(g, sil, INK.paper);
  if (d < 1) yfigFill(g, sil, ink(A.qing * 0.9 * (1 - d)));
  g.restore();
  st([[-0.3, -7.08], [-0.37, -6.9], [-0.46, -6.78], [-0.38, -6.66], [-0.4, -6.6], [-0.34, -6.42], [-0.16, -6.4]], 40, 0.05, { taper: BRUSH.hair, dry: 0.2 });   // profile
  st([[-0.16, -6.4], [-0.17, -6.05]], 48, 0.045, { taper: BRUSH.both });
  st([[0.18, -6.5], [0.16, -6.05]], 50, 0.045, { taper: BRUSH.both });
  st([[-0.17, -6.05], [-0.38, -5.8], [-0.42, -5.1], [-0.38, -4.2]], 52, 0.075);          // shirt
  st([[0.16, -6.05], [0.4, -5.85], [0.43, -5.1], [0.4, -4.2]], 57, 0.075);
  st([[-0.38, -4.2], [0, -4.12], [0.4, -4.2]], 62, 0.05, { taper: BRUSH.both });
  st([[0.1, -5.75], [0.08, -4.95], [0.04, -4.15]], 66, 0.055, { taper: BRUSH.both });     // arm
  st([[-0.1, -5.68], [-0.12, -4.95], [-0.14, -4.18]], 70, 0.05, { taper: BRUSH.both });
  st([[-0.14, -4.18], [-0.06, -3.92], [0.04, -4.15]], 74, 0.045, { taper: BRUSH.both });
  st([[-0.3, -4.1], [-0.25, -2.2], [-0.2, -0.12]], 78, 0.065);                              // trousers
  st([[0.32, -4.1], [0.26, -2.2], [0.2, -0.12]], 82, 0.065);
  st([[0.0, -3.7], [0.02, -2.0], [0.02, -0.14]], 86, 0.04, { taper: BRUSH.both });
  st([[-0.46, -0.02], [-0.04, 0]], 90, 0.07, { taper: BRUSH.both });                        // shoes
  st([[0.02, 0], [0.34, -0.02]], 92, 0.07, { taper: BRUSH.both });
  // short hair
  const hair = [[-0.33, -7.24], [-0.2, -7.4], [0.05, -7.46], [0.3, -7.36], [0.42, -7.14], [0.46, -6.86], [0.4, -6.62], [0.3, -6.55], [0.24, -6.62], [0.2, -6.52],
    [0.08, -6.7], [0.02, -6.82], [-0.08, -6.9], [-0.18, -7.0], [-0.24, -7.12], [-0.33, -7.1]];
  g.save(); g.globalAlpha = a; yfigFill(g, S(hair, 100, 4), ink(A.dan * 1.15 * (1 - 0.9 * d))); g.restore();
  for (let i = 0; i < 5; i++) st([[-0.25 + i * 0.1, -7.36 + Math.abs(i - 1.5) * 0.02], [0.02 + i * 0.1, -7.1], [0.12 + i * 0.07, -6.72 - i * 0.02]], 130 + i * 4, 0.028,
    { alpha: A.zhong * a * (1 - 0.9 * d), dry: 0.6, taper: BRUSH.both });
  // the ink leaving him: motes lift off his outline, top first, drifting after her (left) and up
  if (o.d0 != null && t > o.d0) {
    const n = 150, dur = o.d1 - o.d0;
    for (let i = 0; i < n; i++) {
      const k = (i * 7) % YHIM_SIL.length, p0 = YHIM_SIL[k], p1 = YHIM_SIL[(k + 1) % YHIM_SIL.length], f = hash(i, 3);
      const u = lerp(p0[0], p1[0], f), v = lerp(p0[1], p1[1], f);
      const birth = o.d0 + dur * 0.85 * clamp((v + 7.4) / 7.4) + 0.35 * hash(i, 4), age = t - birth, life = 1.7 + hash(i, 5);
      if (age <= 0 || age > life) continue;
      const vx = -(22 + 50 * hash(i, 6)), vy = -(18 + 30 * hash(i, 7));
      const [bx, by] = P(u, v, 200 + i);
      const x = bx + (vx * age + 10 * Math.sin(age * 2.3 + i)) * (o.dir ?? 1), y = by + vy * age;
      const al = A.dan * 1.1 * a * (1 - age / life) * smoothstep(0, 0.15, age);
      g.strokeStyle = ink(al); g.lineWidth = 1.2 + 1.6 * hash(i, 8); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - vx * 0.08 * (o.dir ?? 1), y - vy * 0.08); g.stroke();
    }
  }
}

/**
 * Her, full length from behind, standing; o.umbrella 0..1 paints an oil-paper umbrella over her in one
 * sweep of 焦墨 (canopy stroke → wash floods it → ribs → shaft), held in her raised right hand.
 * o: x, y (feet), U, alpha, umbrella, look (0..1 head tipped up). Returns the canopy box {x0, x1, y0, y1} (screen px).
 */
function yfigHerBack(g, t, o) {
  const A = INK.A, a = o.alpha ?? 1, um = o.umbrella ?? 0, look = o.look || 0;
  const { P, S } = yfigMap({ ...o, dir: 1 }, t, 81);
  const hc = [0, -6.65 - 0.04 * look];
  const Hd = (u, v) => [hc[0] + u, hc[1] + v * (1 - 0.1 * look) + (v > 0.3 ? 0.08 * look : 0)];
  const HS = (pts, b) => S(pts.map(p => Hd(p[0], p[1])), b);
  const st = (pts, b, w, extra) => inkStroke(g, S(pts, b), w * o.U, { alpha: A.nong * a, dry: 0.3, wet: 0.65, seed: 1800 + b, ...extra });
  const raise = um > 0 ? smoothstep(0, 0.5, um) : 0;
  const hand = [lerp(-0.1, 0.42, raise), lerp(-3.75, -5.35, raise)], elbow = [lerp(0.86, 1.02, raise), lerp(-4.5, -4.9, raise)];
  // paper silhouette
  const sil = [[-0.17, -5.85], [-0.42, -5.76], [-0.66, -5.64], [-0.8, -5.44], [-0.87, -5.1], [-0.9, -4.5], [-0.88, -3.75], [-0.78, -2.2], [-0.95, -0.3], [0.95, -0.3], [0.78, -2.2],
    [0.66, -3.72], [0.62, -4.4], [elbow[0], elbow[1]], [0.86, -5.4], [0.66, -5.64], [0.42, -5.76], [0.17, -5.85]];
  g.save(); g.globalAlpha = a; yfigFill(g, S(sil, 0, 4), INK.paper); yfigFill(g, S([[-0.14, -6.3], [0.14, -6.3], [0.17, -5.8], [-0.17, -5.8]], 30, 2), INK.paper); g.restore();
  st([[-0.17, -5.85], [-0.42, -5.76], [-0.66, -5.64], [-0.8, -5.44], [-0.87, -5.1], [-0.9, -4.5], [-0.88, -3.75]], 40, 0.075);
  st([[-0.62, -5.0], [-0.58, -4.35], [-0.62, -3.78]], 48, 0.045, { taper: BRUSH.both, alpha: A.zhong * a });
  st([[-0.9, -3.8], [-0.86, -3.6], [-0.8, -3.72]], 52, 0.05, { taper: BRUSH.both });                      // left hand
  st([[0.17, -5.85], [0.42, -5.76], [0.66, -5.64], [0.86, -5.4], [elbow[0], elbow[1]]], 56, 0.075);        // right shoulder, upper arm
  st([[elbow[0], elbow[1]], [lerp(0.85, 0.72, raise), lerp(-4.1, -5.0, raise)], hand], 62, 0.06, { taper: BRUSH.both });
  st([[0.62, -5.0], [0.58, -4.35], [0.62, -3.72]], 68, 0.045, { taper: BRUSH.both, alpha: A.zhong * a });
  st([[-0.66, -3.75], [0, -3.66], [0.66, -3.72]], 72, 0.05, { taper: BRUSH.both });                        // cardigan hem
  st([[-0.64, -3.75], [-0.78, -2.2], [-0.95, -0.3]], 76, 0.075);                                          // skirt
  st([[0.64, -3.72], [0.78, -2.2], [0.95, -0.3]], 80, 0.075);
  st([[-0.95, -0.3], [0, -0.22], [0.95, -0.3]], 84, 0.05, { taper: BRUSH.both });
  st([[-0.25, -3.6], [-0.35, -1.8], [-0.4, -0.35]], 88, 0.035, { taper: BRUSH.both, alpha: A.dan * a });
  st([[0.2, -3.6], [0.3, -1.8], [0.36, -0.33]], 92, 0.035, { taper: BRUSH.both, alpha: A.dan * a });
  st([[-0.36, -0.27], [-0.3, 0]], 96, 0.07, { taper: BRUSH.both }); st([[0.3, -0.27], [0.34, 0]], 98, 0.07, { taper: BRUSH.both });
  st([[-0.14, -6.2], [-0.16, -5.85]], 100, 0.035, { taper: BRUSH.both }); st([[0.14, -6.2], [0.16, -5.85]], 102, 0.035, { taper: BRUSH.both });
  // hair
  const headHair = [[0, -0.55], [0.27, -0.49], [0.43, -0.22], [0.45, 0.1], [0.37, 0.38], [0.2, 0.56], [0, 0.62], [-0.2, 0.56], [-0.37, 0.38], [-0.45, 0.1], [-0.43, -0.22], [-0.27, -0.49]];
  const tail = [[0.05, 0.6], [0.2, 0.92], [0.25, 1.45], [0.2, 2.0], [0.06, 2.4], [-0.07, 2.0], [-0.13, 1.45], [-0.12, 0.92], [-0.06, 0.6]];
  g.save(); g.globalAlpha = a;
  yfigFill(g, HS(headHair, 120), ink(A.nong * 0.92)); yfigFill(g, S(tail.map(p => [p[0], hc[1] + p[1]]), 140), ink(A.nong * 0.92));
  g.restore();
  for (let i = 0; i < 9; i++) { const u = -1 + 2 * i / 8, e = Math.abs(u); st([[u * 0.26, -0.52 + e * 0.06], [u * 0.42, 0.05], [u * 0.2, 0.5], [u * 0.03, 0.62]].map(p => Hd(p[0], p[1])), 160 + i * 5, 0.025, { alpha: A.jiao * a * 0.8, dry: 0.6, taper: BRUSH.both }); }
  if (um <= 0) return null;
  // --- the umbrella: rim just above her head, tipped a little; ribs run over the top from the crown to the rim
  const cx = o.umbrellaCx ?? 0.25, rimY = o.umbrellaRim ?? -7.55, rx = o.umbrellaR ?? 2.7, apex = rimY - 1.15, tilt = o.umbrellaTilt ?? -0.11, pv = hand;
  const R2 = ([u, v]) => { const du = u - pv[0], dv = v - pv[1]; return [pv[0] + du * Math.cos(tilt) - dv * Math.sin(tilt), pv[1] + du * Math.sin(tilt) + dv * Math.cos(tilt)]; };
  const dome = []; for (let i = 0; i <= 24; i++) { const u = -1 + 2 * i / 24; dome.push(R2([cx + rx * u, rimY - (rimY - apex) * Math.pow(1 - u * u, 0.75)])); }
  const rim = []; for (let i = 0; i <= 48; i++) { const u = 1 - 2 * i / 48, sc = 0.08 * Math.abs(Math.sin(u * Math.PI * 4.5)); rim.push(R2([cx + rx * u, rimY + 0.2 * (1 - u * u) + sc])); }
  const sweep = prog(um, 0, 0.45, ease.inOutQuad), flood = prog(um, 0.3, 0.75), ribs = prog(um, 0.55, 0.85), shaft = prog(um, 0.6, 0.95);
  if (flood > 0) inkSoft(g, s => { const pts = S(dome.concat(rim), 200, 2); s.beginPath(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.closePath(); s.fillStyle = ink(A.jiao * 0.9 * flood * a); s.fill(); }, { scale: 0.5, grain: 0.3 });
  inkStroke(g, S(dome, 260), 0.5 * o.U, { alpha: A.jiao * a, dry: 0.35, seed: 1990, upto: sweep, wet: 0.7, taper: s => 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, s * 1.1)) });
  if (ribs > 0) for (let k = 1; k < 12; k++) {
    const u = -1 + 2 * k / 12, top = R2([cx, apex + 0.05]), mid = R2([cx + rx * u * 0.55, rimY - (rimY - apex) * Math.pow(1 - (u * 0.55) ** 2, 0.75) * 0.98]), end = R2([cx + rx * u * 0.98, rimY + 0.12 * (1 - u * u)]);
    inkStrokePaper(g, S([top, mid, end], 300 + k * 3), 0.028 * o.U, 0.5 * ribs * a, 2000 + k);
  }
  const top = R2([cx, apex]), under = R2([cx, rimY + 0.1]);
  if (shaft > 0) inkStroke(g, S([under, [lerp(under[0], hand[0], 0.5), lerp(under[1], hand[1], 0.5)], [hand[0], hand[1] + 0.3]], 330), 0.055 * o.U, { alpha: A.jiao * a, dry: 0.2, seed: 2020, upto: shaft, taper: s => 1 });
  st([top, R2([cx, apex - 0.3])], 340, 0.06, { taper: BRUSH.both, alpha: A.jiao * a * sweep });
  const bx = dome.map(p => P(p[0], p[1])), p0 = [Math.min(...bx.map(q => q[0])), Math.min(...bx.map(q => q[1]))], p1 = [Math.max(...bx.map(q => q[0])), 0];
  return { x0: Math.min(p0[0], p1[0]), x1: Math.max(p0[0], p1[0]), y0: p0[1], y1: o.y };
}

/** Him, full length from behind, standing (for the memory under one umbrella). o: x, y, U, alpha. */
function yfigHimBack(g, t, o) {
  const A = INK.A, a = o.alpha ?? 1;
  const { S } = yfigMap({ ...o, dir: 1 }, t, 91);
  const st = (pts, b, w, extra) => inkStroke(g, S(pts, b), w * o.U, { alpha: A.nong * a, dry: 0.35, wet: 0.6, seed: 2100 + b, ...extra });
  const sil = [[-0.18, -6.2], [-0.5, -6.08], [-0.85, -5.95], [-1.0, -5.6], [-1.02, -5.0], [-0.98, -4.0], [-0.62, -3.9], [-0.55, -2.0], [-0.46, -0.1], [0.46, -0.1], [0.55, -2.0], [0.62, -3.9], [0.98, -4.0], [1.02, -5.0], [1.0, -5.6], [0.85, -5.95], [0.5, -6.08], [0.18, -6.2]];
  g.save(); g.globalAlpha = a; yfigFill(g, S(sil, 0, 4), INK.paper); yfigFill(g, S([[-0.17, -6.6], [0.17, -6.6], [0.19, -6.15], [-0.19, -6.15]], 30, 2), INK.paper); g.restore();
  st([[-0.18, -6.2], [-0.5, -6.08], [-0.85, -5.95], [-1.0, -5.6], [-1.02, -5.0], [-0.98, -4.05]], 40, 0.075);
  st([[0.18, -6.2], [0.5, -6.08], [0.85, -5.95], [1.0, -5.6], [1.02, -5.0], [0.98, -4.05]], 46, 0.075);
  st([[-0.72, -5.3], [-0.66, -4.5], [-0.62, -3.9]], 52, 0.045, { taper: BRUSH.both, alpha: A.zhong * a });
  st([[0.72, -5.3], [0.66, -4.5], [0.62, -3.9]], 55, 0.045, { taper: BRUSH.both, alpha: A.zhong * a });
  st([[-0.64, -3.95], [0, -3.86], [0.64, -3.95]], 58, 0.05, { taper: BRUSH.both });
  st([[-0.62, -3.9], [-0.55, -2.0], [-0.46, -0.1]], 61, 0.07); st([[0.62, -3.9], [0.55, -2.0], [0.46, -0.1]], 64, 0.07);
  st([[0.0, -3.5], [0.02, -1.9], [0.02, -0.1]], 67, 0.04, { taper: BRUSH.both });
  st([[-0.5, -0.05], [-0.04, 0]], 70, 0.07, { taper: BRUSH.both }); st([[0.04, 0], [0.5, -0.05]], 72, 0.07, { taper: BRUSH.both });
  st([[-0.2, -6.18], [0, -6.1], [0.2, -6.18]], 74, 0.04, { taper: BRUSH.both });                       // collar
  st([[-0.17, -6.6], [-0.19, -6.2]], 76, 0.035, { taper: BRUSH.both }); st([[0.17, -6.6], [0.19, -6.2]], 78, 0.035, { taper: BRUSH.both });
  const hair = [[0, -7.62], [0.3, -7.55], [0.46, -7.25], [0.47, -6.95], [0.38, -6.68], [0.2, -6.6], [0, -6.62], [-0.2, -6.6], [-0.38, -6.68], [-0.47, -6.95], [-0.46, -7.25], [-0.3, -7.55]];
  g.save(); g.globalAlpha = a; yfigFill(g, S(hair, 100, 4), ink(A.nong * 0.85)); g.restore();
  for (let i = 0; i < 6; i++) st([[-0.35 + i * 0.14, -7.5], [-0.3 + i * 0.13, -7.1], [-0.28 + i * 0.12, -6.7]], 120 + i * 4, 0.025, { alpha: A.jiao * a * 0.7, dry: 0.6, taper: BRUSH.both });
}
