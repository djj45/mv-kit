// scenes/show.js — the hand takes the sheet away: everything drawn slides off to the right, and the wall is just
// a wall with dust in the light. "Was it all for show?"
MV.scene('show', {
  render(g, f) {
    OHP.back(g, f, { dim: 0.15, cold: 0.2 });
    const k = ease.inOutCubic(prog(f.t, f.from + 0.3, f.to - 0.2));
    // the sheet: the whole picture of the film so far, sliding away (a last look at the diagrams)
    g.save();
    g.globalAlpha = 0.5 * (1 - k);
    for (let i = 0; i < 9; i++) {
      const x = 200 + i * 180, h = 120 + (i % 4) * 90;
      OHP.block(g, f, x + k * 1900, 700 - h * 0.5, 140, h, { color: 'rgba(35,38,46,0.5)', w: 4, seed: i });
    }
    OHP.ink(g, f, [[160 + k * 1900, 320], [1700 + k * 1900, 380]], { w: 6, color: 'rgba(35,38,46,0.4)', seed: 21 });
    g.restore();
    // the hand holding the sheet's corner
    const hx = lerp(1420, 2100, k), hy = lerp(880, 700, k);
    OHP.hand(g, f, { tip: [hx, hy], s: 1.0, ang: 0.2, kind: 'point', alpha: 0.88 });
    if (hx < W - 160) MV.focus(hx, hy, 'the hand'); else MV.focus(W * 0.42, H * 0.46, 'the bare wall');
    OHP.dust(g, f, { gain: 1.4, front: true });
    OHP.slide(g, f, 35, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 380, y: 690, size: 34, style: 'hand', color: OHP.C.ink, maxW: 900, ghost: 0.2 });
    return OHP.post(f, { shake: 3, snare: 0.03, vignette: 0.5 });
  },
});

