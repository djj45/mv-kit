// "'cause the future goes FOOM": the plotting head draws an exponential — flat, flat, then straight up off the top
// of the page. On "FOOM" the word lands as red BANNER letters, struck three times, and blows apart: every character
// flies outward from the middle, hopping cell to cell.
MV.scene('foom', {
  init() {
    const T = prSheet({ pic: false });
    T.banner('FOOM', 66, 7, { h: 13, align: 'center', track: 1.2 });
    this.cells = T.cells(); this.S = prSheet({ pic: false });
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('the future goes'), tF = ln.words[4].start;
    PP.header(S, f, f.params.page);
    // exponential plot
    const x0 = 14, x1 = 118, y0 = 4, y1 = 30;
    for (let r = y0; r <= y1; r++) S.put(x0 - 1, r, (r - y0) % 5 === 0 ? '+' : '|', { ink: 0.85 });
    S.put(x0 - 1, y1 + 1, '+' + '-'.repeat(x1 - x0 + 1), { ink: 0.85 });
    S.put(x0 - 1, y0 - 2, 'CAPABILITY', { ink: 0.9 }); S.put(x1 - 3, y1 + 2, 'TIME', { ink: 0.9 });
    const tA = f.from + 0.05, tB = tF - 0.08, K = 7.5;
    for (let c = x0; c <= x1; c++) {
      const u = (c - x0) / (x1 - x0), tc = lerp(tA, tB, Math.pow(u, 0.8)); if (t < tc) break;
      const r = Math.round(y1 - (Math.exp(K * u) - 1) / (Math.exp(K) - 1) * (y1 - y0) * 1.6);
      if (r >= y0 - 1) S.put(c, r, '*', { now: true, red: r < y0 + 6 });
      if (r < y0 - 1) { for (let rr = y0 - 1; rr <= Math.min(y1, r + 30); rr++) if (rr >= 0) S.put(c, rr, '*', { now: true, red: true }); break; }
    }
    // FOOM: lands, holds a beat, then flies apart (positions are a function of the time since it landed)
    if (t >= tF) {
      const age = Math.max(0, tq - tF - 0.16), cx = 66, cy = 13;
      for (const [i, q] of this.cells.entries()) {
        let c = q.c, r = q.r;
        if (age > 0) {
          const dx = (q.c - cx) * 0.6, dy = q.r - cy, d = Math.hypot(dx, dy) + 0.5, sp = 26 + 50 * hash(i, 4);
          c = q.c + (dx / d) * sp * age / 0.6 + (hash(i, 5) - 0.5) * 6 * age; r = q.r + (dy / d) * sp * age * 0.45 + 22 * age * age;
        }
        S.put(Math.round(c), Math.round(r), age > 0.25 && hash(i, 6) > 0.6 ? '*' : q.ch, { red: true, strike: 3, now: true });
      }
    }
    PP.lyric(S, f, ln, 66, 35, { x: 3, align: 'center', red: ['FOOM'], width: 120 });
    const hit = pulse(t, tF, 0.3);
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 20, z: lerp(0.9, 1.0, ease.inQuad(clamp((t - f.from) / (tF - f.from)))) - 0.06 * ease.outCubic(clamp((t - tF) / 0.5)), rot: 0.01 * hit * Math.sin(t * 50) }, seed: 3 });
    return { shake: 2.5 * f.a.kick + 26 * hit, flash: 0.35 * pulse(t, tF, 0.12) };
  },
});
