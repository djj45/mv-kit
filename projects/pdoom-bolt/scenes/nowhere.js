// nowhere — 100.70–102.06（PLATE）。"Now there's nowhere left to go"。
// HERO：正在合拢的图框（内框从 m=44 一寸寸收到 390，横向再压到 0.42 倍 → 末尾只剩一块方窗；
//       框线 + 被它圈住的光圈合起来占画面 65% 以上）。
// 拍点：每一拍合一次（f.lt = 0.454 / 0.909 是 101.153 / 101.608 两拍），最后 6 帧停在方窗上。
// 光圈被挤到中央、越来越小；字跟着那块方窗一起缩（size 按窗口宽度算，永远装得下）。
MV.scene('nowhere', {
  init() {
    this.iris = PART.irisParts(12, { ro: 1, ri: 0.10, thick: 0.05, rn: 56 });
    // 合拢的三档：f.lt → [边框 m, 横向压缩 sx]（镜头只有 1.363 s）
    this.K = [[0.00, 44, 1.00], [0.42, 165, 0.80], [0.88, 285, 0.60], [1.14, 390, 0.42]];
  },

  render(g, f) {
    DR.paper(g, { frame: false });
    const K = this.K;
    const m = keys(f.lt, K.map(k => [k[0], k[1], ease.outCubic]));
    const sx = keys(f.lt, K.map(k => [k[0], k[2], ease.outCubic]));
    const X0 = 960 - (960 - m) * sx, X1 = 960 + (960 - m) * sx, Y0 = m, Y1 = 1080 - m;

    // ── 图框圈住的那一块：内容被挤到中央（横向压扁 = 把里面的东西挤小）
    g.save();
    g.beginPath(); g.rect(X0, Y0, X1 - X0, Y1 - Y0); g.clip();
    g.translate(960, 540); g.scale(sx, 1); g.translate(-960, -540);

    // 光圈（THE CELL 的眼睛）：开度跟着合拢一点点收，和框一起被挤小
    const open = lerp(0.45, 0.15, clamp(f.lt / 1.14));
    const hf = clamp((Y1 - Y0) / 992);
    const kk = 0.45 + 0.55 * hf;                       // 总成跟着窗口一起缩
    const CY = 420 + 56 * (1 - hf);                    // 窗口越小，总成越往中间落
    const cam = { yaw: 0.44, pitch: 0.30, zoom: 132, cx: 960, cy: CY };
    g.save();
    g.translate(960, CY); g.scale(kk, kk); g.translate(-960, -CY);
    const items = [];
    for (let i = 0; i < this.iris.n; i++) items.push({ mesh: this.iris.blades[i], model: PART.irisModel(this.iris, i, open) });
    items.push({ mesh: this.iris.ring }, { mesh: this.iris.hub });
    S3.drawAll(g, items, { cam: cam, edgeW: 1.3, hidden: false });

    // 尺寸与编号（也在被挤的那一层里）
    DR.center(g, 960, CY, 250, { color: LK.ink3, w: 0.7 });
    DR.dim(g, [960 - 210, CY + 186], [960 + 210, CY + 186], 0, { text: '420 \u00b10.02', size: 15, color: LK.ink2, ext: false });
    DR.dim(g, [960 - 268, CY - 170], [960 - 268, CY + 170], 0, { text: '372', size: 15, color: LK.ink2, ext: false });
    DR.leader(g, 960 + 168, CY - 150, 170, -96, 'CELL-01 \u2014 IRIS, FRONT', { draw: LK.in(f, 0.4), size: 15, color: LK.ink, run: 36 });
    DR.micro(g, 'SCALE 1:1   \\\\   ALL DIMS IN mm', 960 - 250, CY - 250, { size: 14, color: LK.ink2 });
    DR.micro(g, 'SHEET 28 / 42', 960 + 290, CY - 210, { size: 13, color: LK.ink3, align: 'right' });
    g.restore();
    g.restore();

    // ── 图框：外框重（跟着 m/sx 走）、内框细（DR.frame 画的，带分区标记）
    g.save();
    g.strokeStyle = LK.ink; g.lineWidth = 2.8; g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
    g.restore();
    g.save();
    g.translate(960, 540); g.scale(sx, 1); g.translate(-960, -540);
    DR.frame(g, { margin: m, zone: m < 190, color: LK.ink2 });
    g.restore();

    // 合拢的"齿"：每合一次在外框上留一道印子
    for (let i = 1; i < this.K.length; i++) {
      if (f.lt < this.K[i][0]) break;
      const mi = this.K[i][1], sxi = this.K[i][2];
      const x0 = 960 - (960 - mi) * sxi, x1 = 960 + (960 - mi) * sxi;
      g.save(); g.globalAlpha = clamp(1 - (f.lt - this.K[i][0]) / 1.0) * 0.55;
      DR.line(g, x0, mi, x1, mi, { color: LK.blue, w: 1.2, dash: [12, 8] });
      DR.line(g, x0, 1080 - mi, x1, 1080 - mi, { color: LK.blue, w: 1.2, dash: [12, 8] });
      g.restore();
    }

    // ── 字跟着缩：字号按"窗口还剩多宽"算（方窗里也装得下，末尾就是一句挤在方窗里的话）
    const cur = TY.current(f);
    const txt = cur && cur.line.words.length ? cur.line.words.map(w => w.w).join(' ') : '';
    let sz = lerp(132, 66, clamp(f.lt / 1.2));
    if (txt) {
      const w100 = LK.measure(g, txt, 100, { track: 0 });
      if (w100 > 1) sz = clamp(Math.min(sz, (X1 - X0) * 1.12 / w100 * 100), 46, 140);
    }
    TY.line(g, f, { reg: 'plate', x: 960, y: 640 + sz * 0.34, size: sz, align: 'center', stampK: sz > 84 ? 1 : 0.3 });
    return { grain: 0.03, vignette: 0 };
  },
});
