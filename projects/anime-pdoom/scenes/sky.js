function shot2(g, t) {
  const p = prog(t, CUT.s2, CUT.s3), h = haloRise(t);
  const kick = pulse(t, SYL[2][0], 0.25) * 0.05 + pulse(t, SYL[3][0], 0.25) * 0.07;
  const cam = { x: h.x + 60, y: h.y + 40, zoom: lerp(2.2, 2.5, ease.outCubic(p)) + kick, rot: lerp(-0.1, -0.05, p) };
  g.save(); worldXf(g, cam); g.drawImage(SKY, 0, 0); drawHalo(g, h.x, h.y, h.R, t, 0); g.drawImage(CLOUDS, 0, 0); g.restore();
  // foreground puffs whipping past (drawn on twos for the hand-drawn feel)
  const tq = onTwos(t);
  [[0, 700, 1.4, 0], [1, 180, 1.0, 0.4], [2, 900, 1.8, 0.75]].forEach(([i, y, s, ph]) => {
    const x = W + 400 - ((tq - CUT.s2) * (1700 + i * 500) + ph * 2600) % 3200;
    g.drawImage(PUFFS[i % 2], x - 350 * s, y - 190 * s, 700 * s, 380 * s);
  });
  sfx(g, 'ゴゴゴゴ', 1690, 170, 120, 0.1, t, CUT.s2 + 0.05, { vertical: true, stagger: 0.12, grow: 0.08 });
  lyricRow(g, TOK.chat, t, 140, 930, 130);
  jpSub(g, JP.plea, t, CUT.s1 - 1, 146, 1000);
}

// S3 — "please don't eat me": extreme close-up of her eye; on "eat" the pupil shrinks and trembles.

MV.scene('sky', { render(g, f) { shot2(g, f.t); } });
