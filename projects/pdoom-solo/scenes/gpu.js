// gpu — 歌词行 38 / 39 共用一片阵列。
// v1（118.76–120.70）"Hundred thousand GPU"：俯视一片芯片阵列（蓝墨方块 + Menlo 编号），
//   中间留一条走线槽给字；insert 从 +1.0 s 起 2.4 s 推 60%，跟着编号最亮的那一块。
//   字：中带 TYPE 96 px，屏幕层（屏幕层才不会被 keep 框钳住 insert）。
// v2（120.70–124.34）"RLHF goes askew"：同一片阵列，编号开始跳错、方块一块块被刻掉留白，
//   一根指针慢慢歪进红区。字：低带 STRIP 84 px，屏幕层。
(function () {
'use strict';
const GP = { PX: 208, PY: 172, CW: 110, CH: 86, OX: -74, OY: -52, COLS: 12, ROWS: 9, LANE: [464, 736], HERO: [5, 2] };

function gpRect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
/** 这块芯片这一拍显示哪个号（v2：hash 决定，越到后面跳得越乱）。 */
function gpNum(id, bi, v2) {
  if (!v2) return 'G' + (1000 + id * 7);
  return hash(id, bi, 7) < 0.34 ? 'G' + (100 + Math.floor(hash(id, bi, 11) * 9900)) : 'G' + (1000 + id * 7);
}

MV.scene('gpu', {
  render: function (g, f) {
    const v = (f.params && f.params.v) || 1;
    WD.ground(g, f, { ox: 0, oy: 0, grain: 0.11, grainGap: 52 });
    const dx = 30 * Math.sin(f.t * 0.42), dy = 16 * Math.sin(f.t * 0.31 + 1.1);
    const bi = Math.floor(f.beat);
    const hx = GP.OX + GP.HERO[0] * GP.PX + dx + GP.CW / 2;
    const hy = GP.OY + GP.HERO[1] * GP.PY + dy + GP.CH * 0.42;

    // 走线槽：v1 给字留的那条通道（两边的淡线是它的边）
    if (v === 1) {
      g.save(); g.globalAlpha = 0.4;
      for (const yy of GP.LANE) WD.contour(g, f, [[-20, yy], [W + 20, yy]], 2.6, { color: WD.ghost, seed: 200 + yy, boil: 0.4, prof: function () { return 1; } });
      g.restore();
    }

    for (let r = 0; r < GP.ROWS; r++) {
      for (let c = 0; c < GP.COLS; c++) {
        const x = GP.OX + c * GP.PX + dx;
        const y = GP.OY + r * GP.PY + dy + 3 * Math.sin(f.t * 1.1 + hash(c * 31 + r, 5) * 6);
        if (x > W + 40 || x + GP.CW < -40 || y > H + 40 || y + GP.CH < -40) continue;
        if (v === 1 && y + GP.CH > GP.LANE[0] && y < GP.LANE[1]) continue;      // 槽里不放芯片
        const id = r * GP.COLS + c;
        const isHero = (c === GP.HERO[0] && r === GP.HERO[1]);
        const gone = v === 2 && !isHero && hash(id, 23) < 0.10 + 0.52 * f.p;
        if (gone) {                                                             // 被刻掉的那块：只剩纸和一个轮廓
          WD.contour(g, f, gpRect(x, y, GP.CW, GP.CH), 3.2, { color: WD.ghost, seed: 90 + id, boil: 0.7, prof: function () { return 1; } });
          continue;
        }
        WD.carve(g, f, gpRect(x, y, GP.CW, GP.CH), { color: WD.blue, seed: id * 3.1, jit: 1.6, holes: false });
        // 引脚：四个小黑块（蓝块之间的黑，是这一版的黑）
        WD.carve(g, f, gpRect(x + 14, y - 9, 24, 9), { seed: id + 3, jit: 0.8, holes: false });
        WD.carve(g, f, gpRect(x + GP.CW - 38, y - 9, 24, 9), { seed: id + 5, jit: 0.8, holes: false });
        WD.carve(g, f, gpRect(x + 14, y + GP.CH, 24, 9), { seed: id + 7, jit: 0.8, holes: false });
        WD.carve(g, f, gpRect(x + GP.CW - 38, y + GP.CH, 24, 9), { seed: id + 9, jit: 0.8, holes: false });
        if (isHero) {                                                           // 最亮的那一块：黑框 + 红角
          WD.contour(g, f, gpRect(x - 5, y - 5, GP.CW + 10, GP.CH + 10), 6.5, { color: WD.ink, seed: 71, boil: 0.6, prof: function () { return 1; } });
          WD.carve(g, f, gpRect(x + GP.CW - 34, y - 5, 34, 13), { color: WD.red, jit: 1.2, seed: 73, holes: false });
        }
        const num = gpNum(id, bi, v === 2);
        const lit = isHero || (v === 2 && hash(id, bi, 13) < 0.12);
        BOX.center(g, num, x + GP.CW / 2, y + GP.CH * 0.48, { size: isHero ? 32 : 26, font: WD.F.lbl, color: WD.paper, alpha: lit ? 1 : 0.5 });
      }
    }

    if (v === 1) {
      MV.focus(hx, hy, 'brightest chip');
      MV.overlay(function (o) {
        WD.lyric(o, f, { x: 960, y: 636, size: 96, align: 'center', mode: 'type', color: WD.ink, maxW: 1700, drop: 50 });
      });
    } else {
      // 指针：从阵列里挖出一个圆的纸面，一圈刻度、一段红区，指针一路歪进红区
      const cx = 1424, cy = 396, R = 236;
      WD.wipe(g, f, WD.circlePts(cx, cy, R, 56), { seed: 41, jit: 3.2 });
      WD.contour(g, f, WD.circlePts(cx, cy, R, 56), 6.5, { seed: 42, boil: 0.6, prof: function () { return 1; } });
      g.save(); g.globalAlpha = 0.7;
      WD.contour(g, f, WD.circlePts(cx, cy, R - 26, 48), 2.6, { color: WD.ghost, seed: 43, boil: 0.5, prof: function () { return 1; } });
      g.restore();
      for (let i = 0; i < 24; i++) {
        const a = -Math.PI * 0.78 + i / 24 * Math.PI * 1.56;
        const r0 = R - 20, r1 = R - (i % 4 === 0 ? 48 : 34);
        WD.contour(g, f, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]],
          i % 4 === 0 ? 5 : 2.6, { seed: 50 + i, boil: 0.5, prof: function () { return 1; } });
      }
      const arc = [];
      for (let i = 0; i <= 8; i++) { const a = -0.44 + i / 8 * 0.88; arc.push([cx + Math.cos(a) * (R - 62), cy + Math.sin(a) * (R - 62)]); }
      WD.gouge(g, f, arc, 32, { color: WD.red, seed: 55, pw: 0.12 });
      const ang = -1.34 + 1.02 * ease.inOutQuad(f.p) + 0.10 * f.a.snare + 0.02 * noise1(f.tq * 0.8, 9);
      const nl = R - 36;
      const tx = cx + Math.cos(ang) * nl, ty = cy + Math.sin(ang) * nl;
      WD.carve(g, f, [[cx - 11 * Math.sin(ang), cy + 11 * Math.cos(ang)], [cx + 11 * Math.sin(ang), cy - 11 * Math.cos(ang)], [tx, ty]],
        { seed: 61, jit: 1.4, holes: false });
      WD.carve(g, f, WD.circlePts(cx, cy, 26, 18), { seed: 63, jit: 1.4, holes: false });
      WD.carve(g, f, WD.circlePts(tx, ty, 14, 14), { color: WD.red, jit: 1.2, seed: 65, holes: false });
      MV.focus(tx, ty, 'pointer');
      MV.overlay(function (o) {
        WD.lyric(o, f, { x: 960, y: 928, size: 84, align: 'center', mode: 'strip', maxW: 1700 });
      });
    }
  },
});
})();
