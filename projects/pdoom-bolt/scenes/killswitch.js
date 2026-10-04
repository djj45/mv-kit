// killswitch — 98.43–100.24（PLATE）。"Killswitch guy's on PTO"。
// HERO：一把巨大的闸把（把身 373→190 px 宽、847 px 长，加上蓝色的握把滚子、轮毂、底座和挂在把上的牌子，
// 占画面 ≥45%）——它是工程图的实体：S3 挤出的箱体 / 圆柱，轴测投影、按面法线分 5 档平色，
// 底座正面打 45° 剖面线，被挡住的棱用虚线。握把是全片唯一彩色的主角零件。
// 全片唯一的笑点：每个 kick 上被拉一下（约 3.5°，被止块顶住），有位移、有回弹；把上的 PTO 牌子跟着晃。
// 字用等宽字（TY.T 的 dimension treatment），排在左下那块空处。
MV.scene('killswitch', {
  init() {
    const ARM = 3.62;                        // 把长（世界单位）
    this.ARM = ARM;
    // 把身：根部厚、头上细（挤出的钢把）
    this.LEVER = PART.extrude([[-0.34, -0.98], [ARM, -0.50], [ARM, 0.50], [-0.34, 0.98]], 0.68);
    // 握把：头上那根滚子（胶囊截面挤出的圆柱；母线太密，所以只描外轮廓）
    const cap = [];
    for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + Math.PI * i / 16; cap.push([0.22 + Math.cos(a) * 0.46, Math.sin(a) * 0.46]); }
    for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 + Math.PI * i / 16; cap.push([-0.22 + Math.cos(a) * 0.46, Math.sin(a) * 0.46]); }
    this.GRIP_POLY = cap.map(p => [p[0] + ARM - 0.12, p[1]]);
    this.GRIP = PART.extrude(this.GRIP_POLY, 1.40);
    // 轮毂：支点上的一只厚圆盘
    const disc = [];
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; disc.push([Math.cos(a) * 1.06, Math.sin(a) * 1.06]); }
    this.HUB_POLY = disc;
    this.HUB = PART.extrude(disc, 0.80);
    // 底座：支点后面那块（正面打剖面线）
    this.BASE = S3.box(3.4, 2.8, 1.6);
    this.BASE_AT = [0.12, -1.16, -0.18];
    this.A0 = 1.8717;                        // 停住的角度（把尖朝左上）
    // ── 相机：解出来让支点落在 (1080, 1010)、把尖落在 (830, 200)
    const c0 = { yaw: 0.42, pitch: 0.30, zoom: 1, cx: 0, cy: 0 };
    const q0 = S3.proj(c0, [0, 0, 0]);
    const q1 = S3.proj(c0, [Math.cos(this.A0) * ARM, Math.sin(this.A0) * ARM, 0]);
    const want = [838 - 1080, 266 - 1010];
    const zoom = Math.hypot(want[0], want[1]) / Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
    this.cam = { yaw: 0.42, pitch: 0.30, zoom: zoom, cx: 1080 - zoom * q0[0], cy: 1010 - zoom * q0[1] };
    this.PIV = [1080, 1010];
    // 和 solid.js 同一套打光（LIGHT = (-0.42,0.66,0.62)）：按面法线分 5 档平色；
    // 大件再往 LK.deep 混一档（纸白底上 LK.tone 最暗也只有 #8798CE，立不住）
    this.steel = (vn, k) => LK.mix(this.shade(vn, k), LK.deep, 0.46);
    this.shade = (vn, k) => {
      const d = vn[0] * -0.42 + vn[1] * 0.66 + vn[2] * 0.62;
      const t = clamp(0.5 + 0.5 * d + (k || 0), 0, 0.999);
      return LK.tone[Math.min(LK.tone.length - 1, Math.floor((1 - t) * LK.tone.length))];
    };
    // kick（98.885 / 99.34 / 99.79 / 100.245）相对本镜起点
    this.BEATS = [0.455, 0.909, 1.364, 1.818];
  },

  /** 世界点 → 屏幕（把 2D 的东西钉在 3D 的闸把上）。 */
  pin(model, p) {
    const M = S3.modelM(model);
    return S3.proj(this.cam, S3.applyM(M, p));
  },

  /** 把一段局部折线投影到屏幕上描边（圆柱这类母线太密的零件只画外轮廓）。 */
  outline(g, model, poly, z, o) {
    g.save();
    g.beginPath();
    poly.forEach((p, i) => {
      const q = this.pin(model, [p[0], p[1], z]);
      i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
    });
    g.closePath();
    g.strokeStyle = (o && o.color) || LK.ink; g.lineWidth = (o && o.w) || 2.4;
    g.lineJoin = 'round'; g.stroke();
    g.restore();
  },

  render(g, f) {
    DR.paper(g);
    const cam = this.cam, PIV = this.PIV;

    // ── kick 上被拉一下，但拉不动（位移 + 回弹）
    let tug = 0, lag = 0;
    for (const t0 of this.BEATS) {
      const dt = f.lt - t0;
      if (dt > 0) { tug += Math.exp(-dt * 5.2) * Math.sin(dt * 16.5); lag += Math.exp(-dt * 2.6) * Math.sin(dt * 9.5); }
    }
    const pull = Math.max(0, tug) * 0.062;                 // 最多 3.5°
    const ang = this.A0 + pull;
    const lever = { rot: [0, 0, ang] };

    // ── 行程槽（虚线）+ 止块：这就是"拉不动"的原因（都在 3D 里量出来）
    g.save();
    g.strokeStyle = LK.a(LK.ink3, 0.9); g.lineWidth = 1.4; g.setLineDash([11, 8]);
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = this.A0 - 0.62 + 0.62 * i / 24;
      const p = S3.proj(cam, [Math.cos(a) * 2.15, Math.sin(a) * 2.15, 0.05]);
      i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
    }
    g.stroke(); g.setLineDash([]);
    g.restore();
    // 止块：把再走 3.5° 就顶在这儿
    const sa = this.A0 + 0.115;
    const sp = S3.proj(cam, [Math.cos(sa) * 1.72, Math.sin(sa) * 1.72, 0.28]);
    const s2 = S3.proj(cam, [Math.cos(sa) * 2.16, Math.sin(sa) * 2.16, 0.28]);
    const sang = Math.atan2(s2[1] - sp[1], s2[0] - sp[0]);
    g.save();
    g.translate(sp[0], sp[1]); g.rotate(sang);
    g.fillStyle = LK.tone[3]; g.fillRect(-16, -52, 82, 104);
    g.strokeStyle = LK.ink; g.lineWidth = 2.0; g.strokeRect(-16, -52, 82, 104);
    g.restore();
    DR.hatch(g, gg => { gg.save(); gg.translate(sp[0], sp[1]); gg.rotate(sang); gg.rect(-16, -52, 82, 104); gg.restore(); },
             { gap: 13, color: LK.hatch, w: 1 });
    DR.micro(g, 'STOP', sp[0] + 40, sp[1] - 70, { size: 15, color: LK.ink });

    // ── 闸把（实体）：底座 + 轮毂 + 钢把 + 蓝色滚子
    S3.drawAll(g, [
      { mesh: this.BASE, model: { pos: this.BASE_AT }, hidden: false,
        hatch: fc => S3.faceNormal(this.BASE.V, fc.i)[2] > 0.5, edgeW: 2.4,
        tone: (fc, fi, vn) => this.steel(vn, -0.10) },
      { mesh: this.HUB, model: lever, hidden: false, edges: false,
        tone: (fc, fi, vn) => this.steel(vn, -0.22) },
      { mesh: this.LEVER, model: lever, edgeW: 2.8, hidden: false,
        tone: (fc, fi, vn) => this.steel(vn, -0.06) },
      { mesh: this.GRIP, model: lever, hidden: false, edges: false,
        tone: (fc, fi, vn) => {
          const d = Math.max(0, vn[0] * -0.32 + vn[1] * 0.78 + vn[2] * 0.54);
          return LK.mix(LK.blue, LK.deep, 0.20 + clamp(1 - d, 0, 1) * 0.7); // 握把 = 唯一的彩色
        } },
    ], { cam: cam, edgeW: 2.2, hiddenW: 1.0, hiddenCol: LK.ink3, hatchOpt: { gap: 15, color: LK.hatch, width: 1.2 } });
    // 滚子 / 轮毂的外轮廓（自己描，免得圆柱的每条母线都画出来）
    this.outline(g, lever, this.GRIP_POLY, 0.70, { w: 2.6 });
    this.outline(g, lever, this.GRIP_POLY, -0.70, { w: 1.0, color: LK.ink2 });
    this.outline(g, lever, this.HUB_POLY, 0.40, { w: 2.2 });

    // ── 支点的中心线 + 把身上的两个读点
    DR.center(g, PIV[0], PIV[1], 330, { color: LK.a(LK.ink3, 0.8), w: 0.8 });
    const hp = this.pin(lever, [this.ARM - 0.12, 0.42, 0.62]);
    const lp = this.pin(lever, [1.3, 0, 0.37]);

    // ── 挂在握把上的 PTO 牌子（kick 上晃）
    const hook = this.pin(lever, [this.ARM - 0.16, 0.32, 0.66]);
    const sw = lag * 0.18;
    g.save();
    g.translate(hook[0], hook[1]); g.rotate(sw);
    DR.line(g, 0, 0, 424, 68, { color: LK.ink, w: 1.6 });
    DR.line(g, 0, 0, 826, 68, { color: LK.ink, w: 1.6 });
    g.save();
    g.translate(320, 40);
    g.fillStyle = LK.paper2; g.fillRect(0, 0, 610, 460);
    g.strokeStyle = LK.ink; g.lineWidth = 3.0; g.strokeRect(0, 0, 610, 460);
    g.lineWidth = 1.0; g.strokeRect(14, 14, 582, 432);
    DR.display(g, 'PTO', 305, 258, { size: 210, color: LK.ink, align: 'center' });
    DR.micro(g, 'GUY \u2014 ON LEAVE', 305, 330, { size: 28, color: LK.ink, align: 'center', track: 0.12 });
    DR.micro(g, 'UNTIL FURTHER NOTICE  \\  NOBODY AT THE SWITCH', 305, 376, { size: 16, color: LK.ink2, align: 'center' });
    g.beginPath(); g.arc(104, 28, 13, 0, TAU); g.fillStyle = LK.paper; g.fill();
    g.strokeStyle = LK.ink; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(506, 28, 13, 0, TAU); g.fillStyle = LK.paper; g.fill(); g.stroke();
    g.restore();
    g.restore();

    // ── 引线 / 读数（都贴着闸把）
    DR.leader(g, lp[0], lp[1], -250, -215, 'LEVER \u2014 847 mm, PULLED 4 TIMES', { draw: LK.in(f, 0.5), size: 15, color: LK.ink, run: -40 });
    DR.leader(g, hp[0], hp[1], 120, -180, 'HANDLE \u2014 TAG HANGS HERE', { draw: LK.in(f, 0.9), size: 15, color: LK.ink2, run: 40 });
    DR.micro(g, 'EMERGENCY STOP \u2014 CELL-01', 150, 132, { size: 16, color: LK.ink });
    DR.micro(g, 'TRAVEL 40\u00b0   ACTUAL ' + (pull * 180 / Math.PI).toFixed(1) + '\u00b0   STROKE 0.04', 150, 160,
             { size: 15, color: LK.ink2 });
    DR.micro(g, 'SHEET 27 / 42', 1846, 132, { size: 14, color: LK.ink2, align: 'right' });

    // ── 字：等宽（TY.T 的 dimension treatment），左下那块空处
    TY.line(g, f, { reg: 'plate', since: 98.6, x: 1824, y: 300, size: 50, align: 'right', font: 'mono', track: 0.02, label: 'STROKE 0.04' });
    return { grain: 0.03, vignette: 0 };
  },
});
