// S28 meeting — daylight memory, cold and overexposed (C11): everyone nods; a big tick is drawn on the whiteboard
// on "safe"; her raised hand at the end of the table, a sweat drop, nobody looks.
MV.scene('meeting', akStill({
  art: 'C11',
  clip: 'C11v',   // the still until the clip is generated and packed
  prep: { grade: { tint: '#E8F0FF', amt: 0.3, expo: 1.12, sat: 0.6, lift: '#ffffff', liftAmt: 0.18 }, glow: 0.5, thresh: 0.6 },
  cam: [[0, { x: 0.45, z: 1.04 }], [1, { x: 0.55, z: 1.1 }, ease.inOutQuad]],
  snap: { shots: [{ x: 0.45, z: 1.04 }, { x: 0.53, y: 0.36, z: 1.45 }] },   // 动感: in to her raised hand and face (the whiteboard stays in frame)
  fx(g, f, map) {
    const [u, v, w, h] = AK_SPOT.C11.board, [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h), safe = f.lyrics.findWords('safe')[0].start;
    const k = prog(f.t, safe, safe + 0.35, ease.outCubic), a = [x0 + (x1 - x0) * 0.2, y0 + (y1 - y0) * 0.55], b = [x0 + (x1 - x0) * 0.42, y0 + (y1 - y0) * 0.8], c = [x0 + (x1 - x0) * 0.85, y0 + (y1 - y0) * 0.15];
    const pts = k < 0.3 ? [a, [lerp(a[0], b[0], k / 0.3), lerp(a[1], b[1], k / 0.3)]] : [a, b, [lerp(b[0], c[0], (k - 0.3) / 0.7), lerp(b[1], c[1], (k - 0.3) / 0.7)]];
    if (k > 0) brush(g, pts.length > 2 ? pts : pts, 14, '#1d3c8a', 'flat');
    const [hx, hy] = map(...AK_SPOT.C11.hand), d = prog(f.lt, 1.5, 3.5, ease.inQuad);
    const ks = map.scale / 0.78;   // the drop is sized with the framing, so it stays at her temple wide or close
    g.save(); g.fillStyle = 'rgba(200,232,255,0.95)'; g.strokeStyle = '#2a3550'; g.lineWidth = 3 * ks; g.beginPath(); g.ellipse(hx + 95 * ks, hy + 10 * ks + d * 60 * ks, 12 * ks, 20 * ks, 0, 0, TAU); g.fill(); g.stroke(); g.restore();
    sfx(g, 'うんうん', W * 0.8, H * 0.5, 90, -0.1, f.t, f.lyrics.findWords('enough,')[0].start, { font: ILL.F.display, stroke: '#fffaf0', fill: '#1d3c8a' });
  },
  ly: { style: 'verse', x: 140, y: 930, color: '#F4F7FF', stroke: '#1d2a4a', hot: ['safe'] },
}));
