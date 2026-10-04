// nowhere — 31 (100.721–102.46) · rose · paid for by "Now there's nowhere left to go".
// The lattice again — literally the same MX.cage as killswitch and fence — except this time it is inside the
// thing it is supposed to contain: the core's halo is 2.6 m across and the fence is 1.7 m, so the cage hangs in
// the machine's own light and the rays go straight through it. The fence lights first, then the core ignites and
// grows past it on the second beat; from then on the cage is a decoration in the middle of the frame — and it
// turns, because the thing it was built to hold never stops growing.
MV.scene('nowhere', {
  init() {
    this.cage = MX.cage(1.7);                                  // identical builder, identical radius as fence
    this.core = MX.core(2.6, { n: 3800, halo: 3200, rays: 22 });
    this.dust = LG.ball(2400, 9, { seed: 31 });
    this.ruler = [];                                           // the film measures everything, including this
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU;
      this.ruler.push([[Math.cos(a) * 1.7, -1.9, Math.sin(a) * 1.7], [Math.cos(a) * 1.7, -2.15, Math.sin(a) * 1.7]]);
    }
    this.ticks = LG.pairs(this.ruler, { bright: 0.4 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const bIn = (n) => clamp(d.beat - (d.audio.beatAt(d.from) + n));   // entrance n beats after the cut
    const fence = bIn(0);                          // the containment arrives first, as if it mattered
    const born = ease.outExpo(bIn(2));             // then the machine lights up, two beats in
    const grow = lerp(0.4, 1, born) + 0.05 * born * Math.sin(lt * 2.2);   // the halo swells and keeps swelling
    const wide = clamp(lt / Math.max(0.2, d.dur));

    const cam = dsCam(d, {
      yaw: 0.36 + lt * 0.09 + Math.sin(lt * 0.3) * 0.08, pitch: 0.1 - wide * 0.05,
      dist: lerp(9.8, 6.4, wide), fov: 34, punch: 0.035, seed: 3,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.18, size: 1.05, dof: 34, count: 1100 }),
      // the cage: outside is now inside. Structure gain only — it is no longer the subject, but it is turning.
      { S: this.cage, o: { width: 1, gain: 0.56 * fence, color: 'dim', glow: 0.24, model: { scale: 1, rot: [0, lt * 0.3, 0] } } },
      { S: this.ticks, o: { width: 1, gain: 0.3 * fence, color: 'accent', glow: 0.2, model: { rot: [0, lt * 0.3, 0] } } },
      // the halo: bigger than the fence, so the fence sits in it
      { P: this.core.halo, o: { size: 1.15, gain: 0.3 * born, color: 'accent', dof: 20, focus: 6.7, drift: 0.06, t: d.t, twinkle: 0.65, count: Math.round(3200 * (0.3 + 0.7 * born)), model: { scale: grow } } },
      { S: this.core.rays, o: { width: 1, gain: (0.22 + d.kick * 0.3) * born, color: 'hot', glow: 0.55, model: { scale: grow * (1 + 0.1 * d.kick), rot: [0, lt * 0.45, 0] } } },
      // the one thing at full gain: the nucleus
      { P: this.core.nucleus, o: { size: 2.0 + d.kick * 0.9, gain: 1.0 * born, color: 'hot', dof: 7, focus: 6.7, model: { scale: 1 + 0.06 * d.kick } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.62 + d.snare * 0.25, exposure: 0.86, ca: 0.5 + d.kick * 0.35, radius: 0.52 } });

    dsTele(g, d, {
      id: 'c31', name: 'nowhere',
      rows: [
        ['containment', born > 0.4 ? 'INSIDE' : 'DEPLOYING'],
        ['cage r', '1.70 m'],
        ['core r', (2.6 * grow).toFixed(2) + ' m'],
        ['margin', ((1.7 - 2.6 * grow)).toFixed(2) + ' m'],
        ['verdict', born > 0.5 ? 'TOO SMALL' : '...'],
      ],
      foot: 'fence: not the boundary',
    });
    TL.stamp(g, d, 'FENCE Ø 1.70 m', 128, 300, { color: 'dim', size: 13 });
    TL.stamp(g, d, 'CORE HALO Ø ' + (5.2 * grow).toFixed(2) + ' m', 128, 326, { color: 'accent', size: 13 });
    TL.spark(g, d, W - 640, H - 300, 420, 90, (u, t) => clamp(0.5 + 0.5 * Math.sin(u * 9 + t * 1.2)) * (u < grow ? 1 : 0.1), { color: 'accent' });
    TL.stamp(g, d, 'HALO / FENCE', W - 640, H - 284, { color: 'dim', size: 12 });
    dsTick(g, d, { x: W - 150, y: H - 70, label: 'MARGIN', alpha: 0.55 });

    // the plate gives this line 'scatter' — nowhere left to go, and the sentence disperses as it is sung.
    LY.draw(g, d, { mode: 'plate', size: 46, y: H - 152 });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.1, period: 2.3 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.6 + 1.0 * d.kick, 11), vignette: 0.2, grain: 0.038 }, dsLifePost(d, { amount: 1.4 })));
  },
});
