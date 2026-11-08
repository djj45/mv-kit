// path-reveal: show the destination, draw toward it, then hold the completed path.
MV.scene('path', {
  render(g, f) {
    RD.paper(g);
    const p = ease.inOutCubic(RD.phase(f, 1, 5));
    const point = u => [280 + 1300 * u, 590 - 150 * Math.sin(Math.PI * u)];
    const draw = (until, color, width) => {
      g.beginPath();
      for (let i = 0; i <= 100; i++) { const xy = point(until * i / 100); i ? g.lineTo(...xy) : g.moveTo(...xy); }
      g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.stroke();
    };
    draw(1, RD.dim, 3); draw(p, RD.accent, 10);
    const tip = point(p); RD.disc(g, ...tip, 18);
    MV.focus(...tip, 'tip');
    RD.label('01 / PATH REVEAL', 'Destination → movement → completed path');
  },
});
