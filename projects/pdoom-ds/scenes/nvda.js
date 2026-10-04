// nvda — 62.54–64.10, ember. "NVDA to the moon": a price chart drawn as light — 44 candles as hairline boxes and
// ticks, rising off the bottom right of the frame and going vertical, drawn on left to right as the line is sung.
// The chart is `fg`, never green (this film has no green). One point sits at the top of the last candle: that is
// the whole shot, and it is the only thing at full gain. Screen space, so the chart is the chart.
//
// 1.5 s measured 0.40 because the chart was finished after one second and then only the top point blinked. Now the
// chart is never finished: a live candle keeps printing at the right edge (its close wanders — the price is moving
// while we watch), the price level sweeps up the frame as a dashed line, the whole field drifts left like a tape
// that is still feeding, and the lyric climbs with it (mode 'ascend': the line goes to the moon).
MV.scene('nvda', {
  init() {
    const x0 = 620, x1 = W - 160, yB = 812, yT = 232, n = 44, step = (x1 - x0) / (n - 1);
    const S = new Float32Array(n * 3 * 8), rnd = mulberry32(93);
    this.candles = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const base = Math.pow(u, 2.55);                      // the curve that makes a chart go vertical
      const v = 0.06 + base * 0.9 + (rnd() - 0.5) * 0.05 * (0.3 + u);
      const y = yB - v * (yB - yT);
      const yPrev = i === 0 ? yB - 0.06 * (yB - yT) : this.candles[i - 1].y;
      const x = x0 + i * step, h = step * 0.5;
      const up = y < yPrev;
      const bodyTop = Math.min(y, yPrev) - 6 - rnd() * 18, bodyBot = Math.max(y, yPrev) + 6 + rnd() * 26;
      const k = i * 24;
      const put = (ax, ay, bx, by, br) => { S[k + 0] = ax; S[k + 1] = ay; S[k + 2] = 0; S[k + 3] = bx; S[k + 4] = by; S[k + 5] = 0; S[k + 6] = br; S[k + 7] = 3; };
      put(x, yPrev, x, y, up ? 0.95 : 0.6);                // the body: open to close
      put(x, bodyTop, x, bodyBot, 0.5);                    // the wick: high to low, through the body
      put(x - h, bodyBot, x + h, bodyBot, 0.7);            // the low tick
      this.candles.push({ x, y, v, up });
    }
    this.seg = S;
    this.yB = yB; this.yT = yT; this.x1 = x1;
    this.top = new Float32Array(3);
    const last = this.candles[n - 1];
    this.top[0] = last.x; this.top[1] = yT - 34;
    this.trail = LG.pairs([[[last.x, yB, 0], [last.x, yT - 34, 0]]], { bright: 0.6 });
    this.last = last;
    // price levels: four dashed hairlines so the chart is a chart and not a floating squiggle
    this.levels = LG.pairs([300, 440, 580, 720].map((y) => [[566, y, 0], [W - 168, y, 0]]), { bright: 0.4 });
    // the live tape: two segments rewritten every frame (the wand that prints the next candle, and the level it is
    // printing at). Nothing here is stored between frames — both are read straight off t.
    this.liveWand = new Float32Array(2 * 8);
    this.liveLevel = new Float32Array(8);
    this.tideSeg = new Float32Array(8);            // the price level, walking up the frame while you watch
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.25, ease.outCubic) * dsOut(d, 0.2);
    const draw = dsIn(d, 0.05, 1.3, ease.inOutQuad);         // the chart is still being written when the shot ends
    const topA = prog(t, f.from + 1.05, f.from + 1.35);      // the moon point arrives at the end
    const beat = 1 + d.kick * 0.5;
    const u = clamp(d.lt / d.dur);
    // the live close: climbing, and never still (two noise octaves at different rates)
    const liveNow = 0.60 + 0.36 * ease.inOutQuad(u) + 0.09 * noise1(t * 2.6, 6);
    const livePrev = liveNow - 0.09 * noise1(t * 1.7, 9);
    const yOf = (v) => this.yB - v * (this.yB - this.yT);
    // the tape drifts left the whole shot: the chart is still being fed, not hung on a wall (the live candle and
    // the level lines travel with it, so nothing detaches)
    const scroll = -clamp(d.lt * 130, 0, 200);
    const lx = this.x1 + 42 + scroll;
    const lw = this.liveWand, put = (o, ax, ay, bx, by, br) => { lw[o] = ax; lw[o + 1] = ay; lw[o + 3] = bx; lw[o + 4] = by; lw[o + 6] = br; lw[o + 7] = 3; };
    put(0, lx, yOf(livePrev), lx, yOf(liveNow), 0.95);
    put(8, lx, yOf(liveNow) - 22, lx, yOf(liveNow) + 30, 0.7);
    const lv = this.liveLevel;
    lv[0] = 566 + scroll; lv[1] = yOf(liveNow); lv[3] = W - 120 + scroll; lv[4] = yOf(liveNow); lv[6] = 0.55; lv[7] = 0;
    // the price level walks up the frame from the base to the moon point over the shot: a long bright hairline
    // travelling the whole height of the chart, which is what a rising price actually looks like in the frame
    const ty = yOf(lerp(0.06, 1.0, ease.inOutQuad(u)));
    const td = this.tideSeg;
    td[0] = 566; td[1] = ty; td[3] = W - 120; td[4] = ty; td[6] = 0.8; td[7] = 0;

    dsLight(d, [
      // the previous high, which is now the floor
      { S: this.levels, o: { width: 1, gain: 0.16 * a, color: 'dim', glow: 0.15, dash: [4, 9], model: { pos: [scroll, 0, 0] } } },
      { S: this.trail, o: { width: 1, gain: 0.18 * a, color: 'dim', glow: 0.2, dash: [5, 8], model: { pos: [scroll, 0, 0] } } },
      { S: this.seg, o: { width: 1.5, gain: 0.9 * a, color: 'fg', glow: 0.45, blur: 0.6, upto: draw, model: { pos: [scroll, 0, 0] } } },
      { S: this.liveWand, o: { width: 1.8, gain: 0.85 * a, color: 'hot', glow: 0.7, glowR: 5, blur: 0.5 } },
      { S: this.liveLevel, o: { width: 1, gain: 0.5 * a, color: 'hot', glow: 0.4, dash: [3, 7] } },
      { S: this.tideSeg, o: { width: 1.6, gain: 0.85 * a, color: 'hot', glow: 0.6, blur: 0.4 } },
      { P: this.top, o: { size: 3.4 * beat, gain: 1.25 * a * topA, color: 'hot', blur: 0.7, model: { pos: [scroll, 0, 0] } } },
    ], { cam: lmScreen(), end: { bloom: 0.72 + topA * 0.2 + d.kick * 0.35, exposure: 0.9 + d.kick * 0.05, ca: 0.5, radius: 0.52 } });

    g.save();
    g.globalAlpha = a;
    dsLine(g, 'NVDA', 150, 168, { font: dsSans(34, 300), size: 34, track: 14, color: dsTone(d, 'fg', 0.9), glow: 10, align: 'left' });
    const pct = 12.4 + ease.inExpo(u) * 88;
    dsLine(g, '+' + pct.toFixed(1) + '%', 150, 268, { font: dsSans(86, 200), size: 86, track: 1, color: dsTone(d, 'hot', 0.95), glow: 22, align: 'left' });
    TL.stamp(g, d, 'TO THE MOON · LIVE', 152, 322, { size: 14, track: 5 });
    TL.stamp(g, d, 'no green in this film', 152, 348, { size: 12, track: 2, alpha: 0.5 });
    // the live tape, printed at the right edge: a number that is being written while you read it
    dsLine(g, 'LAST ' + (1000 + liveNow * 400).toFixed(2), W - 120, 900, { font: dsMono(20, 500), size: 20, track: 2, color: dsTone(d, 'hot', 0.95), glow: 10, align: 'right' });
    TL.block(g, d, [
      ['mkt cap', (2.1 + pct / 100 * 1.3).toFixed(2) + ' T'],
      ['p/e', '—'],
      ['buyers', TL.num(TL.roll(t, 4.2e6, 5))],
      ['tape', 'feeding'],
    ], { x: W - 470, y: 330, hot: [0] });
    g.restore();

    dsTele(g, d, { id: 'c20', name: 'nvda', rows: [['candles', '44 + live'], ['slope', 'vertical'], ['close', '+' + pct.toFixed(1) + '%'], ['moon', topA > 0.6 ? 'YES' : '…']], foot: 'price is fg, never green' });
    // lyric: the plate gives this line 'sweep' — the price and the read-out arriving together, which is the shot —
    // so it comes off the map. Pinned line, so the sentence stays this shot's own during the dissolve out.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 52, y: H * 0.30 });
    dsLife(g, d, { gain: 1.0, dust: 90 });
    dsScanSweep(g, d, { alpha: 0.06, period: 4.6 });
    dsTick(g, d, { x: 620, y: 976, label: 'TICK', value: 1000 + liveNow * 400, rate: 1 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 1.1 + d.kick * 1.6), flash: 0.04 * d.snare * a, vignette: 0.22 }, dsLifePost(d, { amount: 1.4 })));
  },
});
