// 青花瓷（影戏）— the puppet (影人). A jointed figure cut out of hide, 430 px tall, feet at the origin,
// up = −y, facing the audience. Her: low bun, wide sleeves, a long robe with a cut 折枝牡丹.
// Pose is quantized to the drawing rate (一拍二) — only the camera and the light move continuously.
//
//   QHC.shadowed(g, bodyFn, cutFn, edgeFn, o)   compose a silhouette + its seams in one call
//   QHC.puppetPose(t, {arm, move})              joints at time t (on twos)
//   QHC.puppetBody(g, pose) / Cut / Edge        fills / knife seams / lit inner edges
//   QHC.puppetShadow(g, {x, y, rot, s, pose, light, z, L, pen, res, alpha})
QHC.PUPPET = { H: 430, head: [0, -390], headR: [32, 38], shoulder: 48, shoulderY: -326, upper: 78, fore: 72, hipY: -215, hem: 8 };

/** Compose a shadow with its knife seams: bodyFn/cutFn/edgeFn each get a raw context, o goes to silhouette(). */
QHC.shadowed = function (g, bodyFn, cutFn, edgeFn, o = {}) {
  const wrap = fn => (fn ? c => { c.save(); fn(c); c.restore(); } : null);
  return silhouette(g, wrap(bodyFn), { ...o, cut: wrap(cutFn), edge: wrap(edgeFn) });
};

/** The joints at song time t. o.arm = 0..1 how far her right hand has come up; on twos unless o.raw. */
QHC.puppetPose = function (t, o = {}) {
  const tt = o.raw ? t : onTwos(t);
  const breath = Math.sin(tt * 1.55), sway = Math.sin(tt * 0.62), lag = Math.sin(tt * 0.62 - 0.5);
  const arm = clamp(o.arm ?? 0), walk = clamp(o.walk ?? 0), turn = clamp(o.turn ?? 0);
  const ph = tt * Math.PI * 1.55, step = Math.sin(ph), step2 = Math.sin(ph + Math.PI);
  return {
    t: tt, breath, sway, lag, arm, walk, turn, handle: !!o.handle, rodA: o.rodA ?? 1,
    open: clamp(o.open ?? 0), mouth: o.mouth ?? 1, smile: clamp(o.smile ?? 0),
    bob: -1.6 * breath - 0.8 * Math.abs(sway) - 2.6 * walk * Math.abs(step),
    lean: 0.020 * sway + 0.12 * turn,          // the whole body tips with her weight / turns away
    head: 0.05 * lag - 0.10 * arm + 0.09 * turn,
    shR: [-0.34 - 0.95 * arm + 0.34 * walk * step, 0.62 - 0.55 * arm],
    shL: [0.30 + 0.05 * lag + 0.36 * walk * step2 + 0.9 * turn, 0.10 + 0.08 * lag + 0.26 * walk * step2],
    hem: 0.06 * lag + 0.12 * walk * step,
  };
};

/** Fills only — the puppet's silhouette (rods first, they are furthest from the cloth). */
QHC.puppetBody = function (g, pose) {
  const P = QHC.PUPPET, ink = 'rgba(23,15,21,0.95)';
  const sh = [P.shoulder, P.shoulderY], up = P.upper, fo = P.fore;
  const arm = (sgn, [a1, a2], w1, w2, sleeve) => {
    const sx = sh[0] * sgn, sy = sh[1] + pose.bob * 0.4;
    const ex = sx + Math.sin(a1) * up, ey = sy + Math.cos(a1) * up;
    const wx = ex + Math.sin(a2) * fo, wy = ey + Math.cos(a2) * fo;
    if (sleeve) QHC.limb(g, [[sx, sy], [ex, ey], [wx, wy]], 62, w2, ink);            // wide 水袖
    QHC.limb(g, [[sx, sy], [ex, ey], [wx, wy]], w1, 15, ink);
    return { sx, sy, ex, ey, wx, wy };
  };
  // ---- the control rod (behind the figure, from above her head down past the bottom edge).
  // pose.rodA = 0 → he has let go of it and it is gone; pose.handle = true draws a wider grip
  // at the bottom, where he carves her name.
  if ((pose.rodA ?? 1) > 0.01) {
    g.save(); g.globalAlpha = 0.5 * (pose.rodA ?? 1);
    g.translate(46, 400);
    QHC.rod(g, { len: 830, w: 11, bend: 0.05, style: 'rgba(16,10,16,0.9)' });
    if (pose.handle) QHC.limb(g, [[0, 46], [0, -70]], 34, 30, 'rgba(16,10,16,0.92)');
    g.restore();
  }
  // ---- robe
  const s = pose.sway, hemS = pose.hem;
  g.fillStyle = ink;
  g.beginPath();
  g.moveTo(0, P.shoulderY - 26);
  g.quadraticCurveTo(-40, P.shoulderY - 24, -sh[0] - 4, P.shoulderY + 4);
  g.quadraticCurveTo(-72, -282, -74 + s * 6, -240);
  g.quadraticCurveTo(-92, -120, -108 + s * 10, -18);
  g.quadraticCurveTo(-112 + hemS * 26, 4, -96 + hemS * 30, P.hem);
  for (let i = 0; i <= 10; i++) {                                     // the hem, slightly uneven
    const u = i / 10, x = lerp(-96 + hemS * 30, 96 + hemS * 30, u);
    g.lineTo(x, P.hem + Math.sin(u * 7.1 + 1.3) * 3.5);
  }
  g.quadraticCurveTo(112 + hemS * 26, 4, 108 + s * 10, -18);
  g.quadraticCurveTo(92, -120, 74 + s * 6, -240);
  g.quadraticCurveTo(72, -282, sh[0] + 4, P.shoulderY + 4);
  g.quadraticCurveTo(40, P.shoulderY - 24, 0, P.shoulderY - 26);
  g.closePath(); g.fill();
  // feet just under the hem
  g.beginPath(); g.ellipse(-30 + hemS * 12, P.hem + 4, 26, 9, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(34 + hemS * 12, P.hem + 4, 24, 8, 0, 0, TAU); g.fill();
  // ---- arms
  const AL = arm(-1, pose.shL, 26, 60, true);
  arm(1, pose.shR, 25, 54, true);
  // ---- her left hand: three fingers, spread by pose.open ("如含" opens them)
  const open = clamp(pose.open ?? 0), a2 = pose.shL[1];
  const dv = [Math.sin(a2), Math.cos(a2)], nv = [-dv[1], dv[0]];
  for (let i = -1; i <= 1; i++) {
    const sp = (0.14 + 0.44 * open) * i;
    const dx = dv[0] * Math.cos(sp) - dv[1] * Math.sin(sp), dy = dv[0] * Math.sin(sp) + dv[1] * Math.cos(sp);
    const fl = 34 - Math.abs(i) * 6;
    QHC.limb(g, [[AL.wx, AL.wy], [AL.wx + dx * fl * 0.6 + nv[0] * 1.6 * i, AL.wy + dy * fl * 0.6 + nv[1] * 1.6 * i],
      [AL.wx + dx * fl, AL.wy + dy * fl]], 13, 10, ink);
  }
  // ---- neck + head
  const hx = pose.lean * 90, hy = P.head[1] + pose.bob;
  g.save(); g.translate(hx, hy); g.rotate(pose.head);
  g.beginPath(); g.ellipse(-4, 38, 13, 13, 0, 0, TAU); g.fill();                 // neck
  g.beginPath(); g.ellipse(0, 0, P.headR[0], P.headR[1], 0, 0, TAU); g.fill();
  // hair: a dome over the top, a low bun behind, one lock down the jaw
  g.beginPath(); g.ellipse(0, -10, 31, 32, 0, Math.PI * 0.98, TAU + Math.PI * 0.02); g.closePath(); g.fill();
  g.beginPath(); g.arc(30, 8, 18, 0, TAU); g.fill();                             // the bun
  g.beginPath(); g.ellipse(-27, 24, 7, 26, 0.20, 0, TAU); g.fill();              // a lock down the jaw
  g.restore();
  return { hx, hy };
};

/** Her eye: a low slit that bends up into a smile as pose.smile goes 0 → 1. */
function eyePts(pose) {
  const sm = clamp(pose.smile ?? 0), out = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    out.push([lerp(-17, 10, u), lerp(-1.2, -3.6, u) - 9 * sm * Math.sin(u * Math.PI)]);
  }
  return out;
}

/** The knife seams: three cuts on the face, the robe's 折枝牡丹, hem and sleeve folds. */
QHC.puppetCut = function (g, pose) {
  const P = QHC.PUPPET, tk = tick(pose.t);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.globalCompositeOperation = 'destination-out';
  const seam = (pts, w, j = 0.7) => cutStroke(g, pts, w, { tick: tk, jitter: j });
  const hx = pose.lean * 90, hy = P.head[1] + pose.bob;
  g.save(); g.translate(hx, hy); g.rotate(pose.head);
  seam([[-17, -17], [-6, -21], [7, -18]], 2.8);        // 眉
  seam(eyePts(pose), 3.2);                             // 眼（垂着 → 最后弯起来）
  if ((pose.mouth ?? 1) > 0.02) seam(polylineUpTo([[3, 19], [7, 18.2], [11, 17.4]], pose.mouth), 2.4);
  g.restore();
  // 折枝牡丹 on the chest, cut as one continuous line
  const pe = QHC.peony({ size: 54, seed: 9 });
  g.save(); g.translate(-4, -286 + pose.bob); g.rotate(-0.06);
  seam(pe.parts.stem, 3.0); seam(pe.parts.leaves[0], 2.8); seam(pe.parts.leaves[1], 2.8);
  pe.parts.petals.forEach(p => seam(p, 2.6, 0.5));
  seam(pe.parts.bud, 2.4, 0.5);
  g.restore();
  // skirt: two sprays + the hem line
  const pe2 = QHC.peony({ size: 54, seed: 21 });
  g.save(); g.translate(46, -150 + pose.bob); g.rotate(0.14);
  seam(pe2.parts.stem, 2.8); pe2.parts.petals.slice(0, 3).forEach(p => seam(p, 2.4, 0.5));
  g.restore();
  const hems = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; hems.push([lerp(-88, 88, u), P.hem - 16 + Math.sin(u * 5.3) * 4]); }
  seam(hems, 3.0, 0.6);
  seam([[-96, -70 + pose.bob], [-70, -96 + pose.bob]], 2.6);                     // sleeve folds
  seam([[88, -60 + pose.bob], [66, -88 + pose.bob]], 2.6);
};

/** The lit inner edge of every seam — the hide's thickness catching the lamp. */
QHC.puppetEdge = function (g, pose) {
  const P = QHC.PUPPET, tk = tick(pose.t);
  const edge = (pts, w, a) => hideEdge(g, pts, w, { alpha: a });
  const hx = pose.lean * 90, hy = P.head[1] + pose.bob;
  g.save(); g.translate(hx, hy); g.rotate(pose.head);
  edge([[-17, -17], [-6, -21], [7, -18]], 4.4, 0.34);
  edge(eyePts(pose), 4.8, 0.38);
  if ((pose.mouth ?? 1) > 0.02) edge(polylineUpTo([[3, 19], [7, 18.2], [11, 17.4]], pose.mouth), 3.8, 0.30);
  g.restore();
  const pe = QHC.peony({ size: 54, seed: 9 });
  g.save(); g.translate(-4, -286 + pose.bob); g.rotate(-0.06);
  edge(pe.parts.stem, 5.0, 0.34); pe.parts.petals.forEach(p => edge(p, 4.4, 0.30));
  g.restore();
};

/** The whole puppet as one shadow: fills + seams + lit edges, projected by its distance from the cloth. */
QHC.puppetShadow = function (g, o = {}) {
  const T = fn => c => { c.save(); c.translate(o.x, o.y); c.rotate(o.rot || 0); const s = o.s ?? 1; c.scale(s, o.flip ? -s : s); fn(c); c.restore(); };
  return QHC.shadowed(g, T(c => QHC.puppetBody(c, o.pose)), T(c => QHC.puppetCut(c, o.pose)), T(c => QHC.puppetEdge(c, o.pose)), o);
};

/** 他握着签子的那只手：签子在影人层、手在更靠灯的一层，先反投影再落手（镜头 8/9/10/11 共用）。
 *  o = { lx, ly, feet, s, u (签子上抓在哪，0.10 = 画面下沿 / 0.42 = 裙摆下), alpha, zHand, L }  */
QHC.rodGrip = function (g, o) {
  const L = o.L ?? 900, zHand = o.zHand ?? 130;
  const kp = L / (L - (o.zPup ?? 34)), kh = L / (L - zHand), u = o.u ?? 0.30;
  const [rx, ry] = [46 + 41.5 * Math.sin(u * 1.2), 400 - 830 * u];
  const scr = [o.lx + kp * (o.feet[0] + rx * o.s - o.lx), o.ly + kp * (o.feet[1] + ry * o.s - o.ly)];
  const at = [o.lx + (scr[0] - o.lx) / kh, o.ly + (scr[1] - o.ly) / kh];
  const ang = Math.atan2(-830, 41.5 * 1.2 * Math.cos(u * 1.2));
  const place = (c, edge) => {
    c.save(); c.translate(at[0], at[1]); c.rotate(ang); c.translate(-44, -4);
    QHC.handHold(c, edge ? { s: 1.05, edge } : { s: 1.05 });
    c.restore();
  };
  const fingers = (gg, p) => {
    p.fingers.forEach(f => hideEdge(gg, f, 12, { alpha: 0.26 }));
    hideEdge(gg, p.thumb, 13, { alpha: 0.30 });
  };
  QHC.shadowed(g, c => place(c), null, c => place(c, fingers),
    { light: [o.lx, o.ly], z: zHand, L, pen: 26, res: 0.5, alpha: o.alpha ?? 1 });
  return { at, ang, u };
};
