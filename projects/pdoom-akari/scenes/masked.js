// S48 masked — a memory of her first day (G1), overexposed; parts of the picture are covered by dot-font [MASK]
// blocks that come off one by one.
MV.scene('masked', akStill({
  art: 'G1',
  clip: 'G1v',   // the still until the clip is generated and packed
  prep: { grade: { tint: '#FFF6E8', amt: 0.2, expo: 1.1, lift: '#ffffff', liftAmt: 0.2, sat: 0.8 }, glow: 0.55, thresh: 0.55 },
  cam: [[0, { z: 1.04 }], [1, { z: 1.1 }, ease.inOutQuad]],
  fx(g, f) {
    const R = mulberry32(48), n = 9;
    for (let i = 0; i < n; i++) {
      const x = 160 + R() * (W - 520), y = 120 + R() * (H - 420), w = 180 + R() * 220, h = 90 + R() * 90, off = f.from + 0.25 + i * (f.dur - 0.5) / n;
      if (f.t >= off) continue;
      g.fillStyle = 'rgba(21,18,31,0.92)'; g.fillRect(x, y, w, h);
      akText(g, '[MASK]', x + w / 2, y + h / 2, { size: 34, align: 'center', base: 'middle' });
    }
  },
  ly: { style: 'verse', x: 140, y: 930, color: AK.paper, hot: ['masked'] },
}));
