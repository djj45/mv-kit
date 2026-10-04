// servant — "now I'm your servant and you're my boss". One small cloud low in the frame, one enormous thin one
// above it, and the light is entirely on the big one. The scale difference is the whole shot: the human is a
// thumbnail, the machine is the ceiling. No faces, no figures — just two masses and their relative size.
MV.scene('servant', {
  init() {
    // the small one: a tight ball, low, slightly off-centre
    this.small = LG.gauss(2600, 0.34, { seed: 51, at: [-1.15, -1.5, 0] });
    // the big one: a shell 12× wider, sitting overhead
    this.big = LG.sphere(16000, 4.6, { jitter: 0.22, seed: 52 });
    const rnd = mulberry32(53);
    for (let i = 0; i < this.big.length; i += 3) { this.big[i + 1] = this.big[i + 1] * 0.5 + 2.6 + rnd() * 0.3; }
    // the tether: a thin bundle from the small cloud up into the big one — the lyric's actual relationship
    const tie = [];
    for (let k = 0; k < 22; k++) {
      const a = hash(k, 4) * TAU, r = 0.2 + hash(k, 6) * 0.5;
      tie.push([[-1.15 + Math.cos(a) * r, -1.5, Math.sin(a) * r * 0.4], [-1.15 + Math.cos(a) * 1.6, 3.4, Math.sin(a) * 1.2]]);
    }
    this.tie = LG.pairs(tie, { bright: 0.4 });
    this.dust = LG.ball(1500, 5.0, { seed: 54 });
    this.pulse = LG.sphere(1200, 4.62, { jitter: 0.05, seed: 55 });
  },
  render(g, f) {
    // the chapter turns from ice to ember inside this shot: the structure stays cold, the light goes warm
    const d = dsFrame(f, 'ember', { dim: '#6E7A85', fg: '#F3E5CF', accent: '#7AD7CF' });
    d.g = g;
    const inA = dsIn(d, 0, 1.4, ease.outCubic);
    const outA = dsOut(d, 0.45);   // the next shot cross-fades in over the tail
    // the big mass breathes once per bar; the small one only reacts to the kick
    const breath = 1 + 0.012 * Math.sin(d.barPhase * TAU) + d.low * 0.02;
    const p = ease.inOutCubic(clamp(d.lt / Math.max(0.01, d.dur)));
    const cam = dsCam(d, {
      yaw: 0.3 + p * 0.22, pitch: lerp(0.02, -0.16, p), dist: lerp(8.4, 7.2, p), fov: 40,
      shift: [lerp(80, -40, p), lerp(-30, 40, p)], punch: 0.008, seed: 16,
    });

    const list = [
      dsAir(d, this.dust, { gain: 0.22, size: 1.05, dof: 34, drift: 0.06, t: d.t }),
      // the ceiling: this is where all the light goes
      { P: this.big, o: { size: 1.15, gain: 0.46 * inA * outA, color: 'fg', dof: 16, focus: 9, twinkle: 0.35, t: d.t, model: { scale: breath } } },
      { P: this.pulse, o: { size: 1.5 + d.kick * 1.2, gain: 0.22 * inA * outA * (0.4 + d.kick), color: 'accent', dof: 12, focus: 9, drift: 0.08, t: d.t } },
      { S: this.tie, o: { width: 1, gain: 0.3 * inA * outA, color: 'dim', glow: 0.25, dof: 18, model: { rot: [0, Math.sin(d.t * 1.7) * 0.02, 0] } } },
      // the human: a thumbnail, and it does not light up
      // the human thumbnail is a *busy* thumbnail: it churns on the kick while the ceiling only breathes
      { P: this.small, o: { size: 1.4, gain: 0.3 * inA * outA, color: 'accent', dof: 8, focus: 6, twinkle: 0.85, t: d.t, drift: 0.1 + d.kick * 0.25 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.55, exposure: 0.86, ca: 0.4, radius: 0.5 } });

    g.save();
    g.globalAlpha = inA * outA;
    // the measurement: the film's actual joke — it measures the relationship in parameters
    const y0 = H - 300;
    g.strokeStyle = dsTone(d, 'dim', 0.45); g.lineWidth = 1;
    g.beginPath(); g.moveTo(150, y0); g.lineTo(150, H - 130); g.stroke();
    for (let i = 0; i <= 4; i++) { const y = y0 + (H - 130 - y0) * i / 4; g.beginPath(); g.moveTo(150, y); g.lineTo(166, y); g.stroke(); }
    dsLine(g, '10⁰', 178, y0, { font: dsMono(13, 400), size: 13, color: dsTone(d, 'dim', 0.8), glow: 0, align: 'left' });
    dsLine(g, '10¹²', 178, H - 130, { font: dsMono(13, 400), size: 13, color: dsTone(d, 'dim', 0.8), glow: 0, align: 'left' });
    dsLine(g, 'SCALE', 150, y0 - 30, { font: dsMono(13, 400), size: 13, track: 5, color: dsTone(d, 'dim', 0.8), glow: 0, align: 'left' });
    // two labels with hairline leaders, pinned to the two masses
    const bigP = cam.project([0, 3.0, 0]), smallP = cam.project([-1.15, -1.5, 0]);
    if (bigP) lmLabel(g, bigP[0], bigP[1], '1.82 × 10¹² PARAMETERS', { pal: d.pal, dx: 96, dy: -54, draw: dsIn(d, 0.7, 0.8), color: 'accent' });
    if (smallP) lmLabel(g, smallP[0], smallP[1], '1', { pal: d.pal, dx: -70, dy: 44, draw: dsIn(d, 1.3, 0.8), color: 'dim' });
    TL.block(g, d, [
      ['you', '1'],
      ['servant', '1'],
      ['boss', '1'],
      ['ratio', (1.82e12).toExponential(2)],
    ], { x: W - 470, y: H - 320, hot: [3] });
    g.restore();

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.07, period: 4.2 });
    dsTick(g, d, { x: W - 70, y: H - 70, rate: 271, label: 'ratio×' });
    dsTele(g, d, { id: 'c06', name: 'servant', rows: null, foot: 'scale · two masses, one light' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    const life = dsLifePost(d, { amount: 1.1 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.7 + d.kick * 1.0, 3), vignette: 0.24 }, life));
  },
});
