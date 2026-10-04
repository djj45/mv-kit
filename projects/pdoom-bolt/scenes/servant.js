// servant — 图纸 05（0:12.97–0:16.61）。PLATE 语域：纸 + 墨，什么都不发光。
// HERO：被工程标注的人形零件 —— 一整块实体：人形剪影（k=1.6）沿 z 挤出 0.35 的板，头顶一片圆盘，
//       胸口一个法兰环。按面法线分 5 档平色 + 被挡住的棱画虚线（工程图的隐藏线），轮廓走重墨。
//       他站在画面右侧、几乎顶到图框下沿，尺寸线全给他（总高 / 肩宽 / 腿长），公差一律 ±0。
//       boss：顶部一个巨大的粗线方框，唱到 "boss"（15.66 s）那一刻压下来一格——间隙量到 0，人被压矮。
// 字区：左上（TY.T[4] 的 section treatment：字坐在剖面线带上，分两行）。
MV.scene('servant', {
  init() {
    // 人形零件：一份几何（挤出实体）。头是一片圆盘（人不画脸），胸口一个法兰环，肩上两根销。
    const body = PART.extrude(PART.figure2d({ k: 1.6 }), 0.35);
    S3.scale3(body, [1.25, 1, 1]);                                          // 零件是矮胖的铸件，不是竹竿
    const head = S3.bake(S3.cyl(0.145, 0.145, 0.35, 26, { centered: true }),
      { rot: [Math.PI / 2, 0, 0], pos: [0, 1.455, 0] });
    const flange = S3.bake(PART.tube(0.085, 0.165, 0.46, 26), { rot: [Math.PI / 2, 0, 0], pos: [0, 1.02, 0] });
    const stud = S3.bake(S3.cyl(0.048, 0.048, 0.14, 10), { rot: [Math.PI / 2, 0, 0], pos: [0.40, 1.22, 0.20] });
    this.fig = S3.merge(body, head, flange, stud);
    this.TOP = 1.60;                                                        // 总高（脚在 y = 0）
    this.cam = { yaw: 0.34, pitch: 0.28, cx: 1310, cy: 970, zoom: 500 };
  },
  /** 歌词里某个词开始的时间（不写死秒数）。 */
  wt(f, q) { const w = f.lyrics.findWords(q)[0]; return w ? w.start : null; },
  render(g, f) {
    DR.paper(g);
    const boss = this.wt(f, 'boss');                                        // "boss" 唱到的那一下
    const press = boss == null ? 0 : prog(f.t, boss, boss + 0.18, ease.outBack);   // 方框压下来（带回弹）
    const sq = 1 - 0.03 * clamp(press);                                     // 人被压矮 3%
    const cam = Object.assign({}, this.cam, { zoom: this.cam.zoom * (1 + 0.004 * f.a.kick) });
    const W2 = p => S3.proj(cam, [p[0], p[1] * sq, p[2]]);                  // 世界 → 屏幕（跟着压扁）

    // 地面线 + 基准（零件立在图纸上，脚下一段被剖开的地面）
    const fL = W2([-0.52, 0, 0.175]), fR = W2([0.52, 0, 0.175]);
    DR.line(g, fL[0] - 130, fL[1], fR[0] + 130, fR[1], { color: LK.ink, w: 2.6 });
    for (let i = -8; i <= 8; i++) {
      const x = fL[0] - 110 + (fR[0] - fL[0] + 220) * (i + 8) / 16;
      DR.line(g, x, fL[1], x - 16, fL[1] + 20, { color: LK.ink2, w: 0.9 });
    }
    DR.micro(g, 'DATUM A', fL[0] - 126, fL[1] + 34, { size: 13, color: LK.ink2 });

    // 人形零件：实体（平色 5 档 + 隐藏虚线 + 重墨轮廓）
    S3.drawAll(g, [{ mesh: this.fig, model: { scale: [1, sq, 1] } }], {
      cam, edgeW: 2.1, hiddenW: 0.85, hiddenCol: LK.a(LK.ink2, 0.5),
      tone: (fc, fi, n) => (n[2] > 0.72 ? LK.tone[2] : n[1] > 0.55 ? LK.tone[3] : LK.tone[4]),
    });
    // 从颈到脚的那根蓝线：全片的"那根线"，人是被线牵着的零件
    const nk = W2([0, 1.30, 0.18]), hip = W2([0, 0.06, 0.18]);
    DR.line(g, nk[0], nk[1], hip[0], hip[1], { color: LK.blue, w: 2.4 });

    // ── 尺寸线全给他：总高 / 肩宽 / 腿长，公差一律 ±0（这就是这一镜的笑点）
    const top = W2([-0.30, this.TOP, 0.175]), foot = W2([-0.30, 0, 0.175]);
    DR.dim(g, top, foot, 158, { text: '1600 \u00b10', size: 17, color: LK.blue });
    const shL = W2([-0.46, 1.28, 0.175]), shR = W2([0.46, 1.28, 0.175]);
    DR.dim(g, shL, shR, 0, { text: '', color: LK.blue, size: 16 });          // 肩宽：线压在肩上，数字挪到右边
    DR.micro(g, '\u2190 920 \u00b10 \u2014 SHOULDER', shR[0] + 26, shR[1] - 4, { size: 15, color: LK.blue });
    const hp = W2([0.30, 0.72, 0.175]), ft2 = W2([0.24, 0, 0.175]);
    DR.dim(g, hp, ft2, -104, { text: '720 \u00b10', size: 15, color: LK.ink });
    const hd = W2([0, 1.455, 0.175]);
    DR.leader(g, hd[0] + 60, hd[1] + 40, 210, 150, 'HEAD \u00d8290 \u00b10', { draw: LK.in(f, 0.8), size: 15, color: LK.ink2, run: 16 });
    DR.micro(g, 'FACE NOT MACHINED', hd[0] + 296, hd[1] + 206, { size: 14, color: LK.ink2 });
    DR.leader(g, W2([0.10, 1.02, 0.24])[0], W2([0.10, 1.02, 0.24])[1], -230, 190, 'FLANGE \u00d8330 \u00b10', { draw: LK.in(f, 1.0), size: 15, color: LK.ink2 });

    // 规格表放在左下（右下让给人形零件）
    const T = DR.table(g, 150, 780, 2, 4, { cw: [200, 330], rh: 34, color: LK.ink3 });
    const spec = [['PART NO.', 'SVC-01'], ['MATERIAL', 'DS-BLUE / FLESH'], ['QTY', '1 \u2014 SPARE 0'], ['TOLERANCE', '\u00b10 EVERYWHERE']];
    spec.forEach((r, i) => {
      DR.cell(g, T, 0, i, r[0], { size: 12, color: LK.ink3, track: 0.14 });
      DR.cell(g, T, 1, i, r[1], { size: 15, color: i === 3 ? LK.blue : LK.ink });
    });
    DR.micro(g, 'SHEET 05 / 42 \u2014 SERVANT, DATUM A \u2014 SCALE 1:5', 150, 736, { size: 13, color: LK.ink2 });
    DR.micro(g, 'ITEM 04 \u2014 HUMAN-SHAPED PART, SERVANT CLASS \u2014 IT FITS OR IT DOESN\u2019T', 150, 986, { size: 13, color: LK.ink2 });
    DR.stamp(g, 'REV C', 520, 520, { size: 54, sub: 'BOLT.PLOTTER', color: LK.ink2, alpha: 0.45 * LK.in(f, 1.2) });

    // ── boss：顶部那个巨大的方框（粗线），唱到 "boss" 时整块压下来一格
    const bw = 900, bh = 130, bx = 980, by = 20 + 76 * press;
    DR.toneFill(g, gg => gg.rect(bx, by, bw, bh), 0, LK.a(LK.deep, 0.18));
    g.save();
    g.strokeStyle = LK.ink; g.lineWidth = 6; g.strokeRect(bx, by, bw, bh);
    g.lineWidth = 1.4; g.strokeStyle = LK.ink2; g.strokeRect(bx + 15, by + 15, bw - 30, bh - 30);
    g.restore();
    for (const [qx, qy] of [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]]) {
      DR.line(g, qx - 20, qy, qx + 20, qy, { color: LK.ink, w: 2.4 });
      DR.line(g, qx, qy - 20, qx, qy + 20, { color: LK.ink, w: 2.4 });
    }
    DR.display(g, 'BOSS', bx + bw / 2, by + bh * 0.56, { size: 84, color: LK.ink, align: 'center', track: 0.16 });
    DR.micro(g, 'OWNER \u2014 LOAD BEARING \u2014 DO NOT REMOVE', bx + bw / 2, by + bh * 0.88, { size: 13, color: LK.ink2, align: 'center', track: 0.14 });
    // 方框底面与头顶之间的间隙：压下来之前量得出来，压到就是 0
    const head = W2([0, this.TOP, 0.175]);
    const gap = Math.round(head[1] - (by + bh));
    DR.line(g, head[0], head[1] - 10, head[0], by + bh + 8, { color: LK.blue, w: 0.9, dash: [7, 5] });
    DR.dim(g, [head[0] + 330, by + bh], [head[0] + 330, head[1]], 0,
      { text: press > 0.5 ? 'CLEARANCE 0.00' : 'CLEARANCE ' + gap, size: 14, color: LK.blue, ext: false });
    DR.line(g, head[0] + 6, by + bh, head[0] + 330, by + bh, { color: LK.blue, w: 0.8, dash: [6, 5] });
    DR.arrow(g, head[0], by + bh + 8, Math.PI / 2, 16, LK.blue);

    // 字：section treatment（字坐在剖面线带上），左上，分两行
    TY.line(g, f, { reg: 'plate', treat: 'section', align: 'left', x: 150, y: 200, size: 96, words: [0, 4] });
    TY.line(g, f, { reg: 'plate', treat: 'section', align: 'left', x: 150, y: 392, size: 96, words: [4, 8] });

    return { grain: 0.03, vignette: 0, shake: boss == null ? 0 : 4.5 * pulse(f.t, boss, 0.12) };
  },
});
