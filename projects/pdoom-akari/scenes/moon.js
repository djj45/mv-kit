// S25 moon — the huge moon (C8): one candle-chart line climbs from the skyline and breaks onto it; snap zoom on "moon".
MV.scene('moon', akStill({
  art: 'C8', day: true,
  cam: f => { const m = f.lyrics.findWords('moon')[0].start, k = prog(f.t, m - 0.05, m + 0.12, ease.outExpo); return { x: lerp(0.5, AK_SPOT.C8.moon[0], k), y: lerp(0.5, AK_SPOT.C8.moon[1], k), z: lerp(1.03, 1.7, k) }; },
  fx(g, f, map) {
    const [mu, mv] = AK_SPOT.C8.moon, sky = AK_SPOT.C8.skyline, R = mulberry32(25), n = 26, k = prog(f.t, f.from, f.lyrics.findWords('moon')[0].start + 0.05, ease.inQuad);
    const pts = []; let v = sky;
    for (let i = 0; i <= n; i++) { const s = i / n, target = lerp(sky, mv, Math.pow(s, 2.2)); v = target + (R() - 0.5) * 0.03 * (1 - s); pts.push(map(lerp(0.08, mu, s), v)); }
    const m = Math.max(1, Math.floor(k * n));
    pts.slice(0, m + 1).forEach(([x, y], i) => { if (!i) return; const [px, py] = pts[i - 1], up = y < py; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = up ? `rgba(${AK.sig},0.6)` : 'rgba(255,248,238,0.35)'; g.fillRect(x - 6, Math.min(y, py), 12, Math.abs(y - py) + 2); g.restore(); });
    akGlowPath(g, gg => { gg.beginPath(); pts.slice(0, m + 1).forEach(([x, y], i) => (i ? gg.lineTo(x, y) : gg.moveTo(x, y))); }, 2.4, 1);
    const tip = pts[m]; akDot(g, tip[0], tip[1], 6, 1, f.tick);
  },
  ly: { style: 'slant', x: 960, y: 930, size: 92 },
}));
