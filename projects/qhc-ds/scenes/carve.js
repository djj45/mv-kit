// 镜头 2 — 走刀（主歌第 1、2 句）。幕后逆光：一张皮放在桌上，刻刀沿着折枝牡丹的线一刀一刀走。
// 这一镜只刻到花心之前（茎 + 两片叶），花瓣留给镜头 3 的"点朱砂"。
// 刀走在哪由唱到哪个字决定（两句 12 个字）；唱到"青花"时，靛青从刀缝里渗进来——全片第一抹颜色。
MV.scene('carve', {
  render(g, f) {
    const t = f.t;
    const cam = [lerp(0, -20, f.p), lerp(0, -9, f.p)];
    const lx = W * 0.055 - cam[0], ly = H * 0.79 - cam[1];
    const light = clamp(0.90 + 0.045 * noise1(t * 5.1, 3) + 0.06 * f.a.rms);
    screenCloth(g, { light, lx, ly, r0: H * 0.85, seed: 7, offset: cam });
    lamp(g, lx, ly, t, { scale: 1.15, light: 1, h: 82 });

    // 刀走到哪：由唱到的字推进；只走整条线的前 24%（茎 + 两片叶）
    const words = f.lyrics.get('素胚').words.concat(f.lyrics.get('笔锋').words);
    let k = 0;
    for (const w of words) k += clamp((t - w.start) / Math.max(0.05, w.end - w.start)) / words.length;
    const u = k * 0.24;
    const qing = f.lyrics.get('素胚').words[5];                 // "青"
    const dye = prog(t, qing.start, qing.end + 0.6, ease.outCubic);

    const sheet = { x: W * 0.54 - cam[0], y: H * 0.575 - cam[1], rot: -0.045 };
    const cos = Math.cos(sheet.rot), sin = Math.sin(sheet.rot);
    const pe = QHC.peony({ size: 268, seed: 4 });
    const pat = pe.path.map(([x, y]) => [sheet.x + x * cos - y * sin, sheet.y + x * sin + y * cos]);
    const seg = polylineUpTo(pat, u);
    const tip = seg.length ? seg[seg.length - 1] : pat[0];
    const back = seg.length > 9 ? seg[seg.length - 9] : (seg.length ? seg[0] : [tip[0] - 1, tip[1]]);   // 拉开 9 个点算切线，免得刀抖
    const raw = Math.atan2(tip[1] - back[1], tip[0] - back[0]);
    const ang = lerp(-0.55, raw, 0.75);                                   // 手腕只肯转这么多，刀不会打转
    const local = polylineUpTo(pe.path, u);

    // 皮、手、刀各在离幕不同的深度上，会被中心投影推到不同的屏幕位置。
    // 先算一个点"落在幕布上"的屏幕位置，再按每一层的 k 反投影回去，刀尖才咬得住刀缝。
    const LP = 900, zSheet = 55, zPress = 110, zKnife = 220;
    const kOf = z => LP / (LP - z);
    const toLayer = (p, z) => { const r = kOf(zSheet) / kOf(z); return [lx + (p[0] - lx) * r, ly + (p[1] - ly) * r]; };
    const tipAt = toLayer(tip, zKnife);
    const pressAt = toLayer([sheet.x - 282, sheet.y + 246], zPress);

    // 皮（贴着幕布，最实；厚薄不匀，薄的几处透光）
    QHC.shadowed(g, c => {
      c.save(); c.translate(sheet.x, sheet.y); c.rotate(sheet.rot);
      QHC.hideSheet(c, 600, 640, { seed: 8, wob: 15 });
      c.fillStyle = 'rgba(34,21,25,0.87)'; c.fill();                      // 半透明的皮：刀才压得住它
      c.save(); c.clip();
      const thin = c.createLinearGradient(-330, 0, 330, 0);               // 靠灯的一侧薄一点，透过的光多
      thin.addColorStop(0, 'rgba(214,150,74,0.30)'); thin.addColorStop(0.55, 'rgba(201,135,63,0.16)');
      thin.addColorStop(1, 'rgba(201,135,63,0.05)');
      c.fillStyle = thin; c.fillRect(-340, -360, 680, 720);
      c.restore(); c.restore();
    }, c => {                                                             // 刀缝：镂空
      c.save(); c.translate(sheet.x, sheet.y); c.rotate(sheet.rot);
      cutStroke(c, pe.path, 5.2, { tick: f.tick, jitter: 0.8, upto: u });
      c.restore();
    }, c => {                                                             // 刀口的亮边 + 靛青，只画已经切过的那一段
      if (local.length < 2) return;
      c.save(); c.translate(sheet.x, sheet.y); c.rotate(sheet.rot);
      hideEdge(c, local, 7, { alpha: 0.46 });
      c.restore();
      if (dye > 0) {
        c.save(); c.translate(sheet.x, sheet.y); c.rotate(sheet.rot);
        dyeInto(c, pe.path, 5.2, { color: `rgba(42,92,143,${(0.72 * dye).toFixed(3)})`, wide: 2.1, blur: 7, upto: u });
        c.restore();
      }
    }, { light: [lx, ly], z: zSheet, L: LP, pen: 26, res: 1, blur: 0.8 });

    // 按着皮的那只手（离幕近一点，稍微虚）
    QHC.shadowed(g, c => {
      c.save(); c.translate(pressAt[0], pressAt[1]); c.rotate(0.30);
      QHC.handPress(c, { s: 1.15, curl: 0.7 });
      c.restore();
    }, null, c => {                                                       // 手指的受光边：让手看得出是手指
      c.save(); c.translate(pressAt[0], pressAt[1]); c.rotate(0.30);
      QHC.handPress(c, { s: 1.15, curl: 0.7, edge: (gg, p) => {
        p.fingers.forEach(f => hideEdge(gg, f, 15, { alpha: 0.20 }));
        hideEdge(gg, p.thumb, 16, { alpha: 0.20 });
      } });
      c.restore();
    }, { light: [lx, ly], z: zPress, L: LP, pen: 26, res: 0.5 });

    // 刻刀 + 握刀的手：刀尖永远咬在刀线上（位置已按这一层的投影反算过）
    const KL = 188;
    const place = (c, extra) => {
      c.save(); c.translate(tipAt[0], tipAt[1]); c.rotate(ang); c.translate(-KL, 6);
      QHC.knife(c, { len: KL });
      c.translate(-46, -4); c.rotate(-0.08);
      if (extra) QHC.handHold(c, { s: 0.98, edge: extra }); else QHC.handHold(c, { s: 0.98 });
      c.restore();
    };
    QHC.shadowed(g, c => place(c), null, c => place(c, (gg, pp) => {
      pp.fingers.forEach(f => hideEdge(gg, f, 12, { alpha: 0.22 }));
      hideEdge(gg, pp.thumb, 13, { alpha: 0.22 });
    }), { light: [lx, ly], z: zKnife, L: LP, pen: 26, res: 0.5 });

    carveLyrics(g, f, { size: 66, y: Math.round(H * 0.175), weight: 500, lines: ['素胚', '笔锋'].map(q => f.lyrics.get(q).i) });
    return { shake: 1.1 * f.a.kick, vignette: 0.34 + 0.16 * (1 - light) };
  },
});
