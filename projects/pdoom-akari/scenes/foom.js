// S12 foom — the roof at dusk, wide (B2). The spark climbs from the roof and on "FOOM" bursts into a ring; a
// shockwave sweeps across the whole city (an ellipse on the ground plane), the frame shakes, ドォォン.
MV.scene('foom', akStill({
  art: 'B2',
  cam: f => ({ x: lerp(0.42, 0.5, f.p), y: 0.5, z: 1.0 + 0.04 * f.p }),
  fx(g, f, map) {
    const boom = f.lyrics.findWords('FOOM')[0].start, [rx, ry] = map(...AK_SPOT.B2.roof), [sx, sy] = map(...AK_SPOT.B2.sky);
    const [, hy] = map(0.5, AK_SPOT.B2.horizon);
    const k = prog(f.t, f.from, boom, ease.inOutCubic), px = lerp(rx, sx, k), py = lerp(ry, sy, k) - Math.sin(k * Math.PI) * 60;
    if (f.t < boom) akSpark(g, px, py, 12, f.t, { vy: -90, seed: 12 });
    else {
      const a = f.t - boom, rr = 60 + 900 * ease.outCubic(clamp(a / 0.8));
      akFace(g, sx, sy, lerp(60, 150, prog(a, 0, 0.5, ease.outBack)), f.t, { ring: 1, alpha: 1 });
      akGlowPath(g, gg => { gg.beginPath(); gg.ellipse(sx, hy, rr * 2.4, rr * 0.32, 0, 0, TAU); }, 4 * (1 - prog(a, 0.4, 1.4)) + 0.5, 1 - prog(a, 0.6, 1.5));
      illFlare(g, sx, sy, 900, AK.sig, 0.5 * (1 - prog(a, 0, 1.2)));
      sfx(g, 'ドォォン', W * 0.22, H * 0.22, 170, -0.08, f.t, boom, { font: ILL.F.display, stroke: '#fffaf0', fill: AK.ink });
    }
  },
  ly: { style: 'slant', x: 960, y: 900, size: 84 },
  post(f) { const boom = f.lyrics.findWords('FOOM')[0].start, a = f.t - boom; return a < 0 ? {} : { flash: 0.6 * pulse(a, 0, 0.15), shake: 16 * (1 - prog(a, 0, 0.7)) }; },
}));
