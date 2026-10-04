// obsolete — 22（77.52–81.15，PLATE）。HERO：冯·诺依曼架构框图（CPU / 内存 / 总线三段，占中 ≥50%）。
// 唱到 "obsolete"（80.04）时盖上 OBSOLETE 章（单帧抖），然后框图自己一条条缩回去——每条线用 DR.pen 的 upto 倒着画。
// 字在中：正好骑在总线那两条轨之间（这条总线就是它过时的原因）。
MV.scene('obsolete', {
  init() {
    const L = [], add = (pts, o) => L.push(Object.assign({ pts: pts, w: 1.5, color: LK.ink, d: 0 }, o || {}));
    const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
    add(R(250, 120, 1670, 900), { w: 2.4, d: 0 });                       // 系统外框
    add(R(300, 170, 900, 510), { w: 2.0 });                              // CPU
    add(R(330, 200, 600, 320));                                          // 控制单元
    add(R(330, 350, 600, 470));                                          // ALU
    add(R(630, 200, 860, 470));                                          // 寄存器堆
    add([[630, 245], [860, 245]], { w: 0.8, color: LK.ink2 });
    add([[630, 290], [860, 290]], { w: 0.8, color: LK.ink2 });
    add([[630, 335], [860, 335]], { w: 0.8, color: LK.ink2 });
    add([[630, 380], [860, 380]], { w: 0.8, color: LK.ink2 });
    add([[630, 425], [860, 425]], { w: 0.8, color: LK.ink2 });
    add(R(1020, 170, 1620, 510), { w: 2.0 });                            // 内存
    for (let r = 0; r <= 4; r++) { const y = 212 + r * 59; add([[1062, y], [1578, y]], { w: 0.7, color: LK.ink2 }); }
    for (let c = 0; c <= 6; c++) { const x = 1062 + c * 86; add([[x, 212], [x, 448]], { w: 0.7, color: LK.ink2 }); }
    add([[300, 560], [1620, 560]], { w: 2.0 });                          // 总线（上轨）
    add([[300, 700], [1620, 700]], { w: 2.0 });                          // 总线（下轨）
    const comb = [];
    for (let i = 0; i < 9; i++) { const x = 400 + i * 150; comb.push([x, 560], [x, 700]); }
    add(comb, { w: 0.7, color: LK.ink3 });
    add([[600, 510], [600, 560]], { w: 1.2 });                           // CPU ↓ 总线
    add([[1300, 510], [1300, 560]], { w: 1.2 });                         // 内存 ↓ 总线
    add([[300, 810], [1620, 810]], { w: 1.2, color: LK.ink2 });           // 串行轨（一次一个词）
    L.forEach((l, i) => { l.d = i / Math.max(1, L.length - 1); });        // 退场顺序：一条接一条
    this.lines = L;
    this.sx = 1180; this.sy = 390;                                       // 章的位置
  },
  word(f, s) {
    const L = f.lyrics.lines, q = String(s).toLowerCase();
    for (let i = 0; i < L.length; i++) for (let k = 0; k < L[i].words.length; k++) {
      const w = L[i].words[k];
      if (w.w.toLowerCase().indexOf(q) === 0) return w.start;
    }
    return f.from + 0.4;
  },
  fit(g, text, size, maxW) {
    if (!text) return size;
    const w = LK.measure(g, text, size, { track: 0.01 });
    return w > maxW ? size * maxW / w : size;
  },
  render(g, f) {
    DR.paper(g);
    const stampT = this.word(f, 'obsolete');
    const sk = clamp((f.t - stampT) / 0.12);
    const R = clamp((f.t - stampT - 0.12) / 1.0);                       // 缩回去
    const on = 0.80 + 0.20 * LK.in(f, 0.4);                             // 开场把框图先画出来

    DR.micro(g, 'VON NEUMANN MACHINE — BLOCK DIAGRAM', 260, 104, { size: 15, color: LK.ink });
    DR.micro(g, 'ARCH. 1945 / SINGLE BUS / ONE WORD AT A TIME', 1660, 104, { size: 13, color: LK.ink2, align: 'right' });
    DR.micro(g, 'CPU', 320, 196, { size: 13, color: LK.ink2 });
    DR.micro(g, 'CONTROL', 344, 226, { size: 12, color: LK.ink3 });
    DR.micro(g, 'ALU', 344, 376, { size: 12, color: LK.ink3 });
    DR.micro(g, 'REGISTERS', 646, 226, { size: 12, color: LK.ink3 });
    DR.micro(g, 'MEMORY', 1040, 196, { size: 13, color: LK.ink2 });
    DR.micro(g, 'BUS — 1 WORD WIDE', 316, 546, { size: 13, color: LK.ink2 });
    DR.micro(g, 'ONE WORD AT A TIME', 316, 786, { size: 12, color: LK.ink3 });

    // 框图：一条条缩回去（前半是入场，后半是退场）
    for (let i = 0; i < this.lines.length; i++) {
      const Ln = this.lines[i];
      const k = R <= 0 ? 0 : clamp((R - Ln.d * 0.5) / 0.5);
      const u = on * (1 - k);
      if (u <= 0.004) continue;
      DR.pen(g, i % 2 ? Ln.pts.slice().reverse() : Ln.pts, u, { color: LK.a(Ln.color, 1 - 0.55 * k), w: Ln.w, dash: k > 0.02 ? [7, 6] : null });
    }
    // 总线上的箭头（不缩，最后一起淡掉）
    const fade = 1 - 0.8 * R;
    DR.arrow(g, 600, 548, Math.PI / 2, 13, LK.a(LK.ink, fade));
    DR.arrow(g, 1300, 548, Math.PI / 2, 13, LK.a(LK.ink, fade));
    DR.arrow(g, 700, 712, -Math.PI / 2, 13, LK.a(LK.ink, fade));
    DR.arrow(g, 1400, 712, -Math.PI / 2, 13, LK.a(LK.ink, fade));
    // 串行轨：一次只有一个词在走（冯·诺依曼瓶颈）
    const wx = lerp(420, 1560, (f.t * 0.7) % 1);
    g.save(); g.globalAlpha = fade;
    g.strokeStyle = LK.a(LK.ink3, 0.75); g.lineWidth = 1.2;
    g.strokeRect(420 - 116 - 52, 793, 104, 34);
    g.fillStyle = LK.paper2; g.fillRect(wx - 52, 793, 104, 34);
    g.strokeStyle = LK.blue; g.lineWidth = 1.6; g.strokeRect(wx - 52, 793, 104, 34);
    DR.micro(g, 'WORD', wx, 816, { size: 15, color: LK.blue, align: 'center' });
    g.restore();
    DR.dim(g, [420, 860], [524, 860], 0, { text: '1 WORD', size: 14, color: LK.ink2, ext: false });

    // 唱到 "obsolete"：盖章（单帧抖）
    if (sk > 0.01) {
      const k = ease.outCubic(sk);
      g.save();
      g.translate(this.sx, this.sy); g.scale(lerp(1.28, 1, k), lerp(1.28, 1, k)); g.translate(-this.sx, -this.sy);
      DR.stamp(g, 'OBSOLETE', this.sx, this.sy, { size: 210, rot: -0.07, sub: 'FORM 22-B \u00b7 SUPERSEDED', color: LK.blue, alpha: 0.93 * clamp(sk * 1.5) });
      g.restore();
    }
    const cur = TY.current(f, f.from);
    const size = this.fit(g, cur ? cur.line.text : '', 124, 1260);
    // type.js 的 'stamp' 会用一个不透明的偏移副本把字压花，所以这里用 'slam'（图章式砸入 + 套印错位）
    TY.line(g, f, { reg: 'plate', treat: 'slam', pos: 'centre', x: 960, y: 665, size: size, color: LK.blue, cool: LK.ink2, since: f.from });
    return { grain: 0.03, vignette: 0, shake: (f.t >= stampT && f.t < stampT + 1 / 30) ? 5 : 0 };
  },
});
