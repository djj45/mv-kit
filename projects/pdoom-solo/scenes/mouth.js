// mouth — 一张巨大的嘴：整帧是实黑，上下两排牙是刻掉的白三角，下排缺一颗牙，
// 一个小人从黑里刻出来站在那道缺缝里。咬合只在 18.85 s 那一下 snare 上发生。
// 时间线的 insert 冲进嘴里的牙缝（主角）。高带 CARVE：白字刻在上唇上方的实黑里（屏幕层，insert 才推得动）。
(function () {
'use strict';
const GY = 360, LT = 880, TH = 200, NT = 12;

function row(g, f, y, dir, skip) {
  const w = (W + 200) / NT;
  for (let i = 0; i < NT; i++) {
    if (i === skip) continue;
    const x = -100 + (i + 0.5) * w;
    const hw = w * (0.31 + 0.05 * hash(i, 3));
    WD.wipe(g, f, [[x - hw, y], [x + hw, y], [x + hw * 0.2 * (hash(i, 7) - 0.5), y + dir * TH]], { seed: 10 + i + (dir > 0 ? 40 : 0), jit: 3.2 });
  }
}
MV.scene('mouth', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0 });
    const close = clamp(prog(f.t, 18.70, 18.88, ease.inCubic) - prog(f.t, 19.22, 19.98, ease.outCubic));
    const breathe = 16 * f.a.low + 10 * f.a.kick;
    const gy = GY + 62 * close - breathe, lt = LT - 62 * close + breathe;
    // 整张脸：嘴里、唇、下巴都是实黑
    WD.carve(g, f, [[-40, -40], [W + 40, -40], [W + 40, H + 40], [-40, H + 40]], { seed: 2.2, jit: 6, seg: 140 });
    // 上唇的排线 + 下巴的交叉排线（中间调）
    WD.hatch(g, f, [[-40, gy - 132], [W + 40, gy - 156], [W + 40, gy - 10], [-40, gy + 16]], { gap: 15, lw: 4.4, ang: 0.02, seed: 6, wob: 3 });
    WD.crosshatch(g, f, [[-40, lt + 30], [W + 40, lt + 8], [W + 40, H + 40], [-40, H + 40]], { gap: 18, lw: 4.6, ang: -0.04, seed: 8, wob: 3.2 });
    // 两排牙（刻掉的白三角）：下排缺一颗，缺缝里站着小人
    row(g, f, gy, 1, null);
    row(g, f, lt, -1, 6);
    // 嘴角的两道刀口
    for (let s = -1; s <= 1; s += 2) {
      WD.gouge(g, f, [[960 + s * 820, (gy + lt) / 2 - 20], [960 + s * 1030, (gy + lt) / 2 - 56], [960 + s * 1260, (gy + lt) / 2 + 22]], 24, { seed: 71 + s, pw: 0.2 });
    }
    // 舌头：红版只留这一点
    g.save(); g.globalAlpha = 0.9; g.fillStyle = WD.red;
    g.beginPath(); g.ellipse(960, lt - TH - 30 + 46 * close, 196, 33, 0, 0, Math.PI * 2); g.fill(); g.restore();
    // 站在下唇上的小人：从黑里刻出来（纸色）
    const px = -100 + 6.5 * ((W + 200) / NT) + 8 * Math.sin(f.t * 1.4);
    WD.figure(g, f, px, lt + 96, 200, { color: WD.paper, lw: 1.05, face: false, pose: { arms: [[-1.3, -1.5], [0.5, 0.3]], leg: Math.sin(f.tq * 3) * 0.25 } });
    MV.focus(960, (gy + lt) / 2, 'maw');
    MV.overlay(function (o) { WD.lyric(o, f, { x: 960, y: 300, size: 150, align: 'center', mode: 'carve', maxW: 1660 }); });
    return { shake: 3.5 * f.a.snare };
  },
});
})();
