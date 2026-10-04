// askew — 乐章 8 第五镜（2:00.24–2:03.88）。VOID：整个坐标系被剪切。
// HERO：一个能认出来的反馈环（矩形回路 + 流向箭头 + 三个工位框 POLICY / REWARD / UPDATE）≥60%。
// 拍点：唱到 "RLHF"（120.76）时回路还是正的；之后每一拍歪一点（世界坐标里 x' = x + k·y），
// 矩形被剪成平行四边形、工位从环上滑出去；到镜尾整帧再倾 0.14 rad（post rot）。
// 字区：T[39] 'collapse'，压在下三分之一。
MV.scene('askew', {
  init() {
    this.HX = 3.35; this.HY = 2.05; this.NL = 200;
    // ① 回路（矩形，顺时针）：先按"正"的坐标建好，render 里剪切
    const loopPts = [];
    for (let i = 0; i <= this.NL; i++) loopPts.push(this.at(i / this.NL));
    this.loopSrc = LG.seg(loopPts, { bright: 1 });
    // ② 流向箭头：回路上的 V 形
    const ar = [];
    for (let i = 0; i < 8; i++) {
      const u = (i + 0.5) / 8, p = this.at(u), q = this.at(u + 0.004);
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), s = 0.34;
      ar.push([[p[0] - Math.cos(ang - 0.5) * s, p[1] - Math.sin(ang - 0.5) * s, 0], p],
              [[p[0] - Math.cos(ang + 0.5) * s, p[1] - Math.sin(ang + 0.5) * s, 0], p]);
    }
    this.arrowSrc = LG.pairs(ar, { bright: 0.95, caps: 0 });
    // ③ 三个工位框：骑在回路上
    const blk = [];
    this.blocks = [];
    const spots = [['POLICY', 0.0], ['REWARD', 0.25], ['UPDATE', 0.5]];
    for (const [name, u] of spots) {
      const p = this.at(u), q = this.at(u + 0.002);
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), w = 1.25, h = 0.44;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const C = [[-w, -h], [w, -h], [w, h], [-w, h]].map(k => [p[0] + k[0] * ca - k[1] * sa, p[1] + k[0] * sa + k[1] * ca, 0.05]);
      for (let i = 0; i < 4; i++) blk.push([C[i], C[(i + 1) % 4]]);
      this.blocks.push({ name, p });
    }
    this.blkSrc = LG.pairs(blk, { bright: 0.9 });
    // ④ 被剪切的虚线坐标系（剪切最看得见的就是它）
    const axes = [];
    for (let i = -6; i <= 6; i++) {
      axes.push([[-7.2, i * 0.85, -1.4], [7.2, i * 0.85, -1.4]], [[i * 0.85, -4.8, -1.4], [i * 0.85, 4.8, -1.4]]);
    }
    this.gridSrc = LG.pairs(axes, { bright: 0.5 });
    // 缓冲：剪切后的几何写在这里（每帧原地改，不动源数组）
    for (const k of ['loop', 'arrow', 'blk', 'grid']) this[k + 'Dst'] = new Float32Array(this[k + 'Src'].length);
    this.MAX = 14;
    this.pulseBuf = new Float32Array(this.MAX * 8);
  },

  /** 回路参数 u∈[0,1) → [x, y, z]（矩形周长，顺时针）。u = 0 在右边中点。 */
  at(u) {
    const hx = this.HX, hy = this.HY, s = ((u % 1) + 1) % 1 * 4, k = Math.floor(s), t = s - k;
    let x, y;
    if (k === 0) { x = hx; y = -hy + 2 * hy * t; }            // 右边向上
    else if (k === 1) { x = hx - 2 * hx * t; y = hy; }        // 上边向左
    else if (k === 2) { x = -hx; y = hy - 2 * hy * t; }       // 左边向下
    else { x = -hx + 2 * hx * t; y = -hy; }                   // 下边向右
    return [x, y, 0];
  },
  /** 剪切：x' = x + k·y，y' = y + 0.35k·x（整个坐标系被拉歪）。 */
  shear(src, dst, k) {
    for (let i = 0; i < src.length; i += 8) {
      for (let e = 0; e < 2; e++) {
        const b = i + e * 3, x = src[b], y = src[b + 1];
        dst[b] = x + k * y; dst[b + 1] = y + 0.35 * k * x; dst[b + 2] = src[b + 2];
      }
      dst[i + 6] = src[i + 6]; dst[i + 7] = src[i + 7];
    }
    return dst;
  },
  sk(x, y, k) { return [x + k * y, y + 0.35 * k * x]; },

  render(g, f) {
    const t0 = 120.76;                                     // "RLHF" 唱到的时刻：之前是正的
    const beatsOff = f.beat - f.audio.beatAt(t0);
    const steps = f.t < t0 ? 0 : Math.max(0, Math.floor(beatsOff + 1e-6));
    const K = clamp(steps * 0.15 + prog(f.t, t0 - 0.06, t0 + 0.35, ease.outCubic) * 0.08, 0, 1.25);
    const cam = lmOrbit({ yaw: 0.20 + 0.14 * K, pitch: 0.20 + 0.08 * K, dist: 8.2 - 0.6 * LK.in(f, f.dur), fov: 32 });

    this.shear(this.gridSrc, this.gridDst, K);
    this.shear(this.loopSrc, this.loopDst, K);
    this.shear(this.arrowSrc, this.arrowDst, K);
    this.shear(this.blkSrc, this.blkDst, K);

    // 回路上跑的脉冲 + 它的尾巴（歪了以后尾巴接不上头 —— 这就是 askew）
    const speed = 0.055 + 0.055 * K, u0 = f.t * speed;
    for (let i = 0; i < this.MAX; i++) {
      const p = this.sk(...this.at(u0 - i * 0.006).slice(0, 2), K), s = i * 8;
      this.pulseBuf[s] = p[0]; this.pulseBuf[s + 1] = p[1]; this.pulseBuf[s + 2] = 0.06;
      this.pulseBuf[s + 3] = p[0]; this.pulseBuf[s + 4] = p[1]; this.pulseBuf[s + 5] = 0.06;
      this.pulseBuf[s + 6] = 1 - i / this.MAX; this.pulseBuf[s + 7] = 3;
    }

    lmBegin(LK.palVoid());
    lmLines(cam, this.gridDst, { width: 0.85, color: 'dim', gain: 0.22, glow: 0.18, dash: [5, 11] });
    lmLines(cam, this.loopDst, { width: 2.6, color: 'accent', gain: 0.85 + 0.5 * clamp(K), glow: 0.8 });
    lmLines(cam, this.arrowDst, { width: 1.8, color: 'fg', gain: 0.7, glow: 0.5 });
    lmLines(cam, this.blkDst, { width: 2.0, color: 'hot', gain: 0.9, glow: 0.7 });
    lmLines(cam, this.pulseBuf, { width: 4.2, color: 'accent', gain: 1.5, glow: 1.3 });

    const gl = lmGlow();
    const hp = this.sk(...this.at(u0).slice(0, 2), K);       // 脉冲的头：这一帧最亮的一点
    const head = cam.project([hp[0], hp[1], 0.06]);
    if (head) { BOLT.radial(gl, head[0], head[1], 92, LK.blue, 0.5); BOLT.plasma(gl, head[0], head[1], 9, f.t, { alpha: 0.6 }); }
    lmEnd(g, { bloom: 0.92 });

    // 泛光之后的锐利字：工位名牌
    const pal = lmPal();
    for (const b of this.blocks) {
      const q = this.sk(b.p[0], b.p[1], K), pr = cam.project([q[0], q[1], 0.06]);
      if (!pr) continue;
      lmTag(g, b.name, pr[0], pr[1], { size: 15, track: 0.28, color: K > 0.35 ? 'accent' : 'fg' });
      g.save(); void pal; g.restore();
    }
    lmTag(g, 'RLHF LOOP — POLICY → REWARD → POLICY → …', 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, 'SHEAR ' + K.toFixed(3) + ' · TILT ' + (K * 7).toFixed(1) + '\u00b0', W - 120, 96,
      { size: 15, track: 0.3, color: K > 0.05 ? 'accent' : 'dim', align: 'right' });
    const li = TY.index(f);
    TY.line(g, f, { reg: 'void', x: 960, y: 906, size: li === 39 ? 156 : 112, align: 'center' });
    return { grain: 0.03, vignette: 0, rot: 0.14 * clamp(K / 1.25), shake: 4 * K * (0.3 + f.a.kick) };
  },
});
