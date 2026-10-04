// 35 askew · 120.70–124.34 · P · #39「RLHF goes askew」
//   画面：一把水平仪（长条框 + 气泡），挂在一块标牌上；整块牌子在场景里绕挂点越转越歪（g.rotate 0 → −14°，
//        不是后期的 rot），气泡滑到一边卡住。
//   焦点：气泡（跟着牌子一起转，报在歌词之后）。
//   运镜：kits/camera.js 默认缓推；牌子自己的 keep 由 WD.line 的 sign 报出，推近不会把它推出画面。
//   歌词：sign M —— 就是被挂着水平仪的那块牌子（跟着歪），印在物体上，留在场景画布上，不进屏幕层。
//   镜头开头 0.06 s（切点 120.70，这一句 120.76 起）WD.current 还是 null：那两帧里牌子已经挂着（sign 从
//   第一个字前 0.2 s 就画），所以用 o.line 指定这一句直接问 sign 要牌子的矩形 —— 第一帧不是一张空纸加一根钉子。
MV.scene('askew', {
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'P');
    const HX = 960, HY = 156;                                     // the hook: everything below turns about this point
    const u = clamp((f.t - f.from - 0.25) / 2.9);
    const tilt = (-14 * u + 0.5 * Math.sin(f.t * 2.1) * u) * Math.PI / 180;   // 0 → −14°, then a small wobble
    const ca = Math.cos(tilt), sa = Math.sin(tilt);
    const R2 = (x, y) => [HX + (x - HX) * ca - (y - HY) * sa, HY + (x - HX) * sa + (y - HY) * ca];

    // the nail and the hook ring — fixed, the plate swings on it
    g.strokeStyle = C.ink; g.lineCap = 'round'; g.lineJoin = 'round';
    SG.poly(g, [[HX, 60], [HX, 120]], { lw: SG.LW.pict });
    g.lineWidth = SG.LW.pict; g.beginPath(); g.arc(HX, HY, 30, 0, TAU); g.stroke();

    // measure the plate before drawing it: the wires go behind, the level hangs below.
    // The shot opens 0.06 s before this line's first word, and WD.current is still null there (the previous line is
    // all sung out) — WD.measure has no line to give. In those two frames the plate is already hanging, so ask the
    // sign for it with an explicit line: the shot never opens on a blank sheet with a nail on it.
    const L39 = f.lyrics.get('RLHF goes askew');
    const LO = { treat: 'sign', size: 'M', zone: 'mid', align: 'center', maxW: 1200 };
    const cur = WD.current(f);
    const live = !!cur && f.t >= cur.line.start - 0.2;            // the plate appears 0.2 s before the line
    const m = WD.measure(g, f, LO);
    const pad = m ? m.size * 0.55 : 60;
    let P = m ? { x: m.x - pad, y: m.y - pad, w: m.w + 2 * pad, h: m.h + 2 * pad } : null;
    let preDrawn = false;

    g.save();
    g.translate(HX, HY); g.rotate(tilt); g.translate(-HX, -HY);
    if (!P && f.t >= L39.start - 0.2) {                            // the two frames before the line: the sign's own plate
      const p = WD.line(g, f, Object.assign({}, LO, { line: L39 }));
      if (p) { P = { x: p.x, y: p.y, w: p.w, h: p.h }; preDrawn = true; }
    }
    const lev = P && (live || preDrawn) ? { x: P.x, y: P.y + P.h + 76, w: P.w, h: 96 } : null;
    if (P && live) {
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.rule; g.lineCap = 'round';
      g.beginPath();                                              // hook → plate, and plate → spirit level
      g.moveTo(HX, HY); g.lineTo(P.x + 44, P.y + 12);
      g.moveTo(HX, HY); g.lineTo(P.x + P.w - 44, P.y + 12);
      g.moveTo(P.x + 44, P.y + P.h); g.lineTo(P.x + 44, lev.y);
      g.moveTo(P.x + P.w - 44, P.y + P.h); g.lineTo(P.x + P.w - 44, lev.y);
      g.stroke();
      WD.line(g, f, LO);                                          // the plate + the sentence on it
    }

    let bubble = [HX, HY];
    if (lev) {
      g.save();
      g.fillStyle = C.paper2; SG.rr(g, lev.x, lev.y, lev.w, lev.h, 10); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate; g.lineJoin = 'round';
      SG.rr(g, lev.x + 7, lev.y + 7, lev.w - 14, lev.h - 14, 6); g.stroke();
      const vx = lev.x + 110, vw = lev.w - 220, vh = 44, vy = lev.y + 26;
      g.fillStyle = C.ink; SG.rr(g, vx, vy, vw, vh, vh / 2); g.fill();       // the vial
      const br = 18, travel = vw / 2 - br - 8;
      const slid = ease.outCubic(clamp((f.t - f.from - 0.35) / 1.6));
      const stuck = clamp((f.t - f.from - 1.6) / 0.6) * 1.5 * Math.sin(f.t * 7);
      const bx = vx + vw / 2 + travel * slid + stuck, by = vy + vh / 2;
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.rule; g.lineCap = 'butt';   // the vial's centre mark, under the bubble
      g.beginPath(); g.moveTo(vx + vw / 2, vy - 13); g.lineTo(vx + vw / 2, vy + vh + 13); g.stroke();
      g.fillStyle = C.paper; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
      g.restore();
      bubble = R2(bx, by);
    }
    g.restore();

    MV.focus(bubble[0], bubble[1], 'bubble');
    return {};
  },
});
