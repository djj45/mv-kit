// fence — 乐章 8 第四镜（1:56.61–2:00.24）。**一段镜头内部一次重构图，中间不切**：
//   前半（116.61–118.43）：一道道栅栏（每道 9 根立柱 + 上下横梁，一道比一道远），
//   每一拍断一道，断掉的柱子朝相机（+z，位移封顶）飞出去，一边飞一边翻 —— 碎片飞向前。
//   118.43 s 重构图：镜头拉远（dist 7.4 → 15.5）、抬高、换轴，栅栏后面露出十万个机柜（HERO ≥60%），
//   每一格的指示灯在拍上亮。
// 字区：T[37] 'arc' / T[38] 'counter'，都压在下三分之一。
MV.scene('fence', {
  init() {
    this.PW = 4.4; this.PH = 2.7; this.BARS = 9;               // 一道栅栏：4.4 × 2.7，9 根立柱
    this.NP = 5;                                               // 五道，从近到远
    this.perPanel = this.BARS + 2;                             // 立柱 + 两道横梁
    this.panelZ = [];
    for (let i = 0; i < this.NP; i++) this.panelZ.push(-0.6 - i * 1.55);
    // ① 栅栏（近 → 远）。断掉的那几道在 render 里用 subarray 从头上跳掉。
    this.panelSegs = new Float32Array(this.NP * this.perPanel * 8);
    for (let i = 0; i < this.NP; i++) {
      const z = this.panelZ[i], o = i * this.perPanel * 8;
      for (let b = 0; b < this.BARS; b++) {
        const x = (-0.5 + (b + 0.5) / this.BARS) * this.PW, s = o + b * 8;
        this.panelSegs[s] = x; this.panelSegs[s + 1] = -this.PH / 2; this.panelSegs[s + 2] = z;
        this.panelSegs[s + 3] = x; this.panelSegs[s + 4] = this.PH / 2; this.panelSegs[s + 5] = z;
        this.panelSegs[s + 6] = 0.8; this.panelSegs[s + 7] = 0;
      }
      for (const [k, y] of [[this.BARS, this.PH * 0.34], [this.BARS + 1, -this.PH * 0.34]]) {
        const s = o + k * 8;
        this.panelSegs[s] = -this.PW / 2; this.panelSegs[s + 1] = y; this.panelSegs[s + 2] = z;
        this.panelSegs[s + 3] = this.PW / 2; this.panelSegs[s + 4] = y; this.panelSegs[s + 5] = z;
        this.panelSegs[s + 6] = 0.9; this.panelSegs[s + 7] = 0;
      }
    }
    this.fly = new Float32Array(this.NP * this.perPanel * 8);  // 飞出去的柱子（每帧重填）
    // ② 后面的机柜阵列：10×7 个柜，每柜 4 格指示灯
    this.rackZ = -13.5;
    const bw = 1.3, bh = 1.3, bd = 1.0, cols = 10, rows = 7, slots = 4;
    const rs = S3.wireSegs(PART.racks(cols, rows, bw, bh, bd, { slots: slots }), { bright: 0.75 });
    for (let s = 0; s < rs.length; s += 8) { rs[s + 2] += this.rackZ; rs[s + 5] += this.rackZ; }
    // 按世界 y 拆成上下两半：下半（画面下三分之一，字区）压到很暗，上三分之一照旧
    const yCut = -(rows - 1) / 2 * bh * 1.12 + bh * 1.12 * 2.4;      // 大约下面 2 排
    const hi = [], lo = [];
    for (let s = 0; s < rs.length; s += 8) {
      ((rs[s + 1] + rs[s + 4]) / 2 < yCut ? lo : hi).push(...rs.subarray(s, s + 8));
    }
    this.rackSegs = new Float32Array(hi);
    this.rackSegsLo = new Float32Array(lo);
    const lamps = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const x = (c - (cols - 1) / 2) * bw * 1.06, y0 = (r - (rows - 1) / 2) * bh * 1.12;
      for (let s = 0; s < slots; s++) {
        const y = y0 + bh * (s / (slots - 1) - 0.5) * 0.62;
        lamps.push([x - bw * 0.32, y, this.rackZ + bd * 0.52 + 0.02, x + bw * 0.32, y, this.rackZ + bd * 0.52 + 0.02]);
      }
    }
    const loL = [], hiL = [];
    lamps.forEach(L => (L[1] < yCut ? loL : hiL).push(...L));
    this.lampN = lamps.length;
    this.lamps = new Float32Array(hiL);
    this.lampsLo = new Float32Array(loL);
  },

  /** 一道栅栏断开后，它的立柱各自往前飞（位置只由 tau 决定）。 */
  flyPanel(i, tau, buf, at) {
    const z = this.panelZ[i], o = i * this.perPanel * 8;
    for (let b = 0; b < this.BARS; b++) {
      const s = at + b * 8, src = o + b * 8;
      const sp = 0.5 + hash(i * 31 + b, 3, 1) * 0.6;
      const dx = (hash(i * 31 + b, 3, 2) - 0.5) * 1.0, dy = (hash(i * 31 + b, 3, 3) - 0.5) * 0.7;
      const dz = 0.9 + hash(i * 31 + b, 3, 4) * 0.8;
      const x = this.panelSegs[src], y0 = this.panelSegs[src + 1], y1 = this.panelSegs[src + 4];
      const rot = (hash(i * 31 + b, 7, 1) - 0.5) * 2.6 * tau;
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const cx = x + dx * tau * sp, cy = (y0 + y1) / 2 + dy * tau * sp - 0.45 * tau * tau;
      const cz = z + dz * Math.min(tau, 0.9);                  // 朝相机飞，但位移封顶：不许撞进相机里
      const hy = (y1 - y0) / 2;
      buf[s] = cx - sr * hy; buf[s + 1] = cy + cr * hy; buf[s + 2] = cz;
      buf[s + 3] = cx + sr * hy; buf[s + 4] = cy - cr * hy; buf[s + 5] = cz;
      buf[s + 6] = 1; buf[s + 7] = 1;
    }
    for (const k of [0, 1]) {                                  // 两根横梁整根滚出去
      const s = at + (this.BARS + k) * 8, src = o + (this.BARS + k) * 8;
      const y = this.panelSegs[src + 1];
      const ox = (hash(i, k, 5) - 0.5) * 1.6 * tau, oy = y + tau * 0.3 - 0.3 * tau * tau, oz = z + 1.2 * Math.min(tau, 0.9);
      buf[s] = -this.PW / 2 + ox; buf[s + 1] = oy; buf[s + 2] = oz;
      buf[s + 3] = this.PW / 2 + ox; buf[s + 4] = oy; buf[s + 5] = oz;
      buf[s + 6] = 1; buf[s + 7] = 1;
    }
  },

  render(g, f) {
    const brk = [];                                            // 断栅栏的时刻：这一镜开头的每一拍断一道
    for (const b of f.audio.beats) if (b >= f.from - 0.03 && b <= f.from + 2.2) brk.push(b);
    while (brk.length < this.NP) brk.push((brk.length ? brk[brk.length - 1] : f.from) + 0.4545);
    let broken = 0;
    for (let i = 0; i < this.NP; i++) if (f.t >= brk[i]) broken = i + 1;
    const rk = ease.inOutCubic(prog(f.t, 118.40, 119.05));      // 118.43：重构图（拉远 → 阵列）
    const cam = lmOrbit({
      yaw: lerp(0.08, 0.30, rk) + 0.05 * LK.in(f, f.dur),
      pitch: lerp(0.05, 0.22, rk), dist: lerp(7.4, 15.5, rk), fov: 32,
      target: [0, lerp(0, 0.4, rk), lerp(-2.4, this.rackZ + 0.6, rk)],
    });

    let fn = 0;                                                // 飞出去的栅栏条（只算断了的、还在飞的）
    for (let i = 0; i < broken; i++) {
      const tau = f.t - brk[i];
      if (tau > 1.25) continue;
      this.flyPanel(i, tau, this.fly, fn * this.perPanel * 8);
      fn += this.perPanel;
    }
    const bi = Math.floor(f.beat);                             // 机柜的灯：每一格跟着它自己那一拍亮
    for (let i = 0; i < this.lampN; i++) {
      const s = i * 8;
      const per = 1 + Math.floor(hash(i, 4, 2) * 4), off = Math.floor(hash(i, 4, 1) * per);
      const lastOn = Math.floor((bi - off) / per) * per + off;
      const since = (f.beat - lastOn) * 0.4545;
      const k = Math.pow(1 - clamp(since / (0.30 + 0.30 * per)), 2.0);
      this.lamps[s + 6] = 0.22 + 0.85 * k + 0.4 * hash(i, f.tick, 3) * k; this.lamps[s + 7] = 3;
    }

    lmBegin(LK.palVoid());
    lmLines(cam, this.rackSegs, { width: 1.1, color: 'dim', gain: 0.15 + 0.45 * rk, glow: 0.35 });
    lmLines(cam, this.lamps, { width: 2.6, color: 'accent', gain: 0.22 + 0.85 * rk, glow: 1.0 });
    // 下三分之一：机柜只留一点轮廓和几点灯，把这块让给字（HERO 仍然占满上面三分之二）
    lmLines(cam, this.rackSegsLo, { width: 0.9, color: 'dim', gain: 0.05 + 0.11 * rk, glow: 0.2 });
    lmLines(cam, this.lampsLo, { width: 2.0, color: 'accent', gain: 0.06 + 0.16 * rk, glow: 0.5 });
    lmLines(cam, this.panelSegs.subarray(broken * this.perPanel * 8),
      { width: 1.8, color: 'warn', gain: 0.85 - 0.35 * rk, glow: 0.6 });
    lmLines(cam, this.fly.subarray(0, fn * this.perPanel * 8), { width: 1.4, color: 'warn', gain: 0.46, glow: 0.45 });

    const gl = lmGlow();                                       // 断开那一瞬：断口一道电弧（这一帧最亮的）
    for (let i = 0; i < broken; i++) {
      const tau = f.t - brk[i];
      if (tau > 0.34) continue;
      const k = 1 - tau / 0.34, z = this.panelZ[i];
      const a = cam.project([-this.PW * 0.5, this.PH * 0.1, z]), b = cam.project([this.PW * 0.5, -this.PH * 0.1, z]);
      if (a && b) BOLT.draw(gl, BOLT.pathBetween([a[0], a[1]], [b[0], b[1]], { tick: f.tick, seed: 11 + i, jag: 0.3, depth: 4 }),
        { w: 3.6, color: LK.blue, core: LK.hot, gain: k });
    }
    if (rk > 0.001 && rk < 0.999) BOLT.radial(gl, W * 0.5, H * 0.52, 520 * (1 - rk), LK.blue, 0.20 * (1 - rk));
    lmEnd(g, { bloom: 0.88 });

    lmTag(g, broken < this.NP ? 'FENCE ' + (broken + 1) + ' / ' + this.NP + ' \u2014 BREACHED' : 'ALL FENCES BREACHED',
      120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, rk > 0.02 ? '100,000 RACKS BEHIND \u00b7 ' + this.lampN + ' LAMPS ON BEAT' : 'BREACH ONE PER BEAT',
      W - 120, 96, { size: 15, track: 0.3, color: rk > 0.02 ? 'accent' : 'dim', align: 'right' });
    const li = TY.index(f);
    TY.line(g, f, { reg: 'void', x: 960, y: 894, size: li === 38 ? 132 : 146, align: 'center' });
    return { grain: 0.03, vignette: 0, shake: broken ? 5 * (1 - clamp((f.t - brk[broken - 1]) / 0.18)) : 0, flash: rk > 0.02 && rk < 0.25 ? 0.05 : 0 };
  },
});
