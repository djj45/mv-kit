// blues — 歌词行 33 "Orthogonality thesis blues"（105.70–109.79）。
// 只有歌词的画面（全片三个之一）：纯排版。三个词落在三条不同的水平线上，字距拉开；
// "blues" 是红版、最大（巨 240）。画面里除了纸、上一版的残影框、两个对版十字和底边那道
// 正在长高的版边黑条，什么都没有 —— 但版边一直在长、刻度一直在挪，镜头也一直在推。
(function () {
'use strict';
const BL = { BIG: [960, 918, 240], MID: [300, 610, 132], SM: [1292, 306, 66] };

/** 只画当前这句歌词的第 i 个词：整句照画，裁剪框里只留这一个词，所以三个词能落在三条线上。 */
function blWord(g, f, o) {
  const line = f.lyrics.lineAt(f.t, f.from);
  if (!line) return null;
  const toks = f.lyrics.tokens(line);
  if (!toks.length || o.i >= toks.length) return null;
  const font = o.font || 'ly';
  WD.F[font](g, o.size, o);
  const sp = g.measureText(' ').width;
  const ws = toks.map(function (t) { return g.measureText(t.text).width; });
  let ofs = 0;
  for (let i = 0; i < o.i; i++) ofs += ws[i] + sp;
  const w = ws[o.i];
  const x0 = o.align === 'center' ? o.x - w / 2 : o.align === 'right' ? o.x - w : o.x;
  g.save();
  g.beginPath();
  g.rect(x0 - o.size * 0.2, o.y - o.size * 1.2, w + o.size * 0.4, o.size * 1.6);
  g.clip();
  WD.lyric(g, f, {
    x: x0 - ofs, y: o.y, align: 'left', size: o.size, maxW: 9e5, font: font, mode: o.mode,
    color: o.color, dim: o.dim, track: o.track, band: false, keep: false,
  });
  g.restore();
  return { x: x0, w: w, y: o.y, size: o.size };
}

MV.scene('blues', {
  render: function (g, f) {
    const slide = 9 * f.lt;
    WD.ground(g, f, { ox: slide, oy: 0, grain: 0.15, grainGap: 46 });

    // 上一版印歪的版框（残影，错开 12 px）
    g.save(); g.globalAlpha = 0.42;
    WD.contour(g, f, [[148, 108], [1774, 120], [1786, 1002], [160, 1014], [148, 108]], 3.4,
      { color: WD.ghost, seed: 7, boil: 0.5, prof: function () { return 1; } });
    g.restore();

    // 对版十字：跟着版极慢地漂，kick 上弹一下
    const kk = f.a.kick;
    WD.cross(g, f, 262 + 5 * Math.sin(f.t * 0.7) + 3 * kk, 208 + 4 * Math.cos(f.t * 0.5), 34 + 3 * kk, { color: WD.ink, lw: 2.6, alpha: 0.75 });
    WD.cross(g, f, 1662 + 4 * Math.cos(f.t * 0.6), 862 + 5 * Math.sin(f.t * 0.45), 30, { color: WD.ink, lw: 2.4, alpha: 0.7 });

    // 三个词：巨 240 红版 / 大 132 / 中 66，三条线
    blWord(g, f, { i: 2, x: BL.BIG[0], y: BL.BIG[1], size: BL.BIG[2], font: 'big', mode: 'mono', color: WD.red, dim: WD.ghost, track: 0.05, align: 'center' });
    blWord(g, f, { i: 0, x: BL.MID[0], y: BL.MID[1], size: BL.MID[2], mode: 'ink', color: WD.ink, dim: WD.ghost, track: 0.09, align: 'left' });
    blWord(g, f, { i: 1, x: BL.SM[0], y: BL.SM[1], size: BL.SM[2], mode: 'ink', color: WD.ink, dim: WD.ghost, track: 0.16, align: 'left' });

    // 底边的版边：黑条一直在长高，白刻度在黑里慢慢地挪
    const bh = 22 + 122 * f.p * f.p;      // 版边一直在长，越到后面长得越快（字唱完以后画面还在动）
    const yT = H - bh;
    WD.carve(g, f, [[-30, yT], [W + 30, yT], [W + 30, H + 30], [-30, H + 30]], { seed: 5.5, jit: 2.2, seg: 60, holeA: 0.4 });
    for (let i = -1; i < 30; i++) {
      const x = i * 76 + (slide * 3) % 76;
      if (x < -20 || x > W + 20) continue;
      WD.gouge(g, f, [[x, H - 14], [x + 2 * noise1(f.tq + i, 3), yT + 16]], 5, { seed: 40 + i, pw: 0.25 });
    }

    MV.focus(BL.BIG[0], BL.BIG[1] - BL.BIG[2] * 0.36, 'blues');
  },
});
})();
