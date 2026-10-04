// no_cdr — 85.00–89.28, ember with the turn in `warn`. "Without a single CDR": a receding landscape of hairline
// checkboxes and not one check in any of them. Screen space with a hand-rolled perspective, so every box is exactly
// where I put it. On the word "CDR" a check starts drawing in the one box in the foreground and stops halfway, in
// `warn`. One thing at full gain: that box.
//
// It measured 0.34 — the landscape was a photograph of a landscape. Now two survey lines walk the field in opposite
// directions and light every box they cross, one box a beat TRIES to be checked and fails (the flicker travels
// through the field), the air moves, and the whole shot carries the house activity layer.
MV.scene('no_cdr', {
  init() {
    this.boxes = [];
    for (let r = 0; r < 5; r++) {
      const s = 0.42 + 0.2 * r, y = 300 + r * 128, half = 58 * s, sp = 150 * s;
      for (let c = 0; c < 9; c++) {
        this.boxes.push({ x: W / 2 + (c - 4) * sp, y, half, hero: r === 4 && c === 4, r, c });
      }
    }
    const n = this.boxes.length;
    this.seg = new Float32Array(n * 4 * 8);          // 4 sides per box, brightness rewritten per frame
    for (let i = 0; i < n; i++) {
      const b = this.boxes[i], k = i * 32, h = b.half;
      const put = (o, ax, ay, bx, by) => { this.seg[k + o] = ax; this.seg[k + o + 1] = ay; this.seg[k + o + 3] = bx; this.seg[k + o + 4] = by; this.seg[k + o + 7] = 3; };
      put(0, b.x - h, b.y - h, b.x + h, b.y - h);
      put(8, b.x + h, b.y - h, b.x + h, b.y + h);
      put(16, b.x + h, b.y + h, b.x - h, b.y + h);
      put(24, b.x - h, b.y + h, b.x - h, b.y - h);
    }
    // the check that never gets finished: two strokes, drawn in order so `upto` can stop it halfway
    const hb = this.boxes.filter((b) => b.hero)[0], hh = hb.half;
    this.check = new Float32Array(16);
    this.check.set([hb.x - hh * 0.5, hb.y + hh * 0.05, 0, hb.x - hh * 0.15, hb.y + hh * 0.42, 0, 0.9, 3], 0);
    this.check.set([hb.x - hh * 0.15, hb.y + hh * 0.42, 0, hb.x + hh * 0.55, hb.y - hh * 0.45, 0, 0.9, 3], 8);
    // the two survey lines themselves, as bright hairlines across the whole field, rewritten every frame
    this.sweepSeg = new Float32Array(2 * 8);
    this.air = new Float32Array(600 * 3), rnd = mulberry32(61);
    for (let i = 0; i < 600; i++) { this.air[i * 3] = rnd() * W; this.air[i * 3 + 1] = 220 + rnd() * 760; this.air[i * 3 + 2] = 0; }
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.5, ease.outCubic) * dsOut(d, 0.28);
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('CDR') === 0) wi = i;
    const cdr = wi >= 0 ? prog(t, ws[wi].start, ws[wi].start + 1.1, ease.outCubic) : 0;
    // two survey lines walking the field in opposite directions, both of them forever, both drawn as the bright
    // hairline that is doing the surveying (not just the boxes it lights up)
    const sweepA = 200 + ((d.lt * 210) % 640);
    const sweepB = 960 - ((d.lt * 145 + 320) % 640);
    const sw = this.sweepSeg;
    sw[0] = 120; sw[1] = sweepA; sw[3] = W - 120; sw[4] = sweepA; sw[6] = 0.9; sw[7] = 0;
    sw[8 + 0] = 120; sw[8 + 1] = sweepB; sw[8 + 3] = W - 120; sw[8 + 4] = sweepB; sw[8 + 6] = 0.7; sw[8 + 7] = 0;
    // one box a beat tries to be checked and fails: the flicker travels through the landscape
    const tickN = Math.floor(d.lt * 1.7), tickAge = (d.lt * 1.7) % 1;
    const tickBox = (tickN * 17 + 5) % this.boxes.length;

    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i], k = i * 32;
      const nearA = clamp(1 - Math.abs(b.y - sweepA) / 260), nearB = clamp(1 - Math.abs(b.y - sweepB) / 260);
      let v = (0.2 + 0.75 * nearA + 0.6 * nearB) * (b.hero ? 2.0 + cdr * 0.6 : 0.55 + 0.45 * b.r / 4);
      if (i === tickBox) v += 2.2 * (1 - tickAge);            // the check that almost happens
      for (let s = 0; s < 4; s++) this.seg[k + s * 8 + 6] = v;
    }

    dsLight(d, [
      // the air drifts across the field, so even the empty space between the boxes is moving
      { P: this.air, o: { size: 1.0, gain: 0.22 * a, color: 'dim', blur: 1.4, drift: 30, t } },
      { S: this.seg, o: { width: 1.2, gain: 0.85 * a, color: 'fg', glow: 0.3, blur: 0.6, model: { pos: [0, -d.lt * 7, 0] } } },
      { S: this.sweepSeg, o: { width: 1.5, gain: 0.9 * a, color: 'hot', glow: 0.6, blur: 0.4 } },
      { S: this.check, o: { width: 1.8, gain: 0.95 * a * (cdr > 0 ? 1 : 0), color: 'warn', glow: 0.6, blur: 0.5, upto: 0.5 + 0.06 * cdr } },
    ], { cam: lmScreen(), end: { bloom: 0.5 + 0.15 * cdr + d.kick * 0.35, exposure: 0.85 + d.kick * 0.05, ca: 0.4 } });

    g.save();
    g.globalAlpha = a;
    dsLine(g, 'CDR', 150, 214, { font: dsSans(88, 200), size: 88, track: 10, color: dsTone(d, cdr > 0.3 ? 'warn' : 'fg', 0.95), glow: 22, align: 'left' });
    if (cdr > 0) {
      g.strokeStyle = dsTone(d, 'warn', 0.9); g.lineWidth = 4;
      g.beginPath(); g.moveTo(146, 210); g.lineTo(146 + 200 * cdr, 210); g.stroke();
    }
    TL.stamp(g, d, 'COHERENT DISASTER RECOVERY', 152, 268, { size: 14, track: 4 });
    TL.stamp(g, d, cdr > 0.4 ? 'not fitted · not required · not possible' : 'status: assumed available', 152, 296, { size: 13, track: 2, color: cdr > 0.4 ? 'warn' : 'dim', alpha: 0.85 });
    TL.block(g, d, [
      ['checks', '0 / 45'],
      ['cdr', cdr > 0.2 ? 'MISSING' : '…'],
      ['fallback', 'none'],
      ['survey', Math.round(sweepA) + ' / ' + Math.round(sweepB)],
    ], { x: W - 470, y: 330, hot: [1] });
    g.restore();

    dsTele(g, d, { id: 'c27', name: 'cdr', rows: [['boxes', '45'], ['checks', '0'], ['sweep', Math.round(sweepA) + ' px'], ['verdict', cdr > 0.3 ? 'NO' : 'assumed YES']], foot: 'a landscape of checks that are not there' });
    // lyric: the plate gives this line 'carve' — without a single CDR, carved, because it is a missing thing: the
    // sentence is cut out of the light under a field of boxes with nothing in them. Pinned line, mode off the plate.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 62, x: W * 0.5, y: H * 0.88 });
    dsLife(g, d, { gain: 1.0, dust: 100 });
    dsScanSweep(g, d, { alpha: 0.055, period: 5.4 });
    dsTick(g, d, { x: 620, y: 976, label: 'CHECKS', value: 0, rate: 1 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.6 + d.kick * 1.2), flash: 0.035 * d.snare * a, vignette: 0.26 }, dsLifePost(d, { amount: 1.4 })));
  },
});
