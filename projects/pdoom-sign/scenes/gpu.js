// 34 gpu · 118.88–120.70 · B · #38「Hundred thousand GPU」
//   画面：黑底，一个 32×18 的芯片方阵（每块是 24 px 的 paper 小方块 + 一根黄色引脚），在两拍内从中心向外一圈圈点亮。
//   焦点：方阵中心（一圈圈点亮的那一点），报在歌词之后 —— count 自己会报数字的右端，镜头该跟的是波心。
//   运镜：kits/camera.js 默认缓推。
//   歌词：count：'Hundred' → 100，'thousand' → 100,000，'GPU' → 100,000 GPU（XXL，paper 色），
//        歌词本身 stamp M 下区。steps 按 WD.current(f) 那一句的词序号建（镜头开头挂着的上一句也是三词，同样成立）。
//        数字和歌词都是 zone 歌词、没用到返回值 → 屏幕层 MV.overlay（默认缓推把芯片方阵推到字底下，字不动）。
//   版式：数字在上、方阵在中、歌词在下 —— 三样都是 paper 色，压在纸白芯片上就看不见了，所以各占一条带。
MV.scene('gpu', {
  init() {
    // the chip matrix: 32 × 18, a 24 px chip in a 30 × 26 px cell — static, built once
    const NX = 32, NY = 18, CELL = 30, CELLY = 26, SZ = 24, X0 = W / 2 - NX * CELL / 2, Y0 = 380;
    this.SZ = SZ;
    this.cx = W / 2; this.cy = Y0 + NY * CELLY / 2;
    this.chips = [];
    for (let r = 0; r < NY; r++) for (let c = 0; c < NX; c++) {
      const x = X0 + c * CELL + (CELL - SZ) / 2, y = Y0 + r * CELLY + (CELLY - SZ) / 2;
      this.chips.push([x + SZ / 2, y + SZ / 2, Math.hypot(x + SZ / 2 - this.cx, y + SZ / 2 - this.cy)]);
    }
    this.dMax = Math.max(...this.chips.map(c => c[2]));
  },
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'B');

    // the wave: centre outward, done inside two beats ("两拍内从中心向外一圈圈点亮")
    const front = clamp((f.t - f.from) / (2 * 60 / f.audio.bpm)) * this.dMax;
    const SZ = this.SZ;
    g.fillStyle = C.ink2;                                      // the matrix before the wave: a dim chip, no pin
    for (const [cx, cy, d] of this.chips) if (front - d < 0) g.fillRect(cx - 10, cy - 10, 20, 20);
    for (const [cx, cy, d] of this.chips) {
      const lit = front - d;
      if (lit < 0) continue;                                   // unlit chips are still just the dim square above
      const s = 1 + 0.4 * (1 - Math.min(1, lit / 40));         // the chip at the wave front pops, then settles
      const sz = SZ * s;
      g.fillStyle = C.paper;
      SG.rr(g, cx - sz / 2, cy - sz / 2, sz, sz, 4); g.fill();
      g.fillStyle = C.yellow;                                  // one pin per chip
      g.fillRect(cx - 4, cy + sz / 2 - 16, 8, 16);
    }

    // the lyric: the count (huge number + stamp M underneath, low zone) is a zone lyric with no return value used,
    // so it goes on the screen layer (MV.overlay) — the default push moves the chip matrix under it, the words and
    // the number stay put, and no MV.keep box clamps the camera. steps are derived from the line being shown (the
    // previous line carried into the shot is three words too, so the same mapping holds).
    // focus: the wave centre, reported last. The count reports its own number with MV.focus and the screen layer
    // runs after the scene, so without this re-report the entry's subject would be the number's right end.
    MV.overlay(o => {
      const cur = WD.current(f);
      const steps = cur ? cur.line.words.map((w, i) => [i, i === 0 ? '100' : i === 1 ? '100,000' : '100,000 GPU']) : [];
      WD.line(o, f, { treat: 'count', size: 'XXL', numY: 320, lyricSize: 'M', zone: 'low', color: C.paper, steps });
      MV.focus(this.cx, this.cy, 'chip matrix centre');
    });

    return {};
  },
});
