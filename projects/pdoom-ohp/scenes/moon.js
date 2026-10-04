// scenes/moon.js — NVDA to the moon: the price line climbs off the sheet to a drawn moon; on "Omega Point" every
// line in the picture is pulled into one point inside it.
MV.scene('moon', {
  render(g, f) {
    OHP.back(g, f, { cold: 0.2 });
    const L20 = f.lyrics.get('Omega Point');
    const conv = prog(f.t, L20.words[0].start - 0.2, L20.words[L20.words.length - 1].end + 0.3, ease.inCubic);
    const mx = 1520, my = 300, mr = 210;
    // the price line: flat, then straight up to the moon
    const x0 = 200, y0 = 820, x1 = mx - mr * 0.3, y1 = my + mr * 0.2;   // the chart stays above the words
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const x = lerp(x0, x1, u), y = u < 0.35 ? y0 - u * 60 : lerp(y0 - 21, y1, Math.pow((u - 0.35) / 0.65, 0.75));
      pts.push([lerp(x, mx, conv), lerp(y, my, conv)]);
    }
    OHP.axes(g, f, { x: 200, y: 620, w: 700, h: 200, nx: 4, ny: 4, labels: true });
    OHP.ink(g, f, pts, { w: 9, color: OHP.C.green, seed: 17, boil: 1.3 });
    const tip = pts[pts.length - 1];
    MV.focus(tip[0], tip[1], 'the line');
    // the moon
    const moonPts = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; moonPts.push([mx + Math.cos(a) * mr, my + Math.sin(a) * mr * 0.94]); }
    OHP.ink(g, f, moonPts, { w: 11, color: OHP.C.ink, seed: 19, boil: 1.4 });
    for (let i = 0; i < 7; i++) {
      const a = hash(i, 3, 7) * TAU, r = mr * (0.2 + 0.6 * hash(i, 5, 9));
      const cxp = mx + Math.cos(a) * r, cyp = my + Math.sin(a) * r * 0.9, rr = 10 + 30 * hash(i, 7, 2);
      const cr = []; for (let j = 0; j <= 16; j++) { const b = j / 16 * TAU; cr.push([cxp + Math.cos(b) * rr, cyp + Math.sin(b) * rr * 0.9]); }
      OHP.ink(g, f, cr, { w: 4, color: OHP.C.ink2, seed: 40 + i, boil: 0.8 });
    }
    g.save();
    OHP.F.mono(g, 30); g.fillStyle = OHP.C.ink2; g.textAlign = 'center';
    g.fillText('1e30', mx, my + mr + 60);
    g.restore();
    if (conv > 0.02) {                                     // everything funnels into the point
      OHP.glowDot(g, mx, my, 120 * conv, 'rgba(40,34,52,ALPHA)', 0.6 * conv);
      g.fillStyle = 'rgba(18,16,24,' + (0.8 * conv).toFixed(2) + ')';
      g.beginPath(); g.arc(mx, my, 5 + 22 * conv, 0, TAU); g.fill();
    }
    OHP.clip(g, 260, 250, 100, -0.5, 0.4);
    OHP.dust(g, f, {});
    OHP.slide(g, f, 17, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 300, y: 925, size: 56, style: 'hand', maxW: 1300 });
    return OHP.post(f, { shake: 5 + 6 * conv, snare: 0.05 });
  },
});

