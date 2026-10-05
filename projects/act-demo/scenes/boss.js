// boss — the spark rises back up, bigger; three Pips bow to it one after another, then dance for it, each a little
// out of step (ACT.vary: phase, amount and lag per Pip — a crowd that moves in unison reads as a copy).
MV.scene('boss', {
  render(g, f) {
    const t = f.tq, GY = 880;
    LK.bg(g); LK.floor(g, GY, 1500);
    const rise = ease.outBack(prog(t, f.from, f.from + 0.7)), sx = 1580, sy = lerp(1010, 420, rise);   // from just over the ledge
    const beatK = Math.exp(-6 * ACT.beat(f.t).f) * (t > 15.02 ? 1 : 0);
    LK.spark(g, sx, sy, lerp(26, 64, rise), f.t, beatK);
    const crowd = [[560, 24, 1], [820, 28, 0], [1080, 24, 2]];      // x, u, seed: the middle one leads
    let lead = null;
    for (const [x, u, seed] of crowd) {
      const v = ACT.vary(seed), tt = t - v.lag;                       // each Pip a little behind the one before
      const mood = ACT.emotions(tt, [[12.9, 'surprised'], [13.72, 'proud'], [15.02, 'happy']], { phase: v.phase });
      const bow = ACT.poses(tt, [[0, { rot: 0, aL: 0.2, aR: 0.2 }], [13.72 + 0.12 * seed, { rot: 0.38, aL: -1.2, aR: -1.2 }, 0.22], [14.75, { rot: 0, aL: 0.2, aR: 0.2 }, 0.3]]);
      const dance = tt >= 15.02 ? ACT.move('bounce', tt, v) : {};
      const pose = ACT.add(mood, tt < 15.02 ? bow : {}, dance);
      PIP.draw(g, x, GY, u, { ...pose, view: 'q' }, tt);
      if (seed === 0) lead = [x, GY + (pose.dy || 0) * u - 6.4 * u];
    }
    // the subject: the spark as it rises, then the Pips (the middle one) from the bow on
    if (f.t < 13.72) { MV.focus(...lead, 'pip'); MV.focus(sx, sy, 'spark'); }
    else { MV.focus(sx, sy, 'spark'); MV.focus(...lead, 'pip'); }
    MV.overlay(o => LK.line(o, f, { x: 150, y: 405, size: 96, maxW: 1300 }));     // the empty wall, clear of the Pips' hops
  },
});
