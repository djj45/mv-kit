// flops — "One E thirty FLOPs a second": the counter rolling toward 1e30, digits spinning; the
// GPU grid beneath it shimmering like a heatsink.
MV.scene('flops', {
  render(g, f) {
    lmBegin('ice');
    const cam = lmScreen();
    lmPoints(cam, this.stars || (this.stars = OPS.mkStars(300, 151)), { size: 1.2, gain: 0.18, twinkle: 0.4, t: f.t, fog: 100 });
    // the GPU grid: a slab of tiny twinkling points below the number
    if (!this.grid) {
      const P = [];
      for (let x = 0; x < 46; x++) for (let z = 0; z < 14; z++) P.push((x - 23) * 38 + (z % 2) * 19, 0, z * 52);
      this.grid = new Float32Array(P);
    }
    const cam3 = lmOrbit({ yaw: 0.42 + Math.sin(f.t * 0.08) * 0.05, pitch: 0.5, dist: 1900, target: [0, 150, 0], shift: [0, 330] });
    lmPoints(cam3, this.grid, { size: 2.2, gain: 0.5, color: 'accent', twinkle: 0.75, t: f.t, fog: 26 });
    const gl = lmGlow();
    // the number: 1e27 → 1e30, the last digits a blur of carries
    const p = clamp(f.lt / f.dur);
    const exp = 27 + 3 * ease.inQuad(p);
    const lead = `1e${Math.floor(exp)}`;
    const tail = `${Math.floor((exp % 1) * 100).toString().padStart(2, '0')}${(hash(f.tick, 7, 1) * 1e4 | 0).toString().slice(0, 4)}`;
    gl.save(); gl.font = `600 190px ${LM_MONO}`; gl.letterSpacing = '10px'; gl.textAlign = 'center'; gl.textBaseline = 'alphabetic';
    gl.fillStyle = lmCss('hot', 1); glow(gl, lmCss('hot', 0.7), 70);
    gl.fillText(`${lead}·${tail}`, W / 2, 430);
    gl.restore();
    lmTag(gl, 'FLOPs / SECOND', W / 2, 500, { size: 18, color: 'accent', track: 0.5 });
    lmEnd(g, { bloom: 1.15 });
    MV.focus(W / 2, 380, 'counter');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['flops', `1e${exp.toFixed(2)}`], ['grid', '46×14']] }));
    return { shake: 2.5 * f.a.kick };
  },
});
