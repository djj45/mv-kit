// market — 18（62.54–66.22，VOID）。HERO：行情图（粗行情杆 + 横轴刻度 + 网格，占画面 ≥55%）→ 汇聚点。
// 前半 "NVDA to the moon"：一整套行情柱从横轴长上去，最后一根是特别粗的 NVDA 行情杆，一路冲到画面上部；
//   唱到 "moon" 的那一下，杆顶伸出一根针，用投影反算长度，直接捅出画外（屏幕 y < 0）。
// 后半 "The Omega Point's coming soon"：图上所有的线——网格、刻度、柱、折线、针——一条条向同一个点收拢
//   （从左到右错开成一道波，收拢过程看得见），最后那个点是这一帧唯一白热的地方，其余全暗下去。
// 亮度：网格 / 刻度 / 柱都按"看得见"给增益，不再是一片黑里一个小亮点。
// 字在下部（lmEnd 之后画，锐利、不发光）；一帧只有一处最亮。只依赖 f.t；柱 / 线的缓冲每帧按 f.t 重建。
MV.scene('market', {
  init() {
    const N = 22;
    this.N = N;
    this.yb = -0.186;                     // 横轴（世界坐标；屏幕 y ≈ 690）
    this.x0 = -1.62; this.x1 = 1.62; this.dx = (this.x1 - this.x0) / (N - 1);
    this.bw = 0.085; this.zb = 0.055;     // 柱宽 / 柱的厚度（前后各一半）
    this.shape = [];                      // 一根根涨上去的行情：错落的上升序列（脚本里算死，不用 random）
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      this.shape.push(0.26 + 0.46 * Math.pow(u, 0.85) + 0.16 * (hash(i, 21, 3) - 0.5));
    }
    this.shape[N - 1] = 0.80;             // 最后一根：全图最高、最粗的那根 NVDA 行情杆
    this.omega = [1.14, 0.78, 0];         // 汇聚点：画面右上
    this.cam = lmOrbit({ yaw: 0.20, pitch: 0.15, dist: 4.6, fov: 26, shift: [0, -30] });
  },
  /** 一句里某个词开始的时间（大小写都不敏感）。 */
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
    const w = LK.measure(g, text, size, { track: 0.02 });
    return w > maxW ? size * maxW / w : size;
  },
  /** 一根行情柱：一块有厚度的发光板（前脸竖线 + 顶面 + 侧棱），不是空心盒子。 */
  pushBar(list, xi, h, bw, nv, u) {
    const yb = this.yb, zb = this.zb, x0 = xi - bw / 2, x1 = xi + bw / 2, top = yb + h;
    for (let j = 0; j <= nv; j++) {
      const x = x0 + (x1 - x0) * j / nv;
      list.push([[x, yb, zb], [x, top, zb], u, 1]);
    }
    list.push([[x0, top, zb], [x1, top, zb], u, 1]);          // 顶面：前棱 + 后棱 + 两条侧棱
    list.push([[x0, top, -zb], [x1, top, -zb], u, 0.75]);
    list.push([[x0, top, zb], [x0, top, -zb], u, 0.75]);
    list.push([[x1, top, zb], [x1, top, -zb], u, 0.75]);
  },
  render(g, f) {
    const cam = this.cam, om = this.omega, N = this.N, yb = this.yb;
    const moonT = this.word(f, 'moon'), omT = this.word(f, 'Omega');
    const grow = ease.outCubic(clamp((f.t - f.from) / Math.max(0.35, moonT - f.from - 0.15)));
    const poleK = ease.outCubic(clamp((f.t - (f.from + 0.35)) / 0.85));
    const moonK = ease.outExpo(clamp((f.t - moonT) / 0.26));
    const K = clamp((f.t - omT) / 1.70);                       // 汇聚进度（每条线自己的错开在 cvt 里）
    const kick = f.a.kick;
    // 汇聚：每条线自己的端点向 omega 走，左边先走、右边后走 → 一道看得见的收拢波
    const cvt = (p, u) => {
      if (K <= 0.001) return p;
      const st = 0.42 * clamp(u, 0, 1) + 0.06 * hash(Math.round(u * 97), 5);
      const k = clamp((K - st) / Math.max(0.22, 1 - st));
      const e = k * k * (3 - 2 * k);
      return [lerp(p[0], om[0], e), lerp(p[1], om[1], e), lerp(p[2], om[2], e)];
    };
    const xAt = i => this.x0 + this.dx * i;
    const hs = [];
    for (let i = 0; i < N; i++) hs.push(Math.max(0.04, this.shape[i] * (0.16 + 0.84 * grow) + 0.02 * kick));
    const ph = i => (i === N - 1 ? poleK : 1);                 // 最后一根柱子（NVDA 行情杆）晚一步冲上去

    // ── 建这一帧的线表（网格 / 刻度 / 柱 / 折线 / 针），每条都带自己的 u（收拢波的相位）
    const grid = [], tick = [], bars = [], poly = [];
    for (let k = 1; k <= 5; k++) {                             // 网格：5 条横线 + 6 条竖线
      const y = yb + k * 0.24;
      grid.push([[this.x0 - 0.06, y, 0], [this.x1 + 0.06, y, 0], k / 6]);
    }
    for (let j = 0; j <= 5; j++) {
      const x = this.x0 + (this.x1 - this.x0) * j / 5;
      grid.push([[x, yb, 0], [x, yb + 1.2, 0], j / 5]);
    }
    for (let i = 0; i < N; i++) {                              // 横轴刻度：每根柱子下面一小格，每 5 根一长格
      const u = i / (N - 1), big = i % 5 === 0;
      tick.push([[xAt(i), yb, 0], [xAt(i), yb - (big ? 0.075 : 0.042), 0], u]);
    }
    for (let i = 0; i < N; i++) {                              // 柱：最后一根是特别粗的 NVDA 行情杆
      const last = i === N - 1, pk = ph(i);
      if (pk <= 0.01) continue;
      this.pushBar(bars, xAt(i), hs[i] * pk, last ? 0.22 : this.bw, last ? 9 : 3, i / (N - 1));
    }
    for (let i = 0; i < N; i++) {                              // 折线：穿过柱顶
      const u = i / (N - 1), y = yb + hs[i] * ph(i);
      if (i) poly.push([[xAt(i - 1), yb + hs[i - 1] * ph(i - 1), 0], [xAt(i), y, 0], u]);
    }
    // 针：从杆顶捅出去。用投影反算需要多长，保证它真的出画（屏幕 y < 0）
    const tipW = [this.x1, yb + hs[N - 1] * poleK, 0];
    const tipS = cam.project(tipW) || [0, 300];
    const ppu = cam.px(tipS[2]) || 500;
    const need = (tipS[1] + 90) / ppu;                         // 走到屏幕 y = -60 需要的世界长度
    const nlen = moonK * need;
    const needle = moonK > 0.002 ? [[tipW, [tipW[0], tipW[1] + nlen, 0], 1]] : [];

    // ── 出图
    const seg = (list) => {
      const out = [];
      for (const [a, b, u, q] of list) {
        const A = cvt(a, u), B = cvt(b, u);
        out.push(A[0], A[1], A[2], B[0], B[1], B[2], q == null ? 1 : q, 0);
      }
      return new Float32Array(out);
    };
    const fade = 1 - 0.86 * clamp((K - 0.35) / 0.65);           // 收拢到最后：别的线都暗下去
    lmBegin(LK.palVoid());
    lmLines(cam, seg(grid), { width: 0.9, color: 'dim', gain: 0.9 * fade, dash: [5, 7], dynamic: true });
    lmLines(cam, seg(tick), { width: 1.5, color: 'accent', gain: 0.75 * fade, dynamic: true });
    lmLines(cam, seg(bars), { width: 1.6, color: 'accent', gain: (0.62 + 0.18 * kick) * fade, glow: 0.5, dynamic: true });
    lmLines(cam, seg(poly), { width: 2.2, color: 'warn', gain: 0.85 * fade, glow: 0.6, dynamic: true });
    const axis = [];
    for (let j = 0; j < 10; j++) {
      const ua = j / 10, ub = (j + 1) / 10;
      axis.push([[lerp(this.x0 - 0.08, this.x1 + 0.08, ua), yb, 0], [lerp(this.x0 - 0.08, this.x1 + 0.08, ub), yb, 0], ua]);
    }
    lmLines(cam, seg(axis), { width: 2.4, color: 'accent', gain: 0.8 * fade, glow: 0.5, dynamic: true });   // 横轴
    if (needle.length) {
      lmLines(cam, seg(needle), { width: 7, color: 'accent', gain: (0.6 + 0.25 * kick) * fade, glow: 0.8, dynamic: true });
      lmLines(cam, seg(needle), { width: 2.2, color: 'hot', gain: 1.0 * fade, glow: 0.6, dynamic: true });
    }
    // 一帧唯一的最亮：前半是活价 → 唱到 "moon" 是针尖 → 后半是汇聚点
    const liveK = clamp(1 - K / 0.5);
    const pLive = cam.project([tipW[0], tipW[1] + nlen + 0.04, 0]) || [1500, 120];
    const pOm = cam.project([om[0], om[1], om[2]]) || [1540, 110];
    const gl = lmGlow();
    gl.save(); gl.globalCompositeOperation = 'lighter';
    if (liveK > 0.02) BOLT.plasma(gl, pLive[0], pLive[1], 22 + 14 * moonK, f.t, { alpha: 0.6 * liveK, core: 0.5 });
    if (K > 0.18) {
      const k = clamp((K - 0.18) / 0.5);
      BOLT.radial(gl, pOm[0], pOm[1], 70 + 200 * k, LK.blue, 0.5 * k, { core: 0.14 });
      gl.fillStyle = LK.a(LK.hot, 0.55 + 0.45 * k);
      gl.beginPath(); gl.arc(pOm[0], pOm[1], 4 + 7 * k, 0, TAU); gl.fill();
      if (k > 0.55) BOLT.ring(gl, pOm[0], pOm[1], (k - 0.55) / 0.45, { r0: 14, r1: 520, color: LK.blue, core: LK.hot, w: 2.4, a: 0.6 });
    }
    gl.restore();
    lmEnd(g, { bloom: 0.92 });

    lmTag(g, TY.index(f) >= 20 ? 'MARKET 18 — OMEGA POINT / ALL SERIES CONVERGE' : 'MARKET 18 — NVDA / LOG SCALE, RISING',
      120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, moonK > 0.5 ? 'NVDA' : 'NVDA +' + (24 + 260 * grow).toFixed(0) + '%', Math.min(pLive[0] + 22, W - 300), clamp(pLive[1], 150, H - 210),
      { size: 15, track: 0.22, color: 'accent', align: 'left' });            // 唯一的世界内读数，贴着行情走
    const cur = TY.current(f, f.from);
    const txt = cur ? cur.line.text : '';
    if (TY.index(f) >= 20) {
      TY.line(g, f, { reg: 'void', treat: 'collapse', x: 960, y: 930, size: this.fit(g, txt, 170, 1420), k: 1 - 0.55 * K, since: f.from });
    } else {
      TY.line(g, f, { reg: 'void', treat: 'slam', x: 960, y: 930, size: this.fit(g, txt, 190, 1500), since: f.from });
    }
    return { grain: 0.03, vignette: 0, shake: 2.6 * kick * clamp(K + moonK) };
  },
});
