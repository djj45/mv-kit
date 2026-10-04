// circuits — 图纸 03（0:05.70–0:09.34）。PLATE 语域：纸 + 墨，纯 Canvas 2D，什么都不发光。
// HERO：神经线路板总成（PART.board 的板 + 焊盘 + 芯片，加一层平的走线），板占左中大半个画面，
//       出画下沿；右中和上三分之一留白给字、尺寸线和标题栏。
// 走线像神经：一条条从芯片的走线头长出去、亮一下、又缩回（"nervous"）。
// 字区：上三分之一偏右（TY.T[1] 的 dimension treatment：字骑在尺寸线上，尺寸数字是这一句的时间）。
// 拍点：'nervous' 落在 kick 上时全板缩回一次；'surprise' 唱到时整帧反相 2 帧（冲击帧修辞）。
MV.scene('circuits', {
  init() {
    const BW = 6.2, BH = 5.2;                        // 板的世界尺寸（xy 平面，z 是厚度）
    this.BW = BW; this.BH = BH;
    const Z = 0.075;                                 // 走线贴在板的正面之上
    const rnd = mulberry32(1207);
    // 板总成：底板 + 中央芯片 + 两条边连接器 + 焊盘。用的是和 PART.board 同一套 S3 图元，
    // 但走线必须平贴在板面上、还要能一条条生长缩回，所以这里自己拼（PART.board 的走线是 3D 扫掠，
    // 在这个比例下会变成一堆梁，且不能单独动）。
    this.plate = S3.box(BW, BH, 0.13);
    const hubAt = [0.15, -0.2, 0.19];
    this.hub = S3.box(1.7, 1.1, 0.25, { at: hubAt });
    const parts = [
      this.hub,
      S3.box(0.42, 2.0, 0.3, { at: [-BW * 0.45, 0.9, 0.16] }),
      S3.box(0.42, 2.0, 0.3, { at: [BW * 0.45, -0.7, 0.16] }),
      S3.box(1.1, 0.4, 0.26, { at: [-1.4, BH * 0.42, 0.15] }),
    ];
    // 成品铜箔：34 条曼哈顿走线（图纸上的成品走线），两端各有一个焊盘
    this.trace = [];
    for (let i = 0; i < 34; i++) {
      const a0 = rnd() * TAU, r0 = 0.5 + rnd() * 1.5;
      const a1 = rnd() * TAU, r1 = 2.2 + rnd() * 0.9;
      const sx = Math.cos(a0) * r0, sy = Math.sin(a0) * r0 * 0.8;
      const tx = clamp(Math.cos(a1) * r1, -BW * 0.46, BW * 0.46);
      const ty = clamp(Math.sin(a1) * r1 * 0.85, -BH * 0.46, BH * 0.46);
      const x1 = lerp(sx, tx, 0.35 + rnd() * 0.3), y1 = lerp(sy, ty, 0.45 + rnd() * 0.3);
      this.trace.push([[sx, sy, Z], [x1, sy, Z], [x1, y1, Z], [tx, y1, Z], [tx, ty, Z]]);
      parts.push(S3.cyl(0.055, 0.055, 0.07, 10, { centered: true, at: [sx, sy, Z + 0.02] }));
      parts.push(S3.cyl(0.055, 0.055, 0.07, 10, { centered: true, at: [tx, ty, Z + 0.02] }));
    }
    this.parts = S3.merge.apply(null, parts);
    // 神经：18 条会生长 / 点亮 / 缩回的走线，从中央芯片射向板边
    this.nerve = [];
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU + 0.26;
      const tx = Math.cos(a) * BW * 0.44, ty = Math.sin(a) * BH * 0.42;
      const sx = hubAt[0] + (rnd() - 0.5) * 1.3, sy = hubAt[1] + (rnd() - 0.5) * 1.0;
      const x1 = lerp(sx, tx, 0.40), y1 = lerp(sy, ty, 0.58);
      this.nerve.push({
        pts: [[sx, sy, Z], [x1, sy, Z], [x1, y1, Z], [tx, y1, Z], [tx, ty, Z]],
        tw: 0.60 + rnd() * 0.36,
      });
    }
  },
  /** 歌词里某个词开始的时间（不写死秒数）。 */
  wt(f, q) { const w = f.lyrics.findWords(q)[0]; return w ? w.start : null; },
  /** 折线上弧长比例 [a,b] 的那一段（DR.pen 只能从起点画到 upto）。 */
  seg(g, pts, a, b, o) {
    let total = 0; const L = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); total += l; }
    if (total < 1e-3) return null;
    const s0 = clamp(a) * total, s1 = clamp(b) * total;
    let acc = 0, on = false, tip = pts[pts.length - 1];
    g.save();
    g.strokeStyle = o.color || LK.ink; g.lineWidth = o.w == null ? 1.2 : o.w;
    g.lineCap = o.cap || 'round'; g.lineJoin = 'round'; g.setLineDash(o.dash || []);
    g.beginPath();
    for (let i = 1; i < pts.length; i++) {
      const l = L[i - 1], p0 = acc, p1 = acc + l; acc = p1;
      if (l < 1e-6 || p1 <= s0 || p0 >= s1) continue;
      const u0 = clamp((s0 - p0) / l), u1 = clamp((s1 - p0) / l);
      const ax = lerp(pts[i - 1][0], pts[i][0], u0), ay = lerp(pts[i - 1][1], pts[i][1], u0);
      const bx = lerp(pts[i - 1][0], pts[i][0], u1), by = lerp(pts[i - 1][1], pts[i][1], u1);
      if (!on) { g.moveTo(ax, ay); on = true; } else g.lineTo(ax, ay);
      g.lineTo(bx, by);
      if (u1 > 0 && u1 < 1) tip = [bx, by];
    }
    if (on) g.stroke();
    g.restore();
    return tip;
  },
  render(g, f) {
    DR.paper(g);
    // 'nervous' 唱到的那一下：整板缩回，再慢慢长回来
    const nv = this.wt(f, 'nervous');
    const rt = nv == null ? 1e9 : f.t - nv;
    const coll = rt < 0 ? 0 : rt < 0.10 ? rt / 0.10 : Math.max(0, 1 - (rt - 0.10) / 0.55);
    const grow = LK.in(f, 0.55, ease.outCubic) * (1 - coll);
    const cam = {
      yaw: -0.42, pitch: 0.50, cx: 660, cy: 700,
      zoom: 205 * (1 + 0.010 * f.a.kick) * (1 - 0.022 * coll),
    };

    // 板：底板 → 板面上的网点（大面积的"料"用网点，不用灰）→ 焊盘 / 芯片 → 平的走线
    S3.drawAll(g, [{ mesh: this.plate }], { cam, edgeW: 1.4, hiddenW: 0.6, hiddenCol: LK.ink3 });
    const q = [[-this.BW / 2, -this.BH / 2, 0.066], [this.BW / 2, -this.BH / 2, 0.066],
               [this.BW / 2, this.BH / 2, 0.066], [-this.BW / 2, this.BH / 2, 0.066]].map(p => S3.proj(cam, p));
    DR.toneFill(g, gg => { gg.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) gg.lineTo(q[i][0], q[i][1]); gg.closePath(); },
      0, LK.a(LK.deep, 0.3));
    S3.drawAll(g, [{ mesh: this.parts }], {
      cam, edgeW: 1.25, hiddenW: 0.6, hiddenCol: LK.ink3,
      tone: (fc, fi, n) => (n[1] > 0.55 ? LK.tone[2] : LK.tone[4]),   // 零件比板深两档：板是底，零件是件
    });

    // 成品铜箔：平贴在板面的细线（用投影后的折线画，不用 3D 扫掠——那样在这个比例下会变成一堆梁）
    for (const t of this.trace) {
      const pts = t.map(p => S3.proj(cam, p));
      DR.pen(g, pts, 1, { color: LK.ink2, w: 1.15 });
      for (const e of [pts[0], pts[pts.length - 1]]) {
        g.save(); g.fillStyle = LK.ink2; g.fillRect(e[0] - 2.4, e[1] - 2.4, 4.8, 4.8); g.restore();
      }
    }

    // 神经走线：虚线 = 图纸上的计划走线；实线 = 已经长出来的；蓝的一段 = 正在放电的神经
    for (let i = 0; i < this.nerve.length; i++) {
      const N = this.nerve[i];
      const k = clamp(grow * 1.9 - i * 0.044) * (0.68 + 0.32 * (0.5 + 0.5 * noise1(f.t * 2.1 + i * 3.1, 5)));
      const pts = N.pts.map(p => S3.proj(cam, p));
      if (k < 0.03) { this.seg(g, pts, 0, 1, { color: LK.ink3, w: 0.9, dash: [5, 5] }); continue; }
      this.seg(g, pts, 0, 1, { color: LK.ink3, w: 0.9, dash: [5, 5] });
      this.seg(g, pts, 0, k, { color: LK.ink2, w: 1.5 });
      const tip = this.seg(g, pts, Math.max(0, k - 0.45), k, { color: LK.blue, w: 3.4 });
      if (tip) { g.save(); g.fillStyle = LK.blue; g.fillRect(tip[0] - 3.4, tip[1] - 3.4, 6.8, 6.8); g.restore(); }
    }

    // 家具：中心线、板的长边尺寸、修订记录（工程图的日常）
    const hub = S3.proj(cam, [0.15, -0.2, 0.19]);
    DR.center(g, hub[0], hub[1], 250, { color: LK.ink3, w: 0.7 });
    const cA = S3.proj(cam, [-this.BW / 2, this.BH / 2, 0]);
    const cB = S3.proj(cam, [this.BW / 2, this.BH / 2, 0]);
    DR.dim(g, cA, cB, -22, { text: '6200 \u00b10.05', size: 15, color: LK.ink2 });   // 板的长边尺寸
    DR.micro(g, 'REV B — CH 07\u201318 ADDED, NERVE SIM', 1240, 700, { size: 13, color: LK.blue });
    // 这一镜唯一的一处世界内读数：贴在主角（中枢）上
    DR.leader(g, hub[0] + 40, hub[1] - 30, 300, -190, 'BRD-N01 · HUB / 18 CH NERVE', { draw: LK.in(f, 0.9), size: 15, color: LK.blue });
    DR.micro(g, 'TRACE 0.12 mm  \u00b7  LAYER 1-12  \u00b7  SHEET 03 / 42', 150, 700, { size: 13, color: LK.ink2 });

    DR.titleBlock(g, {
      rows: [['part no.', 'BRD-N01'], ['material', 'DS-BLUE / NULL'], ['layer', '12 — SIGNAL'], ['drawn', 'BOLT.PLOTTER']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 03 / 42 — NERVOUS SYSTEM', rev: 'REV B',
      alpha: LK.in(f, 0.6),
    });

    // 字：dimension treatment，骑在尺寸线上；位置在上三分之一偏右的留白里
    const cur = TY.current(f);
    TY.line(g, f, {
      reg: 'plate', treat: 'dimension', align: 'right', x: 1780, y: 186, size: 62,
      label: cur ? 'T ' + cur.line.start.toFixed(2) : '',
    });

    // 'no surprise'：整帧反相 2 帧
    const sw = this.wt(f, 'surprise');
    const inv = sw != null && f.t >= sw && f.t < sw + 2 / 30 + 1e-6;
    return { grain: 0.03, vignette: 0, invert: inv ? 1 : 0 };
  },
});
