// 12 singularity — 41.16–44.79 · B → Y · #13 "But now the singularity's begun"
//   picture: black. A yellow disc (r 20) sits on the frame's vertical axis, 60 px above the middle (the punch-in
//     needs the room below it: see the cap in render), with six rings of hazard stripes marching in towards it (the
//     rings' thickness and stripe period shrink with their radius, so they stay six rings and never merge into one
//     band). From 'singularity's' the disc swells; on the start of 'begun' the whole frame turns yellow — the first
//     of the film's two (§2) — and the rings and the disc invert to ink; the rings tuck in under the disc on that
//     same frame (they are ink there, and an ink ring sweeping across 'begun' would rub it out — qa: lyric-covered).
//   camera: insert at the start of 'singularity's' (1.6 s, 0.6). cut: hard.
//   lyric: `stamp` XL, split into two calls, on the screen layer (MV.overlay) — the disc's radius is capped so that
//     its black never reaches the lyric's ink even at the end of the punch-in (ink on ink would rub the words out).
//   focus: the centre of the disc.
MV.scene('singularity', {
  CX: 960, CY: 480,
  RINGS: [420, 530, 640, 750, 860, 970],
  render(g, f) {
    const C = SG.C, CX = this.CX, CY = this.CY;
    const cur = WD.current(f), ws = cur ? WD.words(f, cur.line) : [];
    const iS = ws.findIndex(w => /^singularity/i.test(w.text));
    const iB = ws.findIndex(w => /^begun/i.test(w.text));
    const tS = iS >= 0 ? ws[iS].start : f.from + 1.1;
    const tB = iB >= 0 ? ws[iB].start : f.from + 2.9;
    const yellow = f.t >= tB;
    SG.bg(g, yellow ? 'Y' : 'B');
    // The sentence is drawn in two calls (o.only): its first half in the top zone, 'begun' alone in the low one.
    // One call cannot do it — the stamp wraps this sentence onto two rows at any size above ~150 (both rows then
    // fit, so the fitting loop stops there) and a two-row block reaches down into the middle of the frame, where
    // the disc is. Split, 'begun' gets the XL it is written at and 'singularity's' is above the disc.
    const pre = ws.length && iB > 0 ? ws.slice(0, iB).map(w => w.i) : null;
    const only = iB >= 0 ? [ws[iB].i] : null;
    let sPre = SG.SIZE.L;
    if (pre) {
      const full = pre.map(i => ws[i].text).join(' ');
      for (let it = 0; it < 8; it++) { SG.display(g, sPre); if (g.measureText(full).width <= 1600) break; sPre *= 0.93; }
    }
    // o.zone is not optional here: without it WD.measure lays the line out in the *middle* zone (base 615), and the
    // cap below would be measured off a box 280 px too high — round 1 called it that way, so its cap was only the
    // clamp's floor (55) and never actually followed 'begun'.
    const m = WD.measure(g, f, { treat: 'stamp', size: 'XL', zone: 'low', only });
    const lowTop = m ? m.y : 690;                    // the ink top of 'begun' (low zone, one row) — 683 in this film
    // The insert really punches in now that the line is on the screen layer (round 2 §4): the world scales about the
    // disc by ZMAX = 1 + amt 0.6 × the shot's push ≈ 1.66, and the disc has to stay clear of 'begun' on *screen*.
    // ZMAX is that zoom and 48 is the gap the words want; the −10 is the kick's pulse, which is added in scene px.
    const ZMAX = 1.66;
    const rMax = clamp((lowTop - 48 - CY) / ZMAX - 10, 30, 420);
    const grow = ease.inCubic(prog(f.t, tS, f.to));
    const r = Math.min(rMax, 20 + (rMax - 20) * grow + 10 * f.a.kick);
    // the rings close in all through the shot; the frame turns at tB and they turn with it, so from that instant they
    // are ink and tuck in under the disc at once (a 0.4 s tuck would sweep ink stripes across 'begun' — qa:
    // lyric-covered; at 0.985 every ring's outer edge is inside the disc, so nothing peeks out around it). The snap is
    // invisible: the whole frame changes colour on that same frame anyway.
    const close = ease.inOutQuad(prog(f.t, f.from, tB)) * 0.66 + (f.t >= tB ? 0.985 - 0.66 : 0);
    const col = yellow ? C.ink : C.yellow;
    for (let i = this.RINGS.length - 1; i >= 0; i--) {
      const R = this.RINGS[i] * (1 - close), w = clamp(R * 0.11, 13, 46);
      if (R - w / 2 <= 0 || R + w / 2 < r) continue;      // collapsed to nothing, or tucked in under the disc
      g.save();
      g.beginPath();
      g.arc(CX, CY, R + w / 2, 0, TAU);
      g.arc(CX, CY, R - w / 2, 0, TAU, true);
      g.clip();
      SG.stripes(g, CX - R - w, CY - R - w, 2 * (R + w), 2 * (R + w),
                 { period: w * 1.15, phase: f.t * 80, fill: col, color: yellow ? C.yellow : C.ink });
      g.restore();
    }
    g.fillStyle = col;
    g.beginPath(); g.arc(CX, CY, r, 0, TAU); g.fill();
    // The sentence is drawn in two calls (o.only), both on the screen layer (MV.overlay): its first half in the top
    // zone, 'begun' alone in the low one. One call cannot do it — the stamp wraps this sentence onto two rows at any
    // size above ~150 (both rows then fit, so the fitting loop stops there) and a two-row block reaches down into
    // the middle of the frame, where the disc is. Split, 'begun' gets the XL it is written at and 'singularity's' is
    // above the disc. Round 1 had them in the scene, where their MV.keep box clamped the punch-in to a few per cent.
    MV.overlay(o => {
      WD.line(o, f, { treat: 'stamp', size: sPre, zone: 'top', align: 'center', maxW: 1620, only: pre,
                      color: SG.fg(yellow ? 'Y' : 'B') });
      WD.line(o, f, { treat: 'stamp', size: 'XL', zone: 'low', align: 'center', maxW: 1620, only,
                      color: SG.fg(yellow ? 'Y' : 'B') });
    });
    MV.focus(CX, CY, 'singularity centre');
    return { shake: 6 * f.a.kick };
  },
});
