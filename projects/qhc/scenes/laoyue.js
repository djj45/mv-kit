// S14 laoyue — L22–L23. Night on the river, level with the water: dark sky, dark water, the moon's reflection a
// round of reserved glaze-white. L22: a rope net comes down into the water, takes the vase and lifts it — it
// breaks the surface just where the moon lies, so the moon comes up with it. L23: rings of ripples spread from
// the break; all the cobalt begins to run and bleed until the picture dissolves into white.
const QS14 = {};
MV.scene('laoyue', {
  init(MV) { QS14.L = pigmentLayers(); QS14.l22 = MV.lyrics.get('月色'); QS14.l23 = MV.lyrics.get('晕开'); qhcBuildTex('firedSky'); },
  render(g, f) {
    const t = f.t, tk = f.tick, tq = f.tq, L = QS14.L, wl = 600, mx = 960, my = 760;
    const w22 = QS14.l22.words, t23 = QS14.l23.words[0].start;
    const netDown = prog(t, w22[0].start - 0.3, w22[2].start, ease.outQuad), lift = prog(t, w22[3].start, w22[5].start + 0.2, ease.inOutCubic);
    const run = prog(t, t23, f.to, ease.inQuad);
    L.clear();
    // sky and water
    L.wet.fillStyle = qa(0.86); L.wet.fillRect(0, 0, W, wl);
    const gw = L.wet.createLinearGradient(0, wl, 0, H); gw.addColorStop(0, qa(0.7)); gw.addColorStop(1, qa(0.9)); L.wet.fillStyle = gw; L.wet.fillRect(0, wl, W, H - wl);
    qhcReserveLine(L, [[-10, wl], [W + 10, wl]], 3, 0.2);
    // the moon's reflection (glaze white), broken by little wave strokes
    const mr = []; for (let k = 0; k <= 60; k++) { const a = k / 60 * TAU; mr.push([mx + Math.cos(a) * 150, my + Math.sin(a) * 58]); }
    qhcReserveFill(L, mr, 0);
    for (let r = 0; r < 12; r++) { const y = wl + 30 + r * 38, off = (r * 70 + tq * 30) % 140; for (let x = -140 + off; x < W + 140; x += 140) qhLine(L.dry, [[x, y], [x + 24, y - 8], [x + 48, y]], { w: 2.2, a: 0.95, dot: false, seed: 100 + r * 20 + Math.floor(x / 140), tk }); }
    // the net: ropes down from above, a mesh hanging into the water
    const ny = lerp(-400, my + 160, netDown) - lift * 560;
    const ropes = [[mx - 260, -20], [mx + 260, -20]];
    ropes.forEach(([x], i) => qhcReserveLine(L, [[x, -20], [mx + (i ? 150 : -150), ny - 260]], 4, 0.25));
    for (let i = -4; i <= 4; i++) {
      qhcReserveLine(L, [[mx + i * 38, ny - 260], [mx + i * 34, ny + 20]], 2.6, 0.2);
      const y = ny - 250 + (i + 4) * 34; qhcReserveLine(L, [[mx - 150 + (i + 4) * 2, y], [mx + 150 - (i + 4) * 2, y]], 2.6, 0.2);
    }
    // ripples from the break, spreading
    const tb = w22[4].start;
    if (t > tb) for (let k = 0; k < 6; k++) {
      const age = t - tb - k * 0.35; if (age <= 0) continue;
      const r = 120 + age * 260, e = []; for (let j = 0; j <= 80; j++) { const a = j / 80 * TAU; e.push([mx + Math.cos(a) * r, wl + 60 + Math.sin(a) * r * 0.16]); }
      qhcReserveLine(L, e, 3, 0.14 * clamp(1 - age / 3), { closed: true });
    }
    pigmentDraw(g, L, { preset: 'cobalt', seed: 15, bleed: 2.2 + 18 * run, halo: 0.7 + run, rim: 1.3 + run, gran: 0.08, spots: 0.25 });
    // the vase in the net: under the water (tinted, faint) and then out of it
    const vh = 520, vt = lerp(wl + 60, wl - vh - 40, lift);
    g.save(); g.beginPath(); g.rect(0, 0, W, wl + 2); g.clip();
    qhcVase(g, { tex: 'firedSky', cx: mx, top: vt, h: vh, rot: 0.2 + 0.4 * lift, fired: 1, env: QH.dan });
    g.restore();
    g.save(); g.beginPath(); g.rect(0, wl + 2, W, H); g.clip(); g.globalAlpha = 0.28; qhcVase(g, { tex: 'firedSky', cx: mx, top: vt, h: vh, rot: 0.2, fired: 1 }); g.restore();
    // everything melting to white at the end
    g.fillStyle = `rgba(241,243,238,${prog(t, t23 + 0.6, f.to, ease.inQuad)})`; g.fillRect(0, 0, W, H);
    qhcLyrics(g, f, 260, 150, { dark: t < t23 + 1.2 });
  },
});
