// S07 spark_out — front view (A7): the caret leaps out of the screen (frame left) and becomes a spark that floats
// to the empty spot in front of her face — exactly where the picture already lights her from.
MV.scene('spark_out', akStill({
  art: 'A7',
  clip: 'A7v',   // the still until the clip is generated and packed
  cam: [[0, { x: 0.48, z: 1.08 }], [1, { x: 0.46, z: 1.16 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [lx, ly] = map(...AK_SPOT.A7.lit), s = map.scale;
    const k = prog(f.lt, 0.05, 0.9, ease.outCubic), bob = Math.sin(f.t * 3.1) * 10 * s;
    const x = lerp(-60, lx, k), y = lerp(H * 0.62, ly, k) - Math.sin(k * Math.PI) * 160 + bob * k;
    const dx = (lx + 60) * (1 - k) * 0.25, dy = -Math.cos(k * Math.PI) * 60 * (1 - k);
    akSpark(g, x, y, 13, f.t, { vx: dx, vy: dy, seed: 7 });
    illFlare(g, x, y, 380, AK.sig, 0.13 * k);
  },
  ly: { style: 'verse', x: 1780, y: 930, align: 'right', hot: ['servant'] },
}));
