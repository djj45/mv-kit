// loop — S24（v1）/ S25（v2）：训练循环。
// v1：一个实黑的环形箭头在画面中央转，环上刻着一圈小刻度，方块沿着环跑（位置只由 f.t 决定，不累积状态）；
// v2：环被从中间切开、两半让开，剖面里是排线的机箱，一个小人把「存储」和「运算」两个方块掰开。
(function () {
'use strict';
const LCX = 960, LCY = 700, LRO = 282, LRI = 212, LRM = 236;

/** 圆环带（外圈正走 + 内圈反走 = 一个闭合的环） */
function lpBand(cx, cy, ro, ri, a0, a1, n, dy) {
  const P = [], o = dy || 0;
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); P.push([cx + Math.cos(a) * ro, cy + Math.sin(a) * ro + o]); }
  for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); P.push([cx + Math.cos(a) * ri, cy + Math.sin(a) * ri + o]); }
  return P;
}
/** 实黑 + 内圈一条排线（四档里的中间调） */
function lpRing(g, f, cx, cy, ro, ri, a0, a1, n, seed) {
  WD.carve(g, f, lpBand(cx, cy, ro, ri, a0, a1, n), { seed: seed, jit: 2.6, seg: 52 });
  const inner = lpBand(cx, cy, ri + 26, ri, a0, a1, n);
  WD.wipe(g, f, inner, { seed: seed + 1.3, jit: 1.6, seg: 30 });
  WD.hatch(g, f, inner, { gap: 9, lw: 3.6, ang: 0.1, wob: 1.2, seed: seed + 2.1 });
}

MV.scene('loop', {
  render: function (g, f) {
    const v = (f.params && f.params.v) || 1;
    WD.ground(g, f, { ox: 0, oy: 0 });
    if (v === 1) {
      lpRing(g, f, LCX, LCY, LRO, LRI, 0, TAU, 84, 3.1);
      const rot = f.lt * 0.13;                                  // 刻度自己在慢慢转
      for (let i = 0; i < 36; i++) {
        const a = i / 36 * TAU + rot;
        const long = i % 6 === 0;
        WD.gouge(g, f, [[LCX + Math.cos(a) * (LRI + 4), LCY + Math.sin(a) * (LRI + 4)],
                        [LCX + Math.cos(a) * (LRO - 4), LCY + Math.sin(a) * (LRO - 4)]], long ? 11 : 7, { seed: 20 + i, pw: 0.32 });
      }
      const head = -2.35 + f.lt * 0.95;                          // 队首角：f.t 的函数
      // 方向箭头，走在队首前面
      const ah = head + 0.2;
      const ax = LCX + Math.cos(ah) * LRM, ay = LCY + Math.sin(ah) * LRM;
      const tx = -Math.sin(ah), ty = Math.cos(ah);
      WD.wipe(g, f, [[ax + tx * 62, ay + ty * 62],
                     [ax - tx * 38 - Math.cos(ah) * 50, ay - ty * 38 - Math.sin(ah) * 50],
                     [ax - tx * 38 + Math.cos(ah) * 50, ay - ty * 38 + Math.sin(ah) * 50]], { seed: 59.2, jit: 1.8 });
      WD.carve(g, f, [[ax + tx * 52, ay + ty * 52],
                      [ax - tx * 30 - Math.cos(ah) * 40, ay - ty * 30 - Math.sin(ah) * 40],
                      [ax - tx * 30 + Math.cos(ah) * 40, ay - ty * 30 + Math.sin(ah) * 40]], { seed: 61, jit: 1.6, holes: false });
      let lead = null;
      for (let i = 0; i < 9; i++) {
        const a = head - i * 0.215;
        const bx = LCX + Math.cos(a) * LRM, by = LCY + Math.sin(a) * LRM;
        const sz = i === 0 ? 19 : 13;
        if (i === 0) WD.wipe(g, f, [[bx - sz - 6, by - sz - 6], [bx + sz + 6, by - sz - 6], [bx + sz + 6, by + sz + 6], [bx - sz - 6, by + sz + 6]], { seed: 41, jit: 1.4 });
        WD.carve(g, f, [[bx - sz, by - sz], [bx + sz, by - sz], [bx + sz, by + sz], [bx - sz, by + sz]], { color: i === 0 ? WD.blue : WD.paper, seed: 50 + i, jit: 1.2, holes: false });
        if (i === 0) lead = [bx, by];
      }
      MV.focus(lead[0], lead[1], 'the leading block');
      MV.overlay(function (o) {
        WD.lyric(o, f, { x: 960, y: 300, size: 96, maxW: 1620, align: 'center', mode: 'type', color: WD.ink, dim: WD.ghost, drop: 48 });
      });
    } else {
      const gp = ease.inOutQuad(f.p);
      const lift = 180 + 210 * gp;
      const gW = 30 + 400 * gp;                                  // 裂缝张开
      const gTop = 800 - 290 * gp;
      // 机箱：横穿画面的实黑侧板
      WD.carve(g, f, [[-60, 300], [1980, 300], [1980, 830], [-60, 830]], { seed: 5.5, jit: 3.4, seg: 60 });
      // 机架：一排排线的槽（避开铭牌）
      for (let i = 0; i < 3; i++) {
        const y = 600 + i * 34;
        WD.gouge(g, f, [[220, y], [660, y + 4], [960 - gW / 2 - 30, y]], 9, { seed: 70 + i, pw: 0.24 });
        WD.gouge(g, f, [[960 + gW / 2 + 30, y + 4], [1300, y], [1700, y + 5]], 9, { seed: 75 + i, pw: 0.24 });
      }
      // 环的两半：被切开，各自让开
      WD.carve(g, f, lpBand(LCX, LCY - lift, LRO, LRI, Math.PI, TAU, 46), { seed: 7.1, jit: 2.6, seg: 48 });
      WD.carve(g, f, lpBand(LCX, LCY + lift, LRO, LRI, 0, Math.PI, 46), { seed: 7.9, jit: 2.6, seg: 48 });
      // 断面：切口里是排线的机箱（纸 + 排线）
      for (let i = 0; i < 2; i++) {
        const x0 = i ? LCX + LRI : LCX - LRO, y0 = LCY - lift;
        const P = [[x0, y0], [x0 + (LRO - LRI), y0], [x0 + (LRO - LRI), y0 + 120], [x0, y0 + 120]];
        WD.wipe(g, f, P, { seed: 81 + i, jit: 2.2, seg: 26 });
        WD.hatch(g, f, P, { gap: 11, lw: 4.2, ang: 0.5, wob: 1.4, seed: 83 + i });
        WD.contour(g, f, P.concat([P[0]]), 3.4, { seed: 85 + i, boil: 0.6, prof: function () { return 1; } });
      }
      // 两个方块的边：红版描的刀口，随着分开往外挪
      for (let i = 0; i < 2; i++) {
        const sgn = i ? 1 : -1;
        const xin = LCX + sgn * gW / 2, xout = LCX + sgn * (gW / 2 + 660);
        WD.gouge(g, f, [[xout, 350], [xout, 810]], 8, { color: WD.red, seed: 91 + i, pw: 0.3 });
        WD.gouge(g, f, [[xin, 350], [xin, 810]], 8, { color: WD.red, seed: 93 + i, pw: 0.3 });
        WD.gouge(g, f, [[xout, 350], [xin, 350]], 8, { color: WD.red, seed: 95 + i, pw: 0.3 });
        WD.gouge(g, f, [[xout, 810], [xin, 810]], 8, { color: WD.red, seed: 97 + i, pw: 0.3 });
      }
      // 裂缝：刻掉的一条白，里面站着把它们掰开的小人（裁在缝里）
      const crack = [[LCX - gW / 2 - 8, 900], [LCX - gW * 0.34, (gTop + 900) / 2], [LCX - gW * 0.42, gTop],
                     [LCX + gW * 0.42, gTop], [LCX + gW * 0.34, (gTop + 900) / 2], [LCX + gW / 2 + 8, 900]];
      WD.wipe(g, f, crack, { seed: 17.3, jit: 3.4, seg: 40 });
      g.save();
      g.beginPath();
      for (let i = 0; i < crack.length; i++) { if (i) g.lineTo(crack[i][0], crack[i][1]); else g.moveTo(crack[i][0], crack[i][1]); }
      g.closePath(); g.clip();
      const P = WD.figure(g, f, LCX, 884, 300, { lw: 1.15, pose: { arms: [[0.06, -0.12], [0.06, -0.12]], leg: 0.1 }, seed: 77 });
      g.restore();
      // 铭牌：存储 / 运算
      for (let i = 0; i < 2; i++) {
        const sgn = i ? 1 : -1;
        const bx = LCX + sgn * (gW / 2 + 330);
        WD.wipe(g, f, [[bx - 150, 692], [bx + 150, 692], [bx + 150, 752], [bx - 150, 752]], { seed: 101 + i, jit: 1.8, seg: 26 });
        BOX.center(g, i ? '运算' : '存储', bx, 722, { size: 44, font: function (gg, k) { WD.F.lbl(gg, k); }, color: WD.ink });
      }
      MV.focus(P.head[0], P.head[1], 'the little man');
      MV.focus(LCX, (gTop + 900) / 2, 'between the two blocks');   // 主角：被分开的两个方块之间
      WD.lyric(g, f, { x: 960, y: 480, size: 110, align: 'center', maxW: 1500, mode: 'carve' });
    }
    return null;
  },
});
})();
