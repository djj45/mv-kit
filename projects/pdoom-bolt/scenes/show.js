// show — 2:16.6–2:23.9。光全灭，只剩图纸：VOID 落回 PLATE 的那一镜，最后一句歌词在这里。
// HERO：一台已经熄掉的机器（画成图纸上的空线框，占 ~48%）。字区：中部大片空白。
// 转场：timeline 里这一条带 wipe:'reflow'（光点落回纸上成墨）——所以开头 1.5 s 还有几粒光在往下掉。
MV.scene('show', {
  init() {
    this.cell = PART.cellParts({ R: 1 });
    this.iris = PART.irisParts(12, { ro: 1, ri: 0.09, thick: 0.045, rn: 72 });
    this.cam = { yaw: 0.52, pitch: 0.34, zoom: 176, cx: 1235, cy: 512, persp: 0 };
    this.motes = [];
    for (let i = 0; i < 90; i++) this.motes.push([hash(i, 11, 1), hash(i, 11, 2), hash(i, 11, 3)]);
  },
  render(g, f) {
    DR.paper(g);
    const k = clamp(f.lt / 2.6);                                  // 墨在"冷却"：从蓝退回墨
    const cool = LK.mix(LK.blue, LK.ink, ease.outCubic(k));
    const cam = Object.assign({}, this.cam, { cy: this.cam.cy - 26 * ease.outCubic(clamp(f.lt / 3)) });
    // 熄掉的机器：只有线框（wire 模式），一寸寸从蓝冷成墨
    const items = [];
    for (let i = 0; i < this.iris.n; i++) items.push({ mesh: this.iris.blades[i], model: PART.irisModel(this.iris, i, 0) });
    items.push({ mesh: this.iris.ring }, { mesh: this.cell.frame }, { mesh: this.cell.core });
    for (const r of this.cell.rings) items.push({ mesh: r });
    S3.drawAll(g, items, { cam: cam, mode: 'wire', edgeW: 1.15, hiddenW: 0.6, hiddenCol: LK.ink3, edge: cool });

    // 落下最后几粒光（reflow 的余韵）：位置是时间的函数
    const fall = clamp(1 - f.lt / 1.8);
    if (fall > 0.01) {
      for (let i = 0; i < this.motes.length; i++) {
        const m = this.motes[i], u = clamp((f.lt - m[2] * 1.2) / 1.1);
        if (u <= 0 || u >= 1) continue;
        const x = 420 + m[0] * 1400, y = -20 + u * (m[1] * 900 + 120);
        g.save(); g.globalAlpha = fall * (1 - u) * 0.9;
        g.fillStyle = i % 4 ? LK.blue : LK.hot;
        g.beginPath(); g.arc(x, y, 1.8 + m[2] * 2.4, 0, TAU); g.fill(); g.restore();
      }
    }

    // 家具：只剩"验收"的痕迹
    DR.center(g, cam.cx, cam.cy - 10, 300, { color: LK.ink3, w: 0.7 });
    DR.leader(g, cam.cx - 210, cam.cy + 190, -190, 150, 'COLD. NO CHARGE.', { draw: LK.in(f, 0.7), size: 15, color: LK.ink2 });
    DR.micro(g, 'SHEET 39 / 42 — POST-RUN INSPECTION', 152, 150, { size: 14, color: LK.ink2 });
    DR.micro(g, 'ALL READINGS ZERO', 152, 176, { size: 14, color: LK.ink3 });
    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01'], ['state', 'COLD / UNPOWERED'], ['run hours', '168.4'], ['drawn', 'BOLT.PLOTTER']],
      title: 'AGI \u00b7 BOLT', titleSub: 'POST-RUN — SHEET 39 / 42', rev: 'REV C',
    });
    // 最后那一问：三重回响（一次比一次小、一次比一次淡）——这一镜的后半就是纯字的画面
    const q = f.t - 139.3;
    if (q > 0) {
      for (let i = 2; i >= 0; i--) {
        const s2 = 210 - i * 62;
        TY.line(g, f, { reg: 'plate', treat: 'quiet', x: 900, y: 560 + i * 118, size: s2, align: 'center', lineAlpha: (1 - i * 0.3) * clamp(q / 0.6) });
      }
    } else {
      TY.line(g, f, { reg: 'plate', treat: 'quiet', x: 900, y: 560, size: 210, align: 'center' });
    }
    return { grain: 0.03, vignette: 0 };
  },
});
