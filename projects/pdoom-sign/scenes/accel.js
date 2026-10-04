// 13 accel — 44.79–49.34 · B · #14 "And you're optimizing, accelerating,"
//   picture: four staggered rows of yellow chevrons (h 120) streaming right → left across the black, their speed
//     growing exponentially with the shot time (x = x0 − v0·(e^{k·lt} − 1)); the figure runs in the middle (paper,
//     s 1.0) and its stride keeps time with the distance the flow has covered, so the gait accelerates with it
//     (on twos: the phase is taken from f.tq, so the run steps like a flip book).
//   camera: the kit's push. cut: hard.
//   lyric: `tape`, angle −8°, mid zone, M → L (the whole tape is scaled from 1 to 1.16 over the shot: at M the fit
//     already caps this 36-character line at ~89 px, and a full 1.73× would run the tape out of the frame).
//   focus: the runner's head.
MV.scene('accel', {
  ROWS: [170, 350, 790, 960], ROWOFF: [0, 85, 40, 130],
  PITCH: 170, V0: 60, K: 0.9,
  /** how far the flow has travelled by shot time lt */
  travel(lt) { return this.V0 * (Math.exp(this.K * Math.max(0, lt)) - 1); },
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'B');
    const off = this.travel(f.lt);
    const offQ = this.travel(f.tq - f.from);            // the pose is stepped on twos, the flow on f.t
    for (let j = 0; j < this.ROWS.length; j++) {
      const y = this.ROWS[j], o0 = this.ROWOFF[j];
      for (let i = 0; i < 13; i++) {
        const span = 13 * this.PITCH;
        const x = ((i * this.PITCH - off - o0) % span + span) % span - this.PITCH;
        SG.chevron(g, x, y, 120);
      }
    }
    const hip = SG.figure(g, 960, 900, 1.0, SG.POSE.run(offQ / 260 % 1), { color: C.paper, focus: false });
    // The tape stays on the scene canvas (round 2 §4 keeps `tape`): it is a hazard tape strung across the frame, it
    // has to live in the same space as the chevrons streaming past it, and the M → L growth below is the tape's own
    // scale about the frame centre. The shot has no insert — the kit's push is all this camera does.
    g.save();                                            // the tape: M → L as the shot accelerates
    const sc = 1 + 0.16 * ease.inQuad(f.p);
    g.translate(960, 540); g.scale(sc, sc); g.translate(-960, -540);
    WD.line(g, f, { treat: 'tape', size: 'M', angle: -8, zone: 'mid', maxW: 1400 });
    g.restore();
    MV.focus(hip.head[0], hip.head[1], 'runner head');
  },
});
