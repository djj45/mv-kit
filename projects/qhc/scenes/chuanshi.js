// S15 chuanshi — L24. Out of the white: only the vase, no hand, no stand, a faint shadow. It turns by itself,
// the highlight sliding over the painting; panel B goes round and panel A comes to the front, stopping exactly as
// the line ends.
const QS15 = {};
MV.scene('chuanshi', {
  init(MV) { QS15.line = MV.lyrics.get('如传世'); qhcBuildTex('firedSky'); },
  render(g, f) {
    const t = f.t, w = QS15.line.words;
    g.fillStyle = QH.glaze; g.fillRect(0, 0, W, H);
    const stop = w[w.length - 1].start + 0.3;
    const rot = lerp(Math.PI + 0.3, TAU, ease.inOutCubic(prog(t, f.from, stop)));
    const z = lerp(1, 1.12, ease.inOutQuad(f.p));
    qhcVase(g, { tex: 'firedSky', cx: W / 2 + 150, top: 150 - 60 * (z - 1), h: 760 * z, rot, fired: 1, shadow: 0.18 });
    qhcLyrics(g, f, 520, 150);
    return { fade: 0 };
  },
});
