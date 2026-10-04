// shoggoth — "See through the shoggoth's lies". The thing under the pretraining: a noisy mass built from three
// gaussian shells, warm at the core and cold at the rim, and it never resolves into a shape. It is the one shot
// in the film allowed per-point colours, and the one shot where the camera does not approach it — you look at the
// shoggoth from a safe distance, which is the joke.
MV.scene('shoggoth', {
  init() {
    const s = MX.shoggoth(34000, 2.5, { seed: 71, tint: true });
    this.P = s.P; this.colors = s.colors;
    // slow breathing is applied per point from its own radius, computed once
    const n = this.P.length / 3;
    this.r = new Float32Array(n);
    for (let i = 0; i < n; i++) this.r[i] = Math.hypot(this.P[i * 3], this.P[i * 3 + 1], this.P[i * 3 + 2]);
    this.tmp = new Float32Array(this.P.length);
    // the lies: a shell of thin blades around it, each a hairline that is not quite a chord of the mass
    const blades = [];
    for (let k = 0; k < 90; k++) {
      const a = hash(k, 3) * TAU, b = Math.acos(2 * hash(k, 5) - 1), r0 = 3.0, r1 = 3.0 + hash(k, 7) * 1.4;
      blades.push([[Math.sin(b) * Math.cos(a) * r0, Math.cos(b) * r0, Math.sin(b) * Math.sin(a) * r0],
                   [Math.sin(b) * Math.cos(a) * r1, Math.cos(b) * r1, Math.sin(b) * Math.sin(a) * r1]]);
    }
    this.blades = LG.pairs(blades, { bright: 0.45 });
    this.tongue = MX.tokens(4200, { strands: 4, len: 9, rad: 1.2, twist: 2.1 });
    this.dust = LG.ball(1500, 7, { seed: 72 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const inA = dsIn(d, 0, 2.0, ease.outCubic);
    const outA = dsOut(d, 0.3);
    // it breathes on the bar, and it twitches on the snare — a big slow thing that notices you
    const breath = 1 + 0.03 * Math.sin(d.barPhase * TAU) + d.snare * 0.02;
    const P = this.tmp, n = this.r.length;
    for (let i = 0; i < n; i++) {
      const k = breath;
      P[i * 3] = this.P[i * 3] * k; P[i * 3 + 1] = this.P[i * 3 + 1] * k; P[i * 3 + 2] = this.P[i * 3 + 2] * k;
    }
    P.__v = (P.__v || 0) + 1;

    const p = ease.inOutCubic(clamp(d.lt / Math.max(0.01, d.dur)));
    // a slow, small drift: the camera is being careful
    const cam = dsCam(d, {
      yaw: 0.4 + p * 0.5, pitch: 0.12 + Math.sin(d.lt * 0.22) * 0.05, dist: lerp(8.6, 7.4, p), fov: 36,
      punch: 0.006, wobble: 0.02, seed: 30,
    });

    const list = [
      dsAir(d, this.dust, { gain: 0.18, size: 1.05, dof: 36, drift: 0.05, t: d.t }),
      { P, o: { dynamic: true, size: 1.15, gain: 0.34 * inA * outA, colors: this.colors, dof: 16, focus: 8, drift: 0.02, t: d.t } },
      // the hot interior: a small subset at full gain, so the mass has a centre
      { P, o: { dynamic: true, size: 1.6, gain: 0.42 * inA * outA, color: 'hot', dof: 8, focus: 8, count: 1800 } },
      { S: this.blades, o: { width: 1, gain: 0.3 * inA * outA * (0.4 + d.hat), color: 'accent', glow: 0.3, dof: 20, model: { rot: [d.t * 0.08, -d.t * 0.05, 0] } } },
      { S: this.tongue, o: { width: 1.2, gain: 0.28 * inA * outA, color: 'warn', glow: 0.4, dof: 26, model: { rot: [0.6, d.t * 0.12, 0.3] } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.68, exposure: 0.85, ca: 0.5, radius: 0.52 } });

    g.save();
    g.globalAlpha = inA * outA;
    // The measurement is the horror: the panel reports a confidence that keeps climbing while the shape refuses
    // to resolve. Nothing on screen says "monster"; the numbers do it.
    TL.block(g, d, [
      ['loss', '0.0000'],
      ['confidence', (0.61 + d.mid * 0.3).toFixed(3)],
      ['layers probed', TL.num(Math.round(lerp(4, 94, p)))],
      ['interpretability', 'FAILED'],
      ['ontology', 'N/A'],
    ], { x: W - 520, y: 168, hot: [3] });
    dsLine(g, 'SHOGGOTH', W / 2, 150, {
      font: dsSans(64, 100), size: 64, track: 30, color: dsTone(d, 'fg', 0.55), glow: 24, alpha: inA * outA * 0.9,
    });
    // a hairline probe that dives into the mass and comes back out with nothing
    const probe = prog(d.t, f.from + 0.8, f.from + 2.4, ease.inOutCubic);
    const px = lerp(120, W - 160, probe), py = 320 + Math.sin(probe * Math.PI) * 260;
    g.strokeStyle = dsTone(d, 'accent', 0.5); g.lineWidth = 1;
    g.beginPath(); g.moveTo(120, 320); g.lineTo(px, py); g.stroke();
    g.font = dsMono(13, 400); g.fillStyle = dsTone(d, 'dim', 0.8); g.textBaseline = 'middle';
    g.fillText('probe ' + (probe * 100).toFixed(0) + '%', 120, 300);
    TL.stamp(g, d, 'NO SHAPE FOUND', px, py + 22, { size: 13, track: 4, color: 'warn', alpha: probe });
    g.restore();

    dsLife(g, d, { gain: 0.85, dust: 65 });
    dsScanSweep(g, d, { alpha: 0.06, period: 4.6 });
    dsTele(g, d, { id: 'c12', name: 'shoggoth', rows: null, foot: '34 000 points · per-point colour ramp' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    return dsFin(d, { shake: dsShake(d, 0.8 + d.kick * 1.0, 35), vignette: 0.4, grain: 0.045 });
  },
});
