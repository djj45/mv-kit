// 38 masked · 127.97–131.61 · P · #42「From masked pre-training days」#43「To recursive self-upgrade」
//   画面：#42：一行墨色涂黑条，唱到的词把条子推到右边（redactRow 自己画，理由在下面）。#43：一台机器在自己的
//        屏幕（眼睛的位置）里画出一台更小的自己，再在那台里画更小的……（5 层嵌套，每拍一层，同心套在同一个眼睛上）。
//        焦点：最里层那台机器的眼睛。
//   运镜：insert { at: 'recursive' 的 start, dur 1.6, amt 0.8 }（一层层往里钻）。这一镜推得动，是因为歌词进了
//        屏幕层：场景画布上不再有 MV.keep，kits/camera.js 的 safeZoom 没有框可以钳（第二轮之前 #43 那句
//        stamp M 下区的 keep 底边 y 960 离相机的 keep 边只差 14 px，insert 被限到 3.7 %，只能靠场景自己
//        叠 1.45× 放大假装推进——那一段现在删掉了，推进由相机真的完成）。
//   歌词：#42 `redact` L 上区、#43 `stamp` M 下区，两段都走 MV.overlay（屏幕层）——它们钉在画面上，机器一层层
//        缩进去的时候字不动，也不会被机器的黑框压住（qa: lyric-covered）。
MV.scene('masked', {
  init(MV) {
    this.L42 = MV.lyrics.get('From masked pre-training days');
    this.L43 = MV.lyrics.get('To recursive self-upgrade');
  },
  /**
   * The redaction row, drawn here rather than with `redact`: that treatment leaves each bar parked just right of its
   * word, and the three decorative "dead" bars of `o.extra` are added after EVERY word, so with one call per word
   * (the only way a bar stays off the NEXT word) four words pile twelve parked bars onto the left margin — in the
   * stills that read as a black blob that also hung over 'days'. Here every sung word lies under one ink bar of its
   * own that slides off to the right and is gone; only 'days' gets the three bars that never move (the answer is
   * redacted), placed clear of the ink.
   */
  redactRow(g, f, C, line, size, maxW) {
    const ws = WD.words(f, line);
    SG.display(g, size);
    const sp = g.measureText(' ').width;
    const rows = []; let cur = [], wsum = 0, asc = 0;
    for (const w of ws) {
      const ww = g.measureText(w.text).width;
      asc = Math.max(asc, g.measureText(w.text).actualBoundingBoxAscent);
      if (cur.length && wsum + sp + ww > maxW) { rows.push(cur); cur = []; wsum = 0; }
      wsum = cur.length ? wsum + sp + ww : ww;
      cur.push(w);
    }
    if (cur.length) rows.push(cur);
    const lh = size * 1.14, barH = size * 1.02, off = size * 0.16;
    rows.forEach((row, ri) => {
      const base = 120 + asc + ri * lh;                 // baseFor('top') = 120 + the ink's ascent
      let x = SG.SAFE;
      for (const w of row) {
        SG.display(g, size);
        const ww = g.measureText(w.text).width;
        if (f.t >= w.start) {
          const bw = ww + off * 2, bx = x - off;
          const k = ease.outCubic(clamp((f.t - w.start) / 0.10));
          const dx = k * (bw + ww + size * 0.3);
          // the word goes down first, then the bar that covers it, slid on by `k`: one fillText per word (so qa can
          // measure it) and above the bar, so nothing ever covers ink that is already being sung (qa: lyric-hidden)
          g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
          g.fillText(w.text, x, base);
          g.save();
          g.beginPath(); g.rect(bx, base - asc - barH * 0.6, bw, asc + barH * 1.2); g.clip();   // the bar leaves its own word: nothing is parked on the next one
          g.fillStyle = C.ink;
          g.fillRect(bx + dx, base - asc - barH * 0.10, bw, barH);
          g.restore();
        }
        x += ww + sp;
      }
      const end = x - sp + size * 0.4;
      if (ri === rows.length - 1) {                     // the answer, redacted: three bars that never slide
        let bx = end;
        for (let e2 = 0; e2 < 3; e2++) {
          const bw = size * (1.2 + 0.35 * e2);
          g.fillStyle = C.ink;
          g.fillRect(bx, base - asc - barH * 0.12, bw, barH);   // centred on the line, so the three read as redaction
          bx += bw + size * 0.30;
        }
      }
    });
  },
  render(g, f) {
    SG.bg(g, 'P');
    const cur = WD.current(f);
    const on42 = !!cur && cur.line === this.L42;
    const on43 = !!cur && cur.line === this.L43;
    // The nested machines sit high in the frame: the punch-in is 1.86× now (it used to be 3.7 %), and with the eye at
    // y 570 the outer machine's bottom edge (y + 110·s·z) came up through the overlaid lyric at y ~880 (qa:
    // lyric-covered). At CY 495 the outer edge lands at ~741, so the frame above the lyric's ink (top ~864) stays
    // paper and the machine bleeds off the top instead. STEP 0.60 keeps all five levels legible at that size.
    const CX = 960, CY = 495, S0 = 1.60, STEP = 0.60, LEVELS = 5;
    if (on43) {
      // one nested machine per beat: the machine and the copy on its screen arrive together with the line's first
      // word, then every beat adds one more level (all five are on screen ~0.45 s before the cut). No extra scale of
      // its own: the punch-in is the timeline's insert now (see the note at the top).
      const t0 = this.L43.words[0].start;
      const beats = f.audio.beats.filter(b => b >= t0 + 0.02);
      const blink = clamp(f.a.snare * 1.25);
      for (let i = 0; i < LEVELS; i++) {
        const at = i < 2 ? t0 : (beats[i - 2] != null ? beats[i - 2] : t0 + (i - 1) * 0.45);
        const k = ease.outCubic(clamp((f.t - at) / 0.30));
        if (k <= 0) break;
        const s = S0 * Math.pow(STEP, i) * (0.74 + 0.26 * k);
        SG.machine(g, CX, CY, s, { gaze: [0.20 * Math.sin(f.t * 0.7 + i), 0.14 * Math.cos(f.t * 0.5 + i)],
                                   blink: blink, focus: false });
      }
    }
    MV.focus(CX, CY, 'innermost eye');
    // 歌词（屏幕层，最后画）：#42 一行涂黑条（上区，L）；#43 stamp M 下区
    MV.overlay(o => {
      if (on42) this.redactRow(o, f, SG.C, this.L42, SG.SIZE.L, W - 2 * SG.SAFE);
      if (on43) WD.line(o, f, { line: this.L43, treat: 'stamp', size: 'M', zone: 'low' });
    });
    return {};
  },
});
