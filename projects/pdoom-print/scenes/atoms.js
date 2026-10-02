// "I feel my atoms rearranging": a person made of the letters H-U-M-A-N. On "atoms" the letters start to fidget,
// hopping a cell this way and that; on "rearranging" every one of them takes off and flies across the page to
// a new place — and they settle as a paperclip, struck in red. (It will come back.)
MV.scene('atoms', {
  init() {
    const cx = W / 2, cy = 470;
    const A = PP.cellsOf(m => PP.person(m, cx, 800, 650, { pose: 'stand' }), 'HUMAN', { th: 0.3 });
    const clip = [];      // a paperclip's centre line: three straights and three bends
    const seg = (x0, y0, x1, y1) => { for (let i = 0; i <= 30; i++) clip.push([lerp(x0, x1, i / 30), lerp(y0, y1, i / 30)]); };
    const arc = (x, y, r, a0, a1) => { for (let i = 0; i <= 30; i++) { const a = lerp(a0, a1, i / 30); clip.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } };
    seg(cx - 120, cy + 240, cx - 120, cy - 200); arc(cx - 10, cy - 200, 110, Math.PI, TAU); seg(cx + 100, cy - 200, cx + 100, cy + 280);
    arc(cx + 10, cy + 280, 90, 0, Math.PI); seg(cx - 80, cy + 280, cx - 80, cy - 140); arc(cx - 15, cy - 140, 65, Math.PI, TAU); seg(cx + 50, cy - 140, cx + 50, cy + 170);
    const B = PP.cellsOf(m => { m.lineWidth = 26; m.lineCap = 'round'; m.lineJoin = 'round'; m.beginPath(); clip.forEach((p, i) => (i ? m.lineTo(...p) : m.moveTo(...p))); m.stroke(); }, 'X', { th: 0.3 });
    const byPos = (a, b) => a.r - b.r || a.c - b.c;
    A.sort(byPos); B.sort(byPos);
    this.pairs = B.map((q, i) => ({ to: q, from: A[Math.floor(i * A.length / B.length)], i }));
    this.A = A; this.S = prSheet({ pic: false });
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('atoms rearranging'), tAt = ln.words[3].start, tRe = ln.words[4].start;
    PP.header(S, f, f.params.page);
    const fid = clamp((tq - tAt) / 0.8);
    if (tq < tRe) {
      for (const [i, q] of this.A.entries()) {
        const j = fid > 0 && hash(i, f.tick) < fid * 0.6 ? 1 : 0;
        S.put(q.c + j * Math.round((hash(i, f.tick, 1) - 0.5) * 2.4), q.r + j * Math.round((hash(i, f.tick, 2) - 0.5) * 2), q.ch, { now: true });
      }
    } else {
      for (const p of this.pairs) {
        const st = tRe + (p.i / this.pairs.length) * 0.35, u = ease.inOutCubic(clamp((tq - st) / 0.45));
        const arc = Math.sin(u * Math.PI) * (hash(p.i, 4) - 0.5) * 30;
        const c = lerp(p.from.c, p.to.c, u) + arc, r = lerp(p.from.r, p.to.r, u) - Math.sin(u * Math.PI) * 4;
        S.put(Math.round(c), Math.round(r), p.from.ch, { now: true, red: u > 0.98, strike: u > 0.98 ? 2 : 1 });
      }
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['ATOMS', 'REARRANGING'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.88, 0.96, f.p) }, seed: f.tick });
    return { shake: 2 * f.a.kick + 6 * fid * f.a.hat };
  },
});
