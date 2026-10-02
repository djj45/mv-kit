// "The Omega Point's coming soon": one-point perspective. Frames rush out of the vanishing point towards us and
// the rays run in to it; at the point itself an omega, growing as the line goes on, struck red on "soon".
MV.scene('omega', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('Omega Point'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    const vx = W / 2, vy = 420, fw = 900, fh = 380;
    c.strokeStyle = '#000'; c.lineWidth = 3;
    for (const [x, y] of [[-200, 40], [W + 200, 40], [-200, 820], [W + 200, 820], [vx, -100], [vx, 900], [-300, vy], [W + 300, vy]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(vx, vy); c.stroke(); }
    const speed = 0.9 + 1.6 * clamp((tq - w[3]) / 0.5);
    for (let k = 0; k < 9; k++) {
      const z = ((k + ((tq - f.from) * speed) % 1) / 9), s = Math.pow(z, 2.2) * 2.2;
      if (s < 0.02) continue;
      c.lineWidth = 2 + 3 * z; c.strokeRect(vx - fw * s, vy - fh * s, fw * 2 * s, fh * 2 * s);
    }
    // the omega: a horseshoe on two feet
    const om = lerp(30, 150, ease.inOutQuad(clamp((tq - w[1]) / (w[4] - w[1])))), red = tq >= w[4];
    c.clearRect(vx - om * 1.6, vy - om * 1.5, om * 3.2, om * 2.6); c.fillStyle = '#fff'; c.fillRect(vx - om * 1.6, vy - om * 1.5, om * 3.2, om * 2.6);
    c.strokeStyle = red ? '#ff0000' : '#000'; c.lineWidth = om * 0.28; c.lineCap = 'butt';
    c.beginPath(); c.arc(vx, vy - om * 0.25, om, Math.PI * 0.72, Math.PI * 2.28); c.stroke();
    c.beginPath(); c.moveTo(vx - om * 1.35, vy + om * 0.8); c.lineTo(vx - om * 0.6, vy + om * 0.8); c.moveTo(vx + om * 0.6, vy + om * 0.8); c.lineTo(vx + om * 1.35, vy + om * 0.8); c.stroke();
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['OMEGA', 'SOON'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.9, 1.0, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick, flash: 0.2 * pulse(t, w[4], 0.12) };
  },
});
