// S45 askew — the orange smile again in the night sky (B7); on "askew" the whole frame tilts to a Dutch angle
// (the words with it) and half the tangle shows behind the face.
MV.scene('askew', akStill({
  art: 'B7',
  cam: [[0, { z: 1.1 }], [1, { z: 1.14 }]],
  snap: { shots: [{ z: 1.1 }, { y: 0.4, z: 1.32 }], every: 2 },
  fx(g, f, map) {
    const at = f.lyrics.findWords('askew')[0].start, k = prog(f.t, at, at + 0.3, ease.outBack), [cx, cy] = map(...AK_SPOT.B7.sky);
    akTangle(g, cx + 60, cy, 260, f.t, 0.55 * k, { n: 260, eyes: 20 });
    akFace(g, cx, cy, 200, f.t, { smile: 1 - 0.3 * k, look: k * 0.8, alpha: 1 });
  },
  ly: { style: 'slant', x: 960, y: 820, size: 88 },
  post(f) { const at = f.lyrics.findWords('askew')[0].start; return { rot: -0.12 * prog(f.t, at, at + 0.3, ease.outBack), zoom: 1 + 0.16 * prog(f.t, at, at + 0.3) }; },
}));
