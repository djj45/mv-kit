// fuse — 102.06–105.70（PLATE→VOID）。"Too late now, we lit the fuse"。
// HERO：一根横贯画面的导火索（清楚的管子：墨色外廓 + 纸白内芯 + 麻花斜纹），
// 火头是全帧唯一的白热；火头走过的地方纸被烧成一条焦带（黑），导火索变成一根焦炭线，墨点往上飞
// （蓝点 ≥50 个，给 105.6 的 reflow 转场备料）。点火 / 烧完对的是歌词："we lit the fuse" 的 lit → fuse 唱完。
// 字贴着导火索排（TY.T 的 plot treatment：唱到哪个字，笔就到哪个字）。
MV.scene('fuse', {
  init() {
    // 导火索：几个控制点 → Catmull-Rom 采样（带一点起伏才是"画好的线"）
    const C = [[-90, 664], [180, 636], [440, 694], [700, 648], [960, 702], [1220, 650], [1480, 700], [1740, 654], [2010, 682]];
    const P = [];
    for (let i = 0; i < C.length - 1; i++) {
      const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(C.length - 1, i + 2)];
      for (let j = 0; j < 26; j++) {
        const t = j / 26, t2 = t * t, t3 = t2 * t;
        P.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    P.push(C[C.length - 1]);
    this.path = P;
    // 弧长表（火头 = 弧长的函数）
    this.L = [0];
    for (let i = 1; i < P.length; i++) this.L.push(this.L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    this.TOT = this.L[this.L.length - 1];
    // 歌词（data/lyrics.json）："lit" 在 103.40 唱到，这一句 105.96 唱完 → 点火 / 烧完都对着它
    this.LIT = 103.40;
    this.DONE = 105.96;
    // 往上飘的墨点：位置 / 漂移 / 大小都是 hash 出来的（不累积状态）
    this.EM = [];
    for (let i = 0; i < 340; i++) this.EM.push([(i + hash(i, 1, 5) * 0.8) / 340, hash(i, 1, 1), hash(i, 1, 2), hash(i, 1, 3), hash(i, 1, 4)]);
  },

  /** 弧长 → 路径上的点。 */
  at(s) {
    const L = this.L, P = this.path;
    s = clamp(s, 0, this.TOT);
    let i = 1;
    while (i < L.length - 1 && L[i] < s) i++;
    const u = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    return [lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u)];
  },

  /** 一头尖的实心折线（火焰的舌头 / 余烬的拖尾）：宽度从 w0 收到 0。 */
  tongue(g, pts, w0, fill) {
    const n = pts.length, A = [], B = [];
    for (let i = 0; i < n; i++) {
      const q = pts[Math.min(n - 1, i + 1)], r = pts[Math.max(0, i - 1)];
      let dx = q[0] - r[0], dy = q[1] - r[1];
      const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const h = w0 * (1 - i / (n - 1)) / 2;
      A.push([pts[i][0] - dy * h, pts[i][1] + dx * h]);
      B.push([pts[i][0] + dy * h, pts[i][1] - dx * h]);
    }
    g.beginPath();
    g.moveTo(A[0][0], A[0][1]);
    for (let i = 1; i < n; i++) g.lineTo(A[i][0], A[i][1]);
    for (let i = n - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
    g.closePath();
    g.fillStyle = fill; g.fill();
  },

  render(g, f) {
    DR.paper(g);
    const BURN = clamp((f.t - this.LIT) / (this.DONE - this.LIT));     // 烧到哪儿了（0..1）
    const head = this.at(BURN * this.TOT);                            // 火头
    LK.focus(f, head[0], head[1]);                                     // 报给镜头：这一镜的插入跟着火头走
    const front = head[0];
    const lit = f.t >= this.LIT;

    // ── 家具（很少：这一镜要空。会被火一起烧掉）
    DR.micro(g, 'IGNITER TRAIN \u2014 2.40 m  \\  BURN 0.62 m/s  \\  NO CUT-OFF FITTED', 152, 156, { size: 14, color: LK.ink2 });
    DR.micro(g, 'FUSE 04  \\  SHEET 29 / 42  \\  REV E', 152, 184, { size: 14, color: LK.ink3 });
    DR.micro(g, 'LIT \u2014 103.4 s', 1850, 156, { size: 14, color: lit ? LK.blue : LK.ink3, align: 'right' });
    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01-F'], ['state', lit ? 'BURNING' : 'ARMED']],
      title: 'AGI \u00b7 BOLT', titleSub: 'SHEET 29 / 42', rev: 'REV E',
      w: 380, h: 132, x: 1470, y: 878, alpha: 0.95,
    });
    // 导火索两端的固定夹（线的起点 / 终点）
    for (const e of [this.path[0], this.path[this.path.length - 1]]) {
      g.save();
      g.fillStyle = LK.tone[3]; g.fillRect(e[0] - 26, e[1] - 34, 52, 68);
      g.strokeStyle = LK.ink; g.lineWidth = 2.0; g.strokeRect(e[0] - 26, e[1] - 34, 52, 68);
      g.restore();
    }

    // ── 烧过的地方：一条横贯画面的焦带（火头在它的前缘上；上下边缘是参差的焦口）
    const cy = 668, hh = 46 + 600 * ease.inOutCubic(clamp(BURN * 1.06)) + (lit ? 26 : 0);
    if (BURN > 0.001) {
      const jagA = 54 * clamp(BURN * 3) * clamp((560 - hh) / 260);
      const jag = x => (hash(Math.round(x / 44), 7, 1) - 0.5) * jagA;
      g.save();
      g.beginPath();
      g.moveTo(-10, cy - hh + jag(0));
      for (let x = 44; x <= front + 44; x += 44) g.lineTo(Math.min(x, front + 6), cy - hh + jag(x));
      for (let x = front + 6; x >= -10; x -= 44) g.lineTo(Math.max(x, -10), cy + hh + jag(x));
      g.closePath();
      g.fillStyle = LK.void; g.fill();
      // 焦口：一层压深的边 + 前缘一道冷光（不是泛光，是烧口）
      g.strokeStyle = LK.a(LK.steel2, 0.95); g.lineWidth = 5; g.stroke();
      g.restore();
      if (BURN < 0.999) {
        g.save();
        g.strokeStyle = LK.a(LK.ice, 0.55); g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(front + 6, cy - hh + jag(front));
        g.lineTo(front + 6, cy + hh + jag(front));
        g.stroke(); g.restore();
      }
    }

    // ── 导火索本体：一根清楚的管子（墨色外廓 + 纸白内芯 + 麻花斜纹）
    DR.pen(g, this.path, 1, { color: LK.ink, w: 18 });
    DR.pen(g, this.path, 1, { color: LK.paper2, w: 11 });
    g.save(); g.strokeStyle = LK.ink; g.lineWidth = 1.2;
    for (let s = 10; s < this.TOT; s += 24) {
      const a = this.at(s), b = this.at(s + 12);
      g.beginPath(); g.moveTo(a[0], a[1] - 9); g.lineTo(b[0], b[1] + 9); g.stroke();
    }
    g.restore();
    // 烧过的那一段：剩下一条焦炭线（在黑里还看得出线走过哪里，但不亮）
    if (BURN > 0.002) {
      DR.pen(g, this.path, BURN, { color: LK.steel2, w: 19 });
      DR.pen(g, this.path, BURN, { color: LK.steel, w: 11 });
      DR.pen(g, this.path, BURN, { color: LK.a(LK.ice, 0.45), w: 1.8 });     // 还留着一线余温
      g.save();
      for (let k = 0; k < 40; k++) {                                          // 焦炭上零星的红点
        const s2 = (k + 0.5) / 40 * BURN * this.TOT;
        const p = this.at(s2);
        g.globalAlpha = 0.30;
        g.fillStyle = LK.ice;
        g.beginPath(); g.arc(p[0], p[1] - 5 + hash(k, 9, 2) * 10, 2.2, 0, TAU); g.fill();
      }
      g.restore();
    }

    // ── 墨点向上飞（烧过的地方升空；至少 50 个蓝点）
    if (lit) {
      g.save();
      for (let i = 0; i < this.EM.length; i++) {
        const e = this.EM[i];
        const born = this.LIT + e[0] * (this.DONE - this.LIT);
        const life = (f.t - born) / (1.5 + e[1] * 0.9);
        if (life <= 0 || life >= 1 || e[0] > BURN + 0.01) continue;
        const p = this.at(e[0] * this.TOT);
        const up = ease.outCubic(life) * (150 + e[2] * 150);
        const x = p[0] + (e[3] - 0.5) * 46 * life, y = p[1] - up;
        const sc = (1.6 + e[4] * 4.4) * (1 - life * 0.5);
        g.globalAlpha = (1 - life) * (1 - life) * 0.95;
        g.fillStyle = i % 9 === 0 ? LK.ice : LK.blue;
        g.beginPath(); g.arc(x, y, sc, 0, TAU); g.fill();
        if (i % 6 === 0) { g.globalAlpha *= 0.5; g.fillRect(x - 0.8, y, 1.6, up * 0.42); }
      }
      g.restore();
    }

    // ── 火头：全帧唯一的白热（锐利，不发光）
    if (lit && BURN < 0.999) {
      const tk = f.tick;
      const wag = k => Math.sin(tk * 0.9 + k * 2.1) * 22;
      g.save();
      // 焰舌：三片，从火头往前上方长（-1.95 / -1.45 / -1.05 弧度），外深内白
      const TONG = [[-1.42, 208, 64, 46], [-1.02, 164, 54, 32], [-0.66, 118, 42, 22]];
      for (const lay of [[LK.deep, 1.0, 32], [LK.blue, 0.72, 20], [LK.ice, 0.46, 11]]) {
        for (const t3 of TONG) {
          const a = t3[0] + 0.13 * Math.sin(tk * 0.7 + t3[0] * 9);
          const pts = [[head[0], head[1]]];
          for (let k = 1; k <= 4; k++) {
            const L = t3[1] * lay[1] * k / 4;
            pts.push([head[0] + Math.cos(a) * L + wag(k + t3[0] * 5) * (k / 4) * 0.8,
                      head[1] + Math.sin(a) * L]);
          }
          this.tongue(g, pts, Math.max(lay[2], t3[2] * lay[1] * 1.4), LK.a(lay[0], 0.96));
        }
      }
      // 火花：几根短线从火头往上甩
      g.strokeStyle = LK.ice; g.lineWidth = 1.6;
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * 0.86 + hash(i, 5, 1) * Math.PI * 0.72;
        const L = 30 + hash(i, 5, 2) * 52;
        const x0 = head[0] + Math.cos(a) * 14, y0 = head[1] + Math.sin(a) * 14;
        g.beginPath(); g.moveTo(x0, y0);
        g.lineTo(x0 + Math.cos(a) * L + wag(i) * 0.35, y0 + Math.sin(a) * L);
        g.stroke();
      }
      // 白热芯：唯一的纯白
      g.fillStyle = LK.hot;
      g.beginPath(); g.arc(head[0], head[1], 15 + 3 * Math.sin(tk * 1.7), 0, TAU); g.fill();
      g.restore();
      // 唯一的读数：烧到哪儿了
      DR.micro(g, 'BURN ' + Math.round(BURN * 100) + '%', head[0] + 34, head[1] + 54,
               { size: 14, color: LK.ice });
    }

    // ── 字：贴着导火索排（plot treatment；唱到哪个字笔到哪个字）
    const dark = (cy - hh) < 592;                    // 焦带盖到字上了 = 字要改用暗底上的亮色
    TY.line(g, f, {
      reg: 'plate', since: 101.5, treat: 'plot', x: 152, y: 556, size: 104, align: 'left',
      color: dark ? LK.ice : LK.blue,
    });
    return { grain: 0.03, vignette: 0 };
  },
});
