// scenes/hook.js — the hook, four times. The mark P(doom) is written bigger every chorus (params.n 1..4), the
// paperclips in the beam multiply, and on the fourth the marker tears the sheet.
MV.scene('hook', {
  render(g, f) {
    const n = f.params.n || 1;
    const dark = n === 3, col = dark ? '#F4EEE0' : OHP.C.ink;
    OHP.back(g, f, { dim: dark ? 0.72 : 0, cold: dark ? 0.5 : 0, red: n === 4 ? 0.35 : 0 });
    const big = [130, 190, 250, 330][n - 1];
    const info = OHP.lyricBig(g, f, {
      x: 230, y: 700, small: [96, 110, 124, 140][n - 1], bigSize: big, big: t => /\(?doom\)?/i.test(t), maxW: 1360,
      font: n >= 2 ? OHP.F.mark : OHP.F.mark, color: col, bigColor: dark ? '#F4EEE0' : OHP.C.red, underline: n === 1,
    });
    // the pen tip follows the big word while it is being written
    if (info) {
      let cur = null;
      for (const tk of info.toks) if (tk.sung) cur = tk;
      if (cur && cur.big) {
        const p = clamp((f.t - cur.start) / Math.max(0.1, cur.end - cur.start));
        const tip = [cur.x + cur.w * clamp(p * 1.5) + 78, info.y + 8];
        MV.focus(tip[0], tip[1], 'pen tip');
        if (f.t < f.to - 0.25) OHP.hand(g, f, { tip: tip, s: n >= 3 ? 1.05 : 0.85, ang: n === 4 ? -0.15 : 0.2, alpha: 0.88, alive: f.a.rms });
      }
    }
    // clip shadows in the beam: one more every chorus, there before the line starts
    for (let i = 0; i < n; i++) OHP.clip(g, 220 + i * 150, 300 - i * 40, 118, -0.35 + i * 0.3, 0.5 - 0.06 * i);
    if (n >= 3) {                                             // the sheet has had enough: a tear
      const k = prog(f.t, f.from + 0.2, f.to);
      OHP.ink(g, f, [[1700, 160], [1760, 420], [1690, 700], [1780, 1010]], { w: 4 + 5 * k, color: dark ? '#FFF8E6' : '#EFE6CE', seed: 41, boil: 1.2, alpha: 0.75 });
    }
    OHP.dust(g, f, {});
    OHP.slide(g, f, [6, 15, 24, 32][n - 1], { x: 120, y: 74 });
    return OHP.post(f, { shake: n === 4 ? 10 : 5, snare: n >= 2 ? 0.07 : 0.04, vignette: dark ? 0.55 : 0.38 });
  },
});

