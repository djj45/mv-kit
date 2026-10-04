// room — 26.32–29.91（VOID）。"Trapped in the Chinese room / with a bag of shrooms"。
// HERO：中文屋黑箱的剖面（前面那一面本来就是缺的 → 直接看进去）。占画面 ≥50%。
//   "实体感"分三层，全部在 init 里建好：
//     ① 亮棱线：壳（底/顶/左右/后）与"前脸 + 投卡口"分开画，前脸最淡——箱子是实的，视线还进得去；
//     ② 面板分缝 + 加强筋：比 12 条棱密得多的线框（后墙竖缝、侧墙横缝与斜撑、地板/顶板横梁）；
//     ③ 点云：S3.cloud 采在箱体表面上（一面墙 = 一块有密度的板）、LG.along 撒在 12 条棱上（棱有厚度）。
//   箱里的剪影在递卡片：台面上常驻一叠 5 片卡片；一只手按"缩回 → 取卡 → 举到投卡口 → 推出去"往复，
//   被推出去的卡片飘到箱外。一帧只有一处最亮：手上（或刚出手）的那张卡。
//   剪影用本镜自己的多边形：头 + 脖子 + 肩 + 躯干 + 两条腿（人不画脸），手臂是画出来的两条折线——
//   因为这条手臂要动。lib 的 figure2d 是"举着双手"的姿势，在这镜里读不出"在递东西"。
// 第二句唱到 "shrooms"（29.124）：箱体自己的线段缓冲被"透镜 / 镜像 / 错位 / 波状切变"重画四遍，
//   四遍都从箱体自己的位置上长出来（形变和偏移从 0 长到满）——不讲道理的几何，但一眼看得出是这只箱子。
// 字：贴箱的左下（第一句 quiet 小字，第二句 swarm 点阵）。只依赖 f.t；线段/点云缓冲全部在 init 里建好。
MV.scene('room', {
  init() {
    const W0 = 4.6, H0 = 2.8, D0 = 3.2, ye = 0.72;
    this.ye = ye; this.W0 = W0; this.H0 = H0; this.D0 = D0;
    const hw = W0 / 2, hh = H0 / 2, hd = D0 / 2;
    this.slotY = ye + H0 * 0.3;                              // 投卡口高度 = 1.56

    // ── 箱体：lib 的零件用来采点云（一份几何），线框按"面"拆成壳 / 前脸 / 投卡口三条缓冲
    const full = PART.roomBox(W0, H0, D0, { slot: true, t: 0.16 });
    S3.move(full, [0, ye, 0]);
    this.cloud = S3.cloud(full, 6400, { seed: 23, jitter: 0.02 });
    this.shellSegs = S3.wireSegs(S3.merge(
      S3.box(W0, 0.16, D0, { at: [0, ye - hh, 0] }),
      S3.box(W0, 0.16, D0, { at: [0, ye + hh, 0] }),
      S3.box(0.16, H0, D0, { at: [-hw, ye, 0] }),
      S3.box(0.16, H0, D0, { at: [hw, ye, 0] }),
      S3.box(W0, H0, 0.16, { at: [0, ye, -hd] }),
    ), { bright: 0.95 });
    this.frontSegs = S3.wireSegs(S3.box(W0 * 0.5, H0 * 0.5, 0.16, { at: [0, ye - H0 * 0.2, hd] }), { bright: 0.5 });
    this.slotSegs = S3.wireSegs(S3.box(W0 * 0.3, H0 * 0.045, 0.16 * 2.4, { at: [0, this.slotY, hd] }), { bright: 1 });

    // ── ② 面板分缝 + 加强筋（每面都加密，箱子才不是一只空框）
    const P = [];
    for (let i = -4; i <= 4; i++) {
      P.push([[i * 0.5, ye - hh, -hd], [i * 0.5, ye + hh, -hd]]);       // 后墙竖缝
      P.push([[i * 0.5, ye - hh, -hd], [i * 0.5, ye - hh, hd]]);       // 地板横梁
      P.push([[i * 0.5, ye + hh, -hd], [i * 0.5, ye + hh, hd]]);       // 顶板横梁
    }
    for (let j = -2; j <= 2; j++) {
      P.push([[-hw, ye + j * 0.5, -hd], [hw, ye + j * 0.5, -hd]]);     // 后墙横缝
      P.push([[-hw, ye + j * 0.5, -hd], [-hw, ye + j * 0.5, hd]]);     // 左墙横缝
      P.push([[hw, ye + j * 0.5, -hd], [hw, ye + j * 0.5, hd]]);       // 右墙横缝
    }
    for (const sx of [-1, 1]) {                                        // 侧墙斜撑
      P.push([[sx * hw, ye - hh, -hd], [sx * hw, ye + hh, hd]]);
      P.push([[sx * hw, ye + hh, -hd], [sx * hw, ye - hh, hd]]);
    }
    this.panelSegs = LG.pairs(P, { bright: 0.5 });

    // ── ③ 棱上的点云（12 条棱各一串点：棱要有厚度，撒得紧一点，不能变成一层"尘"）
    const V8 = [];
    for (const x of [-hw, hw]) for (const y of [ye - hh, ye + hh]) for (const z of [-hd, hd]) V8.push([x, y, z]);
    const E = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = i ^ j; if (d === 1 || d === 2 || d === 4) E.push([V8[i], V8[j]]); }
    this.edgeCloud = LG.join.apply(null, E.map((e, i) => LG.along(e, 40, { jitter: 0.010, seed: 40 + i })));

    // ── 剪影：本镜自己的多边形（脚在 y=0、单位高 1），点云撒在里面 + 一条亮轮廓
    this.FS = 2.05;                                          // 人高 ≈ 1.9，头在投卡口下面
    this.figAt = [0.02, ye - 1.4, 0.80];
    this.figRot = 0.05;
    const poly = this.bodyPoly();
    this.figLine = LG.pairs(poly.map((p, i) => [[p[0], p[1], 0], [poly[(i + 1) % poly.length][0], poly[(i + 1) % poly.length][1], 0]]), { bright: 1 });
    this.fig = this.fill(poly, 900, 71);
    this.cam0 = { yaw: 0.42, pitch: 0.12, dist: 7.6, fov: 34 };

    // ── 台面（剪影右侧的一条窄台，卡片就立在上面）
    const bt = 0.46, b0 = -0.46, b1 = 1.02, bx0 = 0.20, bx1 = 1.74;
    this.bench = LG.pairs([
      [[bx0, bt, b0], [bx1, bt, b0]], [[bx0, bt, b1], [bx1, bt, b1]],
      [[bx0, bt, b0], [bx0, bt, b1]], [[bx1, bt, b0], [bx1, bt, b1]],
      [[bx0 + 0.1, ye - hh, b0 + 0.15], [bx0 + 0.1, bt, b0 + 0.15]],
      [[bx1 - 0.1, ye - hh, b0 + 0.15], [bx1 - 0.1, bt, b0 + 0.15]],
      [[bx0 + 0.1, ye - hh, b1 - 0.15], [bx0 + 0.1, bt, b1 - 0.15]],
      [[bx1 - 0.1, ye - hh, b1 - 0.15], [bx1 - 0.1, bt, b1 - 0.15]],
    ], { bright: 0.5 });
    this.bt = bt;

    // ── 卡片：矩形轮廓 + 卡上印的"符号"（中文屋里递来递去的就是这个）
    const c = [
      [[-0.5, -0.34, 0], [0.5, -0.34, 0]], [[0.5, -0.34, 0], [0.5, 0.34, 0]],
      [[0.5, 0.34, 0], [-0.5, 0.34, 0]], [[-0.5, 0.34, 0], [-0.5, -0.34, 0]],
    ];
    for (let i = 0; i < 2; i++) {
      const y = -0.13 + i * 0.24, x1 = 0.04 + hash(i, 5) * 0.30;
      c.push([[-0.32, y, 0], [x1, y + (hash(i, 7) - 0.5) * 0.04, 0]]);
    }
    this.card = LG.pairs(c, { bright: 0.95 });
    // 台面上常驻的一叠（5 片，扇形摊开，一直在画面里）：参数在 init 里定死
    this.stack = [];
    for (let i = 0; i < 5; i++) {
      this.stack.push({ x: 0.54 + i * 0.10, y: bt + 0.34 * 0.60 + i * 0.006, z: 0.70 + i * 0.05, rz: 0.10 - i * 0.048, rx: -0.28 - i * 0.010, s: 0.6 });
    }
    this.take = this.stack[4];                               // 手每次取最前面那一张
    this.scratch = new Float32Array(this.shellSegs.length);  // 形变用的临时缓冲（init 里分配，不在 render 里 new）
  },

  /** 人形剪影的本地多边形：头（圆弧）+ 脖子 + 肩 + 躯干 + 两条腿；不含手臂（手臂要动，是画出来的折线）。 */
  bodyPoly() {
    const P = [], cx = 0, cy = 0.885, r = 0.082;
    for (let i = 0; i <= 12; i++) {                          // 头：右 → 头顶 → 左
      const a = -1.07 + i / 12 * (Math.PI + 2 * 1.07);
      P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.06]);
    }
    const side = [[0.046, 0.812], [0.152, 0.798], [0.146, 0.690], [0.112, 0.560],
                  [0.120, 0.470], [0.100, 0.230], [0.098, 0.055], [0.104, 0.0]];
    for (const p of side) P.push([-p[0], p[1]]);             // 左半边：脖子 → 肩 → 腰 → 胯 → 腿
    P.push([-0.038, 0.0], [-0.042, 0.230], [-0.036, 0.380], [0, 0.425],
           [0.036, 0.380], [0.042, 0.230], [0.038, 0.0]);    // 左脚内 → 裆 → 右脚内
    for (let i = side.length - 1; i >= 0; i--) P.push([side[i][0], side[i][1]]);
    return P;
  },

  /** 多边形内撒点（确定性；点云必须构成可辨识的形体，不做氛围尘）。 */
  fill(poly, n, seed) {
    const P = new Float32Array(n * 3), rnd = mulberry32(seed);
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const p of poly) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
    let i = 0, guard = 0;
    while (i < n && guard++ < n * 80) {
      const x = minx + rnd() * (maxx - minx), y = miny + rnd() * (maxy - miny);
      let inside = false;
      for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
        if ((poly[a][1] > y) !== (poly[b][1] > y) && x < (poly[b][0] - poly[a][0]) * (y - poly[a][1]) / (poly[b][1] - poly[a][1]) + poly[a][0]) inside = !inside;
      }
      if (inside) { P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = (rnd() - 0.5) * 0.05; i++; }
    }
    return P;
  },

  /** 剪影本地坐标（脚在 y=0、单位高 1）→ 世界坐标。和 lmModel 同一套：先绕 y 转，再等比缩放，再平移。 */
  figWorld(x, y, z) {
    const a = this.figRot, c = Math.cos(a), s = Math.sin(a), F = this.FS, o = this.figAt;
    return [o[0] + (x * c + z * s) * F, o[1] + y * F, o[2] + (-x * s + z * c) * F];
  },

  /**
   * 递卡片的手：一个循环 0.909 s（= 半小节，132 BPM）——
   *   0.00–0.30 从投卡口缩回台边 → 0.30–0.50 伸手取卡 → 0.50–0.78 举到口子前 → 0.78–1.00 推出去。
   * 相位加了固定偏移，让 28.1 s 那一刻正好在"举上去"的半途。位置只由 f.t 决定，连续无跳变。
   */
  hand(t) {
    const bt = this.bt, p = (((t / 0.909) - 0.293) % 1 + 1) % 1;
    const rest = [0.30, 0.94, 1.00], grab = [this.take.x, bt + 0.26, this.take.z];
    const pre = [0.54, 1.44, 1.30], sl = [0.57, this.slotY + 0.02, 1.74], out = [0.62, this.slotY + 0.22, 2.78];
    if (p < 0.30) {
      const k = ease.inOutCubic(p / 0.30);
      return { p, at: roomLerp3(out, rest, k), card: false };
    }
    if (p < 0.50) {
      const k = ease.inOutCubic((p - 0.30) / 0.20);
      return { p, at: roomLerp3(rest, grab, k), card: k > 0.2, rx: lerp(-0.26, -0.36, k), rz: lerp(0.05, -0.02, k), a: clamp((k - 0.2) / 0.3) };
    }
    if (p < 0.78) {
      const k = ease.inOutCubic((p - 0.50) / 0.28);
      return { p, at: roomLerp3(grab, pre, k), card: true, rx: lerp(-0.36, 0, k), rz: -0.02, a: 1 };
    }
    const k = ease.inCubic((p - 0.78) / 0.22);
    return { p, at: k < 0.45 ? roomLerp3(pre, sl, k / 0.45) : roomLerp3(sl, out, (k - 0.45) / 0.55), card: true, rx: lerp(0, -1.05, clamp((k - 0.3) / 0.7)), rz: -0.02, a: 1 - clamp((k - 0.72) / 0.28) };
  },

  /**
   * 透镜式形变：把箱子自己的线段缓冲按 o 重画一遍
   * （镜像 → 透镜放大/收缩 → 非等比缩放 → 错切 → 波状错位 → 平移）。
   * o.k 是这一遍"长出来"的进度：形变和偏移都从 0 长到满，所以它是从箱体里长出来的，不是另一只淡入的箱子。
   */
  warp(o) {
    const src = this.shellSegs, dst = this.scratch, k = o.k;
    const cx = o.c[0], cy = o.c[1], cz = o.c[2], rad2 = o.rad * o.rad;
    const amp = o.amp * k, s = o.sc, mir = o.mir, sh = o.sh, wv = o.wave, off = o.off;
    for (let i = 0; i < src.length; i += 8) {
      for (const e of [0, 3]) {
        let x = src[i + e] - cx, y = src[i + e + 1] - cy, z = src[i + e + 2] - cz;
        if (mir[0]) x = -x; if (mir[1]) y = -y; if (mir[2]) z = -z;
        const r = Math.hypot(x, y, z), gl = 1 + amp * Math.exp(-(r * r) / rad2);
        x *= gl * s[0]; y *= gl * s[1]; z *= gl * s[2];
        const y0 = y; x += y0 * sh[0] * k; y += x * sh[1] * k;
        x += Math.sin((y0 + z * 0.6) * wv[1]) * wv[0] * k;
        dst[i + e] = x + cx + off[0] * k;
        dst[i + e + 1] = y + cy + off[1] * k;
        dst[i + e + 2] = z + cz + off[2] * k;
      }
      dst[i + 6] = src[i + 6]; dst[i + 7] = src[i + 7];
    }
    return dst;
  },

  render(g, f) {
    const ye = this.ye, hd = this.D0 / 2;
    const p = ease.inOutCubic(clamp(f.lt / Math.max(0.4, f.dur)));
    const cam = lmOrbit({ yaw: this.cam0.yaw + 0.05 * p, pitch: this.cam0.pitch, dist: lerp(8.2, 7.3, p), target: [0, 0.10, 0], fov: this.cam0.fov });
    const shT = this.word(f, 'shrooms');                              // 29.124
    const sh = prog(f.t, shT, shT + 0.26, ease.outCubic);
    const bob = 0.016 * Math.sin(f.t * 1.7);
    const hand = this.hand(f.t);

    lmBegin(LK.palVoid());
    // 箱体：壳（亮）→ 面板分缝（中）→ 棱上的点（亮）→ 墙面的点云（暗底子）→ 前脸（最淡，视线从它上面过去）
    const dim = 1 - 0.28 * sh;
    if (0) lmLines(cam, this.shellSegs, {
      width: 1.6, color: 'accent', gain: (1.2 + 0.16 * f.a.low) * dim, glow: 0.44, dof: 9,
      model: { rot: [0, 0.004 * Math.sin(f.t * 0.9), 0], scale: 1 + 0.004 * f.a.kick },
    });
    lmLines(cam, this.panelSegs, { width: 0.95, color: 'accent', gain: 0.52 * dim, glow: 0.26, dof: 10 });
    lmPoints(cam, this.edgeCloud, { size: 1.6, gain: 0.75 * dim, color: 'accent', dof: 0 });
    lmPoints(cam, this.cloud, { size: 1.2, gain: 0.3 * dim, color: 'dim', dof: 0 });
    lmLines(cam, this.frontSegs, { width: 0.9, color: 'dim', gain: 0.42 * dim, glow: 0.2, dof: 9 });
    lmLines(cam, this.slotSegs, { width: 1.5, color: 'accent', gain: (0.75 + 0.5 * f.a.kick) * dim, glow: 0.5, dof: 8 });
    lmLines(cam, this.bench, { width: 1.05, color: 'accent', gain: 0.48 * dim, glow: 0.24, dof: 10 });

    // 剪影：点云打底 + 一条亮轮廓（这样才认得出是"人"，而不是一团噪点）
    const figModel = { pos: this.figAt, rot: [0, this.figRot, 0], scale: this.FS };
    lmPoints(cam, this.fig, { size: 1.5, gain: 0.40, color: 'warn', dof: 8, focus: 7.3, model: figModel });
    lmLines(cam, this.figLine, { width: 1.15, color: 'warn', gain: 0.62, glow: 0.3, dof: 8, model: figModel });
    // 两条手臂：右臂在递卡片（肩 → 肘 → 手，跟着手走），左臂垂在身侧
    const hnd = hand.at, shR = this.figWorld(0.14, 0.775, 0), shL = this.figWorld(-0.14, 0.775, 0);
    const d = [hnd[0] - shR[0], hnd[1] - shR[1], hnd[2] - shR[2]];
    const el = [shR[0] + d[0] * 0.5 + d[2] * 0.14 + 0.05, shR[1] + d[1] * 0.5 - 0.16, shR[2] + d[2] * 0.5 - d[0] * 0.14];
    const elL = this.figWorld(-0.20, 0.66, 0.02), hL = this.figWorld(-0.21, 0.50, 0.10 + 0.01 * Math.sin(f.t * 1.3));
    lmLines(cam, LG.pairs([[shR, el], [el, hnd], [shL, elL], [elL, hL]], { bright: 1 }), { width: 1.3, color: 'warn', gain: 0.66, glow: 0.32, dof: 8 });
    lmPoints(cam, LG.gauss(40, 0.05, { seed: 33, at: hnd }), { size: 2.1, gain: 0.55, color: 'fg', dof: 7, focus: 7.3 });

    // 台面上常驻的一叠卡片（5 片扇形摊开，一直看得见）
    for (let i = 0; i < this.stack.length; i++) {
      const c = this.stack[i], lift = (c === this.take && hand.card) ? 0.04 : 0;
      lmLines(cam, this.card, {
        width: 1.05, color: 'warn', gain: 0.46, glow: 0.28, dof: 8.5,
        model: { pos: [c.x + lift, c.y + lift, c.z], rot: [c.rx, 0, c.rz], scale: c.s },
      });
    }
    // 手上那张：这一帧唯一的最亮（白热、锐利，压在别的光上面）
    if (hand.card && hand.a > 0.01) {
      lmLines(cam, this.card, {
        width: 1.3 + 0.9 * hand.a, color: 'hot', gain: 0.95 * hand.a, glow: 0.4, dof: 7.5,
        model: { pos: hand.at, rot: [hand.rx, 0, hand.rz], scale: this.take.s },
      });
    }

    // ── 不讲道理的几何：箱子自己的线段缓冲，用透镜 / 镜像 / 错位重画四遍，一遍比一遍更不讲道理
    if (sh > 0.001) {
      const wrong = [
        { at: 0.00, c: 'warn', g: 0.46, o: { c: [0, ye, 0], rad: 2.1, amp: 0.60, mir: [1, 0, 0], sc: [1, 1, 1], sh: [0, 0], wave: [0, 0], off: [0, 0.18, 0] } },
        { at: 0.05, c: 'accent', g: 0.40, o: { c: [0, ye, 0], rad: 2.4, amp: -0.48, mir: [0, 1, 0], sc: [0.92, 0.92, 0.92], sh: [0, 0], wave: [0, 0], off: [-1.15, 0.22, 0.35] } },
        { at: 0.10, c: 'accent', g: 0.34, o: { c: [0, ye, 0], rad: 3.0, amp: 0.18, mir: [0, 0, 0], sc: [1, 1, 1], sh: [0.55, 0.16], wave: [0.42, 2.3], off: [1.05, 0.40, -0.45] } },
        { at: 0.16, c: 'warn', g: 0.28, o: { c: [0, ye, 0], rad: 1.7, amp: 0.35, mir: [0, 0, 1], sc: [0.78, 1.35, 0.78], sh: [0.2, 0], wave: [0.22, 3.1], off: [0.25, 0.62, 0.1] } },
      ];
      for (const w of wrong) {
        const k = prog(f.t, shT + w.at, shT + w.at + 0.30, ease.outCubic);
        if (k <= 0.01) continue;
        lmLines(cam, this.warp(Object.assign({}, w.o, { k })), {
          width: 1.05, color: w.c, gain: w.g * k, glow: 0.3, dof: 11, dynamic: true,
        });
      }
    }
    lmEnd(g, { bloom: 0.9 });

    // 字：贴箱的左下。第一句小而静，第二句转成点阵（swarm）——都在 lmEnd 之后画，锐利、不发光
    const li = TY.index(f);
    if (li === 9) TY.line(g, f, { reg: 'void', x: 336, y: 934, size: 104, align: 'left' });
    else TY.line(g, f, { reg: 'void', x: 336, y: 908, size: 58, align: 'left' });
    lmTag(g, 'ROOM 08 — SEALED BOX / IN: SYMBOLS  OUT: SYMBOLS', 336, 796, { size: 14, track: 0.26, color: 'dim', align: 'left' });
    return { grain: 0.03, vignette: 0, shake: (1.2 + 3.4 * sh) * f.a.kick };
  },

  /** 一句里某个词开始的时间（大小写都不敏感）："shrooms" 一被唱到，箱子就开始出问题。 */
  word(f, s) {
    const L = f.lyrics.lines, q = String(s).toLowerCase();
    for (let i = 0; i < L.length; i++) for (let k = 0; k < L[i].words.length; k++) {
      const w = L[i].words[k];
      if (w.w.toLowerCase().indexOf(q) === 0) return w.start;
    }
    return f.from + 2;
  },
});

/** 两个三维点之间插值（本镜内部用；顶层名字加前缀，避免和其他 scene 撞名）。 */
function roomLerp3(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
