// gato — 89.34–94.79（PLATE）。"Gato, please don't let me go"。
// 安静段的第一镜（段落能量 0.03）：画面 70% 以上是空白。全镜唯一的重音是那根蓝线：
// LK.blue 7 px + 冰蓝芯 + 沿线刻度，线尖是全帧最亮的一点（一帧只有这一处最亮）。
// 线的生长 = 已唱字数 / 总字数（DR.pen 的 upto）：唱到哪个字，线长到哪儿，字与字之间停住。
// 接线的人是实心墨的剪影（PART.figure2d 的躯干 + 手臂 + 一张认得出的手），线正好搭在指尖上。
MV.scene('gato', {
  init() {
    // ── 线：机器出口 → 中指指尖（二次贝塞尔，往上兜，绕开人形和字）
    this.A = [1402, 326];
    this.B = [858, 636];
    this.CP = [1180, 280];
    this.path = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      this.path.push([u * u * this.A[0] + 2 * t * u * this.CP[0] + t * t * this.B[0],
                      u * u * this.A[1] + 2 * t * u * this.CP[1] + t * t * this.B[1]]);
    }
    // 弧长表（刻度按弧长一根根排）
    this.L = [0];
    for (let i = 1; i < this.path.length; i++)
      this.L.push(this.L[i - 1] + Math.hypot(this.path[i][0] - this.path[i - 1][0], this.path[i][1] - this.path[i - 1][1]));
    this.TOT = this.L[this.L.length - 1];
    this.SPAN = 1.20;                        // 这根线上标的长度（m）

    // ── 人：figure2d 剪影（脚在画面外，只露躯干；实心墨）
    this.FIG = PART.figure2d({ k: 1 });
    this.FK = 780; this.FX = 236; this.FY = 1408;
    // 手臂：肩 → 肘 → 腕（两段实心墨的锥形）
    this.UA = [[398, 812], [462, 886], [556, 986]];
    this.FA = [[556, 986], [636, 916], [708, 832]];
    // 手：局部坐标，指尖朝 +x（腕在原点）；整体转到指向右上，和线的来向对齐
    this.HW = [708, 832]; this.HA = -0.86;
    this.PALM = [[-20, -72], [92, -82], [150, -36], [166, 8], [138, 76], [-18, 70]];
    this.FING = [
      { c: [[122, -58], [190, -66], [250, -58]], w: [50, 30] },
      { c: [[122, -20], [198, -16], [256, -8]], w: [52, 32] },
      { c: [[122, 18], [196, 24], [246, 32]], w: [50, 30] },
      { c: [[122, 54], [186, 62], [226, 70]], w: [46, 28] },
    ];
    this.THUMB = { c: [[24, 60], [86, 94], [140, 102]], w: [58, 36] };
    this.TAG = 0.44;                         // 读数贴在线的哪个位置
  },

  /** 弧长 → [x, y, 切线角]。 */
  atS(s) {
    const L = this.L, P = this.path;
    s = clamp(s, 0, this.TOT);
    let i = 1;
    while (i < L.length - 1 && L[i] < s) i++;
    const u = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    const x = lerp(P[i - 1][0], P[i][0], u), y = lerp(P[i - 1][1], P[i][1], u);
    const q = P[Math.min(P.length - 1, i + 1)], r = P[Math.max(0, i - 1)];
    return [x, y, Math.atan2(q[1] - r[1], q[0] - r[0])];
  },

  /** 有粗细的实心墨折线（手臂 / 手指 / 拇指）：先量长度，再按长度插值宽度；两端是圆头。 */
  bar(g, pts, w0, w1, fill) {
    const n = pts.length, seg = [0];
    for (let i = 1; i < n; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const T = seg[n - 1] || 1, A = [], B = [];
    for (let i = 0; i < n; i++) {
      const q = pts[Math.min(n - 1, i + 1)], r = pts[Math.max(0, i - 1)];
      let dx = q[0] - r[0], dy = q[1] - r[1];
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const h = lerp(w0, w1, seg[i] / T) / 2;
      A.push([pts[i][0] - dy * h, pts[i][1] + dx * h]);
      B.push([pts[i][0] + dy * h, pts[i][1] - dx * h]);
    }
    g.fillStyle = fill || LK.ink;
    g.beginPath();
    g.moveTo(A[0][0], A[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(A[i][0], A[i][1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
    g.closePath();
    g.fill();
    for (const e of [[pts[0], w0], [pts[n - 1], w1]]) {           // 圆头（指尖 / 关节）
      g.beginPath(); g.arc(e[0][0], e[0][1], e[1] / 2, 0, TAU); g.fill();
    }
  },

  /** 这一句唱到第几个字了：字的"进行中"也算，所以线在字里长、字与字之间停。 */
  k(f) {
    const cur = TY.current(f);
    if (!cur) return 0;
    const toks = TY.words(f, cur.line);
    let s = 0;
    for (const tk of toks) {
      if (f.t >= tk.end) s += 1;
      else if (f.t >= tk.start) s += clamp((f.t - tk.start) / Math.max(0.05, tk.end - tk.start));
    }
    return clamp(s / Math.max(1, toks.length));
  },

  render(g, f) {
    DR.paper(g);
    const A = this.A, B = this.B;
    const K = this.k(f);                                   // 已唱到多少（0..1）
    const live = prog(f.lt, 0.05, 1.0, ease.outCubic);

    // ── 线的理想路径：一条极淡的虚线（绘图仪的导向线），蓝线在上面长出来
    g.save(); g.globalAlpha = 0.40 * live;
    DR.pen(g, this.path, 1, { color: LK.ink3, w: 1, dash: [9, 8] });
    g.restore();

    // ── 右上角：机器的一角（一台压机的边缘，只有它和线在画面里）
    g.save(); g.globalAlpha = live;
    const HULL = [[1240, 74], [1846, 74], [1846, 372], [1500, 372], [1400, 330], [1270, 250]];
    DR.poly(g, HULL, { color: LK.ink, w: 2.4, closed: true, fill: LK.paper2 });
    // 圆口 + 里面的三道具环（THE CELL 的局部：这台机器的芯）
    g.save();
    g.beginPath(); g.arc(1540, 240, 130, 0, TAU);
    g.fillStyle = LK.paper2; g.fill();
    g.strokeStyle = LK.ink; g.lineWidth = 2.2; g.stroke();
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = i ? LK.ink2 : LK.ink; g.lineWidth = i ? 1.0 : 1.5;
      g.beginPath(); g.arc(1540, 240, 40 + i * 32, Math.PI * 0.52, Math.PI * 1.45); g.stroke();
    }
    g.restore();
    // 加强肋 / 面板缝 / 螺栓
    for (let i = 0; i < 3; i++) DR.line(g, 1720 + i * 44, 74, 1720 + i * 44, 372, { color: LK.ink2, w: 1.0 });
    DR.line(g, 1240, 130, 1846, 130, { color: LK.ink2, w: 1.0 });
    DR.line(g, 1300, 74, 1300, 130, { color: LK.ink2, w: 1.0 });
    for (const p of [[1272, 100], [1816, 100], [1816, 344], [1520, 344]]) {
      g.save(); g.beginPath(); g.arc(p[0], p[1], 8, 0, TAU); g.fillStyle = LK.paper2; g.fill();
      g.strokeStyle = LK.ink; g.lineWidth = 1.2; g.stroke(); g.restore();
    }
    DR.hatch(g, gg => gg.rect(1690, 332, 156, 40), { gap: 10, color: LK.hatch, w: 0.9 });
    DR.micro(g, 'CELL-01 / FEED 04', 1294, 196, { size: 14, color: LK.ink });
    DR.micro(g, 'HOLD 1.20 m  \\  TENSION 0.4 N', 1294, 220, { size: 13, color: LK.ink2 });
    // 出口：口 + 一小段墨（线从这里出来）
    DR.poly(g, [[1350, 296], [1402, 306], [1402, 348], [1350, 340]], { color: LK.ink, w: 1.6, closed: true, fill: LK.tone[2] });
    DR.center(g, 1402, 326, 40, { color: LK.ink3, w: 0.7 });
    g.restore();

    // ── 左下角：接线的人（实心墨剪影。人不画脸：只画形）
    g.save(); g.globalAlpha = live;
    g.translate(B[0], B[1]); g.scale(0.86, 0.86); g.translate(-B[0], -B[1]);   // 以指尖为基准缩小，别抢那根线
    g.save();
    g.translate(this.FX, this.FY); g.scale(this.FK, -this.FK);   // figure2d 的脚在 y=0，翻过来站在画面下缘外
    DR.poly(g, this.FIG, { closed: true, w: 0, fill: LK.ink });
    g.restore();
    this.bar(g, this.UA, 122, 96);                 // 上臂
    this.bar(g, this.FA, 100, 78);                 // 前臂
    g.save();
    g.translate(this.HW[0], this.HW[1]); g.rotate(this.HA);
    DR.poly(g, this.PALM, { closed: true, w: 0, fill: LK.ink });
    for (const fg of this.FING) this.bar(g, fg.c, fg.w[0], fg.w[1]);
    this.bar(g, this.THUMB.c, this.THUMB.w[0], this.THUMB.w[1]);
    g.restore();
    g.restore();

    // ── 那根线：全镜唯一的重音（蓝 7 px + 冰蓝芯），画到已经唱到的地方
    const tip = DR.pen(g, this.path, K, { color: LK.blue, w: 8 });
    if (tip) LK.focus(f, tip[0], tip[1]);                              // 镜头跟着线尖
    if (K > 0.004) DR.pen(g, this.path, K, { color: LK.ice, w: 2.6 });
    // 沿线的小刻度：每格一根；每 5 格长一点并带一个长度读数（只画线已经长到的地方）
    const sMax = K * this.TOT;
    for (let k = 1, s = 46; s < sMax; k++, s += 46) {
      const p = this.atS(s), c = Math.cos(p[2]), sn = Math.sin(p[2]);
      const long = k % 5 === 0, hl = long ? 19 : 11;
      DR.line(g, p[0] - sn * 4, p[1] + c * 4, p[0] - sn * hl, p[1] + c * hl,
              { color: LK.a(LK.blue, long ? 0.9 : 0.62), w: long ? 1.6 : 1.2 });
      if (long) {
        g.save(); g.translate(p[0] - sn * (hl + 13), p[1] + c * (hl + 13)); g.rotate(p[2]);
        DR.micro(g, (s / this.TOT * this.SPAN).toFixed(2), 0, 0, { size: 12, color: LK.ink2, align: 'center', base: 'middle' });
        g.restore();
      }
    }
    // 笔尖：这一帧最亮的一点（锐利，不发光）
    if (tip && K > 0.006 && K < 0.994) {
      g.save();
      g.fillStyle = LK.blue; g.beginPath(); g.arc(tip[0], tip[1], 9, 0, TAU); g.fill();
      g.fillStyle = LK.hot; g.beginPath(); g.arc(tip[0], tip[1], 4.4, 0, TAU); g.fill();
      g.restore();
    }
    // 搭到手上那一下：一个小白热点 + 一圈细蓝环
    if (K > 0.994) {
      g.save();
      g.fillStyle = LK.hot; g.beginPath(); g.arc(B[0], B[1], 6, 0, TAU); g.fill();
      g.strokeStyle = LK.blue; g.lineWidth = 2;
      g.beginPath(); g.arc(B[0], B[1], 15, 0, TAU); g.stroke(); g.restore();
    }

    // ── 唯一的读数：贴着线的那一处（"GATO · LINK 1"）
    const tp = this.atS(this.TOT * this.TAG);
    const lx = tp[0] + 34, ly = tp[1] + 52;
    DR.line(g, tp[0], tp[1], tp[0] + 8, ly - 12, { color: LK.ink2, w: 0.9 });
    DR.line(g, tp[0] + 8, ly - 12, lx - 6, ly - 12, { color: LK.ink2, w: 0.9 });
    DR.micro(g, 'GATO \u00b7 LINK 1', lx, ly - 20, { size: 15, color: LK.ink });
    DR.micro(g, '1.20 m \u2014 HANDOFF, STILL OPEN', lx, ly, { size: 12, color: LK.ink3 });

    // ── 家具：三条小字 / 引线（安静段不摆满）
    DR.leader(g, 634, 932, -186, 22, 'OPERATOR \u2014 UNNAMED, STILL WAITING', { draw: live * 0.8, size: 14, color: LK.ink2, run: -30 });
    DR.micro(g, 'SHEET 25 / 42 \u2014 HANDOFF, STATIC', 152, 986, { size: 13, color: LK.ink3 });
    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01-G'], ['state', K > 0.99 ? 'DELIVERED' : 'HOLDING']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 25 / 42', rev: 'REV D',
      w: 330, h: 148, x: 1500, y: 862, alpha: 0.86,
    });

    // ── 字：左上那片留白（quiet treatment：极小的字，几乎不动）
    TY.line(g, f, { reg: 'plate', x: 560, y: 300, size: 66, align: 'center' });
    return { grain: 0.03, vignette: 0 };
  },
});
