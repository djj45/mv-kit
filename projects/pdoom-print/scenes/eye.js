// "Your circuits make me nervous, that's no surprise": the film's only face. A printed eye opens on the downbeat;
// its iris is a ring of traces like a circuit board or a camera aperture; red sparks strike in it on the hats.
// "nervous": the pupil darts drawing by drawing. "surprise": it widens and the pupil shrinks. The camera creeps in.
MV.scene('eye', {
  init() { this.S = prSheet({ cpi: 20, lpi: 10 }); },
  render(g, f) {
    const S = this.S.clear(), tq = f.tq, t0 = f.from;
    const tNerv = PP.word(f, 'Your circuits', 4), tSurp = PP.word(f, "that's no surprise", 2);
    const open = ease.outCubic(clamp((tq - t0) / 0.3)) * (1 + 0.16 * ease.outBack(clamp((tq - tSurp) / 0.25)));
    let look = [0.05 * Math.sin(tq * 1.3), 0.05 * Math.cos(tq * 0.9)];
    if (tq >= tNerv && tq < tSurp - 0.1) look = [(hash(f.tick, 3) - 0.5) * 1.3, (hash(f.tick, 4) - 0.5) * 0.7];
    const pupil = tq >= tSurp ? lerp(0.38, 0.22, ease.outCubic(clamp((tq - tSurp) / 0.2))) : 0.38 + 0.05 * Math.sin(tq * 2);
    const [ix, iy, ir] = PP.eye(S.g, W / 2, 430, 1060, { open, look, pupil, spin: tq * 0.05 });
    // sparks of AGI: red stars struck in the iris, a new set on each hat
    const k = Math.floor(f.beat * 2);
    for (let i = 0; i < 7; i++) {
      const a = hash(k, i, 1) * TAU, r = ir * (0.45 + 0.5 * hash(k, i, 2));
      const [c, rr] = S.tcell(ix + Math.cos(a) * r, iy + Math.sin(a) * r * Math.min(1, open));
      if (open > 0.4) S.put(c, rr, hash(k, i, 3) > 0.5 ? '*' : '+', { red: true, knock: true, strike: 2 });
    }
    PP.header(S, f, f.params.page);
    PP.lyrics(S, f, ['Your circuits', "that's no surprise"], 10, 34, { x: 3, gap: 0, red: ['NERVOUS,', 'SURPRISE'] });
    const z = lerp(0.88, 1.0, ease.inOutQuad(f.p)), cx = lerp(W / 2, ix, 0.25 * f.p), cy = H / 2 + 40;
    prPrint(g, S, { cam: { x: cx, y: cy, z }, seed: f.tick, key: f.tick });
    return { shake: tq >= tNerv && tq < tSurp ? 2.5 * f.a.hat : 0 };
  },
});
