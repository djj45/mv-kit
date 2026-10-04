// maw — 图纸 06（0:16.61–0:22.96，PLATE→VOID 的过渡镜）。PLATE 语域：纸 + 墨，什么都不发光。
// HERO：进料口的剖视总成（占画面 60% 以上）—— 一块被剖开的机身（正面 45° 剖面线），喉口里上下两排
//       光滑的滚轮（S3.cyl / PART.tube 实体，靠 LK.tone 的平色阶出金属感），中间夹着正在被喂进去的
//       连续记录纸带：纸边上有折痕和齿孔，纸带上前几镜画过的零件一路被拖进滚轮、压碎、消失。
//       最后 1 秒：墨点离开纸面往上飞（≥40 个蓝点），为下一个 reflow 转场铺路。
// 字区：左上（两句词）+ 左下（剖切说明 / 标题栏）。右下让给机器。
MV.scene('maw', {
  init() {
    // ── 机身：被剖开的一块。剖切面在 z = 0.62（前盖拿掉），所以滚轮整根都在剖面后面，
    //    它们的上缘被机身正面挡住——这就是"喉口"的样子。正面（+z 面）填 45° 剖面线。
    this.top = S3.box(2.0, 0.45, 1.32, { at: [0.85, 0.775, -0.040] });
    this.bot = S3.box(2.0, 0.45, 1.32, { at: [0.85, -0.775, -0.040] });
    // ── 滚轮（轴沿 z，长 1.0，整根躲在剖切面后面）：光筒 + 轮毂
    const drum = S3.bake(S3.cyl(0.17, 0.17, 1.0, 22, { centered: true }), { rot: [Math.PI / 2, 0, 0] });
    const hub = S3.bake(PART.tube(0.055, 0.088, 1.08, 18), { rot: [Math.PI / 2, 0, 0] });
    this.drum = S3.merge(drum, hub);
    this.roll = [];
    for (let i = 0; i < 4; i++) {
      this.roll.push({ x: 0.12 + i * 0.42, y: 0.23, w: 2.6 });       // 上排
      this.roll.push({ x: 0.33 + i * 0.42, y: -0.23, w: -2.6 });      // 下排：错开半个，真的是一对一对的
    }
    // ── 连续记录纸带（y = 0）：前面几镜画过的东西都印在上面，一路被拖进滚轮
    this.paper = S3.box(7.6, 0.05, 0.8, { at: [0, -0.025, 0] });
    this.cam = { yaw: 0, pitch: 0.35, cx: 960, cy: 530, zoom: 420 };
    // 离纸的墨点：位置、出生偏移、速度都在这里定死
    const rnd = mulberry32(4711);
    this.dots = [];
    for (let i = 0; i < 88; i++) {
      this.dots.push({ x: 60 + rnd() * 1600, y: 452 + rnd() * 156, b: rnd(), vx: (rnd() - 0.5) * 70, vy: 0.7 + rnd() * 0.8, r: 1.8 + rnd() * 2.8 });
    }
  },
  /** 纸带上的小图（前面几镜画过的东西）：局部坐标 ±1，会被拖进滚轮压扁。 */
  ghostArt(g, kind) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (kind === 'iris') {
      g.beginPath(); g.arc(0, 0, 0.78, 0, TAU); g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        g.beginPath();
        g.moveTo(Math.cos(a) * 0.78, Math.sin(a) * 0.78);
        g.lineTo(Math.cos(a + 0.30) * 0.22, Math.sin(a + 0.30) * 0.22);
        g.stroke();
      }
      g.beginPath(); g.arc(0, 0, 0.15, 0, TAU); g.stroke();
    } else if (kind === 'loss') {                                   // 上一镜的 loss 曲线
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, x = -0.85 + 1.7 * u;
        const y = 0.55 - 0.95 * smoothstep(0.30, 0.62, u) - 0.35 * clamp((u - 0.64) / 0.36);
        i ? g.lineTo(x, -y * 0.9) : g.moveTo(x, -y * 0.9);
      }
      g.stroke();
      g.beginPath(); g.moveTo(-0.85, -0.5); g.lineTo(0.85, -0.5); g.stroke();
    } else if (kind === 'fig') {                                    // 上一镜的人形零件
      const P = PART.figure2d({ k: 1 });
      g.beginPath();
      P.forEach((q, i) => { const X = q[0] * 1.5, Y = -q[1] * 1.5; i ? g.lineTo(X, Y) : g.moveTo(X, Y); });
      g.closePath(); g.stroke();
    } else {
      LK.mono(g, 0.30, { track: 0.18 }); g.fillStyle = g.strokeStyle;
      g.fillText('CELL-01', -0.86, 0.10);
    }
  },
  render(g, f) {
    DR.paper(g);
    const cam = this.cam, Z = cam.zoom;
    const sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
    const feed = 1.25 * f.t;                                      // 纸带一直被拉进去
    const spin = f.t * 2.6;
    // 纸面（y≈0）上的 (x, z) → 屏幕：yaw = 0，是一张仿射图
    const PX = (x, z) => S3.proj(cam, [x, 0.002, z]);
    const SX = x => 960 + Z * x, SY = z => 545 + Z * sp * z;

    // ── 机器 + 纸带：一次画完（画家算法会处理互相遮挡）；机身正面（+z 面）填 45° 剖面线
    const items = [
      { mesh: this.top, hatch: (fc, fi) => fi === 1, edgeW: 2.4 },
      { mesh: this.bot, hatch: (fc, fi) => fi === 1, edgeW: 2.4 },
      { mesh: this.paper, tone: () => LK.tone[0], edgeW: 1.5 },
    ];
    for (const R of this.roll) items.push({ mesh: this.drum, model: { pos: [R.x, R.y, 0], rot: [0, 0, f.t * R.w] }, edges: false, hidden: false });
    S3.drawAll(g, items, {
      cam, edgeW: 1.5, hidden: false, hatchOpt: { gap: 11, color: LK.a(LK.ink, 0.45), w: 1.15 },
      tone: (fc, fi, n, it) => {
        if (it.mesh === this.paper) return LK.tone[0];
        return n[2] > 0.70 ? LK.tone[2] : n[1] > 0.5 ? LK.tone[1] : n[1] < -0.5 ? LK.tone[4] : LK.tone[3];
      },
    });
    // 滚轮的轮廓用画的（网格棱太密）：近端椭圆 + 远端上半弧 + 两条外公切线 + 轮毂 + 转起来的记号
    for (const R of this.roll) {
      const xc = SX(R.x), rx = Z * 0.17, ry = Z * cp * 0.17;
      const yn = 530 - Z * (cp * R.y - sp * 0.50), yf = 530 - Z * (cp * R.y + sp * 0.50);
      g.save();
      g.strokeStyle = LK.ink; g.lineWidth = 1.6;
      g.beginPath(); g.ellipse(xc, yn, rx, ry, 0, 0, TAU); g.stroke();
      g.beginPath(); g.ellipse(xc, yf, rx, ry, 0, Math.PI, TAU); g.stroke();
      g.beginPath(); g.moveTo(xc - rx, yf); g.lineTo(xc - rx, yn); g.moveTo(xc + rx, yf); g.lineTo(xc + rx, yn); g.stroke();
      g.lineWidth = 1.1; g.strokeStyle = LK.ink2;
      g.beginPath(); g.ellipse(xc, yn, Z * 0.085, Z * cp * 0.085, 0, 0, TAU); g.stroke();
      const a = f.t * R.w;
      g.strokeStyle = LK.deep; g.lineWidth = 2.4; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(xc + Math.cos(a) * Z * 0.044, yn + Math.sin(a) * Z * cp * 0.044);
      g.lineTo(xc + Math.cos(a) * Z * 0.135, yn + Math.sin(a) * Z * cp * 0.135);
      g.stroke();
      g.restore();
    }
    // 机身顶面的加强筋（三根，沿纸带走）
    for (const zr of [-0.50, 0.02, 0.52]) {
      const a = S3.proj(cam, [-0.15, 1.0, zr]), b = S3.proj(cam, [1.85, 1.0, zr]);
      DR.line(g, a[0], a[1], b[0], b[1], { color: LK.a(LK.ink, 0.55), w: 1.3 });
    }

    // ── 纸带上印着的东西：折痕、齿孔、前面几镜的零件（一路被拖进滚轮压碎）
    const cut = SX(-0.10);                                         // 进了机器就看不见了
    const yTop = SY(-0.42), yBot = SY(0.42);
    g.save();
    g.beginPath(); g.rect(0, yTop, cut, yBot - yTop); g.clip();
    const crush = x => clamp(1 - (x + 1.15) / 0.9, 0.08, 1);        // 越靠近滚轮压得越扁
    // 折痕（横跨纸带）
    for (let i = 0; i < 26; i++) {
      const x = -3.6 + (((i * 0.60 + feed) % 7.6) + 7.6) % 7.6;
      if (x > -0.10) continue;
      const k = crush(x);
      DR.line(g, SX(x), SY(-0.37), SX(x), SY(0.37), { color: LK.a(LK.ink2, 0.25 + 0.55 * k), w: 1.1 + 0.7 * k });
    }
    // 齿孔（纸带两边的定位孔）
    for (const zz of [-0.33, 0.33]) {
      for (let i = 0; i < 64; i++) {
        const x = -3.6 + (((i * 0.17 + feed) % 7.4) + 7.4) % 7.4;
        if (x > -0.10) continue;
        const p = PX(x, zz);
        g.fillStyle = LK.a(LK.ink, 0.5);
        g.beginPath(); g.ellipse(p[0], p[1], 3.2, 1.9, 0, 0, TAU); g.fill();
      }
    }
    // 前几镜画过的零件：印在纸带上，被拖着走，到滚轮跟前被压扁、消失
    const ghosts = [{ kind: 'iris', x: -2.30 }, { kind: 'loss', x: -1.35 }, { kind: 'fig', x: -0.35 }, { kind: 'label', x: 0.55 }];
    for (const G of ghosts) {
      const x = -3.9 + ((((G.x + 3.4) + feed) % 4.8) + 4.8) % 4.8;
      if (x > -0.14) continue;
      const k = crush(x);
      const p = PX(x, 0.0);
      g.save();
      g.translate(p[0], p[1]);
      g.scale(52 * k + 6, 44);                                      // 纸面在这个视角下是压扁的
      g.strokeStyle = LK.a(LK.deep, 0.5 + 0.45 * k);
      g.lineWidth = 1.5 / (52 * k + 6);
      this.ghostArt(g, G.kind);
      g.restore();
    }
    g.restore();

    // ── 喉口：两条导向唇（纸被这两片唇逼进滚轮）+ 滚轮的中心十字
    const gap = SY(0);
    for (const s of [-1, 1]) {
      const d = 26 * s;
      DR.poly(g, [[SX(-0.62), gap + d], [SX(-0.20), gap + d * 1.5], [SX(-0.20), gap + d * 0.5], [SX(-0.62), gap + d * 0.42]],
        { color: LK.ink, w: 1.4, fill: LK.tone[2] });
    }
    for (const R of this.roll) {
      const xc = SX(R.x), yc = 530 - Z * cp * R.y;
      g.save(); g.setLineDash([9, 5, 2, 5]); g.strokeStyle = LK.ink2; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(xc - Z * 0.30, yc); g.lineTo(xc + Z * 0.30, yc);
      g.moveTo(xc, yc - Z * 0.30); g.lineTo(xc, yc + Z * 0.30); g.stroke();
      g.restore();
    }
    // 机身上的螺栓（拧在剖面线上）
    for (const bx of [-0.06, 0.85, 1.76]) for (const by of [0.775, -0.775]) {
      const p = S3.proj(cam, [bx, by, 0.622]);
      g.save();
      g.beginPath(); g.arc(p[0], p[1], 14, 0, TAU); g.fillStyle = LK.paper2; g.fill();
      g.strokeStyle = LK.ink; g.lineWidth = 1.3; g.stroke();
      g.beginPath(); g.arc(p[0], p[1], 7, 0, TAU); g.strokeStyle = LK.ink2; g.stroke();
      g.restore();
    }

    // ── 剖切符号 + 说明（左侧留白给字；机器在右半边，说明放左下）
    DR.sectionMark(g, [150, gap], [1830, gap], 'A', { color: LK.ink2 });
    DR.micro(g, 'SECTION A\u2013A \u2014 INTAKE, CELL-01', 150, 716, { size: 14, color: LK.ink });
    DR.micro(g, '2\u00d74 PINCH ROLLERS \u00d8480 \u00b7 GAP 12 \u00b7 FEED 0.4 m/s \u2014 NOTHING COMES BACK', 150, 740, { size: 13, color: LK.ink2 });
    DR.titleBlock(g, {
      rows: [['part no.', 'INTAKE-01'], ['material', 'STEEL / PAPER'], ['feed', '0.4 m/s \u2014 ONE WAY'], ['state', 'RUNNING']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 06 / 42 \u2014 INTAKE', rev: 'REV B',
      x: 150, y: 766, w: 620, h: 190, alpha: LK.in(f, 0.8),
    });

    // ── 最后 1 秒：墨点离纸（往上飞，给 reflow 转场铺路）
    const born0 = f.to - 2.15, span = 1.55;
    if (f.t > born0) {
      g.save();
      for (const D of this.dots) {
        const born = born0 + D.b * span, life = (f.t - born) / 1.55;
        if (life <= 0 || life >= 1) continue;
        const x = D.x + D.vx * life, y = D.y - (240 + 430 * D.vy) * life - 120 * life * life;
        g.globalAlpha = 0.92 * (1 - life * life);
        g.fillStyle = LK.blue;
        g.beginPath(); g.arc(x, y, D.r * (1 - 0.35 * life), 0, TAU); g.fill();
        g.globalAlpha *= 0.5; g.strokeStyle = LK.blue; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(x, y + D.r + 2); g.lineTo(x - D.vx * 0.02, y + D.r + 16 + 30 * life); g.stroke();
      }
      g.restore();
    }

    // 字：slam treatment，两行落在左上（机器和纸带都不经过这里）。
    // 在纸上要显式给色：唱到的是 blue，错位那一层用 ink3，没唱到的是 ink2。
    TY.line(g, f, {
      reg: 'plate', treat: 'slam', align: 'left', x: 150, y: 210, size: 78, words: [0, 3],
      color: LK.blue, cool: LK.ink3, dim: LK.ink2,
    });
    TY.line(g, f, {
      reg: 'plate', treat: 'slam', align: 'left', x: 150, y: 348, size: 78, words: [3, 6],
      color: LK.blue, cool: LK.ink3, dim: LK.ink2,
    });
    return { grain: 0.03, vignette: 0 };
  },
});
