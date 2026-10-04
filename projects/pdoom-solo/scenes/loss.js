// loss — 训练损失曲线：粗黑线从左上的高原陡然坠到右下，线下是交叉排线的暗部；
// 曲线本身是一条嵌在黑里的白刀口。高原走完就在 snare 上陡坠，之后还一直慢慢往下掉——
// 所以"下坠的拐点"（正在刻的那一端）每一帧都在动，时间线的 insert 跟着它往下坠。
// 高带 ON-OBJECT 44 px Menlo：印在曲线起点的小标尺上（标尺和字走同一个 MV.group，qa 从严查）。
(function () {
'use strict';
const X0 = 170, X1 = 1760, YTOP = 400, YBOT = 900;

function pt(u) {
  const x = X0 + u * (X1 - X0);
  let v;
  if (u <= 0.44) v = 0;
  else if (u <= 0.60) v = ease.inCubic((u - 0.44) / 0.16);
  else v = 1 + 0.16 * ((u - 0.60) / 0.40);
  return [x, YTOP + v * (YBOT - YTOP) + 9 * noise1(u * 4.3, 5)];
}
MV.scene('loss', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0 });
    // 正在刻的那一端（拐点）：高原 → snare 上陡坠 → 之后一直慢慢往下掉
    const u = keys(f.t, [[f.from, 0.05], [f.from + 0.72, 0.44, ease.inOutQuad], [f.from + 1.5, 0.62, ease.inCubic], [f.to + 0.3, 1.0, ease.outCubic]]);
    const n = Math.max(2, Math.round(u * 230)), C = [];
    for (let i = 0; i <= n; i++) C.push(pt(u * i / n));
    const tip = C[C.length - 1];
    // 线下：交叉排线的暗部
    WD.crosshatch(g, f, C.concat([[tip[0], H + 60], [X0 - 40, H + 60]]), { gap: 15, lw: 4.8, ang: -0.05, wob: 2.6 }, 6);
    // 曲线：一条粗黑线，中间嵌一条纸色刀口
    WD.contour(g, f, C, 44, { seed: 19, color: WD.ink, boil: 0.8, prof: function () { return 1; } });
    WD.gouge(g, f, C, 13, { seed: 21, pw: 0.02, rough: 0.6 });
    // 拐点上那一刀（红版只描这一点）
    const kg = prog(f.t, f.from + 0.6, f.from + 1.7);
    if (kg > 0 && kg < 1) {
      g.save(); g.globalAlpha *= 1 - Math.abs(kg - 0.5) * 2;
      WD.gouge(g, f, [[tip[0] - 100, tip[1] - 70], [tip[0] + 26, tip[1] + 26], [tip[0] + 120, tip[1] + 118]], 9, { color: WD.red, seed: 25, pw: 0.3 });
      g.restore();
    }
    // 左边一把纵向的刻度（版画的坐标尺）
    WD.inkBar(g, f, 78, YTOP - 34, 46, YBOT - YTOP + 96, { seed: 31, jit: 2.2 });
    for (let i = 0; i <= 8; i++) {
      const y = YTOP - 12 + i * (YBOT - YTOP + 62) / 8;
      WD.gouge(g, f, [[84, y], [118 - (i % 2) * 16, y]], 8, { seed: 40 + i, pw: 0.3 });
    }
    // 起点的小标尺：歌词印在上面（高带）
    const id = MV.owner('scale');
    MV.within(id, function () {
      WD.inkBar(g, f, 190, 120, 1520, 172, { seed: 41, jit: 2.4 });
      for (let i = 0; i <= 25; i++) {
        const x = 210 + i * 58.4, long = i % 5 === 0;
        WD.gouge(g, f, [[x, 136], [x, 136 + (long ? 34 : 18)]], long ? 9 : 6, { seed: 60 + i, pw: 0.35 });
      }
      WD.lyric(g, f, { x: 250, y: 242, size: 44, align: 'left', mode: 'ink', color: WD.paper, dim: WD.warm, font: 'lbl', band: false, maxW: 1420 });
      // 从标尺拉到曲线起点的一条引线
      WD.contour(g, f, [[236, 292], [232, 340], [206, 368]], 3.4, { seed: 88, boil: 0.6, prof: function () { return 1; } });
    });
    MV.box(g, 190, 120, 1520, 172, { name: 'scale', pad: 16, owner: id });
    MV.focus(tip[0], tip[1], 'the knee');
    return {};
  },
});
})();
