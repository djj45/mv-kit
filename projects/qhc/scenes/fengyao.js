// S7 fengyao — L12–L13 and the long note. Under the powdery glaze her 披帛 comes loose and lifts off as one wisp
// of smoke (一缕); the camera pans with it out to the night: the dragon kiln up the hillside, all raw grey. L13:
// the door is bricked up one brick a beat; he stands before it, back to us; the wisp slips through the last gap.
// On the long note the fire-eyes along the kiln's back light one after another, brighter; the chimney smokes.
const QS7 = {};
MV.scene('fengyao', {
  init(MV) {
    // part A: the glazed panel (as S6 ended), painted once
    const L = pigmentLayers(), z = 3.2, cx = 200, cy = 212, tx = W / 2 - cx * z, ty = H / 2 - cy * z;
    qhcPanelAFlat(L, tx, ty, z, {});
    QS7.A = mk(W, H); const ga = QS7.A.getContext('2d'); ga.drawImage(pigmentComp(L, { preset: 'raw', offset: [-tx, -ty], scale: z * 0.7, seed: 3 }), 0, 0);
    ga.fillStyle = 'rgba(239,235,228,0.9)'; ga.fillRect(0, 0, W, H); qhcBodyShade(ga, tx, ty, z, { a: 0.22, room: '#E9E4DA' });
    QS7.cam = { tx, ty, z };
    // part B: the kiln at night
    const K = pigmentLayers(); QS7.K = qhcKiln(K);
    QS7.B = mk(W, H); QS7.B.getContext('2d').drawImage(pigmentComp(K, { preset: 'raw', seed: 17 }), 0, 0);
    QS7.S = qhStickerLayers();
    QS7.l12 = MV.lyrics.get('你的'); QS7.l13 = MV.lyrics.get('去到');
    const A = MV.audio; QS7.brick0 = A.beatAt(QS7.l13.words[0].start - 0.05);
  },
  render(g, f) {
    const t = f.t, tk = f.tick, tq = f.tq, S = QS7.S, A = f.audio;
    const panT0 = QS7.l12.words[4].start, panT1 = QS7.l13.words[0].start - 0.1;
    const pan = ease.inOutCubic(prog(t, panT0, panT1)) * W;
    g.drawImage(QS7.A, -pan, 0); g.drawImage(QS7.B, W - pan, 0);
    S.clear();
    // bricks, one per beat through L13 (10 bricks)
    const nb = clamp(A.beatAt(t) - QS7.brick0 + 0.4, 0, 10);
    for (const c of [S.wet, S.dry, S.col, S.mask]) c.setTransform(1, 0, 0, 1, W - pan, 0);
    qhcBricks(S, QS7.K, nb, tk);
    // him before the kiln
    qhcPainterStand(S, 860, 1010, 300, { tk });
    for (const c of [S.wet, S.dry, S.col, S.mask]) c.setTransform(1, 0, 0, 1, 0, 0);
    // the wisp: peels off along her 披帛 (part A), rises, flies right with the pan, and down into the last gap
    const {tx, ty, z} = QS7.cam, t12 = QS7.l12.words[3].start;
    const peel = prog(t, t12 - 0.3, t12 + 0.9, ease.inOutQuad);
    const lastGap = QS7.brick0 + 9 - 0.4, tGap = A.timeOfBeat ? A.timeOfBeat(lastGap) : t + 99;
    const K = QS7.K, gx = W - pan + K.doorBox[0] + K.doorBox[2] * 0.5, gy = K.doorBox[1] + 14;
    if (peel > 0 && t < tGap + 0.2) {
      const pts = [], n = 40;
      const start = [tx + (300 + 0.2 * 300) * z - pan, ty + (402 - 0.62 * 300) * z];
      const fly = prog(t, t12 + 0.4, tGap, ease.inOutQuad);
      for (let i = 0; i <= n; i++) {
        const u = i / n, headU = u * peel;
        // along the ribbon at first, then a long flight whose head leads
        const p0 = [start[0] + 180 * u * Math.cos(u * 3), start[1] - 260 * u * peel + 30 * Math.sin(u * 7 + tq * 2)];
        const k = clamp(fly * 1.25 - (1 - u) * 0.25);
        const mid = [W * 0.55, 180];
        const q = k < 0.5 ? [lerp(p0[0], mid[0], k * 2), lerp(p0[1], mid[1], ease.outQuad(k * 2))] : [lerp(mid[0], gx, (k - 0.5) * 2), lerp(mid[1], gy, ease.inQuad((k - 0.5) * 2))];
        pts.push([q[0] + 24 * noise1(u * 4 + tq * 1.5, 9) * (1 - k * 0.6), q[1] + 16 * noise1(u * 5 + tq, 10)]);
      }
      const enter = prog(t, tGap - 0.25, tGap + 0.2);
      const draw = pts.slice(Math.floor(enter * n));
      if (draw.length > 1) qhLine(S.dry, draw, { w: 3.2, a: 0.62, tk, seed: 55, dot: false, jit: 1 });
      if (draw.length > 3 && enter < 0.9) { const e = draw[0], p = draw[Math.min(3, draw.length - 1)], ang = Math.atan2(e[1] - p[1], e[0] - p[0]); qhLine(S.dry, qhCurl(e[0] + Math.cos(ang + 1.6) * 14, e[1] + Math.sin(ang + 1.6) * 14, 14, 1.1, -1, ang - 1.6), { w: 3, a: 0.62, seed: 56, tk, dot: false }); }
    }
    // chimney smoke once the fire is lit
    const fire0 = QS7.l13.words[7].start + 0.1;
    if (t > fire0) for (let i = 0; i < 5; i++) {
      const age = tq - fire0 - i * 0.5; if (age <= 0) continue;
      qhSmoke(W - pan + QS7.K.chimney[0], QS7.K.chimney[1], 360, age, 400 + i, { rise: 170, amp: 30, drift: 0.8 }).forEach((p, k) => qhLine(S.dry, p, { w: 3, a: 0.55, tk, seed: 410 + i * 3 + k, dot: false }));
    }
    qhSticker(g, S, { preset: 'raw', seed: 19 });
    // fire-eyes: one after another on the long note, then all brighter
    const eyes = QS7.K.eyes;
    g.save(); g.globalCompositeOperation = 'lighter';
    eyes.forEach((p, i) => {
      const on = prog(t, fire0 + i * 0.12, fire0 + i * 0.12 + 0.25) * (0.6 + 0.4 * prog(t, fire0 + 1.5, f.to)) * (0.9 + 0.1 * Math.sin(tq * 9 + i));
      if (on <= 0) return;
      const x = W - pan + p[0], y = p[1], R = 30 + 20 * on;
      const gr = g.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, `rgba(255,248,234,${0.95 * on})`); gr.addColorStop(0.3, `rgba(255,236,205,${0.45 * on})`); gr.addColorStop(1, 'rgba(255,230,200,0)');
      g.fillStyle = gr; g.fillRect(x - R, y - R, 2 * R, 2 * R);
    });
    g.restore();
    qhcLyrics(g, f, 0, 150, { place: l => [l.i === QS7.l12.i ? 1700 - pan : 230 + W - pan, 150] });
  },
});
