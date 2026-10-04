// flops — 19（66.22–70.4，VOID）。全片最"硬"的一镜：一个巨大的机械计数器。HERO：读数 1E30（占中）。
// 数字是一台真的滚轮计数器：每拍进一位（24 → 30，越滚越快），最后一位锁死时全帧闪一次；下面一排单位刻度盘跟着转。
// 字在数字下方（点阵打印机的味道）。
MV.scene('flops', {
  init() {
    this.yB = 680;          // 读数基线
    this.wnum = 1430;       // 读数总宽（上限）
    this.top = 152;         // 字形最高只能到这里（上面留出标签的位置）
    this.gapEm = 0.11;      // 每一位之间的机械间隙
  },
  /** 读数：1E24 起，一拍进一位，滚到 1E30 锁死；返回连续值 + 锁死时刻。 */
  reading(f) {
    const beats = f.audio.beats || [], idx = [];
    for (let i = 0; i < beats.length; i++) { const b = beats[i]; if (b > f.from + 0.02 && b < f.to - 0.05) idx.push(b); }
    let base = 24, k = 0;
    for (let i = 0; i < idx.length && i < 6; i++) if (idx[i] <= f.t) {
      base = 24 + i;
      k = ease.outCubic(clamp((f.t - idx[i]) / lerp(0.30, 0.12, i / 5)));   // 越滚越快
    }
    const lockT = idx.length >= 6 ? idx[5] + 0.12 : f.to;
    return { v: Math.min(30, base + k), lockT: lockT };
  },
  /** 一个字形：蓝管 + 白热芯 + 一点点体积（不是实体填充）。 */
  glyph(g, ch, cx, yB, size) {
    LK.display(g, size, { track: 0 });
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = LK.a(LK.blue, 0.10); g.fillText(ch, cx, yB);
    g.lineJoin = 'round';
    g.strokeStyle = LK.a(LK.blue, 0.95); g.lineWidth = size * 0.022; g.strokeText(ch, cx, yB);
    g.strokeStyle = LK.a(LK.hot, 0.9); g.lineWidth = size * 0.007; g.strokeText(ch, cx, yB);
  },
  /** 巨型读数：机械滚轮，只画窗口里的那两位。 */
  display(g, f, r, settle) {
    const yB = this.yB, iv = Math.floor(r.v + 1e-6), fr = clamp(r.v + 1e-6 - iv);
    const wrap = iv % 10 === 9;                                // 进位那一步：十位跟着个位一起滚
    const dU = iv % 10, dT = Math.floor(iv / 10) % 10, fT = wrap ? fr : 0;
    LK.display(g, 100, { track: 0 });
    const em = ['1', 'E', String(dT), String(dU)].map(ch => g.measureText(ch).width / 100);
    const asc = g.measureText('1').actualBoundingBoxAscent / 100 || 0.9;   // 字体可能被替换：量出实际的字高
    const width = this.wnum / (em.reduce((s, x) => s + x, 0) + 3 * this.gapEm);
    const size = Math.min(width, (yB - this.top) / asc);                   // 不顶到上面那两条标签
    const cw = em.map(x => x * size), cellH = 0.96 * size;
    const wnum = em.reduce((s, x) => s + x, 0) * size + 3 * this.gapEm * size;
    const x0 = 960 - wnum / 2, top = yB - size * 0.80, bot = yB + size * 0.06;
    const cx = [], dig = g.measureText('0').width / 100 * size;
    let x = x0;
    for (let i = 0; i < 4; i++) { cx.push(x + cw[i] / 2); x += cw[i] + this.gapEm * size; }
    // 窗口的上下压条 + 分格竖线（机械寄存器的味道）
    g.save();
    g.strokeStyle = LK.a(LK.blue, 0.55); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x0 - 34, top); g.lineTo(x0 + wnum + 34, top);
    g.moveTo(x0 - 34, bot); g.lineTo(x0 + wnum + 34, bot); g.stroke();
    g.strokeStyle = LK.a(LK.blue, 0.3); g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { const mx = (cx[i - 1] + cx[i]) / 2; g.beginPath(); g.moveTo(mx, top); g.lineTo(mx, bot); g.stroke(); }
    for (let i = 0; i < 4; i++) {
      const o = -((i === 2 ? fT : i === 3 ? fr : 0)) * cellH;
      const w2 = Math.max(cw[i], dig) * 0.62 + 4;
      g.save();
      g.beginPath(); g.rect(cx[i] - w2, top, w2 * 2, bot - top); g.clip();
      if (i < 2) this.glyph(g, i === 0 ? '1' : 'E', cx[i], yB + settle, size);
      else {
        const d = i === 2 ? dT : dU;
        this.glyph(g, String(d), cx[i], yB + o + settle, size);
        this.glyph(g, String((d + 1) % 10), cx[i], yB + o + cellH + settle, size);
      }
      g.restore();
    }
    g.restore();
    return size;
  },
  /** 下面一排单位刻度盘：跟着拍转，越到后面转得越快。 */
  dials(g, f, prog, y) {
    const pre = ['K', 'M', 'G', 'T', 'P'];
    for (let i = 0; i < 5; i++) {
      const cx = 960 + (i - 2) * 200, r = 30;
      const sp = 0.5 + 1.8 * prog + i * 0.42;
      const ang = -Math.PI / 2 + f.t * sp + f.a.kick * 0.55;
      g.save();
      g.strokeStyle = LK.a(LK.blue, 0.55); g.lineWidth = 1.5;
      g.beginPath(); g.arc(cx, y, r, 0, TAU); g.stroke();
      g.strokeStyle = LK.a(LK.blue, 0.75); g.lineWidth = 1.1;
      g.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k / 12 * TAU, l = k % 3 === 0 ? 9 : 5;
        g.moveTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
        g.lineTo(cx + Math.cos(a) * (r - l), y + Math.sin(a) * (r - l));
      }
      g.stroke();
      g.strokeStyle = LK.a(LK.hot, 0.85); g.lineWidth = 2.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + Math.cos(ang) * r * 0.8, y + Math.sin(ang) * r * 0.8); g.stroke();
      g.fillStyle = LK.a(LK.hot, 0.9);
      g.beginPath(); g.arc(cx, y, 2.6, 0, TAU); g.fill();
      LK.mono(g, 13, { track: 0.12 });
      g.fillStyle = LK.a(LK.blue, 0.9); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(pre[i], cx, y + r * 0.58);
      g.restore();
    }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  },
  fit(g, text, size, maxW) {
    if (!text) return size;
    const w = LK.measure(g, text, size, { track: 0.02 });
    return w > maxW ? size * maxW / w : size;
  },
  render(g, f) {
    const r = this.reading(f);
    const prog = clamp((f.t - f.from) / Math.max(0.5, f.dur));
    const lockK = f.t >= r.lockT ? clamp((f.t - r.lockT) / 0.5) : 0;
    const settle = 3 * f.a.kick;                                           // 进位的落位抖动
    const buzz = lockK > 0 ? Math.sin(f.t * 57) * 2.4 * (1 - 0.5 * lockK) : 0;

    lmBegin(LK.palVoid());
    const gl = lmGlow();
    gl.save();
    gl.translate(0, buzz);
    this.display(gl, f, r, settle);
    this.dials(gl, f, prog, 762);
    gl.restore();
    if (lockK > 0) {                                                       // 锁死时读数整块更亮
      gl.save(); gl.globalCompositeOperation = 'lighter';
      BOLT.radial(gl, 960, 470, 900, LK.blue, 0.10 * lockK, { core: 0.2 });
      gl.restore();
    }
    lmEnd(g, { bloom: 1.0 });

    lmTag(g, 'COUNTER 19 — FLOPS / SECOND, HARDWIRED', 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, lockK > 0 ? 'RANGE EXCEEDED 1E30' : '1E' + (24 + Math.round(6 * prog)), W - 120, 96,
      { size: 15, track: 0.3, color: 'accent', align: 'right' });
    const cur = TY.current(f, f.from);
    const txt = cur ? cur.line.text : '';
    const size = Math.min(122, this.fit(g, txt, 122, 1560));
    TY.line(g, f, { reg: 'void', treat: 'swarm', x: 960, y: 930, size: size, cell: 0.09, since: f.from });
    return { grain: 0.03, vignette: 0, flash: f.t >= r.lockT && f.t < r.lockT + 0.07 ? 0.24 : 0 };
  },
});
