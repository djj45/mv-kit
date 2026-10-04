// eye — "I see sparks of AGI in your eyes": a point-cloud eye, the iris a ring of stars; the words
// "sparks" and "AGI" burst sparks off it. The insert punches in on the iris.
MV.scene('eye', {
  init() {
    this.stars = OPS.mkStars(500, 21);
    this.ball = LG.sphere(2600, 300, { jitter: 0.025, seed: 3 });          // the eyeball shell
    const rnd = mulberry32(4);
    const ring = (n, r0, r1) => { const P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * TAU, r = r0 + rnd() * (r1 - r0); P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = Math.sin(a) * r; P[i * 3 + 2] = 292 + rnd() * 6; } return P; };
    this.iris = ring(950, 64, 112);                                        // annulus facing the camera
    this.pupil = ring(240, 38, 44);
    this.sparks = []; for (let i = 0; i < 110; i++) this.sparks.push([rnd() * TAU, 0.5 + rnd()]);
  },
  render(g, f) {
    lmBegin('ice');
    const cam = lmOrbit({ yaw: Math.sin(f.t * 0.22) * 0.07, pitch: 0.03, dist: 1150, shift: [0, -30] });
    lmPoints(cam, this.stars, { size: 1.4, gain: 0.3, twinkle: 0.5, t: f.t, fog: 110 });
    lmPoints(cam, this.ball, { size: 1.5, gain: 0.3, color: 'fg', twinkle: 0.3, t: f.t, dof: 3 });
    lmPoints(cam, this.iris, { size: 1.9, gain: 0.85, color: 'accent', twinkle: 0.5, t: f.t, drift: 2 });
    lmPoints(cam, this.pupil, { size: 1.3, gain: 0.5, color: 'fg' });
    const C = cam.project([0, 0, 296]);
    // sparks fly when "sparks" and "AGI" are sung
    const gl = C ? lmGlow() : null;
    if (gl) for (const w of MV.lyrics.get('sparks of AGI').words) {
      if (w.w !== 'sparks' && w.w !== 'AGI') continue;
      const age = f.t - w.start;
      if (age < -0.05 || age > 0.65) continue;
      const k = clamp(age / 0.65);
      this.sparks.forEach(([a, sp], i) => {
        const r = 40 + age * 560 * sp;
        gl.fillStyle = lmCss('hot', (1 - k) * 0.9);
        gl.beginPath(); gl.arc(C[0] + Math.cos(a + sp * f.t) * r, C[1] + Math.sin(a + sp * f.t) * r, 2.4, 0, TAU); gl.fill();
      });
    }
    lmEnd(g);
    if (C) MV.focus(C[0], C[1], 'iris');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['subject', 'you'], ['gaze', 'back']] }));
    return {};
  },
});
