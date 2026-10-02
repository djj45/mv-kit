// S10 prompt1 — in the water tank's shade she types to it for the first time (B3). The input box (code) types each
// word as it is sung; three orange dots "typing" above it. Enter lands on "I'm" (the cut to hook1).
MV.scene('prompt1', akStill({
  art: 'B3',
  cam: [[0, { x: 0.47, z: 1.06 }], [1, { x: 0.5, z: 1.14 }, ease.inOutQuad]],
  // 动感: wide → her hands on the keys → her face, one framing per bar; B3v: she types, the wind moves her hair
  snap: { shots: [{ x: 0.47, y: 0.5, z: 1.06 }, { x: 0.62, y: 0.68, z: 1.42 }, { x: 0.44, y: 0.3, z: 1.6 }] },
  clip: 'B3v',
  fx(g, f, map) {
    const [lx, ly] = map(...AK_SPOT.B3.laptop);
    illFlare(g, lx, ly, 260, '190,215,255', 0.18);
    illOutline(g, 'ChatGPT,', f.t, f.from - 10, { x: 1420, y: 170, size: 110, alpha: 0.4 });
  },
  ly: f => ({ style: 'prompt', words: [1, 6], box: [300, 840, 1320, 116], typing: 1 - prog(f.t, f.to - 0.3, f.to), sent: pulse(f.t, f.to - 0.12, 0.12), only: ['ChatGPT'] }),
}));
