// The hook, four times: "I'm upping my P(doom)". The same page every time — a BANNER separator page with P(DOOM)
// in block letters made of their own characters, the dial, and a histogram of sampled futures — and every time it
// is printed harder: params.n = 1..4 (1 black, 2 red DOOM + double strike, 3 the quiet one in the breakdown, printed
// slowly and faint, 4 all red, triple strike, the page shaking).
MV.scene('pdoom', {
  init() { this.S = prSheet({ pic: false }); },
  render(g, f) {
    const S = this.S.clear(), n = f.params.n || 1, t = f.t, ln = f.lyrics.get("upping my P(doom)", n - 1);
    const quiet = n === 3, all = n === 4, strike = quiet ? 1 : Math.min(3, n);
    PP.header(S, f, f.params.page);
    // the banner prints top to bottom from the first word
    const t0 = ln.words[0].start, lps = quiet ? 14 : 34;
    const ink = quiet ? 0.78 : 1;
    const bannerRow = 4;
    S.banner('P(DOOM)', 66, bannerRow, { h: 9, strike, ink, align: 'center', track: 0.6, red: i => all || (n >= 2 && i >= 2) });
    // the dial: the value rolls on the word P(doom)
    const v = PP.pdoom(t), vs = PP.fmt(v);
    S.put(14, 16, 'P(DOOM) =', { x: 2, ink });
    S.put(36, 15, vs, { x: 3, red: n >= 2 || v > 0.5, strike: Math.max(1, strike - 1), ink });
    const bw = 64, filled = Math.round(bw * v);
    S.put(54, 16, '[' + '#'.repeat(filled) + '.'.repeat(bw - filled) + ']', { ink, red: all, strike: all ? 2 : 1 });
    S.put(54, 17, '0' + ' '.repeat(bw / 2 - 1) + '.5' + ' '.repeat(bw / 2 - 2) + '1', { ink: 0.7 });
    // histogram of sampled futures, printed the way a 1970s stats package would: columns of '#'
    const tq = f.tq, mu = PP.pdoom(tq), sd = 0.15 - 0.04 * (n - 1) / 3, nb = 50, c0 = 16, base = 31, hmax = 11;
    for (let i = 0; i < nb; i++) {
      const xm = (i + 0.5) / nb, dens = Math.exp(-0.5 * Math.pow((xm - mu) / sd, 2)) * (0.86 + 0.14 * hash(i, f.tick % 3, n));
      const hh = Math.round(hmax * dens * clamp((tq - t0) / 0.45));
      for (let r = 0; r < hh; r++) S.put(c0 + i * 2, base - r, '##', { red: xm > 0.5, ink, strike: xm > 0.5 && n >= 2 ? 2 : 1 });
    }
    S.put(c0 - 1, base + 1, '+' + '-'.repeat(nb * 2) + '+', { ink: 0.85 });
    S.put(c0, base + 2, 'FINE', { ink: 0.8 }); S.put(c0 + nb * 2 - 4, base + 2, 'DOOM', { ink: 0.9, red: true });
    S.put(c0 + nb - 1, base + 2, '.5', { ink: 0.8 });
    // the lyric
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['P(DOOM)'], strike: all ? 2 : 1 });
    if (all) for (let r = 41; r < 44; r++) S.put(6, r, '!'.repeat(S.tcols - 12), { red: true, ink: clamp((t - ln.words[3].start) * 3) });
    S.reveal = PP.reveal(S, t, Math.min(t0 - 0.12, f.from), lps); S.revealText = true;
    const z = lerp(0.9, 0.97, ease.outQuad(f.p)) + (all ? 0.02 * f.a.kick : 0);
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z, rot: all ? 0.006 * Math.sin(f.t * 40) * f.a.kick : 0 }, seed: f.tick });
    return { shake: quiet ? 0 : PP.judder(f, n / 2), flash: n >= 2 ? 0.25 * pulse(t, ln.words[3].start, 0.12) : 0 };
  },
});
