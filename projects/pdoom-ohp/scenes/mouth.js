// scenes/mouth.js — a mouth drawn in blue marker with a strip of paper held between its teeth; the line is written
// on the strip. On "alive" the shadow hand pulls the strip up out of the mouth, and the jaws snap shut on nothing.
MV.scene('mouth', {
  anchors(f) { return { mouth: [W / 2 - 520, 240, 1040, 560] }; },
  render(g, f) {
    OHP.back(g, f, {});
    const L = f.lyrics.lineAt(f.t, f.from);
    const last = L && L.words[L.words.length - 1];
    const alive = last && last.w === 'alive';
    const pull = alive ? prog(f.t, last.start - 0.04, last.start + 0.30, ease.outCubic) : 0;
    const shut = alive ? prog(f.t, last.start + 0.16, last.start + 0.42, ease.inCubic) : 0;
    const open = 1 - shut;
    const cx = W / 2, cy = 520, R = 620, H2 = 210 * open + 26;
    const sy = 560 - pull * 330;                          // the strip rises out of the mouth
    // the inside of the mouth: solid and dark
    g.save();
    g.beginPath();
    g.moveTo(cx - R, cy);
    g.bezierCurveTo(cx - R * 0.6, cy - H2, cx + R * 0.6, cy - H2, cx + R, cy);
    g.bezierCurveTo(cx + R * 0.6, cy + H2 * 1.5, cx - R * 0.6, cy + H2 * 1.5, cx - R, cy);
    g.closePath();
    g.fillStyle = '#242B3A'; g.globalAlpha = 0.94; g.fill();
    g.restore();
    // teeth, holding the strip
    for (let i = 0; i < 13; i++) {
      const u = -0.86 + i * 0.145;
      if (Math.abs(u) > 0.74) continue;
      const x = cx + u * R;
      const yTop = cy - H2 * (1 - Math.abs(u) * Math.abs(u)) * 0.92;
      const len = 60 * (1 - u * u) * open + 8;
      OHP.ink(g, f, [[x, yTop + 6 * open], [x + 6 * (hash(i, 3, 2) - 0.5), yTop + len]], { w: 22, color: '#F1E7CF', seed: i });
    }
    // lips
    OHP.ink(g, f, [[cx - R, cy], [cx - R * 0.6, cy - H2], [cx + R * 0.6, cy - H2], [cx + R, cy]], { w: 16, color: OHP.C.blue, seed: 11, boil: 1.8 });
    OHP.ink(g, f, [[cx - R, cy], [cx - R * 0.6, cy + H2 * 1.5], [cx + R * 0.6, cy + H2 * 1.5], [cx + R, cy]], { w: 16, color: OHP.C.blue, seed: 12, boil: 1.8 });
    // the strip (drawn after the mouth: while it is pulled out, the lips pass behind it, never across the words)
    MV.lyric(() => {
      g.save();
      g.translate(cx, sy); g.rotate(-0.008);
      g.fillStyle = 'rgba(46,40,32,0.20)'; g.fillRect(-546, -68, 1100, 144);
      g.fillStyle = '#F3EBD6'; g.fillRect(-550, -72, 1100, 144);
      g.strokeStyle = 'rgba(60,52,40,0.32)'; g.lineWidth = 2; g.strokeRect(-550, -72, 1100, 144);
      g.restore();
    });
    OHP.lyric(g, f, { x: 430, y: sy + 22, size: 66, style: 'hand', maxW: 960 });
    OHP.dust(g, f, {});
    OHP.slide(g, f, 5, { x: 120, y: 74 });
    MV.focus(cx, cy + 60, 'the mouth');
    if (alive) {                                          // the hand comes in and takes the strip
      const hin = prog(f.t, last.start - 0.36, last.start - 0.04, ease.outCubic);
      if (hin > 0.02) {
        const hx = lerp(2140, 1556, hin);
        OHP.hand(g, f, { tip: [hx, sy - 54], s: 0.95, ang: -1.15, kind: 'point', alpha: 0.88 });
        if (hin > 0.9) MV.focus(hx, sy - 54, 'the hand');
      }
    }
    if (shut > 0.98) {                                    // the crease the bite leaves
      OHP.ink(g, f, [[cx - 520, cy + 30], [cx + 200, cy + 66], [cx + 560, cy + 20]], { w: 5, color: OHP.C.ink2, seed: 31, boil: 0.8, alpha: 0.7 });
    }
    return OHP.post(f, { shake: shut > 0 ? 14 : 4, snare: shut > 0 ? 0.12 : 0.04 });
  },
});
