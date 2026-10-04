// file — 2:23.9–2:29.3（尾奏）。图纸被画完、被盖章、被收走。
// HERO：一张完成的图纸（总成 + 标题栏，占 ~42%）。字区：左边空白（这一段没有歌词，只有图纸自己的字）。
MV.scene('file', {
  init() {
    this.cell = PART.cellParts({ R: 1 });
    this.iris = PART.irisParts(12, { ro: 1, ri: 0.09, thick: 0.045, rn: 96 });
    this.cam = { yaw: 0.58, pitch: 0.36, zoom: 214, cx: 1180, cy: 500, persp: 0 };
  },
  render(g, f) {
    const lt = f.lt, dur = f.dur;
    // 最后 2.2 s：整张图纸被收走（向下抽走，像被抽屉收进去）
    const pull = clamp((lt - (dur - 2.2)) / 2.0);
    g.save();
    g.translate(0, ease.inCubic(pull) * (H + 80));
    DR.paper(g);
    const cam = this.cam;
    const K = clamp(lt / 1.6);                                     // 总成在规定时间里"验收完"
    // 总成：实体图 + 隐藏虚线
    const items = [];
    for (let i = 0; i < this.iris.n; i++) items.push({ mesh: this.iris.blades[i], model: PART.irisModel(this.iris, i, 0.12) });
    items.push({ mesh: this.iris.ring }, { mesh: this.cell.frame });
    for (const r of this.cell.rings) items.push({ mesh: r });
    items.push({ mesh: this.cell.core });
    for (const p of this.cell.pins) items.push({ mesh: p });
    S3.drawAll(g, items, { cam: cam, edgeW: 1.3, hiddenW: 0.62, hiddenCol: LK.ink3 });
    // 一块被剖开的说明：总成外面套一个剖面符号
    DR.center(g, cam.cx, cam.cy, 330, { color: LK.ink3, w: 0.7 });
    DR.sectionMark(g, [cam.cx - 420, cam.cy - 300], [cam.cx - 420, cam.cy + 300], 'A');
    DR.dim(g, [cam.cx - 300, cam.cy + 336], [cam.cx + 300, cam.cy + 336], 0, { text: '600 \u00b10.01', size: 15, ext: false });
    DR.dim(g, [cam.cx + 336, cam.cy - 300], [cam.cx + 336, cam.cy + 300], 0, { text: '600', size: 15, ext: false });
    DR.leader(g, cam.cx + 230, cam.cy - 210, 160, -120, 'CELL-01 / ' + (12) + ' BLADES', { draw: LK.in(f, 0.8), size: 15 });
    DR.leader(g, cam.cx - 250, cam.cy + 250, -180, 150, 'ASSEMBLY COMPLETE', { draw: LK.in(f, 1.0), size: 15, color: LK.blue });
    // 装配步骤清单（细节：一张真的图纸旁边都有 BOM / 步骤表）
    const bx = 150, by = 300;
    DR.micro(g, 'ASSEMBLY SEQUENCE', bx, by - 22, { size: 14, color: LK.ink });
    const T = DR.table(g, bx, by, 3, 8, { cw: [236, 96, 108], rh: 30, color: LK.ink2 });
    const steps = ['01 FRAME', '02 GIMBAL A', '03 GIMBAL B', '04 GIMBAL C', '05 CORE', '06 BLADE x12', '07 ELECTRODE x6', '08 CLOSE'];
    steps.forEach((s, i) => {
      const on = K > i / 8;
      DR.cell(g, T, 0, i, s, { size: 13, color: on ? LK.ink : LK.ink3 });
      DR.cell(g, T, 1, i, on ? 'DONE' : 'WAIT', { size: 12, color: on ? LK.ink2 : LK.ink3 });
      DR.cell(g, T, 2, i, on ? 'OK' : '--', { size: 13, color: on ? LK.blue : LK.ink3 });
    });
    // 盖章：FILED
    if (lt > dur * 0.45) {
      const st = ease.outBack(clamp((lt - dur * 0.45) / 0.4));
      g.save(); g.globalAlpha = clamp(st);
      DR.stamp(g, 'FILED', 1560, 268, { size: 62, rot: -0.22, color: LK.blue, sub: 'BOLT.PLOTTER', w: 5 });
      g.restore();
    }
    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01'], ['scale', '1:1'], ['sheets', '42 / 42'], ['drawn', 'BOLT.PLOTTER']],
      title: 'AGI \u00b7 BOLT', titleSub: 'FINAL ASSEMBLY — COMPLETE SET', rev: 'REV C',
    });
    DR.foldLine(g, 640, 70, 1010);
    g.restore();
    // 被抽走时上面压一条暗边，像抽屉口
    if (pull > 0) { g.save(); g.fillStyle = LK.a(LK.ink, 0.85 * clamp(pull * 1.4)); g.fillRect(0, 0, W, 60); g.restore(); }
    return { grain: 0.03, vignette: 0 };
  },
});
