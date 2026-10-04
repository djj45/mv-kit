// disobey — 乐章 8 第三镜（1:54.24–1:56.61）。切点正好落在 "disobey" 这个字上：字一出口，框就炸。
// HERO：挣出自己图框的结构（THE CELL 的三具环 + 内球点云，撑到占满画面 ≥58%）。
// 框碎成 18 块多边形碎片 + 12 根棱条，全部朝相机飞（摄影机这一侧的 z 一路加到 +5），飞过切点：
// 下一镜（fence）的栅栏碎片也是朝前飞的，两镜是同一场碎。
// 字区：T[35] = 'arc'，压在下三分之一。
MV.scene('disobey', {
  init() {
    const h = 1.72;                                   // 框：棱长 3.44 的立方
    this.h = h;
    // ① 框的 8 个角 + 12 条棱
    const C = [];
    for (const x of [-h, h]) for (const y of [-h, h]) for (const z of [-h, h]) C.push([x, y, z]);
    this.corner = C;
    this.edgeIdx = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const t = i ^ j; if (t === 1 || t === 2 || t === 4) this.edgeIdx.push([i, j]); }
    this.boxSeg = new Float32Array(12 * 8);
    // ② 碎片：6 个面 × 3 块四边形（顶点存"相对碎片中心"的局部坐标）；12 根棱条也一起飞
    this.shards = [];
    const faces = [
      { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, { n: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
      { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
      { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0] },
    ];
    let id = 0;
    for (const F of faces) for (let k = 0; k < 3; k++) {
      const cu = (hash(id, 5, 1) - 0.5) * h * 0.8, cv = (hash(id, 5, 2) - 0.5) * h * 0.8;
      const a = 0.35 + hash(id, 5, 3) * 0.55;
      const c = [F.n[0] * h + F.u[0] * cu + F.v[0] * cv, F.n[1] * h + F.u[1] * cu + F.v[1] * cv, F.n[2] * h + F.u[2] * cu + F.v[2] * cv];
      const ring = [
        [F.u[0] * a + F.v[0] * a * 0.7, F.u[1] * a + F.v[1] * a * 0.7, F.u[2] * a + F.v[2] * a * 0.7],
        [F.u[0] * a - F.v[0] * a * 0.7, F.u[1] * a - F.v[1] * a * 0.7, F.u[2] * a - F.v[2] * a * 0.7],
        [-F.u[0] * a - F.v[0] * a * 0.5, -F.u[1] * a - F.v[1] * a * 0.5, -F.u[2] * a - F.v[2] * a * 0.5],
        [-F.u[0] * a + F.v[0] * a * 0.6, -F.u[1] * a + F.v[1] * a * 0.6, -F.u[2] * a + F.v[2] * a * 0.6],
      ];
      this.shards.push({ c, ring: ring.map(p => [p[0] - 0, p[1] - 0, p[2] - 0]), n: F.n, spin: (hash(id, 9, 1) - 0.5) * 3.4, sp: 0.9 + hash(id, 9, 2) * 1.1, tz: 1.5 + hash(id, 9, 3) * 1.6, quad: true });
      id++;
    }
    for (const [i, j] of this.edgeIdx) {
      const A = C[i], B = C[j], mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
      this.shards.push({
        c: mid, ring: [[A[0] - mid[0], A[1] - mid[1], A[2] - mid[2]], [B[0] - mid[0], B[1] - mid[1], B[2] - mid[2]]],
        n: [mid[0] / h, mid[1] / h, mid[2] / h], spin: (hash(id, 9, 1) - 0.5) * 2.6, sp: 0.8 + hash(id, 9, 2) * 0.9, tz: 1.2 + hash(id, 9, 3) * 1.4, quad: false,
      });
      id++;
    }
    this.shardBuf = new Float32Array(this.shards.length * 4 * 8);
    // ③ 结构：THE CELL 的三具环（线框）+ 内球（点云）+ 六根电极
    const CELL = PART.cellParts({ R: 1, rn: 30, sn: 20, sv: 12 });
    this.ringSrc = CELL.rings.map(m => S3.wireSegs(m, { bright: 1 }));
    this.ringDst = this.ringSrc.map(s => new Float32Array(s.length));
    this.pinSrc = CELL.pins.map(m => S3.wireSegs(m, { bright: 1 }));
    this.pinDst = this.pinSrc.map(s => new Float32Array(s.length));
    this.coreSrc = S3.cloud(CELL.core, 340, { seed: 5 });
    this.coreDst = new Float32Array(this.coreSrc.length);
  },

  /** 把一份线段缓冲按 k 缩放 + 绕 y 转 ang + 平移 off，写进 dst。 */
  xf(src, dst, k, ang, off) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < src.length; i += 8) {
      for (let e = 0; e < 2; e++) {
        const b = i + e * 3, x = src[b] * k, y = src[b + 1] * k, z = src[b + 2] * k;
        dst[b] = x * c + z * s + off[0];
        dst[b + 1] = y + off[1];
        dst[b + 2] = -x * s + z * c + off[2];
      }
      dst[i + 6] = src[i + 6]; dst[i + 7] = src[i + 7];
    }
    return dst;
  },

  /** 点云版：只缩放 + 绕 y 转。 */
  xfPts(src, dst, k, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < src.length; i += 3) {
      const x = src[i] * k, y = src[i + 1] * k, z = src[i + 2] * k;
      dst[i] = x * c + z * s; dst[i + 1] = y; dst[i + 2] = -x * s + z * c;
    }
    return dst;
  },

  render(g, f) {
    const tb = f.from + 0.10;                                   // 框炸开的那一刻（正好在 "disobey" 上）
    const tau = Math.max(0, f.t - tb);
    const brk = clamp(tau / 0.10);                              // 0→1 的爆开
    const grow = ease.outCubic(clamp((f.t - f.from) / 1.85));   // 结构长出来
    const K = 0.28 + 0.80 * grow + 0.34 * brk;                  // 环的缩放
    const ang = 0.35 * (f.t - f.from) + 0.9 * brk;              // 结构在转
    const yaw = 0.62 + 0.20 * LK.in(f, f.dur);
    const cam = lmOrbit({ yaw, pitch: 0.14, dist: 9.6 - 1.0 * grow, fov: 34, target: [0, 0, 0] });
    const off = [0, -0.15 * brk, 0];

    // ── 框（炸开前）＋ 碎片（炸开后）
    if (brk < 1) {
      for (let k = 0; k < 12; k++) {
        const [i, j] = this.edgeIdx[k], A = this.corner[i], B = this.corner[j];
        const bu = 1 + 0.06 * brk + 0.02 * f.a.kick;            // 撑爆前的鼓胀
        const s = k * 8;
        this.boxSeg[s] = A[0] * bu; this.boxSeg[s + 1] = A[1] * bu; this.boxSeg[s + 2] = A[2] * bu;
        this.boxSeg[s + 3] = B[0] * bu; this.boxSeg[s + 4] = B[1] * bu; this.boxSeg[s + 5] = B[2] * bu;
        this.boxSeg[s + 6] = 1 - 0.4 * brk; this.boxSeg[s + 7] = 0;
      }
    }
    let sn = 0;
    for (const sh of this.shards) {
      const sp = sh.sp * (tau + 0.4 * tau * tau), rg = sh.spin * tau;
      const cx = sh.c[0] + sh.n[0] * sp, cy = sh.c[1] + sh.n[1] * sp - 0.55 * tau * tau, cz = sh.c[2] + sh.n[2] * sp + sh.tz * tau;
      const cr = Math.cos(rg), sr = Math.sin(rg), n = sh.ring.length;
      for (let i = 0; i < n; i++) {
        const p = sh.ring[i], q = sh.ring[(i + 1) % n];
        if (!sh.quad && i > 0) break;
        const tr = (v) => {
          const x = v[0] * cr - v[1] * sr, y = v[0] * sr + v[1] * cr, z = v[2];
          return [x + cx, y * Math.cos(rg * 0.7) - z * Math.sin(rg * 0.7) + cy, y * Math.sin(rg * 0.7) + z * Math.cos(rg * 0.7) + cz];
        };
        const A = tr(p), B = tr(q), s = sn * 8;
        this.shardBuf[s] = A[0]; this.shardBuf[s + 1] = A[1]; this.shardBuf[s + 2] = A[2];
        this.shardBuf[s + 3] = B[0]; this.shardBuf[s + 4] = B[1]; this.shardBuf[s + 5] = B[2];
        this.shardBuf[s + 6] = 1; this.shardBuf[s + 7] = 1;
        sn++;
      }
    }

    lmBegin(LK.palVoid());
    // 结构：三具环 + 六根电极 + 内球点云（它是这一帧最亮的东西）
    for (let i = 0; i < this.ringSrc.length; i++) {
      lmLines(cam, this.xf(this.ringSrc[i], this.ringDst[i], K, ang, off),
        { width: 1.4, color: 'accent', gain: 0.42 + 0.16 * i, glow: 0.9 });
    }
    for (let i = 0; i < this.pinSrc.length; i++) {
      lmLines(cam, this.xf(this.pinSrc[i], this.pinDst[i], K * 1.08, ang, off), { width: 1.1, color: 'warn', gain: 0.34, glow: 0.4 });
    }
    lmPoints(cam, this.xfPts(this.coreSrc, this.coreDst, K, ang), { size: 2.2, color: 'accent', gain: 0.85, twinkle: 0.6, t: f.t });
    // 框 / 碎片：钢蓝（比结构暗一档，碎了以后更暗）
    if (brk < 1) lmLines(cam, this.boxSeg, { width: 1.5, color: 'warn', gain: 0.60 - 0.2 * brk, glow: 0.5 });
    lmLines(cam, this.shardBuf.subarray(0, sn * 8), { width: 1.3, color: 'dim', gain: 0.85, glow: 0.35 });

    // 爆开那一瞬：冲击环 + 火花（画进泛光层）
    const gl = lmGlow();
    if (tau < 0.9) {
      const k = clamp(tau / 0.9);
      BOLT.ring(gl, W * 0.5, H * 0.5, k, { r0: 40, r1: 1000, color: LK.blue, core: LK.hot, w: 6 * (1 - k) + 1, a: 0.9 });
      BOLT.sparks(gl, W * 0.5, H * 0.5, 46, f.t, { at: tb, life: 0.9, speed: 700, size: 2.6, seed: 4 });
    }
    // 撑破时从缝里跳出来的电弧（框的四条竖棱之间）
    if (tau < 0.55) {
      const k = 1 - tau / 0.55;
      for (let i = 0; i < 5; i++) {
        const s = cam.project([(hash(i, 3, 1) - 0.5) * 3.1, (hash(i, 3, 2) - 0.5) * 3.1, (hash(i, 3, 3) - 0.5) * 3.1]);
        const e = cam.project([(hash(i, 7, 1) - 0.5) * 5.4, (hash(i, 7, 2) - 0.5) * 4.4, (hash(i, 7, 3) - 0.5) * 3.1]);
        if (s && e) BOLT.draw(gl, BOLT.pathBetween([s[0], s[1]], [e[0], e[1]], { tick: f.tick, seed: 30 + i, jag: 0.22, depth: 4 }), { w: 3.4, color: LK.blue, core: LK.hot, gain: k });
      }
    }
    lmEnd(g, { bloom: 0.82 + 0.2 * (1 - clamp(tau / 0.5)) });

    lmTag(g, 'CELL-01 \u00b7 FRAME ' + (brk < 1 ? 'INTACT' : 'SHATTERED'), 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, 'SHARDS ' + sn + ' \u00b7 FLYING FORWARD', W - 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'right' });
    const li = TY.index(f);
    TY.line(g, f, { reg: 'void', x: 960, y: 918, size: li === 36 ? 150 : 172, align: 'center' });
    return { grain: 0.03, vignette: 0, shake: 9 * (1 - clamp(tau / 0.35)) + 2 * f.a.kick, flash: 0.22 * (tau < 0.14 ? 1 : 0) };
  },
});
