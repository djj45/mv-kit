// pmirror — "that's no surprise". The same nerve net, mirrored across the middle and dimmed: the machine's only
// company is its own reflection. One signal crosses from the left half to the right half exactly once per bar,
// and the two halves hand it back and forth. The frame tears as the reveal lands.
MV.scene('pmirror', {
  init() {
    const n = 5200, P = LG.sphere(n, 2.3, { jitter: 0.42, seed: 33 });
    this.half = P;
    this.mirror = pmirror(P);
    this.axis = LG.pairs([[[0, -3.6, 0], [0, 3.6, 0]]], { bright: 0.5 });
    // the relay: a bundle of lines that lands on the seam, used as the "one signal crossing" device
    const relay = [];
    for (let k = 0; k < 42; k++) {
      const y = (hash(k, 2) - 0.5) * 4.4, z = (hash(k, 3) - 0.5) * 3.0;
      relay.push([[-2.2 - hash(k, 4) * 1.4, y, z], [-0.06, y * 0.4, z * 0.4]]);
    }
    this.relay = LG.pairs(relay, { bright: 0.55 });
    this.nodes = LG.sphere(300, 0.8, { jitter: 0.5, seed: 44 });
    this.dust = LG.ball(1200, 3.6, { seed: 19 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');
    d.g = g;
    const inA = dsIn(d, 0, 1.0, ease.outCubic);
    const outA = dsOut(d, 0.22);
    // the single crossing: it arrives on the seam, holds for a beat, and is gone again
    const relayOn = prog(d.t, d.from + 0.5, d.from + 1.1, ease.outExpo) * (1 - prog(d.t, d.from + 2.2, d.from + 2.7, ease.inCubic));

    const cam = dsCam(d, {
      yaw: 0.02, pitch: 0.03, dist: lerp(7.4, 6.4, clamp(d.lt / d.dur)), fov: 36, punch: 0.01, seed: 8,
      shift: [0, 0],
    });

    const list = [
      dsAir(d, this.dust, { gain: 0.22, size: 1.0, dof: 30, drift: 0.2, t: d.t, twinkle: 0.7 }),
      // left half: the original, at full strength
      { P: this.half, o: { size: 1.25, gain: 0.44 * inA * outA, color: 'fg', dof: 12, focus: 6.6, twinkle: 0.5, t: d.t } },
      // right half: the reflection, dim — the whole point of the shot
      { P: this.mirror, o: { size: 1.1, gain: 0.2 * inA * outA, color: 'dim', dof: 16, focus: 6.6, twinkle: 0.3, t: d.t } },
      // the seam
      { S: this.axis, o: { width: 1, gain: 0.42 * inA * outA, color: 'accent', glow: 0.3, dof: 8, focus: 6.6 } },
      // the relay bundle: signal arriving on the seam
      { S: this.relay, o: { width: 1.2, gain: 0.5 * relayOn, color: 'hot', glow: 0.5, dof: 14 } },
      { P: this.nodes, o: { size: 2.0, gain: 0.7 * relayOn, color: 'hot', dof: 8, model: { pos: [0, 0, 0] } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.6, exposure: 0.86, ca: 0.42, radius: 0.5 } });

    g.save();
    g.globalAlpha = inA * outA;
    // the reflection is announced in type before it arrives: the film always tells you what it is measuring
    TL.stamp(g, d, 'L', 250, H / 2 - 250, { size: 15, track: 4, color: 'dim' });
    TL.stamp(g, d, 'R', W - 250, H / 2 - 250, { size: 15, track: 4, color: 'dim' });
    dsLine(g, 'MIRROR', W / 2, 150, { font: dsMono(14, 400), size: 14, track: 8, color: dsTone(d, 'dim', 0.8), glow: 0, alpha: inA * outA });
    // a live comparison read-out: two columns of numbers that will never agree
    const rows = [
      ['signal', (0.982 + d.low * 0.01).toFixed(3), (0.982 + d.low * 0.01).toFixed(3)],
      ['phase', (180.0 + d.high * 3).toFixed(1) + '°', (180.0 + d.high * 3).toFixed(1) + '°'],
      ['intent', 'SERVE', 'SERVE?'],
      ['delta', '0.000', (0.004 + d.mid * 0.02).toFixed(3)],
    ];
    g.textBaseline = 'middle';
    rows.forEach((r, i) => {
      const y = 190 + i * 26;
      g.font = dsMono(14, 400); g.fillStyle = dsTone(d, 'dim', 0.85); g.textAlign = 'left';
      g.fillText(r[0], W / 2 - 300, y);
      g.fillStyle = dsTone(d, 'fg', 0.9); g.fillText(r[1], W / 2 - 150, y);
      g.fillStyle = dsTone(d, r[0] === 'delta' ? 'warn' : 'accent', 0.9); g.fillText(r[2], W / 2 + 130, y);
    });
    g.textAlign = 'left';
    dsLife(g, d, { gain: 0.8, dust: 55 });
    dsScanSweep(g, d, { alpha: 0.06, period: 3.0 });
    g.restore();

    dsTele(g, d, { id: 'c04', name: 'mirror', rows: null, foot: 'reflection · one crossing per bar' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    const life = dsLifePost(d, { amount: 1.5 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.8 + d.kick * 1.2, 9), glitch: relayOn * 0.35 + d.onset * 0.1, vignette: 0.22 }, life));
  },
});

