// flops — S22（v1）/ S23（v2）：一把巨大的刻度尺横穿画面。
// v1：指针一路往右扫，歌词用 Menlo 44 px 印在刻度尺的游标牌上（游标牌 + 字放同一个 MV.group，牌用 MV.box 登记）；
// v2：同一把尺子，指针冲过最后一条刻度、停在断口右边的空气里，尺子尽头是断的（纸色锯齿刀口 + 红版描的刀口）。
(function () {
'use strict';
const FRY0 = 604, FRY1 = 792, FRXA = -90, FRXB = 2010, FRTK = 60;

/** 刻掉的白刻度：V 形小口 */
function fpTick(g, x, y, len, w, seed) {
  const j = noise1(x * 0.031 + seed, 3) * 1.7;
  g.save(); g.fillStyle = WD.paper; g.beginPath();
  g.moveTo(x - w * 0.5 + j, y);
  g.lineTo(x + w * 0.5 + j, y);
  g.lineTo(x + w * 0.24 + j * 1.3, y + len);
  g.lineTo(x - w * 0.24 + j * 1.3, y + len);
  g.closePath(); g.fill(); g.restore();
}
/** 尺身：一条横穿画面的实黑；jag = 尽头是断口（纸色的锯齿边） */
function fpRuler(g, f, xEnd, jag) {
  const P = [[FRXA, FRY0], [xEnd, FRY0]];
  if (jag) {
    let y = FRY0, k = 0;
    while (y < FRY1 - 8) {
      y = Math.min(FRY1, y + 20 + hash(k, 7) * 30);
      P.push([xEnd - 8 - hash(k, 11) * 54, y]); k++;
    }
  } else P.push([xEnd, FRY1]);
  P.push([FRXA, FRY1]);
  WD.carve(g, f, P, { seed: 4.1, jit: 3.2, seg: 66 });
}
/** 尺上刻的标度：一排小刻度，每 5 条一根长刻度 + 一个 Menlo 数字（纸色刻在黑里） */
function fpScale(g, f, xEnd) {
  for (let i = 0; ; i++) {
    const x = FRXA + 34 + i * FRTK;
    if (x > xEnd - 30) break;
    const big = i % 5 === 0;
    fpTick(g, x, FRY0, big ? 56 : 26, big ? 7.5 : 5, i * 0.73);
    if (big) BOX.center(g, '1E' + (20 + 2 * (i / 5)), x, 726, { size: 34, font: function (gg, k) { WD.F.lbl(gg, k); }, color: WD.paper });
  }
}
/** 指针：从上方垂下来的黑针，针尖在 tipY，针尖一段走红版 */
function fpNeedle(g, f, nx, tipY) {
  WD.carve(g, f, [[nx - 11, 302], [nx + 11, 302], [nx + 4.6, tipY - 52], [nx, tipY]], { seed: 8.2, jit: 1.0, holes: false, seg: 34 });
  g.save(); g.fillStyle = WD.red; g.beginPath();
  g.moveTo(nx - 4.4, tipY - 52); g.lineTo(nx + 4.4, tipY - 52); g.lineTo(nx, tipY);
  g.closePath(); g.fill(); g.restore();
  WD.carve(g, f, WD.circlePts(nx, 296, 19, 14), { seed: 9.5, jit: 1.2, holes: false });
}

MV.scene('flops', {
  render: function (g, f) {
    const v = (f.params && f.params.v) || 1;
    WD.ground(g, f, { ox: 0, oy: 0 });
    const q = noise1(f.tq * 3.1, 17);                       // 一拍二的抖动
    const xEnd = v === 1 ? FRXB : 1596;
    // 尺子压在纸上的墨影：一条排线
    WD.hatch(g, f, [[FRXA, FRY1 - 6], [xEnd + 60, FRY1 - 6], [xEnd + 60, FRY1 + 52], [FRXA, FRY1 + 52]], { gap: 13, lw: 4.2, ang: -0.05, alpha: 0.8, seed: 6 });
    fpRuler(g, f, xEnd, v !== 1);
    fpScale(g, f, xEnd);

    if (v === 1) {
      // 游标牌：这一句印在上面
      const L = f.lyrics.lineAt(f.to - 0.02, f.from);
      let tw = 470;
      if (L) { WD.F.lbl(g, 44); tw = g.measureText(L.text).width; }
      const pw = tw + 92, ph = 142, py = 826;
      const nx = lerp(566, 1354, ease.inOutQuad(f.p)) + q * 2.6;
      const cx = clamp(nx, 112 + pw / 2, W - 112 - pw / 2);
      fpNeedle(g, f, cx, FRY0);
      MV.group('vernier', function () {
        MV.box(g, cx - pw / 2, py, pw, ph, { name: 'vernier' });
        WD.wipe(g, f, [[cx - pw / 2, py], [cx + pw / 2, py], [cx + pw / 2, py + ph], [cx - pw / 2, py + ph]], { seed: 21.3, jit: 2.2, seg: 46 });
        g.save(); g.fillStyle = WD.red;                // 游标的红头 + 指上去的红三角
        g.beginPath(); g.moveTo(cx - 21, py + 42); g.lineTo(cx + 21, py + 42); g.lineTo(cx, py - 18); g.closePath(); g.fill();
        g.fillRect(cx - pw / 2, py + 2, pw, 6); g.restore();
        WD.contour(g, f, [[cx - pw / 2, py], [cx + pw / 2, py], [cx + pw / 2, py + ph], [cx - pw / 2, py + ph], [cx - pw / 2, py]], 3.4, { seed: 33.7, boil: 0.5, prof: function () { return 1; } });
        WD.lyric(g, f, { x: cx, y: 896, size: 44, align: 'center', maxW: tw + 26, font: 'lbl', mode: 'label', color: WD.ink, dim: WD.ghost });
      });
      MV.focus(cx, FRY0 - 10, 'needle tip');
    } else {
      const arrive = f.from + 1.3;
      const k = prog(f.t, f.from, arrive, ease.outCubic);
      let nx = lerp(1360, 1716, k);
      if (f.t > arrive) nx += Math.sin((f.t - arrive) * 7.2) * 8 * Math.exp(-(f.t - arrive) * 1.9) + q * 1.6;
      for (let i = 0; i < 3; i++)                        // 断口上的红刀口
        WD.gouge(g, f, [[xEnd - 6, 622 + i * 56], [xEnd - 48, 646 + i * 56], [xEnd - 2, 674 + i * 56]], 9, { color: WD.red, seed: 71 + i, pw: 0.4 });
      fpNeedle(g, f, nx, FRY0);
      for (let i = 0; i < 8; i++) {                      // 断口崩下来的黑屑，一直在掉
        const kk = prog(f.t, arrive + 0.1 + i * 0.2, f.to + 0.8, ease.inQuad);
        if (kk <= 0) continue;
        const bx = xEnd - 26 + hash(i, 3) * 150, by = 620 + hash(i, 5) * 150;
        const x = bx + kk * (16 + hash(i, 9) * 70), y = by + kk * kk * 470, s = 7 + hash(i, 13) * 9;
        WD.carve(g, f, [[x - s, y - s * 0.7], [x + s * 0.8, y - s], [x + s, y + s * 0.6], [x - s * 0.6, y + s]], { seed: 40 + i, jit: 0.8, holes: false });
      }
      MV.focus(nx, FRY0 - 10, 'needle tip');
      MV.focus(xEnd - 22, 700, 'broken end');            // 主角：断口
      MV.overlay(function (o) {
        WD.lyric(o, f, { x: 960, y: 556, size: 84, maxW: 1520, align: 'center', mode: 'strip' });
      });
    }
    return null;
  },
});
})();
