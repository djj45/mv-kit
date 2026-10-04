// turn — "Sharp left turn and there you are / Without a single CDR": the forecast fan — a bundle
// of polite futures, and one red trajectory that swerves hard left and leaves through the missing
// guardrail. The insert follows the red tip.
MV.scene('turn', {
  init() {
    const rnd = mulberry32(28);
    this.fan = [];
    for (let i = 0; i < 13; i++) {
      const k = (i / 12 - 0.5) * 2;
      this.fan.push(u => [280 + u * 1360, 620 + u * u * (k * 330) - u * 40]);
    }
    // the guardrail with a gap: vertical dashes, missing between y1..y2 at x 1560
    this.rail = { x: 1560, gap0: 430, gap1: 700 };
  },
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(240, 191)), { size: 1.1, gain: 0.15, twinkle: 0.4, t: f.t, fog: 90 });
    const gl = lmGlow();
    const tTurn = MV.lyrics.get('Sharp left').words[1].start;      // "left"
    // the polite futures, faint
    this.fan.forEach((p, i) => {
      const pts = [];
      for (let u = 0; u <= 1.001; u += 1 / 40) pts.push(p(u));
      OPS.stroke(gl, pts, { color: 'dim', alpha: 0.58, width: 1.5, upto: clamp(prog(f.lt, 0.1, 1.2) * 1.3 - i * 0.02) });
    });
    // the red one: same start, then it swerves on "left"
    const sw = clamp((f.t - tTurn + 0.25) / 0.9);
    const red = [];
    for (let u = 0; u <= 1.001; u += 1 / 90) {
      const x0 = 280 + u * 1360, y0 = 620 - u * 40;
      const ux = clamp((u - 0.5) / 0.5);
      const s = ease.inCubic(ux) * sw;
      red.push([x0, y0 - s * 430 * ux - s * 60]);
    }
    const grow = clamp(prog(f.lt, 0.3, 2.2) * 1.25);
    const tip = OPS.stroke(gl, red, { color: 'warn', width: 3.4, upto: grow, glow: 16 });
    // the guardrail: dashes with the gap the red line exits through
    for (let y = 260; y < 900; y += 46) {
      if (y > this.rail.gap0 && y < this.rail.gap1) continue;
      OPS.stroke(gl, [[this.rail.x, y], [this.rail.x, y + 26]], { color: 'dim', alpha: 0.75, width: 3 });
    }
    OPS.tick(gl, 'CDR: 0', this.rail.x + 26, 620, { align: 'left', color: 'warn', size: 17, alpha: clamp(sw * 2) });
    lmTag(gl, 'FORECAST — H+36H', 280, 252, { align: 'left', size: 16 });
    lmEnd(g);
    const T = tip || red[red.length - 1];
    MV.focus(T[0], T[1], 'red tip');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['paths', '14'], ['contained', 'NO']] }));
    return {};
  },
});
