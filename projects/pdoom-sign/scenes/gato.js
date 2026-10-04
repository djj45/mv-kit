// 26 gato · 88.88–95.24 · P · 主角：两只手相接处
//   TREATMENT.md §8 26（原文）：画面 85 % 是纸白。小小的小人（s = 0.5）和小小的机器（s = 0.45）在画面下三分之一
//   中间，手拉着手（小人 `reach`，手的末端碰到机器）。'go' 的 start 前后，两只手之间慢慢拉开 24 px。
//   焦点：两只手相接处。运镜：insert { at: 91.0, dur: 4.0, amt: 0.35, ease: ease.inOutQuad }（很慢地推近两只手）。
//   歌词：#27「Gato, please don't let me go」`label` S，at = 两手之间。
//         label 是从物体上拉出来的引线，印在物体上、必须跟着画面动 → 留在场景画布上（不进屏幕层）；
//         它报的 keep 会限制 insert 的推进，这是对的（画面上还有别的 keep 时本来就不该推得狠）。
//
// 一处补充（要写进 §12 改动记录）：脚底下加了一条 3 px 的 ink2 细规线（SAFE 到 SAFE）。
//   两个小东西加起来只有画面 0.6 % 的墨迹，insert 又把它们钉在焦点上不动，qa 的 static（画面变化 < 2 %）
//   量不到东西；这条基线用细规线的写法（§3：ink2 = 细规线），把这一镜的画面变化从 1.6 % 提到 4.7 %。
//   不要它的话删掉那条 SG.poly 即可，其余构图不变。
MV.scene('gato', {
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    const line = f.lyrics.get('Gato, please');            // #27：这一镜该显示的那一句
    const go = f.lyrics.findWords('go')[0];               // …don't let me «go»（行 27 的词 5）
    // 「慢慢拉开 24 px」：从 "go" 的 start 起，0.9 s
    const open = 24 * ease.inOutQuad(clamp((f.t - go.start) / 0.9));
    const bob = -3 * Math.abs(Math.sin(f.tq * 0.9));      // 一口气的起伏，按一拍二定格
    SG.poly(g, [[SG.SAFE, 890], [W - SG.SAFE, 890]], { color: C.ink2, lw: SG.LW.rule });   // 两个小东西站着的那条基线
    // 先画小人：它伸出的那只手的末端，就是机器要去碰的点
    const fig = SG.figure(g, 940, 800 + bob, 0.5, SG.POSE.reach, { color: C.ink, focus: false });
    const [hx, hy] = fig.hand;
    const CAP = SG.LW.pict * 0.5 * 0.5;                   // 34·s 的圆头笔帽让手的墨迹再往外 8.5 px
    const HALF = 220 * 0.45 / 2;                          // s = 0.45 时机器的半个边长
    const mx = hx + CAP + HALF + open, my = hy - 4;
    SG.machine(g, mx, my, 0.45, { gaze: [-0.5, 0.2], blink: 0.9 * Math.max(0, 1 - (f.beat % 8) * 3), focus: false });
    const meet = [(hx + CAP + (mx - HALF)) / 2, (hy + my) / 2];   // 两只手相接处
    // 歌词只画 #27，而且只在它真的成为当前句之后：镜头比它早开 0.4 s，那 0.4 s 里 WD.current 是 null
    //（#26 在切点前就唱完了，按跨切点规则不带进这一镜），把那一句标在两只手上不是它该在的地方。
    const cur = WD.current(f);
    if (cur && cur.i === line.i) WD.line(g, f, { treat: 'label', size: 'S', at: meet, x: 560, y: 560 });
    MV.focus(meet[0], meet[1], 'hands');
  },
});
