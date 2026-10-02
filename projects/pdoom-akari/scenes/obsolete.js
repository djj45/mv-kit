// S30 obsolete — the dusty beige computer at the end of the aisle (D2): a caret on its dim screen; on "obsolete"
// the CRT dies — squeezed to a line, then a dot — and dust drifts down.
MV.scene('obsolete', akStill({
  art: 'D2',
  cam: [[0, { x: 0.62, y: 0.4, z: 1.1 }], [1, { x: 0.66, y: 0.38, z: 1.22 }, ease.inOutQuad]],
  snap: { shots: [{ x: 0.62, y: 0.4, z: 1.1 }, { x: 0.74, y: 0.38, z: 1.55 }, { x: 0.3, y: 0.45, z: 1.25 }] },   // 动感: the old screen up close, the light at the end
  fx(g, f, map) {
    const [u, v, w, h] = AK_SPOT.D2.crt, [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const at = f.lyrics.findWords('obsolete')[0].start, a = f.t - at;
    if (a < 0) {
      g.save(); g.fillStyle = 'rgba(90,180,120,0.15)'; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
      akText(g, 'C:\\>', x0 + 24, cy + 14, { size: 44, color: '#d8ffe4', glowColor: '#5fbf80' });
      if (f.beatPhase < 0.5) { g.fillStyle = '#8fe0a8'; g.fillRect(x0 + 130, cy - 20, 22, 36); }
    } else {
      g.save(); g.fillStyle = '#050605'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      const sy = Math.max(0.004, 1 - prog(a, 0, 0.12)), sx = 1 - prog(a, 0.12, 0.3), dot = 1 - prog(a, 0.3, 1.2);
      g.fillStyle = `rgba(220,255,230,${dot})`; g.shadowColor = '#bfffd0'; g.shadowBlur = 20;
      g.fillRect(cx - (x1 - x0) / 2 * Math.max(0.01, sx), cy - (y1 - y0) / 2 * sy, (x1 - x0) * Math.max(0.01, sx), Math.max(3, (y1 - y0) * sy)); g.restore();
    }
    illDust(g, f.t * (a > 0 ? 1 : 0.3), { box: [0, 0, W, H], n: 50, color: '200,210,215', alpha: 0.35, speed: a > 0 ? 3 : 1, seed: 30 });
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ['obsolete'] },
}));
