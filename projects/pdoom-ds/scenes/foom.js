// foom — "'cause the future goes FOOM". The cloud from the previous shot is blown outward: every point leaves
// along its own direction, and the rate is the lyric's own word ("FOOM" is a take-off, not a fade). One pressure
// ring expands through the frame and the letters go with it, so the word is being carried away by the blast.
MV.scene('foom', {
  init() {
    const n = 34000, P = LG.ball(n, 1.5, { seed: 91 });
    this.cloud = P;
    this.r0 = new Float32Array(n);
    this.dir = new Float32Array(n * 3);
    const rnd = mulberry32(92);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], r = Math.hypot(x, y, z) || 1e-4;
      this.r0[i] = r;
      // a slightly sheared direction: the blast is not a perfect sphere, which is what makes it read as a blast
      this.dir[i * 3] = x / r + (rnd() - 0.5) * 0.14;
      this.dir[i * 3 + 1] = y / r + (rnd() - 0.5) * 0.14 + 0.06;
      this.dir[i * 3 + 2] = z / r + (rnd() - 0.5) * 0.14;
    }
    this.word = dsTextPoints('FOOM', 9000, { scale: 1.15, weight: 200, font: dsSans(200, 200) });
    this.tmp = new Float32Array(n * 3);
    this.ring = dsRing(3400, 1.0, { seed: 93, thick: 0.012 });
    this.dust = LG.stars(1400, 24, { seed: 94 });
  },
  render(g, f) {
    const d = dsFrame(f, 'alert');
    d.g = g;
    const inA = dsIn(d, 0, 0.18, ease.linear);
    const outA = dsOut(d, 0.28);
    // the blast runs the whole shot; it starts on the downbeat under the word
    const k = ease.inCubic(clamp(d.lt / Math.max(0.01, d.dur - 0.3)));
    const kk = ease.outExpo(clamp(d.lt / Math.max(0.01, d.dur)));
    const radii = 1 + k * 26;

    // push every point out along its own direction, per point, by a function of time only
    const P = this.tmp, n = this.r0.length;
    for (let i = 0; i < n; i++) {
      const jitter = 0.75 + hash(i, 7) * 0.6;
      const r = this.r0[i] + k * 26 * jitter;
      P[i * 3] = this.dir[i * 3] * r; P[i * 3 + 1] = this.dir[i * 3 + 1] * r; P[i * 3 + 2] = this.dir[i * 3 + 2] * r;
    }
    P.__v = (P.__v || 0) + 1;

    const cam = dsCam(d, {
      yaw: 0.22 + d.lt * 0.5, pitch: 0.1 - k * 0.25, dist: lerp(5.2, 12.0, kk), fov: 40 - k * 6,
      punch: 0.04, seed: 22, roll: k * 0.12,
    });

    const list = [
      { P: this.dust, o: { size: 1.0, gain: 0.3 * inA * outA, twinkle: 0.85, t: d.t, drift: 0.5 } },
      { P, o: { dynamic: true, size: lerp(1.6, 0.9, k), gain: (0.55 - k * 0.25) * inA * outA, dof: 14 + k * 30, focus: 6, twinkle: 0.4, t: d.t, drift: 0.02 * k, count: n } },
      // the word, riding the blast outward and thinning as it goes
      { P: this.word, o: { size: lerp(1.7, 1.0, k), gain: lerp(0.85, 0.2, k) * inA * outA, color: 'hot', dof: 8, model: { scale: 1 + k * 5.5, rot: [0, k * 0.9, 0] } } },
      // the shockwave: one ring whose radius is the blast radius
      { P: this.ring, o: { size: 1.5, gain: 0.65 * inA * outA * (1 - k * 0.8), color: 'hot', dof: 20, model: { rot: [0.35, 0, 0.2], scale: radii * 0.85 } } },
      { P: this.ring, o: { size: 1.2, gain: 0.35 * inA * outA * (1 - k), color: 'warn', dof: 26, model: { rot: [1.2, 0.4, 0], scale: radii * 0.62 } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.9 * (1 - k * 0.5), exposure: 0.87, ca: 0.6 + k * 0.7, radius: 0.55 } });

    g.save();
    g.globalAlpha = inA * outA;
    // the letters are also printed flat, huge, and blown off the frame by a per-letter offset
    const chars = [...'FOOM'];
    const size = 240;
    g.font = dsSans(size, 300);
    const widths = chars.map(c => g.measureText(c).width + size * 0.08);
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = W / 2 - total / 2;
    chars.forEach((c, i) => {
      const dx = (cx - W / 2) * (1 + k * 2.4) + W / 2, dy = H * 0.44 + (hash(i, 3) - 0.5) * 200 * k;
      const a = (1 - k * 1.12) * (0.25 + 0.75 * (1 - k));
      if (a > 0.01) dsLine(g, c, dx, dy, { font: dsSans(size, 300), size, color: dsTone(d, 'fg', 0.9 * a), glow: 30 * (1 - k), alpha: a });
      cx += widths[i];
    });
    TL.block(g, d, [
      ['recursive', 'SELF-IMPROVE'],
      ['doubling', TL.num(TL.roll(d.t, 7.4, 1, 6)) + ' h'],
      ['compute', TL.num(TL.roll(d.t, 1.0e27, 6)) + ' FLOP'],
      ['containment', 'FAILED'],
    ], { x: W - 520, y: 168, hot: [2, 3] });
    // the drag coefficient read-out: the panel is always measuring the thing that is happening
    TL.gauge(g, d, W - 520, H - 120, 300, clamp(k), { label: (k * 100).toFixed(0) + '% ESCAPED' });
    g.restore();

    dsLife(g, d, { gain: 1.1, dust: 85 });
    dsScanSweep(g, d, { alpha: 0.08, period: 2.4 });
    dsTele(g, d, { id: 'c09', name: 'foom', rows: null, foot: 'blast · per-point direction, no simulation' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    return dsFin(d, {
      shake: dsShake(d, 1.4 + d.kick * 2.4 * (1 - k), 24),
      flash: Math.max(0, (1 - prog(d.lt, 0, 0.12)) * 0.4),
      glitch: k < 0.3 ? 0.35 * (1 - k * 3) : 0,
      vignette: 0.22,
    });
  },
});
