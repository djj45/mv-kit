// S52 sunrise — the same roof as the dusk shot, at sunrise (H1). The city's orange lights go out one by one into
// daylight; every thread draws back into a single point of light.
MV.scene('sunrise', akStill({
  art: 'H1', day: true,
  // H1v was generated as a sunset (the sun sinks behind the clouds, the city dims): played backwards it is the sunrise,
  // pre-dawn to day, and its first frame — the shot's last — is H1 itself. It runs back over the shot at ~0.92× and
  // holds on H1 for the last 0.4 s.
  clip: 'H1v',
  clipT: f => { const p = (window.MV_FRAMES || {}).H1v, len = p && p.n ? (p.n - 1) / p.rate : 0; return len * (1 - prog(f.tq - f.from, 0, f.dur - 0.4)); },
  cam: f => ({ x: lerp(0.5, 0.45, f.p), y: 0.5, z: 1.0 + 0.05 * f.p }),
  groove: 0.35,   // the epilogue settles
  fx(g, f, map) {
    const [sx, sy] = map(...AK_SPOT.H1.sky), R = mulberry32(52), k = prog(f.lt, 0.2, f.dur - 0.5, ease.inOutQuad);
    for (let i = 0; i < 70; i++) {
      const u = R(), v = 0.6 + R() * 0.3, off = R(), [x, y] = map(u, v), a = 1 - prog(k, off * 0.8, off * 0.8 + 0.15);
      if (a <= 0) continue;
      akDot(g, x, y, 2.2, a, f.tick, i); akThread(g, x, y, sx, sy, 1, { lift: 100, w: 0.9, alpha: 0.4 * a, tip: false });
    }
    akDot(g, sx, sy, 6 + 6 * k, 1, f.tick);
  },
  ly: { style: 'none' },
}));
