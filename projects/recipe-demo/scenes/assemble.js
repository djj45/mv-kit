// stagger-assemble: geometry first, a short pause, then labels in reading order.
MV.scene('assemble', {
  render(g, f) {
    RD.paper(g);
    for (let i = 0; i < 3; i++) {
      const k = ease.outBack(RD.phase(f, i * 0.5, i * 0.5 + 1));
      const x = 300 + i * 460, y = 430 + (1 - k) * 170;
      const panel = BOX.panel(g, x, y, 400, 240, { stroke: RD.dim, lw: 3, pad: 38, name: `card-${i}` });
      const alpha = RD.phase(f, 3 + i, 3.5 + i);
      // No invisible text calls: QA should measure only letters that are actually present.
      if (alpha > 0) MV.decor(() => BOX.lines(g, panel, [['BUILD', 'ORDER', 'READ'][i]],
        { size: 64, color: RD.ink, alpha }));
    }
    const active = Math.min(2, Math.max(0, Math.floor(MV.audio.beatAt(f.t) - MV.audio.beatAt(f.from) - 3)));
    MV.focus(500 + active * 460, 550, 'card');
    RD.label('03 / STAGGER ASSEMBLY', 'Structure first; words second; hold the finished composition');
  },
});
