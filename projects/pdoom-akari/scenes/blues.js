// S39 blues — the bluest frame of the film (E7): she sits back to back with a glow of orange light, the light at
// right angles to her shadow.
MV.scene('blues', akStill({
  art: 'E7',
  clip: 'E7v',   // the still until the clip is generated and packed
  prep: { grade: { tint: '#1E3B7A', amt: 0.3, sat: 1.1 }, glow: 0.35 },
  cam: [[0, { z: 1.04 }], [1, { z: 1.1 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [bx, by] = map(...AK_SPOT.E7.back), br = 0.9 + 0.1 * Math.sin(f.t * 1.6);
    illFlare(g, bx, by, 560 * br, AK.sig, 0.55, { blend: 'source-over' });   // painted: added orange on this blue turns white
    illFlare(g, bx, by, 200 * br, '255,150,80', 0.6, { blend: 'source-over' });
    illFlare(g, bx, by, 60 * br, AK.core, 0.8);
    akTangle(g, bx, by, 110, f.t, 0.25, { n: 60, eyes: 0, seed: 39 });
  },
  ly: { style: 'quiet', x: 960, y: 960, size: 58, track: 6 },
}));
