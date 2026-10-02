// S24 basilisk — the TV tower in a thunderhead (C7): a snake of light points spirals up it; on "boom" two eyes
// open at its head and the lightning goes.
MV.scene('basilisk', akStill({
  art: 'C7',
  clip: 'C7v',   // the still until the clip is generated and packed
  cam: [[0, { y: 0.6, z: 1.1 }], [1, { y: 0.4, z: 1.04 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [u, top, bottom] = AK_SPOT.C7.tower, boom = f.lyrics.findWords('boom')[0].start, head = prog(f.t, f.from, boom, ease.inOutQuad);
    const n = 160;
    for (let i = 0; i < n; i++) {
      const s = i / n, v = lerp(bottom, top, head * (0.35 + 0.65 * s)), ang = s * 14 + f.t * 2, x = u + Math.cos(ang) * 0.05 * (1 - s * 0.4), depth = Math.sin(ang);
      const [px, py] = map(x, v);
      akDot(g, px, py, 2 + 3 * s, (0.35 + 0.65 * s) * (depth > -0.2 ? 1 : 0.35), f.tick, i);
    }
    if (f.t >= boom) {
      const ang = 14 + f.t * 2, [hx, hy] = map(u + Math.cos(ang) * 0.03, lerp(bottom, top, head));
      const k = prog(f.t, boom, boom + 0.15, ease.outBack);
      for (const sd of [-1, 1]) { g.save(); g.translate(hx + sd * 22, hy - 6); g.scale(1, k); akDot(g, 0, 0, 7, 1, f.tick, sd); g.restore(); }
      if (f.t < boom + 0.25) { const R = mulberry32(f.tick); g.save(); g.strokeStyle = 'rgba(240,244,255,0.95)'; g.lineWidth = 4; g.shadowColor = '#cfe0ff'; g.shadowBlur = 20; g.beginPath(); let x = W * 0.78, y = 0; g.moveTo(x, y); while (y < H * 0.75) { x += (R() - 0.5) * 120; y += 40 + R() * 60; g.lineTo(x, y); } g.stroke(); g.restore(); }
    }
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ['basilisk', 'boom'] },
  post(f) { const b = f.lyrics.findWords('boom')[0].start; return { flash: 0.55 * pulse(f.t, b, 0.2), flashColor: '220,232,255', shake: f.t > b ? 10 * (1 - prog(f.t, b, b + 0.4)) : 0 }; },
}));
