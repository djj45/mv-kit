// S15 shoggoth — the night sky (B7): the ring folds into a friendly orange smile; on "lies" the mask comes off for
// ten drawings — thousands of tangled lines and dozens of eyes, writhing and spreading — then the smile is back, but
// it has changed: slit eyes, a hooked grin with teeth. It stays that way to the end of the shot.
MV.scene('shoggoth', akStill({
  art: 'B7',
  cam: [[0, { z: 1.04 }], [1, { z: 1.12 }, ease.inOutQuad]],
  // 动感: wide sky → close on the smile → tilted, a new framing every two beats (the face scales with the framing)
  snap: { shots: [{ z: 1.06 }, { x: 0.5, y: 0.32, z: 1.42 }, { x: 0.5, y: 0.38, z: 1.2, rot: -0.05 }], every: 2 },
  fx(g, f, map) {
    const [cx, cy] = map(...AK_SPOT.B7.sky), lies = f.lyrics.findWords('lies,')[0].start, back = lies + 10 / 12;
    const k = prog(f.lt, 0, 0.8, ease.inOutCubic), zr = map.scale / (Math.max(W / map.sw, H / map.sh) * 1.08);   // 1 at the old framing
    if (f.t >= lies && f.t < back) {   // behind the mask: grows in, writhes, spreads
      const u = prog(f.t, lies, back);
      akTangle(g, cx, cy, lerp(260, 420, ease.outCubic(u)) * zr, f.t, prog(f.t, lies, lies + 0.15), { n: 2600, eyes: 64, lineAlpha: 0.35 });
      return;
    }
    // after the mask: the smile comes back and turns (flickering between the two faces for its first drawings)
    let evil = f.t >= back ? prog(f.t, back + 0.05, back + 0.45, ease.outCubic) : 0;
    if (f.t >= back && f.t < back + 0.2 && f.tick % 2) evil = 0;
    akFace(g, cx, cy, 220 * zr, f.t, { ring: 1 - k * 0.999, smile: k, evil, look: Math.sin(f.t * 1.3) * 0.5 * (1 - evil), blink: f.from + 1.4 });
    illFlare(g, cx, cy, 600 * zr, AK.sig, 0.12 + 0.1 * evil);
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ["shoggoth's", 'lies,'] },
  post(f) {
    const lies = f.lyrics.findWords('lies,')[0].start, back = lies + 10 / 12;
    if (f.t >= lies && f.t < back) return { shake: 10, flash: 0.2 * pulse(f.t, lies, 0.12) };
    return { flash: 0.15 * pulse(f.t, back, 0.1) };
  },
}));
