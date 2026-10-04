// gauge — 全片的记忆点：P(doom) 仪表。4 次 hook 都用它，但一次比一次狠，第 3 次反过来画在纸上、几乎不动。
// HERO：表盘（≥70%）。字区：下部横带（hook 固定在这里，是它唯一固定的位置）。
// 拍点：指针在每个 kick 上跳一格；小节头砸到底。
//
// 语域由 params.reg 决定：VOID 画进 lmGlow()（会泛光），PLATE 用 DR 的墨线（不发光）。
MV.scene('gauge', {
  init() {
    this.crack = null;
  },
  /** 值：随歌曲能量上升，kick 上弹一下，到最后一段锁死在满格。 */
  value(f, n) {
    const base = [0.55, 0.74, 0.52, 0.86][n - 1] || 0.6;
    const rise = [0.30, 0.26, 0.05, 0.16][n - 1] || 0.2;
    const k = LK.in(f, f.dur * 0.8, ease.outCubic);
    const kick = f.a.kick * (n === 3 ? 0.012 : 0.05) + f.a.low * (n === 3 ? 0.01 : 0.03);
    return clamp(base + rise * k + kick + 0.02 * Math.sin(f.t * 3.1));
  },
  render(g, f) {
    const n = (f.params && f.params.n) || 1;
    const plate = n === 3;
    const v = this.value(f, n);
    const cx = 960, cy = 424, R = 322;
    const hit = f.a.kick > 0.5 ? 1 : 0;

    if (plate) {
      DR.paper(g);
      this.dial(g, f, { cx, cy, R, v, mode: 'plate' });
      // 纸上的仪表：尺寸线、规格表、修订
      DR.center(g, cx, cy, R + 60, { color: LK.ink3, w: 0.7 });
      DR.dim(g, [cx - R, cy + R + 76], [cx + R, cy + R + 76], 0, { text: '672 \u00b10.5', size: 15, ext: false });
      DR.leader(g, cx + R * 0.74, cy - R * 0.60, 150, 70, 'SCALE 0 \u2013 1.00 P(doom)', { draw: LK.in(f, 0.8), size: 15 });
      DR.leader(g, cx - R * 0.86, cy + R * 0.52, -180, 130, 'MADE IN DS-BLUE', { draw: LK.in(f, 0.8), size: 15, color: LK.ink2 });
      DR.micro(g, 'SHEET 26 / 42 — INSTRUMENT, STATIC TEST', 152, 148, { size: 14, color: LK.ink2 });
      DR.titleBlock(g, {
        rows: [['part no.', 'CELL-01-G'], ['range', '0.00 \u2013 1.00 P(doom)'], ['class', '0.5 / STATIC'], ['drawn', 'BOLT.PLOTTER']],
        title: 'AGI \u00b7 BOLT', titleSub: 'INSTRUMENT SHEET — 26 / 42', rev: 'REV B', alpha: LK.in(f, 0.6),
      });
      TY.line(g, f, { reg: 'plate', x: 150, y: 928, size: 150, align: 'left' });
      return { grain: 0.03, vignette: 0 };
    }

    // ── VOID：表盘就是一块发光的仪器
    lmBegin(n === 4 ? LK.palRare() : LK.palVoid());
    const cam = lmOrbit({ yaw: 0.28 + 0.1 * n, pitch: 0.16, dist: 7.2, fov: 34 });
    // 表盘后面的深度：一层很淡的刻线圆环（不是星云——点云也必须构成形体）
    lmLines(cam, LG.circle(3.2, 96), { width: 0.9, color: 'dim', gain: 0.35, dash: [3, 9] });
    lmLines(cam, LG.circle(4.6, 96), { width: 0.7, color: 'dim', gain: 0.22, dash: [2, 14] });
    const zoomK = n === 4 ? 1 + 0.9 * ease.inOutCubic(LK.in(f, f.dur)) : 1 + 0.12 * ease.inOutCubic(LK.in(f, f.dur));
    const gl = lmGlow();
    gl.save();
    gl.translate(cx, cy); gl.scale(zoomK, zoomK); gl.translate(-cx, -cy);
    this.dial(gl, f, { cx, cy, R, v, mode: 'void', hit, n });
    // 玻璃裂纹（第 2 / 4 次）
    if ((n === 2 && f.t > f.to - 0.45) || (n === 4 && f.t > f.to - 0.5)) {
      const t0 = n === 2 ? f.to - 0.45 : f.to - 0.5, k = clamp((f.t - t0) / 0.22);
      gl.save(); gl.globalCompositeOperation = 'lighter';
      gl.strokeStyle = LK.a(LK.hot, 0.9 * k); gl.lineWidth = 2.2;
      for (let i = 0; i < 9; i++) {
        const a = hash(i, n, 1) * TAU, L = R * (0.5 + hash(i, n, 2) * 0.75) * k;
        gl.beginPath(); gl.moveTo(cx + R * 0.42, cy - R * 0.6);
        gl.lineTo(cx + R * 0.42 + Math.cos(a) * L * 0.5, cy - R * 0.6 + Math.sin(a) * L * 0.5);
        gl.lineTo(cx + R * 0.42 + Math.cos(a + 0.3) * L, cy - R * 0.6 + Math.sin(a + 0.3) * L);
        gl.stroke();
      }
      gl.restore();
    }
    gl.restore();
    lmEnd(g, { bloom: n === 4 ? 1.15 : 0.9 });
    lmTag(g, ['HOOK 01 — FIRST READING', 'HOOK 02 — OVER RANGE', 'HOOK 03 — STATIC TEST', 'HOOK 04 — OFF SCALE'][n - 1] || '', 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, 'P(DOOM) ' + v.toFixed(3), W - 120, 96, { size: 15, track: 0.3, color: 'accent', align: 'right' });
    TY.line(g, f, { reg: 'void', x: 960, y: 906, size: n === 4 ? 176 : 162, align: 'center' });
    return { grain: 0.03, vignette: 0, flash: hit * (n === 3 ? 0 : 0.10), glitch: n === 4 ? clamp((f.t - f.from) * 2) * 0.35 * (1 - LK.in(f, 0.3)) : 0 };
  },

  /** 表盘本体。ctx 可以是主画布（PLATE）或 lmGlow()（VOID）。 */
  dial(g, f, o) {
    const { cx, cy, R, v, mode } = o, glow = mode === 'void';
    const A0 = Math.PI * 1.17, A1 = Math.PI * 2.83;            // 240° 的表盘
    const ang = a => A0 + (A1 - A0) * a;
    const col = c => (glow ? LK.a(c, 1) : c);
    g.save();
    if (glow) g.globalCompositeOperation = 'lighter';

    // 外圈：三圈同心（仪器感）
    g.lineWidth = glow ? 3.4 : 2.6; g.strokeStyle = col(glow ? LK.blue : LK.ink);
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.lineWidth = glow ? 1.2 : 1.0; g.strokeStyle = col(glow ? LK.a(LK.blue, 0.75) : LK.ink2);
    g.beginPath(); g.arc(cx, cy, R * 0.94, A0, A1); g.stroke();
    g.beginPath(); g.arc(cx, cy, R * 0.70, A0, A1); g.stroke();

    // 刻度：51 根，每 5 根长、每 25 根带数字
    for (let i = 0; i <= 50; i++) {
      const a = ang(i / 50), big = i % 5 === 0, huge = i % 25 === 0;
      const r0 = R * (huge ? 0.70 : big ? 0.745 : 0.775), r1 = R * 0.90;
      g.lineWidth = glow ? (huge ? 2.6 : big ? 1.7 : 0.9) : (huge ? 2.2 : big ? 1.4 : 0.75);
      g.strokeStyle = col(huge ? (glow ? LK.hot : LK.ink) : (glow ? LK.a(LK.blue, 0.85) : LK.ink2));
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();
      if (huge) {
        LK.display(g, 30, { track: 0.02 });
        g.fillStyle = col(glow ? LK.hot : LK.ink); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText((i / 50).toFixed(1), cx + Math.cos(a) * R * 0.60, cy + Math.sin(a) * R * 0.60);
      }
    }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';

    // 红线区（这里用实心蓝：全片唯一的彩色）
    g.lineWidth = glow ? 9 : 7; g.strokeStyle = col(glow ? LK.a(LK.blue, 0.5) : LK.blue);
    g.beginPath(); g.arc(cx, cy, R * 0.975, ang(0.8), ang(1)); g.stroke();

    // 指针
    const a = ang(clamp(v));
    const wob = glow ? 0 : 0.004 * Math.sin(f.t * 7.3);        // 纸上的那只几乎不动
    const aa = a + wob;
    g.save(); g.translate(cx, cy); g.rotate(aa);
    g.beginPath();
    g.moveTo(R * 0.86, 0); g.lineTo(R * 0.05, -R * 0.028); g.lineTo(-R * 0.16, -R * 0.026);
    g.lineTo(-R * 0.16, R * 0.026); g.lineTo(R * 0.05, R * 0.028); g.closePath();
    g.fillStyle = col(glow ? LK.hot : LK.blue);
    g.fill();
    if (glow) { g.shadowColor = LK.a(LK.blue, 0.9); g.shadowBlur = LK.PX(26); g.fill(); g.shadowBlur = 0; }
    g.restore();
    // 轴心
    g.beginPath(); g.arc(cx, cy, R * 0.075, 0, TAU);
    g.fillStyle = col(glow ? LK.blue : LK.ink); g.fill();
    g.beginPath(); g.arc(cx, cy, R * 0.032, 0, TAU);
    g.fillStyle = col(glow ? LK.hot : LK.paper2); g.fill();

    // 数字读数窗 + 铭牌
    const rw = R * 0.70, rh = R * 0.21;
    g.lineWidth = glow ? 1.6 : 1.6; g.strokeStyle = col(glow ? LK.a(LK.blue, 0.9) : LK.ink);
    g.strokeRect(cx - rw / 2, cy + R * 0.30, rw, rh);
    LK.display(g, rh * 0.78, { track: 0.04 });
    g.fillStyle = col(glow ? LK.hot : LK.blue); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(v.toFixed(3), cx, cy + R * 0.30 + rh * 0.54);
    LK.mono(g, 22, { track: 0.34 });
    g.fillStyle = col(glow ? LK.a(LK.blue, 0.95) : LK.ink2);
    g.fillText('P(DOOM)', cx, cy + R * 0.30 - rh * 0.42);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    // 四颗螺钉
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = cx + sx * R * 0.86, y = cy + sy * R * 0.86;
      g.beginPath(); g.arc(x, y, R * 0.038, 0, TAU);
      g.fillStyle = col(glow ? LK.a(LK.blue, 0.8) : LK.ink2); g.fill();
      g.strokeStyle = col(glow ? LK.hot : LK.paper2); g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x - R * 0.026, y); g.lineTo(x + R * 0.026, y); g.stroke();
    }
    g.restore();
  },
});
