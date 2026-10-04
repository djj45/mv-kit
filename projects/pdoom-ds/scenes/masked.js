// masked — 41 (127.92–129.82) · rose · paid for by "From masked pre-training days".
// Masked pre-training: a grid of token cells with half of them taken out. The holes are not black — there is a
// light behind the mask, and it comes through the holes as beams, which is the only thing in the frame at full
// gain. The beams are not pins pointing at the lens: they are shafts raking out of the holes, so the mask is a
// thing light is coming *through*. The token rain behind everything falls visibly, the light behind the mask
// rolls, and the cells go out row by row on the beat.
MV.scene('masked', {
  init() {
    const COLS = 12, ROWS = 6, CW = 0.52, CHH = 0.52;
    this.COLS = COLS; this.ROWS = ROWS;
    this.rain = MX.rain(1500, { w: 10, spread: 7.2, h: 8.4, len: 1.5, seed: 77 });
    // which cells survive the mask, and which become holes. 50 %, fixed once.
    this.holes = []; this.vis = [];
    const rnd = mulberry32(50505);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = (c - (COLS - 1) / 2) * CW * 1.15, y = (r - (ROWS - 1) / 2) * CHH * 1.28;
      (rnd() < 0.5 ? this.holes : this.vis).push([x, y]);
    }
    // the cell frames: hairline boxes, and for a hole nothing inside it
    const box = (x, y, b) => LG.seg([[x - CW / 2, y - CHH / 2, 0], [x + CW / 2, y - CHH / 2, 0], [x + CW / 2, y + CHH / 2, 0], [x - CW / 2, y + CHH / 2, 0]], { closed: true, bright: b });
    this.holeFrames = LG.join.apply(null, this.holes.map(p => box(p[0], p[1], 0.5)));
    this.visFrames = LG.join.apply(null, this.vis.map(p => box(p[0], p[1], 0.9)));
    // the tokens in the visible cells: a small clump each, so a live cell looks like a token and a hole looks empty
    const kp = [], r2 = mulberry32(606);
    for (const [x, y] of this.vis) for (let i = 0; i < 26; i++) kp.push([x + (r2() - 0.5) * CW * 0.8, y + (r2() - 0.5) * CHH * 0.8, (r2() - 0.5) * 0.1]);
    this.tokens = new Float32Array(kp.length * 3);
    kp.forEach((p, i) => { this.tokens[i * 3] = p[0]; this.tokens[i * 3 + 1] = p[1]; this.tokens[i * 3 + 2] = p[2]; });
    this.tokenN = kp.length;
    // the light behind the mask, in four slabs: it rolls across the frame instead of hanging there
    const bg = LG.ball(3200, 7, { seed: 88 });
    this.behind = new Float32Array(bg.length);
    for (let i = 0; i < bg.length; i += 3) { this.behind[i] = bg[i] * 1.1; this.behind[i + 1] = bg[i + 1] * 0.75; this.behind[i + 2] = -2.9 + bg[i + 2] * 0.15; }
    const per = Math.ceil(bg.length / 3 / 4);
    this.slabs = [];
    for (let s = 0; s < 4; s++) {
      const a = new Float32Array(per * 3);
      for (let i = 0; i < per; i++) { const j = s * per + i; if (j * 3 + 2 >= bg.length) break; a[i * 3] = this.behind[j * 3]; a[i * 3 + 1] = this.behind[j * 3 + 1]; a[i * 3 + 2] = this.behind[j * 3 + 2]; }
      this.slabs.push(a);
    }
    this.beamPts = new Float32Array(this.holes.length * 3);
    const beams = [];
    this.holes.forEach(([x, y], i) => {
      this.beamPts[i * 3] = x; this.beamPts[i * 3 + 1] = y; this.beamPts[i * 3 + 2] = 0.4;
      // a shaft raking out of the hole toward the lens, not a pin pointing straight at it
      beams.push([[x - 0.62, y + 0.92, -2.9], [x + 0.62, y - 0.92, 1.9]]);
    });
    this.beams = LG.pairs(beams, { bright: 0.8 });
    this.dust = LG.ball(1800, 9, { seed: 171 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const beats = Math.max(0, d.beat - d.audio.beatAt(d.from));
    const open = clamp((beats - 0.2) / 2.6);                   // the mask is applied row by row, on the beat
    const lit = clamp(open) * this.ROWS;
    const holesOn = Math.round((lit / this.ROWS) * this.holes.length);
    const visOn = Math.round((lit / this.ROWS) * this.vis.length);
    const press = 0.7 + 0.5 * d.kick;                           // the light behind breathes on the kick

    const cam = dsCam(d, {
      yaw: 0.08 + lt * 0.06 + Math.sin(lt * 0.2) * 0.05, pitch: 0.03,
      dist: lerp(8.2, 7.0, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.03, seed: 71,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.15, size: 1.0, dof: 34, count: 800 }),
      // the token rain behind the mask: the input, still falling
      { S: this.rain, o: { width: 1, gain: 0.3, color: 'dim', glow: 0.1, fog: 12, model: { pos: [Math.sin(lt * 0.9) * 0.1, -beats * 1.05, -1.2] } } },
      // the light behind the mask, in four slabs rolling across it
      ...this.slabs.map((P, i) => ({ P, o: { size: 1.1, gain: 0.4 * press * open * (0.6 + 0.4 * Math.sin(lt * 3.4 - i * 0.8)), color: 'fg', dof: 26 } })),
      { S: this.beams, o: { width: 1, gain: 0.5, color: 'accent', glow: 0.4, upto: holesOn / this.holes.length } },
      { S: this.holeFrames, o: { width: 1, gain: 0.5, color: 'dim', glow: 0.2, upto: holesOn / this.holes.length } },
      { S: this.visFrames, o: { width: 1, gain: 0.55, color: 'accent', glow: 0.22, upto: visOn / Math.max(1, this.vis.length) } },
      { P: this.tokens, o: { size: 1.4, gain: 0.5, color: 'accent', count: Math.round(this.tokenN * (visOn / Math.max(1, this.vis.length))), dof: 9, focus: 7.9, twinkle: 0.4, t: d.t } },
      // the one thing at full gain: the light where a token should have been
      { P: this.beamPts, o: { size: 2.6 + d.kick * 1.4, gain: 1.0, color: 'hot', dof: 5, count: holesOn, blur: 1.2 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.55 + d.kick * 0.3, exposure: 0.86, ca: 0.5 + d.kick * 0.35, radius: 0.5 } });

    dsTele(g, d, {
      id: 'c41', name: 'masked',
      rows: [
        ['mask', '50 %'],
        ['visible', TL.num(Math.round(this.tokenN * (visOn / Math.max(1, this.vis.length))))],
        ['holes', String(holesOn).padStart(2, '0') + ' / ' + this.holes.length],
        ['throughput', (0.42 + 0.5 * open).toFixed(2)],
        ['predict', open > 0.85 ? 'ALL' : 'SOME'],
      ],
      foot: 'from masked pre-training days',
    });
    TL.stamp(g, d, 'MASKED CELLS ARE NOT DARK — THE LIGHT IS BEHIND THEM', 110, 320, { color: 'dim', size: 13 });
    TL.gauge(g, d, 110, 356, 320, open, { label: 'MASK APPLIED', color: 'accent' });
    dsLine(g, String(holesOn).padStart(2, '0'), 1452, 320, { font: dsSans(46, 200), size: 46, color: dsTone(d, 'hot', 0.9), glow: 14, align: 'left', track: 2 });
    TL.stamp(g, d, 'HOLES IN THE MASK', 1452, 352, { color: 'dim', size: 12 });
    dsTick(g, d, { x: W - 150, y: H - 70, label: 'TOK', rate: 211, alpha: 0.5 });

    // the plate gives this line 'cloud'; overridden to 'carve': this shot's whole subject is absence — half the
    // tokens are holes and the light passes through them, so the sentence is cut out of the light as a hole too.
    LY.draw(g, d, { mode: 'carve', size: 62, y: H - 250, pad: 30 });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.14, period: 1.9 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.5 + 0.8 * d.kick, 72), vignette: 0.26, grain: 0.04 }, dsLifePost(d, { amount: 1.4 })));
  },
});
