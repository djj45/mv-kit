// S3 tanxiang — L5–L6. The workshop at dusk. He sits at the low desk painting; the vase on its turntable shows
// the side he already painted (panel B: him in the boat). Incense smoke curls up from the censer on the sill and
// slips out through the 冰裂纹 window. L6: the smoke gathers by the window into her — 高髻, 披帛 lifting — he lifts
// his brush and holds still; at the end of the line she comes apart again.
const QS3 = {};
MV.scene('tanxiang', {
  init(MV) {
    const L = pigmentLayers();
    const a = qhcWorkshop(L, { win: [130, 120, 610, 600], floor: 760 });
    qhcDesk(L, 1050, 1760, 800, { floor: 930 });
    qhcTurntable(L, 1400, 792, 150);
    QS3.a = a;
    QS3.bg = mk(W, H); QS3.bg.getContext('2d').drawImage(pigmentComp(L, { preset: 'raw', seed: 9 }), 0, 0);
    QS3.S = qhStickerLayers();
    QS3.l6 = MV.lyrics.get('心事');
  },
  render(g, f) {
    const t = f.t, tk = f.tick, tq = f.tq, S = QS3.S;
    g.drawImage(QS3.bg, 0, 0);
    // the vase on the turntable, panel B towards us, turning a hair
    qhcVase(g, { tex: 'raw', cx: 1400, top: 386, h: 404, rot: Math.PI - 0.25 + 0.05 * f.lt, shadow: 0 });
    S.clear();
    // smoke: wisps born every 0.9 s from the censer, rising to the window and out through the lattice
    const [sx, sy] = QS3.a.smoke, l6 = QS3.l6, t6 = l6.words[0].start, t6e = l6.end;
    const gather = prog(t, t6 - 0.3, t6 + 0.9, ease.inOutQuad), scatter = prog(t, t6e - 0.35, t6e + 0.5, ease.inQuad);
    for (let i = -4; i < 8; i++) {
      const born = f.from + i * 0.9, age = tq - born; if (age <= 0) continue;
      const paths = qhSmoke(sx + 6 * noise1(i, 3), sy, 520, age, 100 + i, { rise: 150, amp: 34, drift: -0.3 });
      const fade = clamp(1.4 - age / 4) * (1 - 0.8 * gather * (1 - scatter));
      S.dry.globalAlpha = fade;
      paths.forEach((p, k) => qhLine(S.dry, p.map(([x, y]) => [x - (sy - y) * 0.12, y]), { w: 3, a: 0.5, tk, seed: 300 + i * 7 + k, dot: false, jit: 1.2 }));
      S.dry.globalAlpha = 1;
    }
    // her, out of the smoke, by the window
    const she = gather * (1 - scatter);
    if (she > 0.01) {
      S.dry.globalAlpha = S.wet.globalAlpha = she;
      const drift = scatter * 60;
      qhcLady(S, 760 + 10 * Math.sin(tq * 1.7), 730 - drift, 470, { tk, wind: 0.6 + 0.3 * Math.sin(tq * 2), jit: 1.4, lw: 2.8, smokeOnly: true });
      S.dry.globalAlpha = S.wet.globalAlpha = 1;
    }
    // him at the desk; the brush lifts and stops when she appears
    const arm = lerp(0.55 + 0.12 * Math.sin(tq * 5), 1, prog(t, t6 - 0.2, t6 + 0.3, ease.outCubic));
    qhcPainterSit(S, 1150, 1000, 1.0, { tk, arm });
    qhSticker(g, S, { preset: 'raw', seed: 13 });
    qhcLyrics(g, f, 1800, 150);
  },
});
