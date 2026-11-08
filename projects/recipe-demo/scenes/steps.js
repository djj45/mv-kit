// stepped-value: interpolate each change independently and leave readable plateaus.
MV.scene('steps', {
  render(g, f) {
    RD.paper(g);
    const values = [12, 36, 64, 92], beats = [0, 2, 4, 6];
    let i = 0;
    while (i + 1 < beats.length && f.t >= RD.beat(f, beats[i + 1])) i++;
    const k = i ? ease.outCubic(RD.phase(f, beats[i], beats[i] + 0.35)) : 1;
    const value = lerp(values[Math.max(0, i - 1)], values[i], k);
    MV.decor(() => BOX.center(g, String(Math.round(value)), 960, 480, { size: 210, color: RD.ink }));
    g.fillStyle = RD.dim; g.fillRect(360, 700, 1200, 12);
    g.fillStyle = RD.accent; g.fillRect(360, 700, value * 12, 12);
    RD.disc(g, 360 + value * 12, 706, 20);
    MV.focus(960, 480, 'value');
    RD.label('02 / STEPPED VALUE', 'Fast change on the beat; time to read between beats');
  },
});
