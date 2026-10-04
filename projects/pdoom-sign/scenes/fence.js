// 33 fence · 114.79–118.88 · P · #36「Post-Chinchilla, super-dense」+ #37「Breaking through each safety fence」
//   画面：一排警戒围栏（3 段，每段 = 两根立柱 + 一块警戒条横板）横在画面中部；上面一大块方阵
//        （16 × 8 的实心墨块，格子之间留 30 px 纸白，"super-dense"）往下压；'Breaking' 的 start：方阵砸到围栏上，
//        三段围栏依次被撞飞（旋转 + 飞出画面下角）。
//   焦点：中间那段围栏（它飞出去以后改成缺口中点 —— 焦点不能跟着主体出画）。
//   歌词：#36 stamp M 上区，画在屏幕层的一条纸带上 —— 方阵是实心墨块，字直接压上去就看不见了，纸带和字一起
//        在屏幕层（0.25 em 纸色底），方阵从纸带底下压过去。
//        #37 tape，angle −12°，胶带算印在物体上，留在场景里：被撞的那一瞬胶带在右端断开，文字跟着落下的
//        那一半走（o.x / o.y 推着整条 tape 平移，纸带带着字，永远不会被裁掉）；留在原处的一小截由场景自己画。
//   注一：方阵第一轮是 64×36 的 ink2 小格子，整块读成灰色网点（和字同色系）；现在 16×8 的 ink 实心块，
//        少而大、格间留纸白（§3 的要求）。
//   注二：围栏飞出去的方向改了（原来是往上）：墨块把上半画面盖满以后，往上飞的三段一进墨块就没了；
//        现在是往下、往画面下角去，一直落在方阵前面的空纸里，被撞飞的读法反而更清楚。
MV.scene('fence', {
  init() {
    // the "super-dense" block: 16 × 8 ink squares, 90 px in a 120 px cell (30 px of paper between them) — static,
    // built once. 16 × 120 = the full width, so the block presses down as a wall, not as a card.
    const NC = 16, NR = 8, PITCH = 120, SQ = 90;
    this.SQ = SQ; this.PITCH = PITCH; this.NR = NR; this.HGT = NR * PITCH;
    this.grid = [];
    const x0 = (W - NC * PITCH) / 2;
    for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) this.grid.push([x0 + c * PITCH, -(NR - r) * PITCH]);
  },
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'P');
    const T0 = f.lyrics.findWords('Breaking')[0].start;              // the crash (117.02) — and the tape snapping
    const cur = WD.current(f);
    const L37 = f.lyrics.findWords('Breaking')[0].line;
    const isBreak = !!cur && cur.i === L37;                          // #37 is the tape line, everything else is #36

    // ── the dense block pressing down: its leading edge walks down to the top of the fence by 'Breaking', then
    // through it. Solid ink on paper: the block reads as a wall, and the fence falls into the paper in front of it.
    const by = f.t < T0 ? 300 + 360 * ease.inQuad(clamp((f.t - f.from) / Math.max(0.01, T0 - f.from)))
                        : 660 + 380 * ease.outCubic(clamp((f.t - T0) / 1.5));
    g.fillStyle = C.ink;
    for (const [x, dy] of this.grid) {
      const y = by + dy;
      if (y < -this.PITCH || y > H) continue;
      g.fillRect(x + (this.PITCH - this.SQ) / 2, y + (this.PITCH - this.SQ) / 2, this.SQ, this.SQ);
    }

    // ── the fence: 3 segments, each two posts and one hazard-stripe rail; hit in turn — middle, left, right
    const SEG = [[80, 600], [700, 1220], [1320, 1840]];
    const RAIL0 = 700, RAIL1 = 820, FY = 900, POST = 240, CYSEG = (RAIL0 + RAIL1) / 2;
    const hitAt = i => T0 + (i === 1 ? 0 : i === 0 ? 0.10 : 0.20);
    // knocked down and out to the bottom corners: they stay in the paper in front of the block for the whole flight
    const DIR = [[-0.72, 0.68], [0.12, 0.92], [0.74, 0.66]], ROT = [-0.60, 0.66, 0.80];
    SEG.forEach(([x0, x1], i) => {
      const k = ease.outCubic(clamp((f.t - hitAt(i)) / 0.75));
      const px = (x0 + x1) / 2 + DIR[i][0] * 820 * k, py = CYSEG + DIR[i][1] * 820 * k;
      g.save();
      g.translate(px, py); g.rotate(ROT[i] * k); g.translate(-(x0 + x1) / 2, -CYSEG);
      g.fillStyle = C.ink;
      SG.rr(g, x0, FY - POST, 34, POST, 6); g.fill();
      SG.rr(g, x1 - 34, FY - POST, 34, POST, 6); g.fill();
      SG.stripes(g, x0, RAIL0, x1 - x0, RAIL1 - RAIL0, { period: 48, phase: f.t * 70 });
      g.restore();
    });

    // ── the bit of tape left hanging on the right: same geometry as WD.line's tape, drawn in its old frame
    if (isBreak && f.t >= T0) {
      const kb = ease.outCubic(clamp((f.t - T0) / 0.9));
      SG.display(g, SG.SIZE.M);
      const sp = g.measureText(' ').width;
      let tw = 0;
      cur.line.words.forEach((w, i) => { tw += g.measureText(w.w).width + (i ? sp : 0); });
      const h = SG.SIZE.M * 1.7, bandEnd = (tw + SG.SIZE.M * 1.1) / 2, tipEnd = bandEnd + h * 1.1;
      const xs = 420;                                                // where it snapped, in the tape's own frame
      g.save();
      g.translate(960, 440 - 6 * kb); g.rotate(-12 * Math.PI / 180);
      g.translate(xs, 0); g.rotate(0.34 * kb); g.translate(-xs, 0);   // the stub swings down about the break
      SG.stripes(g, xs, -h / 2, tipEnd - xs, h, { angle: 45, period: h * 0.75, phase: f.t * 90 });
      g.fillStyle = C.paper; g.fillRect(xs, -h * 0.40, bandEnd - xs, h * 0.80);
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.rule; g.lineCap = 'round';
      g.beginPath();                                                  // the frayed end
      g.moveTo(xs, -h * 0.42); g.lineTo(xs - 22, -h * 0.20); g.lineTo(xs, h * 0.02); g.lineTo(xs - 18, h * 0.30); g.lineTo(xs, h * 0.42);
      g.stroke();
      g.restore();
    }

    // ── the lyric. #36: the stamp on the screen layer's paper band (the block presses under it, the words stay put);
    //    #37: the tape, angle −12°, whose lower half falls away with the words — printed on the object, so it stays
    //    on the scene canvas and the camera moves it.
    MV.overlay(o => {
      const c = WD.current(f);
      if (!c || c.i === L37) return;
      const LO = { treat: 'stamp', size: 'M', zone: 'top', align: 'center', maxW: 1500 };
      const m = WD.measure(o, f, LO);                                // the line wraps onto one row: measure == stamp
      if (m) {
        const p = m.size * 0.25;                                     // 0.25 em of paper on every side of the ink
        o.fillStyle = C.paper;
        o.fillRect(m.x - p, m.y - p, m.w + 2 * p, m.h + 2 * p);
      }
      WD.line(o, f, LO);
    });
    if (isBreak) {
      const kf = ease.outCubic(clamp((f.t - T0) / 0.9));
      WD.line(g, f, { treat: 'tape', size: 'M', angle: -12, x: 960 - 80 * kf, y: 440 + 250 * kf });
    }

    // focus: the middle segment while it is still in the picture, then the gap it left
    const kMid = ease.outCubic(clamp((f.t - T0) / 0.75));
    if (kMid < 1 && CYSEG + 754 * kMid < 940) MV.focus(960 + 98 * kMid, CYSEG + 754 * kMid, 'middle fence');
    else MV.focus(960, 690, 'the breach');
    return { shake: f.t >= T0 ? 14 * Math.exp(-(f.t - T0) / 0.12) : 0 };
  },
});
