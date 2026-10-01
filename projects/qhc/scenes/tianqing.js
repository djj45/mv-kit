// S9 tianqing — L14–L15. Out of the kiln: the first blue. The fired 梅瓶 on glaze white, glossy, turning. On
// 天青色 the sky inside the panels turns 天青 and fine rain starts; the vase turns to panel B and we go in.
// L15: the picture, full screen — him in the bow of the moored boat, in the rain, looking across the river.
const QS9 = {};
MV.scene('tianqing', {
  init(MV) {
    QS9.tex = mk(QV.UW, QV.UH); QS9.L = pigmentLayers(); QS9.l14 = MV.lyrics.get('天青'); QS9.l15 = MV.lyrics.get('而我');
    qhcBuildTex('fired'); qhcBuildTex('firedSky');
  },
  render(g, f) {
    const t = f.t, tk = f.tick, w = QS9.l14.words;
    const sky = prog(t, w[0].start, w[2].start + 0.3, ease.inOutQuad);
    const tIn0 = w[4].start, tIn1 = QS9.l15.words[0].start - 0.05;      // the push into panel B
    const push = prog(t, tIn0, tIn1, ease.inCubic);
    if (t < tIn1 + 0.35) {
      g.fillStyle = QH.glaze; g.fillRect(0, 0, W, H);
      let tex = 'firedSky', fresh = false;
      if (sky < 1) { const c = QS9.tex.getContext('2d'); c.globalAlpha = 1; c.drawImage(qhcBuildTex('fired'), 0, 0); c.globalAlpha = sky; c.drawImage(qhcBuildTex('firedSky'), 0, 0); c.globalAlpha = 1; tex = QS9.tex; fresh = true; }
      const rot = lerp(0.35, Math.PI, ease.inOutQuad(prog(t, f.from, tIn1 - 0.2)));
      // push: the vase grows about panel B's centre (v ≈ 0.51) until the panel fills the frame
      const z = lerp(1, 5.2, push), h = 760 * z, pv = 0.51, cy = lerp(160 + pv * 760, H / 2, push);
      qhcVase(g, { tex, cx: W / 2, top: cy - pv * h, h, rot, fired: 1, shadow: 0.2 * (1 - push), fresh, mouth: push < 0.3 });
      qhcLyrics(g, f, 300, 180);
      if (t < tIn1) return {};
    }
    // inside: the river world
    const L = QS9.L; L.clear();
    const lt = t - tIn1, z = lerp(1.25, 1, ease.outCubic(clamp(lt / 1.6)));
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(z, 0, 0, z, (1 - z) * W / 2, (1 - z) * H / 2);
    qhcRiverWorld(L, { cam: 0, sky: 1, t, tk, look: 0.3 * Math.sin(t * 0.5) });
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(1, 0, 0, 1, 0, 0);
    qhcRainLines(L, t, { n: 170, a: QH.D.dan * 0.9 });
    pigmentDraw(g, L, { preset: 'cobalt', seed: 8 });
    // the panel's frame leaving the picture as we arrive
    const fk = 1 - prog(lt, 0, 0.35);
    if (fk > 0) { g.fillStyle = `rgba(241,243,238,${fk})`; g.fillRect(0, 0, W, H); }
    qhcLyrics(g, f, 1180, 110, { size: 60 });
    return {};
  },
});
