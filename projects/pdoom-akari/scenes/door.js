// S09 door — she bursts onto the roof, backlit (B1); the spark flies ahead of her into the sky. The name is a huge
// hollow word across the sky, revealed over its four sung syllables and held.
MV.scene('door', akStill({
  art: 'B1',
  cam: [[0, { y: 0.55, z: 1.12 }], [1, { y: 0.45, z: 1.04 }, ease.outCubic]],
  // 动感: the doorway, then on the bar line in on her running; B1v (when generated) is the door swinging, her hair in the wind
  snap: { shots: [{ y: 0.55, z: 1.1 }, { x: 0.5, y: 0.5, z: 1.34 }] },
  clip: 'B1v',
  fx(g, f, map) {
    const [dx, dy] = map(...AK_SPOT.B1.door), k = prog(f.lt, 0, 1.6, ease.outCubic);
    illRays(g, f.t, dx, dy, -Math.PI / 2, 0.9, H * 0.9, '255,214,160', 0.16, { seed: 9, n: 12 });
    akSpark(g, lerp(dx + 20, W * 0.62, k), lerp(dy - 60, H * 0.1, k), 12, f.t, { vx: 30 * (1 - k), vy: -160 * (1 - k), seed: 9 });
    const w = f.lyrics.get('ChatGPT').words[0];
    illOutline(g, 'ChatGPT,', f.t, w.start, { y: 190, size: 200, over: w.end - w.start, drift: 6, alpha: 0.95 });
  },
  ly: { style: 'none' },
}));
