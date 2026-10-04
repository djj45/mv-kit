// loss_drop — 图纸 04（0:09.34–0:12.97）。PLATE 语域：纸 + 墨，什么都不发光。
// HERO：坠落的 loss 曲线 + 它自己的坐标系（loss 轴 / step 轴 / 刻度 / 网格 / 曲线下面那块网点盆地），
//       占画面一大半。曲线在纸的左上方起跳，缓降；唱到 "drop"（10.66 s）那一下进入断崖，一路俯冲，
//       最后冲出图框下沿——这一格只是连续记录纸上的一个窗口。
// 镜头：cam.cy 从 540 下移到 725（俯冲 185 px）：视窗钉在画面上不动，纸（刻度线、曲线、盆地）一路往上滑，
//       所以看出来是"笔在往下掉"，不是画面在动。
// 字区：上方 1/3 的空白（左：两句词骑在尺寸线上；中：图纸注记；右：标题栏）。曲线不碰这一带。
MV.scene('loss_drop', {
  init() {
    // 曲线（单位 nats）：静态几何，只算一次。4.95 → 0.13，落差 4.82。
    const N = 320;
    this.N = N;
    this.v = [];
    for (let i = 0; i <= N; i++) this.v.push(this.lossAt(i / N));
    this.AX = 140;      // loss 轴（纵轴）
    this.X1 = 1896;     // step 轴（横轴）右端
    this.Y0 = 380;      // loss = 5.00 这一格在纸上的 y
    this.K = 190;       // 1.0 nat = 190 px
    this.WIN = 378;     // 视窗上沿（上面那条带留给字）
    this.BOT = 1160;    // 视窗下沿：在图框外面，曲线从这儿冲出纸面
    this.DIVE = 185;    // cam.cy 总共下移多少（≥140）
    this.XD = 1590;     // 落差尺寸线站的地方（曲线右边那块空网格）
  },
  /** 近似直线的一段（两端收一下）：断崖之后那一段长下滑用它，曲线才是"斜着横贯"，不是一根竖线。 */
  ramp(x, a, b, k) {
    const t = clamp((x - a) / (b - a)), s = t * t * (3 - 2 * t);
    return t * (1 - k) + s * k;
  },
  /** 归一化 step → loss（nats）：缓降 → 唱到 "drop" 那一下的断崖 → 一路斜着掉到右下角。4.95 → 0.13。 */
  lossAt(u) {
    const x = clamp(u, 0, 1);
    return 4.95 - 0.18 * smoothstep(0, 0.34, x) - 1.30 * smoothstep(0.28, 0.40, x) - 3.34 * this.ramp(x, 0.38, 0.88, 0.35);
  },
  /** 盆地 = 曲线与纸底之间那块面积：大面积实心用网点 + 45° 剖面线，不用灰。 */
  basin(g, pathFn) {
    if (!this._pat) {
      const S = 7, c = mk(S, S), h = c.getContext('2d');
      h.fillStyle = LK.deep;
      h.beginPath(); h.arc(S / 2, S / 2, 2.05, 0, TAU); h.fill();
      this._pat = c;
    }
    g.save();
    g.beginPath(); pathFn(g); g.clip();
    g.globalAlpha = 0.52;
    g.fillStyle = g.createPattern(this._pat, 'repeat');
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.15;
    g.strokeStyle = LK.deep; g.lineWidth = 1;
    g.beginPath();
    for (let k = -70; k <= 70; k++) { g.moveTo(k * 26 - 400, -200); g.lineTo(k * 26 + 1600, H + 1200); }
    g.stroke();
    g.restore();
  },
  render(g, f) {
    DR.paper(g);
    const p = clamp(f.lt / f.dur);
    const dive = this.DIVE * smoothstep(0.10, 1.0, p);              // 镜头俯冲（cam.cy 下移）
    // ── 笔走到哪儿：永远走不到尽头（upto ≤ 0.86），所以切走的时候那根线**还在往下延伸**。
    const upto = clamp(0.10 + 0.76 * p);
    // ── 镜头跟着"正在延伸的那个点"：笔尖的原始 y 一旦要掉出画面，整张图就按需缩小，
    //    把它按在 TIPY 这条线上——不是按时间表缩，而是**跟着点缩**，所以那个点永远看得见。
    //    锚点取绘图区左上角（AX, WIN）：上沿和左沿钉住，整张图朝它收缩，下面的那把尺不动。
    const K = this.K, N = this.N;
    const TIPY = 858;
    const rawTipY = this.Y0 + (5 - this.lossAt(upto)) * K - dive;
    const sc = clamp((TIPY - this.WIN) / Math.max(60, rawTipY - this.WIN), 0.30, 1);
    const AXC = this.AX, AYC = this.WIN;
    const AX = AXC, X1 = AXC + (this.X1 - AXC) * sc;
    const WIN = AYC, BOT = AYC + (this.BOT - AYC) * sc;
    const XD = AXC + (this.XD - AXC) * sc;
    const X = u => AXC + ((this.AX + (this.X1 - this.AX) * u) - AXC) * sc;
    const Y = v => AYC + ((this.Y0 + (5 - v) * K - dive) - AYC) * sc;   // loss（nats）→ 屏幕 y
    const kn = Math.max(2, Math.round(N * upto));
    const S = [];
    for (let i = 0; i <= kn; i++) S.push([X(i / N), Y(this.v[i])]);
    const tip = S[S.length - 1];
    MV.focus(tip[0], tip[1], 'pen tip');   // qa: the falling line's tip is what the eye follows
    const wDrop = f.lyrics.findWords('drop')[0];

    // ── 视窗里的一切：盆地 → 网格 → 记号 → 曲线（视窗钉住，纸在里面往上滑）
    g.save();
    g.beginPath(); g.rect(AX, WIN, X1 - AX, BOT - WIN); g.clip();

    this.basin(g, gg => {
      gg.moveTo(S[0][0], BOT);
      for (const q of S) gg.lineTo(q[0], q[1]);
      gg.lineTo(tip[0], BOT);
      gg.closePath();
    });

    // 网格：横轴 = step（竖线），纵轴 = loss（横线，跟着纸往上滑走）
    for (let s = 0; s <= 24; s++) {
      const x = X(s / 24), major = s % 4 === 0;
      DR.line(g, x, WIN, x, BOT, { color: LK.a(LK.ink3, major ? 0.8 : 0.36), w: major ? 0.9 : 0.6 });
    }
    for (let i = -6; i <= 14; i++) {
      const v = i * 0.5, y = Y(v), major = i % 2 === 0;
      if (y < WIN - 1 || y > BOT) continue;
      DR.line(g, AX, y, X1, y, { color: LK.a(LK.ink3, major ? 0.85 : 0.38), w: major ? 0.9 : 0.6 });
    }
    // 起跳高度线（从哪儿掉下来的）
    DR.line(g, AX, Y(4.95), X1, Y(4.95), { color: LK.ink3, w: 0.8, dash: [10, 7] });
    // 跑到哪儿为止的最好成绩：虚线一路跟着曲线往下挪（连续记录纸上的上一笔）
    const best = [];
    let bv = this.v[0];
    for (let i = 0; i <= kn; i++) { bv = Math.min(bv, this.v[i]); best.push([X(i / N), Y(bv) - 24]); }
    DR.pen(g, best, 1, { color: LK.a(LK.ink2, 0.9), w: 1.2, dash: [11, 7] });
    // 小节头在曲线上留的记号（每小节头掉一档）
    for (const b of f.audio.downbeats) {
      if (b < f.from || b > f.to) continue;
      const ub = clamp((b - f.from) / f.dur);
      if (ub > upto) continue;
      const bx = X(ub), by = Y(this.lossAt(ub));
      DR.line(g, bx - 8, by - 8, bx + 8, by + 8, { color: LK.ink, w: 1.5 });
      DR.line(g, bx - 8, by + 8, bx + 8, by - 8, { color: LK.ink, w: 1.5 });
    }

    // 主曲线：墨线勾边 + 蓝芯 + 一道高光 —— 一根有厚度的曲线管
    DR.pen(g, S, 1, { color: LK.ink, w: 19 });
    DR.pen(g, S, 1, { color: LK.blue, w: 12 });
    DR.pen(g, S, 1, { color: LK.a(LK.ice, 0.5), w: 3 });
    if (upto < 0.999) {                                             // 笔尖
      g.fillStyle = LK.blue;
      g.beginPath(); g.arc(tip[0], tip[1], 11 + 3 * f.a.kick, 0, TAU); g.fill();
      g.strokeStyle = LK.ink; g.lineWidth = 1.6; g.stroke();
    }
    g.restore();

    // ── loss 轴：刻度 + 数字（印在纸上的，跟着纸往上滑走）
    DR.line(g, AX, WIN, AX, BOT, { color: LK.ink, w: 1.8 });
    g.save();
    g.beginPath(); g.rect(AX - 96, WIN, 96, BOT - WIN); g.clip();
    for (let i = -2; i <= 10; i++) {
      const v = i * 0.5, y = Y(v);
      if (y < WIN || y > BOT) continue;
      const major = i % 2 === 0;
      DR.line(g, AX - (major ? 18 : 10), y, AX, y, { color: LK.ink, w: major ? 1.2 : 0.8 });
      if (major) DR.micro(g, v.toFixed(2), AX - 24, y + 4.5, { size: 13, color: LK.ink2, align: 'right' });
    }
    g.restore();
    g.save();                                                       // 纵轴标题（竖排）
    g.translate(AX - 62, 772); g.rotate(-Math.PI / 2);
    LK.mono(g, 13, { track: 0.24 }); g.fillStyle = LK.ink2;
    g.fillText('LOSS (nats)', 0, 0);
    g.restore();

    // ── step 轴：图框下沿的那把尺（曲线从它上面冲出去）
    const RY = 1024;   // 那把尺钉在纸上不动——缩的是绘图区，不是纸
    DR.line(g, AX, RY, X1, RY, { color: LK.ink, w: 1.8 });
    for (let s = 0; s <= 48; s++) {
      const x = X(s / 48), major = s % 4 === 0;
      DR.line(g, x, RY, x, RY - (major ? 16 : 8), { color: LK.ink, w: major ? 1.1 : 0.7 });
    }
    for (let s = 0; s <= 12; s++) {
      const x = X(s / 12);
      DR.micro(g, (s ? s + 'K' : '0'), x, RY - 24, { size: 13, color: LK.ink, align: 'center' });
    }
    DR.micro(g, 'STEP', X1, RY + 26, { size: 13, color: LK.ink2, align: 'right' });
    // 视窗上沿：这条线以上是留白的纸
    DR.line(g, AX, WIN, X1, WIN, { color: LK.ink, w: 1.6 });

    // ── 尺寸线 / 引线：Δ 4.82（起跳高度 → 见底）、断崖、step 的总行程
    DR.line(g, AX, Y(4.95), XD + 26, Y(4.95), { color: LK.ink3, w: 0.8, dash: [9, 6] });
    DR.dim(g, [XD, Y(4.95)], [XD, Y(0.13)], 0, { text: '\u0394 4.82', size: 17, color: LK.blue });
    DR.leader(g, X(0.46), Y(this.lossAt(0.46)), -250, -150,
      (wDrop ? 'DROP @ ' + wDrop.start.toFixed(2) + ' s' : 'DROP') + ' \u2014 LR \u00d7 0.1',
      { draw: LK.in(f, 1.0), size: 15, color: LK.ink, run: 56 });
    DR.dim(g, [AX, 370], [X1, 370], 0, { text: 'STEP 0 \u2192 12 K', size: 14, color: LK.ink2, ext: false });

    // ── 图框下沿的注记（写在网点上）
    DR.micro(g, 'RECORD CONTINUES \u2014 SHEET 05', AX + 22, 1064, { size: 14, color: LK.ink, track: 0.12 });

    // ── 上方 1/3 那块留白：图纸注记（中） + 标题栏（右）
    DR.micro(g, 'SHEET 04 / 42 \u2014 TRAINING LOSS, CONTINUOUS RECORD', 770, 150, { size: 13, color: LK.ink });
    DR.micro(g, 'RUN 042 \u00b7 PEN 0.3 mm \u00b7 FEED ' + (f.t * 12).toFixed(0) + ' mm/s', 770, 176, { size: 13, color: LK.ink2 });
    DR.micro(g, 'WINDOW 5.00 \u2192 0.00 nats \u00b7 WATCH THE STEP', 770, 202, { size: 13, color: LK.ink3 });
    DR.titleBlock(g, {
      rows: [['run', '042 \u2014 ' + f.t.toFixed(1) + ' s'], ['metric', 'TRAIN LOSS / CROSS-ENT'],
               ['step', 'LR \u00d7 0.1 @ ' + (wDrop ? wDrop.start.toFixed(2) : '10.66') + ' s'], ['drawn', 'BOLT.PLOTTER']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 04 / 42 \u2014 LOSS RECORD', rev: 'REV A',
      x: 1230, y: 104, w: 620, h: 206, alpha: LK.in(f, 0.6),
    });

    // 字：dimension treatment，两句各骑一条尺寸线，落在上方那块留白里
    TY.line(g, f, { reg: 'plate', treat: 'dimension', align: 'left', x: 150, y: 150, size: 56, words: [0, 5], label: '' });
    TY.line(g, f, { reg: 'plate', treat: 'dimension', align: 'left', x: 150, y: 286, size: 56, words: [5, 9] });
    return { grain: 0.03, vignette: 0 };
  },
});
