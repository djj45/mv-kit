// timeline.js — 剪辑。每一条的切点要么是小节头，要么是某个字被唱到的那一瞬间：不手写秒数。
// 从上往下读就是这部片子：42 条，九个乐章。两个语域的来回就是全片的"换气"：
//   PLATE（纸 + 墨）→ reflow 升空 → VOID（黑 + 光）→ reflow 落回 → PLATE
//
// 默认硬切。要转场就得有东西跨过切点，每条都写了理由：
//   · wipe 'reflow' — 纸上的墨点飞成黑里的光点（同一个零件的两种存在方式），全片只有三次
//   · wipe 'glitch' — 副歌砸下来：帧被撕开，新镜头从裂缝里进来
//   · wipe 'pan'    — 同一张图纸的下半部分，镜头向下移
//   · carry()       — 上一镜的东西飞过接缝，两镜是同一个空间
MV.timeline(({ lyrics, audio, cut, start, T0, T1 }) => {
  // 切点词汇表：S = 那个字被唱到的瞬间；C = 「那个字之前的那一拍」；nb = 离 t 最近的小节头。
  const S = (q, n) => start(q, n);
  const C = (q, n) => cut(q, n);
  const nb = t => audio.nearestDownbeat(t);
  // 每条只写 from；to 自动接到下一条的 from（加上下一条 fadeIn 的重叠），保证没有空档、没有盖住。
  const cuts = [
    // ── 乐章 1 · 图纸（0:00–0:22.8）PLATE ────────────────────────────────────────────────────────────
    { t: T0, scene: 'plot', note: '冷开场：绘图仪从图纸左上角落笔，第一句被画出来', insert: { at: T0 + 2.5, dur: 1.7, amt: 0.30 } },
    { t: C('Your circuits'), scene: 'circuits', note: '硬切在小节头：画面从"画一只眼"变成"画一整套神经"，还是同一张纸', insert: { at: 6.6, dur: 1.4, amt: 0.26, x: 700, y: 470 } },
    { t: C('sudden drop'), scene: 'loss_drop', note: '硬切在小节头：图框从右上移到左下，曲线自己掉出画面' },
    { t: C('servant'), scene: 'servant', note: '硬切：同一张纸的另一个零件（人被当成零件标注）', insert: { at: 15.66, dur: 0.95, amt: 0.30, x: 1290, y: 330 } },

    // ── 乐章 2 · 进料（0:16.6–0:22.8）→ 墨升空 ──────────────────────────────────────────────────────
    { t: S('ChatGPT'), scene: 'maw', fadeIn: 0.25,
      note: '软接 0.25 s：进料口不是新的一张纸，是这张纸被卷进去',
      warp: { at: 21.7, dur: 1.25, from: 0, to: 0.62, pitch: 0.10, dist: 1.5, bg: LK.void },
      insert: { at: 20.4, dur: 1.2, amt: 0.24, x: 960, y: 430 } },
    { t: nb(22.46), scene: 'gauge', params: { n: 1 }, fadeIn: 0.9, wipe: 'reflow',
      note: 'REFLOW：纸上的墨点离纸飞进黑里（第 1 次换语域）。落在小节头，比副歌早 0.7 s 到位' },

    // ── 乐章 3 · HOOK 1 + 中文屋（0:22.8–0:38.4）VOID ───────────────────────────────────────────────
    { t: S('future goes'), scene: 'foom', note: '硬切在字上：进副歌第二句，曲线起身' },
    { t: S('Trapped'), scene: 'room', note: '硬切在字上：箱子出现' },
    { t: S('See through'), scene: 'shoggoth', note: '硬切在字上：箱子里长出不讲道理的几何' },
    { t: S('with your shinigami'), scene: 'eyes', note: '硬切在字上：全部收成一只眼' },

    // ── 乐章 4 · 点火（0:38.4–0:53.0）──────────────────────────────────────────────────────────────
    { t: nb(38.5), scene: 'stable',
      insert: { at: 39.86, dur: 1.10, amt: 0.20, ease: ease.outCubic },
      note: '硬切到小节头：最安静的一镜，为引爆留出落差；唱完 "stable" 后笔尖离纸，镜头跟着那个光点走' },
    { t: C('singularity'), scene: 'singularity', note: '硬切在字之前的一拍：唱到"singularity"时核心已经在烧' },
    { t: S('optimizing'), scene: 'accel', note: '硬切在字上：镜头被推进环列' },
    { t: S('atoms'), scene: 'atoms', note: '硬切在字上：物质重新结晶' },

    // ── 乐章 5 · HOOK 2 + 市场（0:53.0–1:09.3）─────────────────────────────────────────────────────
    { t: nb(52.9), scene: 'sydney', note: '硬切：一整块黑里只剩一块终端' },
    { t: nb(58.4), scene: 'gauge', params: { n: 2 }, fadeIn: 0.35, wipe: 'glitch',
      note: 'GLITCH：撕裂的帧里进来，比第 1 次更大' },
    { t: S('basilisk'), scene: 'basilisk', note: '硬切在字上：表盘碎掉，蛇升起来' },
    { t: S('NVDA'), scene: 'market', note: '硬切在字上：行情图' },
    { t: S('E thirty'), scene: 'flops', note: '硬切在字上：数字' },

    // ── 乐章 6 · 装配（1:09.3–1:29.3）PLATE 回来 ───────────────────────────────────────────────────
    { t: nb(69.6), scene: 'reckoned', fadeIn: 0.8, wipe: 'pan', params: { dir: 'down' },
      insert: { at: 70.2, dur: 1.5, amt: 0.34, x: 790, y: 632 },
      note: 'PAN 向下：不是新的一张纸，是同一张图纸的下半部分（纸回来了）' },
    { t: C('Forward MLP'), scene: 'backprop', note: '硬切在小节头：图框换到剖面' },
    { t: C('von Neumann'), scene: 'obsolete', note: '硬切：旧架构' },
    { t: C('Sharp left'), scene: 'leftturn', note: '硬切：图纸整体开始转' },
    { t: C('CDR'), scene: 'nocdr', note: '硬切：连杆被拉断' },

    // ── 乐章 7 · 安静的中段（1:29.3–1:49.3）───────────────────────────────────────────────────────
    { t: nb(89.3), scene: 'gato',
      insert: { at: 90.6, dur: 3.6, amt: 0.28, ease: ease.inOutQuad },
      note: '硬切在小节头：段落能量掉到 0.03，画面也空掉；镜头从头到尾跟着那根线的线尖' },
    { t: nb(94.9), scene: 'gauge', params: { n: 3 },
      insert: { at: 94.95, dur: 1.45, amt: 0.30, x: 960, y: 424 },
      note: '硬切：同一个仪表，这次画在纸上、几乎不动（镜头替他慢慢地推近）' },
    { t: nb(96.6), scene: 'clips',
      insert: { at: 96.75, dur: 1.5, amt: 0.34 },
      note: '硬切：屋子里开始长回形针；镜头跟着最新长出来的那一行' },
    { t: C('Killswitch'), scene: 'killswitch', note: '硬切：全片唯一的笑点' },
    { t: C('nowhere'), scene: 'nowhere', note: '硬切：图框向内合' },
    { t: C('Too late'), scene: 'fuse',
      insert: { at: 103.4, dur: 2.0, amt: 0.42 },
      note: '硬切：火沿着画好的线烧；镜头跟着火头一路走过去' },
    { t: nb(105.6), scene: 'ortho', fadeIn: 0.9, wipe: 'reflow',
      note: 'REFLOW：烧掉的墨升空（第 2 次换语域）。两段独奏从这里开始' },

    // ── 乐章 8 · 失控（1:49.3–2:12.9）最响、最快、最密 ─────────────────────────────────────────────
    { t: nb(109.3), scene: 'stack', note: '硬切在小节头（段落能量 0.92）：层叠开始无限往上长' },
    { t: S('disobey'), scene: 'disobey', note: '硬切在字上：结构撑破自己的框' },
    { t: nb(116.6), scene: 'fence', note: '硬切在小节头：一段镜头内部两次重构图（栅栏 → 十万机柜），不切' },
    { t: nb(120.2), scene: 'askew', note: '硬切：整个坐标系开始歪' },
    { t: nb(123.8), scene: 'gauge', params: { n: 4 }, fadeIn: 0.3, wipe: 'glitch',
      carry: (g, k, e, t) => carryNeedle(g, k, t),
      note: 'GLITCH + CARRY：指针的残影飞过接缝（上一镜和这一镜是同一只表）' },
    { t: nb(125.6), scene: 'loom', note: '硬切：织机' },
    { t: nb(127.5), scene: 'masked', note: '硬切：织出一条黑带，黑带推进成递归（内部重构，不切）' },

    // ── 乐章 9 · 眼合上 / 落回纸面（2:12.9–2:36.7）─────────────────────────────────────────────────
    { t: nb(131.2), scene: 'ilya', note: '硬切在小节头：全片最大的一只眼开始合' },
    { t: nb(136.6), scene: 'show', fadeIn: 1.0, wipe: 'reflow',
      warp: { at: 136.61, dur: 1.7, from: 0.55, to: 0, pitch: 0.08, dist: 1.55, bg: LK.void },
      note: 'REFLOW：光点落回纸上成墨（第 3 次换语域）。最后一句歌词在这里' },
    { t: nb(143.9), scene: 'file',
      warp: { at: 147.5, dur: 1.8, from: 0, to: 0.58, pitch: 0.12, dist: 1.5, bg: LK.mix(LK.paper, LK.ink, 0.3) },
      note: '硬切在小节头：尾奏 13 s，图纸先被验收、再整块立起来转走' },
    { t: nb(149.3), scene: 'out', note: '硬切：最后一根还在放电的线；三次放电的间隔越来越长' },
  ];
  // from/to 由相邻两条推出来：前一条要延续到后一条 from + fadeIn，否则淡化到一半会跳。
  return cuts.map((c, i) => {
    const nx = cuts[i + 1];
    const e = { scene: c.scene, from: c.t, to: nx ? nx.t + (nx.fadeIn || 0) : T1 };
    if (c.params) e.params = c.params;
    if (c.fadeIn) { e.fadeIn = c.fadeIn; e.wipe = c.wipe; }
    if (c.carry) e.carry = c.carry;
    // 镜头语言（insert 局部放大+跟随 / warp 二维转三维 / push 缓慢推近）在这里透传——
    // 漏掉这一段的后果是：lib/look.js 那边一条都收不到，参数写了等于没写。
    if (c.insert) e.insert = c.insert;
    if (c.warp) e.warp = c.warp;
    if (c.push != null) e.push = c.push;
    return e;
  });
});

/** 跨过接缝的指针残影：第 4 次 hook 接织机时，上一镜的指针还飞在空中。 */
function carryNeedle(g, k, t) {
  const x = W * (0.5 + 0.55 * (1 - k)), y = H * 0.52 - k * 40;
  g.save();
  g.globalAlpha = (1 - k) * 0.85;
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = LK.a(LK.blue, 0.9); g.lineWidth = 5 * (1 - k) + 1;
  g.beginPath(); g.moveTo(x - 130, y + 26); g.lineTo(x, y - 20); g.stroke();
  g.strokeStyle = LK.a(LK.hot, 0.9); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(x - 130, y + 26); g.lineTo(x, y - 20); g.stroke();
  g.restore();
  void t;
}
