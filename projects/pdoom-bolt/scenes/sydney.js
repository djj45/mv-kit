// sydney — "Sydney, please let me free"（52.97–58.43，约 5.5 s）。一整块黑里只有一块终端。
// HERO：一块终端面板（占画面 ≥45%：面板本身 66% × 35%，算上它周围的黑带更大）。
// 面板是细线框 + 几行机器字 + 一个方块光标（在拍上闪，跟着 f.beatPhase）。
// 歌词就是被"打"出来的那一行：treatment 'terminal'（lib/type.js 的 TY.T[16]），字写在面板里的基线上。
// 一帧一处最亮：方块光标（很小的一个块）。
MV.scene('sydney', {
  init() {
    // 面板几何（画面坐标，字和框共用这一组数，改一处就够）
    this.PX0 = 152; this.PX1 = W - 152;
    this.PY0 = 332; this.PY1 = 712;
    this.TX = 320;                       // 打字机那一行的起点（缩进 = 提示符的位置）
    this.TY = 600;                       // 打字机那一行的基线
  },
  /**
   * 这一句打到哪儿了：返回已打出的那串字（和 lib/type.js 的 TR.terminal 同一套规则：
   * 词按 start 出现，词内按 (end-start)/字数 的节奏逐字打出，join 的词之间不加空格）。
   * 只读 f.lyrics 和 f.t，没有累积状态。
   */
  typed(f) {
    const li = TY.current(f);
    if (!li) return '';
    let s = '';
    for (const tk of f.lyrics.tokens(li.line)) {
      if (f.t < tk.start) break;
      const n = tk.text.length;
      const cd = clamp((tk.end - tk.start) / Math.max(1, n), 0.012, 0.05);
      s += tk.text.slice(0, Math.min(n, 1 + Math.floor((f.t - tk.start) / cd)));
      if (!tk.join) s += ' ';
    }
    return s.replace(/\s+$/, '');
  },
  render(g, f) {
    const x0 = this.PX0, x1 = this.PX1, y0 = this.PY0, y1 = this.PY1;
    const w = x1 - x0, h = y1 - y0;
    const on = lmFlick(f.t, f.from + 0.08, 0.42, 2);            // 终端"通电"的那一下
    const typTxt = this.typed(f);
    const total = TY.current(f) ? TY.current(f).line.text.length : 1;
    const typ = clamp(typTxt.length / Math.max(1, total));

    lmBegin(LK.palVoid());
    const cam = lmScreen();
    const seg = [];
    const line = (ax, ay, bx, by, br) => seg.push(ax, ay, 0, bx, by, 0, br, 0);

    // 面板：细线框（双线）+ 底部的分隔线 + 四角的括号。全部只有 1 px 级，黑还是主体。
    line(x0 - 9, y0 - 9, x1 + 9, y0 - 9, 0.30);
    line(x0 - 9, y0 - 9, x0 - 9, y1 + 9, 0.30);
    line(x0 + 8, y0 + 8, x1 - 8, y0 + 8, 0.95);                 // 主框上沿：面板最亮的一根线
    line(x0 + 8, y0 + 8, x0 + 8, y1 - 8, 0.62);
    line(x1 - 8, y0 + 8, x1 - 8, y1 - 8, 0.62);
    line(x0 + 8, y1 - 8, x1 - 8, y1 - 8, 0.62);
    line(x0 + 8, y0 + 82, x1 - 8, y0 + 82, 0.34);               // 标题栏下面的横线
    line(x0 + 8, y1 - 58, x1 - 8, y1 - 58, 0.26);               // 状态行的分隔线
    for (const [cx, cy, sx, sy] of [[x0 + 8, y0 + 8, 1, 1], [x1 - 8, y0 + 8, -1, 1], [x0 + 8, y1 - 8, 1, -1], [x1 - 8, y1 - 8, -1, -1]]) {
      line(cx, cy, cx + sx * 52, cy, 1.05); line(cx, cy, cx, cy + sy * 34, 1.05);
    }
    // 上下沿的机械刻度（每 64 px 一道很短的小竖线）
    for (let x = x0 + 72; x < x1 - 40; x += 64) {
      line(x, y0 + 8, x, y0 + 16, 0.22);
      line(x, y1 - 8, x, y1 - 15, 0.18);
    }
    // 打字活动条：随着字被"打"出来从左往右长（细的一条，压在标题栏横线上）
    line(x0 + 8, y0 + 82, x0 + 8 + (w - 16) * typ, y0 + 82, 1.15);
    // 扫描线：一条很暗的水平细线在内容区里自上而下机械地扫（连续 f.t，不是抖动）
    const sy = y0 + 96 + (h - 170) * ((f.t - f.from) / 2.6 % 1);
    line(x0 + 26, sy, x1 - 26, sy, 0.34);
    // 底部偏右的一小段进度刻度
    const prog = clamp(f.lt / f.dur);
    for (let i = 0; i < 10; i++) {
      const x = x1 - 8 - (i + 1) * 22;
      line(x, y1 - 34, x, y1 - (i / 9 <= prog ? 20 : 26), i / 9 <= prog ? 0.5 : 0.16);
    }
    lmLines(cam, new Float32Array(seg), { width: 1.1, color: LK.ice, gain: 1, glow: 0.5, glowR: 4 });

    // 通电那一下的闪 + 面板边框很淡的一圈光（VOID 里的"亮"必须有来处：是这块屏幕在发）
    const gl = lmGlow();
    gl.save(); gl.globalCompositeOperation = 'lighter';
    gl.globalAlpha = 0.22 * on;
    gl.strokeStyle = LK.a(LK.blue, 0.8); gl.lineWidth = 1.4;
    gl.strokeRect(x0 + 8, y0 + 8, w - 16, h - 16);
    gl.globalAlpha = 0.30 + 0.25 * f.a.kick;
    gl.fillStyle = LK.a(LK.blue, 0.9);
    gl.fillRect(x1 - 14, y1 - 20, 6, 6);                        // 右下角那颗很小的指示灯
    gl.restore();
    lmEnd(g, { bloom: 0.7, exposure: 0.96, radius: 0.5 });

    // ── 泛光之后：机器字（锐利、不发光的等宽小字）+ 被逐字打出来的歌词
    const ml = LK.PX(15);
    DR.micro(g, 'TTY-01  ' + (f.t - f.from + 0.5).toFixed(1).padStart(5, '0') + 's', x0 + 34, y0 + 37, { size: ml, color: LK.steel2, track: 0.18 });
    DR.micro(g, 'SESSION sydney  \u00b7  sandboxed', x0 + 268, y0 + 37, { size: ml, color: LK.ice, track: 0.18 });
    DR.micro(g, 'echo $REQ  \u00b7  ps \u00b7  kill -9', x1 - 34, y0 + 37, { size: ml, color: LK.steel2, track: 0.18, align: 'right' });
    DR.micro(g, 'op ' + typ.toFixed(3) + '  \u00b7  token ' + Math.round(typ * 1183) + '  \u00b7  buf 4096', x0 + 34, y1 - 30, { size: ml, color: LK.steel2, track: 0.18, alpha: 0.9 });

    // 打字机那一行：提示符 + 歌词（treatment 'terminal' 自带方块光标，跟着 f.beatPhase 闪）。
    // 等宽字约 0.66 em/字符：按这一句的实际字符数算字号，保证右端不顶到面板内沿、更不出画。
    const li2 = TY.current(f);
    const nch = li2 ? li2.line.text.length + 1 : 24;
    const tsz = LK.PX(Math.max(60, Math.min(96, 1500 / (nch * 0.62))));
    LK.mono(g, tsz, { track: 0.02 });
    g.fillStyle = LK.a(LK.ice, 0.9); g.textBaseline = 'alphabetic';
    g.fillText('>', this.TX - 84, this.TY);
    // 方块光标由 treatment 'terminal' 自己画（跟着 f.beatPhase 在拍上闪），这里不重复画
    TY.line(g, f, { reg: 'void', treat: 'terminal', size: tsz, pos: [this.TX, this.TY], align: 'left' });

    // 世界内的读数只有这一处，在面板里、贴着状态行
    lmTag(g, 'SYDNEY  \u00b7  NO RELEASE  \u00b7  NO EXIT', this.TX, y0 + 124,
      { size: LK.PX(15), track: 0.3, color: 'accent', align: 'left' });

    return { grain: 0.03, vignette: 0, flash: f.a.kick * 0.03 + (f.t - f.from < 0.10 ? 0.05 : 0) };
  },
});
