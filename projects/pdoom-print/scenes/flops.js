// "One E thirty FLOPs a second": 1E30 in BANNER letters, a character for each word ("One" 1, "E" E, "thirty" 30);
// then the number written out — thirty zeros typed on the word FLOPs — and through the rest of the line the page
// fills with zeros, row after row, faster and faster, the last rows in red.
MV.scene('flops', {
  init() { this.S = prSheet({ pic: false }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, ln = f.lyrics.get('One E thirty'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    if (t >= w[0]) S.banner('1', 30, 3, { h: 11, strike: 2 });
    if (t >= w[1]) S.banner('E', 48, 3, { h: 11, strike: 2 });
    if (t >= w[2]) S.banner('30', 68, 3, { h: 11, strike: 2, red: true });
    const num = '1' + ',000'.repeat(10);
    if (t >= w[3]) PP.type(S, f, 66 - num.length, 17, num, w[3], { x: 2, dt: 0.009, strike: 2 });
    if (t >= w[3] + 0.2) PP.type(S, f, 98, 20, 'FLOP/S', w[3] + 0.2, { dt: 0.03, red: true });
    // a second's worth: rows of zeros, each row faster than the last
    const t0 = w[5] + 0.25, rows = 11;
    for (let r = 0; r < rows; r++) {
      const tr = t0 + 1.7 * (1 - Math.pow(0.82, r)) / (1 - Math.pow(0.82, rows)) * 0.95; if (t < tr) break;
      PP.type(S, f, 6, 22 + r, '0'.repeat(S.tcols - 12), tr, { chain: true, dur: 0.1, red: r >= rows - 3, ink: 0.85 });
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['FLOPS'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.88, 0.97, ease.inQuad(f.p)) }, seed: f.tick });
    return { shake: 2.5 * f.a.kick, flash: 0.15 * pulse(t, w[2], 0.1) };
  },
});
