// S02 screen — the terminal, full frame (all code). Training log scrolls; second-to-last line P(doom) = 0.02.
// On "eyes" the caret splits into two dots that look left, right, then at us.
MV.scene('screen', {
  init() {
    const R = mulberry32(5); this.rows = [];
    for (let i = 0; i < 60; i++) {
      const step = 48000 + i * 50, loss = (2.42 - i * 0.0021 + (R() - 0.5) * 0.01).toFixed(4);
      this.rows.push(`step ${step} | loss ${loss} | lr 3.0e-4 | grad ${(0.8 + R() * 0.3).toFixed(2)} | tok/s ${(1.1 + R() * 0.2).toFixed(2)}M`);
    }
  },
  render(g, f) {
    g.fillStyle = '#0A0C11'; g.fillRect(0, 0, W, H);
    const size = 30, lh = 44, x0 = 150, yb = H - 300, scroll = Math.floor(f.tq * 6);
    g.font = `400 ${size}px ${ILL.F.dot}`; g.textBaseline = 'alphabetic';
    for (let i = 0; i < 13; i++) {
      const row = this.rows[(scroll + i) % this.rows.length], y = yb - (13 - i) * lh;
      g.fillStyle = `rgba(200,214,226,${0.18 + 0.5 * i / 13})`; g.fillText(row, x0, y);
    }
    akText(g, 'P(doom) = 0.02', x0, yb, { size });
    // caret → eyes
    const eyesAt = f.lyrics.findWords('eyes')[0].start, k = prog(f.t, eyesAt, eyesAt + 0.25, ease.outBack);
    const cx = x0 + 18, cy = yb + lh - 12;
    if (k <= 0) akCaret(g, x0, yb + lh, size, f.beatPhase < 0.55);
    else {
      const ex = lerp(cx, W / 2, k), ey = lerp(cy, H * 0.42, k), sep = lerp(0, 150, k), look = Math.sin((f.t - eyesAt) * 5) * (1 - prog(f.t, eyesAt + 0.5, eyesAt + 0.7));
      for (const s of [-1, 1]) akDot(g, ex + s * sep / 2 + look * 40, ey, lerp(10, 22, k), 1, f.tick, s);
    }
    // scanlines + glass
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    illLeak(g, 't', 0.08, '140,170,210', 0.7);
    akLy(g, f, { style: 'verse', x: 150, y: H - 130, hot: ['sparks', 'AGI'] });
    return { vignette: 0.45 };
  },
});
