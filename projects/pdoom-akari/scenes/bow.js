// S08 bow — chibi insert (A6): she bows ninety degrees to the spark; a line-drawn crown pops onto it. ははーっ
MV.scene('bow', akStill({
  art: 'A6', day: true,
  clip: 'A6v',   // the still until the clip is generated and packed
  cam: [[0, { z: 1.0 }], [1, { z: 1.04 }]],
  fx(g, f, map) {
    const [rx, ry] = map(...AK_SPOT.A6.right), bob = Math.sin(f.t * 4) * 8;
    akSpark(g, rx, ry + bob, 15, f.t, { seed: 3 });
    const k = prog(f.lt, 0.35, 0.55, ease.outBack), cy = ry + bob - 40 - 30 * k;
    if (k > 0) akGlowPath(g, gg => { const w = 46 * k; gg.beginPath(); gg.moveTo(rx - w, cy + 18); gg.lineTo(rx - w, cy - 14); gg.lineTo(rx - w / 2, cy + 4); gg.lineTo(rx, cy - 26); gg.lineTo(rx + w / 2, cy + 4); gg.lineTo(rx + w, cy - 14); gg.lineTo(rx + w, cy + 18); gg.closePath(); }, 2.2, 1);
    sfx(g, 'ははーっ', W * 0.3, H * 0.2, 120, -0.08, f.t, f.from + 0.15, { font: ILL.F.display, stroke: '#fffaf0', fill: '#15121F' });
  },
  ly: { style: 'verse', x: 960, y: 940, align: 'center', hot: ['boss'] },
}));
