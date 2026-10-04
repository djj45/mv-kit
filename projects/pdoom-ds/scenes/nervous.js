// nervous — "Your circuits make me nervous". A nerve net: 9 000 nodes in space, each wired to its nearest
// neighbours, and the wiring is what carries the light. Signals travel along the edges as a moving function of
// time, so the whole net is *thinking* rather than flickering. The aperture sits in the middle and it is looking
// at us; the telemetry says the eval harness is not sandboxed.
MV.scene('nervous', {
  init() {
    const n = 5600, rnd = mulberry32(77);
    const P = LG.sphere(n, 2.6, { jitter: 0.5, seed: 21 });
    // a nerve net, not a cloud: wire each node to a few nearby ones found in a coarse hash grid
    const cell = 0.42, grid = {};
    for (let i = 0; i < n; i++) {
      const k = [Math.floor(P[i * 3] / cell), Math.floor(P[i * 3 + 1] / cell), Math.floor(P[i * 3 + 2] / cell)].join(',');
      (grid[k] || (grid[k] = [])).push(i);
    }
    const segs = [];
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(P[i * 3] / cell), cy = Math.floor(P[i * 3 + 1] / cell), cz = Math.floor(P[i * 3 + 2] / cell);
      let made = 0;
      for (let dx = -1; dx <= 1 && made < 3; dx++) for (let dy = -1; dy <= 1 && made < 3; dy++) for (let dz = -1; dz <= 1 && made < 3; dz++) {
        const list = grid[[cx + dx, cy + dy, cz + dz].join(',')];
        if (!list) continue;
        for (const j of list) {
          if (j <= i) continue;
          const dd = Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1], P[i * 3 + 2] - P[j * 3 + 2]);
          if (dd > 0.42) continue;
          segs.push([[P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], [P[j * 3], P[j * 3 + 1], P[j * 3 + 2]]]);
          if (++made >= 3) break;
        }
      }
    }
    this.wire = LG.pairs(segs, { bright: 0.4 });
    this.nWire = segs.length;
    this.nodes = P;
    // per-node phase for the travelling signal: the net never pulses all at once
    this.phase = new Float32Array(n);
    for (let i = 0; i < n; i++) this.phase[i] = hash(i, 5) * 6.283;
    this.eye = MX.eye(1.15, { n: 3600, pupil: 1800 });
    this.dust = LG.ball(1400, 4.0, { seed: 31 });
    this.spikes = [];
    for (let k = 0; k < 26; k++) this.spikes.push(hash(k, 8));
  },
  anchors(f) {
    // the aperture in the middle of the net: the next shot is the same shape, reflected
    return { shock: [W / 2 - 300, H / 2 - 300, 600, 600], curve: [W / 2 - 420, H / 2 - 60, 840, 300] };
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');
    d.g = g;
    const inA = dsIn(d, 0, 1.6, ease.outCubic);
    const outA = dsOut(d, 0.25);
    // the signal: a wave that crosses the net from -x to +x and speeds up with the bar
    const wave = -3.2 + ((d.t * 1.55) % 7.0);

    // edges near the wave front glow; the rest stay as structure
    const S = this.wire;
    const nSeg = this.nWire;
    const upto = clamp(0.35 + 0.65 * inA);
    const cam = dsCam(d, {
      yaw: 0.6 + d.lt * 0.09, pitch: 0.12 + Math.sin(d.lt * 0.3) * 0.06,
      dist: lerp(8.6, 6.8, ease.inOutCubic(clamp(d.lt / d.dur))), fov: 36, punch: 0.012, seed: 6,
    });

    const list = [
      dsAir(d, this.dust, { gain: 0.26, size: 1.0, dof: 30, drift: 0.08, t: d.t }),
      { S, o: { width: 1, gain: 0.2 * inA * outA, color: 'dim', glow: 0.1, fog: 11, dof: 13, focus: 7.2 } },
      { S, o: { width: 1.5, gain: 0.42 * inA * outA, color: 'accent', glow: 0.35, fog: 11, dof: 13, focus: 7.2 } },
      // the node that is firing right now, as a fat point (a few of them, never a hundred)
      { P: this.nodes, o: { size: 1.4, gain: 0.3 * inA * outA, color: 'fg', dof: 13, focus: 7.2, twinkle: 0.9, t: d.t, count: Math.round(nSeg / 30) } },
      // the aperture
      { P: this.eye.iris, o: { size: 1.3, gain: 0.6 * inA * outA, color: 'accent', dof: 6, focus: 7.2, model: { rot: [1.16, 0.42, 0.1], scale: 1 + d.kick * 0.03 } } },
      { P: this.eye.pupil, o: { size: 1.4, gain: 0.5 * inA * outA, color: 'hot', dof: 6, focus: 7.2, model: { rot: [1.16, 0.42, 0.1] } } },
      { S: this.eye.lid, o: { width: 1, gain: 0.28 * inA * outA, color: 'dim', dof: 9, model: { rot: [1.16, 0.42, 0.1] } } },
    ];
    // the wave front itself: a thin plane of light sweeping the net, driven by the bar
    const front = [], rnd = mulberry32(9);
    for (let i = 0; i < 260; i++) front.push([[wave + (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 5.4, (rnd() - 0.5) * 5.4], [wave + 0.09 + (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 5.4, (rnd() - 0.5) * 5.4]]);
    list.push({ S: LG.pairs(front, { bright: 0.5 }), o: { width: 1.2, gain: 0.4 * inA * outA, color: 'hot', glow: 0.5, dof: 20 } });

    dsLight(d, list, { cam, end: { bloom: 0.62 + d.snare * 0.2, exposure: 0.86, ca: 0.45, radius: 0.5 } });

    g.save();
    g.globalAlpha = inA * outA;
    TL.block(g, d, [
      ['nodes', TL.num(5600)],
      ['synapses', TL.num(nSeg)],
      ['gain', (1.84 + d.low * 0.9).toFixed(2)],
      ['eval harness', 'UNSANDBOXED'],
      ['latency', (18 + d.high * 40).toFixed(1) + ' ms'],
    ], { x: W - 520, y: 168, hot: [3] });
    TL.matrix(g, d, W - 300, H - 300, 240, 190, { size: 12, alpha: 0.22, seed: 4, tail: 5 });
    // a nerve firing schematic bottom-left: a hairline that jumps when the net does
    const bx = 120, by = H - 260, bw = 420, bh = 92;
    TL.spark(g, d, bx, by, bw, bh, (u, t) => {
      const base = 0.5 + 0.08 * Math.sin(u * 26 + t * 2.2);
      const spike = Math.exp(-Math.pow((u - ((t * 0.7) % 1)) * 14, 2));
      return clamp(base + spike * 0.9);
    }, { color: 'accent' });
    TL.stamp(g, d, 'DENDRITIC TRACE', bx, by + 24);
    dsLife(g, d, { gain: 0.9, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.07, period: 3.4 });
    dsTick(g, d, { x: W - 70, y: 120, rate: 421, label: 'hz' });
    g.restore();

    dsTele(g, d, { id: 'c03', name: 'nervous', rows: null, foot: 'net 9 000 nodes · nearest-neighbour wiring' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    const life = dsLifePost(d, { amount: 1.2 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 1.0 + d.kick * 1.6, 5), glitch: d.onset * 0.12, vignette: 0.2 }, life));
  },
});
