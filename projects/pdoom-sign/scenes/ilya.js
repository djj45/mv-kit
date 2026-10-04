// 39 ilya · 131.61–137.06 · B · #44「What did Ilya see? We'll never know」
//   画面：黑底，一扇关着的门（paper 色线框），门上一块牌「AUTHORIZED PERSONNEL ONLY」，门缝下透出一条黄色的光
//        （矩形条，宽度随低音呼吸 f.a.low）。焦点：门缝。
//   运镜：insert { at: 'never' 的 start, dur 1.4, amt 0.3 }（推向门缝）。这一节现在真的推得动：'We'll never know'
//        那半句进了屏幕层，场景画布上不再有 MV.keep，safeZoom 没有框可以钳（第二轮之前那句 stamp M 下区报的
//        keep 底边 y 960 离相机的 keep 边只差 14 px，insert 只剩 1.10×）。
//   歌词：词 0–3 `redact` L 上区（唱到的词按 start 揭开；问句后面用 o.extra: 3 加三个装饰涂黑条，永远不走——
//        "答案被涂掉了"）；词 4–6 'We'll never know' `stamp` M 下区。两段都在场景画布上：上区那半句用
//        `o.bar = ink2` 画在纸面上（条子是场景里的墨，跟着镜头动才像印上去的），下区那句是字幕式的，进屏幕层
//        （MV.overlay）——钉在画面上不动，门推上来也不会被压在底下（qa: lyric-covered）。
//   注：黑底上涂黑条用 `o.bar = ink2`（纸白是唱到的字）——条子会滑到后一个词上，同色时 qa 会当成"和背后同色"。
MV.scene('ilya', {
  init(MV) { this.L44 = MV.lyrics.get('What did Ilya see'); },
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'B');
    // ---- the closed door: a paper line frame with one plate on it
    const DX = 740, DY = 320, DW = 440, DH = 470, LW = SG.LW.plate;
    g.save();
    g.strokeStyle = C.paper; g.lineWidth = LW; g.lineJoin = 'round';
    SG.rr(g, DX + LW / 2, DY + LW / 2, DW - LW, DH - LW, 26); g.stroke();
    g.restore();
    g.fillStyle = C.paper; g.beginPath(); g.arc(DX + DW - 76, DY + DH * 0.54, 19, 0, TAU); g.fill();   // the knob
    // ROUND3: the door plate sits 54 px lower on the door (DY + 150, not DY + 96). The question line moved to the
    // screen layer to stop being clipped by the top edge, and the insert (1.34 by the end) then carried the plate
    // up across it (qa box-clash, 17 px through "Ilya"). At DY + 150 the plate's transformed top is 351 — 50 px
    // under the line's ink — and it is still on the door's upper half, above the knob.
    const P = SG.plate(g, DX + 52, DY + 150, 336, 132, { name: 'door plate' });
    BOX.lines(g, P, ['AUTHORIZED', 'PERSONNEL ONLY'], { size: 40, color: C.ink, font: SG.mono, gap: 1.3 });
    // ---- the light under the door: a rectangle whose width breathes with the bass
    const low = f.a.low;
    const gw = DW * (0.34 + 0.62 * low), gh = 14 + 30 * low;
    g.fillStyle = C.yellow;
    g.fillRect(960 - gw / 2, DY + DH + 12, gw, gh);
    // 歌词（屏幕层）：问句 redact L 上区（三个装饰涂黑条永远不走）。第二轮把它留在场景层（涂黑条像纸面的墨），
    // 但 insert 0.3 推到底时整句被顶边切掉一半（qa: text-cut）——按 ROUND3 §1 挪进屏幕层，题字连同条子一起钉住。
    MV.overlay(o => {
      // the door frame is carried up across this line at full punch; a pad of the frame's own colour (ink on black)
      // lets it pass behind the words (ROUND4 §2 — the one exception to §6's "no backing for lyrics", written into
      // the change log). 0.25 em on every side.
      const m = WD.measure(o, f, { line: this.L44, treat: 'redact', only: [0, 1, 2, 3], size: 'L', zone: 'top', align: 'left', x: SG.SAFE, extra: 3 });
      if (m) { o.fillStyle = C.ink; o.fillRect(m.x - m.size * 0.25, m.y - m.size * 0.25, m.w + m.size * 0.5, m.h + m.size * 0.5); }
      WD.line(o, f, { line: this.L44, treat: 'redact', only: [0, 1, 2, 3], size: 'L', zone: 'top',
                      align: 'left', x: SG.SAFE, extra: 3, color: C.paper, bar: C.ink2 });
    });
    // 歌词（屏幕层）：“We'll never know” stamp M 下区：字幕式的那半句
    MV.overlay(o => WD.line(o, f, { line: this.L44, treat: 'stamp', only: [4, 5, 6], size: 'M', zone: 'low', color: C.paper }));
    MV.focus(960, DY + DH + 12 + gh / 2, 'door gap');
    return {};
  },
});
