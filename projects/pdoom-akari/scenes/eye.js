// S03 eye — her eye in close-up (A3); two orange dots tremble in the pupil. A3v (the clip made for S16): a slow
// blink; the dots ride on the pupil (tools/eyetrack.py) and go out while the lid is down.
const AK_EYE1 = {};   // A3v from its start (eye open, the blink 0.42–1.17 s in), at its own speed
MV.scene('eye', akStill({
  art: 'A3',
  cam: [[0, { z: 1.04 }], [1, { z: 1.14 }, ease.inOutQuad]],
  clip: 'A3v',
  fx(g, f, map) {
    const eye = akEye('A3v', akClipT(f, AK_EYE1)), [u, v] = AK_SPOT.A3.pupil, a = eye ? ease.inOutCubic(prog(eye.open, 0.35, 0.8)) : 1;
    const [x, y] = map(u + (eye ? eye.dx : 0), v + (eye ? eye.dy : 0)), s = map.scale;
    for (const k of [-1, 1]) akDot(g, x + k * 26 * s + (hash(f.tick, k, 3) - 0.5) * 3, y - 10 * s + (hash(f.tick, k, 4) - 0.5) * 3, 7 * s, 0.9 * a, f.tick, k);
  },
  ly: { style: 'verse', x: 1780, y: 930, align: 'right', hot: ['circuits'] },
}));
