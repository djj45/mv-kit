// singularity — 41.69–45.06, ember. "But now the singularity's begun": a lattice and its ring close onto a core.
// The whole shot is one collapse — the shell, the cage and the ring all share a single scale that goes from 1 to
// 0.14, while the core at the middle gets brighter as the frame empties around it. timeline.js brings the next shot
// in through the frame (wipe 'zoom', match 'full'), which is why this shot publishes `full` as its anchor.
MV.scene('singularity', {
  init() {
    this.shell = LG.sphere(9000, 3.4, { jitter: 0.05, seed: 44 });
    this.cage = MX.cage(3.4, { rings: 5, seg: 64 });
    this.ring = LG.ring(3600, { r: 3.5, width: 0.5, thick: 0.035, seed: 9 });
    this.core = MX.core(0.9, { n: 3200, halo: 2000, rays: 20 });
    this.air = LG.ball(1300, 6.4, { seed: 12 });
    this.close = 0;
  },
  anchors(f) { return { full: [0, 0, W, H] }; },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.1, 0.5, ease.outCubic) * dsOut(d, 0.28);
    // the collapse: one curve, from just after the cut to just after the word "begun"
    const close = clamp(dsIn(d, 0.4, 2.4, ease.inOutCubic) + d.kick * 0.03);
    const sc = lerp(1, 0.14, close);
    const hole = dsPulse(t, dsStep(f, 'kick', 0.5), 0.45);      // each kick tightens the ring a notch

    const cam = dsCam(d, {
      yaw: 0.32 + d.lt * 0.09, pitch: 0.13, dist: lerp(7.6, 4.5, close), fov: 36,
      punch: 0.05, seed: 9,
    });
    dsLight(d, [
      dsAir(d, this.air, { gain: (0.28 - close * 0.2) * a, size: 1.05, dof: 28, drift: 0.05, t }),
      // the lattice: shell points and the cage wire, both shrinking — and both turning, so the collapse is a
      // movement and not a scale value
      { P: this.shell, o: { size: 1.1, gain: 0.5 * a * (1 - close * 0.55), color: 'accent', dof: 13, focus: 5, twinkle: 0.3, t, model: { scale: sc, rot: [0, d.lt * 0.22, 0] } } },
      { S: this.cage, o: { width: 1, gain: 0.42 * a * (1 - close * 0.6), color: 'dim', glow: 0.25, dof: 13, model: { scale: sc, rot: [0, -d.lt * 0.3, 0] } } },
      // the ring that closes: the loudest line in the frame while it is still wide
      { P: this.ring, o: { size: 1.35, gain: 0.85 * a * (1 - close * 0.3) * (1 + hole * 0.5), color: 'hot', dof: 8, focus: 5, model: { scale: sc, rot: [0, d.lt * 0.4, 0] } } },
      // the core: everything the frame is converging on. Ends the shot at full gain.
      { P: this.core.nucleus, o: { size: 1.5 + close * 0.6, gain: (0.5 + close * 0.65) * a, color: 'hot', dof: 6, focus: 5, model: { scale: 1 + close * 0.45 } } },
      { P: this.core.halo, o: { size: 1.05, gain: (0.16 + close * 0.2) * a, color: 'accent', dof: 18, focus: 5, twinkle: 0.4, t, model: { scale: 1 + close * 0.45, rot: [0, -d.lt * 0.5, 0] } } },
      { S: this.core.rays, o: { width: 1.2, gain: 0.3 * a * (0.5 + close), color: 'hot', glow: 0.6, dof: 12, model: { scale: 1 + close * 0.3, rot: [0, d.lt * 0.7, 0] } } },
    ], { cam, end: { bloom: 0.7 + close * 0.3, exposure: 0.9, ca: 0.5 + close * 0.35, radius: 0.5 } });

    g.save();
    g.globalAlpha = a;
    TL.stamp(g, d, 'FIELD COLLAPSE · r → 0', 110, 150, { size: 14, track: 4 });
    TL.block(g, d, [
      ['field r', lerp(3.40, 0.02, ease.inExpo(close)).toFixed(3)],
      ['density', 'ρ ' + (1 + close * close * 940).toFixed(1) + '×'],
      ['t − tc', '-' + lerp(2.6, 0.0, close).toFixed(2) + ' s'],
      ['containment', close < 0.72 ? 'CLOSING' : 'FAILED'],
    ], { x: 110, y: 320, hot: [3] });
    dsScan(g, 100, 292, 420, 122, { alive: 0.55 * a, alpha: 0.1, step: 3, phase: d.t * 0.5 });
    TL.matrix(g, d, W - 660, H - 300, 470, 130, { size: 13, alpha: 0.22, seed: 11, tail: 6 });
    g.restore();

    dsTele(g, d, { id: 'c15', name: 'singul', rows: [['r', lerp(3.4, 0.02, close).toFixed(3)], ['shell', '9 000'], ['core', '3 200'], ['wipe', 'zoom · full']], foot: 'one object at two scales' });
    // lyric: the regenerated plate gives this line 'sweep' — the read-out and the event arrive together, which is
    // what a collapse is. `line` is pinned so the shot keeps drawing its own sentence; the mode comes off the plate.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 54, y: H * 0.26 });
    dsLife(g, d, { gain: 1.0, dust: 100 });
    dsScanSweep(g, d, { alpha: 0.06, period: 5.0 });
    dsTick(g, d, { x: 620, y: 976, label: 't−tc', value: (1 - close) * 260, rate: 1 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.7 + d.kick * 1.1 + close * 0.8 * d.snare),
      flash: 0.1 * hole * close * a,
      vignette: 0.22 + close * 0.12,
    }, dsLifePost(d, { amount: 1.2 })));
  },
});
