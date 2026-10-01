// boot — ice palette. A wireframe icosahedron draws itself edge by edge over a faint floor grid, its vertices
// flaring on the beat; the code that 'builds' it types out at the left, and the scene's own source scrolls behind. Terminal lyrics bottom left, HUD frame.
MV.scene('boot', {
  init() {
    this.edges = LG.poly('icosa', 1.25);
    this.inner = LG.poly('dodeca', 0.62);
    this.verts = new Float32Array(LG.solid('icosa', 1.25).flat());
    this.floor = LG.grid(24, 24, { y: -1.75 });
    this.dust = LG.stars(1600, 26, { seed: 3 });
    this.src = lmSource('boot');
    this.code = 'const space = new Field({\n  points: 12,\n  edges: 30,\n  light: true, // 0.004 s\n});\nspace.run();';
  },
  render(g, f) {
    const t = f.t, cam = lmOrbit({ yaw: 0.55 + t * 0.22, pitch: 0.3, dist: 5.4, fov: 34, shift: [190, -10] });
    const rot = { rot: [0, t * 0.35, 0.18] }, beat = Math.pow(1 - f.beatPhase, 4);
    lmBegin('ice');
    const glow = lmGlow();
    lmCodeBg(glow, this.src, { alpha: 0.09, scroll: t * 46, x: 70 });
    lmPoints(cam, this.dust, { size: 1.1, gain: 0.5, twinkle: 0.6, t });
    lmLines(cam, this.floor, { width: 1, gain: 0.16, glow: 0, fog: 8 });
    lmLines(cam, this.inner, { width: 1, gain: 0.35, color: 'dim', model: { rot: [0.4, -t * 0.6, 0] }, upto: prog(f.lt, 0.9, 2.6) });
    lmLines(cam, this.edges, { width: 1.6, gain: 1, glow: 0.25, model: rot, upto: prog(f.lt, 0.15, 1.9, ease.inOutCubic) });
    lmPoints(cam, this.verts, { size: 4 + 5 * beat, gain: 1.4 * prog(f.lt, 0.15, 1.9), color: 'accent', model: rot, persp: true });
    lmEnd(g);
    const ca = 1 - prog(f.lt, 2.6, 3.1);                                      // the code that builds it, typed, then gone
    if (ca > 0) { g.save(); g.globalAlpha = ca; lmCode(g, this.code, 170, 330, { size: 24, chars: (f.lt - 0.1) * 60 }); g.restore(); }
    // a callout pinned to one rotating vertex
    const p = cam.project(lmXf(rot, LG.solid('icosa', 1.25)[3]));
    if (p) lmLabel(g, p[0], p[1], 'v₃ ∈ ℝ³', { dx: 70, dy: -60, draw: prog(f.lt, 1.6, 2.3), color: 'accent' });
    lmHud(g, f, {
      id: 'c1', name: 'boot', on: lmFlick(t, f.from, 0.45),
      rows: [['vertices', 12], ['edges', Math.round(30 * prog(f.lt, 0.15, 1.9, ease.inOutCubic))], ['beat', f.beatPhase.toFixed(2)]],
      foot: 'view  orbit · perspective',
    });
    lmTerminal(g, f, { status: f.lt < 1.2 ? 'Booting… (0.4 s · 12 vertices)' : null });
  },
});
