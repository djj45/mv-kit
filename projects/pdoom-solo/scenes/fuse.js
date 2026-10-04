// fuse — S33：一根导火索从画面左下爬上来，末端在画面中央烧出一朵白花（刻掉的火），火花是红刀口。
// 点火落在 f.a.kick 上；CAM.keep 拿缩放 s 让火头永远在画面里。歌词高带 CARVE 120 px 刻在导火索上方的实黑里。
(function () {
'use strict';
const FHX = 980, FHY = 642, FP0 = [40, 1132], FCW = 44;

/** 导火索中心线：0..1 */
function fuPt(u) {
  const x = lerp(FP0[0], FHX, u), y = lerp(FP0[1], FHY, u);
  const s = Math.sin(clamp(u, 0, 1) * Math.PI) * 64;
  return [x + s * 0.85, y - s * 0.5];
}
/** 折线 → 有宽度的带 */
function fuBand(pts, w) {
  const A = [], B = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    A.push([pts[i][0] - dy * w / 2, pts[i][1] + dx * w / 2]);
    B.push([pts[i][0] + dy * w / 2, pts[i][1] - dx * w / 2]);
  }
  return A.concat(B.reverse());
}

MV.scene('fuse', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0 });
    // 点火：这一镜的第一记底鼓
    const kicks = f.audio.events('kick', f.from + 0.5, f.to);
    const igniteT = kicks.length ? kicks[0].t : f.from + 0.8;
    const uAt = function (t) { return clamp(prog(t, igniteT, f.to - 0.12, ease.inOutQuad), 0, 1); };
    const uh = uAt(f.t);
    const head = fuPt(uh);
    // 火头永远在画面里：世界跟着缩
    const keepPt = f.t < igniteT ? fuPt(1) : head;
    const s = CAM.keep([keepPt], { anchor: [FHX, FHY], safe: [210, 120, W - 210, H - 130], min: 0.6 });
    g.save();
    g.translate(FHX, FHY); g.scale(s, s); g.translate(-FHX, -FHY);
    // 压在上面的那面实黑墙（歌词刻在里面）
    WD.carve(g, f, [[-900, -520], [2700, -520], [2700, 470], [2200, 428], [1700, 482], [1200, 420], [700, 472], [250, 428], [-200, 484], [-900, 438]],
      { seed: 4.4, jit: 4.2, seg: 72 });
    WD.hatch(g, f, [[-400, 468], [2000, 468], [2000, 566], [-400, 566]], { gap: 15, lw: 4, ang: -0.05, alpha: 0.5, seed: 8, wob: 5 });
    // 导火索：烧过的一段只剩灰，没烧到的还是黑的麻花绳
    const ALL = [];
    for (let i = 0; i <= 60; i++) ALL.push(fuPt(i / 60));
    const rest = ALL.filter(function (p, i) { return i / 60 >= uh - 1e-6; });
    if (rest.length > 1) {
      WD.carve(g, f, fuBand(rest, FCW), { seed: 12.3, jit: 2.2, seg: 30 });
      WD.gouge(g, f, rest, 11, { seed: 14.1, pw: 0.15, rough: 0.6 });         // 芯：一道刻掉的白
      for (let i = 0; i < 12; i++) {                                          // 麻花的斜纹
        const u2 = uh + (1 - uh) * (i + 0.5) / 12;
        const p = fuPt(u2);
        WD.gouge(g, f, [[p[0] - 22, p[1] + 17], [p[0] + 22, p[1] - 17]], 8, { seed: 30 + i, pw: 0.34 });
      }
    }
    const ash = ALL.filter(function (p, i) { return i / 60 <= uh + 1e-6; });
    if (ash.length > 1) {
      WD.contour(g, f, ash, 7, { color: WD.ink, seed: 16.7, boil: 1.4, prof: function () { return 1; } });
      for (let i = 0; i < 5; i++) {                                           // 余烬：红刀口
        const kk = clamp(uh * 5 - i, 0, 1);
        if (kk <= 0.05) continue;
        const p = fuPt(Math.max(0, uh - (i + 0.5) * 0.045));
        WD.gouge(g, f, [[p[0] - 9, p[1] - 5], [p[0] + 9, p[1] + 5]], 6, { color: WD.red, seed: 40 + i, pw: 0.3, alpha: kk });
      }
    }
    // 火：一朵刻掉的白花
    const fl = clamp(prog(f.t, igniteT, igniteT + 0.55, ease.outBack));
    if (fl > 0) {
      const charP = [];
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; const r = (74 + 30 * noise1(i * 1.7 + f.tick, 9)) * (0.45 + 0.55 * fl); charP.push([head[0] + Math.cos(a) * r, head[1] + Math.sin(a) * r * 0.94]); }
      WD.carve(g, f, charP, { seed: 202, jit: 3.6, holes: false });        // 烧焦的一团黑
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU + 0.4 + noise1(i * 3.3, 7) * 0.34;
        const r1 = (104 + 66 * hash(i, 5)) * fl * (1 + 0.09 * f.a.kick);
        WD.gouge(g, f, [[head[0] + Math.cos(a) * 14 * fl, head[1] + Math.sin(a) * 14 * fl],
                        [head[0] + Math.cos(a) * r1 * 0.55 + Math.sin(a) * 15, head[1] + Math.sin(a) * r1 * 0.55 - Math.cos(a) * 15],
                        [head[0] + Math.cos(a) * r1, head[1] + Math.sin(a) * r1]], 23, { seed: 120 + i, pw: 0.25, rough: 1.1 });
      }
      WD.wipe(g, f, WD.circlePts(head[0], head[1], 30 * fl + 6, 16), { seed: 140, jit: 2.2 });
      // 火花：红刀口，从火头飞出去
      for (let i = 0; i < 11; i++) {
        const t0 = igniteT + i * 0.15;
        const kk = prog(f.t, t0, f.to, ease.linear);
        if (kk <= 0 || f.t < t0) continue;
        const o = fuPt(uAt(t0));
        const a = -2.5 + hash(i, 3) * 2.7;
        const d = 34 + kk * (150 + hash(i, 7) * 240);
        const x = o[0] + Math.cos(a) * d, y = o[1] + Math.sin(a) * d + kk * kk * 300;
        g.save(); g.globalAlpha = clamp(1 - kk * 1.15);
        WD.gouge(g, f, [[x, y], [x + Math.cos(a) * 30, y + Math.sin(a) * 30]], 8, { color: WD.red, seed: 160 + i, pw: 0.3 });
        g.restore();
      }
    }
    g.restore();
    // 歌词：刻在导火索上方的实黑里（高带）
    WD.lyric(g, f, { x: 960, y: 282, size: 120, align: 'center', maxW: 1560, mode: 'carve' });
    MV.focus(FHX + (keepPt[0] - FHX) * s, FHY + (keepPt[1] - FHY) * s, 'the fire head');   // 主角：火头
    return null;
  },
});
})();
