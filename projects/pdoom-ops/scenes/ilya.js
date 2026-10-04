// ilya — "What did Ilya see? We'll never know": the eye motif, one last time — calm, immense,
// slowly closing over the question. When the lid meets, only a seam of light is left, and the
// starfield dims with it.
MV.scene('ilya', {
  init() {
    this.stars = OPS.mkStars(650, 301);
    this.shell = LG.sphere(2400, 320, { jitter: 0.02, seed: 15 });
    const rnd = mulberry32(17);
    this.iris = new Float32Array(820 * 3);
    for (let i = 0; i < 820; i++) { const a = rnd() * TAU, r = 62 + rnd() * 46; this.iris.set([Math.cos(a) * r, Math.sin(a) * r, 312], i * 3); }
  },
  render(g, f) {
    const shut = prog(f.lt, f.dur * 0.3, f.dur * 0.97, ease.inOutQuad);        // the lid closing
    lmBegin('ice');
    const cam = lmOrbit({ yaw: Math.sin(f.t * 0.1) * 0.05, pitch: 0.02, dist: 1250, shift: [0, -30] });
    lmPoints(cam, this.stars, { size: 1.4, gain: 0.34 * (1 - shut * 0.7), twinkle: 0.55, t: f.t, fog: 120 });
    lmPoints(cam, this.shell, { size: 1.6, gain: 0.3 * (1 - shut * 0.8), color: 'fg', twinkle: 0.3, t: f.t, dof: 3 });
    lmPoints(cam, this.iris, { size: 1.9, gain: 0.8 * (1 - shut), color: 'accent', twinkle: 0.45, t: f.t, drift: 2 });
    const gl = lmGlow();
    // the lids: two arcs over the eye, straightening into a seam as they close
    const R = 348, close = shut;
    gl.save(); gl.translate(W / 2, H / 2 - 20);
    gl.strokeStyle = lmCss('fg', 0.95); gl.lineWidth = 4; glow(gl, lmCss('fg', 0.5), 16);
    const lidArc = k => { gl.beginPath(); gl.moveTo(-R, 0); gl.quadraticCurveTo(0, R * 0.85 * (1 - k), R, 0); gl.stroke(); };
    lidArc(close);
    gl.strokeStyle = lmCss('fg', 0.8);
    gl.save(); gl.scale(1, -1); lidArc(close); gl.restore();
    // the seam, once closed
    if (close > 0.9) {
      const k = (close - 0.9) / 0.1;
      gl.strokeStyle = lmCss('hot', k); gl.lineWidth = 3; glow(gl, lmCss('hot', 0.8), 20);
      gl.beginPath(); gl.moveTo(-R, 0); gl.lineTo(R, 0); gl.stroke();
    }
    gl.restore();
    // redaction bars — what was seen
    const bars = 3;
    for (let i = 0; i < bars; i++) {
      const bw = 300 - i * 40, yy = H / 2 + 130 + i * 34;
      const on = clamp((f.lt - 0.8 - i * 0.3) * 2);
      if (on <= 0) continue;
      gl.fillStyle = lmCss('fg', 0.85 * on);
      gl.fillRect(W / 2 - bw / 2, yy, bw, 16);
    }
    lmEnd(g);
    MV.focus(W / 2, H / 2 - 20, 'eye');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['witness', 'UNAVAILABLE'], ['record', 'SEALED']] }));
    return {};
  },
});
