// reckoned — "That was safe enough, we reckoned": the pre-flight checklist ticking itself off,
// item by item, on the beat; the last tick turns the whole page red.
MV.scene('reckoned', {
  init() {
    this.items = ['interpretable ……', 'aligned …………', 'contained ……', 'corrigible ……', 'safe enough .'];
    this.stars = OPS.mkStars(240, 161);
  },
  render(g, f) {
    lmBegin('ember');
    lmPoints(lmScreen(), this.stars, { size: 1.1, gain: 0.16, twinkle: 0.4, t: f.t, fog: 90 });
    const gl = lmGlow();
    const bad = prog(f.lt, f.dur * 0.78, f.dur * 0.95);
    // the page
    const x0 = 560, y0 = 300, w = 800, h = 500;
    OPS.stroke(gl, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], { color: bad > 0 ? 'warn' : 'dim', alpha: 0.9, width: 2, closed: true });
    lmTag(gl, 'SAFETY CHECKLIST — REV 4', x0 + 40, y0 + 52, { align: 'left', size: 17, color: bad > 0 ? 'warn' : 'dim' });
    OPS.stroke(gl, [[x0, y0 + 84], [x0 + w, y0 + 84]], { color: 'dim', alpha: 0.6, width: 1.2 });
    let focusPt = [x0 + 90, y0 + 150];
    this.items.forEach((it, i) => {
      const done = f.lt > 0.4 + i * 0.62;
      const y = y0 + 150 + i * 72;
      // the checkbox
      OPS.stroke(gl, [[x0 + 40, y - 18], [x0 + 76, y - 18], [x0 + 76, y + 18], [x0 + 40, y + 18]], { color: done ? (bad > 0 ? 'warn' : 'accent') : 'dim', alpha: done ? 1 : 0.6, width: 1.8, closed: true });
      if (done) {
        const mark = bad > 0 ? '×' : '✓';
        OPS.tick(gl, mark, x0 + 58, y + 1, { size: 30, color: bad > 0 ? 'warn' : 'accent' });
      }
      OPS.tick(gl, it.replace(/[.]/g, m => m), x0 + 110, y, { align: 'left', size: 26, color: done && bad > 0 ? 'warn' : 'fg', alpha: done ? 1 : 0.4 });
      if (done) focusPt = [x0 + 58, y];
    });
    if (bad > 0) lmBig(gl, 'RECKONED ≠ SAFE', W / 2, 222, { size: 58, glitch: bad, t: f.t, color: 'warn' });
    lmEnd(g, { bloom: 1.05 });
    MV.focus(focusPt[0], focusPt[1], 'checklist');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['checks', `${Math.min(this.items.length, Math.floor((f.lt - 0.4) / 0.62) + 1)}/${this.items.length}`], ['signoff', 'RECKONED']] }));
    return {};
  },
});
