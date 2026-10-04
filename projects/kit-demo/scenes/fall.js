// fall — a line that keeps falling. CAM.keep(points) gives the scale that keeps its tip inside the frame, so the
// pull-back is exactly as fast as the fall and never finishes: the cut comes while it is still going.
MV.scene('fall', {
  init() {
    this.v = []; for (let i = 0; i <= 400; i++) { const u = i / 400; this.v.push(u < 0.18 ? 0.02 * noise1(u * 40, 3) : (u - 0.18) * 2.6 + 0.04 * noise1(u * 30, 5)); }
  },
  render(g, f) {
    D.paperBg(g);
    const AX = 200, AY = 300, SX = 1500, SY = 900;                   // world: x 0..1 → AX..AX+SX, value → AY + v·SY
    const upto = clamp(0.1 + 0.95 * f.p), n = Math.max(2, Math.round(400 * upto));
    const P = []; for (let i = 0; i <= n; i++) P.push([AX + SX * i / 400, AY + SY * this.v[i]]);
    const tip = P[P.length - 1];
    const s = CAM.keep([tip], { anchor: [AX, AY], safe: [0, 0, W - 140, H - 160] });
    g.save(); g.translate(AX, AY); g.scale(s, s); g.translate(-AX, -AY);
    g.strokeStyle = D.ink3; g.lineWidth = 1 / s;
    for (let k = 0; k <= 10; k++) { g.beginPath(); g.moveTo(AX, AY + k * 200); g.lineTo(AX + SX, AY + k * 200); g.stroke(); }
    g.strokeStyle = D.red; g.lineWidth = 6 / s; g.lineJoin = 'round';
    g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    g.restore();
    const tx = AX + (tip[0] - AX) * s, ty = AY + (tip[1] - AY) * s;   // where the tip landed on screen
    g.fillStyle = D.ink; g.beginPath(); g.arc(tx, ty, 10, 0, TAU); g.fill();
    MV.focus(tx, ty, 'pen tip');
    D.line(g, f, { x: 140, y: 250, size: 190, maxW: 1640 });   // the drop: as big as it fits
  },
});
