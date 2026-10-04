// stable — 乐章 4 的开头（38.43–41.16，约 2.7 s）。全片最安静的一镜：为引爆留出落差。
// 但这 2.7 s 里有一次镜头运动：唱到 "stable" 之后，记录仪的笔尖**离开纸面**，变成一个光点，
// 在画面里划过，把后半句 "training run," 一笔写出来——字是那个点划过的光组成的。
// 镜头跟着这个点缓慢推近、跟着它走（timeline 上这一条挂了 insert，焦点由 LK.focus 每帧报出）。
//
// 构图：上半是"讲出来的"半句（大字、平静），下半是"划出来的"半句（光的笔迹）。
// 一帧只有一处最亮：那个光点。线、刻度、旧笔迹都是暗的。
MV.scene('stable', {
  init() {
    this.N = 620;
    this.x0 = 142; this.x1 = 1778;
    this.mid = 470;                        // 记录线的基线
    this.vals = new Float32Array(this.N);
    this.lut = new Float32Array(96);
    for (let i = 0; i < 96; i++) this.lut[i] = 0.55 + 0.95 * Math.pow(i / 95, 1.25);

    // ── 被"划"出来的那半句：把 "training run," 采样成点，再按书写顺序（从左到右）排好
    this.T0 = 39.86;                       // 笔尖离开纸面的时刻（"training" 唱到之前一点）
    this.T1 = 41.10;
    this.tSize = 168; this.tCx = 960; this.tCy = 726;
    const P = LG.text('training run,', { n: 2000, font: LK.F.draft || LK.F.display, weight: 700, seed: 4, depth: 0 });
    const idx = [];
    for (let i = 0; i < P.length / 3; i++) idx.push(i);
    idx.sort((a, b) => (P[a * 3] - P[b * 3]) || (P[b * 3 + 1] - P[a * 3 + 1]));
    this.TN = idx.length;
    this.TX = new Float32Array(this.TN); this.TY2 = new Float32Array(this.TN); this.TJ = new Float32Array(this.TN);
    for (let i = 0; i < this.TN; i++) {
      const j = idx[i];
      this.TX[i] = this.tCx + P[j * 3] * this.tSize;
      this.TY2[i] = this.tCy - P[j * 3 + 1] * this.tSize;
      this.TJ[i] = hash(i, 21, 5);         // 每一点自己的相位（让它像尘，不像像素）
    }
    // 这一行字在屏幕上的左边缘（书写前沿的裁剪用）
    const mg = mk(8, 8).getContext('2d');
    LK.display(mg, this.tSize, { weight: 700, track: 0.02 });
    this.tW = mg.measureText('training run,').width;
    this.tLeft = this.tCx - this.tW / 2;
    // 笔尖在书写过程中的屏幕位置：沿这些点走
    this.headAt = k => {
      const i = clamp(Math.floor(k * this.TN), 0, this.TN - 1);
      return [this.TX[i], this.TY2[i]];
    };
  },
  /** 记录笔的 x 位置：连续的 f.t，接近匀速（这一镜的意思就是"没有意外"）。 */
  pos(f) { return this.x0 + (this.x1 - this.x0) * clamp((f.t - f.from) / f.dur); },
  /** 41.0 s 之后线开始抖（怪物的第一下）——抖是从笔尖往回长出来的。 */
  trace(f, x, p) {
    const T0 = 41.0;
    if (f.t <= T0 || x <= this.x0 + 4) return 0;
    const j = f.t - T0;
    const grow = clamp(j / 0.16);
    const g = clamp((x - this.x0) / (p - this.x0));
    const amp = Math.pow(grow, 2.0) * 30 * (0.25 + 0.75 * g);
    return amp * (0.62 * noise1(x * 0.055 + j * 2.6, 7) + 0.38 * noise1(x * 0.145 - j * 5.1, 11));
  },
  render(g, f) {
    const p = this.pos(f);
    const flying = f.t >= this.T0;                                  // 笔尖已经离纸
    const k = clamp((f.t - this.T0) / (this.T1 - this.T0));
    const head = this.headAt(k);
    lmBegin(LK.palVoid());

    // 走纸：几道暗到几乎看不见的参考线（是纸本身，不是遥测）
    const cam = lmScreen();
    const grid = [];
    for (const y of [this.mid - 232, this.mid + 118]) grid.push(-40, y, 0, W + 40, y, 0, 0.30, 0);
    for (const x of [this.x0, this.x1]) grid.push(x, this.mid - 258, 0, x, this.mid + 206, 0, 0.32, 0);
    lmLines(cam, new Float32Array(grid), { width: 1, color: LK.steel, gain: 1, glow: 0.2 });

    // 刻度
    const tk = [];
    for (let i = 0; i < 46; i++) {
      const x = this.x0 + (this.x1 - this.x0) * i / 45;
      const big = i % 5 === 0;
      tk.push(x, this.mid, 0, x, this.mid + (big ? 24 : 12), 0, big ? 0.42 : 0.24, 0);
      if (big) tk.push(x, this.mid - 24, 0, x, this.mid - 15, 0, 0.2, 0);
    }
    lmLines(cam, new Float32Array(tk), { width: 1, color: LK.blue, gain: 1, glow: 0.3 });

    // ── 记录线：从 x0 画到笔尖；笔尖离纸之后线就停在那儿（后面的纸是空的）
    const penX = flying ? this.T0 === 0 ? p : this.x0 + (this.x1 - this.x0) * clamp((this.T0 - f.from) / f.dur) : p;
    let prev = 0;
    const segs = [];
    for (let i = 0; i < this.N; i++) {
      const tx = this.x0 + (this.x1 - this.x0) * i / (this.N - 1);
      if (tx > penX) break;
      const v = this.trace(f, tx, penX);
      if (i > 0) {
        const a = this.vals[i - 1];
        segs.push(this.x0 + (this.x1 - this.x0) * (i - 1) / (this.N - 1), this.mid + a, 0, tx, this.mid + v, 0,
          this.lut[(i * 95 / (this.N - 1)) | 0], 0);
      }
      this.vals[i] = v; prev = v;
    }
    if (!flying) segs.push(p - 6, this.mid, 0, p, this.mid + prev, 0, 1.5, 1);
    lmLines(cam, new Float32Array(segs), { width: 1.6, color: LK.ice, gain: 1, glow: 0.6, glowR: 4 });

    // ── 光点划出来的那半句：只有已经被划过的点才亮，越靠近笔尖越亮
    const gl = lmGlow();
    gl.save(); gl.globalCompositeOperation = 'lighter';
    if (flying) {
      const lit = Math.floor(k * this.TN);
      const front = this.tLeft + this.tW * k;
      // 已经被划过的部分：字本身是发光的（被前沿裁开），所以一眼就读得出来
      gl.save();
      gl.beginPath(); gl.rect(this.tLeft - 30, this.tCy - this.tSize, Math.max(0, front - this.tLeft) + 30, this.tSize * 1.6); gl.clip();
      LK.display(gl, this.tSize, { weight: 700, track: 0.02 });
      gl.textBaseline = 'middle'; gl.textAlign = 'left';
      gl.fillStyle = LK.a(LK.hot, 0.92);
      gl.fillText('training run,', this.tLeft, this.tCy);
      gl.fillStyle = LK.a(LK.ice, 0.55);
      gl.fillText('training run,', this.tLeft, this.tCy);
      gl.restore();
      // 还没划到的一小段：跟着笔尖的尘（刚被划开的那些点还在跳）
      for (let i = Math.max(0, lit - 260); i < lit; i++) {
        const age = (lit - i) / 260;
        const x = this.TX[i], y = this.TY2[i] + (this.TJ[i] - 0.5) * 12 * age;
        gl.fillStyle = LK.a(age < 0.35 ? LK.hot : LK.ice, (1 - age) * 0.9);
        gl.fillRect(x - 2, y - 2, 4, 4);
      }
      // 书写前沿：一道竖着的亮线 + 笔头
      gl.strokeStyle = LK.a(LK.hot, 0.75); gl.lineWidth = 2;
      gl.beginPath(); gl.moveTo(front, this.tCy - this.tSize * 0.72); gl.lineTo(front, this.tCy + this.tSize * 0.30); gl.stroke();
      BOLT.radial(gl, head[0], head[1], LK.PX(120), LK.blue, 0.30);
      BOLT.plasma(gl, head[0], head[1], LK.PX(14), f.t, { color: LK.ice, core: '#FFFFFF', alpha: 1 });
      // 离纸的那一下：一条从笔尖飞起来的弧
      if (k < 0.10) {
        const u = k / 0.10, fx0 = this.x0 + (this.x1 - this.x0) * clamp((this.T0 - f.from) / f.dur);
        gl.strokeStyle = LK.a(LK.blue, 0.7 * (1 - u)); gl.lineWidth = 2;
        gl.beginPath(); gl.moveTo(fx0, this.mid);
        gl.quadraticCurveTo(fx0 + 120, this.mid - 90 * (1 - u), this.TX[0], this.TY2[0]); gl.stroke();
      }
    } else {
      const ny = this.mid + this.trace(f, p, p + 1);
      gl.save(); BOLT.radial(gl, p, ny, LK.PX(84), LK.blue, 0.20); gl.restore();
      BOLT.plasma(gl, p, ny, LK.PX(13), f.t, { color: LK.ice, core: '#FFFFFF', alpha: 0.95 });
    }
    gl.restore();
    lmEnd(g, { bloom: 0.62, exposure: 0.94, radius: 0.5 });

    // ── 泛光之后：锐利的机械细节 + 字（都不发光）
    if (!flying) {
      const ny = this.mid + this.trace(f, p, p + 1);
      g.save(); g.strokeStyle = LK.a(LK.steel2, 0.9); g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(p, ny); g.lineTo(p, this.mid - 46);
      g.moveTo(p - 13, this.mid - 46); g.lineTo(p + 13, this.mid - 46);
      g.moveTo(p - 7, this.mid - 46); g.lineTo(p - 7, this.mid - 60);
      g.moveTo(p + 7, this.mid - 46); g.lineTo(p + 7, this.mid - 60);
      g.stroke(); g.restore();
    }

    // ── 前半句：讲出来的那半句，大字、平静（对照后半句的光笔迹）
    TY.line(g, f, { reg: 'void', treat: 'quiet', words: [0, 4], x: 150, y: 292, size: 196, align: 'left' });

    lmTag(g, 'RUN 38.0 s — 40.0 s   /   CHART SPEED 25 mm/s   /   BASELINE 0.000 mV', 142, 992,
      { size: LK.PX(15), track: 0.3, color: 'dim', align: 'left' });
    if (flying) {
      lmTag(g, 'PEN OFF CHART — WRITING BY HAND', W - 142, 992,
        { size: LK.PX(15), track: 0.3, color: 'accent', align: 'right' });
    } else if (f.t > 40.9) {
      lmTag(g, 'DRIFT ' + (Math.abs(this.trace(f, p, p + 1)) * 0.01).toFixed(3) + ' mV', W - 142, 992,
        { size: LK.PX(15), track: 0.3, color: 'warn', align: 'right', alpha: clamp((f.t - 40.9) / 0.3) });
    }

    // 镜头跟着那个光点（timeline 上这一条挂了 insert；这里只负责报出焦点）
    if (flying) {
      LK.focus(f, head[0] - 40, head[1] - 60);
      TY.box = { x0: 150, x1: 1770, y0: 150, y1: this.tCy + this.tSize * 0.45 };   // 字区，给推近做上限
      TY.boxT = f.t;
    }
    return { grain: 0.026, vignette: 0, shake: f.a.kick * 0.6 };
  },
});
