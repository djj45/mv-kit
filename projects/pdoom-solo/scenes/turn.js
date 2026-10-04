// turn — S26（v1）/ S27（v2）：一条又粗又黑的线从左下冲上来，在画面中央急转向左。
// v1：转向落在 f.a.kick 上，CAM.keep 拿缩放 s 把世界缩着画，拐点永远在画面里，末端出画；
// v2：同一条线到了尽头，尽头是一个空的方框——该放制动块的地方，只有留白和红刀口描的边。
(function () {
'use strict';
const TKX = 900, TKY = 560, TW = 96;                    // 拐点 / 线宽
const TP0 = [120, 1250], TP2 = [-460, 442];
const TL1 = Math.hypot(TKX - TP0[0], TKY - TP0[1]);
const TL2 = Math.hypot(TP2[0] - TKX, TP2[1] - TKY);
/** 全程弧长参数 u（0..1）上的点 */
function turnPt(u) {
  const d = u * (TL1 + TL2);
  if (d <= TL1) { const k = d / TL1; return [lerp(TP0[0], TKX, k), lerp(TP0[1], TKY, k)]; }
  const k = (d - TL1) / TL2; return [lerp(TKX, TP2[0], k), lerp(TKY, TP2[1], k)];
}
/** 折线 → 一条有宽度的带 */
function turnBand(pts, w) {
  const A = [], B = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    A.push([pts[i][0] - dy * w / 2, pts[i][1] + dx * w / 2]);
    B.push([pts[i][0] + dy * w / 2, pts[i][1] - dx * w / 2]);
  }
  return A.concat(B.reverse());
}

MV.scene('turn', {
  render: function (g, f) {
    const v = (f.params && f.params.v) || 1;
    WD.ground(g, f, { ox: 0, oy: 0 });
    if (v === 1) {
      // 转向落在底鼓上
      const kicks = f.audio.events('kick', f.from + 0.6, f.to);
      const turnT = kicks.length ? kicks[0].t : f.from + 1.3;
      const uT = TL1 / (TL1 + TL2);
      const u = f.t < turnT
        ? lerp(0.04, uT, ease.inQuad(clamp((f.t - f.from) / Math.max(0.25, turnT - f.from))))
        : lerp(uT, 1, ease.inQuad(clamp((f.t - turnT) / Math.max(0.25, f.to - turnT))));
      const head = turnPt(u);
      const after = f.t >= turnT;
      // 世界跟着拐点缩：拐点永远在画面里
      const s = CAM.keep([after ? [TKX, TKY] : head], { anchor: [TKX, TKY], safe: [180, 110, W - 180, H - 130], min: 0.6 });
      g.save();
      g.translate(TKX, TKY); g.scale(s, s); g.translate(-TKX, -TKY);
      // 地板：一整块实黑
      WD.carve(g, f, [[-1400, 764], [3400, 764], [3400, 1900], [-1400, 1900]], { seed: 3.7, jit: 3.2, seg: 80 });
      WD.hatch(g, f, [[-1400, 764], [3400, 764], [3400, 836], [-1400, 836]], { gap: 12, lw: 4, ang: -0.04, alpha: 0.85, seed: 11 });
      // 线：跟着 u 长出来
      const pts = [];
      for (let i = 0; i <= 48; i++) pts.push(turnPt(u * i / 48));
      // 线下的墨（楔形）+ 线本身
      const wedge = [[-1400, 1900]].concat(pts).concat([[pts[pts.length - 1][0], 1900]]);
      WD.carve(g, f, wedge, { seed: 5.1, jit: 3.6, seg: 70 });
      WD.carve(g, f, turnBand(pts, TW + 22), { color: WD.paper, seed: 8.1, jit: 2.4, seg: 40 });  // 线的白边：在实黑里也看得见
      WD.carve(g, f, turnBand(pts, TW), { seed: 9.3, jit: 2.4, seg: 40 });
      g.restore();
      // 歌词：地板以上是空的，直接印在黑线上方的空纸里（不要底条）
      WD.lyric(g, f, { x: 152, y: 300, size: 118, align: 'left', maxW: 1560, mode: 'ink', color: WD.ink });
      MV.focus(TKX + (head[0] - TKX) * s, TKY + (head[1] - TKY) * s, 'the growing end');
      MV.focus(TKX, TKY, 'the knee');                    // 主角：转弯的拐点
      const sh = after ? 8 * Math.exp(-(f.t - turnT) * 5.5) : 0;
      return { shake: sh };
    } else {
      const BX = 1140, BY = 400, BW = 610, BH = 400, TBH = 80;
      const arrive = f.from + 1.15;
      const k = prog(f.t, f.from, arrive, ease.outCubic);
      const hx = lerp(-140, BX, k);
      const rec = f.t > arrive ? Math.exp(-(f.t - arrive) * 2.6) * Math.sin((f.t - arrive) * 11) * 9 : 0;
      // 线上方的黑：同一条线
      WD.carve(g, f, turnBand([[-360, 892], [hx * 0.45, 792], [hx, 716]], TW), { seed: 9.3, jit: 2.4, seg: 40 });
      // 地板
      WD.carve(g, f, [[-120, 900], [2040, 900], [2040, 1520], [-120, 1520]], { seed: 3.7, jit: 3.2, seg: 70 });
      WD.hatch(g, f, [[-120, 900], [2040, 900], [2040, 964], [-120, 964]], { gap: 12, lw: 4, ang: -0.04, alpha: 0.85, seed: 11 });
      // 撞上来的黑屑
      for (let i = 0; i < 6; i++) {
        const kk = prog(f.t, arrive + i * 0.06, f.to + 0.5, ease.inQuad);
        if (kk <= 0) continue;
        const s2 = 6 + hash(i, 21) * 8;
        const x = BX - 15 + kk * (20 + hash(i, 17) * 90), y = 690 - kk * (60 + hash(i, 23) * 150) + kk * kk * 300;
        WD.carve(g, f, [[x - s2, y - s2], [x + s2, y - s2 * 0.6], [x + s2 * 0.7, y + s2], [x - s2 * 0.8, y + s2 * 0.5]], { seed: 30 + i, jit: 0.8, holes: false });
      }
      g.save();
      g.translate(rec, 0);
      MV.group('empty box', function () {
        MV.box(g, BX, BY, BW, BH, { name: 'the empty box' });
        // 只有留白
        WD.wipe(g, f, [[BX, BY], [BX + BW, BY], [BX + BW, BY + BH], [BX, BY + BH]], { seed: 61.3, jit: 2.4, seg: 44 });
        // 标题栏 + 里面的 Menlo 小字
        WD.inkBar(g, f, BX, BY, BW, TBH, { seed: 63.5 });
        MV.box(g, BX, BY, BW, TBH, { name: 'the title bar' });
        const L = f.lyrics.lineAt(f.to - 0.02, f.from);
        let base = BY + TBH * 0.72;
        if (L) {
          WD.F.lbl(g, 34);
          const m = g.measureText(L.text);
          base = BY + (TBH - (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)) / 2 + m.actualBoundingBoxAscent;
        }
        WD.lyric(g, f, { x: BX + BW / 2, y: base, size: 34, align: 'center', maxW: BW - 96, font: 'lbl', mode: 'label', color: WD.paper, dim: WD.ghost });
        // 红刀口描的边
        WD.gouge(g, f, [[BX, BY], [BX + BW, BY]], 9, { color: WD.red, seed: 65, pw: 0.22 });
        WD.gouge(g, f, [[BX, BY + BH], [BX + BW, BY + BH]], 9, { color: WD.red, seed: 67, pw: 0.22 });
        WD.gouge(g, f, [[BX, BY + 6], [BX, BY + BH - 6]], 9, { color: WD.red, seed: 69, pw: 0.22 });
        WD.gouge(g, f, [[BX + BW, BY + 6], [BX + BW, BY + BH - 6]], 9, { color: WD.red, seed: 71, pw: 0.22 });
      });
      g.restore();
      MV.focus(BX - 10, 700, 'the line end');
      MV.focus(BX + BW / 2 + rec, BY + BH / 2, 'the empty box');   // 主角：空方框中心
      return null;
    }
  },
});
})();