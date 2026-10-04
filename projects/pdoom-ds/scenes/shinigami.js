// shinigami — "with your shinigami eyes". The aperture, twice, at hook scale and in alert: eyes that see the
// death of whatever they look at. Two irises open on the same face-plane and the whole frame is inside them; a
// stack of small "deaths" (fading points) drifts up through the light because that is what these eyes see.
MV.scene('shinigami', {
  init() {
    this.eye = MX.eye(2.5, { n: 9000, pupil: 3800, lids: 20 });
    // the second eye: the same geometry, offset — one face, two apertures
    this.offset = [-1.62, 0, 0];
    // what the eyes see: the death list, rising
    const n = 2800, P = new Float32Array(n * 3), rnd = mulberry32(131);
    this.life = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      P[i * 3] = (rnd() - 0.5) * 8; P[i * 3 + 1] = (rnd() - 0.5) * 5; P[i * 3 + 2] = (rnd() - 0.5) * 4 - 1;
      this.life[i] = rnd();
    }
    this.souls = P;
    this.blade = LG.seg(LG.curve(u => [(u - 0.5) * 1.6, (u - 0.5) * 9.5, Math.sin(u * 3.1) * 0.6], 60), {});
    this.dust = LG.ball(1200, 6, { seed: 132 });
    // the names: a column of tiny labels that each go out
    this.names = [];
    for (let k = 0; k < 24; k++) this.names.push('0x' + ((hash(k, 3) * 0xfffff) | 0).toString(16).toUpperCase().padStart(5, '0'));
  },
  render(g, f) {
    const d = dsFrame(f, 'alert');
    d.g = g;
    const inA = dsIn(d, 0, 1.2, ease.outCubic);
    const outA = dsOut(d, 0.3);
    // the eyes open: one on the downbeat, the second 1.8 s later — the band under the lyric "eyes"
    const open1 = dsIn(d, 0.15, 0.9, ease.outExpo);
    const open2 = dsIn(d, 1.95, 0.9, ease.outExpo);
    const p = ease.inOutCubic(clamp(d.lt / Math.max(0.01, d.dur)));
    const cam = dsCam(d, {
      yaw: 0.05 + p * 0.16, pitch: 0.02 + Math.sin(d.lt * 0.3) * 0.03, dist: lerp(9.2, 6.4, p), fov: 34,
      punch: 0.02, shift: [0, lerp(30, -20, p)], seed: 38,
    });

    const P = this.souls, n = this.life.length;
    // each soul rises on its own phase and winks out: f(t) only
    const tmp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t0 = this.life[i] * 4.0;
      const k = clamp((d.t - f.from - t0) / 2.2);
      const rise = ease.outCubic(k) * 3.4;
      tmp[i * 3] = P[i * 3] * (1 + k * 0.3);
      tmp[i * 3 + 1] = P[i * 3 + 1] + rise;
      tmp[i * 3 + 2] = P[i * 3 + 2];
    }
    tmp.__v = 1;

    const list = [
      dsAir(d, this.dust, { gain: 0.2, size: 1.05, dof: 30, drift: 0.07, t: d.t }),
      { P: tmp, o: { dynamic: true, size: 1.2, gain: 0.34 * inA * outA, color: 'fg', dof: 18, focus: 7, twinkle: 0.6, t: d.t } },
      // eye one
      { P: this.eye.iris, o: { size: 1.3, gain: 0.7 * open1 * outA, color: 'warn', dof: 8, focus: 7, model: { rot: [0.52 + Math.sin(d.t * 0.9) * 0.05, -0.34 + Math.cos(d.t * 0.7) * 0.05, 0], scale: 1 + d.low * 0.02 } } },
      { P: this.eye.pupil, o: { size: 1.4, gain: 0.6 * open1 * outA, color: 'hot', dof: 6, model: { rot: [0.52, -0.34, 0] } } },
      { S: this.eye.lid, o: { width: 1, gain: 0.4 * open1 * outA, color: 'accent', glow: 0.4, dof: 12, model: { rot: [0.52, -0.34, 0] } } },
      // eye two: the same buffers, translated. One face, and it is not symmetrical
      { P: this.eye.iris, o: { size: 1.3, gain: 0.7 * open2 * outA, color: 'warn', dof: 8, focus: 7, model: { pos: this.offset, rot: [0.52 - Math.sin(d.t * 0.8) * 0.05, -0.34 - Math.cos(d.t * 0.6) * 0.05, 0] } } },
      { P: this.eye.pupil, o: { size: 1.4, gain: 0.6 * open2 * outA, color: 'hot', dof: 6, model: { pos: this.offset, rot: [0.52, -0.34, 0] } } },
      { S: this.eye.lid, o: { width: 1, gain: 0.4 * open2 * outA, color: 'accent', glow: 0.4, dof: 12, model: { pos: this.offset } } },
      // the blade between them: what these eyes are for
      { S: this.blade, o: { width: 1.6, gain: 0.22 * open2 * outA, color: 'hot', glow: 0.7, dof: 10, model: { rot: [0, 0, 0.06 + d.snare * 0.02] } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.85 + d.snare * 0.4, exposure: 0.86, ca: 0.7, radius: 0.55 } });

    g.save();
    g.globalAlpha = inA * outA;
    // the death list: it is a read-out, and the read-out is the point
    const rows = [];
    for (let k = 0; k < 8; k++) {
      const age = (d.t - f.from) - k * 0.55;
      const dead = age > 0.4;
      rows.push([this.names[k], dead ? 'TERMINATED' : 'OBSERVED']);
    }
    TL.block(g, d, rows, { x: W - 560, y: 168, hot: [0, 1] });
    TL.stamp(g, d, 'CAUSE: LOOKED AT', W - 560, 168 + 8 * 24 + 14, { size: 13, track: 4, color: 'warn', alpha: 0.8 });
    g.restore();

    dsLife(g, d, { gain: 0.9, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.07, period: 2.8 });
    dsTick(g, d, { x: W - 70, y: H - 70, rate: 359, label: 'obs' });
    dsTele(g, d, { id: 'c13', name: 'eyes', rows: null, foot: 'two apertures · the same face' });
    LY.draw(g, d, { mode: 'plate' });   // the plate decides the treatment; shock owns the centre

    return dsFin(d, {
      shake: dsShake(d, 1.0 + d.snare * 2.2, 41),
      flash: Math.max(0, (1 - prog(d.t, f.from + 0.15, f.from + 0.32)) * 0.18 + (1 - prog(d.t, f.from + 1.95, f.from + 2.12)) * 0.14),
      glitch: d.snare * 0.25,
      vignette: 0.32,
      grain: 0.05,
    });
  },
});
