// dense — 36 (115.2–117.02) · rose · paid for by "Post-Chinchilla, super-dense".
// The most crowded frame in the film: 59 200 points of geometry — fifty layer planes and a gaussian ball of
// weights — and they arrive by the beat, so the density itself is the entrance. Everything is structure gain
// except one small white nucleus at the middle, which is the only thing in the shot at full gain. The number in
// the corner is the count of points actually in the frame, and it ends at 59 200.
MV.scene('dense', {
  init() {
    // ---- 50 layer planes: 784 points each, kept in one buffer so the reveal is a count, not a rebuild
    const st = MX.layers(50, 784, { size: 2.55, spread: 0.155 });
    const per = st.planes[0].length / 3;
    this.per = per; this.planes = st.planes; this.wire = st.wire; this.planeN = st.n;
    this.layerPts = new Float32Array(st.n * per * 3);
    for (let l = 0; l < st.n; l++) this.layerPts.set(st.planes[l], l * per * 3);
    // per-point size: the cloud has grain, and the far side of it is finer than the near side
    this.layerSizes = new Float32Array(st.n * per);
    const r1 = mulberry32(505);
    for (let i = 0; i < this.layerSizes.length; i++) this.layerSizes[i] = 0.62 + r1() * 0.95;
    // ---- 20 000 weights, ordered outward from the middle so the ball grows from the inside
    const N = 20000, r2 = mulberry32(707);
    this.ball = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, rr = 1.62 * Math.cbrt(u) * (0.8 + 0.45 * r2());
      const th = r2() * TAU, ph = Math.acos(2 * r2() - 1);
      this.ball[i * 3] = Math.sin(ph) * Math.cos(th) * rr * 1.25;
      this.ball[i * 3 + 1] = Math.cos(ph) * rr * 0.78;
      this.ball[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * rr;
    }
    this.ballN = N;
    this.core = MX.core(0.3, { n: 2600, halo: 1200, rays: 14 });
    this.dust = LG.ball(2400, 8, { seed: 505 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const b0 = d.audio.beatAt(d.from);
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - b0);
    const gA = clamp((beats - 0.25) / (span * 0.8) + d.kick * 0.01);     // the stack fills in by the beat
    const gB = clamp((beats - 1.05) / (span * 0.72));                    // then the weights
    const nA = Math.round(this.planeN * this.per * gA), nB = Math.round(this.ballN * gB);
    const drawn = nA + nB + 2600;
    const push = ease.inOutCubic(clamp(lt / d.dur));

    const cam = dsCam(d, {
      yaw: 0.32 + lt * 0.06 + Math.sin(lt * 0.35) * 0.1, pitch: 0.05 + 0.02 * Math.sin(lt * 0.7),
      dist: lerp(9.0, 5.5, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.05, seed: 23,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.2, size: 1.0, dof: 36, count: 1200 }),
      { P: this.layerPts, o: { size: 1.25, gain: 0.6, color: 'accent', sizes: this.layerSizes, count: nA, dof: 12, focus: 6.6, fog: 15, twinkle: 0.42, t: d.t, drift: 0.05, model: { rot: [0, lt * 0.22, 0] } } },
      { P: this.ball, o: { size: 1.35, gain: 0.4, color: 'fg', count: nB, dof: 10, focus: 6.6, fog: 13, twinkle: 0.3, t: d.t, drift: 0.04 } },
      // the one thing at full gain
      { P: this.core.nucleus, o: { size: 2.3 + d.kick * 1.1, gain: 1.0, color: 'hot', dof: 6, focus: 7.2 } },
      { P: this.core.halo, o: { size: 1.1, gain: 0.3 + d.kick * 0.2, color: 'accent', dof: 18, twinkle: 0.6, t: d.t } },
      { S: this.core.rays, o: { width: 1, gain: 0.3 + d.snare * 0.3, color: 'hot', glow: 0.6, model: { scale: 1 + d.kick * 0.2 } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.55 + d.kick * 0.3, exposure: 0.84, ca: 0.55 + d.kick * 0.4, radius: 0.52 } });

    dsTele(g, d, {
      id: 'c36', name: 'dense',
      rows: [
        ['points', TL.num(drawn)],
        ['planes', Math.round(this.planeN * gA) + ' / 50'],
        ['weights', TL.num(nB)],
        ['params', '1.40e13'],
        ['tokens', '6.20e12'],
      ],
      foot: 'post-chinchilla · over-trained',
    });
    // the count is the shot's argument, so it gets display size
    dsLine(g, TL.num(drawn), W / 2, 214, { font: dsSans(84, 200), size: 84, color: dsTone(d, 'fg', 0.9), glow: 22, track: 6 });
    TL.stamp(g, d, 'POINTS IN THIS FRAME', W / 2, 268, { color: 'dim', size: 13, align: 'center' });
    TL.stamp(g, d, 'DENSITY — NO SPARE BLACK LEFT', 110, 340, { color: 'accent', size: 13 });

    dsTick(g, d, { x: W - 150, y: H - 70, label: 'PTS', rate: 3011, alpha: 0.5 });

    // the plate gives this line 'cloud' — the densest treatment in the film for its densest frame: the sentence is
    // drawn as sparse points of light over the 59 200 that are already there.
    LY.draw(g, d, { mode: 'plate', size: 76, n: 2600, y: H - 175 });

    dsLife(g, d, { gain: 0.9, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.06, period: 2.4 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.8 + 1.1 * d.kick, 24), vignette: 0.2, grain: 0.04 }, dsLifePost(d, { amount: 1.3 })));
  },
});
