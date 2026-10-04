// nocdr — 84.79–89.34（PLATE）。"Without a single CDR"。
// HERO：一根被拉断的连杆（横向 84% 幅面、132 px 粗，≥45%）。字在中下。
// 拍点：拉力每一拍加一档（85.70 / 86.15 / 86.61 / 87.06 五档：杆被拉长、断口附近颈缩一点点），
//       断裂落在 "CDR" 之后的小节头 87.517 —— 断口两条锯齿线留在空中（DR.breakEdge 的写法）。
MV.scene('nocdr', {
  init() {
    this.Y = 430;        // 杆轴
    this.H0 = 132;       // 杆的直径
    this.E0 = 200;       // 左端
    this.E1 = 1600;      // 右端
    this.BX = 900;       // 断口位置
    this.BEATS = 5;      // 拉几档
    this.T0 = 0.909;     // 第一档 = 85.699 小节头
    this.DT = 0.4545;    // 一拍
    this.SNAP = 2.727;   // 断裂 = 87.517 小节头
    this.AMP = 26;       // 断口锯齿幅度
    this.SEED = 7;
  },

  /** 断口那条边：和 DR.breakEdge 用同一套公式，画上去严丝合缝。 */
  facePts(x, y0, y1, dir) {
    const n = 14, out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, k = (i === 0 || i === n) ? 0 : (hash(i, this.SEED, 2) - 0.5) * this.AMP;
      out.push([x + dir * k, y0 + (y1 - y0) * u]);
    }
    return out;
  },

  render(g, f) {
    DR.paper(g);
    const Y = this.Y, H = this.H0, E0 = this.E0, E1 = this.E1, BX = this.BX;
    const snapK = prog(f.lt, this.SNAP, this.SNAP + 0.06, ease.outCubic);
    const step = clamp(Math.floor((f.lt - this.T0) / this.DT + 1.0001), 0, this.BEATS);
    const gap = lerp(62 + 200 * (step / this.BEATS), 300, snapK);
    const hh = H * (1 - 0.14 * (step / this.BEATS) - 0.05 * snapK) / 2;
    const rec = snapK * (1 - clamp((f.lt - this.SNAP) / 0.55)) * 10 * Math.sin(f.tick * 2.1);
    const fxL = BX - gap / 2 - rec, fxR = BX + gap / 2 + rec;
    const yT = Y - hh * 0.79, yB = Y + hh * 0.79;

    // 一段杆：一端是端头，另一端是断口（靠近断口处颈缩）
    const piece = (xa, xb, faceLeft, dir) => {
      const N = 8, pts = [], tap = (x) => {
        const k = faceLeft ? (xb - x) / (xb - xa) : (x - xa) / (xb - xa);
        return hh * (1 - 0.24 * Math.pow(clamp(k), 3));
      };
      for (let i = 0; i <= N; i++) { const x = lerp(xa, xb, i / N); pts.push([x, Y - tap(x)]); }
      if (!faceLeft) pts.push.apply(pts, this.facePts(xb, Y - tap(xb), Y + tap(xb), dir));
      for (let i = N; i >= 0; i--) { const x = lerp(xa, xb, i / N); pts.push([x, Y + tap(x)]); }
      if (faceLeft) pts.push.apply(pts, this.facePts(xa, Y + tap(xa), Y - tap(xa), dir).reverse());
      g.save();
      g.beginPath();
      pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
      g.closePath();
      g.fillStyle = LK.tone[1]; g.fill();
      g.strokeStyle = LK.ink; g.lineWidth = 1.5; g.lineJoin = 'miter'; g.stroke();
      g.restore();
    };
    piece(E0, fxL, false, 1);          // 左段：断口在右（锯齿朝右）
    piece(fxR, E1, true, -1);          // 右段：断口在左（锯齿朝左，和对面咬合）

    // 断口两条锯齿线：断完之后它们留在空中
    DR.breakEdge(g, fxL, yT, fxL, yB + 0.01, { amp: this.AMP, seed: this.SEED, color: LK.ink, w: 2.0 });
    DR.breakEdge(g, fxR, yT, fxR, yB + 0.01, { amp: -this.AMP, seed: this.SEED, color: LK.ink, w: 2.0 });
    // 撕开的金属：断口两片细剖面线
    DR.hatch(g, gg => gg.rect(fxL - 22, yT, 22, yB - yT), { gap: 6, color: LK.hatch, w: 0.8 });
    DR.hatch(g, gg => gg.rect(fxR, yT, 22, yB - yT), { gap: 6, color: LK.hatch, w: 0.8 });

    // 端头法兰 + 被挡住的那条棱（虚线）+ 中心线
    for (const [x, s] of [[E0, -1], [E1, 1]]) {
      const bx0 = x + (s < 0 ? -72 : 0);
      g.save();
      g.fillStyle = LK.tone[3]; g.fillRect(bx0, Y - H * 0.86, 72, H * 1.72);
      g.strokeStyle = LK.ink; g.lineWidth = 1.6; g.strokeRect(bx0, Y - H * 0.86, 72, H * 1.72);
      g.restore();
      for (let i = 0; i < 4; i++) {
        const bx = x + s * (i % 2 ? 24 : 50), by = Y + (i < 2 ? -1 : 1) * H * 0.58;
        g.save(); g.beginPath(); g.arc(bx, by, 9, 0, TAU);
        g.fillStyle = LK.paper2; g.fill(); g.strokeStyle = LK.ink; g.lineWidth = 1.2; g.stroke();
        g.beginPath(); g.moveTo(bx - 6, by); g.lineTo(bx + 6, by); g.stroke(); g.restore();
      }
      DR.line(g, x + s * 10, Y + hh * 0.55, x + s * 72, Y + hh * 0.55, { color: LK.ink3, w: 0.8, dash: [7, 5] });
      DR.center(g, x + s * 36, Y, 44, { color: LK.ink3, w: 0.7 });
    }

    // 拉力 / 反力：每加一档箭头长一点
    const pull = 70 + 90 * (step / this.BEATS);
    DR.line(g, E1 + 76, Y, E1 + 76 + pull, Y, { color: LK.ink, w: 3.0 });
    DR.arrow(g, E1 + 76 + pull, Y, 0, 24, LK.ink);
    DR.line(g, E0 - 76, Y, E0 - 76 - pull * 0.62, Y, { color: LK.ink2, w: 2.4 });
    DR.arrow(g, E0 - 76 - pull * 0.62, Y, Math.PI, 22, LK.ink2);
    DR.micro(g, 'PULL ' + (1200 + 120 * step) + ' N', 1840, Y - 34, { size: 15, color: LK.ink, align: 'right' });
    DR.micro(g, 'REACT', 186, Y - 34, { size: 15, color: LK.ink2 });

    // 唯一的读数：断口的距离（每档跳一下）
    const dimY = Y + H * 0.86 + 84;
    DR.dim(g, [fxL, dimY], [fxR, dimY], 0, { text: gap.toFixed(0) + ' mm', size: 15, color: LK.ink, ext: false });
    DR.line(g, E0 - 44, dimY - 14, E0 - 44, dimY + 14, { color: LK.ink3, w: 0.8 });
    DR.line(g, E1 + 44, dimY - 14, E1 + 44, dimY + 14, { color: LK.ink3, w: 0.8 });

    // 断口引线
    if (snapK > 0.2) {
      DR.leader(g, BX, yT + 6, -150, -190, 'FRACTURE \u2014 NO CDR, NO SPEC', { draw: clamp((snapK - 0.2) / 0.4), size: 15, color: LK.blue, run: -40 });
    } else {
      DR.leader(g, BX, yT + 6, 170, -170, 'LINK 04 \u2014 ' + (100 - 3 * step) + '% SECTION', { draw: LK.in(f, 0.6), size: 15, color: LK.ink, run: 30 });
    }

    // 家具：剖面符号 / 规格小字 / 刻度尺
    DR.sectionMark(g, [E0 + 620, Y + 250], [E0 + 620, Y - 250], 'A', { color: LK.ink2 });
    DR.micro(g, 'TENSILE TEST \u2014 ' + this.BEATS + ' STEPS  \\\\  NO CHANGE ORDER ON FILE', 152, 156, { size: 14, color: LK.ink2 });
    DR.micro(g, 'ROD \u00d8' + H + ' \u00b10.5  \\\\  MATERIAL DS-BLUE  \\\\  HEAT 04', 152, 184, { size: 14, color: LK.ink3 });
    DR.ruler(g, 152, 238, 1848, 238, { step: 40, unit: 25, color: LK.ink3, w: 0.9 });

    // 字（section treatment：上墨下剖面线）
    TY.line(g, f, { reg: 'plate', x: 760, y: 792, size: 128, align: 'center' });

    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01-L4'], ['load', (1200 + 120 * step) + ' N'], ['state', snapK > 0.5 ? 'FAILED' : 'LOADED']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 24 \u2014 LINK, TENSILE', rev: 'REV D',
      w: 400, h: 190, x: 1400, y: 812, alpha: 0.96,
    });
    return { grain: 0.03, vignette: 0 };
  },
});
