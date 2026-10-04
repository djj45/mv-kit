// hook — the chorus, three times on the same dial (shots 06 / 16 / 36, params.n = 1 | 2 | 4).
//   06 n=1 · 22.52–23.88 · B · dial at 960,1010 R600, needle 0.10 → 0.35 (one step per word start),
//        hazard strip along its foot. focus: needle tip. camera: push 0.08, shake 6 on every kick.
//        lyric: stamp XL paper, top zone, key 'P(doom)'.
//   16 n=2 · 58.88–60.25 · B · same dial, needle 0.35 → 0.60; this time a ring of hazard stripes turns outside it.
//   36 n=4 · 124.34–125.70 · Y · the whole frame yellow (the second and last time), the same dial drawn in ink,
//        needle hammered to 1.00 and stuck there trembling ±1.5°, shake 10 on every kick. lyric: stamp XL ink, no key.
MV.scene('hook', {
  render(g, f) {
    const n = (f.params && f.params.n) || 1;
    const black = n !== 4;
    SG.bg(g, black ? 'B' : 'Y');
    // The last chorus's dial sits 30 px higher and 5 % smaller: with the needle pinned flat along the dial's foot at
    // 1.00, the entry's push (0.1) put the tip 23 px from the bottom edge (qa focus-out: the subject within 3 % of
    // the frame), and a full-size dial would also have reached up into the top line's descenders on the yellow frame.
    const C = SG.C, R = n === 4 ? 570 : 600, cx = 960, cy = n === 4 ? 980 : 1010;
    const line = f.lyrics.get('upping my P', n === 1 ? 0 : n === 2 ? 1 : 3);
    const ws = line.words;
    const from = n === 4 ? 0.62 : n === 1 ? 0.10 : 0.35;
    const to = n === 4 ? 1.0 : n === 1 ? 0.35 : 0.60;
    const stepV = i => from + (to - from) * (i / (ws.length - 1));
    let idx = -1;
    for (let i = 0; i < ws.length; i++) if (f.t >= ws[i].start) idx = i;
    let v = from;
    if (idx >= 0) {                                     // the needle jumps a step per word and settles in 0.14 s
      const a = idx <= 0 ? from : stepV(idx - 1), b = stepV(idx);
      v = lerp(a, b, ease.outCubic(clamp((f.t - ws[idx].start) / 0.14)));
    }
    // n=4: stuck at 1.00, trembling. v is in dial units (1 = one full 180°), so ±1.5° is ±1.5/180.
    if (n === 4 && idx === ws.length - 1) v = 1 + (1.5 * Math.PI / 180) * Math.sin(f.t * 9.0) / Math.PI;
    if (n === 2) {                                      // this time a ring of hazard stripes turns outside the dial
      g.save();
      g.beginPath(); g.arc(cx, cy, R * 1.12, Math.PI, TAU);
      g.arc(cx, cy, R * 1.05, TAU, Math.PI, true); g.closePath(); g.clip();
      SG.stripes(g, cx - R * 1.18, cy - R * 1.22, R * 2.36, R * 1.22, { period: 42, phase: -f.t * 150 });
      g.restore();
    }
    const tip = SG.gauge(g, cx, cy, R, v, black
      ? { fg: C.paper, top: C.paper, c0: C.paper2, c1: C.yellow, label: 'P(DOOM)' }
      : { fg: C.ink, top: C.ink, c0: C.ink, c1: C.ink, needle: C.paper, label: 'P(DOOM)' });
    SG.stripes(g, 0, cy - 6, W, H - cy + 6, { period: 64, phase: f.t * 70 });     // the strip along the dial's foot
    MV.focus(tip[0], tip[1], 'needle tip');
    // The lyric is a zone line, so it goes on the screen layer (MV.overlay): the dial creeps in under it (entry
    // `push: 0.08 / 0.1`) instead of being clamped by a MV.keep box, and the words stay put. rows: 1 — at XL the
    // chorus is wider than the frame and would wrap onto the dial.
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'XL', rows: 1, zone: 'top', align: 'center', maxW: 1600,
                                    color: black ? C.paper : C.ink, key: black ? 'P(doom)' : null }));
    return { shake: (n === 4 ? 10 : 6) * f.a.kick };
  },
});
