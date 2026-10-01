// The moon over a night sky, clouds drifting across it. anchors: moon (the disc, drifting slowly).
MV.scene('moon', {
  centre(f) { return [960 + 40 * f.p, 520 - 20 * f.p, 300]; },
  anchors(f) { const [x, y, r] = this.centre(f); return { moon: [x - r, y - r, 2 * r, 2 * r] }; },
  render(g, f) {
    g.fillStyle = TD.night; g.fillRect(0, 0, W, H);
    const [x, y, r] = this.centre(f);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = TD.paper; g.fill(); TD.stroke(g, 6);
    g.beginPath(); g.arc(x, y, r - 26, 0, TAU); TD.stroke(g, 2, 'rgba(30,58,138,0.4)');
    // cloud curls: each a row of loops, drifting right
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 610 + f.t * 45) % (W + 600)) - 300, cy = 200 + i * 210;
      g.beginPath();
      for (let j = 0; j < 4; j++) { const ox = cx + j * 70; g.moveTo(ox + 40, cy); g.arc(ox, cy, 40, 0, Math.PI, true); }
      g.moveTo(cx - 40, cy); g.lineTo(cx + 250, cy); TD.stroke(g, 4);
    }
  },
});
