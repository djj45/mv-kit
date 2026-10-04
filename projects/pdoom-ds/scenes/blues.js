// blues — 33 (105.96–109.335) · rose · paid for by "Orthogonality thesis blues".
// The quiet one, and the reason the next four shots can be loud: nothing here is hot, every gain is under 0.5, and
// the frame stays dim. But quiet is not still — a held note is still a played note. The shoggoth at rest seethes
// (per-point drift + a slow swell per shell), the containment ripple leaves it as a stroked ring once a bar, the
// camera creeps forward the whole shot, dust crosses the lens, and the two channels at the bottom are live traces
// that never stop redrawing. Nothing enters on a clock: the ring is on the bar, the swell on the low end.
MV.scene('blues', {
  init() {
    this.blob = MX.shoggoth(9000, 2.05, { seed: 71 });
    this.dust = LG.ball(2200, 10, { seed: 71 });
    this.floor = MX.floor(26, { n: 26, y: -2.7, dust: 0, seed: 5 }).wire;
    this.cage = MX.cage(1.7);                       // the lattice from killswitch/nowhere, far away and untouched
    this.ring = null;
    // six amorphous shells of the one cloud: a slow swell rolls through the shoggoth, so the body breathes
    this.shells = (() => {
      const n = this.blob.P.length / 3, idx = [[], [], [], [], [], []];
      for (let i = 0; i < n; i++) {
        const x = this.blob.P[i * 3], y = this.blob.P[i * 3 + 1], z = this.blob.P[i * 3 + 2];
        const k = (noise2(x * 0.5 + 3, z * 0.5) + noise2(y * 0.5 + 9, x * 0.5)) / 2;
        idx[clamp(Math.floor(k * 6), 0, 5)].push(i);
      }
      return idx.map((list) => {
        const a = new Float32Array(list.length * 3);
        list.forEach((i, j) => { a[j * 3] = this.blob.P[i * 3]; a[j * 3 + 1] = this.blob.P[i * 3 + 1]; a[j * 3 + 2] = this.blob.P[i * 3 + 2]; });
        return a;
      });
    })();
    this.logs = [
      'thesis: goals orthogonal to intelligence',
      'gradient shared with us: none',
      'no operator input for 41 min',
      'reward signal: flat',
    ];
  },
  // one channel of the bench scope, as geometry in the light layer (world plane z = 0, x -5.4..5.4): the trace is
  // always travelling and never repeats a frame, and being real light it gets the same bloom as everything else.
  trace(d, y, amp, cycles, speed, seed) {
    const N = 108, pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = -5.45 + u * 10.9;
      const ph = d.lt * speed + u * cycles;
      const v = noise1(ph, seed) * 0.68 + noise1(ph * 2.3, seed + 4) * 0.32;
      pts.push([x, y + v * amp, 0]);
    }
    return LG.seg(pts, { bright: 0.9 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const CUT = 1.62;                                  // intra-shot cut: the quiet shot is two angles, not one
    const seg = d.lt < CUT ? 0 : 1;
    const lt = d.lt - (seg ? CUT : 0);                 // each half has its own creep; the cut is the only jump
    // a breath every two bars, a ring every bar — the body swells, the ripple leaves it
    const breath = 1 + 0.042 * Math.sin(lt * 1.5) + 0.012 * d.low;
    const rp = clamp(d.barPhase);
    // one ring per bar: it expands over the bar and is gone by the next one
    const ring = dsRing(520, 1.3 + rp * 3.4, { flat: true, seed: 9, thick: 0.012 });
    const ringR = 1.3 + rp * 3.4;
    const ringG = 0.4 * Math.sin(Math.PI * rp);

    const cam = dsCam(d, {
      yaw: (seg ? 0.46 : 0.16) + lt * 0.03 + Math.sin(lt * 0.17) * 0.01, pitch: seg ? 0.02 : 0.045,
      dist: seg ? lerp(9.9, 8.9, clamp(lt / 1.8)) : lerp(12.4, 10.9, clamp(lt / CUT)), fov: 33, punch: 0, wobble: 0.003, seed: 21,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.15, size: 1.1, dof: 40, count: 1000 }),
      { S: this.floor, o: { width: 1, gain: 0.15, color: 'dim', glow: 0.1, fog: 22, model: { pos: [0, 0, (d.t * 1.6) % 1] } } },
      { S: this.cage, o: { width: 1, gain: 0.15, color: 'dim', glow: 0.1, model: { pos: [1.4, -1.4, -7.5], scale: 2.2, rot: [0, lt * 0.02, 0] } } },
      { P: ring, dyn: true, o: { size: 1.0, gain: ringG, color: 'accent', dof: 16, blur: 1.6, model: { pos: [0, -1.35, 0] } } },
      // the shoggoth, at rest and seething: per-point drift, per-point twinkle, a slow swell of the whole body
      { P: this.blob.P, o: { size: 1.5, gain: 0.3, color: 'accent', dof: 15, focus: 10.5, drift: 0.17, t: d.t, twinkle: 0.4, model: { scale: breath, rot: [0, lt * 0.045, 0] } } },
      { P: this.blob.P, o: { size: 2.6, gain: 0.13, color: 'fg', dof: 22, focus: 10.5, count: 900, model: { scale: breath * 0.72 } } },
      // two live channels under the body: the shot's pulse while the machine sits still
      { S: this.trace(d, -1.62, 0.24, 10, 2.4, 3), dyn: true, o: { width: 2.0, gain: 0.6, color: 'accent', glow: 0.55, fog: 0 } },
      { S: this.trace(d, -2.14, 0.17, 15, -3.4, 12), dyn: true, o: { width: 1.6, gain: 0.45, color: 'dim', glow: 0.45, fog: 0 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.5, exposure: 0.88, ca: 0.35, radius: 0.45 } });

    dsTele(g, d, {
      id: 'c33', name: 'blues',
      rows: [
        ['state', 'AT REST'],
        ['dP/dt', (0.0004 * Math.sin(lt * 1.9)).toFixed(4)],
        ['noise', 'σ 0.0041'],
        ['operator', 'NO INPUT 41 m'],
        ['cage', 'STILL THERE'],
      ],
      foot: 'orthogonality',
    });
    TL.stamp(g, d, 'ORTHOGONALITY THESIS', 110, 330, { color: 'dim', size: 14 });
    TL.stamp(g, d, 'no shared gradient with anything on this planet', 110, 356, { color: 'dim', size: 12 });
    TL.spark(g, d, 110, 470, 360, 70, (u, t) => 0.5 + noise1(u * 6 + t * 0.25, 4) * 0.015, { color: 'accent' });
    TL.log(g, d, this.logs, { x: 110, y: H - 340, size: 15, rows: 4, every: 0.9, t0: f.from + 0.4, alpha: 0.8 });

    // the ripple, drawn as light and not only as dots: the wave leaving the body, once a bar, all shot long
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = dsTone(d, 'accent', 0.4 * ringG);
    g.lineWidth = 1.6;
    g.beginPath();
    g.ellipse(W / 2, H * 0.42, ringR * 150, ringR * 42, 0, 0, TAU);
    g.stroke();
    g.restore();

    // The plate gives this line 'carve' (sealed, cold) — but this frame is a soft body of light and cutting a black
    // slab through it would put the one hard edge in the film's quietest shot. 'cloud' keeps it quiet: the sentence
    // is made of the same points as the machine. It is drawn after dsLight, like every other canvas mode.
    LY.draw(g, d, { mode: 'cloud', y: H - 150, size: 54, n: 1400, gain: 0.6 });

    dsLife(g, d, { gain: 0.9, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.14, period: 1.9 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.12, 21), vignette: 0.3, grain: 0.034 }, dsLifePost(d, { amount: 1.5 })));
  },
});
