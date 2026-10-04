// 15 sydney — 52.52–58.88 · P · #16 "Sydney, please let me free"
//   picture: a safety fence (ink uprights and two rails) across the foreground; behind it a machine, its eye
//     looking through the fence straight at the camera — the gaze follows the word being typed. The black LED board
//     is hung on the fence and the sentence is typed onto it word by word (mono, paper on ink, yellow edge).
//   camera: insert at 'free' − 0.6 s (1.4 s, 0.3). cut: hard into the chorus.
//   lyric: `sign` M (fill ink, paper words, yellow border), top zone. focus: the machine's eye.
MV.scene('sydney', {
  MX: 960, MY: 560, MS: 1.3,
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'P');
    // the machine behind the fence, looking at us
    const cur = WD.current(f), ws = cur ? WD.words(f, cur.line) : [];
    let last = -1;
    for (let i = 0; i < ws.length; i++) if (f.t >= ws[i].start) last = i;
    const gx = ws.length > 1 && last >= 0 ? ((last + 0.5) / ws.length) * 1.7 - 0.85 : 0;
    const eye = SG.machine(g, this.MX, this.MY, this.MS,
                           { gaze: [gx, 0.06], blink: clamp(f.a.kick * 1.1), fill: C.paper2, focus: false });
    // the fence, in front of everything but the words
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'butt';
    for (let x = 80; x <= W; x += 160) {
      if (Math.abs(x - this.MX) < 100) continue;                    // leave the eye a window in the mesh
      g.beginPath(); g.moveTo(x, 150); g.lineTo(x, H); g.stroke();
    }
    g.lineWidth = SG.LW.plate;
    for (const y of [320, 780]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.restore();
    // the lyric is the LED board itself: an ink plate with a yellow edge, mono words, typed on one at a time. It
    // stays on the scene canvas (round 2 §4 keeps `sign`): the board is hung on the fence in this picture, and the
    // machine's gaze follows the word being typed, which only reads if the board moves with the fence. Its keep box
    // is what limits this shot's insert to a few per cent — the camera is keeping the board in the frame.
    const ink = WD.ink(g, f, { size: 'M' });
    WD.line(g, f, { treat: 'sign', size: 'M', face: 'mono', zone: 'top', align: 'center', pad: 34, maxW: 1500,
                    y: 150 + (ink ? ink.asc : 80), fill: C.ink, border: C.yellow, color: C.paper });
    MV.focus(eye[0], eye[1], 'machine eye');
  },
});
