// 10 eyes — 32.97–38.43 · B · #11 "with your shinigami eyes"
//   picture: a huge eye on black — paper white lens (1400 × 700, two thirds of the frame), iris in three rings
//     (yellow / ink / yellow) with eight gaps each, ink pupil. The rings step 22.5° round on every beat, alternating
//     direction, so the turn reads. The whole eye shuts on every kick (the white squashed vertically).
//   camera: the timeline's insert (the last 1.2 s, 0.9) on the pupil, and it really punches in now: the lyric is on
//     the screen layer, so nothing clamps the zoom. The scene still opens the pupil out itself until its black
//     covers the frame — that black is what shot 11 cuts from.
//   lyric: `stamp` XL, paper, low zone, key 'eyes', on the screen layer (MV.overlay). XL is asked for and then
//     fitted down to the one row that fits above the frame's floor: a two-row block reaches up into the eye's
//     white, and paper on paper is an invisible word (qa measured 64 % of "with" on the first pass).
//   focus: the pupil.
MV.scene('eyes', {
  CX: 960, CY: 420, PUPIL: 95,
  RING: [[95, 145, 1], [145, 275, -1], [275, 340, 1]],      // [rIn, rOut, direction]: eight gaps in each
  init() {
    const e = MV.entries.filter(x => x.scene === 'eyes')[0];
    this.at = e && e.insert ? e.insert.at : null;           // the timeline's punch-in key: the last 1.2 s
    this.dur = e && e.insert && e.insert.dur ? e.insert.dur : 1.2;
  },
  /** one iris ring: eight arc segments, so a step of 22.5° really looks like a turn */
  ring(g, rIn, rOut, col, ang) {
    const r = (rIn + rOut) / 2, gap = 7 * Math.PI / 180;
    g.save(); g.strokeStyle = col; g.lineWidth = rOut - rIn; g.lineCap = 'butt';
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.arc(this.CX, this.CY, r, ang + i * Math.PI / 4 + gap / 2, ang + (i + 1) * Math.PI / 4 - gap / 2);
      g.stroke();
    }
    g.restore();
  },
  lens(g) {
    const CX = this.CX, CY = this.CY;
    g.beginPath();
    g.moveTo(CX - 700, CY);
    g.quadraticCurveTo(CX, CY - 700, CX + 700, CY);
    g.quadraticCurveTo(CX, CY + 700, CX - 700, CY);
  },
  render(g, f) {
    const C = SG.C, CX = this.CX, CY = this.CY;
    SG.bg(g, 'B');
    // one blink per kick: taken from the kick onsets with a short half life (f.a.kick holds near 1 through this
    // loud section, which would leave the eye shut for the whole shot), and on twos like every other pose
    const kick = clamp(f.audio.hit('kick', f.tq, 0.05) * 1.3);
    const step = Math.floor(f.beat) + ease.outCubic(clamp((f.beat % 1) / 0.3));   // 22.5° per beat, snapped
    const punch = this.at == null ? 0 : Math.pow(clamp((f.t - this.at) / this.dur), 4);
    const zoom = 1 + 0.16 * punch;
    g.save();
    g.translate(CX, CY); g.scale(zoom, zoom * (1 - 0.93 * kick)); g.translate(-CX, -CY);
    g.fillStyle = C.paper; this.lens(g); g.fill();                       // the white of the eye
    g.save(); this.lens(g); g.clip();                                    // the iris, clipped to the lids
    for (const [a, b, dir] of this.RING) this.ring(g, a, b, dir < 0 ? C.ink : C.yellow, dir * step * Math.PI / 8);
    g.fillStyle = C.ink; g.beginPath(); g.arc(CX, CY, this.PUPIL, 0, TAU); g.fill();
    g.restore();
    g.restore();
    const cur = WD.current(f), ws = cur ? WD.words(f, cur.line) : [];
    let sL = SG.SIZE.XL;                                          // XL, shrunk to what fits on one row
    if (ws.length) {
      const full = ws.map(w => w.text).join(' ');
      for (let it = 0; it < 8; it++) { SG.display(g, sL); if (g.measureText(full).width <= 1600) break; sL *= 0.93; }
    }
    // The line is on the screen layer (MV.overlay): drawn after the camera and after the pupil, which is what lets
    // the timeline's insert really punch in 0.9 (round 1's keep box pinned it to a couple of per cent) — the eye's
    // white is pushed up under the words, and the words, being paper, now sit on the iris and on the pupil's black
    // instead of being swallowed by it. Round 2 §4: the whole frame is no longer black on the cut, the last word
    // rides the black on the screen layer — the shot still ends on a black frame with 'eyes' on it.
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: sL, zone: 'low', align: 'center', color: C.paper, key: 'eyes', maxW: 1620 }));
    // the punch: the pupil opens out over the last 1.2 s and its black takes the frame (fourth-power ease: it
    // hangs still at first, then rushes); it is drawn over the eye, and the words are drawn over it on the screen layer
    if (punch > 0.002) {
      g.fillStyle = C.ink;
      g.beginPath(); g.arc(CX, CY, this.PUPIL + 1240 * punch, 0, TAU); g.fill();
    }
    MV.focus(CX, CY, 'pupil');
  },
});
