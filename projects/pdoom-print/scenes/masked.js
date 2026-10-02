// "From masked pre-training days": a page of the text it learned from, the old game — hide a word, guess it.
// Words are struck out one by one into red blocks, faster and faster, until almost nothing is left to read.
MV.scene('masked', {
  init() {
    this.S = prSheet({ pic: false });
    const txt = 'IN THE EARLY DAYS IT READ EVERYTHING WE EVER WROTE DOWN. IT WAS SHOWN A SENTENCE WITH ONE WORD HIDDEN AND ASKED ' +
      'TO GUESS THE WORD. IT GUESSED, AND WAS CORRECTED, A TRILLION TIMES OVER. NOBODY THOUGHT THE GUESSING WOULD EVER BE ' +
      'ANYTHING MORE THAN A GAME. WE TAUGHT IT TO FILL IN THE BLANKS. IT LEARNED WHICH BLANKS WE LEFT.';
    const words = txt.split(' '), lines = [[]]; let len = 0;
    for (const wd of words) { if (len + wd.length + 1 > 56) { lines.push([]); len = 0; } lines[lines.length - 1].push({ wd, at: len }); len += wd.length + 1; }
    this.items = []; lines.forEach((l, r) => l.forEach(it => this.items.push({ ...it, r, k: this.items.length })));
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, ln = f.lyrics.get('masked pre-training'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    S.put(8, 3, 'TRAINING CORPUS  -  SHARD 000001 OF 9,999,999', { ink: 0.8 });
    const n = this.items.length, tm0 = w[1], tm1 = w[3] + 0.3;
    for (const it of this.items) {
      const order = hash(it.k, 5), tm = tm0 + Math.pow(order, 0.7) * (tm1 - tm0) * (it.wd === 'GAME.' ? 2 : 1);
      const masked = t >= tm && it.k % 13 !== 4;
      const word = masked ? (it.wd.length > 5 && hash(it.k, 6) > 0.6 ? '[MASK]'.padEnd(it.wd.length, '#') : '#'.repeat(it.wd.replace(/[.,]$/, '').length) + (/[.,]$/.test(it.wd) ? it.wd.slice(-1) : '')) : it.wd;
      S.put(8 + it.at * 2, 6 + it.r * 3, word, { xw: 2, xh: 2, red: masked, strike: masked ? 2 : 1, now: true });
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['MASKED'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.9, 0.95, f.p) }, seed: f.tick });
    return { shake: 2 * f.a.kick };
  },
});
