// S23 hook2 — the night sky full of threads (B7); bigger than the first time: 15% → 42%, the frame shakes, ゴゴゴ.
MV.scene('hook2', akStill({
  art: 'B7',
  cam: [[0, { z: 1.2, y: 0.45 }], [1, { z: 1.06, y: 0.5 }, ease.outCubic]],
  snap: f => ({ shots: [{ y: 0.5, z: 1.12 }, { y: 0.38, z: 1.38 }], at: [akHookLine(f.lyrics, 1).hit], snap: 0.08 }),   // 动感: punch in on "doom"
  fx(g, f, map) {
    const [sx, sy] = map(...AK_SPOT.B7.sky), R = mulberry32(23);
    for (let i = 0; i < 60; i++) { const x = R() * W * 1.4 - W * 0.2, y = H * (0.95 + R() * 0.1); akThread(g, x, y, sx, sy, 1, { lift: R() * 200, bend: (R() - 0.5) * 300, w: 1, alpha: 0.45, tip: false }); }
    akDot(g, sx, sy, 16, 1, f.tick, 2);
  },
  top(g, f) { this._post = akHook(g, f, { n: 1, a: 15, b: 42, sfx: 'ゴゴゴ', size: 165, shake: 18, cy: H * 0.38 }); },
  post() { return this._post || {}; },
}));
