// transformer — S35：一排等距的竖条（变压器 / 注意力），每两根之间用白线（刀口）连成完全图。
// 竖条是实黑、站在一条实黑横板上；连线是刻在黑里的白，交点就是这一镜的主角。低带 STRIP 84 px，屏幕层。
(function () {
'use strict';
const TBN = 7, TBX0 = 300, TBDX = 220, TBBW = 64, TBT = 240, TBB = 780;
const TBYT = 400, TBYB = 640;                       // 横板
const tbY = function (i) { return 428 + 168 * hash(i, 3); };
const tbX = function (i) { return TBX0 + i * TBDX; };

function tbSeg(a, b, c, d) {                        // 线段交点（没有就返回 null）
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-6) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + r[0] * t, a[1] + r[1] * t];
}
function tbBand(pts, w) {
  const A = [], B = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    A.push([pts[i][0] - dy * w / 2, pts[i][1] + dx * w / 2]);
    B.push([pts[i][0] + dy * w / 2, pts[i][1] - dx * w / 2]);
  }
  return A.concat(B.reverse());
}

MV.scene('transformer', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0 });
    // 横板：一块贯穿的实黑
    WD.carve(g, f, [[180, TBYT], [1740, TBYT], [1740, TBYB], [180, TBYB]], { seed: 5.2, jit: 3.4, seg: 60 });
    // 完全图：一根根长出来的白线
    let idx = 0, cross = null;
    for (let i = 0; i < TBN; i++) for (let j = i + 1; j < TBN; j++) {
      const k = prog(f.t, f.from + 0.12 + idx * 0.085, f.from + 0.62 + idx * 0.085, ease.outCubic);
      idx++;
      if (k <= 0) continue;
      const a = [tbX(i), tbY(i)], b = [tbX(j), tbY(j)];
      const m = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
      WD.gouge(g, f, [a, m], 7, { seed: 100 + i * 11 + j, pw: 0.18, rough: 0.7 });
      if (i === 0 && j === TBN - 1 && k > 0.995) cross = tbSeg(a, b, [tbX(1), tbY(1)], [tbX(TBN - 2), tbY(TBN - 2)]);
      // 沿线跑的蓝脉冲（位置只由 f.t 决定）
      const pu = ((f.t * 0.42 + idx * 0.31) % 1);
      if (k > pu) {
        const px = lerp(a[0], b[0], pu), py = lerp(a[1], b[1], pu);
        g.save(); g.fillStyle = WD.blue; g.beginPath(); g.arc(px, py, 7, 0, TAU); g.fill(); g.restore();
      }
    }
    // 竖条：每根在自己的纸缝里
    for (let i = 0; i < TBN; i++) {
      const x = tbX(i);
      WD.wipe(g, f, [[x - 38, TBYT - 6], [x + 38, TBYT - 6], [x + 38, TBYB + 6], [x - 38, TBYB + 6]], { seed: 20 + i, jit: 1.8, seg: 30 });
      WD.carve(g, f, [[x - 32, TBT], [x + 32, TBT], [x + 32, TBB], [x - 32, TBB]], { seed: 30 + i, jit: 2.6, seg: 40 });
      // 上半段是排线（中间调）
      WD.wipe(g, f, [[x - 30, TBT + 6], [x + 30, TBT + 6], [x + 30, TBT + 150], [x - 30, TBT + 150]], { seed: 40 + i, jit: 1.4, seg: 24 });
      WD.hatch(g, f, [[x - 30, TBT + 6], [x + 30, TBT + 6], [x + 30, TBT + 150], [x - 30, TBT + 150]], { gap: 11, lw: 4, ang: 0.5, wob: 1.2, seed: 50 + i });
    }
    // 交点：这一镜的主角
    const fx = cross ? cross[0] : 960, fy = cross ? cross[1] : 520;
    MV.focus(fx, fy, 'a crossing');
    MV.overlay(function (o) { o.fontKerning = 'none'; WD.lyric(o, f, { x: 960, y: 920, size: 84, maxW: 1520, align: 'center', mode: 'strip' }); });
    return null;
  },
});
})();