// basilisk — "I hear the basilisk boom": the eye motif returns, red and slit-pupilled; every kick
// of "boom" punches a shock ring out of it. The insert drives into the pupil.
MV.scene('basilisk', {
  init() {
    this.stars = OPS.mkStars(420, 121);
    this.shell = LG.sphere(2200, 310, { jitter: 0.02, seed: 9 });
    const rnd = mulberry32(10);
    this.iris = new Float32Array(820 * 3);
    for (let i = 0; i < 820; i++) { const a = rnd() * TAU, r = 66 + rnd() * 48; this.iris.set([Math.cos(a) * r, Math.sin(a) * r, 302], i * 3); }
  },
  render(g, f) {
    lmBegin('alert');
    const cam = lmOrbit({ yaw: Math.sin(f.t * 0.17) * 0.05, pitch: 0.02, dist: 1600, shift: [0, 160] });
    lmPoints(cam, this.stars, { size: 1.3, gain: 0.26, twinkle: 0.5, t: f.t, fog: 110 });
    lmPoints(cam, this.shell, { size: 1.8, gain: 0.32, color: 'fg', twinkle: 0.3, t: f.t, dof: 3 });
    lmPoints(cam, this.iris, { size: 2.2, gain: 0.85, color: 'accent', twinkle: 0.55, t: f.t, drift: 2 });
    const C = cam.project([0, 0, 306]);
    const gl = C ? lmGlow() : null;
    if (gl) {
      // the slit pupil
      gl.save(); gl.strokeStyle = lmCss('fg', 0.95); gl.lineWidth = 5; glow(gl, lmCss('fg', 0.6), 18);
      gl.beginPath(); gl.moveTo(C[0], C[1] - 60); gl.quadraticCurveTo(C[0] + 12, C[1], C[0], C[1] + 60); gl.stroke();
      gl.beginPath(); gl.moveTo(C[0], C[1] - 60); gl.quadraticCurveTo(C[0] - 12, C[1], C[0], C[1] + 60); gl.stroke();
      gl.restore();
      // radiating lashes, bristling with the music — short, clear of the lyric band
      const n = 26;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + 0.11, bristle = 258 + 34 * Math.sin(f.t * 2.1 + i) + 40 * f.a.low;
        OPS.stroke(gl, [[C[0] + Math.cos(a) * 236, C[1] + Math.sin(a) * 236], [C[0] + Math.cos(a) * bristle, C[1] + Math.sin(a) * bristle]], { color: 'warn', alpha: 0.55, width: 1.6 });
      }
      OPS.rings(gl, f, { x: C[0], y: C[1], speed: 220, color: 'warn', width: 3, window: 0.5 });
    }
    lmEnd(g, { bloom: 1.2 });
    if (C) MV.focus(C[0], C[1], 'pupil');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['entity', 'BASILISK'], ['range', 'ALL']] }));
    return { shake: 5 * f.a.kick };
  },
});
