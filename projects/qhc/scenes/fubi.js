// S12 fubi — L19 (the long line). Early morning, the blue river. At the landing he pushes a small boat off with
// the vase in it, wrapped in cloth; it drifts out towards the far shore and the mist. The 海水 border of the vase's
// foot rises from the bottom of the frame, a row on every kick, crests curling; on the last word it covers all.
const QS12 = {};
MV.scene('fubi', {
  init(MV) { QS12.L = pigmentLayers(); QS12.line = MV.lyrics.get('就当我'); QS12.S = qhStickerLayers(); },
  render(g, f) {
    const t = f.t, tk = f.tick, tq = f.tq, L = QS12.L, A = f.audio;
    L.clear();
    const drift = prog(t, f.from + 0.6, f.to, ease.inOutQuad);
    qhcRiverWorld(L, { cam: 0, sky: 0.45, t, tk, boat: false, smoke: null });
    // the boat drifting away with its bundle, the mist over the far water
    const bx = lerp(760, 1420, drift), by = lerp(900, 640, ease.outQuad(drift)), bs = lerp(2.1, 0.8, drift);
    const S = QS12.S; S.clear();
    qhcBoat(S, bx, by, bs, { man: false, pole: false, tk, lw: 3.4 * Math.max(0.6, bs / 2) });
    const bundle = qhSmooth([[bx - 40 * bs, by + 2], [bx - 36 * bs, by - 44 * bs], [bx - 8 * bs, by - 70 * bs], [bx + 20 * bs, by - 50 * bs], [bx + 36 * bs, by + 2]], true, 2);
    qhFill(S.wet, bundle, QH.D.dan); qhLine(S.dry, bundle, { w: 3 * Math.max(0.6, bs / 2), a: 0.9, closed: true, tk, seed: 9 });
    qhLine(S.dry, [[bx - 20 * bs, by - 60 * bs], [bx - 2 * bs, by - 82 * bs], [bx + 10 * bs, by - 60 * bs]], { w: 3 * Math.max(0.6, bs / 2), a: 0.9, tk, seed: 10 });
    for (let k = 0; k < 3; k++) { const y = 470 + k * 40; qhLine(L.dry, [[900 + k * 80, y], [1900, y - 6]], { w: 2, a: 0.35, dot: false, seed: 20 + k, tk, jit: 1 }); }
    // him at the landing, arms out after the push
    qhcPainterStand(S, 430, 850, 330, { tk });
    pigmentDraw(g, L, { preset: 'cobalt', seed: 8 });
    qhSticker(g, S, { preset: 'cobalt', seed: 8, spots: 0 });
    // the rising sea: rows of the 海水 pattern, one more on each kick, all of it by the last word
    const kicks = A.events('kick', f.from, t).length, last = QS12.line.words[QS12.line.words.length - 1].start;
    const level = Math.max(clamp(kicks / 16) * 0.55, prog(t, last - 0.5, last + 0.35, ease.inQuad));
    const top = lerp(H + 30, -160, level);
    if (level > 0) {
      S.clear();
      const crest = []; for (let x = -40; x <= W + 40; x += 20) crest.push([x, top + 24 * Math.sin(x / 90 + tq * 3)]);
      const sea = crest.concat([[W + 40, H + 40], [-40, H + 40]]);
      qhFill(S.wet, sea, QH.D.ying);
      qhLine(S.dry, crest, { w: 3.4, a: 0.9, dot: false, seed: 30, tk });
      S.dry.save(); qhPath(S.dry, sea); S.dry.clip();
      qhWaves(-60, W + 60, top + 30, top + 30 + 5 * 64, (tq * 0.4) % 1, { rows: 5, aw: 150 }).forEach((p, i) => qhLine(S.dry, p, { w: 2.6, a: 0.82, dot: false, seed: 40 + i, tk }));
      S.dry.restore();
      for (let k = 0; k < 7; k++) { const x = k * 300 + 80 + 30 * Math.sin(tq + k), y = top + 20 * Math.sin(x / 90 + tq * 3); qhLine(S.dry, qhCurl(x, y - 30, 30, 1.2, 1, Math.PI * 0.9), { w: 3, a: 0.9, seed: 60 + k, tk }); }
      qhSticker(g, S, { preset: 'cobalt', seed: 8, spots: 0.3 });
    }
    qhcLyrics(g, f, 1000, 96, { size: 58 });
  },
});
