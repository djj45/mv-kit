// scenes/basilisk.js — the basilisk: one line coiled into a spiral, tightening every bar; on "boom" the coils
// spring open.
MV.scene('basilisk', {
  render(g, f) {
    OHP.back(g, f, { red: 0.18 });
    const L18 = f.lyrics.get('basilisk boom');
    const boom = L18.words[L18.words.length - 1];
    const k = prog(f.t, boom.start - 0.1, boom.start + 0.7, ease.outElastic);
    const tight = prog(f.t, f.from, boom.start, ease.inQuad);
    const cx = 900, cy = 452;                                 // high enough that the swelling coil stays off the line
    const pts = [];
    for (let i = 0; i <= 460; i++) {
      const u = i / 460;
      const a = u * TAU * (5.2 + 1.6 * tight) + 1.2;
      const r = 30 + u * (420 - 130 * tight) * (1 + 0.3 * k);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.66]);
    }
    OHP.ink(g, f, pts, { w: 11 - 4 * k, color: OHP.C.ink, seed: 13, boil: 1.6, taper: t => 0.6 + 0.5 * t });
    // the head at the end of the line: a wedge with an eye
    const head = pts[pts.length - 1];
    const prev = pts[pts.length - 12];
    const ang = Math.atan2(head[1] - prev[1], head[0] - prev[0]) + k * 1.2;
    g.save(); g.translate(head[0], head[1]); g.rotate(ang);
    g.fillStyle = OHP.C.ink;
    g.beginPath(); g.moveTo(-14, -20); g.lineTo(52, -6); g.lineTo(52, 8); g.lineTo(-14, 20); g.closePath(); g.fill();
    g.fillStyle = OHP.C.red; g.beginPath(); g.arc(6, -3, 7 + 4 * k, 0, TAU); g.fill();
    g.restore();
    MV.focus(head[0], head[1], 'the basilisk');
    if (k > 0.02) {                                        // the shock ring of the boom
      g.save(); g.globalAlpha = 0.5 * (1 - k); g.strokeStyle = OHP.C.red; g.lineWidth = 10 * (1 - k) + 2;
      g.beginPath(); g.ellipse(cx, cy, 430 * k + 60, 240 * k + 30, 0, 0, TAU); g.stroke(); g.restore();
    }
    OHP.clip(g, 240, 260, 96, -0.4, 0.45);
    OHP.clip(g, 330, 420, 96, 0.1, 0.45);
    OHP.dust(g, f, {});
    OHP.slide(g, f, 16, { x: 120, y: 74 });
    OHP.lyricBig(g, f, { x: 300, y: 930, small: 66, bigSize: 120, big: t => /boom/i.test(t), color: OHP.C.ink, bigColor: OHP.C.red, maxW: 1500 });
    return OHP.post(f, { shake: 5 + 16 * k, snare: 0.06 + 0.1 * k });
  },
});

