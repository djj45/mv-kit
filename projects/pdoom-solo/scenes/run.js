// run — v1 "We had a stable training run,"：一条水平的实黑线横穿画面，线上每隔一段一个小刻度；
// 下面一个小人推着小车跟着线走，主角是小车的轮子。歌词（高带 CARVE 110 px）刻在线上方的实黑带里。
// v2 "But now the singularity's begun"：同一条线在画面中央炸成一个向上的螺旋（排线做的），
// 尖端一路往上长；CAM.keep 让尖端永远留在画面里。中带 STRIP 96 px 在屏幕层，warp 时钉住不动。
(function () {
'use strict';
const LINY = 560, FLOOR = 852;

function wheel(g, f, x, y, r) {
  WD.carve(g, f, WD.circlePts(x, y, r, 16), { seed: 33 + x * 0.01, jit: 1.8, holes: false });
  WD.wipe(g, f, WD.circlePts(x, y, r * 0.34, 12), { seed: 35 + x * 0.01, jit: 1.2 });
  g.save(); g.strokeStyle = WD.paper; g.lineWidth = 4; g.lineCap = 'round';
  const a0 = f.t * 3.4 + x * 0.01;
  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = a0 + i * Math.PI * 2 / 5;
    g.moveTo(x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22);
    g.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86);
  }
  g.stroke(); g.restore();
}

/** v2 的螺旋：一条由排线刷出来的、往上长的带子。返回尖端。 */
function spiral(g, f, k, CX, CY) {
  const TH = 4.7 * Math.PI * 2, N = 260;
  const at = function (u) {
    const th = u * TH * k;
    const r = 34 + 12.6 * th;
    return [CX + Math.cos(th) * r, CY - Math.sin(th) * r * 1.22 - 330 * u * k];
  };
  g.save(); g.strokeStyle = WD.ink; g.lineCap = 'butt';
  const m = Math.max(1, Math.round(N * k));
  for (let i = 0; i <= m; i++) {
    const u = i / N;
    const p0 = at(u), p1 = at(u + 1 / N);
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const w = 6 + 26 * u;
    g.lineWidth = 3.2 + 2.8 * u;
    g.beginPath();
    g.moveTo(p0[0] - dy * w, p0[1] + dx * w);
    g.lineTo(p0[0] + dy * w, p0[1] - dx * w);
    g.stroke();
  }
  g.restore();
  const edge = [], inn = [];
  for (let i = 0; i <= m; i += 2) {
    const u = i / N, p0 = at(u), p1 = at(Math.min(1, u + 1 / N));
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const w = 6 + 26 * u;
    edge.push([p0[0] - dy * w, p0[1] + dx * w]);
    inn.push([p0[0] + dy * w, p0[1] - dx * w]);
  }
  WD.contour(g, f, edge, 5.5, { seed: 77, boil: 1.1, prof: function () { return 1; } });
  WD.contour(g, f, inn, 3.4, { seed: 78, boil: 1.1, prof: function () { return 1; } });
  return at(1);
}

MV.scene('run', {
  render: function (g, f) {
    const v = (f.params && f.params.v) || 1;
    WD.ground(g, f, { ox: 0 });
    if (v === 1) {
      // 上面那块版：实黑带，歌词刻在里面（高带）
      WD.carve(g, f, [[-40, -40], [W + 40, -40], [W + 40, 322], [-40, 336]], { seed: 2.1, jit: 5, seg: 90 });
      WD.lyric(g, f, { x: 960, y: 240, size: 110, align: 'center', mode: 'carve', maxW: 1660, band: false, color: WD.paper });
      // 一条水平直线横穿画面：实黑带 + 每隔一段一个小刻度
      const u = prog(f.t, f.from, f.to, ease.inOutQuad);
      WD.carve(g, f, [[-40, LINY - 42], [W + 40, LINY - 38], [W + 40, LINY + 40], [-40, LINY + 44]], { seed: 3.3, jit: 3, seg: 70 });
      for (let i = 0; i < 24; i++) {
        const long = i % 4 === 0;
        WD.gouge(g, f, [[60 + i * 78, LINY - 30], [60 + i * 78, LINY - 30 + (long ? 40 : 22)]], long ? 9 : 6, { seed: 20 + i, pw: 0.35 });
      }
      // 地面线
      WD.inkBar(g, f, -40, FLOOR, W + 80, 16, { seed: 5, jit: 2 });
      // 小人推着小车：一路往右
      const cx = 300 + u * 1180;
      WD.carve(g, f, [[cx, 652], [cx + 212, 640], [cx + 212, 748], [cx, 760]], { seed: 31, jit: 2.4 });
      WD.gouge(g, f, [[cx + 26, 700], [cx + 190, 694]], 9, { seed: 32, pw: 0.3 });
      wheel(g, f, cx + 56, 798, 52);
      wheel(g, f, cx + 168, 798, 52);
      const bob = 3 * Math.abs(Math.sin(f.tq * 4.2));
      WD.figure(g, f, cx - 74, FLOOR - 2 - bob, 250, { pose: { lean: 0.16, leg: Math.sin(f.tq * 4.2) * 0.3, arms: [[2.54, 2.84], [0.6, 0.3]] }, lw: 1.15 });
      MV.focus(cx - 74, 700, 'pusher');
      MV.focus(cx + 168, 798, 'cart wheel');
    } else {
      // 同一条线，现在在画面中央
      WD.carve(g, f, [[-40, 700 - 34], [W + 40, 700 - 30], [W + 40, 700 + 34], [-40, 700 + 38]], { seed: 3.3, jit: 3, seg: 70 });
      for (let i = 0; i < 22; i++) WD.gouge(g, f, [[70 + i * 84, 700 - 24], [70 + i * 84, 700 - 24 + (i % 4 === 0 ? 34 : 18)]], 7, { seed: 40 + i, pw: 0.35 });
      const k = prog(f.t, f.from + 0.15, f.to - 0.1, ease.outCubic);
      const tip0 = spiral(g, f, k, 960, 700);
      const s = CAM.keep([tip0], { anchor: [960, 700], safe: [0.06 * W, 0.05 * H, 0.94 * W, 0.93 * H] });
      // 炸开的碎片：从线上飞出去的黑方块
      for (let i = 0; i < 10; i++) {
        const kk = prog(f.t, f.from + 0.15 + i * 0.06, f.to, ease.outCubic);
        if (kk <= 0) continue;
        const a = -1.9 + i * 0.38, r = 260 * kk;
        const x = 960 + Math.cos(a) * r, y = Math.min(756, 700 + Math.sin(a) * r * 0.8);
        const sz = 30 * (1 - 0.6 * kk);
        WD.carve(g, f, [[x - sz, y - sz], [x + sz, y - sz], [x + sz, y + sz], [x - sz, y + sz]], { seed: 90 + i, jit: 1.6, holes: false });
      }
      const tip = [960 + (tip0[0] - 960) * s, 700 + (tip0[1] - 700) * s];
      MV.focus(tip[0], tip[1], 'spiral tip');
      // 线以下的纸是空的：歌词放这里，不压螺旋也不压那条线
      MV.overlay(function (o) { WD.lyric(o, f, { x: 960, y: 960, size: 92, align: 'center', mode: 'strip', maxW: 1660 }); });
    }
    return {};
  },
});
})();