// title_rise — the cold open, 0.9 s: a light in the middle of the frame on the downbeat, a burst of hairlines,
// and the title already printed there. This was the single most static shot in the first cut (measured motion
// 0.06): one point that only grew. Rebuilt so the bar is alive from the first frame — the point is spinning a
// field of points around itself, the hairlines are being drawn on, the type is being written letter by letter,
// and parallax dust is already crossing the lens before anything else exists.
MV.scene('title_rise', {
  init() {
    const list = [];
    for (let i = 0; i < 96; i++) {
      const a = hash(i, 3) * TAU, r0 = 0.02, r1 = 0.06 + hash(i, 9) * 0.34;
      list.push([[Math.cos(a) * r0, Math.sin(a) * r0, hash(i, 4) * 0.02], [Math.cos(a) * r1, Math.sin(a) * r1, hash(i, 5) * 0.02]]);
    }
    this.marks = LG.pairs(list, { bright: 1 });
    // the spark is a small shell, not a dot: it has an inside, so its own rotation reads
    this.spark = LG.sphere(1400, 0.05, { jitter: 0.6, seed: 2 });
    this.field = LG.ball(700, 0.9, { seed: 6 });
    this.chars = [...'AGI'];
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');
    d.g = g;
    const on = dsIn(d, 0.0, 0.10, ease.outExpo);
    const out = dsOut(d, 0.22);
    const grow = dsIn(d, 0.0, 0.75, ease.outCubic);
    const spin = d.lt * (2.4 + d.low * 1.2);                        // the spark turns on the low end

    dsLight(d, [
      { P: this.field, o: { size: 1.0, gain: 0.2 * on * out, color: 'dim', blur: 1.0, drift: 0.25, t: d.t, twinkle: 0.8 } },
      { P: this.spark, o: { size: 2.4, gain: 1.2 * on * out, color: 'hot', blur: 0.5, model: { rot: [d.t * 0.7, spin, d.t * 0.4] }, drift: 0.02, t: d.t } },
      { S: this.marks, o: { width: 1.2, gain: 0.75 * on * out * grow, color: 'accent', glow: 0.6, blur: 0.8, model: { scale: 1 + grow * 2.4, rot: [0, 0, spin * 0.25] } } },
    ], { cam: lmScreen(), end: { bloom: 0.9, ca: 0.35 } });

    g.save();
    const a = on * out;
    dsLife(g, d, { gain: 0.5, dust: 40 });                          // the frame is already alive
    // the title is written on, letter by letter, each with its own glow that then settles
    const chars = this.chars, size = 124, track = 26;
    g.font = dsSans(size, 100); g.textBaseline = 'middle';
    const ws = chars.map(c => g.measureText(c).width), total = ws.reduce((x, y) => x + y, 0) + track * (chars.length - 1);
    let cx = W / 2 - total / 2;
    chars.forEach((c, i) => {
      const k = dsIn(d, 0.04 + i * 0.085, 0.3, ease.outExpo);
      if (k > 0.01) {
        const jy = (1 - k) * 14;
        dsLine(g, c, cx + ws[i] / 2, H * 0.60 + jy, {
          font: dsSans(size, 100), size, color: dsTone(d, 'fg', 0.92 * a), glow: 26 * (0.5 + k), alpha: a * k,
        });
      }
      cx += ws[i] + track;
    });
    const sub = dsIn(d, 0.5, 0.35);
    if (sub > 0.01) {
      dsLine(g, 'A FILM IN CODE · 2026', W / 2, H * 0.60 + 104, {
        font: dsMono(17, 400), size: 17, track: 9, color: dsTone(d, 'dim', 0.9 * a), glow: 0, alpha: a * sub,
      });
    }
    dsScanSweep(g, d, { alpha: 0.10, period: 0.85 });
    dsScanSweep(g, d, { alpha: 0.06, period: 0.42 });
    dsTick(g, d, { x: W - 60, y: H - 50, rate: 311, label: 't+', alpha: 0.6 });
    dsTick(g, d, { x: 300, y: H - 50, rate: 977, label: 'seq', alpha: 0.5 });
    // the ruler draws itself on, tick by tick, rather than appearing
    g.strokeStyle = dsTone(d, 'dim', 0.55 * a); g.lineWidth = 1;
    const m = 44, L = 26 + 120 * grow;
    for (const [bx, by, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      g.beginPath(); g.moveTo(bx, by + sy * L); g.lineTo(bx, by); g.lineTo(bx + sx * L, by); g.stroke();
    }
    for (let i = 0; i < 10; i++) {                                   // and the ticks keep counting up
      const k = dsIn(d, 0.2 + i * 0.055, 0.25);
      if (k <= 0.01) continue;
      const yy = m + (H - 2 * m) * ((i + 1) / 11);
      g.globalAlpha = a * k * 0.5;
      g.beginPath(); g.moveTo(m, yy); g.lineTo(m + 10, yy); g.stroke();
      g.beginPath(); g.moveTo(W - m, yy); g.lineTo(W - m - 10, yy); g.stroke();
    }
    g.restore();

    const life = dsLifePost(d, { amount: 1.4 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.5), vignette: 0.3 }, life));
  },
});
