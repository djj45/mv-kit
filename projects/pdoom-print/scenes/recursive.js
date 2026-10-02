// "To recursive self-upgrade": the page has a smaller copy of itself printed in the middle, which has a smaller
// copy of itself … and we keep falling into it. Each copy is a newer version: v1, v2, v3 … The zoom happens in the
// picture, so the print stays the same size while the frames rush past.
MV.scene('recursive', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('recursive self-upgrade'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    const r = 0.42, rate = 1.6 + 2.2 * clamp((tq - w[2]) / 0.8), ph = (tq - f.from) * rate, lvl0 = Math.floor(ph), fr = ph - lvl0;
    const cx = W / 2, cy = 430, base = 820 * Math.pow(1 / r, fr);
    c.save(); c.beginPath(); c.rect(0, 70, W, 760); c.clip();
    for (let l = 0; l < 8; l++) {
      const s = base * Math.pow(r, l); if (s < 14) break;
      const wpx = s * 1.9, hpx = s, x0 = cx - wpx / 2, y0 = cy - hpx / 2, red = (lvl0 + l) % 4 === 0;
      c.strokeStyle = red ? '#ff0000' : '#000'; c.lineWidth = Math.max(3, s * 0.014); c.strokeRect(x0, y0, wpx, hpx);
      // the page inside: a header rule and lines of 'text' around the hole where the next copy sits
      c.fillStyle = '#6a6a6a'; c.fillRect(x0 + wpx * 0.05, y0 + hpx * 0.07, wpx * 0.9, Math.max(2, hpx * 0.035));
      for (let j = 0; j < 4; j++) { const yy = y0 + hpx * (0.18 + j * 0.05); c.fillRect(x0 + wpx * 0.05, yy, wpx * (0.5 + 0.35 * hash(l + lvl0, j)), Math.max(1.5, hpx * 0.018)); }
      for (let j = 0; j < 3; j++) { const yy = y0 + hpx * (0.82 + j * 0.05); c.fillRect(x0 + wpx * 0.05, yy, wpx * (0.4 + 0.5 * hash(l + lvl0, j + 9)), Math.max(1.5, hpx * 0.018)); }
    }
    c.restore();
    const v = lvl0 + 1;
    S.put(8, 4, 'SELF-UPGRADE', { x: 2, now: true }); S.put(8, 6, `VERSION ${v}.0`, { x: 3, red: true, strike: 2, now: true });
    S.put(8, 10, `PARAMS  ${(Math.pow(10, 12 + v * 0.7)).toExponential(1).toUpperCase()}`, { ink: 0.85, now: true });
    S.knock(6, 3, 52, 11);
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['SELF-UPGRADE'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: 0.92 }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick };
  },
});
