// "NVDA to the moon": a printer's candlestick chart that will not fit on the page. The candles print left to right
// and climb; the camera climbs the paper with them, up past the top of the page, to a moon made of '@'.
// The lyric rides on a slip.
MV.scene('moon', {
  init() {
    const S = (this.S = prSheet({ pic: false, h: H * 2.2, oy: -H * 1.2 }));
    this.base = S.trows - 6;                                         // the chart's floor (text rows of this sheet)
    const R = mulberry32(3), n = 52; this.candles = [];
    let p = 2;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), target = 2 + 88 * Math.pow(u, 3.2);
      const o = p, cl = target + (R() - 0.35) * 3; p = cl;
      this.candles.push({ o, c: cl, hi: Math.max(o, cl) + R() * 2, lo: Math.min(o, cl) - R() * 2 });
    }
    this.moon = PP.cellsOf(m => { m.beginPath(); m.arc(1500, 200, 150, 0, TAU); m.fill(); m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(1440, 165, 130, 0, TAU); m.fill(); }, '@', { th: 0.3 });
    this.slip = prSheet({ pic: false });
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, ln = f.lyrics.get('NVDA'), tMoon = ln.words[3].start, base = this.base, n = this.candles.length;
    const prog = clamp((t - f.from) / (tMoon - f.from)), shown = Math.floor(ease.inQuad(prog) * n * 0.25 + prog * n * 0.75);
    S.put(6, base + 2, '+' + '-'.repeat(116), { ink: 0.85 }); S.put(8, base + 3, 'NVDA   1 BAR = 1 WEEK   SCALE: WHO CARES', { ink: 0.8 });
    let top = base;
    for (let i = 0; i < Math.min(n, shown); i++) {
      const k = this.candles[i], col = 10 + i * 2, row = v => Math.round(base - v);
      for (let r = row(k.hi); r <= row(k.lo); r++) S.put(col, r, '|', { ink: 0.8, now: true });
      for (let r = row(Math.max(k.o, k.c)); r <= row(Math.min(k.o, k.c)); r++) S.put(col, r, k.c >= k.o ? '#' : '=', { red: i > n * 0.75, now: true, strike: i > n * 0.75 ? 2 : 1 });
      top = Math.min(top, row(k.hi));
    }
    if (t >= tMoon - 0.15) for (const q of this.moon) S.put(q.c, q.r, q.ch, { now: true, strike: 2, red: t >= tMoon });
    if (t >= tMoon) S.put(84, 3, '<- YOU ARE HERE', { red: true, now: true });
    // the camera climbs with the newest candle (paper y of a text row = oy + row * tch)
    const yTop = S.oy + top * S.tch, camY = Math.min(H / 2 + 60, yTop + 200), land = ease.inOutCubic(clamp((t - tMoon + 0.25) / 0.5));
    prPrint(g, S, { cam: { x: W / 2 + 50 * prog, y: lerp(camY, S.oy + 360, land), z: 0.9 }, seed: 1 });
    const L = this.slip.clear();
    PP.lyric(L, f, ln, 66, 37, { x: 3, align: 'center', red: ['MOON'], width: 124 });
    const drop = PP.drop(t, ln.words[0].start); if (drop < 1) prSlip(g, L, [420, 37 * L.tch - 22 + 260 * drop, W - 840, 3 * L.tch + 44], { rot: -0.01, seed: 2 });
    return { shake: 2 * f.a.kick + 8 * pulse(t, tMoon, 0.2) };
  },
});
