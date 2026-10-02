// "as paperclips fill the room": the paperclip from "atoms" comes back. One, then two, then four … doubling on
// every eighth note until they cover the page, all struck in red, the page a red tangle by "room".
MV.scene('clips', {
  init() {
    this.S = prSheet({ cpi: 15, lpi: 8 });
    const R = mulberry32(12); this.spots = [];
    for (let i = 0; i < 300; i++) this.spots.push({ x: 120 + R() * 1680, y: 90 + R() * 740, a: R() * TAU, s: 0.8 + 0.5 * R() });
    // the first one sits in the middle
    this.spots[0] = { x: W / 2, y: 430, a: -0.5, s: 1.6 };
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('paperclips'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    const n = tq < w[1] ? 0 : Math.min(this.spots.length, Math.floor(Math.pow(2, (tq - w[1]) / (30 / f.audio.bpm))));
    const clip = (x, y, a, s) => {
      c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
      c.strokeStyle = '#ff0000'; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-30, 18); c.lineTo(52, 18); c.arc(52, 0, 18, Math.PI / 2, -Math.PI / 2, true); c.lineTo(-50, -18);
      c.arc(-50, -4, 14, -Math.PI / 2, Math.PI / 2, true); c.lineTo(40, 10); c.arc(40, 0, 10, Math.PI / 2, -Math.PI / 2, true); c.lineTo(-20, -10); c.stroke();
      c.restore();
    };
    for (let i = 0; i < Math.max(n, tq >= w[1] ? 1 : 0); i++) { const p = this.spots[i]; clip(p.x, p.y, p.a, p.s * (i === 0 ? 2.2 : 1.3)); }
    if (n >= 1) S.put(8, 4, `PAPERCLIPS: ${n}`, { red: true, now: true, strike: 2 });
    if (n >= 1) S.put(8, 5, `UTILITY: +${(n * 1.0).toFixed(1)}`, { now: true, ink: 0.8 });
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['PAPERCLIPS'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.9, 0.96, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 1.5 * f.a.kick };
  },
});
