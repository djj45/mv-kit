// "Now there's nowhere left to go": a maze printed from the outside in, ring by ring, a dot at its centre. The way
// in is there until "go" — then the last gap closes.
MV.scene('maze', {
  init() {
    this.S = prSheet({ pic: false });
    const rings = 8; this.walls = [];
    for (let k = 0; k < rings; k++) {
      const c0 = 22 + k * 5, c1 = 110 - k * 5, r0 = 3 + k * 2, r1 = 31 - k * 2;
      const gap = Math.floor(hash(k, 3) * 4);                  // which side the opening is on
      this.walls.push({ k, c0, c1, r0, r1, gap, at: hash(k, 9) });
    }
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, ln = f.lyrics.get('nowhere left'), w = ln.words.map(x => x.start), tGo = w[5];
    PP.header(S, f, f.params.page);
    const step = (tGo - f.from - 0.1) / this.walls.length;
    for (const W0 of this.walls) {
      const ti = f.from + 0.05 + W0.k * step; if (t < ti) continue;
      const { c0, c1, r0, r1, gap, at } = W0, closed = t >= tGo + W0.k * 0.03;
      const red = closed;
      const gc = Math.round(lerp(c0 + 3, c1 - 3, at)), gr = Math.round(lerp(r0 + 2, r1 - 2, at));
      for (let c = c0; c <= c1; c++) {
        const top = !(gap === 0 && Math.abs(c - gc) < 2) || closed, bot = !(gap === 2 && Math.abs(c - gc) < 2) || closed;
        if (top) S.put(c, r0, c === c0 || c === c1 ? '+' : '-', { red, now: true });
        if (bot) S.put(c, r1, c === c0 || c === c1 ? '+' : '-', { red, now: true });
      }
      for (let r = r0 + 1; r < r1; r++) {
        const lft = !(gap === 3 && Math.abs(r - gr) < 1) || closed, rgt = !(gap === 1 && Math.abs(r - gr) < 1) || closed;
        if (lft) S.put(c0, r, '|', { red, now: true }); if (rgt) S.put(c1, r, '|', { red, now: true });
      }
    }
    S.put(66, 17, '@', { strike: 3, now: true });
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['NOWHERE', 'GO'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.88, 1.02, ease.inQuad(f.p)) }, seed: f.tick });
    return { shake: 1.5 * f.a.kick + 8 * pulse(t, tGo, 0.2) };
  },
});
