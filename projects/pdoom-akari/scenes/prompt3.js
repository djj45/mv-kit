// S33 prompt3 — blackout. On the machine-room floor (E1) the laptop is the only light; "Gato," hangs in the dark;
// the box types slowly. On "let me go" (E2) a curl of orange light comes out of the screen and winds round her hand.
// Hand-held: the only shaky camera in the film.
MV.scene('prompt3', akStill({
  arts: ['E1', 'E2'],
  art: f => (f.t < akWord(f, 'Gato', 'let') ? 'E1' : 'E2'),
  clip: f => (f.t < akWord(f, 'Gato', 'let') ? 'E1v' : 'E2v'),
  clipT: f => { const l = akWord(f, 'Gato', 'let'); return f.tq - (f.t < l ? f.from : l); },
  cam: f => { const h = { x: 0.5 + 0.006 * noise1(f.t * 0.8, 1), y: 0.5 + 0.006 * noise1(f.t * 0.7, 2), rot: 0.006 * noise1(f.t * 0.5, 3) }; return f.t < akWord(f, 'Gato', 'let') ? { ...h, z: 1.08 } : { ...h, z: 1.14 }; },
  fx(g, f, map) {
    const let_ = akWord(f, 'Gato', 'let');
    if (f.t < let_) {
      const [lx, ly] = map(...AK_SPOT.E1.laptop); illFlare(g, lx, ly, 380, AK.sig, 0.18);
      const w0 = f.lyrics.get('Gato').words[0];
      illOutline(g, 'Gato,', f.t, w0.start, { x: 470, y: 200, size: 190, over: w0.end - w0.start, alpha: 0.75, drift: 2 });
      return;
    }
    const [hx, hy] = map(...AK_SPOT.E2.hand), [sx, sy] = map(...AK_SPOT.E2.screen), k = prog(f.t, let_, let_ + 1.4, ease.inOutCubic), n = 80, pts = [];
    for (let i = 0; i <= n * k; i++) { const s = i / n, a = s * TAU * 2.2, r = lerp(0, 90, smoothstep(0.55, 0.8, s)); pts.push([lerp(sx, hx, Math.min(1, s / 0.7)) + Math.cos(a) * r, lerp(sy, hy, Math.min(1, s / 0.7)) + Math.sin(a) * r * 0.45 + Math.sin(s * 9 + f.tq * 3) * 12]); }
    if (pts.length > 1) akGlowPath(g, gg => { gg.beginPath(); pts.forEach(([x, y], i) => (i ? gg.lineTo(x, y) : gg.moveTo(x, y))); }, 3.5, 1);
  },
  ly: f => ({ style: 'prompt', words: [1, 6], box: f.t < akWord(f, 'Gato', 'let') ? [300, 860, 1320, 116] : [120, 120, 720, 104], typing: 1 - prog(f.t, f.to - 0.3, f.to), sent: pulse(f.t, f.to - 0.12, 0.12), alpha: 0.9 }),
}));
