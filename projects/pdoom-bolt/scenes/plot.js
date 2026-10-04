// plot — 图纸 01（0:00–0:05.7）。绘图仪在纸上画出一只 12 片光圈；第一句歌词是它"写"出来的。
// HERO：正在被画出来的光圈（占右 2/3，≥55%）。字区：左下 1/3（空着的图纸）。
// 拍点：每小节头画完一片叶片；第 1.41 s 第一句唱到时笔尖追上字。
MV.scene('plot', {
  init() {
    this.iris = PART.irisParts(12, { ro: 1, ri: 0.10, thick: 0.045, rn: 96 });
    this.cam = { yaw: 0.55, pitch: 0.40, zoom: 268, cx: 1290, cy: 500 };
    this.rail = 250;
  },
  render(g, f) {
    DR.paper(g);
    const t0 = f.from, dur = Math.min(4.4, f.dur - 0.4);
    const K = clamp((f.t - t0 - 0.25) / dur);                     // 整只光圈画到哪儿了
    const cam = Object.assign({}, this.cam, { cy: this.cam.cy - 14 * LK.in(f, 0.8) });
    const P = this.iris;

    // 笔架导轨 + 笔架（机器的细节）
    const railY = this.rail, px = 620 + 1450 * ease.inOutCubic(clamp(K * 1.06));
    DR.line(g, 380, railY, 1840, railY, { color: LK.ink, w: 2.2 });
    DR.line(g, 380, railY + 7, 1840, railY + 7, { color: LK.ink2, w: 0.8 });
    for (let i = 0; i <= 28; i++) DR.line(g, 380 + i * 52.1, railY, 380 + i * 52.1, railY + 7, { color: LK.ink3, w: 0.7 });
    g.save(); g.fillStyle = LK.ink; g.fillRect(px - 30, railY - 15, 60, 20);
    g.fillStyle = LK.blue; g.fillRect(px - 6, railY + 3, 12, 16); g.restore();
    DR.line(g, px, railY + 19, px, railY + 62, { color: LK.ink2, w: 1.1 });
    LK.focus(f, px, cam.cy - 30);                                      // 镜头跟着笔与它正在画的那只眼

    // 光圈：一片一片被画出来（笔迹长度 = 画到哪儿）
    for (let i = 0; i < P.n; i++) {
      const ki = clamp((K * (P.n + 2.2) - i) / 1.6);
      if (ki <= 0.001) continue;
      const model = PART.irisModel(P, i, 0.16 + 0.1 * LK.in(f, 1.2));
      if (ki < 0.999) {
        const M = S3.modelM(model), poly = P.blades[i].F[0].i.map(idx => S3.proj(cam, S3.applyM(M, P.blades[i].V[idx])));
        DR.pen(g, poly.concat([poly[0]]), ki, { color: LK.ink, w: 1.3 });
      } else {
        S3.drawAll(g, [{ mesh: P.blades[i], model: model }], { cam: cam, edgeW: 1.25, hiddenW: 0.6, hiddenCol: LK.ink3 });
      }
    }
    if (K > 0.72) S3.drawAll(g, [{ mesh: P.ring }, { mesh: P.hub }], { cam: cam, edgeW: 1.25, hiddenW: 0.6, hiddenCol: LK.ink3, alpha: clamp((K - 0.72) / 0.2) });

    // 家具：中心线 / 尺寸线 / 引线
    DR.center(g, cam.cx, cam.cy - 30, 300, { color: LK.ink3, w: 0.7 });
    if (K > 0.5) {
      DR.dim(g, [cam.cx - 330, cam.cy - 250], [cam.cx - 330, cam.cy + 250], 0, { text: '500 \u00b10.01', size: 15, ext: false });
      DR.leader(g, cam.cx + 250, cam.cy - 190, -250, -120, 'BLADE x12 / 0.4 mm SHEET', { draw: LK.in(f, 1.4), size: 15 });
    }
    DR.leader(g, cam.cx - 250, cam.cy + 250, -190, 120, 'CELL-01  OPEN ' + (16 + 10 * LK.in(f, 1.2)).toFixed(0) + '%', { draw: LK.in(f, 1.4), size: 15, color: LK.blue });   // 朝左引：朝右会印在标题栏的 DRAWN 行上

    // 落在叶片之间的小火花（"sparks of AGI in your eyes"）
    if (f.t > 1.4) {
      const sp = clamp((f.t - 1.4) / 0.6);
      for (let i = 0; i < 22; i++) {
        const a = hash(i, 3, 1) * TAU, r = 130 + hash(i, 3, 2) * 230;
        const x = cam.cx + Math.cos(a) * r, y = cam.cy - 30 + Math.sin(a) * r * 0.52;
        const life = (f.t * 0.7 + hash(i, 3, 4)) % 1;
        g.save(); g.globalAlpha = sp * (1 - life) * 0.9;
        g.strokeStyle = LK.blue; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i, 5, 1) - 0.5) * 26, y + (hash(i, 5, 2) - 0.5) * 26); g.stroke();
        g.restore();
      }
    }

    // 字：绘图仪把它写出来（treatment 'plot'）
    TY.line(g, f, { reg: 'plate', treat: 'plot', x: 150, y: 700, size: 132, align: 'left' });
    DR.micro(g, 'PLOTTER RUN 01 — GENERAL ARRANGEMENT — SCALE 1:1', 152, 566, { size: 14, color: LK.ink2 });
    DR.micro(g, 'TOOL 0.4 mm  ·  FEED ' + (f.t * 12).toFixed(0) + ' mm/s  ·  SHEET PET-01', 152, 762, { size: 13, color: LK.ink3 });
    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01'], ['material', 'DS-BLUE / NULL'], ['scale', '1:1'], ['drawn', 'BOLT.PLOTTER']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 01 / 42 — GENERAL ARRANGEMENT', rev: 'REV A',
      alpha: LK.in(f, 1.0),
    });
    return { grain: 0.03, vignette: 0 };
  },
});
