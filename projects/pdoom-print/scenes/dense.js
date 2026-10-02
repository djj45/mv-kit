// "Post-Chinchilla, super-dense": a chinchilla — round, all fur, big ears — the scaling law's mascot. On
// "super-dense" the overstrike runs away: the picture fills in from the middle until the page is solid ink.
MV.scene('dense', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('Post-Chinchilla'), w = ln.words.map(x => x.start), tD = w[1];
    PP.header(S, f, f.params.page);
    const cx = W / 2, cy = 470;
    // the animal: a soft grey body, fur strokes, round ears, an eye, a curled tail
    c.fillStyle = '#888';
    c.beginPath(); c.ellipse(cx, cy + 40, 300, 240, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(cx - 230, cy - 60, 150, 130, 0, 0, TAU); c.fill();
    for (const [ex, ey] of [[cx - 300, cy - 230], [cx - 170, cy - 250]]) { c.beginPath(); c.ellipse(ex, ey, 70, 95, -0.2, 0, TAU); c.fill(); c.fillStyle = '#ddd'; c.beginPath(); c.ellipse(ex, ey + 5, 40, 62, -0.2, 0, TAU); c.fill(); c.fillStyle = '#888'; }
    c.strokeStyle = '#555'; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 90; i++) { const a = hash(i, 1) * TAU, r = 200 + 90 * hash(i, 2), x = cx + Math.cos(a) * r * 1.2, y = cy + 40 + Math.sin(a) * r * 0.95; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 34); c.stroke(); }
    c.lineWidth = 34; c.strokeStyle = '#888'; c.beginPath(); c.moveTo(cx + 280, cy + 120); c.quadraticCurveTo(cx + 480, cy + 60, cx + 420, cy - 140); c.stroke();
    c.fillStyle = '#000'; c.beginPath(); c.arc(cx - 270, cy - 80, 22, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - 277, cy - 87, 7, 0, TAU); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.arc(cx - 372, cy - 40, 12, 0, TAU); c.fill();
    // super-dense: ink floods out from the middle
    const k = ease.inQuad(clamp((tq - tD) / 0.7));
    if (k > 0) { const gr = c.createRadialGradient(cx, cy, 0, cx, cy, 1300 * k + 1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, 860); }
    S.put(8, 4, 'TOKENS PER PARAMETER:', { ink: 0.85 });
    S.put(31, 4, tq < tD ? '20' : String(Math.round(20 * Math.pow(10, (tq - tD) * 4))), { red: tq >= tD, now: true, strike: 2 });
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['SUPER-DENSE'], width: 124, strike: tq >= tD ? 3 : 1 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.9, 1.0, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 10 * k * f.a.hat };
  },
});
