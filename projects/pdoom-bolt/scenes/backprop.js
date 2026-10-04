// backprop — 21（73.88–77.52，PLATE）。HERO：剖开的 MLP 层（5 块层板，正面打 45° 剖面线，占中）。
// 剖面里一个脉冲往前走、再走回来：蓝色高亮的那一层在移动，路径从层板顶上走过去、底下走回来。
// 尺寸线（挂在歌词上）在数往返次数；左边一条竖直尺寸线量层数与层距。字在下。
MV.scene('backprop', {
  init() {
    this.n = 5; this.d = 0.95; this.cy = 430; this.zoom = 236;
    this.cam = { yaw: 0.42, pitch: 0.30, zoom: this.zoom, cx: 960, cy: this.cy };
    this.items = []; this.units = [];
    for (let i = 0; i < this.n; i++) {
      const x = (i - 2) * this.d;
      const it = { mesh: S3.bake(S3.box(0.42, 2.2, 1.5), { pos: [x, 0, 0] }), lit: 0, hatch: null };
      it.hatch = (face, fi) => fi === 1 && it.lit < 0.3;              // 正面（+z）打剖面线；被点亮时改平色
      this.items.push(it);
      const us = [];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 5; b++) us.push([x, -0.86 + b * 0.43, 0.752]);
      this.units.push(us);
    }
    this.pathF = []; this.pathB = [];
    for (let i = 0; i < this.n; i++) this.pathF.push([(i - 2) * this.d, 1.17, 0.78]);
    for (let i = this.n - 1; i >= 0; i--) this.pathB.push([(i - 2) * this.d, -1.17, 0.78]);
    this.barLen0 = 1.82;
  },
  /** solid.js 的默认平色（我要按"这一层有没有被点亮"改它，所以得自己算一遍）。 */
  toneOf(n) {
    const d = n[0] * S3.LIGHT[0] + n[1] * S3.LIGHT[1] + n[2] * S3.LIGHT[2];
    const k = Math.max(0, Math.min(0.999, 0.5 + 0.5 * d));
    return LK.tone[Math.min(LK.tone.length - 1, Math.floor((1 - k) * LK.tone.length))];
  },
  fit(g, text, size, maxW) {
    if (!text) return size;
    const w = LK.measure(g, text, size, { track: 0.02 });
    return w > maxW ? size * maxW / w : size;
  },
  render(g, f) {
    DR.paper(g);
    // 二维转三维：开头镜头正对层板（5 块板叠在一起，看上去就是一张平面工程图），
    // 第一个小节头起用 1.5 s 转到 3/4 轴测——同一张图忽然有了厚度。
    const rt = ease.inOutCubic(clamp((f.lt - 0.22) / 1.45));
    this.cam.yaw = lerp(0.10, 0.46, rt);
    this.cam.pitch = lerp(0.07, 0.32, rt);
    this.cam.zoom = this.zoom * lerp(1.06, 1.0, rt);
    const dbs = f.audio.downbeats || [];
    const bar = dbs.length > 1 ? dbs[1] - dbs[0] : this.barLen0;
    const ph = f.barPhase == null ? ((f.t - f.from) % bar) / bar : f.barPhase;
    const fwd = ph < 0.5, k = fwd ? ph * 2 : (1 - ph) * 2;             // 一小节一个往返
    const trips = 1 + Math.floor((f.t - f.from) / Math.max(0.4, bar));

    // 脉冲：一层一层亮（软的高亮，邻层带一点余光）；往回走时高亮要跟着倒过来
    const pidx = (fwd ? k : 1 - k) * (this.n - 1);
    for (let i = 0; i < this.n; i++) this.items[i].lit = clamp(1 - Math.abs(pidx - i) / 1.15);
    S3.drawAll(g, this.items, {
      cam: this.cam, edgeW: 1.4, hiddenW: 0.65, hiddenCol: LK.ink3,
      hatchOpt: { gap: 8, color: LK.hatch, angle: -Math.PI / 4 },
      tone: (face, fi, n, it) => LK.mix(this.toneOf(n), LK.blue, (fi === 1 ? 0.62 : 0.3) * it.lit),
    });
    // 层板正面的单元（剖面上的一颗颗神经元）：亮起来的那层跟着蓝
    for (let i = 0; i < this.n; i++) {
      const lit = this.items[i].lit;
      for (const u of this.units[i]) {
        const p = S3.proj(this.cam, u);
        g.beginPath(); g.arc(p[0], p[1], 5.2, 0, TAU);
        g.fillStyle = LK.paper2; g.fill();
        g.lineWidth = lit > 0.3 ? 1.8 : 1.1;
        g.strokeStyle = lit > 0.3 ? LK.blue : LK.ink2; g.stroke();
      }
    }
    // 信号路径：顶上走过去，底下走回来；走过的一段是蓝的，笔尖带一个点
    const pf = this.pathF.map(p => S3.proj(this.cam, p)), pb = this.pathB.map(p => S3.proj(this.cam, p));
    DR.pen(g, pf, 1, { color: LK.ink3, w: 1, dash: [7, 6] });
    DR.pen(g, pb, 1, { color: LK.ink3, w: 1, dash: [7, 6] });
    const tip = DR.pen(g, fwd ? pf : pb, k, { color: LK.blue, w: 2.4 });
    for (let i = 0; i < (fwd ? pf : pb).length - 1; i++) {
      if (i / (pf.length - 1) > k) break;
      const a = (fwd ? pf : pb)[i], b = (fwd ? pf : pb)[i + 1];
      DR.arrow(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(b[1] - a[1], b[0] - a[0]), 11, LK.a(LK.blue, 0.85));
    }
    if (tip) { g.beginPath(); g.arc(tip[0], tip[1], 5.6, 0, TAU); g.fillStyle = LK.blue; g.fill(); }

    // 工程图的家具：层数 / 层距（左）、剖切符号（上）
    const tl = S3.proj(this.cam, [-2.11, 1.1, 0.75]), bl = S3.proj(this.cam, [-2.11, -1.1, 0.75]);
    DR.dim(g, [tl[0] - 78, tl[1] - 26], [bl[0] - 78, bl[1] + 26], 0, { text: '5 LAYERS — PITCH 0.95', size: 15, color: LK.ink2, ext: false });
    for (let i = 0; i < this.n; i++) {
      const p = S3.proj(this.cam, [(i - 2) * this.d, 1.1, 0.75]);
      DR.micro(g, 'L' + (i + 1), p[0], p[1] - 22, { size: 12, color: LK.ink2, align: 'center' });
    }
    DR.leader(g, pf[0][0] + 8, pf[0][1] - 8, -110, -78, fwd ? 'FORWARD PASS' : 'BACKWARD PASS', { draw: LK.in(f, 0.7), size: 14, color: LK.blue });

    const cur = TY.current(f, f.from);
    const size = this.fit(g, cur ? cur.line.text : '', 132, 1500);
    TY.line(g, f, {
      reg: 'plate', pos: 'lower', x: 960, y: 850, size: size, since: f.from,
      label: 'ROUND TRIP \u00d7' + trips + '  \u2014  FORWARD / BACKWARD',
    });
    return { grain: 0.03, vignette: 0 };
  },
});
