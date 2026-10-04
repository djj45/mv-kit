// leftturn — 81.15–84.79（PLATE）。"Sharp left turn and there you are"。
// HERO：一条急转左的矢量链（深蓝实心带 56 px + 大箭头，横向跨图纸 68%）。
// 画面：整张图纸（图框 + 图 + 字）在 "left turn" 那两个字上甩 90°，转体落在小节头 82.063
//       （f.lt = 0.909）；转到 60° 时纸边出画面。设计坐标以纸心为原点：
//       横段 y=150 → 转角 x=-300 → 竖段向上 → 箭头。转完 90° 后它变成
//       "从顶上下来 → 在中间向左折 → 箭头指左"（和歌词同一个意思，是这一镜的第二构图）。
// 字骑在矢量下方 42 px，和矢量平行，跟着图纸一起转；转完是工程图那种竖排。
// 所有会留在画面里的家具都排在 |x|<430 的核心里（转完仍在画面内），坐标见下面的注释。
MV.scene('leftturn', {
  init() {
    this.SX = 934;      // 横段起点（右，压过内框）
    this.CX = -300;     // 转角（设计 x）
    this.CY = 150;      // 横段所在的设计 y
    this.VY = -150;     // 竖段终点 = 箭头根
    this.TIP = -430;    // 箭头尖
    this.BW = 56;       // 带宽度
    this.AHW = 110;     // 箭头半宽
    this.TXT_Y = 330;   // 歌词基线（设计 y）
    this.turnA = 0.20;  // 预备
    this.turnB = 0.42;  // 主转开始
    this.turnC = 0.909; // 主转结束 = 82.063 小节头
  },

  /** 一串点 → 有宽度的带（斜接 45°）。 */
  band(g, pts, w, o) {
    o = o || {};
    const h = w / 2, n = pts.length, A = [], B = [], R = new Array(n);
    for (let i = 0; i < n; i++) {
      const q = pts[Math.min(n - 1, i + 1)], r = pts[Math.max(0, i - 1)];
      let dx = q[0] - r[0], dy = q[1] - r[1];
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      R[i] = [-dy, dx];
    }
    for (let i = 0; i < n; i++) {
      const p = pts[i], m = (i > 0 && i < n - 1) ? h * 1.42 : h;
      A.push([p[0] + R[i][0] * m, p[1] + R[i][1] * m]);
      B.push([p[0] - R[i][0] * m, p[1] - R[i][1] * m]);
    }
    g.save(); g.beginPath();
    g.moveTo(A[0][0], A[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(A[i][0], A[i][1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
    g.closePath();
    g.fillStyle = o.fill || LK.deep; g.fill();
    if (o.w) { g.strokeStyle = o.color || LK.ink; g.lineWidth = o.w; g.lineJoin = 'miter'; g.miterLimit = 6; g.stroke(); }
    g.restore();
  },

  /** 镜头内的 0..1（不用 LK.in：它会被切点反推）。 */
  P(f, t0, dur, e) { return prog(f.lt, t0, t0 + dur, e || ease.inOutCubic); },

  render(g, f) {
    const SX = this.SX, CX = this.CX, CY = this.CY, VY = this.VY, TIP = this.TIP, BW = this.BW, AHW = this.AHW;

    // ── 帧外那张纸（不动）：纸纹按屏幕坐标钉住，转体不会让纸纹游
    DR.paper(g, { frame: false });

    // ── 转体：先反向预备 3°，再从 "left turn" 甩满 90°，落在小节头 82.063（f.lt = 0.909）
    const ante = this.P(f, this.turnA, 0.22, ease.outCubic) * (1 - this.P(f, this.turnB, 0.20, ease.inCubic));
    const k = this.P(f, this.turnB, this.turnC - this.turnB, ease.inOutCubic);
    const ang = -Math.PI / 2 * k + 0.052 * ante;
    const ring = f.lt > this.turnC ? (1 - clamp((f.lt - this.turnC) / 0.10)) : 0;   // 转到位：图框响一下
    const jx = ring * 5 * Math.sin(f.t * 73.1), jy = ring * 3 * Math.cos(f.t * 59.3);

    g.save();
    g.translate(W / 2 + jx, H / 2 + jy);
    g.rotate(ang);

    // 纸的另一面：转的时候这张纸才"显形"（0° / 90° 时 alpha=0，纸纹留给帧外那张静止的纸）
    const sh = Math.sin(clamp(k) * Math.PI);
    if (sh > 0.004) {
      g.save();
      g.globalAlpha = 0.8 * sh; g.fillStyle = LK.paper2; g.fillRect(-960, -540, 1920, 1080);
      g.globalAlpha = 0.045 * sh; g.fillStyle = LK.deep; g.fillRect(-960, -540, 1920, 1080);
      g.restore();
    }

    // ── 图框（内框 + 分区标记，跟着纸转）
    DR.frame(g, { margin: 44 });

    // ── 尺寸：横段 1180（设计 y=60 → 转完是 x=1020 的竖尺寸线）+ 折角 300
    DR.dim(g, [SX, CY], [CX, CY], 90, { text: '1180', size: 15, color: LK.ink2, ext: false });
    DR.dim(g, [CX, CY], [CX, VY], 150, { text: '300', size: 15, color: LK.ink2, ext: false });
    DR.line(g, 900, CY - 30, 900, CY + 30, { color: LK.ink2, w: 0.8 });
    DR.line(g, SX + 20, CY, 900, CY, { color: LK.ink2, w: 0.8, dash: [9, 6] });

    // ── 矢量链：横段 → 90° 转角 → 竖段 → 箭头（一帧里唯一的彩色）
    this.band(g, [[SX + 30, CY], [CX, CY], [CX, VY]], BW, { fill: LK.blue, color: LK.ink, w: 1.4 });
    g.save(); g.setLineDash([10, 8]); g.lineWidth = 1; g.strokeStyle = LK.a(LK.paper2, 0.72);
    g.beginPath(); g.moveTo(SX, CY); g.lineTo(CX, CY); g.lineTo(CX, VY - 6); g.stroke(); g.restore();
    g.save();
    g.beginPath(); g.moveTo(CX, TIP); g.lineTo(CX + AHW, VY + 4); g.lineTo(CX - AHW, VY + 4); g.closePath();
    g.fillStyle = LK.blue; g.fill();
    g.strokeStyle = LK.ink; g.lineWidth = 1.4; g.lineJoin = 'miter'; g.stroke();
    g.restore();
    DR.center(g, CX, TIP + 78, 150, { color: LK.a(LK.paper2, 0.8), w: 0.8 });
    g.save(); g.fillStyle = LK.paper2; g.beginPath(); g.arc(CX, TIP + 78, 5, 0, TAU); g.fill(); g.restore();

    // ── 矢量上的刻度（每 120 一格，每 5 格一根长的）
    g.save(); g.strokeStyle = LK.a(LK.paper2, 0.66); g.lineWidth = 1.1; g.beginPath();
    for (let i = 1; i * 120 < (SX - CX); i++) {
      const x = SX - i * 120, big = i % 5 === 0;
      g.moveTo(x, CY - (big ? 18 : 9)); g.lineTo(x, CY + (big ? 18 : 9));
    }
    g.stroke(); g.restore();

    // ── 90° 转角：半径 176 的弧 + 箭头 + 读数（转完落在画面中间偏下）
    const R = 176;
    g.save();
    g.strokeStyle = LK.ink; g.lineWidth = 2.0;
    g.beginPath(); g.arc(CX, CY, R, 0, -Math.PI / 2, true); g.stroke();
    g.strokeStyle = LK.ink2; g.lineWidth = 0.8;
    g.beginPath(); g.arc(CX, CY, R + 26, 0, -Math.PI / 2, true); g.stroke();
    DR.line(g, CX, CY - R - 54, CX, CY + 44, { color: LK.ink2, w: 0.7, dash: [12, 6, 3, 6] });
    DR.line(g, CX - 44, CY, CX + R + 54, CY, { color: LK.ink2, w: 0.7, dash: [12, 6, 3, 6] });
    g.restore();
    DR.arrow(g, CX + R * Math.cos(-0.30), CY + R * Math.sin(-0.30), 0.30, 15, LK.ink);
    DR.arrow(g, CX + R * Math.cos(-1.27), CY + R * Math.sin(-1.27), -Math.PI / 2 + 1.27, 15, LK.ink);
    DR.leader(g, CX + 124, CY - 124, 194, -86, '\u2220 90.00\u00b0 \u00b10.05\u00b0', { draw: this.P(f, 0.30, 0.5), size: 15, color: LK.ink, run: 60 });

    // ── 小字：全部排在核心区里（转 90° 之后还在画面内）
    DR.leader(g, CX, VY + 90, 240, -170, 'KNUCKLE R176 \\\\ BREAK 1200 N\u00b7m', { draw: this.P(f, 0.50, 0.5), size: 15, color: LK.ink, run: 40 });
    DR.micro(g, 'B', CX - 42, VY - 46, { size: 15, color: LK.ink });
    DR.line(g, CX - 150, CY + 250, CX - 30, CY + 250, { color: LK.ink2, w: 1.0, dash: [10, 5, 2.5, 5] });
    DR.micro(g, 'DATUM \u25b2 B', CX - 20, CY + 245, { size: 14, color: LK.ink2 });
    DR.micro(g, 'SET \u2190 1180   \\\\   GAUGE 1', SX - 96, CY + 132, { size: 14, color: LK.ink, align: 'right' });
    DR.micro(g, 'A', SX - 60, CY + 74, { size: 15, color: LK.ink });

    // ── 字：骑在矢量下面 42 px（和矢量平行，跟着一起转；转完是竖排，两头各留 >96）
    const cur = TY.current(f);
    let tsz = 92;
    if (cur && cur.line.words.length) {
      const txt = cur.line.words.map(w => w.w).join(' ');
      const w100 = LK.measure(g, txt, 100, { track: 0 });
      if (w100 > 1) tsz = Math.min(92, 840 / w100 * 100);
    }
    TY.line(g, f, { reg: 'plate', x: 0, y: this.TXT_Y, size: tsz, align: 'center', label: '2.74 s' });

    // ── 标题栏：设计 (30,-460) → 转完之后在画面右上（x 500–660, y 150–510），不压字也不压矢量
    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01-K'], ['sheet', '23 / 42']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 23 \u2014 ATTITUDE', rev: 'REV D',
      w: 380, h: 172, x: 20, y: -452, alpha: 0.96,
    });

    g.restore();
    return { grain: 0.03, vignette: 0 };
  },
});
