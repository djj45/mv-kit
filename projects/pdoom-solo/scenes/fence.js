// fence — 歌词行 37 "Breaking through each safety fence"（116.61–118.76）。
// 一道黑版印出来的安全栅栏：栏杆和立柱是白刀口"刻掉"出来的（白 = 被刻走的地方），红版在上面描警示条。
// 中间被撞开一个纸色的缺口，黑的一大团正从缺口里挤出来——每挤一次缺口就被撑大一圈；下面一档交叉排线当地。
// snare 上整团窜一下、画面跟着震（render 返回 shake）。字：高带 CARVE 110 px，刻在缺口上方的黑里。
(function () {
'use strict';
const FE_TOP = 640, FE_BOT = 882, FE_GX = 1000, FE_GY = 868;

/** 会呼吸的一团黑：径向量噪声。tq 定边缘抖动（一拍二的手刻边），wob 定参差程度。 */
function feBlob(cx, cy, rx, ry, seed, tq, wob) {
  const P = [], n = 46;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const k = 1 + wob * noise1(i * 1.9 + tq * 2.7, seed) + wob * 0.5 * noise1(i * 5.1 + tq * 1.4, seed + 7);
    P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return P;
}

MV.scene('fence', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0, grain: 0.13, grainGap: 48 });
    const grow = clamp(0.24 + 0.82 * f.p + 0.10 * f.a.snare, 0, 1.12);
    const shake = 12 * f.a.snare;
    const bj = shake * 0.5;
    const T = FE_TOP, B = FE_BOT;
    const hw = 172 + 152 * grow;
    const nx0 = FE_GX - hw, nx1 = FE_GX + hw;

    // 缺口：把黑带上缘咬掉一块，边缘是手刻的参差（每张画抖一次）
    const nz = [
      [nx0, T + 4 * noise1(f.tq * 0.7, 11) + bj],
      [nx0 + 34 + 13 * noise1(f.tq, 12), T + 112],
      [nx0 - 4 + 14 * noise1(f.tq, 13), T + 176],
      [nx0 + 72, FE_GY - 8],
      [nx1 - 86, FE_GY + 4],
      [nx1 + 2 + 14 * noise1(f.tq, 14), T + 148],
      [nx1 - 38 + 12 * noise1(f.tq, 15), T + 94],
      [nx1, T + 6 * noise1(f.tq * 0.7, 16) + bj],
    ];
    const band = [[-40, T + bj]].concat(nz, [[W + 40, T + bj], [W + 40, B + 8], [-40, B + 8]]);
    WD.carve(g, f, band, { seed: 4.2, jit: 2.8, seg: 62, holeA: 0.42 });
    // 栅栏下面那一档中间调：交叉排线的地
    WD.crosshatch(g, f, [[-40, B], [W + 40, B], [W + 40, H + 40], [-40, H + 40]],
      { gap: 18, lw: 4.2, ang: -0.14, wob: 3.4 }, 6);

    // 立柱（白刀口）
    for (let x = -30; x < W + 40; x += 96) {
      const xx = x + 4 * noise1(f.tq * 0.9 + x * 0.02, 21);
      if (xx > nx0 - 52 && xx < nx1 + 52) continue;
      WD.gouge(g, f, [[xx, B - 6 + bj], [xx + 3 * noise1(f.tq, 22), (T + B) / 2], [xx, T + 10 + bj]], 17,
        { seed: 30 + x * 0.01, pw: 0.08, rough: 0.5 });
    }
    // 上下两根横杆：到缺口处断掉，断口参差
    for (let r = 0; r < 2; r++) {
      const y = 716 + r * 92;
      for (const sg of [[-40, nx0 + 20], [nx1 - 20, W + 40]]) {
        const pts = [];
        for (let x = sg[0]; x <= sg[1]; x += 70) pts.push([x, y + 5 * noise1(x * 0.011, 41 + r) + bj]);
        pts.push([sg[1], y + 7 * noise1(f.tq, 43 + r) + bj]);
        WD.gouge(g, f, pts, 22, { seed: 44 + r, pw: 0.1, rough: 0.6 });
      }
    }
    // 红版：栅栏上的警示条（错开 4 px，像套印没对准）
    for (let x = 20; x < W; x += 96) {
      if (x > nx0 - 24 && x < nx1 + 24) continue;
      WD.carve(g, f, [[x + 4, T + 16 + bj], [x + 34, T + 14 + bj], [x + 32, T + 76], [x + 2, T + 78]],
        { color: WD.red, jit: 1.6, seed: 50 + x * 0.01, holes: false });
    }
    // 缺口两侧的红：刚被撞开的刀口
    const inner = nz.map(function (p, i) { return [p[0] + 15, p[1] + (i % 2 ? 9 : -5)]; });
    WD.carve(g, f, nz.concat(inner.reverse()), { color: WD.red, jit: 1.8, seed: 61, holes: false });
    const inner2 = nz.map(function (p, i) { return [2 * FE_GX - p[0] - 15, p[1] + (i % 2 ? -5 : 9)]; });
    const nz2 = nz.map(function (p) { return [2 * FE_GX - p[0], p[1]]; }).reverse();
    WD.carve(g, f, nz2.concat(inner2), { color: WD.red, jit: 1.8, seed: 63, holes: false });

    // 断口上还翘着几根断掉的立柱（白刀口），歪着指向外面
    for (let i = 0; i < 3; i++) {
      const s = i === 0 ? -1 : 1, ex = s < 0 ? nx0 + 10 : nx1 - 10;
      const a = (s < 0 ? -2.5 : -0.64) + 0.22 * i + 0.1 * noise1(f.tq + i, 25);
      const len = 150 + 70 * hash(i, 3) + 60 * grow;
      WD.gouge(g, f, [[ex, T + 40 + 30 * i], [ex + Math.cos(a) * len * 0.6, T + 40 + 30 * i + Math.sin(a) * len * 0.6],
        [ex + Math.cos(a) * len, T + 40 + 30 * i + Math.sin(a) * len]], 15, { seed: 26 + i, pw: 0.14, rough: 0.7 });
    }

    // 黑的一大团：先铺一圈排线（中间调的边），再压实黑；它是从缺口里挤上来的一根柱
    const mcx = FE_GX + 14 * Math.sin(f.t * 1.1), mcy = 706 - 258 * grow + 22 * noise1(f.tq * 0.8, 4);
    const mrx = 122 + 132 * grow, mry = 196 + 238 * grow;
    WD.hatch(g, f, feBlob(mcx, mcy, mrx * 1.11, mry * 1.13, 3, f.tq, 0.14),
      { gap: 14, lw: 4.4, ang: -0.22, seed: 5, wob: 3 });
    WD.carve(g, f, feBlob(mcx, mcy, mrx, mry, 8, f.tq, 0.13), { seed: 8, jit: 3.6, seg: 74, holeA: 0.4 });

    // 从缺口崩出来的白色碎屑：每记 snare 一批（位置只由 t 决定）
    const ev = f.audio.events('snare', f.from - 0.05, f.to);
    for (let i = 0; i < ev.length; i++) {
      const tau = f.t - ev[i].t;
      if (tau < 0 || tau > 1.0) continue;
      for (let k = 0; k < 5; k++) {
        const h1 = hash(i * 11 + k, 3), h2 = hash(i * 11 + k, 5), h3 = hash(i * 11 + k, 9);
        const a = -0.5 - h3 * 1.3, sp = 340 + h2 * 460;
        const x = FE_GX + (h1 - 0.5) * 150 + Math.cos(a) * sp * tau;
        const y = FE_GY - 30 + Math.sin(a) * sp * tau + 820 * tau * tau;
        const w = 24 + h2 * 34;
        WD.gouge(g, f, [[x - w, y + 3], [x, y - 10], [x + w, y]], 11, { seed: 60 + i * 11 + k, pw: 0.3 });
      }
    }

    MV.focus(FE_GX, FE_GY - 70, 'gap');
    // 高带 CARVE：白字刻在缺口上方的黑里（自带一条实黑底带，和黑团连成一片）
    WD.lyric(g, f, { x: 960, y: 330, size: 110, maxW: 1700, align: 'center', mode: 'carve' });
    return { shake: shake };
  },
});
})();
