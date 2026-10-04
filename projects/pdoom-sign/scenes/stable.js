// 11 stable — 38.43–41.16 · P · #12 "We had a stable training run,"  (the quietest shot of the film)
//   picture: a big sheet of paper. One ECG line, dead flat, crosses the frame at y 620; a pen tip walks along it.
//     After 'stable' the pen leaves the line and climbs to the right, and the second half of the sentence is what
//     it writes: the written row is turned by −11° about the point where the pen left, so the words rise with it,
//     and it grows from M to L as it is written (a canvas scale about that same point: the layout never reflows).
//   camera: insert at 'stable' + 0.2 s (1.4 s, 0.22), following the pen tip. cut: hard to black.
//   lyric: the first four words `stamp` L, top zone, ink; the rest `write` (the pen writes it), M → L. Both on the
//     scene canvas: they ride the creeping page, and the `write` pen tip has to be in scene px for the insert.
//   focus: the pen tip.
MV.scene('stable', {
  LY: 620,                                    // the flat line
  LX0: 420,                                   // where the pen leaves it
  ROT: -11 * Math.PI / 180,                   // how steeply the written half climbs
  /** a point of the written row (un-rotated x, pen line = LY) turned into the picture */
  rowPt(x) {
    const c = Math.cos(this.ROT), s = Math.sin(this.ROT), dx = x - this.LX0;
    return [this.LX0 + dx * c, this.LY + dx * s];
  },
  /** where the pen tip is: walking the flat line, then climbing to where the writing starts */
  penAt(f, tLeave, tWrite) {
    const start = this.rowPt(this.LX0 + 140);
    if (f.t < tLeave) {
      const k = prog(f.t, f.from, tLeave);
      return [lerp(this.LX0 - 280, this.LX0, k), this.LY];
    }
    const k = ease.inOutQuad(prog(f.t, tLeave, tWrite));
    return [lerp(this.LX0, start[0], k), lerp(this.LY, start[1], k)];
  },
  /** the pen tip itself: a yellow dot with a hairline round it (the same pen the write treatment draws) */
  pen(g, x, y) {
    g.save();
    g.fillStyle = SG.C.yellow; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.fill();
    g.strokeStyle = SG.C.ink; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 10, 0, TAU); g.stroke();
    g.restore();
  },
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'P');
    // no shot in this film is allowed to stand still (qa: `static`): the page creeps down 54 px over the shot.
    // It is slow enough to stay "the quietest shot" and stays clear of every margin: the top block ends at 314,
    // the written row in the middle, the lyric boxes move with the page and stay inside the safe area.
    const dy = 54 * ease.inOutQuad(prog(f.t, f.from, f.to));
    g.save(); g.translate(0, dy);
    const cur = WD.current(f), ws = cur ? WD.words(f, cur.line) : [];
    const iW = ws.findIndex(w => /^training/i.test(w.text));       // the first written word
    const iS = ws.findIndex(w => /^stable/i.test(w.text));         // the word the pen leaves the line on
    const tLeave = iS >= 0 ? ws[iS].start : f.from + 0.75;
    const tWrite = iW >= 0 ? ws[iW].start : f.to;
    // the ECG: as flat as it can be
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'round';
    g.beginPath(); g.moveTo(SG.SAFE, this.LY); g.lineTo(1800, this.LY); g.stroke();
    g.restore();
    if (iW > 0) {
      // Both halves stay on the scene canvas (round 2 §4 keeps a lyric that rides the picture): the first four words
      // creep down with the page (dy above) and the written half is turned and scaled with the page's own transform.
      // Above all, `write` reports the pen tip with MV.focus every frame and the timeline's insert (amt 0.22)
      // follows that report — a screen-layer tip would be in output px and the camera reads its focus before the
      // screen layer is drawn. 0.22 is a light punch, so the words' keep box clamping it is the price of the pen.
      WD.line(g, f, { treat: 'stamp', size: 'L', zone: 'top', align: 'left', x: SG.SAFE, maxW: 1500,
                      color: C.ink, only: ws.slice(0, iW).map(w => w.i) });
      const ink = WD.ink(g, f, { size: 'M' });
      const asc = ink ? ink.asc : 80, desc = ink ? ink.desc : 30;
      const sc = 1 + 0.72 * ease.inOutQuad(prog(f.t, tWrite, tWrite + 1.0));    // M → L
      if (f.t < tWrite) {                                                       // our pen, before the writing starts
        const p = this.penAt(f, tLeave, tWrite);
        this.pen(g, p[0], p[1]);
      }
      g.save();
      g.translate(this.LX0, this.LY); g.rotate(this.ROT); g.scale(sc, sc); g.translate(-this.LX0, -this.LY);
      // the written words stand ON the line in the picture; the ink has to clear it by 0.12 em (qa: lyric-touch)
      WD.line(g, f, { treat: 'write', size: 'M', x: this.LX0 + 140, y: this.LY - SG.SIZE.M * 0.12 - desc,
                      color: C.ink, only: ws.slice(iW).map(w => w.i) });
      g.restore();
    } else {
      WD.line(g, f, { treat: 'stamp', size: 'L', zone: 'top', align: 'left', x: SG.SAFE, color: C.ink });
    }
    // our own pen only before the writing starts; after that the write treatment draws (and reports) the pen
    if (f.t < tWrite) { const p = this.penAt(f, tLeave, tWrite); MV.focus(p[0], p[1], 'pen tip'); }
    g.restore();
  },
});
