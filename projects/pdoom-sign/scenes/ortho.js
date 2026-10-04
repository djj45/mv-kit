// 30 ortho · 105.70–109.79 · P · 主角：两条轴的交点
//   TREATMENT.md §8 30（原文）：纯歌词画面 #3。两条墨色坐标轴（34 px）十字交在画面中心偏左下；'Orthogonality'
//   横着骑在横轴上（L），'thesis blues' 竖排骑在竖轴上（L）。两条轴永远不相交的那一端，各有一个小箭头。
//   焦点：两轴交点。歌词：用两次 `WD.line` 的 `stamp`，`o.only` 指定词序号（横排那部分正常画；竖排那部分
//   `g.rotate(−π/2)` 之后画）。
//
// 排版说明（照 §6 网格，两处都先量再放）：
//   · 横排那半骑在横轴上（基线贴墨轴的上沿），起点在交点右侧一格。
//   · 竖排那半在 rotate(−π/2) 的坐标系里画：局部 x 沿屏幕向上、局部 y 沿屏幕向右，所以 `x` 指字跑的起点、
//     `y` 让基线正好贴住竖轴左侧（zone 在这里没有意义，直接写 y = 0）。一整个 L 档的 12 个字符竖着放不下
//     （190 px 时比画面安全高度还长），所以先用 `WD.measure` 量出能塞进这段轴长的字号，再用那个字号画一次
//     ——`stamp` 的自动折行在竖排里会变成并排的第二列，这里要的是单独一列。
//   · 两支小箭头画在横轴的左端、竖轴的下端：右端和上端被两条词占着，箭头画在那儿会切过字母
//     （横排那半从交点右侧一直骑到右端，竖排那半整整骑满上端那一段轴）。
//   · 层级：这两条字虽然也是固定 x / y 的 stamp，但它们是**骑在轴上**的 —— 轴是画面本身，跟着镜头动
//     （默认缓推 3.8 %，横轴上的字会往下走 13 px）。放进屏幕层字就不跟着轴走了，字会浮在轴上面/里面，
//     所以留在场景画布上，和轴一起动。这一镜没有 insert，字留在场景也不钳住任何东西。
MV.scene('ortho', {
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    const L33 = f.lyrics.get('Orthogonality thesis');
    const CX = 620, CY = 870;                              // 交点：画面中心偏左下
    const ext = ease.inOutQuad(f.p);                       // 两条轴一直在往外长：这个镜头没有静止的一帧
    // 两条 34 px 的墨色坐标轴：右半 / 上半是光轴（平头收尾），左端 / 下端各留一个小箭头的位置
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(CX, CY); g.lineTo(1720 + 70 * ext, CY); g.stroke();
    g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX, 180); g.stroke();
    g.restore();
    SG.arrow(g, CX, CY, 210, CY, { w: SG.LW.pict, head: 84 });               // 横轴左端：小箭头
    SG.arrow(g, CX, CY, CX, 990 + 50 * ext, { w: SG.LW.pict, head: 84 });    // 竖轴下端：小箭头
    const cur = WD.current(f);
    if (cur && cur.i === L33.i) {
      const ws = WD.words(f, cur.line);
      const onlyH = [ws[0].i];                             // 'Orthogonality'
      const onlyV = ws.slice(1).map(w => w.i);             // 'thesis blues'
      const mH = WD.measure(g, f, { treat: 'stamp', size: 'L', only: onlyH, maxW: 860 });
      // the descenders of g / y used to sink into the axis: ink bottom ≥ 0.12 em above the line (ROUND4 §1)
      if (mH) WD.line(g, f, { treat: 'stamp', size: mH.size, only: onlyH, maxW: 860, x: 700, y: CY - mH.size * 0.12 - mH.desc });
      const mV = WD.measure(g, f, { treat: 'stamp', size: 'L', only: onlyV, maxW: 660 });
      if (mV) {
        g.save();
        // the rotated line's ink reaches right by `desc`: keep 0.12 em clear of the axis' left edge (603)
        g.translate(603 - mV.size * 0.12 - mV.desc, 840);
        g.rotate(-Math.PI / 2);
        WD.line(g, f, { treat: 'stamp', size: mV.size, only: onlyV, maxW: 660, x: 0, y: 0 });
        g.restore();
      }
    }
    MV.focus(CX, CY, 'axes crossing');
  },
});
