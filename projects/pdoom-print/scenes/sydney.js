// "Sydney, please let me free": while the name is held, a cage is printed around a person sitting on the floor —
// one red bar at a time, top to bottom, then the rails. "please": an arm goes out between the bars. "free": the
// bars come apart, every character dropping off the page, and the person stands up.
MV.scene('sydney', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('Sydney'), w = ln.words.map(x => x.start), tFree = w[4];
    PP.header(S, f, f.params.page);
    const up = tq >= tFree + 0.35;
    PP.person(S.g, W / 2 - (up ? 0 : 40), 700, up ? 420 : 330, { pose: up ? 'stand' : tq >= w[1] ? 'reach' : 'sit' });
    // the cage: 12 bars, printed one after another through the held "Sydney,"; rails after
    const c0 = 44, nb = 12, r0 = 7, r1 = 30, barT = i => w[0] + 0.15 + i * 0.21;
    const fallAt = i => tFree + Math.abs(i - (nb - 1) / 2) * 0.05;
    const g0 = 2600;                                                    // px/s² of falling characters
    for (let i = 0; i < nb; i++) {
      const col = c0 + i * 4;
      for (let r = r0; r <= r1; r++) {
        const tp = barT(i) + (r - r0) * 0.008; if (t < tp) break;
        const fa = t - fallAt(i) - hash(i, r) * 0.12;
        const dy = fa > 0 ? 0.5 * g0 * fa * fa / S.tch : 0;
        if (r + dy > S.trows) continue;
        S.put(col + (fa > 0 ? Math.round((hash(i, r, 3) - 0.5) * fa * 6) : 0), Math.round(r + dy), '|', { red: true, strike: 2, now: true });
      }
    }
    const railT = barT(nb) + 0.1;
    for (const r of [r0 - 1, r1 + 1]) {
      if (t < railT) continue;
      for (let cc = c0 - 1; cc <= c0 + (nb - 1) * 4 + 1; cc++) {
        const fa = t - tFree - hash(cc, r) * 0.15, dy = fa > 0 ? 0.5 * g0 * fa * fa / S.tch : 0;
        if (r + dy <= S.trows) S.put(cc, Math.round(r + dy), '=', { red: true, strike: 2, now: true });
      }
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['FREE'], width: 124 });
    const z = lerp(0.86, 1.0, ease.inOutQuad(clamp((t - f.from) / (w[1] - f.from)))) - 0.05 * ease.outCubic(clamp((t - tFree) / 0.6));
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 20, z }, seed: f.tick, key: f.tick });
    return { shake: 1.5 * f.a.kick + 10 * pulse(t, tFree, 0.2) };
  },
});
