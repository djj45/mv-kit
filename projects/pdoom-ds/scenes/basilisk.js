// basilisk — 60.58–62.54, alert. "I hear the basilisk boom". Something rises behind the stack: a spiral of 13 000
// points that grows and rotates, smeared out of focus on purpose. It is never allowed to become an animal — no eyes,
// no head, no outline — it stays a turning vortex of light with a machine in front of it. The word "boom" is the
// only event: the vortex flares once, and the frame tears for a few frames.
MV.scene('basilisk', {
  init() {
    this.vortex = LG.galaxy(13000, { arms: 3, r: 3.4, twist: 4.6, spread: 0.62, thick: 0.13, core: 0.12, seed: 77 });
    this.veil = LG.sphere(5200, 2.7, { jitter: 0.55, seed: 78 });
    this.core = LG.gauss(1500, 0.38, { seed: 79 });
    this.stack = MX.layers(5, 121, { size: 1.5, spread: 0.5 });
    this.air = LG.ball(1200, 7.0, { seed: 19 });
  },
  render(g, f) {
    const d = dsFrame(f, 'alert');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.3, ease.outCubic) * dsOut(d, 0.25);
    // it rises for the whole shot, not just for the first 1.6 s: after the entrance it keeps creeping up
    const grow = dsIn(d, 0.0, 1.6, ease.outCubic) + 0.14 * clamp((d.lt - 1.6) / Math.max(0.01, d.dur - 1.6));
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('boom') === 0) wi = i;
    const boom = wi >= 0 ? dsPulse(t, ws[wi].start, 0.75) : 0;
    const flare = 1 + boom * 0.9;

    const cam = dsCam(d, {
      yaw: 0.35 + d.lt * 0.14, pitch: 0.055 + grow * 0.05, dist: lerp(5.9, 4.9, grow),
      fov: 38, punch: 0.06, seed: 23, target: [0, -0.2, -1.4],
    });
    dsLight(d, [
      dsAir(d, this.air, { gain: 0.22 * a, size: 1.05, dof: 30, drift: 0.07, t }),
      // the thing behind the stack: big, out of focus, and deliberately unreadable
      { P: this.vortex, o: { size: 1.15 * flare, gain: 1.0 * a, color: 'accent', dof: 17, focus: 3.6, drift: 0.09, twinkle: 0.5, t, model: { pos: [0, lerp(-2.3, 0.7, grow), -2.7], rot: [0.34, t * 1.05, 0.2], scale: lerp(0.72, 1.32, grow) * flare } } },
      // its centre: a genuinely bright core, so the vortex has something to be looking out of
      { P: this.core, o: { size: 1.9 * flare, gain: (0.4 + grow * 0.5) * a, color: 'hot', dof: 13, focus: 3.6, twinkle: 0.6, t, model: { pos: [0, lerp(-2.3, 0.7, grow), -2.7], rot: [0.34, t * 1.05, 0.2], scale: lerp(0.8, 1.4, grow) * flare } } },
      { P: this.veil, o: { size: 1.05, gain: 0.2 * a, color: 'dim', dof: 22, focus: 3.6, drift: 0.12, t, model: { pos: [0, lerp(-2.0, 0.4, grow), -2.0], scale: lerp(0.7, 1.2, grow) } } },
      // the machine, in front, silhouetted against the thing it is looking at
      ...MX.layersDraw(this.stack, (d.barPhase * 2) % 1, { gain: 0.45 * a, size: 1.7, dof: 8, focus: 5.2, fire: 0.7, wire: 0.32, color: 'dim' }),
    ], { cam, end: { bloom: 0.95 + boom * 0.35, exposure: 0.9, ca: 0.9, radius: 0.6 } });

    g.save();
    g.globalAlpha = a;
    TL.stamp(g, d, 'UNIDENTIFIED OPTIMIZER', 110, 150, { size: 14, track: 4, color: boom > 0.1 ? 'hot' : 'dim' });
    TL.block(g, d, [
      ['signal', '0x8F2A'],
      ['source', 'below horizon'],
      ['class', 'basilisk'],
      ['advice', 'do not read'],
      ['state', boom > 0.1 ? 'BOOM' : 'RISING'],
    ], { x: 110, y: 300, hot: [4] });
    dsScan(g, 100, 272, 420, 146, { alive: 0.6 * a, alpha: 0.12, step: 3 });
    g.restore();

    dsTele(g, d, { id: 'c19', name: 'basilisk', rows: [['points', '13 000'], ['tilt', (t * 1.05).toFixed(1)], ['bite', boom.toFixed(2)], ['read', 'NO']], foot: 'it must stay unreadable' });
    // lyric: the regenerated plate gives this line 'wave' — a shape rising, drawn as amplitude — which is exactly
    // what the vortex is. Pinned line so the shot keeps drawing its own sentence; the mode is the plate's.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 46, y: H * 0.24 });
    dsLife(g, d, { gain: 1.0, dust: 100 });
    dsScanSweep(g, d, { alpha: 0.06, period: 4.8 });
    dsTick(g, d, { x: 620, y: 976, label: 'SIG', value: 0x8f2a % 1000, rate: 1 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 1.5 + d.kick * 1.8 + d.snare * 1.6),
      flash: boom * 0.18,
      glitch: boom > 0.55 ? 0.3 * boom : 0,
      vignette: 0.24,
    }, dsLifePost(d, { amount: 1.3 })));
  },
});
