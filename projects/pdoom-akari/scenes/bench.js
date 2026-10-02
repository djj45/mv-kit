// S18 bench — blue hour on the roof edge (C1), canned coffee, a flat calm curve on the laptop. The quietest moment.
MV.scene('bench', akStill({
  art: 'C1',
  clip: 'C1v',   // the still until the clip is generated and packed
  cam: [[0, { x: 0.46, z: 1.03 }], [1, { x: 0.5, z: 1.12 }, ease.inOutSine || ease.inOutQuad]],
  groove: 0.4,   // the quietest moment of the film: it barely rides the beat
  fx(g, f, map) {
    const [lx, ly] = map(...AK_SPOT.C1.laptop), s = map.scale;
    const w = 210 * s, h = 90 * s, x0 = lx - w / 2, y0 = ly - h;
    akGlowPath(g, gg => { gg.beginPath(); for (let i = 0; i <= 40; i++) { const x = x0 + w * i / 40, y = y0 + h * 0.55 + Math.sin(i * 0.7 + f.tq * 2) * 2 * s; i ? gg.lineTo(x, y) : gg.moveTo(x, y); } }, 1.1, 0.8);
    illBokeh(g, f.t, { box: [0, H * 0.45, W, H * 0.4], n: 12, r: 46, colors: ['255,211,138', '243,238,221'], alpha: 0.1 });
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ['stable'] },
}));
