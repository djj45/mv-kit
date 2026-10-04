// dense — S37：排线越来越密：从左到右组距从 14 px 收到 4 px，右边糊成实黑，黑边一路往左吃。
// 歌词低带 LABEL 34 px（Menlo）印在左下角的密度刻度上。
(function () {
'use strict';
const DNX0 = 40, DNX1 = 1880, DNY0 = 40, DNY1 = 1010, DNSEG = 34;

MV.scene('dense', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0 });
    const boil = f.tick * 0.41;
    // 排线场：组距从左到右收 14 → 4
    for (let i = 0; i < DNSEG; i++) {
      const ax = DNX0 + i * (DNX1 - DNX0) / DNSEG, bx = DNX0 + (i + 1) * (DNX1 - DNX0) / DNSEG;
      const gap = lerp(14, 4, i / (DNSEG - 1));
      WD.hatch(g, f, [[ax, DNY0], [bx, DNY0], [bx, DNY1], [ax, DNY1]], { gap: gap, lw: Math.max(2.2, gap * 0.32), ang: Math.PI / 2, wob: 1.8, seed: 10 + i + boil });
    }
    // 右边糊成实黑，参差的黑边一路往左吃
    const edge = lerp(1710, 1140, ease.inOutQuad(f.p));
    const P = [[DNX1 + 90, DNY0 - 60]];
    for (let i = 0; i <= 10; i++) {
      const y = DNY0 - 60 + (DNY1 + 80 - DNY0 + 60) * i / 10;
      P.push([edge + hash(i, 5) * 110 - (i % 2 ? 66 : 0), y]);
    }
    P.push([DNX1 + 90, DNY1 + 80]);
    WD.carve(g, f, P, { seed: 21.7 + f.tick * 0.19, jit: 5.5, seg: 76 });
    // 密度刻度：一张纸牌 + 一排越来越密的刻度 + 这一句
    const L = f.lyrics.lineAt(f.to - 0.02, f.from);
    let tw = 560;
    if (L) { WD.F.lbl(g, 34); tw = g.measureText(L.text).width; }
    const sx = 118, sw = Math.min(1500, tw + 148), sy = 796, sh = 208;
    WD.wipe(g, f, [[sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh]], { seed: 31.3, jit: 2.6, seg: 46 });
    WD.contour(g, f, [[sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh], [sx, sy]], 3.2, { seed: 33.1, boil: 0.5, prof: function () { return 1; } });
    for (let i = 0; i < 27; i++) {
      const u = Math.pow(i / 26, 0.72);
      const x = sx + 30 + u * (sw - 62);
      const long = i % 9 === 0;
      g.save(); g.fillStyle = WD.ink;
      g.beginPath();
      g.moveTo(x - 1.8, sy + sh - 20); g.lineTo(x + 1.8, sy + sh - 20);
      g.lineTo(x + 1.2, sy + sh - 20 - (long ? 56 : 30)); g.lineTo(x - 1.2, sy + sh - 20 - (long ? 56 : 30));
      g.closePath(); g.fill(); g.restore();
    }
    BOX.text(g, '14', sx + 30, sy + sh - 84, { size: 30, font: function (gg, k) { WD.F.lbl(gg, k); }, color: WD.ink, align: 'left' });
    BOX.text(g, '4', sx + sw - 34, sy + sh - 84, { size: 30, font: function (gg, k) { WD.F.lbl(gg, k); }, color: WD.ink, align: 'right' });
    WD.lyric(g, f, { x: sx + 42, y: 866, size: 34, align: 'left', maxW: sw - 84, font: 'lbl', mode: 'label', color: WD.ink, dim: WD.ghost });
    MV.focus(edge + 24, 560, 'the edge of the densest part');   // 主角：最密处的边缘
    return null;
  },
});
})();
