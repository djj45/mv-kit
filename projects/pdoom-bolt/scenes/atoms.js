// atoms — "I feel my atoms rearranging"（49.56–52.97，约 3.4 s）。物质重新结晶。
// HERO：一块正在重新结晶的晶格（PART.lattice(5, 1.30) 的棱 + 顶点云，占画面 ≥55%）。
// 结构：开头是散的点云（每个顶点按 hash 甩到自己的晶格位置之外），随 kick 一层层合到位；
//       "rearranging"（51.38 s）唱到时整块绕 y 轴转 90°（model 上的连续旋转，不是抖动）。
// 字区：下沿（treatment 'weave'：词由经纬线织出来）。一帧一处最亮：晶格中心那一小块（点最密处）。
MV.scene('atoms', {
  init() {
    this.N = 5; this.GAP = 1.30;
    this.mesh = PART.lattice(this.N, this.GAP, { r: 0.205, sn: 8, sv: 4 });
    this.L = this.GAP * this.N;                      // 整块边长 ≈ 6.5 世界单位
    const nv = this.mesh.V.length;
    // 每个顶点的"归属原子层"（y 越高越晚合到位）
    this.vl = this.mesh.V.map(v => clamp((v[1] / this.GAP + (this.N - 1) / 2) / (this.N - 1)));
    // 棱 → 线段缓冲（8 个数一段），并记下每段属于哪一层（取两端里较晚的那层）
    const E = S3.edges(this.mesh);
    this.sl = new Float32Array(E.length);
    this.seg = new Float32Array(E.length * 8);
    for (let i = 0; i < E.length; i++) {
      const a = E[i].a, b = E[i].b, A = this.mesh.V[a], B = this.mesh.V[b];
      this.seg[i * 8] = A[0]; this.seg[i * 8 + 1] = A[1]; this.seg[i * 8 + 2] = A[2];
      this.seg[i * 8 + 3] = B[0]; this.seg[i * 8 + 4] = B[1]; this.seg[i * 8 + 5] = B[2];
      this.seg[i * 8 + 6] = 1; this.seg[i * 8 + 7] = 0;
      this.sl[i] = Math.max(this.vl[a], this.vl[b]);
    }
    // 合到位的位置（= 网格顶点）与散开的位置：都在 init 里算好，render 只做插值。
    // 散开是"每个原子整团一起偏"（球和它的键不离散），不然点云会变成禁止用的氛围尘。
    this.P = new Float32Array(nv * 3);
    this.SC = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) {
      const v = this.mesh.V[i];
      this.P[i * 3] = v[0]; this.P[i * 3 + 1] = v[1]; this.P[i * 3 + 2] = v[2];
      // 这个顶点属于哪个原子（球心 / 键的哪个端点）
      const ax = Math.round(v[0] / this.GAP), ay = Math.round(v[1] / this.GAP), az = Math.round(v[2] / this.GAP);
      const q = (ax + 9) * 1000 + (ay + 9) * 100 + (az + 9);        // 原子的稳定编号
      const a0 = ax * this.GAP, a1 = ay * this.GAP, a2 = az * this.GAP;
      const r0 = Math.hypot(a0, a1, a2) || 1;
      const push = this.L * (0.07 + 0.10 * hash(q, 3));             // 每个原子偏出去的远近
      const jx = (hash(q, 4) - 0.5) * 1.1 * this.GAP, jy = (hash(q, 5) - 0.5) * 1.1 * this.GAP, jz = (hash(q, 6) - 0.5) * 1.1 * this.GAP;
      // 沿"从中心向外"的方向推 + 一层横向抖动：散开的是一块歪掉、还没长好的晶体，不是一团雾
      this.SC[i * 3] = v[0] + a0 / r0 * push + jx;
      this.SC[i * 3 + 1] = v[1] + a1 / r0 * push + jy;
      this.SC[i * 3 + 2] = v[2] + a2 / r0 * push + jz;
    }
    this.NV = nv;
    this.out = new Float32Array(nv * 3);              // lmMorph 的输出缓冲（复用）
    this.body = new Float32Array(E.length * 8);       // 按亮度分层的线段缓冲（复用）
    this.rot = [0, 0, 0];
    this.mdl = { rot: this.rot };
    // 晶体外面那圈很淡的装配环（衬出"一块晶体"，也让画面不只一个物体）
    this.ring = LG.circle(this.L * 0.86, 96);
  },
  /** 这一镜里的 kick 时刻（前 6 个：5 层晶体 + 1 次装配环收拢）。只算一次。 */
  kicks(f) {
    if (!this._k) {
      this._k = f.audio.events('kick', f.from - 0.05, f.to + 0.05).slice(0, 6).map(e => e.t);
      while (this._k.length < 6) this._k.push(f.from + 0.55 * this._k.length);
    }
    return this._k;
  },
  /** 第 i 层合到位的进度（0..1）：每拍一层，从下往上长。 */
  layer(f, i) { const t0 = this.kicks(f)[clamp(i, 0, 5)]; return prog(f.t, t0 - 0.10, t0 + 0.32, ease.outCubic); },
  render(g, f) {
    // 转 90°：从 "rearranging" 唱到（51.38 s）起，用 1.15 s 转到位，之后停住
    this.rot[1] = (Math.PI / 2) * prog(f.t, 51.38, 52.53, ease.inOutCubic);
    // 相机：斜 45° 看这块晶体，晶体占画面高约 45%（边长 6.5 u × 119 px/u ≈ 775 px，宽约 40%）
    const cam = lmOrbit({
      yaw: -1.22, pitch: 0.28, dist: 21, fov: 36, focus: 21,
      target: [0, 1.15, 0], shift: [W * 0.015, 0],
    });

    lmBegin(LK.palVoid());
    // 装配环：贴着晶体的水平细环（不是"氛围"——它有明确的中心和半径）
    lmLines(cam, this.ring, { width: 0.9, color: 'dim', gain: 0.4, dash: [4, 10], model: this.mdl });

    // ── 点云：散 → 合。每个点按自己那一层的进度飞到位，swirl 让路径带一点弧（stagger 是"一层层"）。
    const kTop = this.layer(f, this.N - 1);
    lmMorph(this.SC, this.P, clamp(kTop), { out: this.out, stagger: 0.66, swirl: 0.45, seed: 5, ease: ease.outCubic });
    lmPoints(cam, this.out, {
      size: 0.85, gain: 0.18 + 0.10 * kTop, dof: 4.5, twinkle: 0.25, t: f.t,
      dynamic: true, model: this.mdl,
    });

    // ── 线框：键和原子的棱。到位的段用完整亮度，还在飞的段压到 32%，所以"合"是看得见的。
    const seg = this.seg, sl = this.sl, body = this.body, ns = sl.length;
    let bn = 0;
    for (let i = 0; i < ns; i++) {
      const br = 0.32 + 0.68 * this.layer(f, Math.round(sl[i] * (this.N - 1)));
      if (br <= 0.34) continue;                       // 还没轮到它：先不画（散着的段会糊掉点云）
      const o = bn * 8, s = i * 8;
      body[o] = seg[s]; body[o + 1] = seg[s + 1]; body[o + 2] = seg[s + 2];
      body[o + 3] = seg[s + 3]; body[o + 4] = seg[s + 4]; body[o + 5] = seg[s + 5];
      body[o + 6] = br; body[o + 7] = 0;
      bn++;
    }
    lmLines(cam, body.subarray(0, bn * 8), { width: 0.95, color: 'accent', gain: 0.50, glow: 0.45, model: this.mdl });

    // ── 一处白热：晶体中心那一小块（点最密的地方），随合拢呼吸
    const gl = lmGlow();
    gl.save(); gl.globalCompositeOperation = 'lighter';
    const c0 = cam.project(lmXf(this.mdl, [0, 0, 0]));
    if (c0) BOLT.plasma(gl, c0[0], c0[1], LK.PX(24 + 20 * kTop), f.t, { color: LK.ice, core: '#FFFFFF', alpha: 0.26 + 0.28 * kTop });
    gl.restore();
    lmEnd(g, { bloom: 0.70 + 0.30 * kTop, exposure: 0.98, radius: 0.5 });

    // ── 泛光之后：世界内的读数（只有一处，贴着晶体）
    if (c0) {
      // 引线的锚点钉在画面坐标上（晶体转的时候读数不跟着甩）
      const ax = W * 0.64, ay = H * 0.27;
      let lyr = 0;
      for (let i = 0; i < this.N; i++) if (this.layer(f, i) > 0.85) lyr++;
      lmLabel(g, ax, ay, 'LAYERS ' + lyr + '/' + this.N + '  \u00b7  MESH ' + (kTop * 100).toFixed(0) + '%',
        { draw: LK.in(f, 0.6), dx: LK.PX(96), dy: LK.PX(-64), size: LK.PX(15), color: 'accent' });
    }
    lmTag(g, 'LATTICE 5\u00d75\u00d75  /  ' + (this.rot[1] * 180 / Math.PI).toFixed(0) + '\u00b0', 142, 966,
      { size: LK.PX(15), track: 0.3, color: 'dim', align: 'left' });

    // 字：TREATMENT 里 line 15 是 'weave'（字由经纬线织出来），字号 170。
    // 整句 29 个字符，120 号能放进 [96, W-96]；位置压到最下沿，不压晶体。
    const li = TY.current(f);
    const txt = li ? li.line.text : '';
    const size = txt ? Math.min(96, 1750 / (txt.length * 0.68)) : 96;
    TY.line(g, f, { reg: 'void', size: size, pos: [960, 958], color: LK.hot, dim: '#2E3E6C' });

    return { grain: 0.03, vignette: 0, shake: f.a.kick * 1.4, flash: f.a.kick * 0.05 * kTop };
  },
});
