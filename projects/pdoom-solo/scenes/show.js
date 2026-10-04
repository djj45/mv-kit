// show — 歌词行 45 "Was it all for show?"（137.06–140.24）。
// 只有歌词的画面：一张完全印白的纸。只有一行字压在上面，右边一个红版的印章（"已印"）。
// 纸在压印台上极慢地滑（极慢横移），上一版压出来的盲压痕跟着走；右上角慢慢地卷起来，露出下面的台面。
// 字：低带 MONUMENT 200 px，屏幕层。
(function () {
'use strict';
const SH = { STAMP: [1620, 570, 132], LYRIC: [960, 920] };

MV.scene('show', {
  render: function (g, f) {
    const sl = 14 * f.lt;                       // 纸在台上极慢地滑
    WD.ground(g, f, { ox: sl, oy: sl * 0.35, grain: 0.14, grainGap: 44 });
    const pt = f.audio.nearestBeat(139.1);      // 印章落在拍上
    const pk = Math.sin(Math.PI * clamp((f.t - pt) / 0.34));
    const stampY = SH.STAMP[1] + 13 * pk;

    g.save();
    g.translate(sl, sl * 0.35);

    // 上一版压出来的盲压痕（没上墨）：一圈 ghost 排线，正在慢慢地走
    const ix = 200, iy = 118, iw = 1300, ih = 604, it = 15;
    const ring = [[ix, iy], [ix + iw, iy], [ix + iw, iy + ih], [ix, iy + ih],
                  [ix + it, iy + ih - it], [ix + iw - it, iy + ih - it], [ix + iw - it, iy + it], [ix + it, iy + it]];
    g.save(); g.globalAlpha = 0.5;
    WD.hatch(g, f, ring, { gap: 17, lw: 9.5, ang: -0.05, color: WD.ghost, seed: 6, wob: 2.4 });
    g.restore();

    // 底边的版边刻度（跟着纸一起滑）
    g.save(); g.strokeStyle = WD.ink; g.globalAlpha = 0.65; g.lineWidth = 3;
    for (let i = -2; i < 42; i++) {
      const x = i * 48 + (sl * 1.5) % 48;
      const hh = (i % 5 === 0) ? 34 : 18;
      g.beginPath(); g.moveTo(x, 1062); g.lineTo(x, 1062 - hh); g.stroke();
    }
    g.beginPath(); g.moveTo(0, 1062); g.lineTo(W, 1062); g.stroke();
    g.restore();

    // 印章按下以后留在纸上的那一次淡红（错开，像又印了一次没对准）
    const imp = prog(f.t, pt + 0.06, pt + 0.30);
    if (imp > 0) {
      const R = SH.STAMP[2];
      g.save(); g.globalAlpha = 0.28 * imp;
      g.strokeStyle = WD.red; g.lineWidth = 9;
      g.strokeRect(SH.STAMP[0] - R + 11, stampY - R - 8, 2 * R, 2 * R);
      g.restore();
    }

    // 红版的印章：红方框 + 已印（框用 MV.box 登记，字和框在同一个 MV.group 里）
    MV.group('stamp', function () {
      g.save();
      g.translate(SH.STAMP[0], stampY);
      g.rotate(-0.07);
      const R = SH.STAMP[2], t = 18;
      WD.carve(g, f, [[-R, -R], [R, -R], [R, -R + t], [-R, -R + t]], { color: WD.red, jit: 1.5, seed: 3, holes: false });
      WD.carve(g, f, [[-R, R - t], [R, R - t], [R, R], [-R, R]], { color: WD.red, jit: 1.5, seed: 4, holes: false });
      WD.carve(g, f, [[-R, -R], [-R + t, -R], [-R + t, R], [-R, R]], { color: WD.red, jit: 1.5, seed: 5, holes: false });
      WD.carve(g, f, [[R - t, -R], [R, -R], [R, R], [R - t, R]], { color: WD.red, jit: 1.5, seed: 6, holes: false });
      MV.box(g, -R, -R, 2 * R, 2 * R, { name: 'stamp', pad: 22 });
      BOX.text(g, '已印', 0, 0, { size: 80, font: WD.F.ly, color: WD.red, align: 'center', base: 'middle', maxW: 2 * (R - t) - 40 });
      g.restore();
    });

    // 纸从上面被掀开一条：上面露出压印台（排线），掀起来的那条边卷成一道卷边（这一镜一直在动的地方）
    const P = 36 + 264 * ease.inOutQuad(f.p);
    const edge = [];
    for (let x = -40; x <= W + 40; x += 48) edge.push([x, P + 15 * noise1(x * 0.0062 + 2, 21) + 6 * noise1(x * 0.023, 22)]);
    const low = edge.map(function (p) { return [p[0] + 3, p[1] + 46]; });
    const bed = [[-40, -60], [W + 40, -60]].concat(edge.slice().reverse());
    WD.wipe(g, f, bed, { seed: 11, jit: 2.0, color: WD.paper });
    WD.hatch(g, f, bed, { gap: 14, lw: 5.4, ang: -0.06, seed: 4, wob: 2.6 });
    const curl = edge.concat(low.slice().reverse());
    WD.wipe(g, f, curl, { seed: 12, jit: 1.6, color: WD.paper });
    WD.hatch(g, f, curl, { gap: 12, lw: 3.2, ang: 0.05, seed: 15, alpha: 0.55, wob: 1.6 });
    WD.contour(g, f, edge, 4.6, { seed: 13, boil: 0.8, prof: function () { return 1; } });
    WD.contour(g, f, low, 3.4, { seed: 16, boil: 0.8, prof: function () { return 1; } });

    g.restore();

    MV.focus(SH.STAMP[0] + sl, stampY + sl * 0.35, 'stamp');
    MV.overlay(function (o) {
      WD.lyric(o, f, { x: SH.LYRIC[0], y: SH.LYRIC[1], size: 200, font: 'big', align: 'center', mode: 'mono', band: false, color: WD.ink, dim: WD.ghost, maxW: 1640 });
    });
    return { shake: 9 * pulse(f.t, pt, 0.24) };
  },
});
})();
