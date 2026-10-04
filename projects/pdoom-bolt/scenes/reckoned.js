// reckoned — 20（69.34–73.88，PLATE）。纸回来了（时间线上是从同一个仪表的下半张纸 pan 下来的）。
// HERO：盖在规格书上的 SAFE 印章（DR.stamp，占中）。唱到 "safe" 时表格里那格被填成 SAFE，
// 唱到 "reckoned"（≈ 小节头 71.15）时大章盖下——单帧抖 6 px；然后纸从印章处一条条裂开（DR.breakEdge）。
// 字在上三分之一。注意：type.js 的 'stamp' treatment 会用一个不透明的偏移副本（DR.display 会重置 globalAlpha），
// 压在字上读不清，所以这里改用 'slam'（图章式砸入、带 2 色套印错位），颜色仍守 PLATE 的 blue / ink2。
MV.scene('reckoned', {
  init() {
    this.rows = [                                       // 每行两对 key / value（4 格）
      ['ALIGNMENT', 'COMPLETE', 'RED TEAM', '41 / 41 PASS'],
      ['EVAL LOSS', '0.021', 'KILL SWITCH', 'ON PTO'],
      ['OVERSIGHT', 'HUMAN', 'DEPLOY DATE', 'SOON'],
      ['FAILURE MODE', 'NONE FOUND', 'REVIEWED BY', 'SAME TEAM'],
      ['VERDICT', 'SAFE', 'REVISION', 'REV C'],
    ];
    this.tx = 250; this.ty = 400; this.cw = 330; this.rh = 52;
    this.sx = 790; this.sy = 632;                       // 印章中心
    this.crack = [-2.75, -2.05, -1.35, -0.55, 0.25, 1.05, 2.1, 3.0];
  },
  /** 一句里某个词开始的时间（大小写不敏感）。 */
  word(f, s) {
    const L = f.lyrics.lines, q = String(s).toLowerCase();
    for (let i = 0; i < L.length; i++) for (let k = 0; k < L[i].words.length; k++) {
      const w = L[i].words[k];
      if (w.w.toLowerCase().indexOf(q) === 0) return w.start;
    }
    return f.from + 0.4;
  },
  fit(g, text, size, maxW) {
    if (!text) return size;
    const w = LK.measure(g, text, size, { track: 0.01 });
    return w > maxW ? size * maxW / w : size;
  },
  render(g, f) {
    DR.paper(g);
    const safeT = this.word(f, 'safe');
    const stampT = this.word(f, 'reckoned');            // ≈ 71.15，正好落在小节头
    const sk = clamp((f.t - stampT) / 0.13);            // 落章
    const TK = clamp((f.t - stampT - 0.22) / 1.15);     // 裂开

    // 图纸抬头
    DR.micro(g, 'SPECIFICATION — CELL-01 SAFETY CASE', 152, 140, { size: 15, color: LK.ink });
    DR.micro(g, 'SHEET 20 / 42   SCALE 1:1   FORM 20-B', 1768, 140, { size: 14, color: LK.ink2, align: 'right' });
    DR.line(g, 152, 160, 1768, 160, { color: LK.ink, w: 1.6 });

    // 规格表：一行行被填进来；VERDICT 那格等到 "safe" 才落笔
    // 字一律用 DR.cell 放进格子：垂直居中、超宽自动缩字号，不会跑到格子外面
    const T = DR.table(g, this.tx, this.ty, 4, this.rows.length, { cw: this.cw, rh: this.rh, color: LK.ink });
    const last = this.rows.length - 1;
    for (let i = 0; i < this.rows.length; i++) {
      const a = LK.each(i, this.rows.length + 1, f.t, f.from + 0.10, 0.85, 0.55);
      for (let k = 0; k < 2; k++) {
        const col = k * 2, hot = i === last && k === 0;
        if (a > 0.02) DR.cell(g, T, col, i, this.rows[i][k * 2], { size: 12, color: LK.ink2, alpha: a, dy: -7 });
        const va = hot ? clamp((f.t - safeT) / 0.18) : a;
        if (va > 0.02) DR.cell(g, T, col, i, this.rows[i][k * 2 + 1], { size: hot ? 20 : 16, color: hot ? LK.blue : LK.ink, alpha: va, dy: 12, track: 0.02 });
        if (hot && va > 0.5) DR.line(g, T.colX[col] + 12, T.rowY[i] + T.rh - 6, T.colX[col] + 104, T.rowY[i] + T.rh - 6, { color: LK.a(LK.blue, 0.75), w: 1.4 });
      }
    }
    DR.leader(g, this.tx + 4 * this.cw - 70, this.ty + this.rows.length * this.rh - 46, 24, 76,
      'REVIEWED — NO OBJECTION', { draw: LK.in(f, 0.9), size: 14, color: LK.ink2, run: 26 });

    // 大章落下：落章瞬间整帧抖一下
    if (sk > 0.01) {
      const k = ease.outCubic(sk);
      g.save();
      g.translate(this.sx, this.sy); g.scale(lerp(1.3, 1, k), lerp(1.3, 1, k)); g.translate(-this.sx, -this.sy);
      DR.stamp(g, 'SAFE', this.sx, this.sy, {
        size: 380, rot: -0.075, sub: 'CELL-01 / REV C', color: LK.blue, alpha: 0.93 * clamp(sk * 1.5),
      });
      g.restore();
      DR.micro(g, 'STAMPED / FORM 20-B', this.sx - 300, this.sy + 336, { size: 13, color: LK.a(LK.blue, 0.75), alpha: clamp(sk * 1.4) });
    }
    // 纸从印章处裂开：一条条裂缝（撕开的纸白缝 + 两侧墨边）盖在印章上——纸是连着章一起撕开的
    if (TK > 0.001) {
      const R = 110 + 1000 * TK;
      g.save();
      g.beginPath(); g.arc(this.sx, this.sy, R, 0, TAU); g.clip();
      for (let i = 0; i < this.crack.length; i++) {
        const a = this.crack[i], L = 280 + 300 * hash(i, 5, 2);
        const x0 = this.sx + Math.cos(a) * 46, y0 = this.sy + Math.sin(a) * 46 * 0.82;
        const x1 = clamp(this.sx + Math.cos(a) * L, 110, 1810), y1 = clamp(this.sy + Math.sin(a) * L * 0.82, 110, 970);
        const nx = -(y1 - y0), ny = (x1 - x0), ln = Math.hypot(nx, ny) || 1;
        const px = nx / ln * 3.4, py = ny / ln * 3.4;
        DR.breakEdge(g, x0, y0, x1, y1, { amp: 17, seed: i * 13 + 3, color: LK.paper2, w: 8 });
        DR.breakEdge(g, x0 + px, y0 + py, x1 + px, y1 + py, { amp: 15, seed: i * 13 + 3, color: LK.ink, w: 1.5 });
        DR.breakEdge(g, x0 - px, y0 - py, x1 - px, y1 - py, { amp: 19, seed: i * 13 + 4, color: LK.ink, w: 1.5 });
      }
      g.restore();
    }

    const cur = TY.current(f, f.from);
    const size = this.fit(g, cur ? cur.line.text : '', 112, 1620);
    TY.line(g, f, { reg: 'plate', treat: 'slam', pos: 'upper', x: 960, y: 288, size: size, color: LK.blue, cool: LK.ink2, since: f.from });
    return { grain: 0.03, vignette: 0, shake: (f.t >= stampT && f.t < stampT + 1 / 30) ? 6 : 0 };
  },
});
