// 镜头 3 — 点朱砂（主歌第 3、4 句）。接镜头 2 的同一张桌面：刀把花瓣刻完（"瓶身"），
// 然后他换小笔，在花心点上全片的第一点红（"一如"）。
MV.scene('rouge', {
  render(g, f) {
    const t = f.t;
    const cam = [lerp(-20, -4, f.p), lerp(-9, -2, f.p)];                   // 接着上一镜的机位缓缓回位
    const lx = W * 0.055 - cam[0], ly = H * 0.79 - cam[1];
    const light = clamp(0.90 + 0.045 * noise1(t * 5.1, 3) + 0.06 * f.a.rms);
    screenCloth(g, { light, lx, ly, r0: H * 0.85, seed: 7, offset: cam });
    lamp(g, lx, ly, t, { scale: 1.15, light: 1, h: 82 });

    const LP = 900, zSheet = 55, zKnife = 220, zBrush = 200;
    const kOf = z => LP / (LP - z);
    const toLayer = (p, z) => { const r = kOf(zSheet) / kOf(z); return [lx + (p[0] - lx) * r, ly + (p[1] - ly) * r]; };
    const toScreen = p => [lx + kOf(zSheet) * (p[0] - lx), ly + kOf(zSheet) * (p[1] - ly)];

    const sheet = { x: W * 0.54 - cam[0], y: H * 0.575 - cam[1], rot: -0.045 };
    const cos = Math.cos(sheet.rot), sin = Math.sin(sheet.rot);
    const at = ([x, y]) => [sheet.x + x * cos - y * sin, sheet.y + x * sin + y * cos];
    const pe = QHC.peony({ size: 268, seed: 4 });
    const pat = pe.path.map(at);

    // 刀：从上一镜停下的地方（24%）把花瓣刻完，第一句唱完时收刀
    const L1 = f.lyrics.get('瓶身'), L2 = f.lyrics.get('一如');
    let k = 0;
    for (const w of L1.words) k += clamp((t - w.start) / Math.max(0.05, w.end - w.start)) / L1.words.length;
    const u = lerp(0.24, 1, ease.inOutQuad(clamp(k)));
    const seg = polylineUpTo(pat, u);
    const tip = seg.length ? seg[seg.length - 1] : pat[0];
    const back = seg.length > 9 ? seg[seg.length - 9] : (seg.length ? seg[0] : [tip[0] - 1, tip[1]]);
    const ang = lerp(-0.55, Math.atan2(tip[1] - back[1], tip[0] - back[0]), 0.75);
    const local = polylineUpTo(pe.path, u);

    // 皮：镂空的花 + 靛青
    QHC.shadowed(g, c => {
      c.save(); c.translate(sheet.x, sheet.y); c.rotate(sheet.rot);
      QHC.hideSheet(c, 600, 640, { seed: 8, wob: 15 });
      c.fillStyle = 'rgba(34,21,25,0.87)'; c.fill();
      c.save(); c.clip();
      const thin = c.createLinearGradient(-330, 0, 330, 0);
      thin.addColorStop(0, 'rgba(214,150,74,0.30)'); thin.addColorStop(0.55, 'rgba(201,135,63,0.16)');
      thin.addColorStop(1, 'rgba(201,135,63,0.05)');
      c.fillStyle = thin; c.fillRect(-340, -360, 680, 720);
      c.restore(); c.restore();
    }, c => {
      c.save(); c.translate(sheet.x, sheet.y); c.rotate(sheet.rot);
      cutStroke(c, pe.path, 5.2, { tick: f.tick, jitter: 0.8, upto: u });
      c.restore();
    }, c => {
      if (local.length < 2) return;
      c.save(); c.translate(sheet.x, sheet.y); c.rotate(sheet.rot);
      hideEdge(c, local, 7, { alpha: 0.46 });
      dyeInto(c, pe.path, 5.2, { color: 'rgba(42,92,143,0.66)', wide: 2.1, blur: 7, upto: u });
      c.restore();
    }, { light: [lx, ly], z: zSheet, L: LP, pen: 26, res: 1, blur: 0.8 });

    // 按着皮的手
    const pressAt = toLayer([sheet.x - 282, sheet.y + 246], 110);
    QHC.shadowed(g, c => {
      c.save(); c.translate(pressAt[0], pressAt[1]); c.rotate(0.30); QHC.handPress(c, { s: 1.15, curl: 0.7 }); c.restore();
    }, null, c => {
      c.save(); c.translate(pressAt[0], pressAt[1]); c.rotate(0.30);
      QHC.handPress(c, { s: 1.15, curl: 0.7, edge: (gg, p) => {
        p.fingers.forEach(ff => hideEdge(gg, ff, 15, { alpha: 0.20 }));
        hideEdge(gg, p.thumb, 16, { alpha: 0.20 });
      } });
      c.restore();
    }, { light: [lx, ly], z: 110, L: LP, pen: 26, res: 0.5 });

    // 刻刀：花瓣刻完就收（收刀 = 抬起并退到画面外）
    const away = prog(t, L1.words[L1.words.length - 1].start, L2.words[0].start + 0.4, ease.inOutQuad);
    if (away < 1) {
      const KL = 188;
      const kd = [tip[0] + away * 420, tip[1] - away * 520];
      const kat = toLayer(kd, zKnife);
      const place = (c, extra) => {
        c.save(); c.translate(kat[0], kat[1]); c.rotate(ang - away * 0.5); c.translate(-KL, 6);
        QHC.knife(c, { len: KL });
        c.translate(-46, -4); c.rotate(-0.08);
        QHC.handHold(c, extra ? { s: 0.98, edge: extra } : { s: 0.98 });
        c.restore();
      };
      QHC.shadowed(g, c => place(c), null, c => place(c, (gg, pp) => {
        pp.fingers.forEach(ff => hideEdge(gg, ff, 12, { alpha: 0.22 }));
        hideEdge(gg, pp.thumb, 13, { alpha: 0.22 });
      }), { light: [lx, ly], z: zKnife, L: LP, pen: 26, res: 0.5, alpha: 1 - away * 0.9 });
    }

    // 朱砂：小笔进画，在花心点下去（"初妆"那一拍）
    const dotAt = L2.words[3].start, dot = prog(t, dotAt, dotAt + 0.30);
    if (dot > 0) {
      const heart = at(pe.parts.head);
      const hs = toScreen(heart), hsl = toLayer([heart[0] + 8, heart[1] - 6], zBrush);
      const bAng = -2.2 + 0.35 * dot;                                      // 笔尖朝左下
      const place = (c, extra) => {
        c.save(); c.translate(hsl[0], hsl[1]); c.rotate(bAng);
        QHC.brush(c, { len: 190, s: 1.05, tip: dot < 0.75 ? 'rgba(214,70,54,0.9)' : null });
        c.translate(-112, 8); c.rotate(0.08);
        QHC.handHold(c, extra ? { s: 0.9, edge: extra } : { s: 0.9 });
        c.restore();
      };
      QHC.shadowed(g, c => place(c), null, c => place(c, (gg, pp) => {
        pp.fingers.forEach(ff => hideEdge(gg, ff, 11, { alpha: 0.20 }));
        hideEdge(gg, pp.thumb, 12, { alpha: 0.20 });
      }), { light: [lx, ly], z: zBrush, L: LP, pen: 26, res: 0.5 });
      const r = 16 + 46 * ease.outCubic(dot);                              // 那一点红慢慢洇开
      const gr = g.createRadialGradient(hs[0], hs[1], 0, hs[0], hs[1], r);
      gr.addColorStop(0, `rgba(214,74,58,${(0.95 * dot).toFixed(3)})`);
      gr.addColorStop(0.55, `rgba(176,58,46,${(0.7 * dot).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(150,44,36,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(hs[0], hs[1], r, 0, TAU); g.fill();
    }

    carveLyrics(g, f, { size: 66, y: Math.round(H * 0.175), weight: 500, lines: ['瓶身', '一如'].map(q => f.lyrics.get(q).i) });
    return { shake: 1.1 * f.a.kick, vignette: 0.34 + 0.16 * (1 - light), flash: 0.06 * pulse(t, dotAt, 0.14) };
  },
});
