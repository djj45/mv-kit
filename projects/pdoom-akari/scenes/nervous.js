// S04 nervous — chin on hand, biting her sleeve (A4, which has its own sweat drop); nervous squiggles boil beside her head.
MV.scene('nervous', akStill({
  art: 'A4',
  clip: 'A4v',   // the still until the clip is generated and packed
  cam: [[0, { x: 0.5, z: 1.06 }], [1, { x: 0.47, z: 1.1 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [hx, hy] = map(...AK_SPOT.A4.head), s = map.scale * 1.8, tk = f.tick;
    g.save(); g.strokeStyle = 'rgba(30,24,44,0.85)'; g.lineWidth = 6 * s; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {     // ガーン lines: three wobbly strokes, redrawn every drawing
      const bx = hx + (i - 1) * 70 * s; g.beginPath();
      for (let j = 0; j <= 6; j++) { const yy = hy - 140 * s + j * 18 * s, xx = bx + Math.sin(j * 2 + i) * 10 * s + (hash(tk, i, j) - 0.5) * 6 * s; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
      g.stroke();
    }
    g.restore();
  },
  ly: { style: 'verse', x: 1780, y: 930, align: 'right', hot: ['surprise'] },
}));
