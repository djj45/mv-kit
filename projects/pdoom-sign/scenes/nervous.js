// 02 nervous · 5.701–9.337 · P · 机器背后的走线沿网格折向小人
//   画面：小人（s = 1.2，x 520，左）与机器（右，s = 1.0）；机器背后伸出 3 根 34 px 粗的直角走线（电路），沿网格
//        折向小人，在 #1 期间逐段画出（按词推进：'Your' / 'circuits' / 'make' / 'me' / 'nervous,' 的 start 驱动生长）；
//        小人姿态 stand → cower，每个军鼓抖 ±6 px。
//   焦点：小人的头。 歌词：#1 sign M，牌子在上区左侧（x = SG.SAFE，宽 ≤ 1100）；#2 label S，at = 小人头顶。
//   切出：硬切。
MV.scene('nervous', {
  /** see the note in scenes/cover.js: SG.figure measures a pose's head from the hip, a pictogram head sits 150 above it */

  /** the three traces, every corner on the 24 px grid: out of the machine's back (left) edge, one fold, then in */
  wires: [
    [[1330, 600], [1008, 600], [1008, 480], [720, 480]],
    [[1330, 672], [864, 672], [864, 768], [672, 768]],
    [[1330, 744], [1176, 744], [1176, 864], [624, 864]],
  ],

  /** the polyline drawn up to `u` segments (u = 0 … n−1, fractional): a trace grows away from the machine */
  upto(pts, u) {
    const n = pts.length - 1, out = [pts[0]];
    for (let i = 0; i < n; i++) {
      if (u >= i + 1) { out.push(pts[i + 1]); continue; }
      if (u > i) out.push([lerp(pts[i][0], pts[i + 1][0], u - i), lerp(pts[i][1], pts[i + 1][1], u - i)]);
      break;
    }
    return out;
  },

  render(g, f) {
    SG.bg(g, 'P');
    const line1 = f.lyrics.get('Your circuits'), line2 = f.lyrics.get("that's no surprise"), ws = line1.words;

    // How far through #1 we are, in words — continuous between word starts, so the traces are drawn *by the words*
    // (0 at "Your", 1 at "circuits", … 4 by "nervous,"): each trace owns a third of that clock and grows segment by
    // segment as it arrives.
    let u = 0;
    for (let i = 0; i < ws.length; i++) {
      const a = ws[i].start, b = ws[i + 1] ? ws[i + 1].start : ws[i].end + 0.35;
      if (f.t >= a) u = i + clamp((f.t - a) / Math.max(0.12, b - a));
    }
    const grow = u / (ws.length - 1);

    // the traces first, then the machine over their near ends (they come out of its back)
    for (let i = 0; i < this.wires.length; i++) {
      const local = clamp(grow * this.wires.length - i);
      if (local <= 0) continue;
      SG.poly(g, this.upto(this.wires[i], local * (this.wires[i].length - 1)), {});
    }
    SG.machine(g, 1440, 672, 1.0, { gaze: [-0.9, -0.12], fill: SG.C.paper2, name: 'machine eye' });

    // The figure at the left. It stands while the traces arrive, then folds up as the second line lands; the pose
    // switches on the drawing cadence (f.tq), one drawing at a time, like a card being turned over.
    const FX = 520, FY = 700, FS = 1.2;
    const kv = ease.inOutQuad(clamp((f.tq - line2.words[0].start) / 0.6));
    const fig = SG.figure(g, FX, FY, FS, (SG.pose(SG.POSE.stand, SG.POSE.cower, kv)), { name: 'the figure' });

    // The lines last. #1 (and the tail of the line before it, still being sung at 5.70) rides the sign plate — both
    // wrap to the same two rows, so the board does not change shape at the cut. #2 is the small printed label on the
    // object, with its hairline leader to the top of the figure's head; dx / dy keep the small text in the free cell
    // between the top trace (y 480) and the middle one (y 672) instead of letting the words land on a trace — ink on
    // ink is unreadable, and qa counts it as a faint word. Both are printed on things in this picture, so both stay
    // on the scene canvas (round 2 §4): the plate hangs in the room and the leader is tied to the figure's head.
    // Nothing here punches in, so there is no insert for their keep boxes to clamp.
    const cur = WD.current(f);
    if (cur && cur.line === line2) {
      WD.line(g, f, { treat: 'label', size: 'S', at: [fig.head[0], fig.head[1] - 30 * FS], dx: 100, dy: 80, maxW: 800 });
    } else {
      WD.line(g, f, { treat: 'sign', size: 'M', zone: 'top', x: SG.SAFE, maxW: 1100, name: 'lyric plate' });
    }

    // every snare knocks the page sideways
    return { shake: 6 * f.a.snare };
  },
});
