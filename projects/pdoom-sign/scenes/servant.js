// 04 servant · 12.974–16.610 · P · 两块标牌：扛着机器的小人 / 戴王冠的大机器
//   画面：两块 SG.plate 左右排开——左牌（560×340）里一个小人 carry 姿态扛着一个小机器；右牌（920×340）里一台大机器
//         （s 1.4），头顶三个黄三角小王冠。'boss' 的 start 时右牌整体放大 1.08（ease.outBack，0.2 s）。
//   焦点：右牌的机器眼睛（SG.machine 自己报）。 运镜：insert（'boss' 的 start − 0.3，0.8 s，amt 0.25）。
//   歌词：step，split [0, 4] → ①「now I'm your servant」②「and you're my boss」，下区；**屏幕层**（MV.overlay）。
//   切出：硬切。
MV.scene('servant', {
  render(g, f) {
    SG.bg(g, 'P');
    const boss = f.lyrics.findWords('boss')[0].start;         // the key the timeline's insert is pinned to

    // Two boards, side by side, inside the page's margins and centred in the band above the caption.
    // ROUND3 §2: the group sits 96 px off every edge and is centred in the space above the words (the caption's
    // first row of ink starts at ≈ 693, so the band is 96 → 645, centre 370) — round 2 had the boards at y 48 with
    // the lower 40 % of the frame left to one line of type. The insert (0.25 on the boss's eye, 1.30 by the end of
    // the shot) has to leave the followed board whole: the machine sits at the board's centre, so the board scales
    // about the camera's own pivot and its 340 px height becomes 340 × 1.08 × 1.30 = 477 → 131 .. 609 on screen,
    // inside the frame and clear of the caption. The left board may be carried off the left edge — it is not the
    // subject, and it carries no text for qa's text-cut.
    const TY = 200, BY = 540, BH = BY - TY;

    // ── the left board (560 × 340): the servant, carrying a small machine. Drawn first, so the last MV.focus of the
    //    frame is the boss's eye (the one the insert follows).
    const LX = 120, LW = 560;
    SG.plate(g, LX, TY, LW, BH, { name: 'servant plate' });
    SG.figure(g, 400, 400, 0.75, SG.POSE.carry, { name: 'the servant' });
    SG.machine(g, 470, 330, 0.35, { gaze: [0.6, -0.1], fill: SG.C.paper2, focus: false });

    // ── the right board (920 × 340): the boss. At 'boss' the whole board — frame, machine and crown — grows 1.08
    //    about its own centre (outBack: it overshoots a hair and settles), which is what "the right plate scales" means.
    const RX = 680, RW = 920, CX = RX + RW / 2, CY = TY + BH / 2;
    const k = 1 + 0.08 * ease.outBack(clamp((f.t - boss) / 0.2));
    g.save();
    g.translate(CX, CY); g.scale(k, k); g.translate(-CX, -CY);
    SG.plate(g, RX, TY, RW, BH, { name: 'boss plate' });
    // the crown: three small warning triangles on its head, the middle one raised (apexes stay inside the board)
    SG.triangle(g, CX - 100, 240, 56, {});
    SG.triangle(g, CX + 100, 240, 56, {});
    SG.triangle(g, CX, 232, 56, {});
    SG.machine(g, CX, CY + 24, 1.25, { gaze: [-0.85, -0.2], fill: SG.C.paper2, name: 'machine eye' });
    g.restore();

    // ── the lyric last, on the screen layer: two numbered steps in the lower zone, printed after the camera so the
    //    insert can push in on the boss's eye without dragging the numbered list with it.
    MV.overlay(o => WD.line(o, f, { treat: 'step', split: [0, 4], size: 'M', zone: 'low', align: 'left', x: SG.SAFE }));
    return {};
  },
});
