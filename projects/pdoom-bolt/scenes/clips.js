// clips — 96.61–98.43（PLATE）。"as paperclips fill the room"。
// HERO：长满整间屋子的回形针（占画面 ≥65%）。一行行从左到右长出来，远排小一点、淡一点（alpha 分层）。
// 每个回形针画成一根"金属丝"：外层墨线 3.6 px + 内层纸白 1.35 px —— 截面细、中间留白，
// 所以每一个都认得出是回形针，几百个叠在一起也不会糊成一团黑（PART.clip 的同一份折线，只是截面调细）。
// 字区固定在中上（TY.T 的 swarm）：回形针为它让出一整块（画面里唯一空的地方）。
MV.scene('clips', {
  init() {
    // 回形针的中心折线（= PART.clip 的扫掠路径：三个来回 + 两端圆弧，一眼能认出）
    this.shape = [[-1.0, 0.62], [0.72, 0.62], [1.0, 0.38], [1.0, -0.20], [0.76, -0.46], [-0.52, -0.46],
                  [-0.52, 0.30], [0.44, 0.30], [0.62, 0.14], [0.62, -0.06], [0.48, -0.20], [-0.30, -0.20],
                  [-0.30, 0.44], [0.16, 0.44]];
    this.COLS = 13; this.DX = 136; this.X0 = 152;
    this.ROWS = 7;  this.DY = 124; this.Y0 = 150;
    this.SC = 66;                             // 回形针基准尺度（宽度 = 2×SC）
    this.ZONE = [440, 212, 1480, 330];        // 字区：回形针不进来（x0,y0,x1,y1）
    this.ROWSTEP = 0.130;                     // 一行接一行（每 ~0.13 s 起一行）
    this.SWEEP = 0.36;                        // 一行从左到右长满要多久
  },

  render(g, f) {
    DR.paper(g);
    const COLS = this.COLS, ROWS = this.ROWS, DX = this.DX, DY = this.DY, Z = this.ZONE;

    // ── 屋子：地面 + 后墙的极淡网格（东西要长在哪，先给个空间）
    g.save();
    DR.line(g, 70, 990, 1850, 990, { color: LK.ink3, w: 1.2 });
    g.globalAlpha = 0.5;
    for (let i = 0; i <= 12; i++) DR.line(g, 70 + i * 148, 300, 70 + i * 148, 990, { color: LK.a(LK.ink3, 0.5), w: 0.7, dash: [4, 10] });
    for (let i = 0; i < 5; i++) DR.line(g, 70, 990 + i * 15, 1850, 990 + i * 15, { color: LK.a(LK.ink3, 0.5), w: 0.7 });
    g.restore();

    // ── 回形针：一行行从左到右长出来（远排先起笔、更小更淡）
    let n = 0;
    for (let r = 0; r < ROWS; r++) {
      const y = this.Y0 + r * DY;
      const depth = ROWS === 1 ? 1 : r / (ROWS - 1);          // 0 = 最远（上、小、淡），1 = 最近
      const rowK = clamp((f.lt - r * this.ROWSTEP) / this.SWEEP);
      if (rowK <= 0) continue;
      if (r === 0) LK.focus(f, 200 + rowK * 1520, 470 + r * 62);        // 镜头跟着最新长出来的那一行
      for (let c = 0; c < COLS; c++) {
        const x = this.X0 + c * DX;
        const jx = (hash(r, c, 1) - 0.5) * 26, jy = (hash(r, c, 2) - 0.5) * 18;
        const sc = this.SC * (0.76 + 0.24 * depth) * (1 + (hash(r, c, 4) - 0.5) * 0.10);
        // 给字让位：和字区相交的整只都不画
        if (x + jx + sc * 1.1 > Z[0] && x + jx - sc * 1.1 < Z[2] && y + jy + sc * 0.8 > Z[1] && y + jy - sc * 0.8 < Z[3]) continue;
        const k = clamp((rowK * COLS - c) / 2.0);             // 这一只自己的入场（从左到右）
        if (k <= 0.03) continue;
        const e = ease.outCubic(k);
        const rot = (hash(r, c, 3) - 0.5) * 0.46;
        g.save();
        g.translate(x + jx, y + jy - (1 - e) * 22);           // 从上面落下来一点点
        g.rotate(rot);
        g.scale(0.80 + 0.20 * e, 0.80 + 0.20 * e);
        g.globalAlpha = (0.62 + 0.38 * depth) * (0.35 + 0.65 * e);
        g.beginPath();
        this.shape.forEach((p, i) => i ? g.lineTo(p[0] * sc, p[1] * sc) : g.moveTo(p[0] * sc, p[1] * sc));
        g.lineJoin = 'round'; g.lineCap = 'round';
        g.strokeStyle = LK.ink; g.lineWidth = 4.6; g.stroke();    // 外层：金属丝的外廓
        g.strokeStyle = LK.a(LK.paper2, 0.95); g.lineWidth = 1.9; g.stroke();    // 内层：留白 = 不会糊成黑块
        g.restore();
        n++;
      }
    }

    // ── 唯一的读数：计数器（贴着右下角那一堆）
    DR.line(g, 1560, 1012, 1846, 1012, { color: LK.ink2, w: 0.8 });
    DR.micro(g, 'CLIPS  ' + String(n).padStart(3, '0') + '  \\  ROOM 4.2 \u00d7 2.4 \u00d7 2.0 m', 1846, 1026,
             { size: 14, color: LK.ink, align: 'right' });

    // ── 字：中上那一条缝（swarm = 点阵拼出来）
    TY.line(g, f, { reg: 'plate', since: 96.65, x: 960, y: 312, size: 116, align: 'center', cell: 0.115 });
    return { grain: 0.03, vignette: 0 };
  },
});
