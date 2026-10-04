// 29 fuse · 102.52–105.70 · B · 主角：火头
//   TREATMENT.md §8 29（原文）：黑底，一根导火索（paper 色 12 px 曲线）横过画面下半部，一个黄色火头沿着它烧过去，
//   烧过的部分变成 ink2 的灰。焦点：火头。运镜：insert { at: 'lit' 的 start − 0.5, dur 1.4, amt 0.35 }（跟着火头走）。
//   歌词：`tape`，沿导火索方向，字在导火索上方，M。
//
// 火头在 "lit" 前 0.35 s 咬住导火索的左端，用 2.3 s 烧到右端（105.3 烧完，比切点早 0.4 s）；火头本身在镜头
// 头半秒里从小胀到 r 24，之后在一拍二上抖。
MV.scene('fuse', {
  render(g, f) {
    SG.bg(g, 'B');
    const C = SG.C;
    const lit = f.lyrics.findWords('lit')[0].start;        // 103.4："we «lit» the fuse"
    const catchAt = lit - 0.35;
    const yOf = u => 800 + 70 * Math.sin(u * 3.0 + 0.4) + 30 * Math.sin(u * 7.3);
    const N = 200, pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N; pts.push([140 + u * 1640, yOf(u)]); }
    // 烧到哪儿了
    const uH = clamp(0.06 + (f.t - catchAt) * 0.42, 0.06, 1) * N, i0 = Math.floor(uH), fr = uH - i0;
    const hd = [lerp(pts[i0][0], pts[Math.min(N, i0 + 1)][0], fr), lerp(pts[i0][1], pts[Math.min(N, i0 + 1)][1], fr)];
    SG.poly(g, pts, { color: C.paper, lw: 12 });           // 没烧到的是 paper
    SG.poly(g, pts.slice(0, i0 + 1).concat([hd]), { color: C.ink2, lw: 12 });   // 烧过的是 ink2 的灰
    const r = 24 * (0.35 + 0.65 * clamp(f.lt / 0.6)) * (1 + 0.10 * noise1(f.tq * 3.1, 7));
    g.save(); g.fillStyle = C.yellow; g.beginPath(); g.arc(hd[0], hd[1], r, 0, TAU); g.fill(); g.restore();
    // 歌词：一条沿导火索方向的胶带，压在导火索上方（胶带下沿离火头还有 60 px 以上）
    const uM = 0.5, yM = yOf(uM), ang = Math.atan2(yOf(uM + 0.01) - yOf(uM - 0.01), 0.02 * 1640) * 180 / Math.PI;
    WD.line(g, f, { treat: 'tape', size: 'M', x: 960, y: yM - 280, angle: ang, maxW: 1500 });
    MV.focus(hd[0], hd[1], 'burning fuse');
  },
});
