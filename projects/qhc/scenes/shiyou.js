// S5 shiyou — L8–L9. Panel A up close: her (drawn over from the sheet, no face) and the peony, in raw grey.
// L8: milky glaze slurry runs down from the top, a row of round drips at its front; under the wet glaze the
// drawing still shows, where it has dried it goes powdery white. L9: by the end it is hidden — a pale ghost only.
const QS5 = {};
MV.scene('shiyou', {
  init(MV) { QS5.L = pigmentLayers(); QS5.l8 = MV.lyrics.get('釉色渲染'); QS5.l9 = MV.lyrics.get('韵味'); },
  render(g, f) {
    const t = f.t, L = QS5.L;
    const z = lerp(2.15, 2.35, f.p), cx = 222, cy = 232 + 10 * f.p, tx = W / 2 - cx * z, ty = H / 2 - cy * z;
    L.clear(); qhcPanelAFlat(L, tx, ty, z, { hong: 0.92, tk: f.tick });
    pigmentDraw(g, L, { preset: 'raw', offset: [-tx, -ty], scale: z * 0.7, seed: 3 });
    // the curtain: over the top at L8's first word, to the bottom by L9's end
    const t0 = QS5.l8.words[0].start - 0.3, t1 = QS5.l9.words[QS5.l9.words.length - 1].start;
    const front = keys(t, [[t0, -140], [QS5.l8.end, H * 0.62, ease.inOutQuad], [t1, H + 160, ease.inOutQuad]]);
    const dry = lerp(0.72, 0.9, prog(t, QS5.l9.words[0].start, f.to));
    qhcGlazeCurtain(g, front, t, { dry, wet: 0.45 });
    qhcBodyShade(g, tx, ty, z);
    qhcLyrics(g, f, 250, 170);
  },
});
