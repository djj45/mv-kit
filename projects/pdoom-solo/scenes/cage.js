// cage — 一只蓝色的手（刻出来的）从版里伸出来，攥着一根栏杆；栏杆是白刀口。
// 低带 CARVE 120 px：白字刻在栏杆下方的实黑里（场景层，WD.lyric 自己报 keep）。
(function () {
'use strict';
const BARS = [430, 700, 970, 1240, 1510];
MV.scene('cage', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0 });
    // 版：一整块实黑
    WD.carve(g, f, [[-40, -40], [W + 40, -60], [W + 40, H + 40], [-40, H + 40]], { seed: 2.6, jit: 6, seg: 120 });
    // 手从版里顶出来：先把这一块刻掉（纸色），再在上面排线（中间调）
    const HOLE = [[286, 386], [498, 318], [742, 344], [960, 392], [1016, 566], [986, 724], [742, 812], [498, 786], [312, 736]];
    WD.wipe(g, f, HOLE, { seed: 44, jit: 15, seg: 46 });
    WD.hatch(g, f, HOLE, { gap: 15, lw: 4.6, ang: 0.55, seed: 40, wob: 3.4 });
    // 栏杆：五根刻掉的白刀口
    for (let i = 0; i < BARS.length; i++) {
      const wob = 9 * Math.sin(f.t * 0.9 + i * 1.7) + 7 * f.a.kick;
      WD.gouge(g, f, [[BARS[i] + wob, 56], [BARS[i] - 5 + wob, 420], [BARS[i] + wob, 706]], 30, { seed: 10 + i, pw: 0.1, rough: 1.2 });
    }
    // 蓝色的手：攥住中间那根栏杆
    const curl = 0.85 + 0.12 * Math.sin(f.t * 1.3);
    const hx = 680 + 12 * Math.sin(f.t * 0.7), hy = 640 + 9 * Math.sin(f.t * 1.6 + 1);
    const ang = 0.06 + 0.03 * Math.sin(f.t * 0.8);
    WD.hand(g, f, hx, hy, 340, ang, { color: WD.blue, seed: 31, curl: curl });
    // 指尖（主角）
    const sc = 340 / 60, fl = 26 * sc * 0.82;
    const lx = 30 * sc + Math.cos(-0.1) * fl, ly = (-9 + 7.4) * sc + Math.sin(-0.1) * fl + curl * 12 * sc;
    const tipx = hx + Math.cos(ang) * lx - Math.sin(ang) * ly;
    const tipy = hy + Math.sin(ang) * lx + Math.cos(ang) * ly;
    // 手腕上那一刀（红版）
    g.save(); g.strokeStyle = WD.red; g.lineWidth = 4.5; g.globalAlpha = 0.85;
    g.beginPath(); g.moveTo(hx - 66, hy + 44); g.lineTo(hx - 12, hy + 26); g.stroke(); g.restore();
    MV.focus(tipx, tipy, 'fingertip');
    WD.lyric(g, f, { x: 960, y: 900, size: 120, align: 'center', mode: 'carve', band: false, color: WD.paper, maxW: 1660 });
    WD.cross(g, f, 150, 1016, 40, { lw: 2.4, color: WD.ghost, alpha: 0.7 });
    return {};
  },
});
})();
