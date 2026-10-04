// atoms — 小人的身体被拆成小方块，方块按噪声场缓慢重排；脸的那块留白一直空着（头只剩一圈轮廓）。
// 正在移动的那一块是主角，时间线的 insert 跟着它。中带 TYPE 84 px：每个词按 start 从上面落下来。
(function () {
'use strict';
const CELL = 44, FX = 560, FY = 1100, FH = 560;

function bodyMask() {
  const s = FH / 100, hipY = FY - 43 * s, shoY = FY - 72 * s, hY = FY - 87 * s, hX = FX;
  const seg = function (x, y, x0, y0, x1, y1, r) {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy;
    let u = L2 ? ((x - x0) * dx + (y - y0) * dy) / L2 : 0; u = clamp(u);
    return Math.hypot(x - (x0 + u * dx), y - (y0 + u * dy)) < r;
  };
  return {
    head: [hX, hY, 12.5 * s],
    test: function (x, y) {
      return seg(x, y, hX, shoY, hX, hipY, 9.5 * s)
        || seg(x, y, hX, hipY, FX - 8 * s, FY, 6 * s)
        || seg(x, y, hX, hipY, FX + 8 * s, FY, 6 * s)
        || seg(x, y, hX - 7 * s, shoY, FX - 26 * s, FY - 34 * s, 5 * s)
        || seg(x, y, hX + 7 * s, shoY, FX + 26 * s, FY - 34 * s, 5 * s);
    },
  };
}
const BODY = bodyMask();
const CELLS = [];
(function build() {
  for (let x = FX - 250; x <= FX + 250; x += CELL) {
    for (let y = FY - FH + 20; y <= FY; y += CELL) {
      const hx = x + CELL / 2, hy = y + CELL / 2;
      if (!BODY.test(hx, hy)) continue;
      CELLS.push({ x: hx, y: hy, head: Math.hypot(hx - BODY.head[0], hy - BODY.head[1]) < BODY.head[2] + CELL * 0.2 });
    }
  }
})();
const TI = (function () {
  let best = 0, bd = 1e9;
  CELLS.forEach(function (c, i) { const d = Math.hypot(c.x - FX, c.y - (FY - 0.6 * FH)); if (d < bd) { bd = d; best = i; } });
  return best;
})();

MV.scene('atoms', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0 });
    // 脸：一圈轮廓，里面一直是空的
    const s = FH / 100;
    WD.contour(g, f, WD.circlePts(BODY.head[0], BODY.head[1], BODY.head[2], 18), 5, { seed: 5, boil: 1.3, prof: function () { return 1; } });
    // 正在移动的那一块：从胸口一路搬到右边
    const kt = prog(f.t, f.from + 0.4, f.to - 0.1, ease.inOutCubic);
    const trav = [lerp(FX, 1430, kt), lerp(FY - 0.6 * FH, 830, ease.outQuad(kt)) + 40 * Math.sin(kt * 5.2)];
    const tsz = 56 + 8 * f.a.kick;
    for (let i = 0; i < CELLS.length; i++) {
      const c = CELLS[i];
      if (c.head) continue;                                  // 脸留白
      const isT = i === TI;
      const k = clamp(prog(f.t, f.from + 0.3 + hash(c.x, c.y) * 1.3, f.from + 2.6, ease.inOutQuad));
      const nx = noise1(c.x * 0.011 + f.t * 0.22, 3) * 130 * k;
      const ny = noise1(c.y * 0.013 + f.t * 0.19, 7) * 100 * k;
      const x = isT ? trav[0] : c.x + nx, y = isT ? trav[1] : c.y + ny;
      const sz = isT ? tsz : 34 - 5 * k;
      const rot = (isT ? 1.6 : 0) * kt + 0.12 * noise1(i * 1.7, 9) * k;
      g.save(); g.translate(x, y); g.rotate(rot);
      WD.carve(g, f, [[-sz / 2, -sz / 2], [sz / 2, -sz / 2], [sz / 2, sz / 2], [-sz / 2, sz / 2]], { seed: 200 + i, jit: 1.6, holes: false });
      g.restore();
      // 少数几块已经归"它"了（蓝）
      if (i % 11 === 4) {
        g.save(); g.fillStyle = WD.blue; g.globalAlpha = 0.85 * clamp(k * 2);
        g.fillRect(x - sz * 0.18, y - sz * 0.18, sz * 0.36, sz * 0.36); g.restore();
      }
    }
    // 主角那块：芯里是蓝的
    g.save(); g.fillStyle = WD.blue;
    g.fillRect(trav[0] - tsz * 0.18, trav[1] - tsz * 0.18, tsz * 0.36, tsz * 0.36); g.restore();
    MV.focus(FX, FY - 0.6 * FH, 'the body');
    MV.focus(trav[0], trav[1], 'a moving block');
    MV.overlay(function (o) {
      WD.lyric(o, f, { x: 960, y: 480, size: 84, align: 'center', mode: 'type', color: WD.ink, band: true, bandColor: WD.paper, drop: 46, maxW: 1500 });
    });
    return {};
  },
});
})();
