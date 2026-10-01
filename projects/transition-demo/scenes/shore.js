// Morning at the shore: far hills, a horizon, rows of waves, a small boat.
MV.scene('shore', {
  render(g, f) {
    g.fillStyle = TD.paper; g.fillRect(0, 0, W, H);
    g.beginPath(); g.moveTo(0, 560);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, 560 - 90 * Math.max(0, Math.sin(x / 260) * Math.sin(x / 97 + 1)));
    g.lineTo(W, 600); g.lineTo(0, 600); g.closePath(); g.fillStyle = TD.wash; g.fill();
    g.beginPath(); g.moveTo(0, 600); g.lineTo(W, 600); TD.stroke(g, 3);
    for (let row = 0; row < 6; row++) {
      const y = 660 + row * 70, amp = 10 + row * 4, ph = f.t * (1 + row * 0.2) + row;
      g.beginPath();
      for (let x = 0; x <= W; x += 12) { const yy = y + amp * Math.sin(x / (60 + row * 12) + ph); x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
      TD.stroke(g, 3 + row * 0.6);
    }
    const bx = 1180 + 30 * Math.sin(f.t * 0.7), by = 640 + 6 * Math.sin(f.t * 2);
    g.beginPath(); g.moveTo(bx - 90, by); g.quadraticCurveTo(bx, by + 40, bx + 90, by); g.closePath(); g.fillStyle = TD.pale; g.fill(); TD.stroke(g, 4);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - 120); g.lineTo(bx + 60, by - 20); g.closePath(); TD.stroke(g, 3);
  },
});
