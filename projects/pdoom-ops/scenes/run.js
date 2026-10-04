// run — "We had a stable training run": the loss curve again, flat as a horizon, ticking like a
// metronome. The readout says STABLE in the calm teal. (spike bends this same chart upward.)
MV.scene('run', {
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(500, 91)), { size: 1.4, gain: 0.26, twinkle: 0.5, t: f.t, fog: 100 });
    const gl = lmGlow();
    OPS.ambient(gl, f, { gain: 0.45 });
    const val = u => 0.5 + 0.03 * Math.sin(u * 46) + 0.012 * noise1(u * 60, 3);        // a flat, breathing line
    const ch = OPS.chart(gl, f, {
      x: 270, y: 420, w: 1380, h: 380,
      val, upto: prog(f.lt, 0.2, f.dur * 0.85), color: 'accent', width: 4.4, tipDot: true,
      ticks: [[0, '0'], [0.5, '20k'], [1, '40k']],
      yticks: [[0.42, '1.99'], [0.58, '2.01']],
    });
    lmTag(gl, 'TRAINING LOSS — RUN 002', 270, 370, { align: 'left', size: 17 });
    if (ch.tip) {
      const flick = hash(Math.floor(f.t * 12), 7, 4) * 0.009;
      gl.fillStyle = lmCss('hot'); glow(gl, lmCss('hot', 0.8), 22);
      gl.beginPath(); gl.arc(ch.tip[0], ch.tip[1], 8, 0, TAU); gl.fill(); gl.shadowBlur = 0;
      OPS.tick(gl, `loss ${(2.004 - flick).toFixed(3)}`, ch.tip[0] - 36, ch.tip[1] - 52, { align: 'right', color: 'accent', size: 22 });
    }
    lmEnd(g);
    if (ch.tip) MV.focus(ch.tip[0], ch.tip[1], 'tip');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['loss', '2.004'], ['status', 'STABLE']] }));
    return {};
  },
});
