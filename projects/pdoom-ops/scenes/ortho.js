// ortho — "Orthogonality thesis blues": two arrows — capability up, goal sideways — at first
// cheek by jowl, then sliding to a precise right angle and beyond, in blue. The equalizer bars
// underneath play the blues.
MV.scene('ortho', {
  render(g, f) {
    lmBegin('ice', { accent: '#5C8DFF', hot: '#A8C6FF' });
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(200, 231)), { size: 1.1, gain: 0.13, twinkle: 0.4, t: f.t, fog: 80 });
    const gl = lmGlow();
    const O = [500, 660];
    const sep = prog(f.lt, 0.15, f.dur * 0.8);                       // 0 = together, 1 = orthogonal
    const capA = -Math.PI / 2 + 0.5 * (1 - sep) * 0.9;               // capability, mostly up
    const goalA = 0.12 + (Math.PI / 2 - 0.12) * sep * 1.12;          // goal, sliding away to ⊥
    const Lc = 420, Lg = 300;
    const tipC = [O[0] + Math.cos(capA) * Lc, O[1] + Math.sin(capA) * Lc];
    const tipG = [O[0] + Math.cos(goalA) * Lg, O[1] + Math.sin(goalA) * Lg];
    OPS.arrow(gl, O, tipC, { color: 'fg', width: 4, draw: clamp(f.lt * 1.4), glow: 12 });
    OPS.arrow(gl, O, tipG, { color: 'accent', width: 4, draw: clamp(f.lt * 1.1), glow: 12 });
    OPS.tick(gl, 'CAPABILITY', tipC[0] + 16, tipC[1] + 40, { align: 'left', size: 18 });
    OPS.tick(gl, 'GOAL', tipG[0] - 10, tipG[1] + 46, { align: 'right', size: 18, color: 'accent' });
    OPS.tick(gl, `θ = ${Math.round((goalA - capA) * 180 / Math.PI)}°`, O[0] + 60, O[1] + 130, { align: 'left', size: 17, color: 'dim' });
    // the blues: twelve bars, swaying
    const tB = MV.lyrics.get('Orthogonality').start;
    for (let i = 0; i < 12; i++) {
      const h = 30 + 130 * Math.abs(Math.sin(f.t * 1.4 + i * 1.7)) * (0.4 + 0.6 * f.a.mid);
      const x = 260 + i * 46;
      OPS.stroke(gl, [[x, 940], [x, 940 - h]], { color: 'accent', alpha: 0.35 + 0.3 * Math.sin(f.t + i), width: 7 });
    }
    lmTag(gl, 'Δθ DRIFT — 12-BAR', 260, 890, { align: 'left', size: 14, color: 'dim' });
    lmEnd(g);
    MV.focus(tipG[0], tipG[1], 'goal');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['θ', `${Math.round((goalA - capA) * 180 / Math.PI)}°`], ['key', 'BLUES']] }));
    return {};
  },
});
