// "See through the shoggoth's lies": a heaving mass of bubbles and eyes with tentacles underneath, wearing a huge
// smiling mask. On "lies" the mask slips and falls off the bottom of the page; behind it, more eyes, and they all
// turn to look straight out — a few of them in red.
MV.scene('shoggoth', {
  init() {
    this.S = prSheet({ cpi: 15, lpi: 8 });
    const R = mulberry32(77); this.eyes = [];
    for (let i = 0; i < 46; i++) this.eyes.push({ x: 330 + R() * 1260, y: 110 + R() * 560, r: 16 + Math.pow(R(), 2) * 48, ph: R() * TAU });
    this.blobs = []; for (let i = 0; i < 26; i++) this.blobs.push({ x: 300 + R() * 1320, y: 140 + R() * 500, r: 110 + R() * 150, ph: R() * TAU });
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get("shoggoth's lies"), tLies = ln.words[4].start;
    PP.header(S, f, f.params.page);
    // the mass: overlapping lumps, breathing
    c.fillStyle = '#7a7a7a';
    for (const b of this.blobs) { c.beginPath(); c.arc(b.x + 14 * Math.sin(tq * 1.7 + b.ph), b.y + 10 * Math.cos(tq * 1.3 + b.ph), b.r * (1 + 0.06 * Math.sin(tq * 3 + b.ph)), 0, TAU); c.fill(); }
    // tentacles from underneath
    c.strokeStyle = '#2a2a2a'; c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x0 = 380 + i * 145, pts = [];
      for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([x0 + 120 * Math.sin(u * 3 + tq * 2.2 + i) * u, 640 + u * 190]); }
      for (let k = 1; k < pts.length; k++) { c.lineWidth = 46 * (1 - k / 13) + 6; c.beginPath(); c.moveTo(...pts[k - 1]); c.lineTo(...pts[k]); c.stroke(); }
    }
    // eyes: white, outlined, pupils wandering — until the mask is off; then they all look out, some red
    const off = clamp((tq - tLies) / 0.25);
    for (const [i, e] of this.eyes.entries()) {
      const blink = hash(i, Math.floor(tq * 3)) > 0.93;
      c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = Math.max(4, e.r * 0.18);
      c.beginPath(); c.ellipse(e.x, e.y, e.r, blink ? e.r * 0.12 : e.r * 0.8, 0, 0, TAU); c.fill(); c.stroke();
      if (blink) continue;
      const lx = lerp(Math.sin(tq * 1.9 + e.ph) * 0.45, 0, off), ly = lerp(Math.cos(tq * 1.4 + e.ph) * 0.3, 0, off);
      c.fillStyle = off > 0.5 && hash(i, 11) > 0.6 ? '#ff0000' : '#000';
      c.beginPath(); c.arc(e.x + lx * e.r, e.y + ly * e.r * 0.6, e.r * 0.42, 0, TAU); c.fill();
    }
    // the mask: a big smiling disc, slipping off on "lies"
    const fall = ease.inQuad(clamp((tq - tLies) / 0.75)), mx = 860 + 120 * fall, my = 380 + 900 * fall, rot = -0.6 * fall;
    if (fall < 1) {
      c.save(); c.translate(mx, my); c.rotate(rot);
      c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 16;
      c.beginPath(); c.arc(0, 0, 250, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(-85, -60, 26, 40, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(85, -60, 26, 40, 0, 0, TAU); c.fill();
      c.lineWidth = 22; c.lineCap = 'round'; c.beginPath(); c.arc(0, 10, 150, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.lineWidth = 10; c.beginPath(); c.moveTo(-250, 0); c.lineTo(-330, -30); c.moveTo(250, 0); c.lineTo(330, -30); c.stroke();   // the straps
      c.restore();
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['LIES,'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 20, z: lerp(0.9, 0.97, f.p) + 0.03 * pulse(t, tLies, 0.4) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 8 * pulse(t, tLies, 0.2) };
  },
});
