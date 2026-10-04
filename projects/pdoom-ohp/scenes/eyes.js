// scenes/eyes.js — shinigami eyes: two eyes as big as the sheet, and a lifespan counting down inside each pupil.
MV.scene('eyes', {
  render(g, f) {
    OHP.back(g, f, { cold: 0.25 });
    const L0 = f.lyrics.get('shinigami');
    const drawn = prog(f.t, L0.words[0].start - 0.9, L0.words[0].start + 0.9, ease.outCubic);
    const eyes = [[560, 470, 300], [1360, 470, 300]];
    for (let e = 0; e < 2; e++) {
      const [ex, ey, ew] = eyes[e];
      const open = drawn * (1 - 0.06 * Math.max(0, noise1(f.t * 3 + e * 4, 6)));
      // the eye: an almond made of two lids
      const lid = (up) => {
        const pts = [];
        for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([ex + (u - 0.5) * ew * 2, ey + up * Math.sin(u * Math.PI) * ew * 0.72 * open]); }
        return pts;
      };
      OHP.ink(g, f, lid(-1), { w: 12, color: OHP.C.ink, seed: 3 + e, boil: 1.5 });
      OHP.ink(g, f, lid(1), { w: 12, color: OHP.C.ink, seed: 5 + e, boil: 1.5 });
      // the iris and the pupil
      const ir = ew * 0.52 * open;
      g.save();
      g.strokeStyle = OHP.C.blue; g.lineWidth = 7;
      for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; g.beginPath(); g.moveTo(ex + Math.cos(a) * ir * 0.72, ey + Math.sin(a) * ir * 0.72); g.lineTo(ex + Math.cos(a) * ir, ey + Math.sin(a) * ir); g.stroke(); }
      g.restore();
      g.fillStyle = '#1C1F27';
      g.beginPath(); g.arc(ex + 12 * noise1(f.t * 0.7 + e, 2), ey, ir * 0.64, 0, TAU); g.fill();
      // the countdown
      if (e === 0) {
        const left = Math.ceil(Math.max(0, 46 - (f.t - L0.words[0].start) * 7.5));
        BOX.center(g, String(left), ex + 12, ey, { size: 40, font: OHP.F.mono, color: '#F1E7CF' });   // ink-centred in the pupil
        MV.focus(ex, ey, 'the countdown');
      }
      // the shine
      OHP.glowDot(g, ex - ir * 0.5, ey - ir * 0.5, ir * 0.5, 'rgba(255,252,240,ALPHA)', 0.5 * open);
    }
    OHP.dust(g, f, {});
    OHP.slide(g, f, 10, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 260, y: 930, size: 60, style: 'hand', maxW: 1400 });
    return OHP.post(f, { shake: 4, snare: 0.05, vignette: 0.42 });
  },
});

