// stack — 乐章 8 第二镜（1:49.33–1:54.24）。VOID：等距堆叠的层板，向上无限延伸（transformer 堆）。
// HERO：层叠体（每层 2.6×2.6 的板 + 四根立柱，板上是一格一格的"权重点阵"）≥62%。
// 字区：T[34] = 'slam'，压在下三分之一（上方全是层板，字让不出中间）。
// 拍点：每个 kick 多一层（板从上面落到位）；每层边缘一直在跳蓝电弧；唱到 "way!" 时全体一起放电。
MV.scene('stack', {
  init() {
    this.N = 30;                 // 建好的层数（够整镜用）
    this.W = 3.7; this.D = 3.7; this.T = 0.085; this.GAP = 0.44;
    this.COLS = 10;              // 每层的权重点阵 10×10
    // ① 层板棱：每层 12 段，自下而上排在同一个缓冲里 —— 用 upto 就能只画"已经长出来的层"
    const E = this.edges(this.W, this.T, this.D);
    this.perLayer = E.length / 6;
    this.plateSegs = new Float32Array(this.N * this.perLayer * 8);
    for (let i = 0; i < this.N; i++) {
      const y = i * this.GAP, off = i * this.perLayer * 8;
      for (let k = 0; k < E.length; k += 6) {
        const s = off + (k / 6) * 8;
        this.plateSegs[s] = E[k]; this.plateSegs[s + 1] = E[k + 1] + y; this.plateSegs[s + 2] = E[k + 2];
        this.plateSegs[s + 3] = E[k + 3]; this.plateSegs[s + 4] = E[k + 4] + y; this.plateSegs[s + 5] = E[k + 5];
        this.plateSegs[s + 6] = 0.35 + 0.65 * (i / (this.N - 1)); this.plateSegs[s + 7] = 0;
      }
    }
    // ② 每层板顶面的权重点阵（点云必须构成形体：它们就是每一层的矩阵）
    const PPL = this.COLS * this.COLS;
    this.ppl = PPL;
    this.layerPts = new Float32Array(this.N * PPL * 3);
    for (let i = 0; i < this.N; i++) for (let c = 0; c < this.COLS; c++) for (let r = 0; r < this.COLS; r++) {
      const j = i * PPL + c * this.COLS + r;
      this.layerPts[j * 3] = (-0.5 + (c + 0.5) / this.COLS) * this.W * 0.86;
      this.layerPts[j * 3 + 1] = i * this.GAP + this.T * 0.62;
      this.layerPts[j * 3 + 2] = (-0.5 + (r + 0.5) / this.COLS) * this.D * 0.86;
    }
    // ③ 四根立柱：整根一次建好（层板沿它长上去 —— "无限延伸"的导轨）
    const P = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * this.W * 0.44, z = sz * this.D * 0.44;
      P.push([x, -1.2, z], [x, this.N * this.GAP + 1.6, z]);
    }
    this.posts = LG.pairs(P, { bright: 0.7 });
    // ④ 每帧要重填的小缓冲：最上面那一层、上面几层"幽灵"、电弧
    this.topSeg = new Float32Array(this.perLayer * 8);
    this.ghostSeg = new Float32Array(3 * this.perLayer * 8);
    this.maxArc = 4600;
    this.arcBuf = new Float32Array(this.maxArc * 8);
    this.arcN = 0;
    this.topPts = new Float32Array(PPL * 3);
    this.edge = [];              // 每层板顶面周长参数化用的四条边
    this.per = 2 * (this.W + this.D);
  },

  /** 盒子的 12 条棱（[ax,ay,az,bx,by,bz]×n）。 */
  edges(w, h, d) {
    const V = [];
    for (const x of [-w / 2, w / 2]) for (const y of [-h / 2, h / 2]) for (const z of [-d / 2, d / 2]) V.push([x, y, z]);
    const out = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      const t = i ^ j;
      if (t === 1 || t === 2 || t === 4) out.push(V[i][0], V[i][1], V[i][2], V[j][0], V[j][1], V[j][2]);
    }
    return out;
  },

  /** 板顶面周长上 u∈[0,1) 处的一点（电弧的落点）。 */
  onEdge(u, y, w, d) {
    const a = ((u % 1) + 1) % 1 * (2 * (w + d));
    if (a < w) return [-w / 2 + a, y, -d / 2];
    if (a < w + d) return [w / 2, y, -d / 2 + (a - w)];
    if (a < 2 * w + d) return [w / 2 - (a - w - d), y, d / 2];
    return [-w / 2, y, d / 2 - (a - 2 * w - d)];
  },

  /** 往电弧缓冲里追一条 3D 电弧（先算进临时数组，再写 8 float 一段）。 */
  pushArc(a, b, o) {
    const pts = BOLT.arc3(a, b, o);
    const lift = o.lift || 0;
    for (let i = 0; i < pts.length - 1; i++) {
      if (this.arcN >= this.maxArc - 1) return;
      const u0 = i / (pts.length - 1), u1 = (i + 1) / (pts.length - 1);
      const s = this.arcN * 8;
      this.arcBuf[s] = pts[i][0]; this.arcBuf[s + 1] = pts[i][1] + lift * Math.sin(Math.PI * u0); this.arcBuf[s + 2] = pts[i][2];
      this.arcBuf[s + 3] = pts[i + 1][0]; this.arcBuf[s + 4] = pts[i + 1][1] + lift * Math.sin(Math.PI * u1); this.arcBuf[s + 5] = pts[i + 1][2];
      this.arcBuf[s + 6] = o.bright == null ? 1 : o.bright; this.arcBuf[s + 7] = 0;
      this.arcN++;
    }
  },

  render(g, f) {
    const b0 = f.audio.beatAt(f.from);
    const db = f.beat - b0;                                   // 镜内已经过了几拍（连续）
    const fl = Math.floor(db);
    const N = clamp(3 + fl, 3, this.N - 4);                   // 每拍多一层（正好落在拍上）
    const hit = clamp(f.a.kick * 3.2);                        // 板落到位的冲击
    const finalK = prog(f.t, 112.98, 113.30, ease.outCubic);   // "way!" 唱完：全体一起放电
    const camY = this.GAP * (db - 2.1);                       // 层板越长越高，镜头连续地跟着抬
    const cam = lmOrbit({
      yaw: 0.40 + 0.14 * LK.in(f, f.dur), pitch: 0.30, dist: 10.2, fov: 31,
      target: [0, camY, 0], focus: 10.2,
    });
    const drop = 0.9 * (1 - ease.outCubic(clamp((db - fl) / 0.42)));   // 新一层从上面落到位
    const topY = (N - 1) * this.GAP + drop;

    // 最上面那一层：单独一份缓冲，每帧重填（它是这一帧最亮的一块板）
    const E = this.edges(this.W, this.T, this.D);
    for (let k = 0; k < E.length; k += 6) {
      const s = (k / 6) * 8;
      this.topSeg[s] = E[k]; this.topSeg[s + 1] = E[k + 1] + topY; this.topSeg[s + 2] = E[k + 2];
      this.topSeg[s + 3] = E[k + 3]; this.topSeg[s + 4] = E[k + 4] + topY; this.topSeg[s + 5] = E[k + 5];
      this.topSeg[s + 6] = 1; this.topSeg[s + 7] = 0;
    }
    for (let i = 0; i < this.ppl; i++) {                       // 最上一层的点阵也更亮
      const s = i * 3, sx = (-0.5 + (i % this.COLS + 0.5) / this.COLS) * this.W * 0.86;
      const sz = (-0.5 + (Math.floor(i / this.COLS) + 0.5) / this.COLS) * this.D * 0.86;
      this.topPts[s] = sx; this.topPts[s + 1] = topY + this.T * 0.62; this.topPts[s + 2] = sz;
    }
    // 上面三层"幽灵"：告诉眼睛它还要往上长（很淡，虚线感靠低亮度）
    for (let i = 1; i <= 3; i++) {
      const y = topY + i * this.GAP, off = (i - 1) * this.perLayer * 8;
      for (let k = 0; k < E.length; k += 6) {
        const s = off + (k / 6) * 8;
        this.ghostSeg[s] = E[k]; this.ghostSeg[s + 1] = E[k + 1] + y; this.ghostSeg[s + 2] = E[k + 2];
        this.ghostSeg[s + 3] = E[k + 3]; this.ghostSeg[s + 4] = E[k + 4] + y; this.ghostSeg[s + 5] = E[k + 5];
        this.ghostSeg[s + 6] = 0.35 / i; this.ghostSeg[s + 7] = 0;
      }
    }

    // 每层边缘的电弧（"每层都在放电"）
    this.arcN = 0;
    for (let i = 0; i < N; i++) {
      const y = i * this.GAP + this.T * 0.5;
      const na = i >= N - 4 ? 2 : 1;
      for (let k = 0; k < na; k++) {
        const u0 = hash(i, k * 7 + 1, 1), u1 = u0 + 0.10 + hash(i, k * 7 + 2, 2) * 0.22;
        const a = this.onEdge(u0, y, this.W, this.D), b = this.onEdge(u1, y, this.W, this.D);
        this.pushArc(a, b, {
          tick: f.tick + i * 3, seed: i * 13 + k + 1, jag: 0.30, depth: 3, dz: 0.06,
          lift: 0.10 + 0.16 * hash(i, k, 3),
          bright: (0.45 + 0.55 * (i / Math.max(1, N - 1))) * (0.7 + 0.3 * hash(i, k, 4)),
        });
      }
    }
    // 全体放电：唱完 "way!" 那一刻，一根电弧从底穿到顶 + 每层再加一道
    if (finalK > 0.001) {
      const a = this.onEdge(0.05, topY * 0.45, this.W, this.D), b = this.onEdge(0.55, topY + 0.5, this.W, this.D);
      this.pushArc(a, b, { tick: f.tick, seed: 77, jag: 0.16, depth: 5, dz: 1.6, bright: 1 * finalK });
      for (let i = 0; i < N; i++) {
        const y = i * this.GAP + this.T * 0.5;
        this.pushArc(this.onEdge(hash(i, 9, 1), y, this.W, this.D), this.onEdge(hash(i, 9, 1) + 0.3, y, this.W, this.D),
          { tick: f.tick + 5, seed: 90 + i, jag: 0.34, depth: 3, lift: 0.3, bright: 0.45 * finalK });
      }
    }
    // 板落到位的火花：新一层出现的那两拍里，它的边缘多两道短弧
    if (hit > 0.05) {
      const y = topY + this.T * 0.5;
      for (let k = 0; k < 3; k++) {
        const u0 = hash(k, f.tick, 5);
        this.pushArc(this.onEdge(u0, y, this.W, this.D), this.onEdge(u0 + 0.18, y, this.W, this.D),
          { tick: f.tick + k, seed: 200 + k, jag: 0.4, depth: 2, lift: 0.22, bright: 1 });
      }
    }

    lmBegin(LK.palVoid());
    lmLines(cam, this.posts, { width: 1.3, color: 'dim', gain: 0.55, glow: 0.4 });
    lmLines(cam, this.plateSegs, { width: 1.4, color: 'dim', gain: 0.62, glow: 0.45, upto: N / this.N });
    lmLines(cam, this.ghostSeg, { width: 1.0, color: 'dim', gain: 0.9, glow: 0.2 });
    lmPoints(cam, this.layerPts, { size: 1.5, color: 'dim', gain: 0.26, twinkle: 0.22, t: f.t, count: N * this.ppl, fog: 34 });
    lmLines(cam, this.topSeg, { width: 2.2, color: 'warn', gain: 0.8, glow: 0.7 });
    lmPoints(cam, this.topPts, { size: 2.0, color: 'accent', gain: 0.55, twinkle: 0.5, t: f.t });
    lmLines(cam, this.arcBuf.subarray(0, this.arcN * 8), { width: 1.4, color: 'accent', gain: 0.78 + 0.25 * finalK, glow: 0.9 });

    const gl = lmGlow();
    if (finalK > 0.001) BOLT.radial(gl, W * 0.5, H * 0.34, 640 * finalK, LK.blue, 0.20 * finalK);
    lmEnd(g, { bloom: 0.95 + 0.15 * finalK });

    lmTag(g, 'LAYERS ' + N + ' / \u221e \u00b7 ALL THE WAY UP', 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, 'DISCHARGE ' + (this.arcN / 8 | 0) + ' ARCS', W - 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'right' });
    TY.line(g, f, { reg: 'void', treat: 'slam', x: 960, y: 892, size: 224, align: 'center' });   // 喊出来的那句
    return { grain: 0.03, vignette: 0, flash: 0.04 * hit + 0.06 * finalK, shake: 4 * hit };
  },
});
