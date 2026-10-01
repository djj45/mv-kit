// paper — the inverted palette: ink on a pale technical drawing (overlaps get darker). A Lorenz attractor as a
// vermilion point cloud inside a graphite frame, its trajectory drawing on as one thin line; callouts with leaders.
MV.scene('paper', {
  init() {
    // integrate once (deterministic): dx = σ(y − x), dy = x(ρ − z) − y, dz = xy − βz
    const s = 10, r = 28, b = 8 / 3, dt = 0.004, n = 36000, pts = [];
    let x = 0.1, y = 0, z = 0;
    for (let i = 0; i < n + 400; i++) {
      const dx = s * (y - x), dy = x * (r - z) - y, dz = x * y - b * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      if (i >= 400) pts.push([x / 14, (z - 25) / 14, y / 14]);
    }
    this.cloud = new Float32Array(pts.flat());
    this.path = LG.seg(pts.filter((_, i) => i % 3 === 0));
    this.frame = LG.wirebox([3.6, 3.4, 3.6]);
    this.marks = LG.pairs([[[-1.8, -1.7, 1.8], [-1.8, -1.7, 2.1]], [[1.8, -1.7, 1.8], [1.8, -1.7, 2.1]], [[-1.8, -1.7, -1.8], [-2.1, -1.7, -1.8]]]);
  },
  render(g, f) {
    const t = f.t, cam = lmOrbit({ yaw: 0.65 + f.lt * 0.12, pitch: 0.24, dist: 9.6, fov: 34, shift: [230, -30] });
    const draw = prog(f.lt, 0.1, 3.2, ease.inOutCubic);
    lmBegin('paper');
    lmLines(cam, this.frame, { width: 1.3, gain: 0.85, glow: 0 });
    lmLines(cam, this.marks, { width: 1.3, gain: 0.85, glow: 0 });
    lmPoints(cam, this.cloud, { size: 1, gain: 0.5, color: 'accent', count: draw * 36000, dof: 5 });
    lmLines(cam, this.path, { width: 0.6, gain: 0.22, glow: 0, upto: draw });
    lmEnd(g);
    const head = cam.project([...this.cloud.subarray(Math.max(0, Math.floor(draw * 36000) - 1) * 3, Math.max(1, Math.floor(draw * 36000)) * 3)]);
    if (head && draw < 1) lmLabel(g, head[0], head[1], 'x(t)', { dx: -90, dy: -70, size: 18, color: 'accent', draw: prog(f.lt, 0.3, 0.8) });
    const corner = cam.project([1.8, -0.4, 1.8]);
    if (corner) lmLabel(g, corner[0], corner[1], 'σ = 10   ρ = 28   β = 8/3', { dx: 70, dy: 40, draw: prog(f.lt, 0.8, 1.5) });
    lmHud(g, f, { id: 'c5', name: 'plot', rows: [['steps', lmFmt(Math.round(draw * 36000), { sep: ' ' })], ['dt', '0.004']], foot: 'fig. 3 — orthographic sketch, ink' });
    g.save(); g.font = `24px ${LM_MONO}`; g.textAlign = 'center'; g.fillStyle = lmCss('fg', 0.9);
    g.globalAlpha = prog(f.lt, 1.2, 1.8); g.fillText('dx/dt = σ(y − x)    dz/dt = xy − βz', W / 2 + 230, H - 118); g.restore();
    lmTerminal(g, f, { since: f.from - 0.3 });
  },
});
