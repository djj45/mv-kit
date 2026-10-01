// 镜头 4 — 檀香（主歌第 5、6 句）。灯前立起一片窗格，格子的光投在幕布上；
// 一缕檀香从画面下沿升起，穿过光柱，在幕布上聚成一张侧脸的轮廓（比影人的脸更软），"了然"时被吹散。
MV.scene('smoke', {
  render(g, f) {
    const t = f.t;
    const lx = W * 0.28, ly = H * 0.80;
    const light = clamp(0.92 + 0.05 * noise1(t * 3.7, 11));
    screenCloth(g, { light, lx, ly, r0: H * 0.82, seed: 9 });
    lamp(g, lx, ly, t, { scale: 1.35, light: 1, h: 74 });

    // 窗格挡在灯前：投在幕布上就是一片格子光（离灯近，所以又大又软）
    QHC.shadowed(g, c => {
      c.save(); c.translate(W * 0.50, H * 0.40); c.rotate(-0.02);
      QHC.windowGrid(c, { w: 980, h: 720, nv: 4, nh: 3, bar: 15 });
      c.restore();
    }, null, null, { light: [lx, ly], z: 210, L: 900, pen: 95, res: 0.5, alpha: 0.5 });

    // 香：一根香，两点红头
    QHC.incense(g, W * 0.27, H * 0.885, { len: 200, s: 1.25, rot: -0.05 });
    const L1 = f.lyrics.get('冉冉'), L2 = f.lyrics.get('心事');
    const last = L2.words[L2.words.length - 1];
    const build = prog(t, L1.words[0].start + 0.5, last.start - 0.25, ease.inOutQuad);
    const blow = prog(t, last.start, last.end + 0.6, ease.outCubic);

    // 烟：先是一柱，然后顺着轮廓散开成一张侧脸
    const cx = W * 0.52, cy = H * 0.44, S = 1.15;
    const prof = [[6, -196], [-14, -150], [-26, -108], [-16, -86], [-56, -50], [-24, -28], [-44, -8], [-26, 8], [-40, 40], [-6, 96], [30, 150]];
    const P = prof.map(([x, y]) => [cx + x * S, cy + y * S]);
    g.save(); g.lineCap = 'round';
    const tipY = H * 0.86, tipX = W * 0.27;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const pp = P[Math.min(P.length - 1, Math.floor(u * (P.length - 1)))];
      const qq = P[Math.min(P.length - 1, Math.floor(u * (P.length - 1)) + 1)];
      const fu = u * (P.length - 1) - Math.floor(u * (P.length - 1));
      const tx = lerp(pp[0], qq[0], fu), ty = lerp(pp[1], qq[1], fu);
      const form = clamp(build * 1.15 - Math.abs(u - 0.5) * 0.5);
      const ax = lerp(tipX, tx, form), ay = lerp(tipY, ty, form);
      const wob = (1 - form) * 90 + 26;
      const sc = blow * 130;                                   // 吹散：整张脸往外散
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const s2 = k / 8;
        const x = lerp(tipX + (hash(i, 3) - 0.5) * 60, ax, form * (0.35 + 0.65 * s2)) + fbm1(s2 * 2.4 + t * 0.5, i, 3) * wob + sc * (hash(i, 7) - 0.5) * 2;
        const y = lerp(tipY, ay, s2) - s2 * 10;
        pts.push([x, y]);
      }
      const a = (0.10 + 0.26 * hash(i, 11)) * clamp(build) * (1 - blow) * (0.45 + 0.55 * form);
      if (a <= 0.004) continue;
      const grad = g.createLinearGradient(0, tipY, 0, ay);
      grad.addColorStop(0, `rgba(255,232,196,${(a * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(255,236,206,${a.toFixed(3)})`);
      g.strokeStyle = grad; g.lineWidth = (2.0 + 3.4 * hash(i, 13)) * (1 + blow * 1.4);
      g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    }
    g.restore();

    carveLyrics(g, f, { size: 66, y: Math.round(H * 0.175), weight: 500, lines: ['冉冉', '心事'].map(q => f.lyrics.get(q).i) });
    return { shake: 0.9 * f.a.kick, vignette: 0.36 + 0.14 * (1 - light) };
  },
});
