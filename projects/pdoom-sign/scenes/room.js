// 08 room — 26.16–29.79 · P · #8 "Trapped in the Chinese room," / #9 "with a bag of shrooms"
//   picture: a cross-section through one room (ink frame 1200 × 640 at 400, 400): a doorway in the left wall with
//     the plate "ROOM 0 — SYMBOLS IN / SYMBOLS OUT" on the wall above it, the figure sitting on a bench, a mail
//     slot in the right wall with an out-tray beyond it; one card slides out of the slot on every beat and drops
//     into the tray. From #9 a mushroom bag stands in the far corner of the room.
//   camera: insert at the start of 'room,' (1.0 s, 0.3) following the card out of the slot. cut: hard.
//   lyric: #8 `sign` M top zone (the plate under the door plate); #9 `label` S at the mushroom bag.
//   focus: the card that is sliding out of the slot.
MV.scene('room', {
  X0: 400, Y0: 400, RW: 1200, RH: 640,        // the room, in the picture
  SY: 760, GAP: 130,                          // the mail slot: centre and height of the gap in the right wall
  FY: 1040,                                   // the floor line
  TRAY: [1645, 830, 170, 190],                // the out-tray, outside the right wall
  BAGX: 1420, BAGY: 930,                      // the mushroom bag (#9)
  init() { this.beats = MV.audio.beats; },     // the card schedule is the beat grid: one card per beat
  /** card n born on `beat`: it slides out of the wall, then drops into the tray */
  cardAt(beat, n, t) {
    const A = this.TRAY, a = clamp((t - beat) / 0.34), kx = ease.outCubic(a), ky = ease.inQuad(a);
    return { x: lerp(this.X0 + this.RW, A[0] + A[2] / 2, kx),
             y: lerp(this.SY, A[1] + A[3] - 52 - n * 8, ky),
             rot: lerp(0, (hash(n, 7) * 6 - 3) * Math.PI / 180, kx) };
  },
  render(g, f) {
    const C = SG.C, X0 = this.X0, Y0 = this.Y0, RX = X0 + this.RW, BY = Y0 + this.RH, SY = this.SY;
    SG.bg(g, 'P');
    // ---- the room: ceiling, floor, a doorway in the left wall, the mail slot in the right one
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'round'; g.lineJoin = 'round';
    const seg = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    seg(X0, Y0, RX, Y0);
    seg(X0, BY, RX, BY);
    seg(X0, Y0, X0, Y0 + 280);                       // left wall, above the doorway …
    seg(X0, Y0 + 580, X0, BY);                       // … and below it
    seg(RX, Y0, RX, SY - this.GAP / 2);              // right wall, above the slot …
    seg(RX, SY + this.GAP / 2, RX, BY);              // … and below it
    seg(X0, Y0 + 580, X0 + 212, Y0 + 368);           // the door leaf, swung into the room
    g.restore();
    g.save();                                        // the swing of the door (a hairline)
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.rule;
    g.beginPath(); g.arc(X0, Y0 + 580, 300, -Math.PI / 2, -Math.PI / 4); g.stroke();
    g.restore();
    // ---- the plate on the wall above the door (text in a plate: SG.plate + BOX.lines)
    const P = SG.plate(g, 430, 470, 660, 176, { name: 'room plate' });
    BOX.lines(g, P, ['ROOM 0 — SYMBOLS IN', 'SYMBOLS OUT'], { size: 46, color: C.ink, font: SG.mono });
    // ---- the bench and the figure sitting on it, watching the cards go out
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'round';
    seg(620, 950, 800, 950); seg(642, 950, 642, BY); seg(778, 950, 778, BY);
    g.restore();
    // ---- the mail slot and the tray
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate; g.lineCap = 'butt';
    seg(RX - 60, SY - this.GAP / 2, RX + 60, SY - this.GAP / 2);
    seg(RX - 60, SY + this.GAP / 2, RX + 60, SY + this.GAP / 2);
    g.lineWidth = SG.LW.pict; g.lineCap = 'round';
    const A = this.TRAY; SG.rr(g, A[0], A[1], A[2], A[3], 28); g.stroke();
    g.restore();
    // ---- one card per beat: out of the slot, then into the tray (never over the wall: clipped to its outer face)
    let n0 = 0;
    while (n0 < this.beats.length && this.beats[n0] < f.from) n0++;
    const cards = [];
    for (let n = 0; n < 9 && n0 + n < this.beats.length; n++) {
      const b = this.beats[n0 + n];
      if (b > f.t + 1e-6 || b >= f.to) break;        // not out of the slot yet
      cards.push(this.cardAt(b, n, f.t));
    }
    g.save();
    g.beginPath(); g.rect(RX + 17, 0, W - RX - 17, H); g.clip();
    for (const c of cards) {
      g.save(); g.translate(c.x, c.y); g.rotate(c.rot);
      g.fillStyle = C.paper2; g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate;
      SG.rr(g, -75, -48, 150, 96, 12); g.fill(); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.rule;   // three rules of "symbol" on the card (never text)
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-52, -20 + i * 20); g.lineTo(24 - i * 16, -20 + i * 20); g.stroke(); }
      g.restore();
    }
    g.restore();
    const last = cards[cards.length - 1];
    const look = last ? clamp((last.x - 980) / 80, -12, 10) : 0;
    SG.figure(g, 720, 920, 1.0, Object.assign({}, SG.POSE.sit, { head: [look, -30 + 2 * f.a.kick], dy: 30 + 3 * f.a.kick }),
              { color: C.ink, focus: false });
    // ---- the mushroom bag in the corner, from #9 (a rounded bag with a mushroom on it)
    const shroom = f.lyrics.has('bag of shrooms') ? f.lyrics.get('bag of shrooms', 0) : null;
    const bagK = shroom ? ease.outBack(clamp((f.t - shroom.start) / 0.3)) : 0;
    if (bagK > 0.01) {
      const bx = this.BAGX, by = this.BAGY, bw = 170, bh = 200, foot = by + bh / 2;
      g.save();
      g.translate(bx, foot); g.scale(bagK, bagK); g.translate(-bx, -foot);
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'round'; g.lineJoin = 'round';
      SG.rr(g, bx - bw / 2, by - bh / 2, bw, bh, 54); g.stroke();
      g.beginPath(); g.moveTo(bx - 46, by - bh / 2 + 6); g.lineTo(bx, by - bh / 2 + 30); g.lineTo(bx + 46, by - bh / 2 + 6); g.stroke();
      g.beginPath(); g.arc(bx, by + 8, 46, Math.PI, 0); g.stroke();                                     // the cap
      g.beginPath(); g.moveTo(bx - 15, by + 8); g.lineTo(bx - 15, by + 60);
      g.moveTo(bx + 15, by + 8); g.lineTo(bx + 15, by + 60); g.stroke();                                // the stem
      g.restore();
    }
    // ---- lyric: #8 on the plate above the door plate, #9 a small label on the bag. Both stay on the scene canvas
    //      (round 2 §4): the plate is a board on the room's wall and the label's leader is tied to the bag, so both
    //      belong in the picture. Their keep boxes are what limits this shot's insert to a few per cent — that is the
    //      camera keeping the board on screen, which is right for a plate that is part of the room.
    const cur = WD.current(f);
    if (cur && shroom && cur.line.i === shroom.i) {
      WD.line(g, f, { treat: 'label', size: 'S', at: [this.BAGX, this.BAGY - 100], dx: -450, dy: -120, maxW: 620 });
    } else {
      const ink = WD.ink(g, f, { size: 'M' });
      WD.line(g, f, { treat: 'sign', size: 'M', zone: 'top', align: 'center', pad: 40, maxW: 1500,
                      y: 190 + (ink ? ink.asc : 80) });
    }
    MV.focus(last ? last.x : RX, last ? last.y : SY, 'card out of the slot');
  },
});
