// servant — 小人跪在画面下 1/3，双手举起刻刀；上面悬着一个巨大的蓝方块（"它"），方块下缘压着黑。
// 低带 STRIP 96 px 在屏幕层：纸带压在小人腰上，举起的双手和刀都在带子上面。
(function () {
'use strict';
MV.scene('servant', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: f.t * 5 });
    const sink = 52 * (1 - prog(f.t, f.from, f.from + 2.6, ease.outCubic)) + 8 * f.a.low;
    const by = 468 + sink;                                  // 蓝方块的下缘
    // "它"：一整块蓝，从上面压下来
    WD.carve(g, f, [[-40, -40], [W + 40, -40], [W + 40, by], [-40, by]], { color: WD.blue, jit: 6, holes: false, seed: 3.1 });
    for (let i = 0; i < 4; i++) {
      WD.gouge(g, f, [[120 + i * 70, 80 + i * 92], [860 + i * 30, 52 + i * 96], [1560 - i * 60, 104 + i * 88]], 13 - i * 2, { seed: 20 + i, pw: 0.2, color: WD.paper, alpha: 0.7 });
    }
    // 方块下缘压着黑：一条实黑带，底下是它压出来的排线
    WD.carve(g, f, [[-40, by - 30], [W + 40, by - 44], [W + 40, by + 74], [-40, by + 96]], { seed: 3.9, jit: 7, seg: 80 });
    WD.hatch(g, f, [[-40, by + 76], [W + 40, by + 56], [W + 40, by + 214], [-40, by + 240]], { gap: 16, lw: 4.4, ang: 0.03, seed: 9, wob: 3.4, alpha: 0.8 });
    // 跪着的小人：双手把刻刀举过头顶
    const trem = 3 * Math.sin(f.t * 2.2) + 5 * f.a.kick;
    const p = WD.figure(g, f, 1420, 1062, 400, { pose: { crouch: 0.55, lean: -0.1, arms: [[-1.42, -1.5], [-1.42, -1.5]] }, lw: 1.25 });
    const hx = (p.hand[0] + p.handL[0]) / 2, hy = (p.hand[1] + p.handL[1]) / 2 + trem;
    WD.blade(g, f, hx - 74, hy - 75, 200, -2.35, { seed: 12 });
    // 膝下的影子
    WD.gouge(g, f, [[1240, 1014], [1420, 1034], [1610, 1010]], 16, { seed: 15, pw: 0.25 });
    WD.cross(g, f, 170, 170, 40, { lw: 2.4 });
    MV.focus(p.head[0], p.head[1], 'kneeling');
    MV.focus(hx, hy, 'raised hands');
    MV.overlay(function (o) { WD.lyric(o, f, { x: 960, y: 940, size: 96, align: 'center', mode: 'strip', maxW: 1660 }); });
    return {};
  },
});
})();
