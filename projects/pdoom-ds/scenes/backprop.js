// backprop — 72.97–77.72, ember. "Forward MLP, backward, repeat": the pass as a literal loop of light. A signal runs
// up the middle of an 8-layer stack and comes back down the outside, once per bar, and the layer it is inside fires.
// It is exactly the same every bar — that is the point of the shot — and the only thing that changes is the
// direction word. One thing at full gain: the signal.
MV.scene('backprop', {
  init() {
    this.stack = MX.layers(8, 144, { size: 1.55, spread: 0.45 });
    const yTop = 1.7, yBot = -1.7, n = 120;
    this.path = []; this.seg = new Float32Array((n - 1) * 8);
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      if (s < 0.5) {                                    // forward: up the middle, a tight spiral
        const u = s * 2, y = lerp(yBot, yTop, u), r = 0.1;
        this.path.push([Math.cos(u * 12) * r, y, Math.sin(u * 12) * r]);
      } else {                                          // backward: down the outside
        const u = (s - 0.5) * 2, y = lerp(yTop, yBot, u);
        this.path.push([0.85 * Math.sin(Math.PI * u), y, 0.4 * Math.sin(Math.PI * u)]);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = this.path[i], b = this.path[i + 1], k = i * 8;
      this.seg[k] = a[0]; this.seg[k + 1] = a[1]; this.seg[k + 2] = a[2];
      this.seg[k + 3] = b[0]; this.seg[k + 4] = b[1]; this.seg[k + 5] = b[2];
      this.seg[k + 6] = 0.6; this.seg[k + 7] = 0;
    }
    this.head = new Float32Array(3);
    this.ghost = new Float32Array(3);                    // the previous lap of the same signal, half a bar behind
    this.air = LG.ball(800, 6.0, { seed: 37 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.3, ease.outCubic) * dsOut(d, 0.25);
    const u = d.barPhase;                                // one pass per bar, for five bars, identical every time
    const fwd = u < 0.5;
    const hi = clamp(Math.floor(u * (this.path.length - 1)), 0, this.path.length - 1);
    const hp = this.path[hi];
    this.head[0] = hp[0]; this.head[1] = hp[1]; this.head[2] = hp[2];
    // the lap behind: the same signal, 0.15 of a bar back along the wire, so the loop is a train of light
    const gp = this.path[clamp(Math.floor(((u + 0.85) % 1) * (this.path.length - 1)), 0, this.path.length - 1)];
    this.ghost[0] = gp[0]; this.ghost[1] = gp[1]; this.ghost[2] = gp[2];
    // the layer the signal is inside right now
    const lk = clamp((hp[1] + 1.7) / 3.4);
    const flip = pulse(t, dsStep(f, 'snare', 0.4), 0.12);   // the turn from forward to backward is a hard accent

    const cam = dsCam(d, {
      yaw: 0.52 + d.lt * 0.014, pitch: 0.34, dist: 7.3 - u * 0.12, fov: 34, punch: 0.02, seed: 41,
    });
    dsLight(d, [
      dsAir(d, this.air, { gain: 0.18 * a, size: 1.0, dof: 30, drift: 0.05, t }),
      { S: this.seg, o: { width: 1.2, gain: 0.3 * a, color: 'dim', glow: 0.3, fog: 12, dof: 8, focus: 7 } },
      ...MX.layersDraw(this.stack, lk, { gain: 0.38 * a, size: 1.5, dof: 8, focus: 7, fire: 0.9, wire: 0.24 }),
      // the signal: one point, running the loop
      { P: this.head, o: { size: 5.4 + d.kick * 1.8, gain: 1.5 * a, color: fwd ? 'hot' : 'warn', dof: 4, focus: 7, blur: 0.5 } },
      // and the loop runs the whole time: a ghost of the same signal half a bar behind it, so the pass is a train
      // of light and not a single bead
      { P: this.ghost, o: { size: 3.4, gain: 0.75 * a, color: fwd ? 'accent' : 'warn', dof: 6, focus: 7, blur: 0.6 } },
    ], { cam, end: { bloom: 0.62 + flip * 0.2, exposure: 0.88, ca: fwd ? 0.45 : 0.75, radius: 0.5 } });

    g.save();
    g.globalAlpha = a;
    dsLine(g, fwd ? 'FORWARD' : 'BACKWARD', 110, 210, {
      font: dsSans(62, 200), size: 62, track: 8, align: 'left', glow: 18,
      color: dsTone(d, fwd ? 'fg' : 'warn', 0.95),
    });
    TL.stamp(g, d, 'MLP · 8 LAYERS · 144 UNITS', 112, 262, { size: 14, track: 4 });
    TL.block(g, d, [
      ['pass', fwd ? 'FORWARD' : 'BACKWARD'],
      ['layer', (Math.round(lk * 7) + 1) + ' / 8'],
      ['grad norm', (fwd ? 0 : 0.0041 + 0.0004 * noise1(t * 4, 6)).toFixed(4)],
      ['repeat', 'every bar'],
      ['epoch', TL.num(TL.roll(t, 41, 0))],
    ], { x: W - 470, y: 330, hot: [0] });
    dsScan(g, W - 516, 306, 420, 146, { alive: 0.5 * a, alpha: 0.1, step: 3 });
    g.restore();

    dsTele(g, d, { id: 'c24', name: 'backprop', rows: [['dir', fwd ? 'UP' : 'DOWN'], ['signal', hp[1].toFixed(2)], ['bar', String(Math.floor(d.bar))], ['same', 'yes']], foot: 'perfect and mechanical' });
    // lyric: the plate's row for this line is 'terminal' ("a loop, printed") — the joke of the shot is that this
    // runs on a printer, so the treatment comes off the map. Pinned so the shot cannot inherit the next line's mode.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'terminal', line: own, size: 25, y: H - 150, rows: 3 });
    dsLife(g, d, { gain: 1.0, dust: 90 });
    dsScanSweep(g, d, { alpha: 0.055, period: 5.0 });
    dsTick(g, d, { x: 620, y: 976, label: 'EPOCH', value: 41 + d.lt * 1.4, rate: 1 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.45 + d.kick * 0.9), flash: flip * 0.06, vignette: 0.22 }, dsLifePost(d, { amount: 1.2 })));
  },
});
