// S32 cdr — an awkward smile over a clipboard (D4): the empty checkboxes light up one by one, none ticked. At the
// end of the shot the city's power goes: the next shot starts in the dark.
MV.scene('cdr', akStill({
  art: 'D4',
  clip: 'D4v',   // the still until the clip is generated and packed
  cam: [[0, { z: 1.06 }], [1, { z: 1.12 }, ease.inOutQuad]],
  snap: { shots: [{ z: 1.06 }, { x: 0.5, y: 0.33, z: 1.55 }, { x: 0.5, y: 0.7, z: 1.4 }] },   // 动感: her awkward smile, then the empty checklist
  fx(g, f, map) {
    const [u, v, w, h] = AK_SPOT.D4.sheet, [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h), n = 6;
    for (let i = 0; i < n; i++) {
      const at = f.from + 0.4 + i * 0.45, k = prog(f.t, at, at + 0.1); if (k <= 0) continue;
      const bx = x0 + (x1 - x0) * 0.1, by = y0 + (y1 - y0) * (0.1 + i * 0.14), s = (y1 - y0) * 0.08;
      akGlowPath(g, gg => { gg.beginPath(); gg.rect(bx, by, s, s); }, 1.4, k * (0.5 + 0.5 * Math.sin(f.t * 6 + i)));
    }
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ['CDR'] },
  post(f) { return { fade: prog(f.t, f.to - 0.05, f.to) }; },
}));
