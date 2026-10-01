// 镜头 1 — 点灯（前奏，第 8–9 小节）。黑屋里点着一盏油灯：火苗起在第 9 小节头，光锥扫过，
// 幕布从暗里浮出来，先看得见经纬。桌上摊着刻刀和一张没刻完的皮（离幕远，所以又大又虚）。
// 这一镜没有歌词：第一句"素胚"在下一镜才唱。
MV.scene('lamp', {
  render(g, f) {
    const t = f.t;
    const bars = f.audio.downbeats.filter(d => d > f.from + 0.15);
    const wick = bars[0] ?? f.from + 1.6;                      // 灯芯在这里点着
    const lit = prog(t, wick, wick + 1.15, ease.outCubic);
    const flick = 0.028 * noise1(t * 7.3, 21) + 0.018 * noise1(t * 17.1, 5);
    const light = clamp(0.015 + lit * (0.95 + flick));
    const lx = W * 0.27, ly = H * 0.797;      // 灯坐\在桌面上
    screenCloth(g, { light, lx, ly, r0: H * 0.80, seed: 5 });
    lamp(g, lx, ly, t, { scale: 1.5, light: clamp(0.14 + 0.88 * lit), h: 70 });
    if (lit > 0.015) smoke(g, t, { x: lx + 6, y: ly - 82, h: H * 0.30, n: 7, alpha: 0.13 * lit, wind: 0.34, seed: 6 });
    // 桌面 + 刻刀 + 一张没刻完的皮（牡丹只刻了一半）+ 一根竹签
    const pe = QHC.peony({ size: 92, seed: 14 });
    const hx = W * 0.58, hy = H * 0.862, hr = 0.09;
    const tableEdge = [[-40, H * 0.840], [W * 0.58, H * 0.872], [W + 160, H * 0.930]];
    QHC.shadowed(g, c => {
      c.beginPath();                                             // 桌面（前景，压住下沿）
      c.moveTo(-140, H * 0.995); c.lineTo(-40, H * 0.840); c.lineTo(W * 0.58, H * 0.872); c.lineTo(W + 160, H * 0.930);
      c.lineTo(W + 160, H * 1.04); c.closePath();
      c.fillStyle = 'rgba(18,11,16,0.90)'; c.fill();
      c.save(); c.translate(W * 0.40, H * 0.836); c.rotate(-0.05); QHC.knife(c, { len: 200 }); c.restore();
      c.save(); c.translate(hx, hy); c.rotate(hr); QHC.hideSheet(c, 372, 236, { seed: 12, wob: 12 }); c.fill(); c.restore();
      c.save(); c.translate(W * 0.30, H * 0.884); c.rotate(0.30); QHC.rod(c, { len: 300, w: 8, bend: 0.05 }); c.restore();
    }, c => {                                                    // 皮上只刻了一半的牡丹
      c.save(); c.translate(hx, hy); c.rotate(hr);
      cutStroke(c, pe.parts.stem, 4.0, { tick: f.tick, jitter: 0.7, upto: 0.55 });
      cutStroke(c, pe.parts.leaves[0], 3.6, { tick: f.tick, upto: 0.5 });
      c.restore();
    }, c => {                                                    // 刀缝的亮边 + 桌面棱上的一线反光
      c.save(); c.translate(hx, hy); c.rotate(hr);
      hideEdge(c, polylineUpTo(pe.parts.stem, 0.55), 5.4, { alpha: 0.40 });
      hideEdge(c, polylineUpTo(pe.parts.leaves[0], 0.5), 5.0, { alpha: 0.36 });
      c.restore();
      hideEdge(c, tableEdge, 3.2, { alpha: 0.22 });
    }, { light: [lx, ly], z: 105, L: 900, pen: 22, res: 0.5, blur: 1.1 });
    return { shake: 1.3 * f.a.kick, vignette: 0.40 + 0.26 * (1 - light), flash: 0.05 * pulse(t, wick, 0.12) };
  },
});
