// 镜头 5 — 搁刀（主歌第 7 句）。推近到桌面：画稿上她的脸只刻了一半，刀停在半途。
// 他把刀放下——刀尖上那一点亮光暗掉（"宣纸"）。
MV.scene('half', {
  render(g, f) {
    const t = f.t;
    const lx = W * 0.10, ly = H * 0.84;
    const light = clamp(0.88 + 0.04 * noise1(t * 4.4, 5) + 0.05 * f.a.rms);
    screenCloth(g, { light, lx, ly, r0: H * 0.78, seed: 13 });
    lamp(g, lx, ly, t, { scale: 1.05, light: 1, h: 70 });

    const LP = 900, zPaper = 60, zKnife = 210;
    const kOf = z => LP / (LP - z);
    const toLayer = (p, z) => { const r = kOf(zPaper) / kOf(z); return [lx + (p[0] - lx) * r, ly + (p[1] - ly) * r]; };

    // 画稿：一张纸，左半边是刻好的眉、眼、鼻、半张嘴
    const px = W * 0.55, py = H * 0.50, pr = -0.03;
    const cos = Math.cos(pr), sin = Math.sin(pr);
    const at = ([x, y]) => [px + x * cos - y * sin, py + x * sin + y * cos];
    const faceLocal = [
      [[-150, -150], [-108, -176], [-56, -168], [-16, -140]],                  // 眉
      [[-140, -96], [-84, -104], [-30, -88]],                                  // 眼
      [[-52, -74], [-70, -40], [-84, 4], [-74, 44]],                           // 鼻梁 / 鼻头（只画左半边）
      [[-96, 76], [-64, 84], [-30, 78]],                                       // 半个嘴
      [[-150, -150], [-186, -70], [-186, 30], [-136, 108]],                    // 脸的左轮廓
    ];
    QHC.shadowed(g, c => {
      c.save(); c.translate(px, py); c.rotate(pr);
      QHC.hideSheet(c, 900, 690, { seed: 21, wob: 8 });
      c.fillStyle = 'rgba(30,19,24,0.90)'; c.fill();
      c.save(); c.clip();
      const gr = c.createLinearGradient(-450, 0, 450, 0);
      gr.addColorStop(0, 'rgba(210,148,74,0.26)'); gr.addColorStop(0.6, 'rgba(201,135,63,0.10)');
      gr.addColorStop(1, 'rgba(201,135,63,0.03)');
      c.fillStyle = gr; c.fillRect(-460, -360, 920, 720);
      c.restore(); c.restore();
    }, c => {
      c.save(); c.translate(px, py); c.rotate(pr);
      faceLocal.forEach((pts, i) => cutStroke(c, pts, i === 4 ? 4.4 : 5.0, { tick: f.tick, jitter: 0.7 }));
      c.restore();
    }, c => {
      c.save(); c.translate(px, py); c.rotate(pr);
      faceLocal.forEach((pts, i) => hideEdge(c, pts, 6.6, { alpha: i === 4 ? 0.3 : 0.44 }));
      c.restore();
    }, { light: [lx, ly], z: zPaper, L: LP, pen: 26, res: 1, blur: 0.8 });

    // 刀：从右上落下 → 放在画稿上 → 手退出画面，刀口的亮光暗掉
    const W1 = f.lyrics.get('宣纸').words;
    const down = prog(t, W1[0].start, W1[5].start, ease.inOutQuad);            // 落刀
    const gone = prog(t, W1[6].start, W1[9].end + 0.2, ease.inOutCubic);       // 手退开
    const rest = [px + 150, py + 150];
    const kp = [lerp(px + 620, rest[0], down * (1 - gone * 0.06)), lerp(py - 460, rest[1], down)];
    const kat = toLayer(kp, zKnife);
    const kAng = lerp(-0.95, -0.22, down);
    const KL = 196;
    const place = (c, extra) => {
      c.save(); c.translate(kat[0], kat[1]); c.rotate(kAng); c.translate(-KL, 6);
      QHC.knife(c, { len: KL, lit: 1 - 0.75 * gone });
      if (gone < 0.98) {
        c.translate(-46, -4); c.rotate(-0.08);
        QHC.handHold(c, extra ? { s: 1.0, edge: extra } : { s: 1.0 });
      }
      c.restore();
    };
    QHC.shadowed(g, c => { c.save(); c.globalAlpha = 1 - gone * 0.92; place(c); c.restore(); }, null, c => {
      c.save(); c.globalAlpha = (1 - gone) * 0.9;
      place(c, (gg, pp) => {
        pp.fingers.forEach(ff => hideEdge(gg, ff, 12, { alpha: 0.24 }));
        hideEdge(gg, pp.thumb, 13, { alpha: 0.24 });
      });
      c.restore();
    }, { light: [lx, ly], z: zKnife, L: LP, pen: 26, res: 0.5 });

    carveLyrics(g, f, { size: 66, y: Math.round(H * 0.175), weight: 500, lines: ['宣纸'].map(q => f.lyrics.get(q).i) });
    return { shake: 1.0 * f.a.kick, vignette: 0.38 + 0.2 * gone + 0.14 * (1 - light) };
  },
});
