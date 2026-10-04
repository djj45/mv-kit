// 14 atoms — 49.34–52.52 · P · #15 "I feel my atoms rearranging"
//   picture: the figure stands on an empty page. From the start of 'atoms' its seven pieces — head, chest, pelvis,
//     both arms, both legs — come apart and fly along arcs (each piece keeps its shape and its angle change; only
//     where it is changes), and on the start of 'rearranging' they are a machine: chest + pelvis make the top edge,
//     the arms the sides, one leg the bottom, the other a slot under the eye, and the head is the eye.
//   camera: warp at 'rearranging' − 0.2 s (1.2 s, 0.35). cut: hard.
//   lyric: `stamp` M low zone; 'rearranging' alone at L with a key block — two WD.line calls, o.only, laid out on
//     one baseline by hand (the two calls centre themselves, so the second one is told where the first one ended).
//   focus: the head — it ends up as the machine's eye.
MV.scene('atoms', {
  HX: 960, HY: 585,                              // the hip of the standing figure
  MX: 960, MY: 385,                              // the centre of the machine it assembles into
  /** the seven pieces: the original polyline (or circle centre), and where its centre and heading end up */
  parts() {
    const X = this.HX, Y = this.HY, M = this.MX, N = this.MY;
    const P = SG.POSE.stand, D = a => [Math.sin(a * Math.PI / 180), Math.cos(a * Math.PI / 180)];
    const hip = [X, Y], neck = [X, Y - 120], mid = [X, Y - 60];
    const shL = [X - 26, Y - 108], shR = [X + 26, Y - 108];
    const seg = (p, a, len) => [p[0] + D(a)[0] * len, p[1] + D(a)[1] * len];
    const elL = seg(shL, P.armL[0], 70), haL = seg(elL, P.armL[0] + P.armL[1], 60);
    const elR = seg(shR, P.armR[0], 70), haR = seg(elR, P.armR[0] + P.armR[1], 60);
    const knL = seg(hip, P.legL[0], 80), anL = seg(knL, P.legL[0] + P.legL[1], 80);
    const knR = seg(hip, P.legR[0], 80), anR = seg(knR, P.legR[0] + P.legR[1], 80);
    return [
      { pts: [neck, mid], c1: [M - 30, N - 88], a1: 0 },            // chest  → the top edge, left half
      { pts: [mid, hip], c1: [M + 30, N - 88], a1: 0 },             // pelvis → the top edge, right half
      { pts: [shL, elL, haL], c1: [M - 88, N], a1: 90 },            // arm L  → the left side
      { pts: [shR, elR, haR], c1: [M + 88, N], a1: 90 },            // arm R  → the right side
      { pts: [hip, knL, anL], c1: [M, N + 88], a1: 0 },             // leg L  → the bottom edge
      { pts: [hip, knR, anR], c1: [M, N + 45], a1: 0 },             // leg R  → the slot under the eye
      { pts: [[X, Y - 150]], c1: [M, N], a1: 0, circ: true },       // head   → the eye
    ];
  },
  /**
   * Where the lyric will land, measured before anything is drawn: the ground line breaks where the words are
   * (ROUND3 §2: at y 862 it ran through "I feel my atoms" like a strikethrough). Returns the layout the two
   * WD.line calls use, plus `gap` = the x band the line has to leave free.
   */
  lyricLayout(g, f, ws, iR) {
    if (iR > 0) {
      const only1 = ws.slice(0, iR).map(w => w.i), only2 = [ws[iR].i];
      const m1 = WD.measure(g, f, { treat: 'stamp', size: 'M', only: only1 });
      const m2 = WD.measure(g, f, { treat: 'stamp', size: 'L', only: only2 });
      SG.display(g, SG.SIZE.M);
      const sp = g.measureText(' ').width;
      const w1 = m1 ? m1.w : 700, w2 = m2 ? m2.w : 900;
      const kk = Math.min(1, 1640 / (w1 + sp + w2));
      const ink = WD.ink(g, f, { size: SG.SIZE.M * kk });
      const base = 958 - (ink ? ink.desc : 30);
      const keyPad = SG.SIZE.L * kk * 0.14;          // the yellow block's own padding in front of 'rearranging'
      const x0 = 960 - ((w1 + sp + w2) * kk + keyPad) / 2;
      return { two: true, only1, only2, kk, base, x0, w1, w2, sp, keyPad, gap: null };
    }
    return { two: false, gap: null };
  },
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'P');
    const cur = WD.current(f), ws = cur ? WD.words(f, cur.line) : [];
    const iA = ws.findIndex(w => /^atoms/i.test(w.text));            // the word the pieces start to come apart on
    const iR = ws.findIndex(w => /^rearranging/i.test(w.text));      // … and the word they are assembled on
    const tA = iA >= 0 ? ws[iA].start : f.from + 1.1;
    const tR = iR >= 0 ? ws[iR].start : f.from + 2.0;
    const k = ease.inOutCubic(clamp((f.t - tA) / Math.max(0.2, tR - tA)));
    // The ground line and the seven pieces. ROUND4 §1: the figure and its line stand 115 px higher than in round 3,
    // so the line clears the caption's ink by 50 px and runs the full width — no break, no stubs.
    const lay = this.lyricLayout(g, f, ws, iR);
    const GY = 747, G0 = SG.SAFE, G1 = W - SG.SAFE;
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.rule;
    g.beginPath(); g.moveTo(G0, GY); g.lineTo(G1, GY); g.stroke();
    g.restore();
    const parts = this.parts();
    let headAt = [this.HX, this.HY - 150];
    parts.forEach((P, i) => {
      const a = P.pts[0], b = P.pts[P.pts.length - 1];
      const c0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], a0 = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const ang = a0 + Math.atan2(Math.sin(P.a1 * Math.PI / 180 - a0), Math.cos(P.a1 * Math.PI / 180 - a0)) * k;
      const ux = Math.cos(P.a1 * Math.PI / 180 + Math.PI / 2), uy = Math.sin(P.a1 * Math.PI / 180 + Math.PI / 2);
      const bulge = (hash(i, 3) * 2 - 1) * (140 + 80 * hash(i, 9));
      const ctl = [(c0[0] + P.c1[0]) / 2 + ux * bulge, (c0[1] + P.c1[1]) / 2 + uy * bulge];
      const c = [lerp(lerp(c0[0], ctl[0], k), lerp(ctl[0], P.c1[0], k), k),
                 lerp(lerp(c0[1], ctl[1], k), lerp(ctl[1], P.c1[1], k), k)];
      if (P.circ) headAt = c;
      g.save();
      g.translate(c[0], c[1]); g.rotate(ang - a0); g.translate(-c0[0], -c0[1]);
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'round'; g.lineJoin = 'round';
      if (P.circ) { g.beginPath(); g.arc(P.pts[0][0], P.pts[0][1], 30, 0, TAU); g.stroke(); }
      else { g.beginPath(); P.pts.forEach((p, j) => (j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); }
      g.restore();
    });
    // lyric: the sentence at M in the low zone, 'rearranging' lifted to L on the same baseline (two calls, o.only),
    // both on the screen layer (MV.overlay): the shot has no insert, but the words then stay put while the warp at
    // 'rearranging' tilts the drawing away, and qa can still measure them on those frames (the scene canvas is
    // remapped and cannot be measured). Nothing here uses WD.line's return value; the parts' arcs stay above y 700.
    if (lay.two) {
      const { only1, only2, kk, base, x0, w1, sp, keyPad } = lay;
      MV.overlay(o => {
        WD.line(o, f, { treat: 'stamp', size: SG.SIZE.M * kk, y: base, align: 'left', x: x0, only: only1, maxW: 900 });
        WD.line(o, f, { treat: 'stamp', size: SG.SIZE.L * kk, y: base, align: 'left', x: x0 + (w1 + sp) * kk + keyPad,
                        only: only2, key: 'rearranging', maxW: 1000 });
      });
    } else {
      MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'M', zone: 'low', align: 'center', maxW: 1620 }));
    }
    MV.focus(headAt[0], headAt[1], 'head');
  },
});
