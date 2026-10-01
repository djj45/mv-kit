// 镜头 11 — 你眼带…（副歌最后两句）。白光退下去，幕布上只剩影人一个人：他松开了签子，
// 她自己站着。最后一刀——眼睛弯起来。他退到幕后，影子变大变虚；幕布前面走进来一个女人的剪影。
// 灯芯捻小、灭掉，黑一小节，右下角落一方朱砂小印。
MV.scene('smile', {
  render(g, f) {
    const t = f.t;
    const L1 = f.lyrics.get('如传'), L2 = f.lyrics.get('你眼');
    const drain = prog(t, f.from, f.from + 1.8, ease.inOutQuad);                 // 白光退下去
    const out = prog(t, L2.end + 0.6, L2.end + 1.6, ease.inOutQuad);              // 灯捻小、灭
    const light = clamp(lerp(1.16, 0.93, drain) * (1 - out));
    const lx = W * 0.50, ly = H * 0.62;
    const feet = [W * 0.50, H * 0.660], s = 1.15;
    const smile = prog(t, L2.words[0].start + 0.15, L2.words[0].start + 0.8, ease.outCubic);
    const letGo = prog(t, L1.words[2].start, L1.words[5].start, ease.inOutQuad);
    const pose = QHC.puppetPose(t, { arm: 0.35 * (1 - letGo), smile, rodA: 1 - letGo });

    screenCloth(g, { light, lx, ly, r0: H * 0.95, wet: 0.55 * (1 - drain) + 0.25 * out });
    if (light > 0.05) {
      QHC.puppetShadow(g, { x: feet[0], y: feet[1], s, pose, light: [lx, ly], z: 34, L: 900, pen: 26, res: 1, blur: 0.8, alpha: clamp(light * 1.2) });
      // 他退到幕后：影子变大、变虚（离幕越远，越大越虚）
      const away = prog(t, L1.words[6].start, L2.words[1].start, ease.inOutQuad);
      if (away > 0.02 && away < 1) QHC.shadowed(g, c => {
        c.save();
        c.translate(feet[0] + 30, feet[1] - 60 + 560 * away);
        const sc = 1 + 1.5 * away; c.scale(sc, sc);
        c.fillStyle = 'rgba(22,14,20,0.92)';
        c.beginPath(); c.ellipse(0, -212, 64, 78, 0, 0, TAU); c.fill();                       // 头
        c.beginPath(); c.moveTo(-168, 40); c.quadraticCurveTo(-132, -150, 0, -160);
        c.quadraticCurveTo(140, -150, 176, 40); c.closePath(); c.fill();                      // 肩
        c.restore();
      }, null, null, { light: [lx, ly], z: 220 + 460 * away, L: 900, pen: 30, res: 0.5, alpha: (1 - away) * 0.95 });
    }
    // 幕布前面走进来的那个女人（在幕前，所以是实的、压在最上层）
    const enter = prog(t, L1.words[3].start, L2.words[0].start, ease.inOutQuad);
    if (enter > 0.01) QHC.figureBack(g, {
      x: lerp(W * 0.16, W * 0.33, enter), y: H * 0.995, h: 830, s: 1,
      sway: 0.55 * Math.sin(t * 0.9) * (1 - enter),
    });
    // 灯灭之后：右下角一方朱砂小印
    const seal = prog(t, L2.end + 1.2, L2.end + 2.0, ease.outCubic);
    if (seal > 0.01) {
      const sx = W * 0.855, sy = H * 0.80, w = 78, h = 210;
      g.save(); g.globalAlpha = seal;
      g.fillStyle = `rgba(176,58,46,${(0.92 * seal).toFixed(3)})`;
      const r = 12;
      g.beginPath();
      g.moveTo(sx - w / 2 + r, sy); g.lineTo(sx + w / 2 - r, sy); g.quadraticCurveTo(sx + w / 2, sy, sx + w / 2, sy + r);
      g.lineTo(sx + w / 2, sy + h - r); g.quadraticCurveTo(sx + w / 2, sy + h, sx + w / 2 - r, sy + h);
      g.lineTo(sx - w / 2 + r, sy + h); g.quadraticCurveTo(sx - w / 2, sy + h, sx - w / 2, sy + h - r);
      g.lineTo(sx - w / 2, sy + r); g.quadraticCurveTo(sx - w / 2, sy, sx - w / 2 + r, sy);
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(243,230,203,0.95)';
      g.font = `600 52px ${SHADOW.FONT_SEAL}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      ['青', '花', '瓷'].forEach((ch, i) => g.fillText(ch, sx, sy + 46 + i * 60));
      g.restore();
    }
    carveLyrics(g, f, {
      size: 70, y: Math.round(H * 0.185), weight: 500, fade: 1 - out,
      lines: ['如传', '你眼'].map(q => f.lyrics.get(q).i),
    });
    return { shake: (1.3 - 1.3 * out) * f.a.kick, vignette: 0.34 + 0.3 * (1 - light) + 0.2 * out };
  },
});
