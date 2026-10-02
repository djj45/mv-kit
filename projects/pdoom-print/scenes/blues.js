// "Orthogonality thesis blues": two axes at right angles, INTELLIGENCE up, GOALS across, and minds scattered evenly
// over the whole plane — any amount of one goes with any of the other. One red cross far up in a strange corner:
// PAPERCLIPS. Then the build: a progress bar fills along the bottom, faster and faster, and the page starts to shake.
MV.scene('blues', {
  init() { this.S = prSheet({ pic: false }); const R = mulberry32(31); this.pts = [...Array(140)].map(() => [R(), R()]); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('Orthogonality'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    const x0 = 20, x1 = 116, y0 = 4, y1 = 28;
    for (let r = y0; r <= y1; r++) S.put(x0, r, r === y0 ? '^' : '|');
    S.put(x0, y1 + 1, '+' + '-'.repeat(x1 - x0 - 1) + '>');
    S.put(x0 - 15, y0, 'INTELLIGENCE', { ink: 0.9 }); S.put(x1 - 5, y1 + 2, 'GOALS', { ink: 0.9 });
    this.pts.forEach(([u, v], i) => {
      const ti = w[0] + (i / this.pts.length) * 1.4; if (t < ti) return;
      S.put(Math.round(lerp(x0 + 2, x1 - 2, u)), Math.round(lerp(y1 - 1, y0 + 1, v)), 'o', { ink: 0.75, now: true });
    });
    if (t >= w[2]) { S.put(x1 - 14, y0 + 2, 'X', { red: true, strike: 3, now: true }); PP.type(S, f, x1 - 12, y0 + 2, '<- PAPERCLIPS', w[2] + 0.1, { red: true }); }
    // the build into the drop: a bar along the bottom, filling ever faster from the end of the line
    const b0 = w[2] + 1.0, b1 = f.to, k = clamp((t - b0) / (b1 - b0));
    if (k > 0) {
      const n = Math.round(Math.pow(k, 2.2) * (S.tcols - 20));
      S.put(8, 32, 'LOADING  [' + '='.repeat(n) + '>' + ' '.repeat(Math.max(0, S.tcols - 20 - n)) + ']', { red: k > 0.8, now: true });
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['BLUES'], width: 124 });
    const shake = k > 0 ? 2 + 10 * k * k : 0;
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10 + 60 * k * k, z: lerp(0.88, 0.95, f.p) + 0.1 * k * k, tilt: 0.35 * k * k * k }, seed: f.tick });
    return { shake: 1.5 * f.a.kick + shake * f.a.hat };
  },
});
