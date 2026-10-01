// S10 chuiyan — L16–L17, still inside the picture. The camera slides along his bank (as if the vase were turning):
// white walls, dark tiles; the chimneys send up 炊烟, drawn like the incense, drifting out over the river.
// L17: we pull back; the river widens row by row and the far shore sinks away — she is a small figure under
// her peony tree, very far off.
const QS10 = {};
MV.scene('chuiyan', {
  init(MV) { QS10.L = pigmentLayers(); QS10.l16 = MV.lyrics.get('炊烟'); QS10.l17 = MV.lyrics.get('隔江'); },
  render(g, f) {
    const t = f.t, tk = f.tick, L = QS10.L, t17 = QS10.l17.words[0].start;
    const cam = keys(t, [[f.from, 0], [f.from + 0.9, -1500, ease.inOutCubic], [t17 - 0.5, -1300], [t17 + 0.7, -150, ease.inOutCubic], [f.to, 0]]);
    const wide = prog(t, t17 - 0.1, f.to - 0.2, ease.inOutQuad);
    const z = lerp(1, 0.86, wide);
    L.clear();
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(z, 0, 0, z, (1 - z) * W / 2, (1 - z) * H * 0.85);
    qhcRiverWorld(L, { cam, sky: 1, t, tk, wide, smoke: t - QS10.l16.words[0].start + 0.3 });
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(1, 0, 0, 1, 0, 0);
    qhcRainLines(L, t, { n: 150, a: QH.D.dan * 0.8 });
    pigmentDraw(g, L, { preset: 'cobalt', seed: 8, offset: [cam * z, 0] });
    qhcLyrics(g, f, 1180, 110, { size: 60 });
  },
});
