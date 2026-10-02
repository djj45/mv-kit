// "Gato, please don't let me go": the quiet middle of the song, and the emptiest page. A great soft paw comes down
// from the top; a small person hangs from it by both hands over nothing. The two sway together. On "go" the grip
// slips a little — and holds.
MV.scene('gato', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('Gato'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page, { ink: 0.7 });
    const sw = 0.07 * Math.sin((tq - f.from) * 1.4), slip = 34 * ease.outBack(clamp((tq - w[5]) / 0.35));
    c.save(); c.translate(W / 2 - 80, 40); c.rotate(sw);
    // the leg, from the top of the page, and the paw seen from below: a round mitten with a big pad and four beans
    c.strokeStyle = '#000'; c.lineWidth = 7; c.fillStyle = '#fff'; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-120, -60); c.lineTo(-125, 200); c.moveTo(120, -60); c.lineTo(125, 200); c.stroke();
    for (let i = 0; i < 7; i++) { c.lineWidth = 4; const y = 10 + i * 26; c.beginPath(); c.moveTo(-125, y); c.lineTo(-145, y + 14); c.moveTo(125, y + 8); c.lineTo(145, y + 22); c.stroke(); }   // fur tufts
    c.lineWidth = 7; c.beginPath(); c.ellipse(0, 290, 190, 150, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#555';
    c.beginPath(); c.arc(-34, 330, 46, 0, TAU); c.arc(34, 330, 46, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 300, 64, 44, 0, 0, TAU); c.fill();
    [[-128, 252], [-52, 200], [52, 200], [128, 252]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 30, 36, 0, 0, TAU); c.fill(); });
    // the person hanging from the paw
    PP.person(c, 2, 790 + slip, 300, { pose: 'hang' });
    c.restore();
    // depth below: a few dots falling past, slowly
    for (let i = 0; i < 14; i++) {
      const y = ((hash(i, 1) * 800 + (tq - f.from) * 60 * (0.5 + hash(i, 2))) % 760) + 60, [cc, rr] = S.tcell(200 + hash(i, 3) * 1520, y);
      if (rr > 20 && rr < 33) S.put(cc, rr, '.', { ink: 0.5, now: true });
    }
    S.put(8, 4, 'FIG. 27   GATO', { ink: 0.7 }); S.put(8, 5, '(A GENERALIST AGENT)', { ink: 0.6 });
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['GO'], width: 124, strike: 1 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.84, 0.92, f.p) }, seed: f.tick, key: f.tick, ink: 0.92 });
    return { shake: 0 };
  },
});
