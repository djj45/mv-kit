// S05 loss — over her shoulder (A2): in the blank monitor a loss curve creeps right, calm, while the words come in.
// (S06 drop picks the same curve up and drops it.) akLossCurve is shared with drop.js.
function akLossCurve(g, rect, t, o = {}) {
  const [x, y, w, h] = rect, n = 160, head = o.head ?? 1, fall = o.fall ?? 0;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = 'rgba(8,10,16,0.92)'; g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(180,200,220,0.14)'; g.lineWidth = 1;
  for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x, y + h * i / 5); g.lineTo(x + w, y + h * i / 5); g.stroke(); }
  g.fillStyle = 'rgba(200,214,226,0.55)'; g.font = `400 ${Math.round(h * 0.06)}px ${ILL.F.dot}`; g.fillText('train/loss', x + w * 0.03, y + h * 0.09);
  const pts = [];
  for (let i = 0; i <= n * head; i++) {
    const s = i / n, base = 0.3 + 0.08 * Math.exp(-s * 3) + 0.012 * noise1(s * 40, 2) + 0.006 * noise1(s * 140, 3);
    const drop = s > 0.82 ? fall * ease.inCubic(clamp((s - 0.82) / 0.18)) * 0.62 : 0;
    pts.push([x + w * (0.04 + 0.92 * s), y + h * (base + drop)]);
  }
  if (pts.length > 1) akGlowPath(g, gg => { gg.beginPath(); pts.forEach(([px, py], i) => (i ? gg.lineTo(px, py) : gg.moveTo(px, py))); }, Math.max(1.4, w / 500), 1);
  if (pts.length) { const p = pts[pts.length - 1]; akDot(g, p[0], p[1], Math.max(3, w / 180), 1, tick(t)); }
  g.restore();
}
MV.scene('loss', akStill({
  art: 'A2',
  clip: 'A2v',   // the still until the clip is generated and packed
  cam: [[0, { x: 0.6, y: 0.45, z: 1.05 }], [1, { x: 0.64, y: 0.43, z: 1.16 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [u, v, w, h] = AK_SPOT.A2.screen, [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h);
    akLossCurve(g, [x0, y0, x1 - x0, y1 - y0], f.t, { head: lerp(0.62, 0.8, f.p) });
  },
  ly: { style: 'verse', x: 140, y: 930 },
}));
