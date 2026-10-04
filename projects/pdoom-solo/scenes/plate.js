// plate — 压印台上那块版的一角。前奏（v1）是一块还没刻过的新版；尾奏（v2/v3）是刻空以后的同一块版，
// 纸被抽走，最后只剩纸色和木纹。全片的"零"和"空"都在这一景里。
(function () {
'use strict';
const PLX = 300, PLY = 96, PLW = 2100, PLH = 1320, PLR = 0.028;

function blockPoly(g, f, dx, dy) {
  const c = Math.cos(PLR), s = Math.sin(PLR);
  const q = [[0, 0], [PLW, 0], [PLW, PLH], [0, PLH]];
  return q.map(function (p) {
    const u = p[0], v = p[1];
    return [PLX + u * c - v * s + dx, PLY + u * s + v * c + dy];
  });
}
/** 木纹：版面上很细的一层平行线（不是纸的木纹，是梨木自己的纹） */
function woodFace(g, f, poly) {
  g.save();
  WD.carve(g, f, poly, { color: '#E3D8BF', jit: 0, holes: false });     // 版面比纸暗一档
  WD.hatch(g, f, poly, { gap: 27, lw: 1.3, ang: 0.015, color: WD.ghost, alpha: 0.34, wob: 3.2, seed: 3 });
  WD.hatch(g, f, poly, { gap: 104, lw: 3.4, ang: 0.015, color: WD.warm, alpha: 0.22, wob: 6, seed: 7 });
  g.restore();
}
function rimLight(g, f, P) {
  // 版的左上棱：光从上面来，棱上是一条"刻掉"的亮边
  WD.gouge(g, f, [P[0], P[1], P[1]], 15, { seed: 12, pw: 0.18, color: WD.paper });
}
/** 右侧那张纸的毛边（撕口）：一条抖动的纸色边界 + 它的影子 */
function deckle(g, f, x, shade) {
  const pts = [];
  for (let y = -20; y <= H + 20; y += 26) pts.push([x + noise1(y * 0.03, 21) * 16, y]);
  WD.wipe(g, f, pts.concat([[x + 700, H + 40], [x + 700, -40]]), { seed: 31, jit: 3.2, seg: 40 });
  g.save();                                   // 掀起的纸在版上留一道影子：几条排线
  g.globalAlpha = 0.5 * shade;
  for (let i = 0; i < 9; i++) {
    const y0 = 40 + i * 130;
    WD.contour(g, f, [[x - 96, y0], [x - 40, y0 + 8], [x - 12, y0 + 2]], 3.4, { seed: 60 + i, boil: 0.6, prof: function () { return 1; } });
  }
  g.restore();
  g.save(); g.strokeStyle = WD.ink; g.globalAlpha = 0.45 * shade; g.lineWidth = 3;
  g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0] - 6, p[1]); else g.moveTo(p[0] - 6, p[1]); }); g.stroke(); g.restore();
}

MV.scene('plate', {
  render: function (g, f) {
    const v = (f.params && f.params.v) || 1;
    WD.ground(g, f, { ox: f.from * 6, oy: 0 });
    let pan = [ -f.lt * 5, -f.lt * 2 ];
    if (v === 1) {
      const P = blockPoly(g, f, 0, 0);
      woodFace(g, f, P);
      WD.contour(g, f, [P[3], P[0], P[1]], 5.5, { seed: 2, boil: 0.7, prof: function () { return 1; } });
      rimLight(g, f, P);
      deckle(g, f, 1560 + f.lt * 4, 1);
      WD.cross(g, f, 620, 330, 44, { lw: 2.6 });
      // 台上几片刨花
      for (let i = 0; i < 4; i++) WD.gouge(g, f, [[430 + i * 90, 900 + i * 22], [470 + i * 90, 936 + i * 22], [500 + i * 90, 930 + i * 22]], 9, { seed: 40 + i, pw: 0.3 });
      MV.focus(620 + pan[0], 330 + pan[1], 'block corner');
    } else if (v === 2) {
      const P = blockPoly(g, f, 0, 0);
      woodFace(g, f, P);
      rimLight(g, f, P);
      // 上一版留下的淡痕：什么都刻掉了，只剩一道没刻净的边
      g.save(); g.globalAlpha = 0.28;
      WD.gouge(g, f, [[540, 470], [1180, 610], [1690, 520]], 13, { seed: 55, color: WD.ghost });
      g.restore();
      const px = 1560 + f.p * 900;                        // 纸从右边被抽走
      deckle(g, f, px, 1);
      WD.cross(g, f, 620, 330, 44, { lw: 2.6 });
      MV.focus(Math.min(px - 40, W - 200), 620, 'paper edge');
    } else {
      const off = f.p * 420;                              // 版被抬走，露出下面的纸
      const P = blockPoly(g, f, -off, -off * 0.55);
      g.save(); g.globalAlpha = clamp(1 - f.p * 1.25);
      woodFace(g, f, P);
      rimLight(g, f, P);
      WD.cross(g, f, 620 - off, 330 - off * 0.55, 44, { lw: 2.6 });
      g.restore();
      MV.focus(Math.max(120, 620 - off), Math.max(120, 330 - off * 0.55), 'cross');
      const k = prog(f.t, f.to - 1.4, f.to, ease.inOutQuad);
      if (k > 0) return { flash: k * 0.99, flashColor: '233,223,201' };
    }
    return { pan: pan };
  },
});
})();
