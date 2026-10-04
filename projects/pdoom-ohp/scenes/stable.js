// scenes/stable.js — a training run that behaves. The flat line is ruled and tidy; at "singularity" its far end
// starts to pull the rest of the sheet into one point.
MV.scene('stable', {
  render(g, f) {
    OHP.back(g, f, {});
    const L13 = f.lyrics.get("singularity's begun");
    const pull = prog(f.t, L13.words[0].start - 0.35, L13.words[L13.words.length - 1].end, ease.inCubic);
    const y0 = 470, x0 = 200, x1 = 1720;
    // the tidy grid the run sits in
    g.save(); g.globalAlpha = 0.3;
    for (let i = 0; i <= 8; i++) OHP.rule(g, f, [x0, 250 + i * 62], [x1, 250 + i * 62], { w: 1.2, color: OHP.C.ink3 });
    g.restore();
    // the end of the line curls into a point as the pull grows
    const cx = x1 + pull * 90, cy = y0 - pull * 40;
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const u = i / 80;
      const x = lerp(x0, x1, u), y = y0 + Math.sin(u * 9) * 2.2;
      const k = Math.pow(u, 6) * pull;
      pts.push([lerp(x, cx, k), lerp(y, cy, k * 0.85) + Math.sin(u * 30 + f.t * 2) * 3 * pull * u]);
    }
    OHP.rule(g, f, [x0, y0 - 6], [x1, y0 - 6], { w: 5, color: OHP.C.ink });
    // ticks on the run, one per bar, checked off
    for (let i = 0; i < 12; i++) {
      const u = i / 11, x = lerp(x0, x1, u), on = f.t > f.from + 0.35 + i * 0.28;
      if (!on) continue;
      OHP.ink(g, f, [[x - 26, y0 - 34], [x - 8, y0 - 12], [x + 30, y0 - 70]], { w: 7, color: i < 10 ? OHP.C.green : OHP.C.ink, seed: 20 + i, boil: 1.0 });
    }
    OHP.ink(g, f, pts, { w: 8, color: OHP.C.ink, seed: 9, boil: 1.2 });
    if (pull > 0.02) {
      OHP.glowDot(g, cx, cy, 90 * pull, 'rgba(30,26,40,ALPHA)', 0.7 * pull);
      g.save(); g.fillStyle = 'rgba(18,16,24,' + (0.85 * pull).toFixed(2) + ')';
      g.beginPath(); g.arc(cx, cy, 4 + 26 * pull, 0, TAU); g.fill(); g.restore();
      // lines of the sheet bending toward the point
      for (let i = 0; i < 7; i++) {
        const yy = 250 + i * 62;
        OHP.ink(g, f, [[x0, yy], [lerp(x1, cx, pull * (0.3 + 0.1 * i)), lerp(yy, cy, pull * (0.5 - 0.04 * i))]], { w: 2, color: OHP.C.ink3, seed: 30 + i, alpha: 0.6 });
      }
    }
    MV.focus(pull > 0.1 ? cx : 900, pull > 0.1 ? cy : y0 - 20, pull > 0.1 ? 'the point' : 'the run');
    const L = f.lyrics.lineAt(f.t, f.from);
    const second = L && /singularity/.test(L.text);
    OHP.slide(g, f, 11, { x: 120, y: 74 });
    OHP.lyric(g, f, second
      ? { x: 200, y: 220, size: 46, style: 'type', color: OHP.C.ink2, maxW: 1100 }
      : { x: 260, y: 930, size: 58, style: 'hand', maxW: 1400 });
    OHP.dust(g, f, {});
    return OHP.post(f, { shake: 3 + 4 * pull, snare: 0.04 });
  },
});

