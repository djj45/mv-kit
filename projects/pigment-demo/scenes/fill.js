// pigment-demo — "滴水分开": the outline is drawn, then the 分水 spreads out from each petal's base with a wet,
// pooling front. Left: raw pigment on the unfired biscuit; right: the same drawing fired (cobalt on glaze).
const PGF = { L: null };

MV.scene('fill', {
  init() { PGF.L = [pigmentLayers(960, H), pigmentLayers(960, H)]; },
  render(g, f) {
    const t = f.lt, tk = f.tick;
    const line = prog(t, 0.2, 1.8, ease.inOutQuad), fill = prog(t, 2.0, 5.2, ease.outCubic);
    PGF.L.forEach((L, k) => {
      L.clear();
      pgdLeaf(L, 330, 780, 2.4, 190, { tk, seed: 1, fill });
      pgdLeaf(L, 630, 770, 0.7, 175, { tk, seed: 2, fill });
      pgdFlower(L, 480, 520, 1.25, { tk, line, fill });
      pigmentDraw(g, L, k === 0 ? { preset: 'raw', offset: [0, 0] } : { preset: 'cobalt', offset: [960, 0] }, k * 960, 0);
    });
    // a hairline between the two halves
    g.fillStyle = 'rgba(40,40,40,0.25)'; g.fillRect(959, 0, 2, H);
  },
});
