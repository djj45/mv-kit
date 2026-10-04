// atoms — 49.56–52.83, ember. "I feel my atoms rearranging": 30 000 points, and every single one of them moves to
// a new position and back. A is a shell, B is the same shell with its points permuted and pushed off the lattice,
// and each point travels A→B→A on its own phase (hash(i)), so at any instant half the body is in motion and the
// silhouette never changes. No simulation: a position is a function of f.t, and the rate is a function of the line's
// own word progress, so the churn peaks on "rearranging".
MV.scene('atoms', {
  init() {
    const N = 30000;
    this.A = LG.sphere(N, 2.45, { seed: 61 });
    this.B = new Float32Array(N * 3);
    // B: a permutation of A, pushed a little off the shell — the atoms keep their number and lose their places
    for (let i = 0; i < N; i++) {
      const j = (i * 7919 + 1237) % N, r = 1 + 0.16 * (hash(i, 5) - 0.5) * 2;
      this.B[i * 3] = this.A[j * 3] * r + (hash(i, 7) - 0.5) * 0.18;
      this.B[i * 3 + 1] = this.A[j * 3 + 1] * r + (hash(i, 8) - 0.5) * 0.18;
      this.B[i * 3 + 2] = this.A[j * 3 + 2] * r + (hash(i, 9) - 0.5) * 0.18;
    }
    this.ph = new Float32Array(N);
    this.D = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.ph[i] = hash(i, 11);
      for (let c = 0; c < 3; c++) this.D[i * 3 + c] = this.B[i * 3 + c] - this.A[i * 3 + c];
    }
    this.P = new Float32Array(N * 3);
    this.halo = LG.sphere(3600, 3.15, { jitter: 0.12, seed: 62 });
    this.air = LG.ball(1000, 7.0, { seed: 13 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.08, 0.5, ease.outCubic) * dsOut(d, 0.3);
    // "rearranging" pays for the peak: the line's word progress is the only clock this shot has
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('rearranging') === 0) wi = i;
    const sung = wi >= 0 && ws[wi].start <= t;
    const rate = 0.62 + 0.5 * (wi >= 0 ? clamp(dsWordP(d.line, t)) : 0) + d.kick * 0.25;
    const amp = sung ? 1 : 0.42;                                 // before the word the body only shivers

    // every point on its own phase: 0 → 1 → 0, so each one goes out and comes back. A triangle in u, smoothed,
    // which is the same curve as a cosine but cheap enough to run on 30 000 points every frame.
    const rad = 1 + d.kick * 0.05;
    for (let i = 0; i < this.ph.length; i++) {
      const u = t * rate + this.ph[i], fr = u - Math.floor(u);
      let s = fr * 2; if (s > 1) s = 2 - s;
      const w = s * s * (3 - 2 * s) * amp, k = i * 3;
      this.P[k] = (this.A[k] + this.D[k] * w) * rad;
      this.P[k + 1] = (this.A[k + 1] + this.D[k + 1] * w) * rad;
      this.P[k + 2] = (this.A[k + 2] + this.D[k + 2] * w) * rad;
    }
    this.P.__v = (this.P.__v || 0) + 1;

    const cam = dsCam(d, {
      yaw: 0.3 + d.lt * 0.1, pitch: 0.1 + d.lt * 0.014, dist: lerp(7.8, 6.2, ease.inOutQuad(clamp(d.lt / d.dur))),
      fov: 36, punch: 0.045, seed: 17,
    });
    // the whole body also turns: the churn is inside it, the rotation is the camera walking around it
    const spin = { rot: [0, d.lt * 0.14, 0] };
    dsLight(d, [
      dsAir(d, this.air, { gain: 0.24 * a, size: 1.05, dof: 28, drift: 0.06, t }),
      { P: this.halo, o: { size: 1.0, gain: 0.2 * a, color: 'dim', dof: 20, focus: 6, twinkle: 0.4, t, model: spin } },
      // the body: 30 000 points, one object, full gain. Dense places burn to white on their own.
      { P: this.P, o: { size: 1.28, gain: 0.78 * a, color: 'accent', dof: 11, focus: 6, fog: 9, twinkle: 0.22, t, model: spin } },
      // the front of the body (the same points, drawn again) so the near side is the bright side
      { P: this.P, o: { size: 2.05, gain: 1.1 * a, color: 'hot', dof: 7, focus: 6, count: 2400, twinkle: 0.3, t, model: spin } },
    ], { cam, end: { bloom: 0.72, exposure: 0.88, ca: 0.5, radius: 0.52 } });

    g.save();
    g.globalAlpha = a;
    TL.stamp(g, d, 'LATTICE RELAXATION', 110, 150, { size: 14, track: 4 });
    dsLine(g, '30 000', 110, 216, { font: dsSans(66, 200), size: 66, track: 2, color: dsTone(d, 'fg', 0.92), glow: 16, align: 'left' });
    TL.stamp(g, d, 'ATOMS · REARRANGING', 112, 262, { size: 14, track: 6, color: sung ? 'hot' : 'dim' });
    TL.block(g, d, [
      ['displaced', (14 + 62 * amp * (0.5 + 0.5 * Math.sin(t * 2.4))).toFixed(1) + ' %'],
      ['hops / s', TL.num(1.4e6 * rate)],
      ['shell', 'r 2.45'],
      ['entropy', '↑'],
    ], { x: W - 470, y: 330, hot: [3] });
    g.restore();

    dsTele(g, d, { id: 'c17', name: 'atoms', rows: [['points', '30 000'], ['rate', rate.toFixed(2)], ['word', sung ? 'rearranging' : '—'], ['state', 'CHURN']], foot: 'positions are a function of t' });
    // lyric: the plate assigns 'cloud' to this line — "the words rearrange" — and the sprite version of that mode
    // is what this shot wants: the sentence is made of the same points as the body it is describing, and every
    // word lands on its own start. `line` is pinned so the shot keeps drawing its own sentence.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 76, y: H * 0.28 });
    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.055, period: 5.0 });
    dsTick(g, d, { x: 620, y: 976, label: 'HOPS/S', value: 1.4e6 * rate / 1e3, rate: 1 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.5 + d.kick * 1.0), vignette: 0.24 }, dsLifePost(d, { amount: 1.3 })));
  },
});
