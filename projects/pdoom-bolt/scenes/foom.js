// foom — 24.32–26.32（VOID）。副歌第二句 "'cause the future goes FOOM"。
// HERO：指数曲线（沿底边爬 → 在右侧立起来）+ 从曲线末端劈出去的电弧，两道一起劈穿画面（≥60%）。
//       曲线用 LG.curve 采样成控制点，每帧写进线段缓冲喂 lmLines；末端接 BOLT.strike 画进 lmGlow()。
// 字：中部两行（treatment 'collapse'，从一点炸开）——字让开曲线与电弧，画面靠构图给字让位。
// 一帧只有一处最亮：电弧的白热芯 + 曲线末端的等离子点；曲线本身只有 accent 蓝，永远不过阈值。
// 拍点：kick 上曲线抬升；25.58 s "FOOM" 唱到时末端点火，电弧用 f.tick 抖着长出来。
MV.scene('foom', {
  init() {
    this.dist = 6.0;
    this.px = (1 / Math.tan(34 * Math.PI / 360)) * (H / 2) / this.dist;   // 世界单位 → 屏幕 px
    this.cam = lmOrbit({ yaw: 0, pitch: 0, dist: this.dist, fov: 34 });
    const N = 200;
    this.N = N;
    // 曲线的设计尺寸（屏幕 px，y 向下）：起点在左、基线在底，末端立到顶部
    this.G = { x0: 150, yb: 986, xs: 1700, top: 160, expo: 5.6 };
    const G = this.G;
    // LG.curve 采出指数曲线的控制点（这条就是"指数"本身）
    this.ctrl = LG.curve(u => {
      const s = (Math.exp(G.expo * u) - 1) / (Math.exp(G.expo) - 1);
      return [G.x0 + (G.xs - G.x0) * u, G.yb + (G.top - G.yb) * s, 0];
    }, N);
    this.NS = N + Math.ceil(N / 8);            // 曲线段 + 落线段（落线让它读成一张图，而不是一根线）
    this.seg = new Float32Array(this.NS * 8);  // 每帧重写（arr.__v++）
    this.seg.__v = 0;
    this.pt = new Float32Array((N + 1) * 3);
    // 底部基线 + 从末端继续往右上的虚线：外推只是预测，FOOM 一到就被真的电弧顶掉
    this.axis = LG.pairs([[[G.x0 - 60, G.yb], [W - 90, G.yb]]], { bright: 0.22 });
    const pred = [];
    for (let i = 0; i < 22; i++) {
      const a = i * 0.05;
      const x0 = G.xs + a * 920, y0 = G.top - a * 640;
      pred.push([[x0, y0], [x0 + 26, y0 - 18]]);
    }
    this.pred = LG.pairs(pred, { bright: 0.5 });
  },

  /** 屏幕 px → 世界坐标（相机正对，全部落在 z = 0 平面上）。 */
  w2(sx, sy) { return [(sx - W / 2) / this.px, (H / 2 - sy) / this.px]; },

  /** 把当前形状写进线段缓冲，返回末端（屏幕坐标）。rise = 起身量；jag = 电弧接手后的抖动幅度。 */
  shape(f, rise, jag) {
    const N = this.N, C = this.ctrl, S = this.seg, P = this.pt, G = this.G;
    const baseW = (H / 2 - G.yb) / this.px;                  // 基线的世界 y
    let tx = G.xs, ty = G.yb;
    for (let i = 0; i <= N; i++) {
      const c = C[i];
      const s = (c[1] - G.yb) / (G.top - G.yb);              // 形状 0..1（底 → 顶）
      let sx = c[0], sy = G.yb + (c[1] - G.yb) * rise;
      const j = jag * s;                                     // 只有立起来的那一段是电，平的那段是历史
      if (j > 0.01) { sx += (hash(i, 11, f.tick) - 0.5) * j; sy += (hash(i, 13, f.tick) - 0.5) * j; }
      const wv = this.w2(sx, sy);
      P[i * 3] = wv[0]; P[i * 3 + 1] = wv[1]; P[i * 3 + 2] = s * 0.5;
      tx = sx; ty = sy;
    }
    let k = 0;
    const put = (ax, ay, az, bx, by, bz, br) => {
      const o = k * 8;
      S[o] = ax; S[o + 1] = ay; S[o + 2] = az;
      S[o + 3] = bx; S[o + 4] = by; S[o + 5] = bz;
      S[o + 6] = br; S[o + 7] = 0; k++;
    };
    for (let i = 0; i < N; i++) {
      const a = i * 3, b = (i + 1) * 3;
      put(P[a], P[a + 1], P[a + 2], P[b], P[b + 1], P[b + 2], 1);
    }
    for (let i = 8; i < N; i += 8) {                          // 落线：从曲线垂到底线（很淡的"面积图"）
      const a = i * 3;
      put(P[a], P[a + 1], P[a + 2], P[a], baseW, 0, 0.3);
    }
    S.__v++;
    return [tx, ty];
  },

  render(g, f) {
    const t0 = f.from;
    const rise = clamp(0.42 + 0.58 * ease.outCubic(clamp((f.t - t0) / 1.2)) + 0.05 * f.a.kick + 0.03 * f.a.low);
    const ign = ease.inCubic(clamp((f.t - 25.577) / 0.3));    // "FOOM" 唱到 → 末端点火
    const jag = 7 * ign;
    const tip = this.shape(f, rise, jag);
    const punch = 1 + 0.05 * f.a.kick;

    lmBegin(LK.palVoid());
    // 参考线：底部基线（虚线，极淡）+ 末端之外的预测（虚线）——图纸的规矩留在黑里
    lmLines(this.cam, this.axis, { width: 0.9, color: 'dim', gain: 0.28, dash: [7, 12] });
    lmLines(this.cam, this.pred, { width: 0.9, color: 'dim', gain: 0.42 * (1 - ign) + 0.1, dash: [4, 8] });
    // 曲线本体（+ 落线）：只有 accent 蓝，永远不到泛光阈值
    lmLines(this.cam, this.seg, {
      width: 1.5 + 1.3 * ign, color: 'accent', gain: (0.44 + 0.18 * f.a.low + 0.1 * f.a.kick) * (0.78 + 0.22 * ign),
      glow: 0.5, dof: 7,
    });

    // ── 电弧：从曲线末端劈出去（进画左沿 → 末端 → 出画右下角），白热芯是全帧唯一的最亮处
    if (ign > 0.001) {
      const gl = lmGlow();
      const arm = (ex, ey, seed, w, br, bl) => {
        const b = [lerp(tip[0], ex, clamp(ign * 1.15)), lerp(tip[1], ey, clamp(ign * 1.15))];
        BOLT.strike(gl, tip, b, { tick: f.tick, seed, w, jag: 0.15, branch: br, branchLen: bl });
      };
      arm(-90, 214, 21, 4.6 * punch, 4, 170);       // 沿画面顶部劈到左沿
      arm(1140, -120, 37, 3.4 * punch, 3, 130);     // 往上一道，出画顶
      arm(1890, 1140, 53, 4.2 * punch, 4, 190);     // 沿右侧劈到右下角
      BOLT.plasma(gl, tip[0], tip[1], 18 + 12 * f.a.kick + 8 * (1 - ign), f.t, { alpha: 0.55 });
      BOLT.sparks(gl, tip[0], tip[1], 26, f.t, { at: 25.577, life: 0.9, speed: 900, size: 2.6, alpha: 0.75 });
    }
    lmEnd(g, { bloom: 0.95 + 0.2 * ign });

    // 字：中部两行，从中点炸开（collapse）。字落在曲线与电弧围出的黑口袋里，不压 HERO。
    const k = prog(f.t, t0, t0 + 0.5, ease.outExpo);
    TY.line(g, f, { reg: 'void', treat: 'collapse', words: [0, 3], x: 940, y: 600, size: 132, k, cx: 940, cy: 668 });
    TY.line(g, f, { reg: 'void', treat: 'collapse', words: [3, 5], x: 940, y: 772, size: 132, k, cx: 940, cy: 668 });
    // 唯一一处世界内读数：贴着曲线平的那一段（图的轴标）
    lmTag(g, 'RUN 07 — x(t) = e^5.6t   ' + (ign > 0.05 ? 'ARC' : 'PREDICTED'), 196, 902, { size: 14, track: 0.28, color: 'dim', align: 'left' });
    return { grain: 0.03, vignette: 0, shake: 3.2 * f.a.kick * ign };
  },
});
