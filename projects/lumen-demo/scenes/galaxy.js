// galaxy — ice palette with depth of field. A 140 000-point spiral, warm core / cold arms, the camera pushing in
// and down; near dust drifts past out of focus as soft disks. A thin orbit ring draws on.
MV.scene('galaxy', {
  init() {
    const n = 140000;
    this.stars = LG.galaxy(n, { r: 2.2, arms: 3, twist: 3.8, spread: 0.36, thick: 0.05, core: 0.14, seed: 11 });
    this.col = new Float32Array(n * 3); this.size = new Float32Array(n);
    const warm = [1, 0.93, 0.82], cold = [0.62, 0.84, 1];
    for (let i = 0; i < n; i++) {
      const x = this.stars[i * 3], z = this.stars[i * 3 + 2], k = clamp(Math.hypot(x, z) / 1.6);
      for (let c = 0; c < 3; c++) this.col[i * 3 + c] = lerp(warm[c], cold[c], k);
      this.size[i] = 0.55 + 1.1 * Math.pow(hash(i, 4), 3);
    }
    this.near = LG.ball(900, 3.2, { seed: 12 });
    this.ring = LG.seg(LG.circle(2.55, 256, 'xz'), { closed: true });
  },
  render(g, f) {
    const t = f.t, k = ease.inOutCubic(f.p);
    const dist = lerp(4.6, 3.1, k), cam = lmOrbit({ yaw: 0.4 + f.lt * 0.13, pitch: lerp(0.62, 0.34, k), dist, fov: 38, shift: [120, 0] });
    lmBegin('ice');
    lmPoints(cam, this.stars, { size: 1.15, gain: 0.42, colors: this.col, sizes: this.size, dof: 9, focus: dist, model: { rot: [0, -t * 0.08, 0] } });
    lmPoints(cam, this.near, { size: 1.4, gain: 0.5, dof: 26, focus: dist, drift: 0.05, t, color: 'accent' });
    lmLines(cam, this.ring, { width: 1, gain: 0.55, color: 'accent', model: { rot: [0.22, 0, 0.1] }, upto: prog(f.lt, 0.3, 2.8, ease.inOutCubic), dof: 9, focus: dist });
    lmEnd(g, { bloom: 0.9 });
    lmHud(g, f, {
      id: 'c2', name: 'galaxy',
      rows: [['points', lmFmt(140000, { sep: ' ' })], ['focus', `${dist.toFixed(2)} u`], ['aperture', 'f/1.4']],
      foot: 'view  orbit · depth of field',
    });
    lmTerminal(g, f);
  },
});
