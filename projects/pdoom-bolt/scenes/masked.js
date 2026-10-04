// masked — 乐章 8 第七镜（2:07.52–2:11.15）。**一段镜头内部一次重构图**：
//   前半（127.52–129.34）：从织机上扯下来的一条织带横扫过来，把一整行字盖掉（MASK）——
//   带子扫过的地方字就没了，只剩黑；带子前缘是一根还在抖的亮线（这一帧最亮的一点）。
//   129.34 s 重构图：黑带**推进成递归**：带子整个立起来、张开成最外一层线框，
//   里面一层比一层小、一层比一层亮，≥12 层，最里面那层留着一点白。
// 字区：T[42] 'swarm' / T[43] 'nested'，压在下三分之一。
MV.scene('masked', {
  init() {
    this.NB = 12;                       // 递归层数
    this.wrapSrc = new Float32Array(48 * 8);
    this.nw = 0;
    for (let i = 0; i < 48; i++) {      // 带子上的织纹（很短的一截一截，斜着排）
      const s = i * 8;
      this.wrapSrc[s] = -1; this.wrapSrc[s + 1] = 0; this.wrapSrc[s + 2] = 0;
      this.wrapSrc[s + 3] = 1; this.wrapSrc[s + 4] = 0; this.wrapSrc[s + 5] = 0;
      this.wrapSrc[s + 6] = 0.5; this.wrapSrc[s + 7] = 0;
      this.nw++;
    }
    this.core = LG.disk(260, 0.30);     // 最里面那层的一点白（点阵）
  },

  /** 一层线框：把 ctx 的变换直接摆上去，画 2D 的方框（递归套娃在屏幕坐标里做最干净）。 */
  frame(g, x, y, w, h, rot, gain, lwid) {
    g.save();
    g.translate(x, y); g.rotate(rot);
    g.strokeStyle = LK.a(LK.blue, 0.35 + 0.65 * gain); g.lineWidth = lwid;
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = LK.a(LK.hot, 0.15 + 0.85 * gain); g.lineWidth = Math.max(0.8, lwid * 0.34);
    g.strokeRect(-w / 2, -h / 2, w, h);
    for (const [cx, cy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {  // 四角记号
      g.strokeStyle = LK.a(LK.ice, 0.35 + 0.65 * gain); g.lineWidth = lwid * 0.9;
      g.beginPath(); g.moveTo(cx - Math.sign(cx) * w * 0.05, cy); g.lineTo(cx, cy); g.lineTo(cx, cy - Math.sign(cy) * h * 0.09); g.stroke();
    }
    g.restore();
  },

  render(g, f) {
    const bx0 = 128.20, bx1 = 129.30;                       // 黑带扫过的时间（"masked" 唱到 → 扫完）
    const sweep = ease.inOutCubic(prog(f.t, bx0, bx1));
    const nest = ease.outCubic(prog(f.t, 129.34, 129.95));   // 129.34：带子立起来张开成递归
    const adv = prog(f.t, 129.40, 131.15, ease.linear);      // 递归一层一层往里推进
    // 带子的位置：前半横在字上，后半立起来变成最外一层框
    const bandY = lerp(878, 560, nest), bandH = lerp(198, 660, nest), bandW = lerp(1560, 980, nest);
    const bandX = lerp(200 + 1560 * sweep - bandW / 2 + 780 * 0, 960, nest);

    lmBegin(LK.palVoid());
    // 织机剩下的布：前半还在上面（很淡，慢慢退掉），后半被递归吃掉
    const gl = lmGlow();
    gl.save(); gl.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {                           // 还没被盖住的经纬线
      const y = 120 + i * 30 + 4 * Math.sin(f.t * 0.7 + i);
      gl.strokeStyle = LK.a(LK.blue, 0.10 * (1 - nest) * (1 - i / 22));
      gl.lineWidth = 1.1;
      gl.beginPath(); gl.moveTo(260, y); gl.lineTo(1660, y); gl.stroke();
    }
    // 递归套娃：一层比一层小、一层比一层亮
    const shown = nest <= 0.001 ? 0 : clamp(1 + Math.floor(adv * (this.NB - 1) + 0.001), 1, this.NB);
    for (let i = 0; i < shown; i++) {
      const s = Math.pow(0.845, i), gk = i / (this.NB - 1);
      const px = 960 + (120 + 26 * i) * 0 - 0, py = bandY - 40 * i * 0.5;
      this.frame(gl, 960, py, bandW * s * lerp(1, 0.92, nest), bandH * s * lerp(1, 1.0, nest),
        0.035 * i * (i % 2 ? -1 : 1), 0.30 + 0.70 * gk, 1.2 + 2.6 * gk);
      void px;
    }
    // 最里面那层的一点白：整镜唯一最亮的地方（后面 ilya 的那点白从这里来）
    if (shown >= this.NB) {
      const gg = clamp((adv * (this.NB - 1) - (this.NB - 2)) / 0.9);
      BOLT.plasma(gl, 960, bandY - 40 * (this.NB - 1) * 0.5, 9 + 7 * gg, f.t, { alpha: 0.55 * gg });
    }
    // 带子前缘：一根还在抖的亮线（扫的时候最亮）+ 织纹
    if (nest < 0.999) {
      const ex = nest <= 0.001 ? 200 + 1560 * sweep : 960 + bandW / 2 * (1 - 0.1) - 0;
      const y0 = bandY - bandH / 2, y1 = bandY + bandH / 2;
      gl.save(); gl.globalCompositeOperation = 'lighter';
      gl.strokeStyle = LK.a(LK.blue, 0.5 * (1 - nest)); gl.lineWidth = 3.2;
      gl.strokeRect(ex - bandW, y0, bandW, bandH);
      gl.restore();
      const pts = BOLT.pathBetween([ex, y0], [ex, y1], { tick: f.tick, seed: 13, jag: 0.05, depth: 5, drift: 2.2 });
      BOLT.draw(gl, pts, { w: 3.0, color: LK.blue, core: LK.hot, gain: 1 - nest });
    }
    lmEnd(g, { bloom: 0.92 });

    // ── 泛光之后：先画锐利的字，再让黑带盖上去（盖住 = 这一行字没了）
    const li = TY.index(f);
    TY.line(g, f, { reg: 'void', x: li === 43 ? 380 : 960, y: li === 43 ? 936 : 916, size: li === 43 ? 80 : 138, align: li === 43 ? 'left' : 'center' });
    const covered = clamp(sweep);
    if (nest < 0.999 && covered > 0.001) {
      g.save();
      g.beginPath(); g.rect(200, bandY - bandH / 2, 1560 * covered, bandH); g.clip();
      g.fillStyle = LK.void; g.fillRect(200, bandY - bandH / 2, 1560, bandH);   // 盖掉：这一行字没了
      g.strokeStyle = LK.a(LK.ice, 0.10 * (1 - nest)); g.lineWidth = 1;
      for (let i = 0; i < 22; i++) {                                            // 织纹（很暗，只看得见一点）
        const y = bandY - bandH / 2 + (i + 0.5) * bandH / 22;
        g.beginPath(); g.moveTo(200, y); g.lineTo(1760, y); g.stroke();
      }
      g.fillStyle = LK.a(LK.blue, 0.9 * (1 - nest));
      g.fillRect(200, bandY - bandH / 2 - 1.5, 1560 * covered, 3);              // 上下两道亮边
      g.fillRect(200, bandY + bandH / 2 - 1.5, 1560 * covered, 3);
      g.restore();
    }
    lmTag(g, 'MASK \u2014 ' + (nest > 0.02 ? 'RECURSIVE' : 'WOVEN BAND') + ' \u00b7 LAYERS ' + shown + ' / ' + this.NB,
      120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, nest > 0.02 ? 'EACH LAYER BRIGHTER' : 'THIS LINE IS GONE', W - 120, 96,
      { size: 15, track: 0.3, color: nest > 0.02 ? 'accent' : 'dim', align: 'right' });
    return { grain: 0.03, vignette: 0 };
  },
});
