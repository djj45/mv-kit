// drop — "There was a sudden drop in your training loss": the loss curve walks out flat, then
// falls off a cliff. The insert follows the tip down.
MV.scene('drop', {
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(300, 41)), { size: 1.2, gain: 0.2, twinkle: 0.4, t: f.t, fog: 100 });
    const gl = lmGlow();
    const cliff = u => clamp((u - 0.56) / 0.44);
    const val = u => u < 0.56 ? 0.84 + 0.018 * noise1(u * 11, 2)
      : 0.84 - 0.78 * ease.inQuad(cliff(u)) - 0.015 * noise1(u * 30, 7) * cliff(u);
    const ch = OPS.chart(gl, f, {
      x: 270, y: 380, w: 1380, h: 470,
      val, upto: prog(f.lt, 0.25, f.dur * 0.8), color: 'accent', width: 3.4, tipDot: true,
      ticks: [[0, '0'], [0.25, '12k'], [0.5, '24k'], [0.75, '36k'], [1, '48k']],
      yticks: [[0.2, '0.6'], [0.5, '1.6'], [0.8, '2.6']],
    });
    lmTag(gl, 'TRAINING LOSS — RUN 001', 270, 330, { align: 'left', size: 17 });
    // the cliff marker, when the drop arrives
    const w = MV.lyrics.get('sudden drop').words[2];
    const kd = clamp((f.t - w.start) / 0.5);
    if (kd > 0) {
      const cx = 270 + 1380 * 0.56;
      OPS.stroke(gl, [[cx, 380], [cx, 850]], { color: 'warn', alpha: 0.8 * kd, width: 1.6, dash: [7, 9] });
      OPS.tick(gl, 'sudden drop', cx + 12, 404, { align: 'left', color: 'warn', size: 18, alpha: kd });
    }
    lmEnd(g);
    if (ch.tip) MV.focus(ch.tip[0], ch.tip[1], 'loss tip');
    const v = 2.62 - 2.0 * clamp(prog(f.lt, 0.25, f.dur * 0.8) * 1.05 - 0.05);
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['loss', v.toFixed(4)], ['step', lmFmt(48000 * clamp(prog(f.lt, 0.25, f.dur * 0.8)) | 0)]] }));
    return {};
  },
});
