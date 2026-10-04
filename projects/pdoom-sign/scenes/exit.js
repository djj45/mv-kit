// 28 exit · 98.88–102.52 · P · 主角：#30 时按钮 → #31 时绕回来的箭头头部
//   TREATMENT.md §8 28（原文）：左边一个大圆形急停按钮（墨圈 + 黄按钮），上面挂一块小牌「OUT OF OFFICE」；
//   右边一块"安全出口"牌：小人往门里跑，门内的箭头绕了一圈又指回小人自己。
//   焦点：#30 时按钮 → #31 时绕回来的箭头头部（按时间在两个点之间切 MV.focus）。
//   歌词：#30 `sign` M（上区，就是它自己那块牌子）；#31 `stamp` M，下区。
//
// 说明：#30 的牌子是 WD.line 自己画的（上区居中），所以画面的家具都躲开它——出口牌落在 y 340–800，
// 按钮那块小牌挂在按钮左下、压在墨圈上，两者都在 #31 下区那条墨迹（y 858–960）之上。
// 横跨两句：镜头在 #30 的开头就切进来（它的第一个字比切点早 0.06 s），#31 的第一个字在 100.72 起换成下面的印章
// 和那只绕回来的箭头；两句的 only 都从 WD.current 的当前词表推出来。
// 层级：#30 的 sign 是牌子本身（留在场景）；#31 是 zone 歌词（屏幕层），镜头推近时字钉在下区不动。
MV.scene('exit', {
  /** 箭头头部：顶点 p、朝向 dir 的平涂三角 */
  head(g, p, dir, size, color) {
    const a = Math.atan2(dir[1], dir[0]), n = [-Math.sin(a), Math.cos(a)];
    g.save(); g.fillStyle = color || SG.C.ink;
    g.beginPath();
    g.moveTo(p[0], p[1]);
    g.lineTo(p[0] - Math.cos(a) * size + n[0] * size * 0.62, p[1] - Math.sin(a) * size + n[1] * size * 0.62);
    g.lineTo(p[0] - Math.cos(a) * size - n[0] * size * 0.62, p[1] - Math.sin(a) * size - n[1] * size * 0.62);
    g.closePath(); g.fill(); g.restore();
  },
  /** 折线画到总长的 k（0..1），返回末端和那一小段的方向 */
  partial(g, pts, k, lw, color) {
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    const want = clamp(k, 0, 1) * total;
    let acc = 0, dir = [1, 0], out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const d = seg[i - 1];
      dir = d > 0 ? [(pts[i][0] - pts[i - 1][0]) / d, (pts[i][1] - pts[i - 1][1]) / d] : dir;
      if (acc + d <= want) { out.push(pts[i]); acc += d; }
      else { const u = d > 0 ? (want - acc) / d : 0; out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); break; }
    }
    g.save();
    g.strokeStyle = color || SG.C.ink; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    out.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke(); g.restore();
    return [out[out.length - 1], dir];
  },
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    const L30 = f.lyrics.get('Killswitch guy');
    const L31 = f.lyrics.get("Now there's nowhere");
    // ── 左：大圆形急停按钮（墨圈 + 黄按钮），底鼓上按一下 -------------------------------------------------
    const BX = 430, BY = 560, kick = clamp(f.a.kick * 1.5);
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict;
    g.beginPath(); g.arc(BX, BY, 175, 0, TAU); g.stroke();
    g.fillStyle = C.yellow;
    g.beginPath(); g.ellipse(BX, BY, 122 + 5 * kick, 122 - 9 * kick, 0, 0, TAU); g.fill();
    g.restore();
    const P = SG.plate(g, 150, 640, 440, 116, { name: 'out of office', pad: 34 });
    BOX.lines(g, P, ['OUT OF OFFICE'], { size: 44, color: C.ink, font: (gg, s) => SG.mono(gg, s, true), gap: 1 });
    // ── 右：安全出口牌：小人往门里跑，门里的箭头绕一圈又指回他自己 --------------------------------------
    const Q = SG.plate(g, 1080, 340, 720, 460, { name: 'safety exit', pad: 42 });
    MV.within(Q.owner, () => BOX.text(g, 'SAFETY EXIT', 1440, 420,
      { size: 40, align: 'center', color: C.ink, font: (gg, s) => SG.mono(gg, s, true), maxW: 620, keep: true }));
    g.save(); g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate; g.lineJoin = 'round';
    SG.rr(g, 1580, 470, 170, 280, 16); g.stroke();          // 门洞
    g.restore();
    SG.figure(g, 1420 + 24 * ease.inOutQuad(f.p), 660, 0.42, SG.POSE.run((f.tq * 1.6) % 1), { color: C.ink, focus: false });
    // 箭头：从#31 的第一个字起画出来——出门、绕一圈、回过头指着小人
    const t0 = L31.words[0].start, grow = ease.outCubic(clamp((f.t - t0) / 1.5));
    const cr = [1665, 610], R = 74;
    const path = [[1500, 700], [1634, 677]];
    for (let a = 115; a <= 445; a += 5) path.push([cr[0] + R * Math.cos(a * Math.PI / 180), cr[1] + R * Math.sin(a * Math.PI / 180)]);
    let tip = null;
    if (grow > 0) {
      const e = this.partial(g, path, grow, SG.LW.pict * 0.4, C.ink);
      tip = e[0];
      this.head(g, e[0], e[1], 52, C.yellow);
    }
    // ── 歌词：#30 的牌子 / #31 的下区印章 ------------------------------------------------------------
    // #30 是 sign —— 就是它自己那块牌子，印在物体上，留在场景画布上。
    // #31 是 zone 歌词（下区印章）、又没用到返回值 → 屏幕层 MV.overlay：默认缓推从字底下过去，不被 keep 钳住。
    const cur = WD.current(f);
    if (cur && cur.i === L30.i) {
      WD.line(g, f, { treat: 'sign', size: 'M', zone: 'top', maxW: 1500, only: WD.words(f, cur.line).map(w => w.i) });
    }
    MV.overlay(o => {
      const c = WD.current(f);
      if (c && c.i === L31.i) {
        WD.line(o, f, { treat: 'stamp', size: 'M', zone: 'low', align: 'center', maxW: 1500,
                        only: WD.words(f, c.line).map(w => w.i) });
      }
    });
    // 焦点：#30 看按钮，#31 看绕回来的箭头头部（按时间切）
    if (f.t >= t0 && tip) MV.focus(tip[0], tip[1], 'arrowhead');
    else MV.focus(BX, BY, 'stop button');
  },
});
