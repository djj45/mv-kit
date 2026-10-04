// spike — "But now the singularity's begun": the same flat line bends upward, and keeps bending —
// the y-axis numbers run away as the curve goes vertical. The insert follows the bending tip.
MV.scene('spike', {
  render(g, f) {
    lmBegin('ember');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(300, 101)), { size: 1.2, gain: 0.2, twinkle: 0.4, t: f.t, fog: 100 });
    const gl = lmGlow();
    // the bend grows through the shot; by the end the line is vertical
    const bend = prog(f.lt, 0.1, f.dur * 0.92, ease.inCubic);
    const val = u => 0.5 + 0.03 * Math.sin(u * 46) + bend * (Math.exp(u * 5.2) - 1) / (Math.exp(5.2) - 1) * 0.52;
    const ch = OPS.chart(gl, f, {
      x: 270, y: 440, w: 1380, h: 360,
      val, upto: prog(f.lt, 0.15, f.dur * 0.95), color: 'accent', width: 3.2, tipDot: true,
      ticks: [[0, '40k'], [0.5, '60k'], [1, '80k']],
    });
    // y labels run away with the bend
    const yTop = 2.0 + bend * 9e4;
    for (let i = 0; i < 3; i++) OPS.tick(gl, lmFmt(yTop * (1 - i * 0.33) | 0), 236, 440 + 40 + i * 120, { align: 'right', size: 15, alpha: 0.8 });
    lmTag(gl, 'TRAINING LOSS — RUN 002 (CONT.)', 270, 390, { align: 'left', size: 17, color: 'warn' });
    if (bend > 0.55) OPS.tick(gl, '?!', ch.tip ? ch.tip[0] - 40 : 1500, 470, { color: 'warn', size: 30, alpha: (bend - 0.55) * 2 });
    lmEnd(g);
    if (ch.tip) MV.focus(ch.tip[0], ch.tip[1], 'tip');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['loss', lmFmt(2004 + bend * 9.2e7 | 0)], ['status', bend > 0.5 ? '???' : 'RISING']] }));
    return { shake: 3.5 * f.a.kick * bend };
  },
});
