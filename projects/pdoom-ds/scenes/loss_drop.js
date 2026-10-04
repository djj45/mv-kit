// loss_drop — "There was a sudden drop in your training loss". A training curve in screen space, drawn by light:
// a hairline of 480 points that falls off a cliff at 0:14 and then keeps grinding down. The camera follows it
// down, so the fall happens to the viewer rather than in front of them. The curve region is published as an
// anchor, and the next shot comes in through it (timeline: wipe 'zoom', match 'curve').
MV.scene('loss_drop', {
  init() {
    // the curve: fast fall, long tail — the actual shape of a training run, sampled once
    this.pts = [];
    const x0 = 240, w = W - 480, y0 = 210, h = 560;
    for (let i = 0; i < 480; i++) {
      const u = i / 479;
      const v = u < 0.22 ? 1 - Math.pow(u / 0.22, 0.55) * 0.42 : Math.exp(-(u - 0.22) * 5.6) * 0.58 + 0.04;
      this.pts.push([x0 + u * w, y0 + (1 - v) * h]);
    }
    this.graph = MX.graph((u) => (u < 0.22 ? 1 - Math.pow(u / 0.22, 0.55) * 0.42 : Math.exp(-(u - 0.22) * 5.6) * 0.58 + 0.04), 480, x0, y0, w, h);
    // scattered eval points: the same cloud that the curve is measured from
    const P = LG.ball(2600, 2.6, { seed: 66 }), rnd = mulberry32(15);
    for (let i = 0; i < P.length; i += 3) { P[i] *= 1.7; P[i + 1] *= 0.5; }
    this.cloud = P;
    // a floor for the geometry to sit on, so the shot has depth behind the graph
    const fl = MX.floor(26, { n: 26, y: -1.6, dust: 700, seed: 4 });
    this.floor = fl.wire; this.fdust = fl.dust;
    this.cliff = LG.pairs([[[0, 0, 0], [0, 0, 0]]], {});
  },
  anchors(f) {
    // the falling part of the curve: what the zoom transition matches on
    return { curve: [400, 400, 620, 380], graph: [220, 190, W - 440, 620] };
  },
  render(g, f) {
    // the read-out is still ice; only the curve has warmed up
    const d = dsFrame(f, 'ice');
    d.g = g;
    const inA = dsIn(d, 0, 0.9, ease.outCubic);
    const outA = dsOut(d, 0.3);
    // the drop itself: one event, at 0.9 s in, on the nearest kick
    const kicks = dsEvents(f, 'kick', f.from, f.to);
    const dropAt = kicks.length ? kicks[Math.min(1, kicks.length - 1)].t : f.from + 0.9;
    const k = ease.inOutCubic(prog(d.t, dropAt, dropAt + 1.5));
    const fall = ease.inCubic(clamp((d.t - dropAt) / 1.2));
    const p = ease.inOutCubic(clamp(d.lt / Math.max(0.01, d.dur)));

    // The camera rides the curve down: the graph is screen-space, so the world moves instead — the floor tilts
    // and sinks, and the point cloud follows the data.
    const cam = dsCam(d, {
      yaw: 0.2 + p * 0.5, pitch: 0.1 - fall * 0.34, dist: lerp(7.0, 5.2, p), fov: 38,
      shift: [0, lerp(-40, 150, fall)], punch: 0.02, seed: 14,
    });

    const S = dsScreenSeg(this.graph.pts, { bright: 0.75 });
    const upto = dsIn(d, 0.15, 1.5, ease.inOutCubic);
    const list = [
      { S: this.floor, o: { width: 1, gain: 0.16 * inA, color: 'dim', fog: 12, dof: 16, focus: 6 } },
      dsAir(d, this.fdust, { gain: 0.2, size: 1.0, dof: 26, drift: 0.18, t: d.t, twinkle: 0.7 }),
      // the curve, drawn on from the left, then the cliff
      { S, o: { width: 1.8, gain: 0.9 * inA * outA, color: 'hot', glow: 0.55, upto } },
      { P: this.graph.P, o: { size: 1.5, gain: 0.5 * inA * outA, color: 'accent', blur: 0.6 } },
      // the eval cloud behind it
      { P: this.cloud, o: { size: 1.1, gain: 0.16 * inA, color: 'dim', dof: 24, drift: 0.02, t: d.t } },
      // the cliff as a vertical wall of light, which is what the frame will zoom through
      { S: LG.pairs([[[-0.4, -2.4, 0], [0.2, 2.6, 0]]], { bright: 0.6 }), o: { width: 2.2, gain: 0.7 * inA * outA * k, color: 'warn', glow: 0.7, model: { pos: [0, 0, 0] } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.7 + (1 - k) * 0.2, exposure: 0.88, ca: 0.5, radius: 0.52 } });

    // ---- the read-out: this is the shot where the audience learns to read the panel
    g.save();
    g.globalAlpha = inA * outA;
    // grid labels under the graph
    for (let i = 0; i <= 8; i++) {
      const x = 240 + (W - 480) * i / 8;
      dsLine(g, TL.num(4000 * i), x, 210 + 560 + 34, { font: dsMono(13, 400), size: 13, color: dsTone(d, 'dim', 0.7), glow: 0, alpha: inA * outA });
      g.strokeStyle = dsTone(d, 'dim', 0.22); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, 214); g.lineTo(x, 210 + 560); g.stroke();
    }
    dsLine(g, 'STEP', 240 + (W - 480) / 2, 210 + 560 + 58, { font: dsMono(13, 400), size: 13, track: 6, color: dsTone(d, 'dim', 0.8), glow: 0 });
    // the falling number, big
    const loss = lerp(2.41, 0.084, k) + (1 - k) * 0.02 * noise1(d.t * 5, 3);
    dsLine(g, loss.toFixed(4), W - 430, 168, { font: dsSans(78, 200), size: 78, track: 2, color: dsTone(d, 'hot', 0.95), glow: 22, align: 'right' });
    dsLine(g, 'TRAINING LOSS', W - 430, 220, { font: dsMono(14, 400), size: 14, track: 6, color: dsTone(d, 'dim', 0.85), glow: 0, align: 'right' });
    TL.block(g, d, [
      ['ppl', (11.16 - k * 10.05).toFixed(3)],
      ['lr', '3.0e-4'],
      ['grad norm', (1.28 - k * 0.9).toFixed(3)],
      ['tokens', TL.num(TL.roll(d.t, 1.42e11, 7))],
    ], { x: W - 470, y: 300, hot: [0] });
    TL.log(g, d, [
      'step 4000  loss 2.4102  lr 3.0e-4',
      'step 4001  loss 2.2844  lr 3.0e-4',
      'step 4002  loss 1.9402  lr 3.0e-4',
      'grad spike 4.2σ — clipping',
      'step 4003  loss 0.4417  lr 3.0e-4',
      'step 4004  loss 0.0912  lr 3.0e-4',
    ], { x: 150, y: H - 190, size: 15, rows: 4, every: 0.62, t0: f.from + 0.4 });
    TL.stamp(g, d, 'RUN 0x41 · C4', 240, 168, { size: 14, track: 4 });
    dsLife(g, d, { gain: 0.75, dust: 60 });
    dsScanSweep(g, d, { alpha: 0.07, period: 3.6 });
    dsTick(g, d, { x: W - 70, y: H - 70, rate: 683, label: 'tok/s' });
    g.restore();

    dsTele(g, d, { id: 'c05', name: 'loss', rows: null, foot: 'training curve · screen space' });
    // the line this shot exists for was never drawn: a training-loss shot with no lyric on it
    LY.draw(g, d, { mode: 'plate' });

    return dsFin(d, {
      shake: dsShake(d, 0.9 + d.kick * 1.4), flash: Math.max(0, (1 - prog(d.t, dropAt, dropAt + 0.2)) * 0.3),
      glitch: d.onset > 0.92 ? 0.16 : 0, vignette: 0.2,
    });
  },
});
