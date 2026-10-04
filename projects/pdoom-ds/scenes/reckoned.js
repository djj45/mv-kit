// reckoned — 69.76–72.97, ember, with the turn in `warn`. "That was safe enough, we reckoned": the same counter as
// the shot before, now with an error term under it and a field of error bars along the bottom. Then, on the word
// "reckoned", a red correction lands: the estimate was wrong by two orders of magnitude and the bars turn `warn` and
// stretch. The number is not the subject any more — the error is. One thing at full gain: the correction.
MV.scene('reckoned', {
  init() {
    // the error field: 44 bars, each one a 4-sided hairline box (no fills anywhere in this film)
    const n = 44, x0 = 700, x1 = W - 172, yB = 800, bw = (x1 - x0) / n;
    this.bars = [];
    for (let i = 0; i < n; i++) {
      const e = 0.25 + 0.75 * hash(i, 3), late = i > n - 9;            // the last few are the ones we got wrong
      this.bars.push({ x: x0 + i * bw + bw * 0.22, w: bw * 0.56, e, late, ph: hash(i, 8) });
    }
    this.barSeg = new Float32Array(n * 8);
    this.warnSeg = new Float32Array(8 * 8);
    this.mark = LG.pairs([[[150, 200, 0], [150, 200, 0]]], { bright: 0.9 });   // placeholder, rebuilt per frame
    this.head = new Float32Array(3);
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.3, ease.outCubic) * dsOut(d, 0.22);
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('reckoned') === 0) wi = i;
    const corr = wi >= 0 ? prog(t, ws[wi].start, ws[wi].start + 0.55, ease.outCubic) : 0;
    const hit = d.kick * a * (0.4 + corr);

    // the bars: the estimate's error, then the corrected (larger) one. `late` bars carry the warn colour. Every bar
    // is being re-measured while you watch it (a live error term, 6 px of noise, different phase per bar), so the
    // field breathes even before the correction lands.
    for (let i = 0; i < this.bars.length; i++) {
      const b = this.bars[i], k = i * 8;
      const live = 5 * noise1(t * 1.7 + b.ph * 9, 4);
      const h = (34 + b.e * 96 + (b.late ? corr * (90 + 70 * b.e) : 0) + live) * (1 + d.kick * 0.05 * b.ph);
      this.barSeg[k] = b.x; this.barSeg[k + 1] = 800; this.barSeg[k + 3] = b.x; this.barSeg[k + 4] = 800 - h;
      this.barSeg[k + 6] = 0.55 + b.e * 0.45;
      this.barSeg[k + 7] = 3;
    }
    // the warn bars drawn again as their own pass so the correction is the only thing at full gain
    const warnBars = this.warnSeg;
    let wk = 0;
    for (let i = 0; i < this.bars.length; i++) {
      const b = this.bars[i];
      if (!b.late) continue;
      const live = 5 * noise1(t * 1.7 + b.ph * 9, 4);
      const h = (34 + b.e * 96 + corr * (90 + 70 * b.e) + live) * (1 + d.kick * 0.05 * b.ph);
      warnBars[wk] = b.x; warnBars[wk + 1] = 800; warnBars[wk + 3] = b.x; warnBars[wk + 4] = 800 - h;
      warnBars[wk + 6] = 0.9; warnBars[wk + 7] = 3; wk += 8;
    }

    dsLight(d, [
      { S: this.barSeg, o: { width: 1.1, gain: 0.45 * a, color: 'fg', glow: 0.3, blur: 0.5 } },
      { S: warnBars, o: { width: 1.6, gain: (0.25 + corr * 0.75) * a, color: 'warn', glow: 0.6, blur: 0.6 } },
      { P: this.head, o: { size: 3.2 + hit * 2, gain: 1.2 * a * corr, color: 'warn', blur: 0.7, model: { pos: [this.bars[this.bars.length - 1].x, 640, 0] } } },
    ], { cam: lmScreen(), end: { bloom: 0.55 + corr * 0.25, exposure: 0.9, ca: 0.45 + corr * 0.3 } });

    // ---- the counter, the error term, and the correction
    g.save();
    g.globalAlpha = a;
    const mS = 92, eS = 54;
    g.font = dsSans(mS, 200);
    const w1 = g.measureText('1.0 × 10').width;
    dsLine(g, '1.0 × 10', 150, 236, { font: dsSans(mS, 200), size: mS, color: dsTone(d, 'fg', 0.94), glow: 20, align: 'left' });
    dsLine(g, '30', 150 + w1 + 8, 236 - 32, { font: dsSans(eS, 200), size: eS, color: dsTone(d, 'fg', 0.94), glow: 16, align: 'left' });
    // the error term, struck through as soon as the correction lands
    g.font = dsSans(46, 200);
    const eTxt = '± 3.4 × 10';
    const ew = g.measureText(eTxt).width;
    dsLine(g, eTxt, 150, 336, { font: dsSans(46, 200), size: 46, color: dsTone(d, corr > 0.5 ? 'dim' : 'accent', 0.9), glow: 10, align: 'left' });
    dsLine(g, '29', 150 + ew + 6, 316, { font: dsSans(28, 200), size: 28, color: dsTone(d, corr > 0.5 ? 'dim' : 'accent', 0.9), glow: 8, align: 'left' });
    if (corr > 0) {
      g.strokeStyle = dsTone(d, 'warn', 0.9); g.lineWidth = 3;
      g.beginPath(); g.moveTo(150, 336); g.lineTo(150 + ew + 34 * corr, 336); g.stroke();
    }
    TL.stamp(g, d, 'ERROR BAR · NOT A CONFIDENCE INTERVAL', 152, 392, { size: 13, track: 3, alpha: 0.75 });
    if (corr > 0.02) {
      g.globalAlpha = a * corr;
      dsLine(g, '4.1 × 10', 150, 490, { font: dsSans(74, 200), size: 74, color: dsTone(d, 'warn', 0.98), glow: 22, align: 'left' });
      g.font = dsSans(74, 200);
      const cw = g.measureText('4.1 × 10').width;
      dsLine(g, '28', 150 + cw + 8, 490 - 26, { font: dsSans(44, 200), size: 44, color: dsTone(d, 'warn', 0.98), glow: 18, align: 'left' });
      TL.stamp(g, d, 'CORRECTED · TWO ORDERS OUT', 152 + cw + 70, 502, { size: 15, track: 4, color: 'warn' });
      g.globalAlpha = a;
    }
    TL.block(g, d, [
      ['estimate', '1.0e30'],
      ['error', (34 + corr * 100).toFixed(0) + ' %'],
      ['verdict', corr > 0.4 ? 'NOT SAFE' : 'SAFE (assumed)'],
      ['who said so', corr > 0.4 ? 'nobody' : 'we did'],
    ], { x: W - 470, y: H - 262, hot: [2], valueColor: corr > 0.4 ? 'warn' : 'accent' });
    g.restore();

    dsTele(g, d, { id: 'c23', name: 'reckoned', rows: [['estimate', '1.0e30'], ['error', '± 34 %'], ['correction', corr > 0.5 ? '4.1e28' : '—'], ['verdict', corr > 0.4 ? 'UNSAFE' : 'assumed safe']], foot: 'the error was the story' });
    // lyric: the plate's 'sweep' row (the counter, and the number sweeping in) runs from the FLOPs line through
    // this one, but the map's *next* key (73.0) falls inside this shot while the line is still being sung, so
    // 'plate' would flip the treatment mid-sentence. Pinned to the same 'sweep' the map intends for it.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'sweep', line: own, size: 50, y: H * 0.86 });
    dsLife(g, d, { gain: 1.0, dust: 90 });
    dsScanSweep(g, d, { alpha: 0.055, period: 5.0 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.5 + d.kick * 1.1),
      flash: 0.1 * corr * d.snare, flashColor: '255,120,90',
      vignette: 0.22 + corr * 0.08,
    }, dsLifePost(d, { amount: 1.2 })));
  },
});
