// alert — red palette, the fast end. A tunnel of wire squares rushes at the camera; a big word decodes out of
// scrambled glyphs and tears on every beat (the whole frame glitches: return { glitch }).
MV.scene('alert', {
  init() {
    const sq = LG.seg([[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]], { closed: true });
    this.n = 26; this.gap = 1.1; this.sq = sq;
    this.rails = LG.pairs([[[-1, -1, -2], [-1, -1, -30]], [[1, -1, -2], [1, -1, -30]], [[1, 1, -2], [1, 1, -30]], [[-1, 1, -2], [-1, 1, -30]]]);
    this.dust = LG.box(1600, [2, 2, 30], { seed: 41 }).map((v, i) => (i % 3 === 2 ? v - 15 : v));
  },
  render(g, f) {
    const t = f.t, beat = Math.pow(1 - f.beatPhase, 6), cam = lmCamera({ eye: [0, 0, 2.2], target: [0, 0, -10], fov: 62, roll: Math.sin(t * 0.7) * 0.12 });
    lmBegin('alert');
    const run = f.lt * 6.5;
    for (let i = 0; i < this.n; i++) {
      const z = -((i * this.gap - run) % (this.n * this.gap) + this.n * this.gap) % (this.n * this.gap);
      const near = clamp(1 + z / 6);
      lmLines(cam, this.sq, { width: 1.4, gain: 0.25 + 0.9 * near + beat * 0.6, model: { pos: [0, 0, z], rot: [0, 0, z * 0.05] }, color: near > 0.6 ? 'hot' : 'fg', dof: 6, focus: 6 });
    }
    lmLines(cam, this.rails, { width: 1, gain: 0.3, color: 'accent', fog: 14 });
    lmPoints(cam, this.dust, { size: 1.2, gain: 0.6, dof: 14, focus: 6, model: { pos: [0, 0, (run % 30)] } });
    lmBig(lmGlow(), 'SIGNAL LOST', W / 2, H / 2 - 20, { size: 120, track: 0.42, weight: 700, decode: prog(f.lt, 0.15, 1.3), glitch: beat * 0.8, t, color: 'hot' });
    lmEnd(g, { ca: 0.9 + beat * 2 });
    lmHud(g, f, {
      id: 'c6', name: 'overflow', valueColor: 'warn',
      rows: [['carrier', beat > 0.3 ? 'lost' : 'searching'], ['packets', lmFmt(Math.floor(f.lt * 1873))], ['drift', (0.03 + beat * 0.4).toFixed(3)]],
      foot: 'view  tunnel · 62°',
    });
    lmTerminal(g, f, { status: `Reconnecting… (${f.lt.toFixed(1)} s · ↓ ${(f.lt * 0.9).toFixed(1)}k packets)` });
    return { glitch: 0.06 + beat * 0.45 };
  },
});
