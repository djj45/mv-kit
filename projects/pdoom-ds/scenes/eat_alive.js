// eat_alive — "ChatGPT, please don't eat me alive". A mouth of light opens inside the point cloud and the cloud
// is pulled into it. Nothing is animated as a simulation: every point's distance from the mouth is a function of
// time, so the swallow is exact and seekable. The transition into this shot carries dust across the seam, because
// it is the same room as the shot before it.
MV.scene('eat_alive', {
  init() {
    const n = 26000, P = LG.ball(n, 3.1, { seed: 81 });
    this.cloud = P;
    // per-point: direction away from the origin (used to compute the pull), and a slight angular offset
    this.r0 = new Float32Array(n);
    this.dir = new Float32Array(n * 3);
    const rnd = mulberry32(82);
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], r = Math.hypot(x, y, z) || 1e-4;
      this.r0[i] = r;
      this.dir[i * 3] = x / r; this.dir[i * 3 + 1] = y / r; this.dir[i * 3 + 2] = z / r;
    }
    // the mouth: two jaws as arcs of points, meeting at the middle
    const jaw = (sgn) => {
      const a = [];
      for (let i = 0; i <= 96; i++) {
        const u = i / 96, ang = (u - 0.5) * 2.4;
        a.push([Math.cos(ang) * 1.55, sgn * Math.sin(ang) * 0.9, 0]);
      }
      return LG.seg(a, { bright: 0.7 });
    };
    this.jawTop = jaw(1); this.jawBot = jaw(-1);
    // teeth: hairlines that only exist while the mouth is closing
    const teeth = [];
    for (let k = 0; k < 18; k++) {
      const u = k / 17, ang = (u - 0.5) * 2.3;
      teeth.push([[Math.cos(ang) * 1.5, Math.sin(ang) * 0.86, 0], [Math.cos(ang) * 1.14, Math.sin(ang) * 0.5, 0]]);
      teeth.push([[Math.cos(ang) * 1.5, -Math.sin(ang) * 0.86, 0], [Math.cos(ang) * 1.14, -Math.sin(ang) * 0.5, 0]]);
    }
    this.teeth = LG.pairs(teeth, { bright: 0.5 });
    this.dust = LG.ball(1600, 4.6, { seed: 83 });
    this.tmp = new Float32Array(n * 3);
  },
  render(g, f) {
    const d = dsFrame(f, 'alert', { fg: '#FFD9C7', dim: '#5B666D', accent: '#FF8F6B' });
    d.g = g;
    const inA = dsIn(d, 0, 1.1, ease.outCubic);
    const outA = dsOut(d, 0.55);   // hook_pdoom fades in over this tail
    // the bite: on the downbeat 1.1 s in, then a slow second swallow. "alive" holds through the second one.
    const kicks = dsEvents(f, 'kick', f.from, f.to + 0.6);
    const bite = kicks.length ? kicks[Math.min(1, kicks.length - 1)].t : f.from + 1.1;
    const k1 = ease.inOutCubic(clamp((d.t - bite) / 0.5));
    const k2 = ease.inOutCubic(clamp((d.t - bite - 0.75) / 0.6));
    const swallow = Math.max(k1 * 0.72, k2);
    const open = Math.max(0, 1 - k1) * 0.6 + 0.4;

    // every point moves toward the mouth by `swallow`, and the near ones go first — a deterministic swallow
    const P = this.tmp;
    const n = this.r0.length;
    for (let i = 0; i < n; i++) {
      const local = clamp((swallow - (1 - clamp(this.r0[i] / 3.4)) * 0.35) / 0.65);
      const r = lerp(this.r0[i], 0.22, ease.inCubic(local));
      P[i * 3] = this.dir[i * 3] * r;
      P[i * 3 + 1] = this.dir[i * 3 + 1] * r;
      P[i * 3 + 2] = this.dir[i * 3 + 2] * r;
    }
    P.__v = (P.__v || 0) + 1;

    const p = ease.inOutCubic(clamp(d.lt / Math.max(0.01, d.dur)));
    const cam = dsCam(d, {
      yaw: -0.2 + p * 0.34, pitch: 0.08 - swallow * 0.1, dist: lerp(6.6, 4.2, p), fov: 36,
      punch: 0.03 + swallow * 0.03, seed: 18,
    });

    const list = [
      dsAir(d, this.dust, { gain: 0.22, size: 1.0, dof: 30, drift: 0.3, t: d.t, twinkle: 0.7 }),
      { P, o: { dynamic: true, size: 1.25, gain: 0.4 * inA * outA, dof: 12, focus: 5, twinkle: 0.3, t: d.t } },
      // the jaws
      { S: this.jawTop, o: { width: 1.6, gain: 0.7 * inA * outA, color: 'hot', glow: 0.5, dof: 10, model: { rot: [0, 0, open * -0.42], pos: [0, open * 0.4, 0] } } },
      { S: this.jawBot, o: { width: 1.6, gain: 0.7 * inA * outA, color: 'hot', glow: 0.5, dof: 10, model: { rot: [0, 0, open * 0.42], pos: [0, open * -0.4, 0] } } },
      { S: this.teeth, o: { width: 1, gain: 0.45 * inA * outA * open, color: 'warn', glow: 0.4, dof: 12, model: { rot: [0, 0, open * -0.42], pos: [0, open * 0.4, 0] } } },
      { S: this.teeth, o: { width: 1, gain: 0.45 * inA * outA * open, color: 'warn', glow: 0.4, dof: 12, model: { rot: [Math.PI, 0, open * 0.42], pos: [0, open * -0.4, 0] } } },
      // the light that is left in the middle once the cloud is gone
      { P: LG.gauss(1400, 0.12, { seed: 84 }), o: { size: 2.0, gain: 1.0 * swallow * outA, color: 'hot', dof: 6 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.6 + swallow * 0.5, exposure: 0.85, ca: 0.5 + swallow * 0.5, radius: 0.5 } });

    g.save();
    g.globalAlpha = inA * outA;
    TL.block(g, d, [
      ['tokens eaten', TL.num(TL.roll(d.t, 3.1e9 * (0.2 + swallow), 6))],
      ['jaw aperture', (open * 34).toFixed(1) + '°'],
      ['entropy', (4.12 + (1 - swallow) * 1.8).toFixed(2)],
      ['status', swallow > 0.9 ? 'INGESTING' : 'OPEN'],
    ], { x: W - 520, y: 168, hot: [3] });
    // the warning band that the film uses for anything the machine is doing to a person
    if (swallow > 0.25) {
      const a = (swallow - 0.25) / 0.75;
      dsLine(g, 'CONSENT NOT REQUESTED', W / 2, H - 300, {
        font: dsMono(16, 400), size: 16, track: 10, color: dsTone(d, 'warn', 0.8 * a), glow: 12, alpha: a,
      });
      dsScan(g, W / 2 - 300, H - 330, 600, 62, { alpha: 0.2 * a, alive: a, phase: d.t * 6 });
    }
    g.restore();

    dsLife(g, d, { gain: 0.9, dust: 65 });
    dsScanSweep(g, d, { alpha: 0.06, period: 3.1 });
    dsTele(g, d, { id: 'c07', name: 'eat', rows: null, foot: 'ingest · 26 000 points, one swallow' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    return dsFin(d, {
      shake: dsShake(d, 1.2 + d.kick * 2.0, 21),
      flash: Math.max(0, (1 - prog(d.t, bite, bite + 0.16)) * 0.28),
      glitch: k1 > 0.02 && k1 < 0.4 ? 0.3 * (1 - k1 * 2.5) : 0,
      vignette: 0.26,
    });
  },
});
