// scenes/reckoned.js — the pre-flight checklist: boxes ticked one by one while the line is sung, then the whole
// sheet gets a red SAFE stamp in the corner (clear of the table and of the line).
MV.scene('reckoned', {
  render(g, f) {
    OHP.back(g, f, {});
    const x = 250, y = 250, rows = 6, rh = 92, cw = [820, 420];
    const T = BOX.table(g, x, y, 2, rows, { cw: cw, rh: rh, color: 'rgba(46,40,32,0.55)', lw: 2 });
    const items = ['THERMAL LIMITS', 'EVAL SUITE', 'RED TEAM', 'KILLSWITCH', 'ROLLBACK PLAN', 'MODEL CARD'];
    for (let r = 0; r < rows; r++) {
      BOX.cell(g, T, 0, r, items[r], { size: 40, color: OHP.C.ink, font: OHP.F.type, pad: 20 });
      BOX.cell(g, T, 1, r, ['OK', 'OK', 'OK', 'PTO', 'OK', 'OK'][r], { size: 40, color: r === 3 ? OHP.C.red : OHP.C.green, font: OHP.F.type, pad: 20, align: 'center' });
    }
    // a hand-drawn tick in each row, one every ~0.6 s
    const n = Math.min(rows, Math.floor((f.t - f.from) / 0.62));
    for (let r = 0; r < n; r++) {
      const ty = y + r * rh + rh * 0.5;
      OHP.ink(g, f, [[x + 620, ty], [x + 654, ty + 22], [x + 720, ty - 46]], { w: 9, color: r === 3 ? OHP.C.red : OHP.C.green, seed: 50 + r, boil: 1.0 });
      if (r === n - 1) MV.focus(x + 670, ty - 10, 'the tick');
    }
    if (n === 0) { MV.focus(x + 400, y + rh, 'the table'); }
    // the stamp, last
    const L = f.lyrics.lineAt(f.t, f.from);
    const last = L && L.words[L.words.length - 1];
    const k = last ? prog(f.t, last.start + 0.05, last.start + 0.4, ease.outBack) : 0;
    if (k > 0) OHP.stamp(g, f, 1490, 930, 'SAFE', { size: 84, seed: 4, ang: -0.1, alpha: 0.9 * clamp(k) });
    OHP.dust(g, f, {});
    OHP.slide(g, f, 19, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 280, y: 930, size: 54, style: 'hand', maxW: 1000 });
    return OHP.post(f, { shake: 4, snare: 0.05 });
  },
});

