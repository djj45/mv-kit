// 镜头 8 — 下雨等你（副歌，第 25–29 小节）。硬切到幕前（台下视角）：幕布亮着，影人立在幕上。
// 雨落在幕布上晕开，透光越来越暗——"天青色"就是被雨打湿的幕布。幕后他的手影从下面升上来握签子。
// "隔江"时江水从下沿涨起来，把两个人隔在两岸：她在水上，他在水下。
MV.scene('rain_wait', {
  render(g, f) {
    const t = f.t;
    const wet = prog(t, f.from + 1.4, f.from + 8.6);
    const light = clamp(0.97 - 0.17 * wet + 0.03 * noise1(t * 4.3, 9));
    const lx = W * 0.50, ly = H * 0.62;
    screenCloth(g, { light, lx, ly, r0: H * 0.95, wet, seed: 11 });

    const rain = prog(t, f.from + 0.35, f.from + 5.6, ease.outQuad);
    const wait = f.lyrics.get('而我').words[0].start;              // "而"
    const arm = prog(t, wait, wait + 2.8, ease.inOutCubic);              // 她的手慢慢抬到胸前
    const riverW = f.lyrics.get('隔江').words[0].start;            // "隔"
    const rv = prog(t, riverW - 0.6, riverW + 1.0, ease.inOutCubic);
    const wy = lerp(H * 1.02, H * 0.795, rv);                            // 水面
    const pose = QHC.puppetPose(t, { arm });
    const s = 1.15, feet = [W * 0.50, H * 0.660];

    // 她在水上：影人贴着幕布，最实
    QHC.puppetShadow(g, { x: feet[0], y: feet[1], s, pose, light: [lx, ly], z: 34, L: 900, pen: 26, res: 1, blur: 0.8 });
    if (rv > 0.25) QHC.puppetShadow(g, {                                     // 水里的倒影
      x: feet[0], y: 2 * wy - feet[1] + 26, s: s * 0.92, pose, flip: true,
      light: [lx, ly], z: 60, L: 900, pen: 26, res: 0.5, blur: 1.4, alpha: 0.16 * clamp(rv),
    });

    // 幕后他的手影：从画面下沿升上来，抓住签子。
    // 签子画在影人那一层（投影 kp），手在更靠灯的一层（投影 kh）——先算签子在屏幕上的位置，
    // 再反投影回手这一层，手心才真的落在签子上（否则两只手差着几十像素，看着就是没握住）。
    const L = 900, zPup = 34, zHand = 130;
    const kp = L / (L - zPup), kh = L / (L - zHand);
    const rodLocal = u => [46 + 41.5 * Math.sin(u * 1.2), 400 - 830 * u];
    const grip = prog(t, wait + 0.25, wait + 2.4, ease.outCubic);
    if (grip > 0.01) {
      const gu = lerp(0.10, 0.42, clamp(grip));                          // 手沿着签子往上滑
      const [rx, ry] = rodLocal(gu);
      const scr = [lx + kp * (feet[0] + rx * s - lx), ly + kp * (feet[1] + ry * s - ly)];
      const at = [lx + (scr[0] - lx) / kh, ly + (scr[1] - ly) / kh];
      const rodAng = Math.atan2(-830, 41.5 * 1.2 * Math.cos(gu * 1.2));   // 签子的走向（中心投影不改变方向）
      QHC.shadowed(g, c => {
        c.save();
        c.translate(at[0], at[1]); c.rotate(rodAng); c.translate(-44, -4);
        QHC.handHold(c, { s: 1.05 });
        c.restore();
      }, null, c => {                                                    // 手指的受光边
        c.save();
        c.translate(at[0], at[1]); c.rotate(rodAng); c.translate(-44, -4);
        QHC.handHold(c, { s: 1.05, edge: (gg, p) => {
          p.fingers.forEach(f => hideEdge(gg, f, 12, { alpha: 0.26 }));
          hideEdge(gg, p.thumb, 13, { alpha: 0.30 });
        } });
        c.restore();
      }, { light: [lx, ly], z: zHand, L, pen: 26, res: 0.5, alpha: clamp(grip) });
    }

    // 雨：幕前的雨丝 + 落在幕布上的雨点（底鼓一滴大的）+ 浸湿的小点
    const band = [W * 0.5 - 540, H * 0.185 - 96, W * 0.5 + 540, H * 0.185 + 46];
    const hits = [f.lyrics.get('天青').words[0].start]
      .concat(f.audio.events('kick', f.from, f.to).map(e => e.t));
    screenRain(g, t, { amount: rain, hits, avoid: band, n: 240, len: 74, wind: 0.12, seed: 9, life: 3.2, head: true });

    // 江：从下沿涨起来的水，半透明，所以水下他的手影还看得见
    if (rv > 0.001) {
      const line = y => { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([u * W, y + Math.sin(u * 5.4 + t * 0.5) * 4 + noise1(u * 6 + t * 0.8, 3) * 3]); } return pts; };
      g.save();
      g.beginPath();
      line(wy).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineTo(W, H + 10); g.lineTo(0, H + 10); g.closePath();
      g.fillStyle = 'rgba(17,11,15,0.62)'; g.fill();
      g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {                                          // 水面亮线 + 涟漪
        g.strokeStyle = `rgba(255,226,178,${(0.36 - k * 0.10) * (1 - 0.35 * wet)})`;
        g.lineWidth = 2.8 - k * 0.6;
        g.beginPath(); line(wy + 5 + k * 14).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      }
      g.restore();
    }

    carveLyrics(g, f, {
      size: 70, y: Math.round(H * 0.185), weight: 500,
      lines: ['天青', '而我', '炊烟', '隔江'].map(q => f.lyrics.get(q).i),
    });
    return { shake: 1.6 * f.a.kick, vignette: 0.36 + 0.14 * wet };
  },
});
