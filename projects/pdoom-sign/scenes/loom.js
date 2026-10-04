// 37 loom · 125.70–127.97 · B · #41「Just as foretold by Loom」
//   画面：从左边一个点长出一棵分叉的树（paper 色 3 px 线，每拍分叉一次，每个分叉末端一个小圆点），像 token 的分支。
//   焦点：最新长出的分叉末端。
//   歌词：`label` S 挂在最右的分支上；'Loom' 单独 L、`key`（两次 WD.line，都传 o.line 把这一句钉住——切进来时
//        上一句「…P(doom)」还在唱，WD.current(f) 那 0.4 s 返回的是它）。key 的黄块只从 'Loom' 前 0.25 s 起画，
//        不然它会提前 1.7 s 空着杵在画面左下。
//   运镜：camera kit 默认缓推（被 label 的 MV.keep 限到 ~1.7 %）；一拍拍长出来的树就是这一镜的姿态变化——切走时
//        它还在长。切出：硬切。
MV.scene('loom', {
  init(MV) {
    this.line = MV.lyrics.get('Just as foretold by Loom');
    // One geometry for the whole shot: a tidy left-to-right tree — the stem at the left point, then one fork per beat
    // (2, 4, 8, 16 branches), every node centred over its two children, so no branch crosses another. Built once;
    // render() only decides how much of it has grown, as a function of t.
    const ROOT = [200, 560], HUB = [440, 560], LX = [640, 830, 1020, 1200], GAP = 40, LEAVES = 16;
    const ny = (k, i) => ROOT[1] + (LEAVES / (1 << k)) * GAP * (i + 0.5) - (LEAVES / 2) * GAP;
    const node = (k, i) => [LX[k - 1], ny(k, i)];                  // a node of level k (1 = first fork … 4 = leaf)
    const segs = [{ k: 0, i: 0, a: ROOT, b: HUB }];
    for (let k = 1; k <= 4; k++) {
      for (let i = 0; i < (1 << k); i++) segs.push({ k, i, a: k === 1 ? HUB : node(k - 1, i >> 1), b: node(k, i) });
    }
    this.segs = segs;
    this.root = ROOT;
  },
  render(g, f) {
    SG.bg(g, 'B');
    const C = SG.C;
    // a fork per beat: level k grows from the shot's (k+1)-th beat, its branches staggered so there is always one
    // "newest" tip — and the tree has finished growing well before the cut. The stem (root → first hub) is the one
    // exception: it draws itself over the shot's first 0.35 s, because the first beat is ~0.6 s in and the shot must
    // not open on bare black (the last word of the previous line is sung out before this cut, so WD.current gives
    // this shot nothing to carry: the picture is the only thing on screen for that half second).
    const beats = f.audio.beats.filter(b => b >= f.from - 0.05 && b <= f.to + 0.05);
    const GROW = 0.22, stemK = clamp((f.t - f.from) / 0.35);
    let newest = null, right = null;
    g.save();
    g.strokeStyle = C.paper; g.lineWidth = SG.LW.rule; g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = C.paper;
    for (const s of this.segs) {
      if (s.k === 0) {                                   // the stem: from the root point, drawn over the first 0.35 s
        if (stemK <= 0) continue;
        const x = lerp(s.a[0], s.b[0], stemK), y = lerp(s.a[1], s.b[1], stemK);
        g.beginPath(); g.moveTo(s.a[0], s.a[1]); g.lineTo(x, y); g.stroke();
        g.beginPath(); g.arc(x, y, stemK >= 1 ? 6 : 7, 0, TAU); g.fill();
        if (!newest) newest = { st: f.from, x, y };
        right = [x, y];
        continue;
      }
      const bi = Math.min(s.k, beats.length - 1);
      const st = (bi >= 0 ? beats[bi] : f.from) + s.i * (0.18 / (1 << s.k));
      const gp = (f.t - st) / GROW;
      if (gp <= 0) continue;
      const k = clamp(gp);
      const x = lerp(s.a[0], s.b[0], k), y = lerp(s.a[1], s.b[1], k);
      g.beginPath(); g.moveTo(s.a[0], s.a[1]); g.lineTo(x, y); g.stroke();
      g.beginPath(); g.arc(x, y, k >= 1 ? 6 : 7, 0, TAU); g.fill();      // a dot at every fork's end
      if (!newest || st > newest.st) newest = { st, x, y };
      if (!right || x > right[0]) right = [x, y];
    }
    if (stemK > 0) { g.beginPath(); g.arc(this.root[0], this.root[1], 10, 0, TAU); g.fill(); }   // the point it grew out of
    g.restore();
    // 歌词（最后画）：'Just as foretold by' 挂在最右的分支上，'Loom' 单独一行 L + 黄块
    WD.line(g, f, { line: this.line, treat: 'label', size: 'S', only: [0, 1, 2, 3], at: right || this.root,
                    dx: 170, dy: -104, color: C.paper, maxW: 720 });
    // 切进来时上一句（36 hook 的「…P(doom)」）还在唱：按 §7.2「一句唱完以后保持到下一句开始」把它画完，
    // 和 36 同款（stamp XL paper 上区居中）——否则句末那个字在 qa 的探测点（start + 0.3 s）时画面上没有字。
    const cur = WD.current(f);
    if (!cur || cur.i !== this.line.i) {
      WD.line(g, f, { treat: 'stamp', size: 'XL', rows: 1, zone: 'top', align: 'center', color: C.paper, maxW: 1600 });
    }
    if (f.t >= this.line.words[4].start - 0.25) {
      WD.line(g, f, { line: this.line, treat: 'stamp', size: 'L', only: [4], key: 'Loom',
                      zone: 'low', align: 'left', x: SG.SAFE, color: C.paper, maxW: 900 });
    }
    const F = newest || { x: this.root[0], y: this.root[1] };
    MV.focus(F.x, F.y, 'new branch tip');
    return {};
  },
});
