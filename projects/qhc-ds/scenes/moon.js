// 镜头 10 — 捞月（副歌第 7–10 句）。第二遍副歌：和镜头 8 同一个构图，雨更大、幕布湿透；
// "月色"——镜头转到幕后接雨的铜盆，盆里的水里有一轮月，他伸手把月亮捞起来，
// 月亮碎成一片白，"晕开"时那片白顺着幕布漫开。
MV.scene('moon', {
  render(g, f) {
    const t = f.t;
    const L2 = f.lyrics.get('天青', 1), L3 = f.lyrics.get('而我', 1);
    const L4 = f.lyrics.get('月色'), L5 = f.lyrics.get('晕开');
    const wet = clamp(0.55 + 0.40 * prog(t, f.from, f.from + 6));
    const light = clamp(0.94 - 0.20 * wet + 0.03 * noise1(t * 4.3, 9));
    const lx = W * 0.50, ly = H * 0.62;
    const feet = [W * 0.50, H * 0.660], s = 1.15;
    const rain = clamp(0.75 + 0.45 * prog(t, f.from, f.from + 4));
    const pose = QHC.puppetPose(t, { arm: 0.35, smile: 0 });
    const blend = prog(t, L4.words[0].start - 0.5, L4.words[0].start + 0.6, ease.inOutQuad);
    const scoop = prog(t, L4.words[2].start, L4.words[4].end, ease.inOutQuad);
    const flood = prog(t, L5.words[0].start, L5.words[1].end + 0.4, ease.inOutCubic);

    // ——— 前半：幕布上的雨（和镜头 8 同一构图）
    if (blend < 1) {
      g.save(); g.globalAlpha = 1 - blend;
      screenCloth(g, { light, lx, ly, r0: H * 0.95, wet, seed: 11 });
      QHC.puppetShadow(g, { x: feet[0], y: feet[1], s, pose, light: [lx, ly], z: 34, L: 900, pen: 26, res: 1, blur: 0.8 });
      QHC.rodGrip(g, { lx, ly, feet, s, u: 0.30, zHand: 130 });
      const hits = [L2.words[0].start].concat(f.audio.events('kick', f.from, f.to).map(e => e.t));
      screenRain(g, t, { amount: rain, hits, n: 240, len: 74, wind: 0.12, seed: 9, life: 3.2, head: true });
      g.restore();
    }

    // ——— 后半：幕后接雨的铜盆，水里的月亮
    if (blend > 0.001) {
      g.save(); g.globalAlpha = blend;
      const lampGlow = g.createRadialGradient(W * 0.30, H * 0.16, 0, W * 0.30, H * 0.16, H * 1.15);
      lampGlow.addColorStop(0, 'rgba(255,214,158,0.46)'); lampGlow.addColorStop(0.5, 'rgba(255,196,140,0.16)');
      lampGlow.addColorStop(1, 'rgba(255,190,130,0)');
      const bg = g.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.7);
      bg.addColorStop(0, '#6A4C33'); bg.addColorStop(0.5, '#3A2820'); bg.addColorStop(1, '#1A1216');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = lampGlow; g.fillRect(0, 0, W, H);
      const bx = W * 0.50, by = H * 0.70, br = 330;
      QHC.basin(g, { r: br, s: 1, lit: 0.55 });
      g.save(); g.translate(bx, by);
      g.beginPath(); g.ellipse(0, 0, br * 0.94, br * 0.26, 0, 0, TAU); g.clip();
      const wg = g.createLinearGradient(0, -br * 0.3, 0, br * 0.3);
      wg.addColorStop(0, 'rgba(158,124,88,0.95)'); wg.addColorStop(1, 'rgba(74,52,46,0.95)');
      g.fillStyle = wg; g.fillRect(-br, -br * 0.4, br * 2, br * 0.8);
      // 水里的月亮：捞之前是完整的一轮，捞起来就碎开
      const mr = 56 * (1 - 0.22 * scoop), mx = -40 + 180 * scoop, my = -6 - 30 * scoop;
      if (scoop < 1) {
        const col = g.createLinearGradient(mx, my - 150, mx, my + 60);      // 水面上那道竖着的倒影
        col.addColorStop(0, 'rgba(255,232,190,0)');
        col.addColorStop(0.45, `rgba(255,234,194,${(0.30 * (1 - scoop * 0.5)).toFixed(3)})`);
        col.addColorStop(1, 'rgba(255,228,182,0)');
        g.fillStyle = col; g.fillRect(mx - mr * 1.5, my - 150, mr * 3, 210);
        const mg = g.createRadialGradient(mx, my, 0, mx, my, mr * 2.1);
        mg.addColorStop(0, `rgba(255,246,218,${(0.98 * (1 - scoop * 0.75)).toFixed(3)})`);
        mg.addColorStop(0.35, `rgba(255,236,192,${(0.62 * (1 - scoop * 0.6)).toFixed(3)})`);
        mg.addColorStop(0.7, `rgba(255,228,180,${(0.26 * (1 - scoop * 0.6)).toFixed(3)})`);
        mg.addColorStop(1, 'rgba(255,220,170,0)');
        g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr * 2.1, 0, TAU); g.fill();
      }
      for (let i = 0; i < 5; i++) {                                     // 绞碎的月：一圈圈涟漪
        const rr = (i + 1) * 40 + scoop * 130, a = 0.42 * scoop * Math.max(0, 1 - i / 6);
        if (a <= 0.01) continue;
        g.strokeStyle = `rgba(255,232,190,${a.toFixed(3)})`; g.lineWidth = 2.6;
        g.beginPath(); g.ellipse(mx, my, rr, rr * 0.3, 0, 0, TAU); g.stroke();
      }
      // 雨落在盆里
      for (let i = 0; i < 26; i++) {
        const ph = ((t * 1.6 + hash(i, 41) * 2) % 2) / 2;
        const rr = 30 + 300 * hash(i, 43), an = hash(i, 44) * TAU;
        const x = Math.cos(an) * rr, y = Math.sin(an) * rr * 0.3;
        g.strokeStyle = `rgba(255,240,210,${(0.20 * (1 - ph)).toFixed(3)})`; g.lineWidth = 1.6;
        g.beginPath(); g.ellipse(x, y, 6 + ph * 46, (6 + ph * 46) * 0.3, 0, 0, TAU); g.stroke();
      }
      g.restore();
      g.restore();
      // 他的手伸进盆里把月亮捞起来（离幕远，虚而大）
      if (scoop < 0.98) QHC.shadowed(g, c => {
        c.save(); c.translate(bx + 40 - 90 * scoop, by - 210 + 150 * scoop); c.rotate(0.5);
        QHC.handPress(c, { s: 1.5, curl: 0.9 });
        c.restore();
      }, null, c => {
        c.save(); c.translate(bx + 40 - 90 * scoop, by - 210 + 150 * scoop); c.rotate(0.5);
        QHC.handPress(c, { s: 1.5, curl: 0.9, edge: (gg, pp) => {
          pp.fingers.forEach(ff => hideEdge(gg, ff, 18, { alpha: 0.26 }));
          hideEdge(gg, pp.thumb, 19, { alpha: 0.28 });
        } });
        c.restore();
      }, { light: [lx, ly], z: 260, L: 900, pen: 30, res: 0.5, alpha: clamp(scoop * 3) * (1 - clamp((scoop - 0.75) / 0.25)) * blend });
    }

    // ——— "晕开"：那片白顺着幕布漫开
    if (flood > 0.001) {
      const gr = g.createRadialGradient(W * 0.5, H * 0.68, 0, W * 0.5, H * 0.62, Math.hypot(W, H) * (0.25 + 0.95 * flood));
      gr.addColorStop(0, `rgba(255,244,220,${(0.85 * flood).toFixed(3)})`);
      gr.addColorStop(0.55, `rgba(255,238,204,${(0.45 * flood).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(255,232,195,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }

    carveLyrics(g, f, {
      size: 66, y: Math.round(H * 0.185), weight: 500, fade: 1 - 0.5 * flood,
      lines: ['天青', '而我', '月色', '晕开'].map(q => (q === '天青' || q === '而我') ? f.lyrics.get(q, 1).i : f.lyrics.get(q).i),
    });
    return { shake: 1.7 * f.a.kick, vignette: 0.34 + 0.14 * wet - 0.2 * flood, flash: 0.25 * flood };
  },
});
