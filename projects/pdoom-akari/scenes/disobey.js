// S41 disobey — her hand reaching up, backlit (F2); on "disobey" the light runs out of her fingers the other way.
MV.scene('disobey', akStill({
  art: 'F2',
  clip: 'F2v',   // the still until the clip is generated and packed
  cam: [[0, { y: 0.4, z: 1.1 }], [1, { y: 0.35, z: 1.16 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [hx, hy] = map(...AK_SPOT.F2.hand), at = f.lyrics.findWords('disobey')[0].start, R = mulberry32(41);
    illFlare(g, hx, hy - 80, 500, AK.sig, 0.3);
    for (let i = 0; i < 90; i++) {
      const a = -Math.PI / 2 + (R() - 0.5) * 1.4, sp = 200 + R() * 500, born = at + R() * 0.8, age = f.t - born;
      if (age < 0 || age > 1.2) { if (f.t < at) akDot(g, hx + Math.cos(a) * 40 * R(), hy + Math.sin(a) * 40 * R(), 2, 0.6, f.tick, i); continue; }
      akDot(g, hx + Math.cos(a) * sp * age, hy + Math.sin(a) * sp * age, 2.4, 1 - age / 1.2, f.tick, i);
    }
  },
  ly: { style: 'slant', x: 960, y: 930, size: 88 },
}));
