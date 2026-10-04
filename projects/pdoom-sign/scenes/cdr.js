// 25 cdr · 84.79–88.88 · P · #26「Without a single CDR」
// Picture: a folder (ink frame) holding a form. The field CRITICAL DESIGN REVIEW is empty — the yellow underline
// in its value column flashes once per beat — and the pictogram figure stands at the left, pointing at the blank
// (and jabbing at the beat). focus: the empty field.
// Lyric: sign M, top zone — left on the scene canvas, not moved to the screen layer: a `sign` is a plate on the
// page, a thing in the picture (round 2 §4), and this shot has no insert for its keep box to clamp — the plate's
// box already reaches into the top margin, so kits/camera.js skips it and the slow push runs at full strength
// (measured 3.8 % at the end of the shot).
MV.scene('cdr', {
  /** the one-line workaround for the head offset, copied from scenes/cover.js — delete when lib/sign.js is fixed */
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    // the folder: the tab is drawn first, the body's border cuts its foot off
    MV.group('folder', () => {
      g.save();
      g.fillStyle = C.paper2; g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate; g.lineJoin = 'round';
      SG.rr(g, 420, 292, 300, 88, 20); g.fill(); g.stroke();
      SG.rr(g, 420, 352, 1280, 568, 50); g.fill(); g.stroke();
      g.restore();
      MV.box(g, 420, 352, 1280, 568, { name: 'folder' });
    });
    // the form
    const T = BOX.table(g, 470, 430, 2, 4, { cw: [880, 300], rh: 92, color: C.ink, lw: SG.LW.rule, name: 'CDR form' });
    const rows = [['DOCUMENT', 'SN-26'], ['REVIEW BOARD', '3'], ['CRITICAL DESIGN REVIEW', ''], ['SIGNED BY', '']];
    rows.forEach((r, i) => {
      BOX.cell(g, T, 0, i, r[0], { size: 52, font: SG.mono, color: C.ink, pad: 26 });
      BOX.cell(g, T, 1, i, r[1], { size: 52, font: SG.mono, color: C.ink, pad: 26 });
    });
    // the empty field: a hairline, and a yellow underline that flashes on every beat
    const bx = T.colX[1] + 26, bw = T.cw[1] - 52, by = T.rowY[2] + T.rh * 0.62;
    const flash = 1 - clamp((f.beat - Math.floor(f.beat)) / 0.45);
    g.save();
    g.fillStyle = C.ink2; g.fillRect(bx, by, bw, SG.LW.rule);
    g.fillStyle = C.yellow; g.fillRect(bx, by - 6 * flash, bw, SG.LW.rule + 11 * flash);
    g.restore();
    // the figure, pointing at the blank; it jabs on the beat (the pose switches on the drawing tick)
    const jab = 0.18 * (1 - clamp((f.tq - f.audio.beatBefore(f.tq)) / 0.4));
    SG.figure(g, 250, 880, 0.95, (SG.pose(SG.POSE.point, SG.POSE.reach, jab)), { focus: false });
    MV.focus(T.colX[1] + T.cw[1] / 2, T.rowY[2] + T.rh / 2, 'empty field');
    WD.line(g, f, { treat: 'sign', size: 'M', zone: 'top' });
  },
});
