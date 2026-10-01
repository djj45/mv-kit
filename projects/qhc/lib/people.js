// 青花瓷 — the people, drawn the way figures are painted on blue-and-white: outline + flat 分水, faces three strokes
// at most. All take pigment layers L (L.dry lines, L.wet washes, L.col colour) and a place + scale.
//
//   qhcLady(L, x, yFeet, h, {face, wind, tk})         her: 高髻, a peony in the hair, 团扇, 披帛, empty face (face 0..1: the smile)
//   qhcBoatman(L, x, yFeet, h, {tk, look})             him in the picture: 斗笠 + 蓑衣, seen from behind, facing +x
//   qhcBoat(L, x, y, s, {man, tk})                     a small boat (with him in the bow)
//   qhcWillow(L, x, y, s, t)                           a willow (swaying on t)
//   qhcPainterSit(L, x, y, s, {tk, arm})               the painter at a low desk, three-quarter back
//   qhcPainterStand(L, x, yFeet, h, {tk})              the painter standing, back to us
//   qhcHand(L, tipX, tipY, ang, s, {tk, wet})         his hand holding a liner brush; the tip at (tipX, tipY)

/** Map unit coordinates (feet at 0, head at −1, +x right) to canvas. */
const qhcU = (x, y, h, flip = 1) => pts => pts.map(([u, v]) => [x + u * h * flip, y + v * h]);

function qhcLady(L, x, y, h, o = {}) {
  if (o.lipsOnly) { if (o.lips) { const lx = x + (o.flip || 1) * -0.012 * h, ly = y - 0.823 * h; L.col.fillStyle = rgba(QH.hong, o.lips); L.col.beginPath(); L.col.ellipse(lx, ly, h * 0.0085, h * 0.0048, 0, 0, TAU); L.col.fill(); } return; }
  const T = qhcU(x, y, h, o.flip || 1), tk = o.tk || 0, lw = o.lw || Math.max(1.6, h / 150), wind = o.wind || 0;
  const ln = (p, w = lw, a = 0.9, closed = false, seed = 1, sm = 2) => qhLine(L.dry, T(p), { w, a, closed, tk, seed, jit: o.jit ?? 0.5, wob: Math.min(1.2, h / 300), smooth: sm });
  const fl = (p, d, sm = 2) => qhFill(L.wet, T(p), o.smokeOnly ? d * 0.25 : d, { smooth: sm });
  const ell = (cx, cy, rx, ry, n = 40, a0 = 0, a1 = TAU) => { const o2 = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o2.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o2; };
  // 披帛 behind her first: a long ribbon, the ends lifted by the wind
  const ribbon = (side) => {
    const w = wind, ph = tk * 0.37;
    const pts = side < 0
      ? [[-0.07, -0.74], [-0.13, -0.66], [-0.16, -0.5], [-0.17 - 0.03 * w, -0.34], [-0.2 - 0.1 * w, -0.2 + 0.02 * Math.sin(ph)], [-0.26 - 0.18 * w, -0.1 - 0.06 * w + 0.02 * Math.sin(ph + 1)]]
      : [[0.08, -0.74], [0.15, -0.64], [0.19, -0.5], [0.2 + 0.08 * w, -0.4 - 0.04 * w], [0.26 + 0.2 * w, -0.34 - 0.1 * w + 0.03 * Math.sin(ph + 2)], [0.34 + 0.32 * w, -0.3 - 0.18 * w + 0.03 * Math.sin(ph + 3)]];
    const sm = spline(pts, 8), wd = 0.018;
    const A = [], B = [];
    sm.forEach((p, i) => { const q = sm[Math.min(sm.length - 1, i + 1)], r = sm[Math.max(0, i - 1)]; let dx = q[0] - r[0], dy = q[1] - r[1]; const d = Math.hypot(dx, dy) || 1; const k = wd * (0.6 + 0.4 * Math.sin(i / sm.length * Math.PI)); A.push([p[0] - dy / d * k, p[1] + dx / d * k]); B.push([p[0] + dy / d * k, p[1] - dx / d * k]); });
    fl(A.concat(B.slice().reverse()), QH.D.ying); ln(A, lw * 0.8, 0.85, false, 50 + side); ln(B, lw * 0.8, 0.85, false, 52 + side);
  };
  ribbon(1);
  // skirt (long, flaring, a train to the right) and the robe
  const skirt = [[-0.065, -0.5], [-0.1, -0.3], [-0.13, -0.12], [-0.16, 0.0], [-0.1, 0.012], [-0.04, 0.0], [0.03, 0.014], [0.1, 0.0], [0.18, 0.006], [0.26, -0.004], [0.2, -0.05], [0.14, -0.2], [0.09, -0.36], [0.075, -0.5]];
  fl(skirt, QH.D.ying); ln(skirt, lw, 0.9, true, 3);
  ln([[-0.03, -0.46], [-0.05, -0.2], [-0.07, 0.0]], lw * 0.7, 0.8, false, 4);
  ln([[0.02, -0.46], [0.03, -0.2], [0.04, 0.005]], lw * 0.7, 0.8, false, 5);
  ln([[0.06, -0.42], [0.1, -0.2], [0.15, 0.0]], lw * 0.7, 0.8, false, 6);
  // bodice + sash
  const bod = [[-0.07, -0.745], [0.085, -0.745], [0.08, -0.52], [-0.068, -0.52]];
  fl(bod, QH.D.dan); ln(bod, lw, 0.9, true, 7);
  const sash = [[-0.07, -0.54], [0.08, -0.54], [0.08, -0.5], [-0.07, -0.5]];
  fl(sash, QH.D.er); ln(sash, lw * 0.8, 0.9, true, 8);
  ln([[0.0, -0.5], [0.005, -0.34], [0.012, -0.22]], lw * 0.8, 0.85, false, 9);
  ln([[0.018, -0.5], [0.03, -0.36], [0.038, -0.25]], lw * 0.8, 0.85, false, 10);
  // collar (交领)
  ln([[-0.045, -0.765], [0.008, -0.69], [0.062, -0.765]], lw, 0.9, false, 11);
  // sleeves: wide, hanging; the hands meet in front, holding the 团扇
  const sl = [[-0.07, -0.745], [-0.12, -0.66], [-0.15, -0.52], [-0.14, -0.43], [-0.09, -0.42], [-0.05, -0.47], [-0.03, -0.55]];
  const sr = [[0.085, -0.745], [0.13, -0.66], [0.155, -0.52], [0.145, -0.44], [0.09, -0.43], [0.04, -0.48], [0.02, -0.56]];
  fl(sl, QH.D.dan); ln(sl, lw, 0.9, true, 12);
  fl(sr, QH.D.dan); ln(sr, lw, 0.9, true, 13);
  ln([[-0.12, -0.46], [-0.08, -0.45]], lw * 0.7, 0.8, false, 14);
  ln([[0.13, -0.47], [0.09, -0.46]], lw * 0.7, 0.8, false, 15);
  // the fan: round, on a short handle, hanging from her left hand below the sleeve
  const fan = ell(-0.17, -0.34, 0.056, 0.058);
  fl(fan, QH.D.ying * 0.7); ln(fan, lw, 0.9, true, 16);
  ln([[-0.15, -0.395], [-0.125, -0.44]], lw * 1.1, 0.9, false, 17, 0);
  ln(qhCurl(-0.17, -0.34, 0.03, 1.1, 1, 0.4, 24), lw * 0.6, 0.7, false, 18);
  // the near 披帛 end, over the left arm
  ribbon(-1);
  // neck, head (the face: only its outline), hair, 高髻, the peony in the hair
  ln([[-0.012, -0.8], [-0.01, -0.765]], lw * 0.9, 0.85, false, 20);
  ln([[0.022, -0.8], [0.024, -0.765]], lw * 0.9, 0.85, false, 21);
  const face = ell(0.0, -0.845, 0.04, 0.052, 36, Math.PI * 0.35, Math.PI * 1.25);
  if (!o.noFace) ln(face, lw, 0.9, false, 22);
  const hair = [[-0.036, -0.875], [-0.03, -0.9], [-0.005, -0.912], [0.03, -0.905], [0.05, -0.88], [0.052, -0.84], [0.042, -0.8], [0.03, -0.79], [0.035, -0.82], [0.03, -0.855], [0.0, -0.878]];
  fl(hair, QH.D.zheng * 0.85); ln(hair, lw, 0.92, true, 23);
  const bun = [[-0.02, -0.9], [-0.04, -0.95], [-0.035, -0.995], [-0.005, -1.0], [0.02, -0.98], [0.028, -0.94], [0.02, -0.905]];
  fl(bun, QH.D.zheng * 0.85); ln(bun, lw, 0.92, true, 24);
  ln(qhCurl(0.0, -0.96, 0.018, 1.0, 1, 1, 20), lw * 0.6, 0.6, false, 25);
  const fx = 0.05, fy = -0.925;
  const fpts = ell(fx, fy, 0.024, 0.02, 20);
  fl(fpts, QH.D.er); ln(fpts, lw * 0.8, 0.9, true, 26);
  ln([[fx - 0.012, fy], [fx + 0.012, fy - 0.004]], lw * 0.6, 0.8, false, 27);
  // her smile (the last shot): two curved eyes, then 釉里红 on the lips
  const sm = o.face || 0;
  if (sm > 0) {
    const e = (cx) => { const p = []; for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.15 + 0.7 * i / 10); p.push([cx + Math.cos(a) * 0.011, -0.852 + Math.sin(a) * -0.006]); } return p; };
    qhLine(L.dry, T(e(-0.022)), { w: lw * 0.8, a: 0.9, upto: clamp(sm * 2), tk, dot: false, jit: 0 });
    qhLine(L.dry, T(e(0.004)), { w: lw * 0.8, a: 0.9, upto: clamp(sm * 2 - 0.5), tk, dot: false, jit: 0 });
  }
  if (o.lips) {
    const [lx, ly] = T([[-0.012, -0.823]])[0];
    L.col.fillStyle = rgba(QH.hong, o.lips); L.col.beginPath(); L.col.ellipse(lx, ly, h * 0.0085, h * 0.0048, 0, 0, TAU); L.col.fill();
  }
}

/** Him, on the vase: 斗笠 (wide conical hat) + 蓑衣 (straw cape), standing, seen from behind, looking to +x. */
function qhcBoatman(L, x, y, h, o = {}) {
  const T = qhcU(x, y, h, o.flip || 1), tk = o.tk || 0, lw = o.lw || Math.max(1.4, h / 90), look = o.look || 0;
  const ln = (p, w = lw, a = 0.9, closed = false, seed = 1, sm = 1) => qhLine(L.dry, T(p), { w, a, closed, tk, seed, jit: o.jit ?? 0.4, wob: Math.min(1, h / 300), smooth: sm });
  const fl = (p, d, sm = 1) => qhFill(L.wet, T(p), d, { smooth: sm });
  // legs (trousers), feet
  const legs = [[-0.09, -0.36], [-0.1, -0.02], [-0.03, 0], [0.0, -0.3], [0.04, 0], [0.11, 0.0], [0.1, -0.36]];
  fl(legs, QH.D.er); ln(legs, lw, 0.9, true, 1);
  // 蓑衣: a cape of straw from the shoulders to the knees, ragged hem, hatched
  const cape = [[-0.1, -0.76], [0.1, -0.76], [0.2, -0.5], [0.23, -0.3], [0.17, -0.33], [0.12, -0.28], [0.06, -0.32], [0.0, -0.27], [-0.06, -0.32], [-0.12, -0.28], [-0.18, -0.33], [-0.22, -0.3], [-0.19, -0.52]];
  fl(cape, QH.D.dan); ln(cape, lw, 0.9, true, 2);
  for (let i = 0; i < 7; i++) { const u = -0.15 + i * 0.05; ln([[u * 0.6, -0.72], [u * 1.2, -0.34]], lw * 0.55, 0.7, false, 10 + i); }
  // head (from behind: the back of it), the hat
  const head = [[-0.05, -0.78], [-0.055, -0.84], [-0.03, -0.87], [0.03, -0.87], [0.055, -0.84], [0.05, -0.78]];
  fl(head, QH.D.zheng * 0.8); ln(head, lw, 0.9, true, 3);
  const tilt = look * 0.05;
  const hat = [[-0.27, -0.84 + tilt], [0.0, -1.0], [0.27, -0.84 - tilt], [0.16, -0.83 - tilt * 0.5], [0.0, -0.845], [-0.16, -0.83 + tilt * 0.5]];
  fl(hat, QH.D.er, 0); ln(hat, lw, 0.92, true, 4, 0);
  ln([[0.0, -1.0], [-0.1, -0.84]], lw * 0.5, 0.7, false, 5); ln([[0.0, -1.0], [0.1, -0.84]], lw * 0.5, 0.7, false, 6);
}

/** A small boat: a crescent hull, x at its middle, y its gunwale; with him in the bow when o.man. */
function qhcBoat(L, x, y, s, o = {}) {
  const tk = o.tk || 0, lw = o.lw || 2.4 * s;
  const hull = [[x - 110 * s, y - 16 * s], [x - 60 * s, y + 2 * s], [x + 60 * s, y + 2 * s], [x + 118 * s, y - 22 * s], [x + 92 * s, y + 16 * s], [x - 84 * s, y + 18 * s]];
  if (o.man !== false) qhcBoatman(L, x + 44 * s, y + 2 * s, 118 * s, { tk, look: o.look, lw: lw * 0.9 });
  qhFill(L.wet, hull, QH.D.er); qhLine(L.dry, hull, { w: lw, a: 0.92, closed: true, tk, seed: 900 });
  qhLine(L.dry, [[x - 70 * s, y + 9 * s], [x + 80 * s, y + 8 * s]], { w: lw * 0.6, a: 0.8, tk, seed: 901, dot: false });
  // the pole, leaning back into the water
  if (o.pole !== false) qhLine(L.dry, [[x + 10 * s, y + 40 * s], [x + 30 * s, y - 60 * s]], { w: lw * 0.8, a: 0.88, tk, seed: 902 });
}

/** A willow: a leaning trunk, drooping strands that sway with t. */
function qhcWillow(L, x, y, s, t = 0, o = {}) {
  const tk = o.tk || 0;
  const trunk = [[x - 6 * s, y], [x - 4 * s, y - 60 * s], [x + 6 * s, y - 120 * s], [x + 2 * s, y - 170 * s]];
  const tw = [[x - 12 * s, y], [x - 12 * s, y - 60 * s], [x - 4 * s, y - 118 * s], [x - 6 * s, y - 168 * s], [x + 6 * s, y - 172 * s], [x + 14 * s, y - 122 * s], [x + 6 * s, y - 62 * s], [x + 8 * s, y]];
  qhFill(L.wet, tw, QH.D.er); qhLine(L.dry, tw, { w: 2.2 * s, a: 0.9, closed: true, tk, seed: 950 });
  for (let i = 0; i < 9; i++) {
    const bx = x + (i - 4) * 12 * s, by = y - 160 * s + Math.abs(i - 4) * 8 * s, len = (70 + 30 * hash(i, 7)) * s, sway = 10 * s * Math.sin(t * 1.3 + i);
    const strand = bez2([bx, by], [bx + (i - 4) * 10 * s, by + len * 0.2], [bx + (i - 4) * 6 * s + sway, by + len], 10);
    qhLine(L.dry, strand, { w: 1.5 * s, a: 0.82, tk, seed: 960 + i, dot: false });
    for (let k = 3; k < 10; k += 2) { const p = strand[k]; qhLine(L.dry, [[p[0], p[1]], [p[0] + 6 * s, p[1] + 5 * s]], { w: 1.4 * s, a: 0.8, dot: false, seed: 980 + i * 10 + k }); }
  }
}

/**
 * The painter at a low desk, three-quarter back view (turned up-right towards his work). (x, y) = where he sits
 * on the floor, s = scale (1 ≈ 470 px tall seated). o.arm 0..1 lifts the brush hand (1 = raised and still).
 * Returns the brush tip position.
 */
function qhcPainterSit(L, x, y, s, o = {}) {
  const tk = o.tk || 0, lw = 3 * Math.max(0.7, s), arm = o.arm ?? 0.3;
  const T = p => p.map(([u, v]) => [x + u * s, y + v * s]);
  const ln = (p, w = lw, a = 0.9, closed = false, seed = 1, sm = 2) => qhLine(L.dry, T(p), { w, a, closed, tk, seed, jit: 0.5, smooth: sm });
  const fl = (p, d, sm = 2) => qhFill(L.wet, T(p), d, { smooth: sm });
  // the robe pooled on the floor, the back rising to sloped shoulders
  const robe = [[-170, 10], [-150, -40], [-128, -150], [-112, -240], [-86, -292], [-30, -312], [30, -310], [78, -288], [104, -236], [120, -150], [150, -40], [190, 10], [10, 22]];
  fl(robe, QH.D.dan); ln(robe, lw, 0.9, true, 1);
  ln([[-8, -300], [-14, -200], [-6, -120]], lw * 0.7, 0.8, false, 2);
  ln([[-96, -40], [-40, -8], [40, -6], [120, -30]], lw * 0.7, 0.75, false, 3);
  const belt = [[-124, -142], [118, -148], [120, -122], [-126, -116]];
  fl(belt, QH.D.er, 1); ln(belt, lw * 0.8, 0.9, true, 4, 1);
  ln([[70, -130], [84, -88], [76, -60]], lw * 0.7, 0.85, false, 5);             // the belt's knot tail
  // head from behind, turned a little right: hair, a knot wrapped in cloth, an ear
  const head = [[-44, -312], [-56, -352], [-48, -396], [-12, -420], [28, -416], [52, -392], [58, -352], [46, -314]];
  fl(head, QH.D.zheng * 0.8); ln(head, lw, 0.92, true, 6);
  const knot = [[-22, -414], [-28, -446], [-6, -468], [20, -462], [30, -440], [24, -414]];
  fl(knot, QH.D.er); ln(knot, lw, 0.9, true, 7);
  ln([[-26, -420], [28, -424]], lw * 0.8, 0.9, false, 8, 0);
  ln([[-22, -444], [-48, -434], [-60, -414]], lw * 0.8, 0.85, false, 9);        // the cloth's tail
  ln([[54, -372], [66, -364], [66, -348], [56, -340]], lw * 0.8, 0.85, false, 10);
  // right arm: sleeve tied up with the 襻膊 cord; forearm bare, hand towards the work
  const ex = lerp(150, 162, arm), ey = lerp(-160, -222, arm), hx = lerp(222, 246, arm), hy = lerp(-172, -286, arm);
  const sleeve = [[70, -290], [120, -270], [ex + 16, ey - 20], [ex + 8, ey + 22], [100, -170], [98, -230]];
  fl(sleeve, QH.D.dan); ln(sleeve, lw, 0.9, true, 11);
  ln([[ex - 26, ey - 36], [ex - 10, ey + 26]], lw * 0.8, 0.85, false, 12, 0);   // 襻膊 tie
  const fore = qhCapsule([ex + 8, ey], [hx, hy], 15, 11);
  fl(fore, QH.D.ying * 0.8, 0); ln(fore, lw * 0.9, 0.9, true, 13, 0);
  // hand: a fist round the brush, the brush held upright
  const fist = qhCapsule([hx - 2, hy + 4], [hx + 14, hy - 8], 14, 12);
  fl(fist, QH.D.ying * 0.8, 0); ln(fist, lw * 0.9, 0.9, true, 14, 0);
  const bt = [hx + 26, hy + 46], bb = [hx + 4, hy - 64];
  ln([bb, bt], lw * 0.8, 0.92, false, 15, 0);
  const tip = [[bt[0] - 3, bt[1] - 6], [bt[0] + 4, bt[1] + 16], [bt[0] + 6, bt[1] - 8]];
  qhFill(L.wet, T(tip), QH.D.tou); ln(tip, lw * 0.6, 0.95, true, 16, 0);
  return T([[bt[0] + 4, bt[1] + 16]])[0];
}

/** The painter standing, seen from behind (h = height in px, feet at y). */
function qhcPainterStand(L, x, y, h, o = {}) {
  const T = qhcU(x, y, h), tk = o.tk || 0, lw = o.lw || Math.max(2, h / 150);
  const ln = (p, w = lw, a = 0.9, closed = false, seed = 1) => qhLine(L.dry, T(p), { w, a, closed, tk, seed, jit: 0.5 });
  const fl = (p, d) => qhFill(L.wet, T(p), d);
  const robe = [[-0.12, -0.8], [0.12, -0.8], [0.15, -0.5], [0.16, -0.18], [0.1, -0.18], [0.12, -0.02], [0.03, 0], [0.02, -0.16], [-0.02, -0.16], [-0.03, 0], [-0.12, -0.02], [-0.1, -0.18], [-0.16, -0.18], [-0.15, -0.5]];
  fl(robe, QH.D.dan); ln(robe, lw, 0.9, true, 1);
  const belt = [[-0.15, -0.5], [0.15, -0.5], [0.15, -0.46], [-0.15, -0.46]];
  fl(belt, QH.D.er); ln(belt, lw * 0.8, 0.9, true, 2);
  ln([[0.0, -0.8], [0.0, -0.5]], lw * 0.7, 0.8, false, 3);
  // arms hanging, sleeves tied up
  ln([[-0.12, -0.78], [-0.19, -0.6], [-0.2, -0.46], [-0.16, -0.44]], lw, 0.9, false, 4);
  ln([[0.12, -0.78], [0.19, -0.6], [0.2, -0.46], [0.16, -0.44]], lw, 0.9, false, 5);
  const head = [[-0.07, -0.8], [-0.08, -0.9], [-0.05, -0.95], [0.05, -0.95], [0.08, -0.9], [0.07, -0.8]];
  fl(head, QH.D.zheng * 0.82); ln(head, lw, 0.9, true, 6);
  const knot = [[-0.035, -0.945], [-0.04, -1.0], [0.0, -1.02], [0.04, -1.0], [0.035, -0.945]];
  fl(knot, QH.D.er); ln(knot, lw, 0.9, true, 7);
}

/**
 * His hand holding a liner brush upright, drawn from the brush tip (tipX, tipY). ang = direction from the tip up
 * the brush (−π/2 = straight up); the arm leaves towards o.side (+1 right, −1 left). s = scale (1 ≈ 360 px brush).
 * o.wet: the tip is loaded (darker). Draw into qhStickerLayers so the hand hides what is behind it.
 */
function qhcHand(L, tipX, tipY, ang, s, o = {}) {
  const tk = o.tk || 0, lw = (o.lw || 3) * Math.max(0.6, s), sd = o.side || 1;
  // local frame: −y up the brush, +x towards the arm
  const ca = Math.cos(ang + Math.PI / 2), sa = Math.sin(ang + Math.PI / 2);
  const T = p => p.map(([u, v]) => { const x = u * sd; return [tipX + (x * ca - v * sa) * s, tipY + (x * sa + v * ca) * s]; });
  const ln = (p, w = lw, a = 0.9, closed = false, seed = 1, sm = 0) => qhLine(L.dry, T(p), { w, a, closed, tk, seed, jit: 0.4, wob: 0.5, smooth: sm });
  const fl = (p, d, sm = 0) => qhFill(L.wet, T(p), d, { smooth: sm });
  // the brush: hair tip, ferrule, bamboo shaft (the hand is drawn over it)
  if (!o.noBrush) {
    const hair = [[0, 0], [-5, -10], [-7, -34], [-6, -42], [6, -42], [7, -34], [5, -10]];
    fl(hair, o.wet === false ? QH.D.dan : QH.D.tou); ln(hair, lw * 0.7, 0.95, true, 1, 1);
    const shaft = [[-6, -42], [-8, -370], [8, -370], [6, -42]];
    fl(shaft, QH.D.ying); ln(shaft, lw * 0.8, 0.9, true, 2);
    for (const v of [-58, -330]) ln([[-7, v], [7, v]], lw * 0.6, 0.85, false, 3 - v);
  }
  // the sleeve: the forearm goes off to the side, tied back with the 襻膊 cord
  const sleeve = [[96, -236], [500, -300], [540, -96], [96, -146]];
  qhErase(L, T(sleeve), { smooth: 1 });
  fl(sleeve, QH.D.ying * 1.25, 1); ln(sleeve, lw, 0.9, true, 20, 1);
  ln([[150, -246], [156, -140]], lw * 0.85, 0.88, false, 21, 1);
  ln([[250, -262], [262, -122]], lw * 0.8, 0.85, false, 22, 1);
  // the fist: index finger curled round the front of the shaft, the others folded under, the wrist into the sleeve
  const F = p => p.map(([x, y]) => [x * 0.66, -184 + (y + 173) * 0.66]);
  const fist = F([[-16, -160], [-20, -182], [-10, -204], [14, -220], [50, -234], [96, -240], [150, -236], [168, -200], [164, -130], [140, -112],
    [100, -106], [64, -110], [34, -118], [10, -128], [-8, -140]]);
  qhErase(L, T(fist), { smooth: 2 });
  fl(fist, QH.D.ying * 0.8, 2); ln(fist, lw, 0.9, true, 10, 2);
  ln(F([[-10, -150], [18, -154], [46, -150]]), lw * 0.7, 0.85, false, 11, 1);
  ln(F([[4, -126], [34, -132], [66, -128]]), lw * 0.7, 0.85, false, 12, 1);
  // thumb pressing on the near side of the shaft
  const thumb = qhCapsule([62, -206], [4, -196], 11, 8.5);
  fl(thumb, QH.D.ying * 0.8); ln(thumb, lw * 0.85, 0.9, true, 15);
}
