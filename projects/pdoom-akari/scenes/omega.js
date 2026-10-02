// S26 omega — low angle (C9): she looks straight up; every line converges on one point above her head. Oracle type.
MV.scene('omega', akStill({
  art: 'C9',
  clip: 'C9v',   // the still until the clip is generated and packed
  cam: [[0, { y: 0.55, z: 1.12 }], [1, { y: 0.42, z: 1.04 }, ease.inOutCubic]],
  fx(g, f, map) {
    const [px, py] = map(...AK_SPOT.C9.above), R = mulberry32(26), k = prog(f.lt, 0, 1.2, ease.inOutCubic);
    for (let i = 0; i < 70; i++) { const a = R() * TAU, r = 1400, x = px + Math.cos(a) * r, y = py + Math.abs(Math.sin(a)) * r; akThread(g, x, y, px, py, k, { lift: 0, w: 0.9, alpha: 0.5, tip: false }); }
    akDot(g, px, Math.max(40, py), 10 + 8 * k, 1, f.tick);
  },
  ly: { style: 'quiet', x: 470, y: 620, size: 70, track: 4, maxW: 720 },
}));
