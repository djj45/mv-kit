// 31 stack · 109.79–113.43 · P · #34「"Just transformers all the way!"」
//   画面：一块块同样的圆角方块（"TRANSFORMER BLOCK"，mono 小字）从地面往上一块接一块地叠，每拍一块，越叠越高、
//        永远叠不完：CAM.keep([塔顶], { anchor: 塔底 })，整座塔跟着缩，塔顶始终在画面里。
//   焦点：塔顶那一块（报在歌词之后，camera 的 insert 才会跟它）。
//   运镜：kits/camera.js 默认缓推（塔顶的 keep 让推近永远推不出塔顶）。
//   歌词：stamp L，左侧上区。这句自己带着引号（'“Just' / 'way!”' 是词表里的字符），所以场景不再另画引号——
//        第一轮在句子两端手画了一对 heavy XL 的 “ ”，和歌词自带的引号重了一遍，第二个 ” 还落在第二行末尾。
//        现在只有歌词自己的那一对。这句是 zone 歌词、又没有用到 WD.line 的返回值，画进屏幕层 MV.overlay：
//        默认缓推直接压在字底下走，不再被歌词的 keep 框钳住。
//        maxW 1180：句子在左半边折成两行，右半边的塔（x ≥ 1330）不会被字压到。
MV.scene('stack', {
  init() {
    // one block lands on every beat: the beat grid is static, so read it once
    this.beats = (MV.audio.beats || []).slice();
    this.period = 60 / (MV.audio.bpm || 120);
  },
  render(g, f) {
    const C = SG.C;
    const BW = 340, BH = 120, STEP = 128;          // block size, stacking pitch (8 px of daylight between blocks)
    const CX = 1500, BASE = H - 96;                // the tower's axis and the ground line (y 984)
    const B = this.beats, P = this.period;
    let b0 = 0; while (b0 + 1 < B.length && B[b0] < f.from - 0.02) b0++;     // the shot starts on a beat
    const tOf = i => (b0 + i < B.length ? B[b0 + i] : f.from + i * P);
    let n = 0; while (n < 40 && tOf(n) <= f.t) n++;                          // blocks placed so far (the last may still drop)
    const drop = i => (1 - ease.outCubic(clamp((f.t - tOf(i)) / 0.16))) * 70; // it falls the last 70 px into place

    SG.bg(g, 'P');
    // the ground: a hazard strip on the base line, drawn in screen space — the shrinking tower must not drag the floor in
    SG.stripes(g, 0, BASE, W, 24, { period: 48, phase: f.t * 60 });

    // the tower: the world scales about its foot so the top block never leaves the picture (safe top 336 keeps the top
    // block clear of the two lyric rows on the left)
    const topY = n ? BASE - (n - 1) * STEP - BH - drop(n - 1) : BASE;
    const s = CAM.keep([[CX, topY]], { anchor: [CX, BASE], safe: [SG.SAFE, 336, W - SG.SAFE, H - 24] });
    g.save(); g.translate(CX, BASE); g.scale(s, s); g.translate(-CX, -BASE);
    for (let i = 0; i < n; i++) {
      const bot = BASE - i * STEP - drop(i), top = bot - BH;
      const flash = 1 - clamp((f.t - tOf(i)) / 0.30);                        // the new block lands yellow, then cools to paper2
      g.save();
      g.fillStyle = C.paper2; SG.rr(g, CX - BW / 2, top, BW, BH, 16); g.fill();
      if (flash > 0.01) { g.globalAlpha = flash; g.fillStyle = C.yellow; SG.rr(g, CX - BW / 2, top, BW, BH, 16); g.fill(); }
      g.restore();
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate; g.lineJoin = 'round';
      SG.rr(g, CX - BW / 2 + 7, top + 7, BW - 14, BH - 14, 10); g.stroke();
      BOX.text(g, 'TRANSFORMER BLOCK', CX, top + BH / 2, { size: 30, font: SG.mono, align: 'center', base: 'middle',
                                                           color: C.ink, maxW: BW - 56 });
    }
    g.restore();

    // ── the lyric last: stamp L, left upper zone, on the screen layer. The line carries its own “ ” (they are part
    //    of the words: '“Just' … 'way!”'), so the scene draws no second pair; the shot never opens with the previous
    //    sentence either (WD.current carries a line over only while it still has words to sing).
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'L', zone: 'top', align: 'left', maxW: 1180 }));

    // focus: the block on top of the tower, where it ended up on screen after CAM.keep
    const fy = BASE + (topY + BH / 2 - BASE) * s;
    MV.focus(CX, fy, 'top block');
    return {};
  },
});
