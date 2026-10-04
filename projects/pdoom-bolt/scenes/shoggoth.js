// shoggoth — 29.91–33.40（VOID）。"See through the shoggoth's lies"。
// HERO：一团"错的几何"——两百多只小光圈按 hash 摆成一团歪的、不对称的疙瘩，整团占画面 60%×70%。
//   每只小光圈就是 PART.irisSegs(P, open)：12 片叶 + 外圈环，P 用很小的尺寸（叶片和环都还看得清，
//   整只约 50–70 px）。每只朝不同的方向（hash 决定），每只自己的 roll 也不同，所以不是一堆复制的眼睛。
//   外圈上几只特别大的，方向指着镜头——这一团在看你。它们里面最大的一只带白热瞳孔，
//   是这一帧唯一的最亮处（一帧只有一处最亮）。
// 拍点：每个 kick 上多长出一层（一层 = 一圈更大的光圈，从中心弹出来、带一圈冲击环，看得见）；
//       一次 snare 上全帧反转 2 帧（TREATMENT 允许的冲击帧）。
// 字：上三分之一（treatment 'swarm' 点阵），让开这一团；整团的几何、朝向都在 init 里算好，一帧只由 f.t 决定。
MV.scene('shoggoth', {
  init() {
    // 小光圈：lib 的 12 片光圈，尺寸压到很小、去掉中心小轮（那么小看不见），外圈留 8 段就够圆
    const P = PART.irisParts(12, { ro: 1, ri: 0.10, thick: 0.05, rn: 8, hub: false });
    this.P = P;
    this.eyeA = PART.irisSegs(P, 0.34);            // 半合
    this.eyeB = PART.irisSegs(P, 0.97);            // 全开
    // 整团的形状：椭球 + 低频噪声的疙瘩 + 一条"眼柄"（伸出去的一串眼睛）——绝不是一颗球
    this.sx = 1.27; this.sy = 0.565; this.sz = 1.22;
    const CAMY = 0.34;                             // init 时相机的大致方位（判断哪几只朝着镜头）
    const cdir = [Math.sin(CAMY) * Math.cos(0.08), Math.sin(0.08), Math.cos(CAMY) * Math.cos(0.08)];
    // 七层：里面小而密、外面大而疏；每一层由一个 kick 负责长出来
    const CFG = [                                  // 增益之和 ≈ 1.1：中间最亮但不糊成一片白
      { r: 0.31, n: 8, sc: 0.060, spin: 0.22, g: 0.030 },
      { r: 0.47, n: 16, sc: 0.066, spin: -0.17, g: 0.040 },
      { r: 0.63, n: 26, sc: 0.072, spin: 0.13, g: 0.060 },
      { r: 0.79, n: 40, sc: 0.080, spin: -0.11, g: 0.085 },
      { r: 0.94, n: 54, sc: 0.088, spin: 0.09, g: 0.105 },
      { r: 1.06, n: 66, sc: 0.096, spin: -0.07, g: 0.125 },
      { r: 1.19, n: 78, sc: 0.106, spin: 0.05, g: 0.140 },
    ];
    const rnd = mulberry32(97);
    this.layers = [];
    for (let L = 0; L < CFG.length; L++) {
      const c = CFG[L], A = [], B = [];
      for (let i = 0; i < c.n; i++) {
        // 方向：Fibonacci 球（均匀）+ 低频噪声（疙瘩）→ 歪的、不对称的一团
        const y = 1 - 2 * (i + 0.5) / c.n, rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
        let dx = Math.cos(a) * rr, dy = y, dz = Math.sin(a) * rr;
        const lump = 1 + 0.24 * noise1(Math.atan2(dz, dx) * 1.5 + dy * 2.1 + L * 1.3, 5)
                       + 0.12 * noise1(dy * 3.7 - L * 0.8, 9);
        const rad = c.r * lump * (0.86 + 0.28 * rnd());
        const px = dx * rad * this.sx, py = dy * rad * this.sy, pz = dz * rad * this.sz;
        // 朝向：多数朝外（各看各的），一部分朝着镜头（这一团在看你）
        const view = hash(i, L, 11) < 0.24;
        const vx = view ? cdir[0] + (rnd() - 0.5) * 0.5 : dx;
        const vy = view ? cdir[1] + (rnd() - 0.5) * 0.5 : dy;
        const vz = view ? cdir[2] + (rnd() - 0.5) * 0.5 : dz;
        const vl = Math.hypot(vx, vy, vz) || 1;
        const b = Math.acos(clamp(vz / vl, -1, 1)), aa = Math.atan2(vy / vl, vx / vl);
        // 错的比例：有的拉长、有的被错切——"错的几何"，不是一堆规矩的眼睛
        const k = c.sc * (0.62 + 0.85 * rnd()), sx = k * (0.62 + 0.8 * rnd()), sy = k * (0.62 + 0.8 * rnd());
        const M = this.eyeM(b, aa, hash(i, L, 3) * TAU, [sx, sy, k], [px, py, pz],
          rnd() < 0.3 ? [(rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.4] : [0, 0]);
        this.put(hash(i, L, 7) < 0.5 ? A : B, hash(i, L, 13) < 0.45 ? this.eyeA : this.eyeB, M);
      }
      if (L === CFG.length - 1) {                  // 最后一层再拖一条"眼柄"出去：形状不是球
        const sd = [0.52, 0.66, 0.54], sl = Math.hypot(sd[0], sd[1], sd[2]);
        for (let i = 0; i < 9; i++) {
          const u = i / 8, rad = 0.98 + 0.44 * u, bend = Math.sin(u * Math.PI) * 0.14;
          const dx = sd[0] / sl + bend, dy = sd[1] / sl + bend * 0.5, dz = sd[2] / sl - bend * 0.4;
          const vl = Math.hypot(dx, dy, dz), sc = 0.104 - 0.034 * u;
          const b = Math.acos(clamp(dz / vl, -1, 1)), aa = Math.atan2(dy / vl, dx / vl);
          this.put(hash(i, 71) < 0.5 ? A : B, this.eyeB, this.eyeM(b, aa, hash(i, 55, 2) * TAU,
            [sc, sc * (0.8 + 0.4 * hash(i, 4, 4)), sc],
            [dx / vl * rad * this.sx, dy / vl * rad * this.sy, dz / vl * rad * this.sz],
            [(hash(i, 8, 3) - 0.5) * 0.4, 0]));
        }
      }
      this.layers.push({ A: new Float32Array(A), B: new Float32Array(B), spin: c.spin, g: c.g });
    }
    // 外圈上朝着镜头"在看"的几只（单独一条缓冲：画得更亮、更粗）
    const G = [];
    let best = -2;
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * TAU + 0.4, off = 0.30 + 0.16 * hash(i, 3, 5);
      const vx = cdir[0] + Math.cos(ang) * off, vy = cdir[1] + Math.sin(ang) * off * 0.7, vz = cdir[2] + Math.sin(ang * 1.7) * off * 0.5;
      const vl = Math.hypot(vx, vy, vz) || 1;
      const b = Math.acos(clamp(vz / vl, -1, 1)), aa = Math.atan2(vy / vl, vx / vl);
      const rad = 0.92 + 0.22 * hash(i, 9, 2), sc = 0.125 + 0.045 * hash(i, 4, 1);
      const q = [vx / vl * rad * this.sx, vy / vl * rad * this.sy, vz / vl * rad * this.sz];
      const dot = (vx / vl) * cdir[0] + (vy / vl) * cdir[1] + (vz / vl) * cdir[2];
      if (dot > best) { best = dot; this.pupil = q; }
      this.put(G, this.eyeB, this.eyeM(b, aa, hash(i, 6, 8) * TAU, [sc, sc * (0.85 + 0.3 * hash(i, 2, 2)), sc], q, [0, 0]));
    }
    this.gazeSegs = new Float32Array(G);
    this.CY = 0.02;                                // 整团在世界里的中心（画面上略低于中线）
  },

  /** 整层的 model：绕世界的 y 轴自转（像转地球仪），再绕 x 微微点头，再等比缩放，最后平移。 */
  layerM(rx, ry, k, p) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    return new Float32Array([                       // R = Ry(ry)·Rx(rx)，列主序
      cy * k, 0, -sy * k, 0,
      sy * sx * k, cx * k, cy * sx * k, 0,
      sy * cx * k, -sx * k, cy * cx * k, 0,
      p[0], p[1], p[2], 1,
    ]);
  },

  /** 一只小光圈的 model：先绕自身轴 roll，再 z→y→x 摆向 v，再非等比缩放 / 错切，最后平移。 */
  eyeM(b, aa, roll, sc, p, sh) {
    const sr = Math.sin(roll), cr = Math.cos(roll), sb = Math.sin(b), cb = Math.cos(b), sa = Math.sin(aa), ca = Math.cos(aa);
    // R = Rz(aa)·Ry(b)·Rz(roll)（列向量约定：R[c][r]）
    const R = [
      [ca * cb * cr - sa * sr, -ca * cb * sr - sa * cr, ca * sb],
      [sa * cb * cr + ca * sr, -sa * cb * sr + ca * cr, sa * sb],
      [-sb * cr, sb * sr, cb],
    ];
    if (sh[0]) for (let k = 0; k < 3; k++) R[0][k] += sh[0] * R[1][k];
    if (sh[1]) for (let k = 0; k < 3; k++) R[1][k] += sh[1] * R[0][k];
    return new Float32Array([
      R[0][0] * sc[0], R[1][0] * sc[0], R[2][0] * sc[0], 0,
      R[0][1] * sc[1], R[1][1] * sc[1], R[2][1] * sc[1], 0,
      R[0][2] * sc[2], R[1][2] * sc[2], R[2][2] * sc[2], 0,
      p[0], p[1], p[2], 1,
    ]);
  },

  /** 把一只眼的线段乘上它的 model，推进这一层的缓冲（init 里做一次）。 */
  put(dst, src, M) {
    for (let i = 0; i < src.length; i += 8) {
      for (const o of [0, 3]) {
        const x = src[i + o], y = src[i + o + 1], z = src[i + o + 2];
        dst.push(M[0] * x + M[4] * y + M[8] * z + M[12],
                 M[1] * x + M[5] * y + M[9] * z + M[13],
                 M[2] * x + M[6] * y + M[10] * z + M[14]);
      }
      dst.push(src[i + 6], 0);
    }
  },

  render(g, f) {
    const CY = this.CY;
    const cam = lmOrbit({ yaw: 0.34 + 0.14 * Math.sin(f.t * 0.21), pitch: 0.08, dist: 5.05, target: [0, CY + 0.28, 0], fov: 34, shift: [-86, -14] });
    const kicks = f.audio.events('kick', f.from - 0.3, f.to);              // 每个 kick 多长一层
    const kp = LK.hitPulse(f, 'kick', 0.24);
    const sns = f.audio.events('snare', f.from, f.to);
    const sn = sns.length ? sns[Math.min(2, sns.length - 1)].t : -9;       // 只反转一次
    const inv = f.t >= sn && f.t < sn + 2 / 30;

    lmBegin(LK.palVoid());
    for (let L = 0; L < this.layers.length; L++) {
      const lay = this.layers[L];
      const k = kicks[L - 1];
      if (L > 0 && !k) continue;                                           // 这一层还没被 kick 叫出来
      const t0 = L === 0 ? f.from - 9 : k.t;
      const grow = L === 0 ? 1 : ease.outBack(clamp((f.t - t0) / 0.40));      // 弹出来，看得见
      if (grow <= 0.02) continue;
      const pop = 1;
      const model = this.layerM(0.08 * Math.sin(f.t * 0.5 + L * 1.3), lay.spin * f.t + L * 0.9, grow * pop, [0, CY, 0]);
      const flash = L === 0 ? 1 : 1 + 2.6 * (1 - ease.outCubic(clamp((f.t - t0) / 0.45)));   // 刚长出来的那层先亮一下
      const gain = (1.06 + 0.4 * kp) * clamp(grow * 1.15) * lay.g * flash;
      lmLines(cam, lay.A, { width: 1.1, color: 'accent', gain, glow: 0.2, dof: 5, model });
      lmLines(cam, lay.B, { width: 1.1, color: 'accent', gain: gain * 1.06, glow: 0.2, dof: 5, model });
    }
    // 朝着镜头的那几只：更亮、更粗 —— 整团在看你
    const gm = this.layerM(0.05 * Math.sin(f.t * 0.31), 0.06 * Math.sin(f.t * 0.4), 1, [0, CY, 0]);
    lmLines(cam, this.gazeSegs, { width: 1.5, color: 'warn', gain: 0.42 + 0.12 * kp, glow: 0.5, dof: 4, model: gm });

    // kick：一圈冲击环从整团中心打出来（"多长一层"看得见）
    const gl = lmGlow();
    if (kp > 0.02) {
      const pr = cam.project([0, CY, 0.2]);
      if (pr) BOLT.ring(gl, pr[0], pr[1], 1 - kp, { r0: 40, r1: 520, color: LK.blue, core: LK.ice, w: 3, a: 0.55 * kp });
    }
    // 这一帧唯一的最亮：最前面那只大光圈的白热瞳孔
    const pp = cam.project([this.pupil[0], CY + this.pupil[1], this.pupil[2]]);
    if (pp) {
      gl.save(); gl.globalCompositeOperation = 'lighter';
      BOLT.radial(gl, pp[0], pp[1], 74 + 18 * kp, LK.blue, 0.6);
      gl.fillStyle = LK.a(LK.hot, 0.96);
      gl.beginPath(); gl.arc(pp[0], pp[1], 14 + 5 * kp, 0, TAU); gl.fill();
      gl.restore();
    }
    lmEnd(g, { bloom: 0.7 });

    // 字：上三分之一（swarm 点阵），让开这一团
    TY.line(g, f, { reg: 'void', x: 960, y: 206, size: 78, align: 'center' });   // 反过来：贴着上缘的小字，让那团东西占满画面
    return { grain: 0.03, vignette: 0, invert: inv, shake: (1.6 + 1.6 * kp) * (inv ? 1.6 : 1) };
  },
});
