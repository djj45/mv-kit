// S35 paperclips — a dark office buried in paperclips (E3), and more falling like snow, each catching orange light.
function akClip(g, x, y, s, rot, a) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = a; g.lineWidth = 1.6 / s * s; g.strokeStyle = '#AEB4BC'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-6, 10); g.lineTo(-6, -10); g.arc(0, -10, 6, Math.PI, 0); g.lineTo(6, 12); g.arc(1, 12, 5, 0, Math.PI); g.lineTo(-4, -6); g.arc(-1, -6, 3, Math.PI, 0); g.lineTo(2, 8); g.stroke();
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${AK.sig},0.6)`; g.beginPath(); g.arc(0, -10, 6, Math.PI * 1.2, Math.PI * 1.7); g.stroke(); g.restore();
}
function akClipSnow(g, t, n, seed = 35, alpha = 1) {
  const R = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    const x0 = R() * W, sp = 120 + R() * 220, ph = R() * 20, s = 1.4 + R() * 2.2, y = ((t + ph) * sp) % (H + 80) - 40, x = x0 + Math.sin(t * (0.6 + R()) + ph) * 30;
    akClip(g, x, y, s, t * (R() - 0.5) * 3 + ph, alpha * (0.5 + 0.5 * R()));
  }
}
MV.scene('paperclips', akStill({
  art: 'E3',
  cam: [[0, { z: 1.05 }], [1, { z: 1.12, y: 0.55 }, ease.inOutQuad]],
  fx(g, f) { akClipSnow(g, f.t, 90, 35, prog(f.lt, 0, 0.4)); },
  ly: { style: 'quiet', x: 960, y: 960, size: 58, track: 6 },
}));
