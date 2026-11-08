// match-zoom B: retain the disc's identity, then reveal its surroundings after the transition.
MV.scene('arrival', {
  anchors() { return { disc: [620, 200, 680, 680] }; },
  render(g, f) {
    RD.paper(g); RD.disc(g, 960, 540, 340);
    const angle = Math.max(0, f.lt - 1) * 0.6;
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + angle;
      RD.disc(g, 960 + Math.cos(a) * 250, 540 + Math.sin(a) * 250, 12, RD.bg);
    }
    MV.focus(960, 540, 'disc');
    // The same caption on both sides avoids overlapping different words during the cross-fade.
    RD.label('05 / MATCH THROUGH A SHAPE', 'Follow the disc into a new scale');
  },
});
