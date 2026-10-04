// ortho — 乐章 8 的第一镜（1:45.70–1:49.33）。VOID 独奏段：两条互相垂直、**永远不相交**的轴
// （横轴在相机这一侧 z=+0.55，竖轴在另一侧 z=-0.55：方向垂直，但空间里错开，投影交叉处画工程图的
// "跳线"符号），中间一根一直在抖的蓝线——电弧当琴弦拉。
//
// HERO：轴系（两条轴各自跨满整幅，合起来 ≥50%）。字区：T[33] = 'quiet' / upper，
// 两行小字分别骑在两条轴上（横轴上方一行，竖轴旁边竖排一行）。
// 拍点：kick 上两条轴各延伸一点；"blues" 的长音把横轴压弯一点点（0.17 世界单位以内）。
MV.scene('ortho', {
  init() {
    this.ZA = 0.55;          // 横轴的深度（靠近相机）
    this.ZB = -0.55;         // 竖轴的深度（在另一侧）—— 两条轴永不相交就是靠这个
    this.LA = 6.6;           // 横轴半长（两端都出画）
    this.LB = 4.8;           // 竖轴半长
    this.nA = 72;            // 横轴折线采样（要能被"blues"压弯）
    this.nB = 56;
    this.segA = new Float32Array(this.nA * 8);
    this.segB = new Float32Array(this.nB * 8);
    this.tip = new Float32Array(32);         // kick 上延伸出来的那一小截
    this.tickA = new Float32Array(140 * 8);  // 横轴刻度（每 0.2 一格，每 1.0 一根长的）
    this.tickB = new Float32Array(140 * 8);
    this.nTA = 0; this.nTB = 0;
    for (let i = -33; i <= 33; i++) {        // 横轴刻度朝 y（竖直）
      const x = i * 0.2, major = i % 5 === 0, h = major ? 0.20 : 0.085, s = this.nTA * 8;
      this.tickA[s] = x; this.tickA[s + 1] = 0; this.tickA[s + 2] = this.ZA;
      this.tickA[s + 3] = x; this.tickA[s + 4] = h; this.tickA[s + 5] = this.ZA;
      this.tickA[s + 6] = major ? 0.9 : 0.5; this.tickA[s + 7] = 0;
      this.nTA++;
    }
    for (let j = -23; j <= 23; j++) {        // 竖轴刻度朝 x（水平）
      const y = j * 0.2, major = j % 5 === 0, h = major ? 0.20 : 0.085, s = this.nTB * 8;
      this.tickB[s] = 0; this.tickB[s + 1] = y; this.tickB[s + 2] = this.ZB;
      this.tickB[s + 3] = h; this.tickB[s + 4] = y; this.tickB[s + 5] = this.ZB;
      this.tickB[s + 6] = major ? 0.9 : 0.5; this.tickB[s + 7] = 0;
      this.nTB++;
    }
    // 轴上的轨迹点（点云也必须构成形体：这些点全落在两条轴上）
    const pts = [];
    for (let i = 0; i < 260; i++) {
      pts.push((hash(i, 21, 1) - 0.5) * 2 * this.LA, (hash(i, 21, 2) - 0.5) * 0.055, this.ZA + (hash(i, 21, 3) - 0.5) * 0.02);
    }
    for (let i = 0; i < 200; i++) {
      pts.push((hash(i, 33, 2) - 0.5) * 0.055, (hash(i, 33, 1) - 0.5) * 2 * this.LB, this.ZB + (hash(i, 33, 3) - 0.5) * 0.02);
    }
    this.dust = new Float32Array(pts);
  },

  render(g, f) {
    const cam = lmOrbit({ yaw: 0.15 + 0.05 * LK.in(f, f.dur), pitch: 0.035, dist: 10.4, fov: 27, target: [0, 0.1, 0] });
    const ext = 0.55 * f.a.kick + 0.30 * f.a.low;      // 两条轴在 kick 上各延伸一点
    const bend = prog(f.t, 107.46, 108.55, ease.inOutCubic) * (1 - prog(f.t, 108.95, 109.33, ease.inCubic));
    const sag = 0.17 * bend;                           // "blues" 的长音把横轴压弯
    const LA = this.LA + ext, LB = this.LB + ext, ZA = this.ZA, ZB = this.ZB;

    // ── 几何：横轴（可被压弯）+ 竖轴，全写进 init 里建好的缓冲
    for (let i = 0; i < this.nA; i++) {
      const s = i * 8, u0 = i / this.nA, u1 = (i + 1) / this.nA;
      this.segA[s] = -LA + 2 * LA * u0; this.segA[s + 1] = -sag * Math.sin(Math.PI * u0); this.segA[s + 2] = ZA;
      this.segA[s + 3] = -LA + 2 * LA * u1; this.segA[s + 4] = -sag * Math.sin(Math.PI * u1); this.segA[s + 5] = ZA;
      this.segA[s + 6] = 1; this.segA[s + 7] = i === 0 ? 1 : i === this.nA - 1 ? 2 : 0;
    }
    for (let i = 0; i < this.nB; i++) {
      const s = i * 8;
      this.segB[s] = 0; this.segB[s + 1] = -LB + 2 * LB * (i / this.nB); this.segB[s + 2] = ZB;
      this.segB[s + 3] = 0; this.segB[s + 4] = -LB + 2 * LB * ((i + 1) / this.nB); this.segB[s + 5] = ZB;
      this.segB[s + 6] = 1; this.segB[s + 7] = i === 0 ? 1 : i === this.nB - 1 ? 2 : 0;
    }
    this.tip.set([-LA, 0, ZA, -this.LA, 0, ZA, 1, 2,
                  this.LA, 0, ZA, LA, 0, ZA, 1, 2,
                  0, -LB, ZB, 0, -this.LB, ZB, 1, 2,
                  0, this.LB, ZB, 0, LB, ZB, 1, 2]);

    lmBegin(LK.palVoid());
    // ① 轴上的轨迹点（很淡：点也必须构成形体）
    lmPoints(cam, this.dust, { size: 1.2, color: 'dim', gain: 0.16, twinkle: 0.30, t: f.t, fog: 30 });
    // ② 刻度
    lmLines(cam, this.tickA, { width: 1.0, color: 'dim', gain: 0.75, glow: 0.35 });
    lmLines(cam, this.tickB, { width: 1.0, color: 'dim', gain: 0.75, glow: 0.35 });
    // ③ 两条轴本体：钢蓝的细实线（方向垂直，永远不相交）
    lmLines(cam, this.segA, { width: 2.1, color: 'warn', gain: 0.68, glow: 0.5 });
    lmLines(cam, this.segB, { width: 2.1, color: 'warn', gain: 0.68, glow: 0.5 });
    // ④ kick 上延伸出来的那一截（大动作落在拍上）
    lmLines(cam, this.tip, { width: 2.8, color: 'accent', gain: 0.35 + 0.65 * clamp(f.a.kick * 3), glow: 0.9 });

    // ── 中间那根弦：BOLT.pathBetween 拉出来的一根一直在抖的细电弧
    const pA = cam.project([-2.35, 0, ZA]) || [760, 660, 1];
    const gl = lmGlow();
    const sxp = pA[0], sy0 = pA[1], sy1 = pA[1] - 470;
    const pluck = 5 + 30 * f.a.kick + 9 * f.a.snare;
    const pts = BOLT.pathBetween([sxp, sy0], [sxp, sy1], { tick: f.tick, seed: 7, jag: 0.012, depth: 6, drift: 1.6 });
    for (let i = 1; i < pts.length - 1; i++) {          // 拨一下：中段横着弹开
      const u = i / (pts.length - 1);
      pts[i][0] += pluck * Math.sin(Math.PI * u) * Math.sin(u * 6.2 + f.t * 5.4);
    }
    gl.save(); gl.globalCompositeOperation = 'lighter';  // 弦的余光（很淡的一层）
    gl.strokeStyle = LK.a(LK.blue, 0.22); gl.lineWidth = 9;
    gl.beginPath(); gl.moveTo(sxp, sy0 + 6); gl.lineTo(sxp, sy1 + 40); gl.stroke();
    BOLT.radial(gl, sxp, sy0, 54, LK.blue, 0.26 + 0.30 * f.a.kick);   // 弦的固定座
    gl.restore();
    BOLT.draw(gl, pts, { w: 2.4, color: LK.blue, core: LK.arc, gain: 1.0 });
    // 两条轴投影交叉处的"跳线"符号：横轴从竖轴上跳过去
    const cA = cam.project([0, 0, ZA]), cB = cam.project([0, 0, ZB]);
    if (cA && cB) {
      gl.save(); gl.globalCompositeOperation = 'lighter';
      gl.strokeStyle = LK.a(LK.arc, 0.7); gl.lineWidth = 2.0;
      gl.beginPath(); gl.arc(cB[0], cA[1], 15, Math.PI, 0); gl.stroke();
      gl.strokeStyle = LK.a(LK.blue, 0.5); gl.lineWidth = 1.0;
      gl.beginPath(); gl.arc(cB[0], cA[1], 22, Math.PI, 0); gl.stroke();
      gl.restore();
    }
    lmEnd(g, { bloom: 0.9 });

    // ── 泛光之后才是锐利的东西：读数、引线、字
    lmTag(g, 'ORTHO \u2014 TWO AXES \u00b7 90.000\u00b0 \u00b7 THEY NEVER MEET', 120, 96,
      { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, 'SKEW \u0394 = 1.100', W - 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'right' });
    if (cA && cB) lmLabel(g, cB[0] + 26, cA[1] - 16, 'NO INTERSECTION / SKEW', { dx: 130, dy: -64, run: 54, size: 14, color: 'accent' });

    // ── 纯字的一镜：两条轴就是两行字的基线，字大到占满画面。
    // 横轴上是 "Orthogonality"，竖轴上是 "thesis blues"（竖排，90°）——两条轴永远不相交，
    // 两行字也永远不碰面。这就是"正交性论文"那句话本身的样子。
    const axY = (cam.project([-3.4, 0, ZA]) || [0, 700])[1];
    const big = 132;
    const thesisText = 'thesis blues';
    TY.line(g, f, { reg: 'void', treat: 'arc', words: [0, 1], x: 168, y: axY - 26, size: big, align: 'left', phase: 0.3 });
    // 轴上的刻度数字（贴着 HERO 的那一处世界内读数，等宽小字）
    for (const v of [-4, -2, 2, 4]) {
      const sp = cam.project([v, 0, ZA]);
      if (!sp) continue;
      LK.mono(g, 15, { track: 0.08 });
      g.fillStyle = LK.a(LK.ice, 0.42); g.textAlign = 'center';
      g.fillText(String(v), sp[0], sp[1] + 30);
    }
    g.textAlign = 'left';
    const vb = cam.project([0, 0.45, ZB]) || [1200, 500];
    g.save();
    g.translate(vb[0] + 74, axY + 150); g.rotate(-Math.PI / 2);   // 起点落到横轴下面，竖排往上走到离顶 200+ px（原来从轴上起，整句顶出画面）
    TY.line(g, f, { reg: 'void', treat: 'arc', words: [1, 3], x: 0, y: 0, size: big, align: 'left', phase: 0.66 });
    g.restore();
    // 这半句是竖排（旋转过）的：TY.line 报的 box 是旋转前的坐标，对不上画面，所以这里自己报一个真位置，
    // 推近的自动夹紧才守得住"字离边缘 ≥96 px"。
    const vw = (function () { const m = mk(8, 8).getContext('2d'); LK.display(m, big, { track: 0 }); return m.measureText(thesisText).width; })();
    TY.box = { x0: vb[0] + 74 - 150, x1: vb[0] + 74 + 44, y0: axY + 150 - vw - 30, y1: axY + 150 + 30 };
    TY.boxT = f.t;
    return { grain: 0.03, vignette: 0 };
  },
});
