// spin — "And you're optimizing, accelerating": a centrifuge of point rings, spinning faster and
// faster with the accelerating line of the song, dragging ghost trails behind it.
MV.scene('spin', {
  init() {
    this.rings = [];
    const rnd = mulberry32(18);
    for (let k = 0; k < 3; k++) {
      const P = new Float32Array(700 * 3), r = 205 + k * 155;
      for (let i = 0; i < 700; i++) { const a = rnd() * TAU; P[i * 3] = Math.cos(a) * r; P[i * 3 + 1] = (rnd() - 0.5) * (14 + k * 10); P[i * 3 + 2] = Math.sin(a) * r; }
      this.rings.push(P);
    }
  },
  render(g, f) {
    lmBegin('ice');
    const cam = lmOrbit({ yaw: 0.55, pitch: 0.34, dist: 1500, roll: Math.sin(f.t * 0.1) * 0.04 });
    const w = 0.5 + 4.2 * Math.pow(clamp(f.lt / f.dur), 2.2);                        // the acceleration
    this.rings.forEach((P, k) => {
      for (let s = 2; s >= 0; s--) lmPoints(cam, P, {
        size: 2 - k * 0.3, gain: s === 0 ? 0.85 : 0.22 / s, color: s === 0 ? (k === 1 ? 'accent' : 'fg') : 'fg',
        model: { rot: [0, -(f.t * w + s * 0.07 * w), 0] },
      });
    });
    const gl = lmGlow();
    // the axis and a tachometer readout of how far it has gone
    OPS.stroke(gl, [[W / 2 - 260, H / 2], [W / 2 + 260, H / 2]], { color: 'dim', alpha: 0.6, width: 1.4, dash: [8, 10] });
    gl.save(); gl.strokeStyle = lmCss('accent', 0.85); gl.lineWidth = 3; glow(gl, lmCss('accent', 0.5), 12);
    gl.beginPath(); gl.arc(W - 320, 240, 90 + 26 * Math.sin(f.t * w * 3), 0, TAU * clamp(f.lt / f.dur)); gl.stroke(); gl.restore();
    OPS.tick(gl, lmFmt(w * 1e4 | 0) + ' rpm', W - 320, 240, { color: 'accent', size: 17 });
    lmEnd(g);
    const a = f.t * w;
    MV.focus(W / 2 + Math.cos(a) * 380 * 0.8, H / 2 + Math.sin(a) * 120, 'rim');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['objective', '↓ inf'], ['iters/s', lmFmt(1e5 * w | 0)]] }));
    return {};
  },
});
