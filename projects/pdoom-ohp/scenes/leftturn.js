// scenes/leftturn.js — sharp left turn: one long path drawn across the sheet that turns ninety degrees up and
// leaves the picture; the acetate lifts at the corner it turns on.
MV.scene('leftturn', {
  anchors(f) { return { corner: [1120, 640, 220, 220] }; },
  render(g, f) {
    OHP.back(g, f, { warm: 0.2 });
    const L25 = f.lyrics.get('Sharp left turn');
    const k = prog(f.t, L25.words[0].start - 0.2, L25.words[0].start + 0.55, ease.inCubic);
    const y = 720, x0 = 160, corner = 1180;
    const pts = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([lerp(x0, corner, u), y + Math.sin(u * 7) * 8]); }
    for (let i = 1; i <= 22; i++) { const u = i / 22; pts.push([corner + Math.sin(u * 5) * 5 * (1 - u), lerp(y, -200, u)]); }
    OHP.ink(g, f, pts, { w: 12, color: OHP.C.ink, seed: 23, boil: 1.6, upto: 0.25 + 0.75 * k });
    const tip = [corner, lerp(y, -200, clamp((0.25 + 0.75 * k - 0.63) / 0.37))];
    if (tip[1] > 90) MV.focus(tip[0], tip[1], 'the end of the path'); else MV.focus(corner + 60, 660, 'the corner');
    if (k < 1) OHP.hand(g, f, { tip: [lerp(x0, corner, clamp(k * 1.6)), y - 40], s: 0.6, ang: -1.1, alpha: 0.88 });
    // the corner: the sheet lifts and the path overshoots it a little
    if (k > 0.1) {                                      // the film lifts a little along the turn
      g.save(); g.globalAlpha = 0.42 * k;
      g.beginPath();
      g.moveTo(corner - 300, y + 20); g.bezierCurveTo(corner - 120, y - 40, corner + 40, y - 60, corner + 210, y - 10);
      g.lineTo(corner + 190, y + 26); g.bezierCurveTo(corner + 40, y - 8, corner - 120, y + 8, corner - 300, y + 54);
      g.closePath();
      g.fillStyle = 'rgba(255,252,240,0.75)'; g.fill();
      g.restore();
      OHP.ink(g, f, [[corner - 300, y + 20], [corner + 210, y - 10]], { w: 2.4, color: 'rgba(150,140,120,0.5)', seed: 44, alpha: 0.5, boil: 0.4 });
    }
    OHP.dust(g, f, {});
    OHP.slide(g, f, 21, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 300, y: 925, size: 60, style: 'hand', maxW: 1360 });
    return OHP.post(f, { shake: 5 + 10 * k, snare: 0.06 });
  },
});

