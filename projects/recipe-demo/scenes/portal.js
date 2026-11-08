// match-zoom A: an identifiable small disc. No camera post-transform: anchors match the drawn geometry.
MV.scene('portal', {
  anchors() { return { disc: [820, 400, 280, 280] }; },
  render(g, f) {
    RD.paper(g);
    const p = RD.phase(f, 0, 5), angle = p * TAU;
    // Retire the orbit before the zoom: its enlarged rim would otherwise cross the fixed caption.
    g.save(); g.globalAlpha = 1 - ease.inOutCubic(clamp((f.t - (f.until - 0.5)) / 0.5));
    g.strokeStyle = RD.dim; g.lineWidth = 3;
    g.beginPath(); g.arc(960, 540, 230, 0, TAU); g.stroke();
    RD.disc(g, 960 + 230 * Math.cos(angle), 540 + 230 * Math.sin(angle), 12, RD.ink);
    g.restore();
    RD.disc(g, 960, 540, 140);
    MV.focus(960, 540, 'disc');
    RD.label('05 / MATCH THROUGH A SHAPE', 'Follow the disc into a new scale');
  },
});
