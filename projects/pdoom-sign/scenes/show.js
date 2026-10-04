// 40 show · 137.06–143.88 · P · #45「Was it all for show?」——全片第四个纯歌词画面
//   画面：`wall`，五个词一词一行（heavy，铺满画面宽，正在唱的那一行垫黄）；唱完后墙不动，'show?' 那一行的黄块
//        慢慢变宽到满屏宽（`o.grow` 秒数）。
//   焦点：`wall` 自己报——正在唱的那一行（第一个词之前报第一行的**空黄块**，宽 = 第一个词的宽；它由
//         `Math.max(active, 0)` 定位，滚动也按这一行，所以第一帧焦点在画面里，不是空纸）。场景不再另报 focus，
//         也不再自己算 top（第二轮之前这里按 `ws[active]` 报，第一个词之前 active 落到 'show?' 那一行、
//         报在 −400 px 上，qa 报 focus-out）。
//   歌词：留在场景画布上——这一句读 `WD.line` 的返回值没有意义（不再读），但这一镜整幅就是歌词、没有别的
//         相机要跟的主体，留在这里 keep 也不会钳住任何 insert（timeline 上没有 insert）。
//   运镜：camera kit 默认缓推（被那一行的 MV.keep 限到 ~4.7 %）。切出：硬切在小节头（143.88）。
MV.scene('show', {
  init(MV) { this.line = MV.lyrics.get('Was it all for show'); },
  render(g, f) {
    SG.bg(g, 'P');
    WD.line(g, f, { line: this.line, treat: 'wall', grow: 3.0 });
    return {};
  },
});
