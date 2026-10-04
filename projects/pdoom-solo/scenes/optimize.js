// optimize — 一个巨大的涡旋（同心排线）把画面里的东西一圈圈卷进去；被卷的东西越来越小。
// CAM.keep 让被卷的最外圈永远留在画里：最外圈越大，世界缩得越小（里面的东西跟着缩进涡心）。
// 低带 LABEL 44 px Menlo：印在涡旋外缘的版边上——画面下方那条实黑边不随世界缩。
(function () {
'use strict';
const CX = 960, CY = 470, R0 = 64, GAP = 60;

MV.scene('optimize', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0 });
    const k = prog(f.t, f.from, f.to, ease.linear);
    const outerR = lerp(300, 1500, ease.outCubic(k));
    const s = CAM.keep([[CX + outerR, CY], [CX - outerR, CY], [CX, CY + outerR * 0.78], [CX, CY - outerR * 0.78]],
      { anchor: [CX, CY], safe: [0.05 * W, 0.04 * H, 0.95 * W, 0.74 * H] });
    g.save(); g.translate(CX, CY); g.scale(s, s); g.translate(-CX, -CY);
    const rot = f.t * 0.42;
    const n = Math.min(26, Math.floor((outerR - R0) / GAP));
    for (let i = n; i >= 0; i--) {
      const r = R0 + i * GAP;
      if (r < 24) continue;
      const seg = Math.max(30, Math.round(r / 8));
      const wob = 5 + 4 * Math.sin(i * 1.7);
      g.save(); g.strokeStyle = WD.ink; g.lineWidth = 4 + (i % 3) * 1.7;
      g.beginPath();
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * Math.PI * 2;
        const rr = r + wob * Math.sin(a * 3 + rot + i * 0.7);
        const x = CX + Math.cos(a) * rr, y = CY + Math.sin(a) * rr * 0.78;
        if (j) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke(); g.restore();
    }
    // 被卷进去的东西：越靠里越小
    for (let i = 0; i < 14; i++) {
      const p = clamp(prog(f.t, f.from + i * 0.17, f.to + 0.5, ease.inCubic));
      const a0 = hash(i, 3) * Math.PI * 2;
      const r = lerp(420 + 720 * hash(i, 11), 26, p);
      const a = a0 + p * 8.2;
      const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r * 0.78;
      const sz = lerp(104, 12, p);
      if (i % 3 === 0) WD.figure(g, f, x, y + sz * 0.6, sz * 1.8, { lw: 1, seed: i * 7 });
      else WD.carve(g, f, [[x - sz / 2, y - sz / 2], [x + sz / 2, y - sz / 2], [x + sz / 2, y + sz / 2], [x - sz / 2, y + sz / 2]],
        { seed: 120 + i, jit: 1.5, holes: false });
    }
    // 涡心：一块实黑
    WD.carve(g, f, WD.circlePts(CX, CY, 46 + 26 * k, 20), { seed: 51, jit: 2.4, holes: false });
    g.restore();
    // 版边：画面下方一条实黑的边（不随世界缩），低带的小注印在上面
    WD.inkBar(g, f, -40, 820, W + 80, 200, { seed: 71, jit: 3.2 });
    g.save(); g.globalAlpha = 0.22;
    WD.hatch(g, f, [[-40, 820], [W + 40, 820], [W + 40, 1020], [-40, 1020]], { gap: 19, lw: 4, ang: 0.02, seed: 73, wob: 3 });
    g.restore();
    WD.lyric(g, f, { x: 230, y: 900, size: 44, align: 'left', mode: 'label', font: 'lbl', color: WD.paper, dim: WD.ghost, band: false, maxW: 1480 });
    MV.focus(CX, CY, 'vortex core');
    return {};
  },
});
})();
