// eyes — 33.40–38.43（VOID）。"with your shinigami eyes"。
// HERO：一只巨大的光圈特写（≥75%）：12 片叶片用 PART.irisSegs(P, open) 画线框，随小节头一片片张开，
//       中间留出瞳孔；几条线从眼睛里穿过去（有的在叶片前、有的在后）。
// 注意 lib 的 irisModel：open = 1 是叶片并拢（瞳孔最小）、open = 0 是叶片完全张开（瞳孔最大）——
//       所以这里的 open 随小节头从大到小走，画面上这只眼是越张越大的。
// 一帧只有一处最亮：瞳孔里那一点白热。字在下三分之一（treatment 'arc'，电弧扫过字），让开这只眼。
MV.scene('eyes', {
  init() {
    this.P = PART.irisParts(12, { ro: 1, ri: 0.1, thick: 0.05, rn: 96 });
    const E = S3.edges(this.P.blades[0]).length;
    this.nBlade = this.P.n * E * 8;                       // irisSegs 里前 12 片叶的线段（外圈在别的平面上，不用）
    // 外圈：真圆，画在光圈自己的 xy 平面上（lib 的 P.ring 是绕 y 轴的管，装在光圈上不对）
    this.ring1 = LG.seg(LG.circle(1.16, 128, 'xy'), { closed: true, bright: 1 });
    this.ring2 = LG.seg(LG.circle(1.30, 128, 'xy'), { closed: true, bright: 0.45 });
    this.ring3 = LG.seg(LG.circle(1.46, 128, 'xy'), { closed: true, bright: 0.22 });
    this.hole = new Float32Array(48 * 8);                 // 瞳孔的边：每帧按开度重画
    this.hole.__v = 0;
    // 穿过眼睛的线：一半在叶片前（z<0）、一半在后（z>0）
    const L = [];
    for (let i = 0; i < 7; i++) {
      const a = -(0.72 + hash(i, 3) * 0.5) * (i % 2 ? -1 : 1) + i * 0.22;
      const z = (i % 2 ? 1 : -1) * (0.09 + hash(i, 5) * 0.16);
      const p = [-Math.cos(a) * 1.9, -Math.sin(a) * 1.9, z], q = [Math.cos(a) * 1.9, Math.sin(a) * 1.9, z];
      L.push([p, q]);
    }
    this.lines = LG.pairs(L, { bright: 0.7 });
  },

  /** 瞳孔边线（一个圆），半径按 open 变——机械运动，走连续的 f.t。 */
  holeRing(r) {
    const S = this.hole, n = 48;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, o = i * 8;
      S[o] = Math.cos(a0) * r; S[o + 1] = Math.sin(a0) * r; S[o + 2] = 0;
      S[o + 3] = Math.cos(a1) * r; S[o + 4] = Math.sin(a1) * r; S[o + 5] = 0;
      S[o + 6] = 0.8; S[o + 7] = 0;
    }
    S.__v++;
    return S;
  },

  render(g, f) {
    // 小节头各开 1/3，唱到 "eyes" 时全开（open 越小 = 瞳孔越大）
    const step = (t0, dur) => ease.inOutCubic(clamp((f.t - t0) / dur));
    const open = clamp(0.96 - 0.31 * step(34.79, 0.6) - 0.31 * step(36.61, 0.6) - 0.32 * step(37.3, 0.7));
    const holeR = PART.irisHole(this.P, open);
    const punch = 1 + 0.045 * f.a.kick + 0.02 * f.a.low;
    const Y = 0.38;                                       // 整只眼抬到画面上半，下三分之一留给字
    const cam = lmOrbit({ yaw: 0.13 + 0.05 * Math.sin(f.t * 0.23), pitch: 0.2, dist: 4.9, target: [0, 0.02, 0], fov: 34 });
    const model = { pos: [0, Y, 0], rot: [0, 0, 0.05 * Math.sin(f.t * 0.31)], scale: punch };

    lmBegin(LK.palVoid());
    // 穿过眼睛的线（慢转：机械的、连续的 f.t）
    lmLines(cam, this.lines, {
      width: 0.9, color: 'dim', gain: 0.42, glow: 0.25, dof: 8,
      model: { pos: [0, Y, 0], rot: [0, 0, 0.035 * f.t], scale: 1 },
    });
    // 外壳三圈 + 12 片叶（irisSegs 的线段，按开度每帧重算）
    lmLines(cam, this.ring3, { width: 0.8, color: 'dim', gain: 0.3, dash: [5, 9], dof: 9, model });
    lmLines(cam, this.ring2, { width: 0.9, color: 'accent', gain: 0.3, dof: 9, model });
    lmLines(cam, this.ring1, { width: 1.5, color: 'accent', gain: 0.55, glow: 0.45, dof: 9, model });
    lmLines(cam, PART.irisSegs(this.P, open).subarray(0, this.nBlade), {
      width: 1.1, color: 'accent', gain: 0.52 + 0.12 * f.a.kick, glow: 0.4, dof: 9, model,
    });
    lmLines(cam, this.holeRing(holeR * 1.02), { width: 1.3, color: 'accent', gain: 0.6, glow: 0.5, dof: 9, model });

    // ── 瞳孔里那一点白热：全帧唯一的最亮处
    const pr = cam.project([0, Y, 0.02]);
    if (pr) {
      const gl = lmGlow();
      BOLT.radial(gl, pr[0], pr[1], 74 + 26 * f.a.kick, LK.blue, 0.4);
      gl.save(); gl.globalCompositeOperation = 'lighter';
      gl.fillStyle = LK.a(LK.hot, 0.96);
      gl.beginPath(); gl.arc(pr[0], pr[1], 10 + 5 * f.a.kick + 16 * clamp(holeR), 0, TAU); gl.fill();
      gl.restore();
      // 叶尖上的小反光（跟着开度走，不抢最亮）
      gl.save(); gl.globalCompositeOperation = 'lighter'; gl.strokeStyle = LK.a(LK.ice, 0.5); gl.lineWidth = 1.4;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + open * 0.4, r0 = holeR * 1.1, r1 = holeR * 1.1 + 26;
        gl.beginPath();
        gl.moveTo(pr[0] + Math.cos(a) * r0, pr[1] + Math.sin(a) * r0);
        gl.lineTo(pr[0] + Math.cos(a) * r1, pr[1] + Math.sin(a) * r1);
        gl.stroke();
      }
      gl.restore();
    }
    lmEnd(g, { bloom: 0.95 });

    // 字：下三分之一，电弧扫过（treatment 'arc'）
    TY.line(g, f, { reg: 'void', x: 960, y: 902, size: 236, align: 'center' });   // 全片最大的眼睛，字也要最大
    return { grain: 0.03, vignette: 0, shake: 2.6 * f.a.kick };
  },
});
