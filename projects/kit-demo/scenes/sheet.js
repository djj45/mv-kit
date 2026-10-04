// sheet — a spec table done with kits/layout.js (BOX.table + BOX.cell: no hand-written x / y for text in boxes),
// a pulsing marker reported with MV.focus, and the timeline's `insert` punching in on it and following it.
MV.scene('sheet', {
  render(g, f) {
    D.paperBg(g);
    // a part on the sheet: a ring whose marker orbits; the marker is what the eye follows
    const cx = 1240, cy = 470, R = 210, a = -1.2 + f.lt * 0.9;
    g.strokeStyle = D.ink; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.strokeStyle = D.ink3; g.lineWidth = 1.2; g.setLineDash([10, 8]); g.beginPath(); g.arc(cx, cy, R * 0.62, 0, TAU); g.stroke(); g.setLineDash([]);
    const mx = cx + R * Math.cos(a), my = cy + R * Math.sin(a);
    g.fillStyle = D.red; g.beginPath(); g.arc(mx, my, 12 + 6 * f.a.kick, 0, TAU); g.fill();
    MV.focus(mx, my, 'marker');
    // the spec table: every value goes through BOX.cell, which shrinks and centres it in its row
    const T = BOX.table(g, 150, 640, 2, 4, { cw: [200, 340], rh: 44, color: D.ink2 });
    const rows = [['PART NO.', 'RING-01'], ['MATERIAL', 'STEEL / PAPER'], ['QTY', '1 — SPARE 0'], ['TOLERANCE', '±0 EVERYWHERE, ALWAYS, NO EXCEPTIONS']];
    rows.forEach((r, i) => {
      BOX.cell(g, T, 0, i, r[0], { size: 13, color: D.ink2, font: D.mono });
      BOX.cell(g, T, 1, i, r[1], { size: 18, color: i === 3 ? D.red : D.ink, font: D.mono });
    });
    // the lyric goes on the screen layer (MV.overlay): drawn after the camera, so the insert can punch in hard on the
    // marker while the line stays put. On the scene canvas it would need MV.keep, and the insert could only creep.
    MV.overlay(o => D.line(o, f, { x: 960, y: 210, size: 64, maxW: 1000, align: 'center' }));   // whispered: small
  },
});
