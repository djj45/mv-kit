// S11 hook1 — looking up into the wind (B4), lit orange from above. The hook slams word by word; on "doom":
// flash, focus lines, ドン, P(doom) 2% → 15%, the camera punches in on her face and she blinks, startled.
MV.scene('hook1', akStill({
  art: 'B4',
  cam: [[0, { y: 0.5, z: 1.18 }], [1, { y: 0.46, z: 1.06 }, ease.outCubic]],
  // 动感: on "doom" the camera punches in on her face; B4v: her hair settling in the wind, then a blink
  snap: f => ({ shots: [{ y: 0.5, z: 1.14 }, { x: 0.56, y: 0.36, z: 1.42 }], at: [akHookLine(f.lyrics, 0).hit], snap: 0.08 }),
  clip: 'B4v',
  // B4v = take 2 (art/clips/B4v-2.mp4, stable for all 5 s), packed from 0.5 s on the 1/12 s grid; its blink is shut at
  // 1.667 s into the pack. Playing from 0.44 s puts the shut drawing at 24.0 s, the drawing after the punch-in on "doom"
  // (then half-open, then open: a blink you can see, at the clip's own speed).
  clipAt: 0.44,
  fx(g, f, map) {
    const [ax, ay] = map(...AK_SPOT.B4.above);
    illFlare(g, ax, Math.max(-200, ay), 700, AK.sig, 0.22);
    upLines(g, f.t * 0.6, 'rgba(255,248,238,0.18)', 50, 13);
  },
  // the words sit in the lower half when the camera punches in, so they never cross her eyes
  top(g, f) { this._post = akHook(g, f, { n: 0, a: 2, b: 15, sfx: 'ドン', cy: akMotionOn(f) ? H * 0.66 : H * 0.4 }); },
  post() { return this._post || {}; },
}));
