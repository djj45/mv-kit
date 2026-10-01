// 镜头 7 — 穿幕（主歌第 12、13 句）。一缕靛青从指间飘散成烟，飘向幕布；
// 镜头跟着它穿过那层布——第一次从正面看这块布：一个空白的亮面（"去到"）。
MV.scene('drift', {
  render(g, f) {
    const t = f.t;
    const A = f.lyrics.get('你的'), B = f.lyrics.get('去到');
    const travel = prog(t, A.words[2].start, B.words[0].start + 0.5, ease.inOutQuad);
    const through = prog(t, B.words[2].start, B.words[5].start, ease.inOutCubic);
    const front = clamp(through * 1.4 - 0.4);                                  // 最后一段已经在幕前

    const lx = W * 0.20, ly = H * 0.70;
    const light = clamp(0.62 + 0.42 * through + 0.05 * noise1(t * 4.7, 23));
    screenCloth(g, { light: clamp(light + 0.5 * Math.sin(Math.PI * clamp((through - 0.15) / 0.7))), lx, ly, r0: H * 0.85, seed: 27, wet: 0.10 * front });
    lamp(g, lx, ly, t, { scale: 1.05, light: 1 - front, h: 62 });

    // 幕后：她的手（离幕远 → 又大又虚）和从指间出去的那缕靛青
    if (front < 0.98) {
      g.save(); g.globalAlpha = 1 - front;
      QHC.shadowed(g, c => {
        c.save(); c.translate(W * 0.06, H * 0.80); c.rotate(-0.35); c.scale(1.1, 1.1);
        QHC.handPress(c, { s: 1.1, curl: 0.5 });
        c.restore();
      }, null, null, { light: [lx, ly], z: 300, L: 900, pen: 30, res: 0.5 });
      // 那一缕：从指尖到幕布上的落点
      const x0 = W * 0.14, y0 = H * 0.70;
      const landX = W * 0.66, landY = H * 0.44;
      const head = [lerp(x0, landX, travel), lerp(y0, landY, travel) - 40 * Math.sin(Math.PI * travel)];
      g.save(); g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const pts = [];
        for (let k2 = 0; k2 <= 16; k2++) {
          const u = k2 / 16;
          const ax = lerp(x0, head[0], u), ay = lerp(y0, head[1], u) - Math.sin(Math.PI * u) * (70 + i * 4);
          pts.push([ax + fbm1(u * 3 + t * 0.6, i * 7, 3) * (10 + 26 * u) + (i - 3) * 3.5, ay + (hash(i, k2, 5) - 0.5) * 5]);
        }
        g.strokeStyle = `rgba(38,84,138,${(0.46 * (1 - i / 9) * clamp(travel * 1.6)).toFixed(3)})`;
        g.lineWidth = 3.0 - i * 0.25;
        g.beginPath(); pts.forEach(([x, y], k3) => (k3 ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      }
      g.fillStyle = `rgba(60,110,170,${(0.5 * clamp(travel * 2)).toFixed(3)})`;
      g.beginPath(); g.ellipse(head[0], head[1], 14 + 10 * travel, 10 + 8 * travel, 0, 0, TAU); g.fill();
      g.restore();
      g.restore();
    }
    // 穿过幕布的那一下：整个画面被光冲白
    const bloom = Math.sin(Math.PI * clamp((through - 0.15) / 0.7));
    if (bloom > 0.01) {
      const gr = g.createRadialGradient(W * 0.66, H * 0.44, 0, W * 0.66, H * 0.44, Math.hypot(W, H) * 0.75);
      gr.addColorStop(0, `rgba(255,244,220,${(0.92 * bloom).toFixed(3)})`);
      gr.addColorStop(0.5, `rgba(255,236,198,${(0.5 * bloom).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(255,230,190,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    // 已经在幕前：空白的亮面 + 刚要落下来的雨
    if (front > 0.01) {
      g.save(); g.globalAlpha = front;
      screenRain(g, t, { amount: 0.25 * front, hits: [], n: 60, len: 60, wind: 0.1, seed: 31 });
      g.restore();
    }
    const band = [W * 0.5 - 540, H * 0.185 - 90, W * 0.5 + 540, H * 0.185 + 40];
    carveLyrics(g, f, {
      size: 66, y: Math.round(H * 0.185), weight: 500, lead: 0.3, fade: 1 - 0.55 * bloom,
      lines: ['你的', '去到'].map(q => f.lyrics.get(q).i),
    });
    return { shake: 0.9 * f.a.kick, vignette: 0.36 - 0.2 * bloom + 0.16 * (1 - light), flash: 0.30 * bloom };
  },
});
