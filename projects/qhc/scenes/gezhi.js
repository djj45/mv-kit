// S4 gezhi — L7 (the long line). Looking down on the desk: the sheet of paper, weights, the ink dish, the
// mountain-shaped brush rest. His brush draws her as the line is sung — hair, the peony, sleeves, 披帛, skirt,
// the fan — and at 一 only the outline of her face; on 半 he lays the brush on its rest. The face stays empty.
const QS4 = {};
MV.scene('gezhi', {
  init(MV) {
    const L = pigmentLayers();
    // the desk (wood, washed), the sheet (left clean), weights, dish, brush rest
    L.wet.fillStyle = qa(0.3); L.wet.fillRect(0, 0, W, H);
    L.wet.save(); L.wet.globalCompositeOperation = 'destination-out'; L.wet.fillStyle = '#000'; L.wet.fillRect(470, 60, 900, 980); L.wet.restore();
    for (let k = 0; k < 14; k++) { const y = 20 + k * 80 + 20 * noise1(k, 2); qhLine(L.dry, [[-10, y], [480, y + 10 * noise1(k, 3)]], { w: 1.6, a: 0.42, dot: false, seed: 60 + k }); qhLine(L.dry, [[1360, y + 6], [W + 10, y + 12 * noise1(k, 5)]], { w: 1.6, a: 0.42, dot: false, seed: 80 + k }); }
    qhLine(L.dry, [[470, 60], [1370, 60], [1370, 1040], [470, 1040]], { w: 2.2, a: 0.6, closed: true, seed: 90 });
    for (const y of [70, 990]) { const wt = [[560, y], [1280, y], [1280, y + 40], [560, y + 40]]; qhFill(L.wet, wt, QH.D.er); qhLine(L.dry, wt, { w: 3, a: 0.9, closed: true, seed: 91 + y }); }
    const dish = []; for (let i = 0; i <= 60; i++) { const a = i / 60 * TAU; dish.push([1560 + Math.cos(a) * 90, 260 + Math.sin(a) * 90]); }
    qhFill(L.wet, dish, QH.D.ying); qhLine(L.dry, dish, { w: 3, a: 0.9, closed: true, seed: 95 });
    const pool = blobPts(1560, 262, 52, 4, 0.12, 30); qhFill(L.wet, pool, 0.9);
    const rest = [[1440, 880], [1470, 836], [1500, 866], [1540, 800], [1580, 862], [1610, 830], [1640, 880]];
    qhFill(L.wet, rest, QH.D.er); qhLine(L.dry, rest, { w: 3.2, a: 0.9, closed: true, seed: 96, smooth: 1 });
    QS4.bg = mk(W, H); QS4.bg.getContext('2d').drawImage(pigmentComp(L, { preset: 'raw', paper: 'xuan', paperColor: '#E7DFCD', seed: 4 }), 0, 0);
    QS4.L = pigmentLayers(); QS4.F = pigmentLayers(); QS4.H = qhStickerLayers();
    QS4.line = MV.lyrics.get('宣纸上');
    QS4.lady = [900, 980, 820];
  },
  render(g, f) {
    const t = f.t, tk = f.tick, L = QS4.L, F = QS4.F, w = QS4.line.words, [lx, ly, lh] = QS4.lady;
    g.drawImage(QS4.bg, 0, 0);
    // her, finished, into F; revealed top → bottom in L while 宣纸上… (8 characters) is sung
    F.clear(); qhcLady(F, lx, ly, lh, { tk: 0, wind: 0.35, noFace: true, lw: 3 });
    const pBody = clamp(qhcLineProg({ words: w.slice(0, 8) }, t, { max: 0.5 }) * 1.0);
    const tFace = w[8].start, tRest = w[9].start;
    const front = lerp(ly - lh * 1.02, ly + 20, pBody);
    L.clear();
    for (const k of ['wet', 'dry', 'col']) {
      const c = L[k]; c.save(); c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0);
      for (let x = W; x >= 0; x -= 40) c.lineTo(x, front + 16 * noise1(x / 90, 7) + (k === 'wet' ? -30 : 0));
      c.closePath(); c.clip(); c.drawImage(F.canvases[k], 0, 0); c.restore();
    }
    // the face: only its outline, on 一
    const fk = prog(t, tFace, tFace + 0.36, ease.inOutQuad);
    const faceC = [lx + 0.0 * lh, ly - 0.845 * lh];
    const facePts = []; for (let i = 0; i <= 36; i++) { const a = Math.PI * 0.35 + Math.PI * 0.9 * i / 36; facePts.push([faceC[0] + Math.cos(a) * 0.04 * lh, faceC[1] + Math.sin(a) * 0.052 * lh]); }
    if (fk > 0) qhLine(L.dry, qhSmooth(facePts, false, 1), { w: 3, a: 0.9, upto: fk, seed: 22, tk });
    g.globalCompositeOperation = 'multiply'; pigmentDraw(g, L, { preset: 'raw', paper: 'none' }, 0, 0); g.globalCompositeOperation = 'source-over';
    // (paper: 'none' → white ground; multiply onto the sheet)
    // the brush: rides the drawing front, then the face, then goes to its rest
    let tip = null, rest = prog(t, tRest, tRest + 0.5, ease.inOutCubic), away = prog(t, tRest + 0.55, tRest + 1.2, ease.inCubic);
    if (t < tFace) {
      const u = pBody * 26;
      tip = [lx + 0.11 * lh * Math.sin(u * 1.3) + 0.03 * lh * Math.sin(u * 3.1), front - 6];
    } else if (t < tRest) {
      const q = cutPolyline(facePts, Math.max(0.02, fk)); tip = q[q.length - 1];
    } else {
      const a = [faceC[0] - 0.02 * lh, faceC[1] + 0.05 * lh];
      tip = [lerp(a[0], 1480, rest), lerp(a[1], 846, rest)];
    }
    // resting brush (after it is laid down)
    const Hs = QS4.H; Hs.clear();
    if (rest >= 1) {
      const bb = [[1420, 846], [1780, 820], [1782, 836], [1422, 862]];
      qhFill(Hs.wet, bb, QH.D.ying); qhLine(Hs.dry, bb, { w: 2.6, a: 0.9, closed: true, seed: 5 });
      const hair = [[1380, 856], [1400, 846], [1424, 846], [1424, 862], [1400, 862]];
      qhFill(Hs.wet, hair, QH.D.tou); qhLine(Hs.dry, hair, { w: 2, a: 0.95, closed: true, seed: 6 });
    }
    if (away < 1) qhcHand(Hs, tip[0] + away * 700, tip[1] - away * 200, -Math.PI / 2 + 0.6 - 0.9 * rest, 1.0, { tk, side: 1, wet: rest < 1, noBrush: rest >= 1 });
    qhSticker(g, Hs, { preset: 'raw', seed: 23 });
    qhcLyrics(g, f, 260, 170);
  },
});
