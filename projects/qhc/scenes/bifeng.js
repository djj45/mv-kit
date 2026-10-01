// S2 bifeng — L2–L4, one continuous camera on the vase's panel A (flat close-up on the biscuit).
// L2: macro on the brush — one stroke from dense to pale drags across the clay: the first petal.
// L3: pull back; the peony is outlined petal by petal (a few per sung character), the 分水 spreading from the heart.
// L4: leaves, stem and bud; on the last character a single dot of 釉里红 drops into the heart.
const QS2 = {};
MV.scene('bifeng', {
  init(MV) {
    QS2.L = pigmentLayers(); QS2.H = qhStickerLayers();
    QS2.l2 = MV.lyrics.get('笔锋'); QS2.l3 = MV.lyrics.get('瓶身描绘'); QS2.l4 = MV.lyrics.get('一如');
  },
  render(g, f) {
    const t = f.t, L = QS2.L, tk = f.tick;
    const p2 = qhcLineProg(QS2.l2, t), p3 = qhcLineProg(QS2.l3, t), p4 = qhcLineProg(QS2.l4, t, { last: 0.25 });
    // the bush sits in panel-local coordinates: head at (150, 250), s 0.62
    const bx = 150, by = 250, s = 0.62;
    // camera (world = panel box units): macro on the first petal → the whole panel
    const c0 = [166, 205], c1 = [214, 236];
    const kz = prog(t, QS2.l3.words[0].start - 0.55, QS2.l3.words[0].start + 0.5, ease.inOutCubic);
    const z = lerp(6.2, 2.05, kz) * (1 + 0.1 * prog(t, QS2.l4.words[0].start - 0.3, f.to, ease.inOutQuad));
    const cx = lerp(c0[0], c1[0], kz), cy = lerp(c0[1], c1[1], kz) + 4 * Math.sin(t * 0.7);
    const tx = W / 2 - cx * z, ty = H / 2 - cy * z;
    L.clear();
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(z, 0, 0, z, tx, ty);
    // the panel's outline (drawn in S1)
    const pts = qhcPanelPts();
    qhLine(L.dry, pts, { w: 4.2, a: 0.92, closed: true, seed: 600 });
    qhLine(L.dry, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 52, QV.PH - 52), { w: 2, a: 0.82, closed: true, seed: 601 });
    // petals: L2 = the first one, L3 = the other seventeen, L4 = leaves, stem, bud
    const P = p2 * 1 + p3 * 17;
    const petals = qhPeony(L, bx, by, s, { P, tk, w: 2.6 });
    // stem, leaves, bud (L4)
    const k4 = p4;
    qhLine(L.dry, [[bx + 6, by + 150], [bx + 2, by + 90], [bx, by + 30]], { w: 2.6, a: 0.86, dot: false, upto: clamp(k4 * 4), seed: 650 });
    [[bx - 14, by + 70, 2.6, 70], [bx + 16, by + 60, 0.4, 66], [bx - 8, by + 110, 3.0, 60], [bx + 14, by + 104, 0.1, 58]]
      .forEach(([lx, ly, a, len], i) => qhLeaf(L, lx, ly, a, len, { seed: 20 + i, line: clamp(k4 * 5 - 0.6 - i * 0.6), fill: clamp(k4 * 4 - 1.2 - i * 0.5), w: 2.2, tk }));
    const bud = qhPetal(bx + 58, by - 38, -1.1, 0, 44, 16, 660);
    qhFill(L.wet, bud, QH.D.er, { k: clamp(k4 * 4 - 2.6) }); qhLine(L.dry, bud, { w: 2.2, a: 0.88, closed: true, upto: clamp(k4 * 4 - 2.2), seed: 661, tk });
    qhLine(L.dry, [[bx + 30, by + 20], [bx + 58, by - 38]], { w: 2, a: 0.84, dot: false, upto: clamp(k4 * 4 - 2), seed: 662, tk });
    // 釉里红: a drop into the heart on the last character, soaking outward
    const lw4 = QS2.l4.words[QS2.l4.words.length - 1].start, rk = prog(t, lw4, lw4 + 0.5, ease.outCubic);
    if (rk > 0) { L.col.fillStyle = rgba(QH.hong, 0.92); pathSmooth(L.col, blobPts(bx, by - 4, 3 + 8 * rk, 77, 0.2, 24)); L.col.fill(); }
    for (const c of [L.wet, L.dry, L.col]) c.setTransform(1, 0, 0, 1, 0, 0);
    pigmentDraw(g, L, { preset: 'raw', offset: [-tx, -ty], scale: z * 0.7, seed: 3 });
    // the body curving away: shade towards the vase's edges, and beyond them the room
    qhcBodyShade(g, tx, ty, z);
    // the brush on the current petal (then on the leaves)
    let tip = null;
    const cur = petals.find(pt => pt.lp > 0 && pt.lp < 1) || (P < 18 && petals[Math.floor(P)]);
    if (cur) { const q = cutPolyline(cur.P, Math.max(0.02, cur.lp || 0)); tip = q[q.length - 1]; }
    else if (k4 < 1 && t < lw4) { const a = k4 * 4 % 1; tip = [bx - 14 + 40 * Math.cos(a * 6), by + 70 + 30 * Math.sin(a * 6)]; }
    else if (rk > 0) tip = [bx, by - 4 - 30 * ease.outCubic(prog(t, lw4 + 0.1, lw4 + 0.7))];
    if (tip) {
      const Hs = QS2.H; Hs.clear();
      qhcHand(Hs, tx + tip[0] * z, ty + tip[1] * z, -Math.PI / 2 + 0.5, Math.min(1.9, 0.34 * z), { tk, side: 1 });
      qhSticker(g, Hs, { preset: 'raw', seed: 21, scale: 1.2 });
    }
    qhcLyrics(g, f, 260, 200);
  },
});
