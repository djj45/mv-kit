// "I hear the basilisk boom": a serpent slides in across the page, its body lettered ROKO'S BASILISK along its
// length, one red eye. On "boom" the eye flashes and a ring of characters blows out from its head.
MV.scene('basilisk', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('basilisk'), tBas = ln.words[3].start, tBoom = ln.words[4].start;
    PP.header(S, f, f.params.page);
    // the body: a travelling wave; the head runs in from the left by "basilisk" and coils a little after
    const headX = lerp(-150, 1560, ease.outCubic(clamp((tq - f.from) / (tBas - f.from + 0.4))));
    const yAt = x => 430 + 170 * Math.sin(x * 0.0075 - tq * 3.2) * clamp((headX - x) / 500 + 0.3);
    const pts = []; for (let x = headX; x > headX - 1900; x -= 12) pts.push([x, yAt(x)]);
    const width = i => lerp(92, 14, Math.pow(i / pts.length, 0.8));
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) { c.strokeStyle = '#000'; c.lineWidth = width(i) + 12; c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...pts[i]); c.stroke(); }
    for (let i = 1; i < pts.length; i++) { c.strokeStyle = '#9a9a9a'; c.lineWidth = width(i); c.beginPath(); c.moveTo(...pts[i - 1]); c.lineTo(...pts[i]); c.stroke(); }
    // the head: a wedge pointing along the body, a red eye, a forked tongue
    const [hx, hy] = pts[0], [nx, ny] = pts[2], a = Math.atan2(hy - ny, hx - nx);
    c.save(); c.translate(hx, hy); c.rotate(a);
    c.fillStyle = '#000'; c.beginPath(); c.moveTo(-30, -70); c.quadraticCurveTo(120, -50, 150, 0); c.quadraticCurveTo(120, 50, -30, 70); c.closePath(); c.fill();
    const flash = pulse(tq, tBoom, 0.4);
    c.fillStyle = '#ff0000'; c.beginPath(); c.arc(60, -22, 16 + 14 * flash, 0, TAU); c.fill();
    c.strokeStyle = '#ff0000'; c.lineWidth = 6; c.beginPath(); c.moveTo(150, 0); c.lineTo(215, 0); c.lineTo(240, -18); c.moveTo(215, 0); c.lineTo(240, 18); c.stroke();
    c.restore();
    // lettering along the body (text grid, one character per cell of length)
    const txt = "ROKO'S BASILISK ";
    let acc = 0, k = 0;
    for (let i = 8; i < pts.length; i++) {
      acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc < S.tcw * 1.15) continue; acc = 0;
      const [cc, rr] = S.tcell(...pts[i]); if (cc < 1 || rr < 3 || rr > 32) { k++; continue; }
      const ch = txt[k++ % txt.length]; if (ch !== ' ') S.put(cc, rr, ch, { strike: 2, knock: true, now: true });
    }
    // boom: a ring of characters blowing out from the head
    if (tq >= tBoom) {
      const rr = (tq - tBoom) * 1700, n = 90;
      for (let i = 0; i < n; i++) {
        const an = (i / n) * TAU, [cc, r2] = S.tcell(hx + Math.cos(an) * rr, hy + Math.sin(an) * rr * 0.55);
        if (r2 > 2 && r2 < 34) S.put(cc, r2, 'oO0@'[Math.min(3, Math.floor((tq - tBoom) * 6))], { red: true, now: true });
      }
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['BASILISK', 'BOOM'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: 0.9 + 0.04 * f.p }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 22 * pulse(t, tBoom, 0.3), flash: 0.3 * pulse(t, tBoom, 0.12) };
  },
});
