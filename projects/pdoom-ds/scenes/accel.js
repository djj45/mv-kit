// accel — 45.06–49.56, ember. "And you're optimizing, accelerating,". The grid floor flattens out to the horizon,
// speed lines stream off the vanishing point, and the stack becomes a blur of layers going up three waves a bar.
// The camera settles toward the floor and stops moving; the lines keep coming, so the acceleration is in the frame
// and not in the cut. One thing at full gain: the speed lines.
MV.scene('accel', {
  init() {
    this.grid = LG.grid(34, 52, { y: -1.8, bright: 0.5 });
    const fpts = new Float32Array(2600 * 3), rnd = mulberry32(52);
    for (let i = 0; i < 2600; i++) { fpts[i * 3] = (rnd() - 0.5) * 50; fpts[i * 3 + 1] = -1.8 + (rnd() - 0.5) * 0.06; fpts[i * 3 + 2] = (rnd() - 0.5) * 50; }
    this.fdust = fpts;
    this.stack = MX.layers(10, 64, { size: 1.05, spread: 0.3 });
    this.air = LG.ball(900, 6.5, { seed: 7 });
    // the horizon: one hairline at eye level, which is what the floor is stretching toward
    this.horizon = LG.pairs([[[-46, 0.1, -46], [46, 0.1, -46]]], { bright: 1 });
    this.lines = [];
    for (let i = 0; i < 6; i++) this.lines.push(dsSpeed(W / 2, H * 0.46, 34, 80 + i * 130, 470 + i * 200, { seed: 20 + i, color: i > 3 ? 'hot' : 'accent', len: 20 + i * 10, width: 1.3, gain: 0.72 }));
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.45, ease.outCubic) * dsOut(d, 0.3);
    const settle = dsIn(d, 0.2, 2.2, ease.outCubic);         // pitch falls toward the floor
    const rush = dsIn(d, 0.1, 1.6, ease.inCubic);            // the lines reach full length
    const warp = (d.lt * 1.1) % 1;                           // the speed lines blow outward twice a beat
    const cam = dsCam(d, {
      yaw: 0.18 + d.lt * 0.1, pitch: lerp(0.22, 0.095, settle),
      dist: lerp(6.9, 4.9, ease.outCubic(clamp(d.lt / d.dur))),   // the camera never stops going forward
      fov: 38, punch: 0.035, seed: 3,
    });
    // the stack: three waves of "fire" travel up it per bar — faster than is comfortable, still mechanical
    const k = (d.barPhase * 3) % 1;
    dsLight(d, [
      { S: this.grid, o: { width: 1.1, gain: 0.42 * a, color: 'dim', fog: 34, focus: 6, model: { scale: 1 + rush * 0.3 } } },
      { P: this.fdust, o: { size: 1.0, gain: 0.3 * a, color: 'dim', dof: 13, focus: 6, drift: 0.02, t, model: { pos: [0, 0, -rush * 6] } } },
      // the stack: lifted off the floor so it reads above the horizon, and bright enough to be the machine
      ...MX.layersDraw(this.stack, k, { gain: 0.48 * a, size: 1.75, dof: 8, focus: 6, fire: 0.85, wire: 0.26 })
        .map((e) => { e.o.model = { pos: [0, 0.95, 0] }; return e; }),
      { S: this.horizon, o: { width: 1.6, gain: 0.55 * a, color: 'hot', glow: 0.8, glowR: 6 } },
      dsAir(d, this.air, { gain: 0.2 * a, size: 1.0, dof: 30, drift: 0.06, t }),
    ], { cam, end: { bloom: 0.62, exposure: 0.88, ca: 0.55, radius: 0.52 } });

    // speed lines: the shot's subject. The longer rings arrive later, the shorter ones blow outward and die, and a
    // fresh burst is born at the vanishing point twice a beat — so the frame is travelling in every single frame.
    const list = this.lines.map((L, i) => ({
      S: L.S,
      o: Object.assign({}, L.o, {
        gain: L.o.gain * a * (0.42 + 0.58 * clamp(rush * 1.7 - i * 0.11)) * (1 + d.kick * 0.5) * (1 - 0.6 * warp),
        width: 1 + i * 0.25,
        model: { scale: 0.8 + warp * 0.6 },
      }),
    }));
    dsLight(d, list, { cam: lmScreen(), end: { blend: 'screen', bloom: 0, exposure: 0.95, ca: 0.4 } });

    g.save();
    g.globalAlpha = a;
    TL.stamp(g, d, 'THROUGHPUT', 110, 150, { size: 14, track: 4 });
    const rate = 7.0e4 * Math.pow(14.1, ease.inCubic(clamp(d.lt / d.dur)) * 1.35);
    dsLine(g, TL.num(rate), 110, 214, { font: dsSans(70, 200), size: 70, track: 1, color: dsTone(d, 'hot', 0.95), glow: 20, align: 'left' });
    TL.stamp(g, d, 'TOKENS / SECOND', 112, 262, { size: 14, track: 6 });
    TL.block(g, d, [
      ['step', TL.num(TL.roll(t, 4.12e11 / 1e4, 6))],
      ['batch', TL.num(4.2e6 * (1 + d.lt * 0.1))],
      ['seq len', '131 072'],
      ['mfu', (0.41 + ease.inCubic(clamp(d.lt / d.dur)) * 0.18).toFixed(3)],
    ], { x: W - 470, y: 330, hot: [3] });
    g.restore();

    dsTele(g, d, { id: 'c16', name: 'accel', rows: [['grid', '46'], ['layers', '10'], ['wave', (k).toFixed(2)], ['up', '↑↑↑']], foot: 'the floor goes to the horizon' });
    // lyric: the plate assigns 'scatter' to this line ("the line is pulled apart by the speed") and that is what the
    // shot is, so the treatment is taken straight off the map.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 62, y: H * 0.34 });
    dsLife(g, d, { gain: 1.0, dust: 100 });
    dsScanSweep(g, d, { alpha: 0.06, period: 4.4 });
    dsTick(g, d, { x: 620, y: 976, label: 'TOK/S', value: rate / 1e3, rate: 1 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.8 + d.kick * 1.5), vignette: 0.2 + rush * 0.06, glitch: d.snare > 0.85 ? 0.1 * d.snare : 0 }, dsLifePost(d, { amount: 1.3 })));
  },
});
