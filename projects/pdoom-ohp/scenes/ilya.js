// scenes/ilya.js — back to the eye, enormous and slow, and the pupil is empty: only the reflection of the lamp.
MV.scene('ilya', {
  render(g, f) {
    OHP.back(g, f, { cold: 0.3, dim: 0.1, glow: true });
    const ex = 960, ey = 520, ew = 1180;
    const open = prog(f.t, f.from, f.from + 1.6, ease.outCubic);
    const lid = (up) => {
      const pts = [];
      for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([ex + (u - 0.5) * ew * 2, ey + up * Math.sin(u * Math.PI) * ew * 0.66 * open]); }
      return pts;
    };
    OHP.ink(g, f, lid(-1), { w: 16, color: OHP.C.ink, seed: 3, boil: 1.6 });
    OHP.ink(g, f, lid(1), { w: 16, color: OHP.C.ink, seed: 4, boil: 1.6 });
    const ir = ew * 0.5 * open;
    // the iris: radial scratches, then a pupil with nothing in it
    const band = OHP.lyricBand(240, 34, { x: 196, w: 690, pad: 12 });    // the rays hold off the line
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * TAU;
      OHP.inkOutside(g, f, [[ex + Math.cos(a) * ir * 0.66, ey + Math.sin(a) * ir * 0.66], [ex + Math.cos(a) * ir, ey + Math.sin(a) * ir]],
        band, { w: 5, color: OHP.C.blue, seed: 90 + i, boil: 0.5, step: 26 });
    }
    g.fillStyle = '#191B22';
    g.beginPath(); g.ellipse(ex + 8 * noise1(f.t * 0.5, 2), ey, ir * 0.40, ir * 0.42, 0, 0, TAU); g.fill();
    // the lamp reflected in it: the only light in the pupil
    OHP.glowDot(g, ex - ir * 0.14, ey - ir * 0.16, ir * 0.2, 'rgba(255,246,220,ALPHA)', 0.5);
    OHP.glowDot(g, ex + ir * 0.3, ey + ir * 0.28, ir * 0.09, 'rgba(255,246,220,ALPHA)', 0.3);
    MV.focus(ex, ey, 'the pupil');
    OHP.dust(g, f, { gain: 1.2, front: true });
    OHP.slide(g, f, 34, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 210, y: 240, size: 34, style: 'type', color: OHP.C.ink2, maxW: 900 });
    return OHP.post(f, { shake: 2, snare: 0.02, vignette: 0.5 });
  },
});

