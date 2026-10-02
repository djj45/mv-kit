// S42 dense — same hand (F2): the light gets denser until it burns white, and only her reaching hand stays, a silhouette.
MV.scene('dense', akStill({
  art: 'F2',
  clip: 'F2v', clipAt: 1.86,   // F2v carries on from S41 disobey (1.86 s long)
  cam: [[0, { y: 0.35, z: 1.16 }], [1, { y: 0.32, z: 1.22 }, ease.inQuad]],
  fx(g, f, map) {
    const [hx, hy] = map(...AK_SPOT.F2.hand), k = prog(f.lt, 0, f.dur, ease.inQuad), R = mulberry32(42), n = Math.floor(80 + 900 * k);
    for (let i = 0; i < n; i++) { const a = R() * TAU, r = Math.pow(R(), 0.6) * 1100; akDot(g, hx + Math.cos(a) * r + noise1(f.tq + i, 1) * 10, hy + Math.sin(a) * r * 0.7, 1.6 + R() * 2, 0.7, f.tick, i); }
    g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,244,230,${0.85 * smoothstep(0.55, 1, k)})`; g.fillRect(0, 0, W, H); g.restore();
    if (k > 0.55) illCover(g, akArt('F2', {}), { y: 0.32 + 0 * f.p, z: lerp(1.16, 1.22, ease.inQuad(f.p)) }, { blend: 'multiply', alpha: smoothstep(0.55, 1, k), filter: 'brightness(0.15) contrast(3)' });
  },
  ly: f => ({ style: 'slant', x: 960, y: 930, size: 88, color: f.p > 0.6 ? AK.ink : AK.paper, stroke: f.p > 0.6 ? AK.paper : AK.ink }),
}));
