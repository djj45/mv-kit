// 21 checklist · 69.34–73.88 · P · #22「That was safe enough, we reckoned」
// Picture: a check sheet (BOX.table, 4 rows × 3 columns: ITEM / RESULT / SIGNED, mono one notch under M). One row
// is ticked on each beat, the ☑ drawn inside its cell; at 'reckoned' start an APPROVED stamp comes down (−6°,
// heavy, ink frame) on the sheet's lower right and the timeline's insert is on it. The sheet is stamped on the
// beat, so the frame takes a knock with it. focus: the cell being ticked → the stamp.
// Lyric: step, split [0, 4], top zone — on the screen layer (MV.overlay), so the insert can push for real.
MV.scene('checklist', {
  /** the ☑ of one row: a hairline box and a check, drawn inside that cell of the sheet */
  tick(g, T, col, row, k) {
    const x = T.colX[col] + T.cw[col] / 2, y = T.rowY[row] + T.rh / 2, r = 22 * (1 + 0.35 * (1 - k));
    MV.within(T.owner, () => {
      g.save();
      g.strokeStyle = SG.C.ink; g.lineWidth = SG.LW.rule; g.lineJoin = 'round'; g.lineCap = 'round';
      SG.rr(g, x - r, y - r, 2 * r, 2 * r, 8); g.stroke();
      g.beginPath();
      g.moveTo(x - r * 0.48, y + r * 0.04); g.lineTo(x - r * 0.12, y + r * 0.44); g.lineTo(x + r * 0.54, y - r * 0.46);
      g.stroke();
      g.restore();
    });
  },
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    const rows = [['ITEM', 'RESULT', 'SIGNED'],
                  ['GUARDRAIL', 'PASS', ''],
                  ['KILLSWITCH', 'PASS', ''],
                  ['ALIGNMENT', 'PASS', '']];
    // ROUND3 §1: the sheet has to be whole at full punch. The zoom is about the stamp (1420, 940) and reaches
    // z = 1.3 (insert) × 1.04 (push) = 1.353, so a scene rect x ≥ 442, x + w ≤ 1719, y ≥ 316, y + h ≤ 973 lands
    // inside the frame — and the caption (top zone, back at M now) owns everything above the words' ink at ~395.
    // The sheet therefore lives in scene y ∈ [556, 868]: transformed it runs 420 → 843, i.e. 25 px under the caption
    // and 16 px above the stamp's text (which reaches 81 px above 940). 1100 × 312 at (520, 556).
    const T = BOX.table(g, 520, 556, 3, 4, { cw: [540, 320, 240], rh: 78, color: C.ink, lw: SG.LW.rule, name: 'check sheet' });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        if (!rows[r][c]) continue;
        BOX.cell(g, T, c, r, rows[r][c], { size: r ? 56 : 44, font: SG.mono, color: r ? C.ink : C.ink2,
                                           align: c === 0 ? 'left' : 'center', pad: 18 });
      }
    }
    // one row per beat: row k is ticked on beat k of the shot, and the ☑ lands with the kick
    const b0 = f.audio.beatAt(f.from);
    let rowNow = 0;
    for (let r = 1; r <= 3; r++) {
      const at = f.audio.timeOfBeat(Math.round(b0) + r), k = clamp((f.t - at) / 0.12);
      if (k > 0) { this.tick(g, T, 2, r, k); rowNow = r; }
    }
    // 'reckoned': the stamp comes down over the lower right of the sheet
    const wReck = f.lyrics.findWords('reckoned')[0].start;
    const kStamp = ease.outCubic(clamp((f.t - wReck) / 0.25));
    const SX = 1420, SY = 940;
    if (kStamp > 0) SG.stamp(g, 'APPROVED', SX, SY, 90, { k: kStamp, rot: -6 });
    const cellX = T.colX[2] + T.cw[2] / 2, cellY = T.rowY[Math.max(1, rowNow)] + T.rh / 2;
    const kTo = clamp((f.t - wReck) / 0.25);
    MV.focus(lerp(cellX, SX, kTo), lerp(cellY, SY, kTo), kTo > 0.5 ? 'APPROVED stamp' : 'tick cell');
    // the lyric goes on the screen layer (MV.overlay): a top-zone step caption. On the scene canvas its keep box
    // clamped the insert on the stamp to a few per cent; here the punch-in is free and the words stay put.
    // ROUND3 §1: back to the shot list's M — the sheet was re-laid at scene y ≥ 556 for exactly this reason (its
    // transformed top is 420, the caption's ink ends at ~395).
    MV.overlay(o => WD.line(o, f, { treat: 'step', split: [0, 4], zone: 'top', size: 'M' }));
    return { shake: 5 * f.a.kick + 6 * pulse(f.t, wReck, 0.2) };
  },
});
