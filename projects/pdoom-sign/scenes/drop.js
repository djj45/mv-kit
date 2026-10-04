// 03 drop · 9.337–12.974 · P · 坐标纸上的 loss 曲线断崖下坠，永远掉不完
//   画面：一张坐标纸（细规线网格，3 px ink2），一条 34 px 墨线（loss 曲线）从左上平走，到 'drop' 的 start 那一拍
//        断崖下坠，然后一直往右下掉、永远不会掉完：主体快出画时世界跟着它缩（CAM.keep([tip], anchor = 网格左上角)），
//        线尖始终在画面里，切走时还在掉。线尖是一个黄色圆点 r 14。
//   焦点：线尖。 歌词：stamp L，上区，左对齐 x = SG.SAFE，key 'drop'；**屏幕层**（MV.overlay）。 切出：硬切（还在掉的时候切走）。
MV.scene('drop', {
  render(g, f) {
    SG.bg(g, 'P');
    // The chart's origin — the grid's top-left corner, and the point the world shrinks around. It sits BELOW the
    // lyric's two rows (their ink ends at y 509): the world contracts towards the anchor, so an anchor above the
    // words would drag the flat run and then the whole fall up through the type (black line over black words).
    const AX = 240, AY = 600, G = 48;
    const tDrop = f.lyrics.findWords('drop')[0].start;                         // the word the cliff lands on
    const X0 = AX + 240, XD = AX + 1200, YF = AY + 40;                         // flat run: X0 → XD at YF
    const RS = 200, VS = 443, AS = 60;                                         // world px/s after the cliff

    /** where the curve has got to, in world px: flat (with a training-loss wobble) until 'drop', then the cliff */
    const endAt = t => {
      const wob = 10 * noise1(t * 1.1, 5);
      if (t <= tDrop) return [lerp(X0, XD, clamp((t - f.from) / Math.max(0.2, tDrop - f.from))), YF + wob];
      const u = t - tDrop;
      return [XD + RS * u, YF + VS * u + AS * u * u + wob];
    };

    const N = 150, pts = [];
    for (let i = 0; i <= N; i++) pts.push(endAt(lerp(f.from, f.t, i / N)));
    const tip = pts[N];
    const s = CAM.keep([tip], { anchor: [AX, AY] });

    g.save(); g.translate(AX, AY); g.scale(s, s); g.translate(-AX, -AY);
    // The graph paper: only the hairlines that are actually on screen are drawn — as the world shrinks we see more of
    // it, and the 3 px rules keep their 3 px on screen (1/s) so the grid reads as the film's hairline weight.
    const gx0 = AX + (0 - AX) / s, gx1 = AX + (W - AX) / s, gy0 = AY + (0 - AY) / s, gy1 = AY + (H - AY) / s;
    g.save();
    g.strokeStyle = SG.C.ink2; g.lineWidth = SG.LW.rule / s; g.lineCap = 'butt'; g.globalAlpha = 0.5;
    for (let x = Math.floor(gx0 / G) * G; x <= gx1; x += G) { g.beginPath(); g.moveTo(x, gy0); g.lineTo(x, gy1); g.stroke(); }
    for (let y = Math.floor(gy0 / G) * G; y <= gy1; y += G) { g.beginPath(); g.moveTo(gx0, y); g.lineTo(gx1, y); g.stroke(); }
    g.restore();
    // the loss curve itself: the film's pictogram weight, kept at 34 px on screen
    g.save();
    g.strokeStyle = SG.C.ink; g.lineWidth = SG.LW.pict / s; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.restore();
    g.restore();

    // the tip, where the tip landed on screen — the one thing that never leaves the frame
    const tx = AX + (tip[0] - AX) * s, ty = AY + (tip[1] - AY) * s;
    g.fillStyle = SG.C.yellow;
    g.beginPath(); g.arc(tx, ty, 14, 0, TAU); g.fill();
    MV.focus(tx, ty, 'line tip');

    // the lyric, on the screen layer (MV.overlay): two rows in the top zone, the key word's block on 'drop'. The
    // camera never touches it (the kit's push, and CAM.keep's shrinking world, both stay below y 509 — the world's
    // anchor is under the words for exactly this reason), and nothing in this shot is punched in, so the line just
    // has to sit still while the curve falls out of the picture under it.
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'L', zone: 'top', align: 'left', x: SG.SAFE, key: 'drop' }));
    return {};
  },
});
