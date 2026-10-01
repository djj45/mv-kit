// S13 shuidi — L20–L21. The riverbed: deep cobalt water; above, the surface is a 天青 band full of rain rings.
// The vase lies on its side among water weeds (drawn as reserves); a mandarin fish goes by; the weeds grow up
// in jerks and the light shafts move — years. L21: we drift closer; panel B faces up: he is still in the bow.
const QS13 = {};
MV.scene('shuidi', {
  init(MV) { QS13.L = pigmentLayers(); QS13.l21 = MV.lyrics.get('而我', 1); qhcBuildTex('firedSky'); },
  render(g, f) {
    const t = f.t, tk = f.tick, tq = f.tq, L = QS13.L;
    L.clear();
    // the water: darker with depth; light shafts from the surface, drifting
    const gr = L.wet.createLinearGradient(0, 140, 0, H); gr.addColorStop(0, qa(0.62)); gr.addColorStop(1, qa(0.93));
    L.wet.fillStyle = gr; L.wet.fillRect(0, 140, W, H);
    for (let k = 0; k < 4; k++) {
      const x = 300 + k * 420 + 120 * Math.sin(t * 0.3 + k), c = L.wet; c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.16;
      c.beginPath(); c.moveTo(x, 140); c.lineTo(x + 90, 140); c.lineTo(x + 330, H); c.lineTo(x + 150, H); c.closePath(); c.fill(); c.restore();
    }
    // the surface seen from below: a 天青 band, the rain rings on it
    L.col.fillStyle = rgba(QH.tianqing, 0.9); L.col.fillRect(0, 0, W, 140);
    qhLine(L.dry, [[-10, 140], [W + 10, 140]], { w: 3, a: 0.7, dot: false, seed: 3 });
    for (let i = 0; i < 26; i++) {
      const born = Math.floor(tq * 3 - i * 0.37) + i, age = (tq * 3 - i * 0.37) % 1, x = hash(born, i) * W, y = 40 + 80 * hash(born, i + 7);
      const r = 8 + 50 * age; const e = []; for (let k = 0; k <= 30; k++) { const a = k / 30 * TAU; e.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.25]); }
      L.dry.globalAlpha = 1 - age; qhLine(L.dry, e, { w: 1.8, a: QH.D.dan, closed: true, dot: false, seed: 5 }); L.dry.globalAlpha = 1;
    }
    // weeds grow in steps (a beat each), time passing
    const grow = Math.floor(clamp((t - f.from) / 0.55, 0, 8)) / 8;
    for (let i = 0; i < 12; i++) { const x = 60 + i * 165 + 40 * hash(i, 2); qhcWeed(L, x, H + 10, (220 + 380 * hash(i, 3)) * (0.35 + 0.65 * grow), tq, i + 1); }
    // the riverbed: a sandy slope with pebbles
    const bed = []; for (let x = -20; x <= W + 20; x += 40) bed.push([x, 960 + 30 * noise1(x / 200, 4)]);
    qhcReserveFill(L, bed.concat([[W + 20, H + 20], [-20, H + 20]]), 0.4);
    for (let k = 0; k < 16; k++) { const p = blobPts(60 + k * 120 + 30 * hash(k, 1), 1000 + 40 * hash(k, 2), 12 + 10 * hash(k, 3), k, 0.2, 12); qhFill(L.wet, p, 0.7); }
    // the fish crossing
    const fx = lerp(-200, W + 200, prog(t, f.from, f.to));
    qhcFish(L, fx, 300 + 30 * Math.sin(t * 0.8), 1.3, 1, tq);
    pigmentDraw(g, L, { preset: 'cobalt', seed: 14, halo: 0.4, gran: 0.08, spots: 0.25 });
    // the vase on its side in the weeds (drawn upright, turned), panel B up; we drift closer in L21
    const near = prog(t, QS13.l21.words[0].start - 0.4, f.to, ease.inOutQuad);
    const h = lerp(620, 900, near), px = lerp(1000, 900, near), py = lerp(820, 760, near);
    qhcTintedVase(g, v => qhcVase(v, { tex: 'firedSky', cx: px, top: py - h / 2, h, rot: Math.PI - 0.1, fired: 1, mouth: false, env: QH.dan }),
      { rot: -Math.PI / 2 + 0.08, px, py, tint: 'rgba(28,48,110,0.45)' });
    qhcLyrics(g, f, 1760, 210, { dark: true });
  },
});
