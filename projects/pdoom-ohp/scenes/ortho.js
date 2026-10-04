// scenes/ortho.js — orthogonality: two axes at right angles, a paperclip on one, a smiley on the other, and they
// never meet. A blues note in the corner as the signature. The timeline tilts this whole sheet away.
MV.scene('ortho', {
  anchors(f) { return { origin: [900, 640, 160, 160] }; },
  render(g, f) {
    OHP.back(g, f, { cold: 0.15 });
    const ox = 900, oy = 700;
    OHP.rule(g, f, [ox - 620, oy], [ox + 620, oy], { w: 6, color: OHP.C.ink });
    OHP.rule(g, f, [ox, oy + 420], [ox, oy - 520], { w: 6, color: OHP.C.ink });
    // the two things that never meet
    OHP.clip(g, ox + 470, oy - 96, 120, 0.3, 0.5);
    g.save();                                          // a smiley, drawn, on the vertical axis
    const sy = oy - 400;
    const cr = []; for (let j = 0; j <= 30; j++) { const a = j / 30 * TAU; cr.push([ox + Math.cos(a) * 80, sy + Math.sin(a) * 80]); }
    OHP.ink(g, f, cr, { w: 8, color: OHP.C.ink, seed: 5, boil: 1.0 });
    g.fillStyle = OHP.C.ink;
    g.beginPath(); g.arc(ox - 28, sy - 20, 9, 0, TAU); g.fill();
    g.beginPath(); g.arc(ox + 28, sy - 20, 9, 0, TAU); g.fill();
    g.restore();
    OHP.ink(g, f, [[ox - 40, sy + 26], [ox, sy + 52], [ox + 40, sy + 26]], { w: 7, color: OHP.C.ink, seed: 7, boil: 0.8 });
    // the labels (small, typed)
    g.save(); OHP.F.mono(g, 26); g.fillStyle = OHP.C.ink2;
    g.fillText('WHAT IT WANTS', ox + 300, oy + 176);
    g.fillText('WHAT WE WANT', ox + 40, oy - 520);
    g.restore();
    // the blues note in the corner
    OHP.ink(g, f, [[1580, 880], [1580, 760], [1690, 736], [1690, 856]], { w: 8, color: OHP.C.blue, seed: 11, boil: 1.0 });
    g.fillStyle = OHP.C.blue;
    g.beginPath(); g.ellipse(1548, 884, 34, 24, -0.35, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(1658, 860, 34, 24, -0.35, 0, TAU); g.fill();
    // the years going by on the horizontal axis
    for (let i = 0; i <= 8; i++) OHP.ink(g, f, [[ox - 600 + i * 160, oy - 14], [ox - 600 + i * 160, oy + 14]], { w: 4, color: OHP.C.ink2, seed: 20 + i, boil: 0.6 });
    OHP.hand(g, f, { tip: [ox - 120, oy - 60], s: 0.6, ang: 0.4, kind: 'point', alpha: 0.65 });
    MV.focus(ox, oy, 'the origin');
    OHP.dust(g, f, {});
    OHP.slide(g, f, 27, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 230, y: 250, size: 54, style: 'hand', maxW: 600 });
    return OHP.post(f, { shake: 3, snare: 0.04, cold: 0.1 });
  },
});

