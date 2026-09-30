// pigment-demo — the three presets side by side, each on its own 640-px panel with its own layers:
// label, the ramp's density steps (washes, so the edges pool), the motif (勾线 + 分水), a dry-brush stroke and a bloom.
const PGD = {
  presets: ['ink', 'raw', 'cobalt'],
  names: [['水墨 · 宣纸', 'ink · xuan'], ['生料 · 素胚', 'raw · biscuit'], ['青花 · 釉面', 'cobalt · glaze']],
  L: null,
};

MV.scene('swatch', {
  init() { PGD.L = PGD.presets.map(() => pigmentLayers(640, H)); },
  render(g, f) {
    const tk = f.tick;
    PGD.L.forEach((L, k) => {
      const q = PIGMENT[PGD.presets[k]];
      L.clear();
      // label (density text: it takes the ramp's colour)
      L.dry.textAlign = 'center';
      L.dry.font = '600 46px "Songti SC", "Noto Serif CJK SC", serif'; L.dry.fillStyle = ink(0.9); L.dry.fillText(PGD.names[k][0], 320, 112);
      L.dry.font = '26px "Songti SC", "Noto Serif CJK SC", serif'; L.dry.fillStyle = ink(0.55); L.dry.fillText(PGD.names[k][1], 320, 152);
      // density steps: one wash per ramp stop, slightly irregular so the pooled edge reads
      const n = q.ramp.length, sw = 92, gap = (560 - n * sw) / Math.max(1, n - 1);
      q.ramp.forEach(([d], i) => {
        const x = 40 + i * (sw + gap) + sw / 2;
        pathSmooth(L.wet, blobPts(x, 250, sw * 0.5, 200 + i, 0.07, 40, 1.05)); L.wet.fillStyle = ink(d); L.wet.fill();
      });
      // the motif
      pgdLeaf(L, 250, 700, 2.35, 150, { tk, seed: 1 });
      pgdLeaf(L, 395, 690, 0.75, 135, { tk, seed: 2 });
      pgdFlower(L, 320, 510, 0.88, { tk });
      // a dry-brush stroke and a bloom
      inkStroke(L.dry, spline([[70, 900], [230, 872], [420, 905], [575, 880]], 12), 30, { alpha: 0.85, dry: 0.42, seed: 11 + k, wet: 0.35 });
      inkBloom(L.wet, 150, 1000, 3, { r: 44, alpha: 0.55, seed: 3 });
      inkBloom(L.wet, 330, 1000, 3, { r: 34, alpha: 0.8, seed: 5, dilute: false });
      // a colour accent where the style allows one: the vermilion seal (ink), 釉里红 (cobalt)
      if (k === 0) { L.col.fillStyle = 'rgba(176,46,34,0.92)'; L.col.fillRect(470, 972, 58, 58); L.col.fillStyle = 'rgba(0,0,0,0)'; L.col.globalCompositeOperation = 'destination-out'; L.col.fillStyle = '#000'; L.col.fillRect(482, 984, 14, 34); L.col.fillRect(502, 984, 14, 34); L.col.globalCompositeOperation = 'source-over'; }
      if (k === 2) { L.col.fillStyle = 'rgba(168,58,60,0.9)'; L.col.beginPath(); L.col.arc(500, 1000, 16, 0, TAU); L.col.fill(); }
      pigmentDraw(g, L, { preset: PGD.presets[k], offset: [k * 640, 0] }, k * 640, 0);
    });
  },
});
