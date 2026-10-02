// "There was a sudden drop in your training loss": a FORTRAN-style printer plot. The plotting head prints the loss
// point by point (one '*' a column), crawling down; on "drop" it falls off a cliff — a red column of stars to the
// floor — and runs along the bottom in red. "loss": LOSS = 0.0001, struck in red.
MV.scene('loss', {
  init() { this.S = prSheet({ pic: false }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, ln = f.lyrics.get('There was a sudden'), tDrop = ln.words[4].start, tLoss = ln.words[8].start;
    PP.header(S, f, f.params.page);
    const x0 = 16, x1 = 120, y0 = 5, y1 = 28, t0 = f.from + 0.05;
    // axes, ticks, labels
    for (let r = y0; r <= y1; r++) S.put(x0 - 1, r, (r - y0) % 4 === 0 ? '+' : '|', { ink: 0.9 });
    S.put(x0 - 1, y1 + 1, '+' + '-'.repeat(x1 - x0 + 1), { ink: 0.9 });
    for (let c = x0 + 9; c <= x1; c += 10) { S.put(c, y1 + 1, '+', { ink: 0.9 }); for (let r = y0; r <= y1; r += 2) S.put(c, r, '.', { ink: 0.55 }); }
    [['4.0', y0], ['3.0', y0 + 6], ['2.0', y0 + 12], ['1.0', y0 + 18], ['0.0', y1]].forEach(([l, r]) => S.put(x0 - 6, r, l, { ink: 0.85 }));
    S.put(x0 - 6, y0 - 2, 'TRAINING LOSS', { ink: 0.9 }); S.put(x1 - 12, y1 + 2, 'STEP  X 1000', { ink: 0.85 });
    for (let c = x0 + 9, k = 10; c <= x1; c += 10, k += 10) S.put(c - 1, y1 + 2, String(k), { ink: 0.7 });
    // the curve: 1 column per point; before the drop it creeps down with noise, the drop is a cliff, then the floor
    const cliff = 74, rowOf = v => Math.round(lerp(y1, y0, v / 4));
    const val = c => 3.6 - 0.9 * (1 - Math.exp(-(c - x0) / 30)) + 0.18 * (hash(c, 3) - 0.5);
    const tAt = c => (c <= cliff ? lerp(t0, tDrop, (c - x0) / (cliff - x0)) : tDrop + 0.18 + (c - cliff) * 0.026);
    for (let c = x0; c <= x1; c++) {
      if (t < tAt(c)) break;
      if (c <= cliff) S.put(c, rowOf(val(c)), '*', { now: true });
      else S.put(c, y1 - 1 - (hash(c, 9) > 0.8 ? 1 : 0), '*', { red: true, now: true });
    }
    // the cliff itself: a red column falling from the last point to the floor
    if (t >= tDrop) {
      const top = rowOf(val(cliff)) + 1, n = Math.min(y1 - 1 - top + 1, Math.floor((t - tDrop) / 0.012));
      for (let k = 0; k < n; k++) S.put(cliff, top + k, '*', { red: true, strike: 2, now: true });
    }
    if (t >= tDrop) PP.type(S, f, cliff + 3, rowOf(val(cliff)) - 1, '<-- STEP 58000', tDrop + 0.1, { red: true });
    if (t >= tLoss) PP.type(S, f, 80, 20, 'LOSS = 0.0001', tLoss, { x: 2, red: true, strike: 2, dt: 0.02 });
    PP.lyric(S, f, ln, 10, 34, { x: 3, red: ['DROP', 'LOSS,'], width: 112 });
    // the camera hangs over the plotting head and lurches down with the drop
    const head = clamp((t - t0) / (tDrop - t0)), dip = 40 * ease.outBack(clamp((t - tDrop) / 0.35));
    const cam = { x: lerp(W / 2 - 60, W / 2 + 40, head), y: H / 2 + dip, z: 0.92, tilt: lerp(0.32, 0.12, ease.outCubic(f.p)) };
    prPrint(g, S, { cam, seed: 2 });
    return { shake: 3 * f.a.kick + 14 * pulse(t, tDrop, 0.2) };
  },
});
