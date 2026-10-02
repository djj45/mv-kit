// S44 gpu — the data-centre campus from the air (F4): lights come on row after row; a counter runs to 100,000.
MV.scene('gpu', akStill({
  art: 'F4',
  cam: [[0, { z: 1.04 }], [1, { z: 1.12, x: 0.52 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [u, v, w, h] = AK_SPOT.F4.campus, rows = 14, cols = 40, k = prog(f.lt, 0.1, f.dur * 0.85);
    if (!akArt('F4').isPlaceholder) {   // the picture's own lamps and windows turn orange, from the front rows to the horizon
      const pts = akLights('F4', 600, [0, 0.35, 1, 1]).slice().sort((a, b) => b.v - a.v);
      pts.forEach((p, i) => { const on = clamp(k * pts.length - i); if (on <= 0) return; const [x, y] = map(p.u, p.v); akDot(g, x, y, 2.2 + 2 * p.v, on, f.tick, i); });
      return this.counter(g, k);
    }
    for (let j = 0; j < rows; j++) {
      const on = clamp(k * rows - j); if (on <= 0) break;
      for (let i = 0; i < cols; i++) { if (i / cols > on) break; const [x, y] = map(u + w * (i + 0.5) / cols + (j % 2) * 0.004, v + h * (j + 0.5) / rows); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(${AK.sig},0.85)`; g.fillRect(x - 5, y - 2, 10, 4); g.restore(); }
    }
    this.counter(g, k);
  },
  counter(g, k) {
    akText(g, Math.round(lerp(0, 100000, ease.outCubic(k))).toLocaleString('en-US'), W - 140, 200, { size: 96, align: 'right' });   // top right: the HUD is top left
    akText(g, 'GPU', W - 140, 260, { size: 40, color: AK.paper, align: 'right' });
  },
  ly: { style: 'slant', x: 960, y: 930, size: 88 },
}));
