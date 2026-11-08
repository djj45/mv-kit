// focus-insert: the caption stays on the screen layer while the camera follows the marker.
MV.scene('focus', {
  render(g, f) {
    RD.paper(g);
    const a = -1 + f.lt * 0.75, cx = 1120, cy = 530, r = 190;
    for (const radius of [100, r, 280]) {
      g.beginPath(); g.arc(cx, cy, radius, 0, TAU); g.strokeStyle = RD.dim; g.lineWidth = 3; g.stroke();
    }
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    RD.disc(g, x, y, 22); MV.focus(x, y, 'marker');
    RD.label('04 / FOLLOW THE DETAIL', 'The marker stays in view; the caption stays on screen');
  },
});
