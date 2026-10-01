// S1 supi — bars 7–11 + L1. The clay is thrown up one step a beat (bars 7–8) into the 梅瓶; bar 9 it is dry
// biscuit, turning; the title writes itself top-left and goes at bar 10; his hand comes in and, one segment per
// sung character of L1, draws the 海棠 panel on the turning vase. The last beat pushes in on the brush tip.
const QS1 = {};
MV.scene('supi', {
  init(MV) {
    const A = MV.audio;
    QS1.b7 = A.nearestDownbeat(MV.project.from); QS1.b9 = A.nearestDownbeat(QS1.b7 + 4.4); QS1.b10 = A.nearestDownbeat(QS1.b9 + 2.2);
    QS1.line = MV.lyrics.get('素胚勾勒');
    // the room: pale biscuit ground, the wheel (静物), painted once
    const L = pigmentLayers();
    const cx = W / 2, wy = 928;
    const disc = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; disc.push([cx + Math.cos(a) * 250, wy + Math.sin(a) * 34]); }
    qhFill(L.wet, disc, QH.D.ying); qhLine(L.dry, disc, { w: 3.4, a: 0.88, closed: true, seed: 5 });
    qhLine(L.dry, [[cx - 250, wy], [cx - 244, wy + 26], [cx - 160, wy + 50], [cx + 160, wy + 50], [cx + 244, wy + 26], [cx + 250, wy]], { w: 3, a: 0.85, seed: 6, dot: false });
    const base = [[cx - 90, wy + 50], [cx - 110, H + 20], [cx + 110, H + 20], [cx + 90, wy + 50]];
    qhFill(L.wet, base, QH.D.dan); qhLine(L.dry, base, { w: 3, a: 0.85, seed: 7, dot: false });
    QS1.bg = mk(W, H); QS1.bg.getContext('2d').drawImage(pigmentComp(L, { preset: 'raw', paperColor: '#EAE3D4', seed: 11 }), 0, 0);
    QS1.T = pigmentLayers(QV.UW, QV.UH);
    QS1.tex = mk(QV.UW, QV.UH);
    QS1.H = qhStickerLayers();
    QS1.wet = mk(W, H);
  },
  render(g, f) {
    const t = f.t, A = f.audio, V = { cx: W / 2, top: 168, h: 760 };
    g.drawImage(QS1.bg, 0, 0);
    // ---- throwing: 8 beats, one pull each (bars 7–8)
    const b0 = A.beatAt(QS1.b7), bt = A.beatAt(t) - b0;
    const step = clamp(bt, 0, 8), k = clamp((Math.floor(step) + ease.outCubic(clamp((step % 1) / 0.45))) / 8);
    const kk = t >= QS1.b9 ? 1 : k;
    const hNow = lerp(0.3, 1, ease.inOutQuad(kk)) * V.h;
    const prof = new Float32Array(97);
    for (let i = 0; i <= 96; i++) {
      const v = i / 96, lump = 0.36 * V.h * Math.sqrt(clamp(Math.sin(Math.PI / 2 * Math.min(1, v * 1.25)))) * (1 - 0.1 * v);
      const r = lerp(lump, qhcRadius(v) * V.h, ease.inOutQuad(kk));
      prof[i] = r / hNow;
    }
    // ---- the panel outline (L1), and where the brush is on it
    const line = QS1.line, pk = qhcLineProg(line, t, { max: 0.5 });
    const rot = -0.34 + 0.07 * (t - QS1.b9);                  // turning slowly; panel A comes round to face us during L1
    let tex = 'blank', fresh = false;
    if (pk > 0) {
      const T = QS1.T; T.clear();
      qhcDecor(T, { frameA: pk });
      const c = QS1.tex.getContext('2d'); c.drawImage(pigmentComp(T, { preset: 'raw', seed: 3, scale: 1.4 }), 0, 0);
      tex = QS1.tex; fresh = true;
    }
    const top = V.top + V.h - hNow;
    const cyl = qhCylinder(typeof tex === 'string' ? qhcBuildTex(tex) : tex, { prof, cx: V.cx, top, h: hNow, rot: TAU * 0.25 + rot, glaze: 0, fresh, amb: 0.72 });
    // wet clay while throwing: darker and a little shiny, drying by bar 9
    const wet = 1 - prog(t, QS1.b9 - 0.6, QS1.b9 + 0.8);
    const wg = QS1.wet.getContext('2d'); wg.globalCompositeOperation = 'copy'; wg.drawImage(cyl, 0, 0);
    if (wet > 0) {
      wg.globalCompositeOperation = 'source-atop'; wg.fillStyle = `rgba(122,108,88,${0.42 * wet})`; wg.fillRect(0, 0, W, H);
      // throwing rings sliding past
      wg.strokeStyle = `rgba(70,62,50,${0.1 * wet})`; wg.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const y = top + ((i * 29 + t * 90) % hNow); wg.beginPath(); wg.moveTo(V.cx - 400, y); wg.lineTo(V.cx + 400, y + 2); wg.stroke(); }
    }
    wg.globalCompositeOperation = 'source-over';
    // camera: the last beat pushes in on the brush tip
    const V2 = { cx: V.cx, top: V.top, h: V.h, rot };
    let tipP = null;
    if (pk > 0) {
      const pts = qhcPanelPts(), P = cutPolyline(pts.concat([pts[0]]), pk), e = P[P.length - 1];
      const yy = QV.PY + e[1];
      tipP = qhcVasePt(QV.A + (e[0] - QV.PW / 2) * qhcSx(yy), yy, V2);
    } else {
      const s0 = qhcPanelPts()[0], yy = QV.PY + s0[1];
      tipP = qhcVasePt(QV.A + (s0[0] - QV.PW / 2) * qhcSx(yy), yy, V2);
    }
    const push = prog(t, f.to - 0.7, f.to, ease.inCubic), z = 1 + 1.6 * push;
    g.save();
    if (push > 0) { g.translate(tipP.x, tipP.y); g.scale(z, z); g.translate(-tipP.x, -tipP.y); }
    // ground shadow, the vase
    const sy = V.top + V.h, gr = g.createRadialGradient(V.cx + 16, sy, 0, V.cx + 16, sy, 260);
    gr.addColorStop(0, 'rgba(60,56,50,0.28)'); gr.addColorStop(1, 'rgba(60,56,50,0)');
    g.save(); g.translate(0, sy); g.scale(1, 0.14); g.translate(0, -sy); g.fillStyle = gr; g.fillRect(V.cx - 300, sy - 260, 640, 520); g.restore();
    g.drawImage(QS1.wet, 0, 0);
    if (t < QS1.b9) {           // the mouth opening while it is being thrown
      const r0 = prof[0] * hNow;
      g.fillStyle = `rgba(80,72,60,${0.7 * kk})`; g.beginPath(); g.ellipse(V.cx, top + 1, r0 * 0.7, r0 * 0.16, 0, 0, TAU); g.fill();
    } else { const r0 = qhcRadius(0) * V.h; g.fillStyle = 'rgba(90,85,76,0.85)'; g.beginPath(); g.ellipse(V.cx, V.top + 1, r0 * 0.7, r0 * 0.16, 0, 0, TAU); g.fill(); }
    // ---- his hand: in from the right at bar 10, to the start of the outline by L1, then riding the line
    const tIn = QS1.b10, tArr = line.words[0].start - 0.15;
    if (t > tIn) {
      const ka = ease.outCubic(prog(f.tq, tIn, tArr));
      const x = lerp(W + 420, tipP.x, ka), y = lerp(tipP.y - 260, tipP.y, ka) + (1 - ka) * 30 * Math.sin(f.tq * 3);
      const lift = pk <= 0 ? 10 * (1 - ka) : 0;
      const Hs = QS1.H; Hs.clear();
      qhcHand(Hs, x, y - lift, -Math.PI / 2 + 0.55, 1.0, { tk: f.tick, side: 1 });
      qhSticker(g, Hs, { preset: 'raw', seed: 21, scale: 1.2 });
    }
    g.restore();
    // ---- the title (bar 8), gone by bar 10; then L1 in the same place
    const tfade = 1 - prog(t, QS1.b10 - 0.2, QS1.b10 + 0.5);
    if (tfade > 0) {
      const st = { col: QH.rawM, pre: QH.rawD, halo: null, ghost: 0.5 };
      [...'青花瓷'].forEach((ch, i) => qhChar(g, ch, 250, 230 + i * 104, 88, t - (QS1.b7 + 2.22 + i * 0.556), 0.3, tfade, st));
    }
    qhcLyrics(g, f, 250, 200);
    const fin = 1 - prog(t, f.from, f.from + 0.6, ease.outQuad);
    if (fin > 0) { g.fillStyle = `rgba(234,227,212,${fin})`; g.fillRect(0, 0, W, H); }
  },
});
