// S16 xiaoyi — L25 and the quiet bar 42. Into panel A: the 天青 rain-sky, the peony, her with the fan and the
// face she has never had. As 眼带笑 is sung two fine curves rise by themselves and bend into smiling eyes; on 意
// one touch of 釉里红 lands on her lips. Bar 42: the rain stops, a sheen slides across the glaze; fade to white.
const QS16 = {};
MV.scene('xiaoyi', {
  init(MV) { QS16.L = pigmentLayers(); QS16.line = MV.lyrics.get('你眼'); QS16.b42 = MV.audio.nearestDownbeat(91.48); },
  render(g, f) {
    const t = f.t, tk = f.tick, L = QS16.L, w = QS16.line.words;
    const zin = ease.inOutCubic(prog(t, f.from, w[1].start + 0.2));
    const z = lerp(2.2, 5.6, zin) * (1 + 0.08 * prog(t, w[1].start, f.to, ease.inOutQuad));
    const cx = lerp(222, 300, zin), cy = lerp(232, 190, zin);
    const tx = W / 2 - cx * z, ty = H / 2 - cy * z;
    const face = prog(t, w[1].start, w[3].start + 0.2, ease.inOutQuad), lips = prog(t, w[4].start, w[4].start + 0.35, ease.outCubic);
    L.clear();
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(z, 0, 0, z, tx, ty);
    const pts = qhcPanelPts();
    L.col.save(); qhPath(L.col, pts); L.col.clip(); L.col.fillStyle = rgba(QH.tianqing, 0.9); L.col.fillRect(0, 0, QV.PW, QV.PH * 0.58); L.col.restore();
    L.wet.qhClear = L.dry.qhClear = L.col;
    qhLine(L.dry, pts, { w: 4.2, a: 0.92, closed: true, seed: 600 });
    qhLine(L.dry, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 52, QV.PH - 52), { w: 2, a: 0.82, closed: true, seed: 601 });
    qhcPeonyBush(L, 150, 250, { k: 1 });
    qhLine(L.dry, [[70, 404], [180, 398], [300, 406], [380, 400]], { w: 2.2, a: 0.8, dot: false, seed: 640 });
    qhcLady(L, 300, 402, 300, { tk, wind: 0.35 + 0.15 * Math.sin(f.tq * 1.3), lw: 4.2 / z * 1.6, face, jit: 0.4 / z });
    L.wet.qhClear = L.dry.qhClear = null;
    qhcLady(L, 300, 402, 300, { tk, lips: lips * 0.95, lipsOnly: true });
    L.col.fillStyle = rgba(QH.hong, 0.9); L.col.beginPath(); L.col.arc(150, 244, 9, 0, TAU); L.col.fill();
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(1, 0, 0, 1, 0, 0);
    // rain inside the panel until bar 42
    const rainA = 1 - prog(t, QS16.b42 - 0.2, QS16.b42 + 0.6);
    if (rainA > 0) { L.dry.globalAlpha = rainA; qhcRainLines(L, t, { n: 90, a: QH.D.dan * 0.8, len: 40 }); L.dry.globalAlpha = 1; }
    pigmentDraw(g, L, { preset: 'cobalt', offset: [-tx, -ty], scale: z * 0.7, seed: 3, gran: 0.1, spots: 0.3 });
    qhcBodyShade(g, tx, ty, z, { a: 0.16, room: '#E9ECE6', spread: 1.5 });
    // the sheen across the glaze in bar 42
    const sw = prog(t, QS16.b42 + 0.1, QS16.b42 + 1.6, ease.inOutQuad);
    if (sw > 0 && sw < 1) {
      const x = lerp(-600, W + 600, sw), gr = g.createLinearGradient(x - 260, 0, x + 260, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.save(); g.transform(1, 0, -0.35, 1, 0, 0); g.fillStyle = gr; g.fillRect(-400, 0, W + 800, H); g.restore();
    }
    qhcLyrics(g, f, 1700, 180, { hold: 4 });
    g.fillStyle = `rgba(241,243,238,${prog(t, f.to - 2.0, f.to - 0.1, ease.inOutQuad)})`; g.fillRect(0, 0, W, H);
  },
});
