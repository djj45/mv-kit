// 22 layers · 73.88–77.52 · P · #23「Forward MLP, backward, repeat」
// Picture: five boards of the same size (one mono LAYER 0n in each), stacked with a real thickness — every board
// carries its own y offset and its own side face, so the timeline's warp (2D → 3D, the film's representative
// shot) really turns a stack and not a flat drawing. A yellow arrow runs down through the five layers on
// 'Forward', back up on 'backward', and becomes a loop around the stack on 'repeat'.
// focus: the arrow's head. Lyric: step, split [0, 2, 3], low zone — on the screen layer (MV.overlay): the
// warp tilts the scene canvas, the caption stays square to the page.
MV.scene('layers', {
  /**
   * One owner for the whole stack. Five boards drawn with SG.plate would register five boxes, and because the
   * boards overlap each other, every label then reports as text cut by a neighbour's box edge (qa: 16 box-clash
   * warnings). With one shared owner a label is only ever checked against its own board.
   */
  init() { this.owner = MV.owner('layer stack'); },
  /** one board: the side face first (the same board pushed down-right), then the face and its label */
  board(g, x, y, w, h, label) {
    const r = h * 0.08, TX = 26, TY = 34;
    g.save();
    g.fillStyle = SG.C.paper2; SG.rr(g, x + TX, y + TY, w, h, r); g.fill();
    g.strokeStyle = SG.C.ink; g.lineWidth = SG.LW.plate; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = SG.C.paper; SG.rr(g, x, y, w, h, r); g.fill(); g.stroke();
    g.restore();
    // ROUND4 §2: the label sits in the strip this board leaves showing (the neighbour covers everything below
    // y + 62), not vertically centred in the whole board — it used to be cut by the neighbour's border (qa:
    // text-touch 32 %). BOX.lines owns it, so qa still checks it against the board it is printed on.
    // ... and it has to sit inside the neighbour's box as well as its own (the boards are offset +26 right, −62 up;
    // a label that pokes out of either box is a box-cross). (x + 30, y + 38) is inside both, and inside the strip the
    // board leaves showing.
    MV.box(g, x, y, w, h, { name: 'layer', pad: 3, owner: this.owner });
    MV.within(this.owner, () => BOX.text(g, label, x + 30, y + 38, { size: 30, font: SG.mono, color: SG.C.ink }));
  },
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    // the stack sits 80 px higher than in round 3: its lower border was coming within a hair of the caption's cap
    // tops once the timeline's warp had stretched the near side of the plane (ROUND4 §2, qa: lyric-touch 18 %)
    for (let k = 4; k >= 0; k--) this.board(g, 420 + k * 26, 310 - k * 62, 1080, 104, 'LAYER 0' + (k + 1));
    // the arrow: down the stack on 'Forward', back up on 'backward', a loop around it on 'repeat'
    const wF = f.lyrics.findWords('Forward')[0].start, wB = f.lyrics.findWords('backward')[0].start,
          wR = f.lyrics.findWords('repeat')[0].start;
    let head = [960, 120];
    if (f.t < wR) {
      const down = f.t < wB;
      const k = down ? clamp((f.t - (wF + 0.10)) / Math.max(0.2, wB - 0.10 - wF - 0.10)) : clamp((f.t - wB) / Math.max(0.2, wR - wB));
      head = [960, down ? lerp(120, 580, ease.inOutQuad(k)) : lerp(580, 120, ease.inOutQuad(k))];
      const tail = [960, down ? head[1] - 320 : head[1] + 320];   // the shaft runs off the top / bottom of the stack
      SG.arrow(g, tail[0], tail[1], head[0], head[1], { w: 40, head: 90, color: C.yellow });
    } else {
      // 'repeat': the arrow lets go of the straight line and travels around the stack instead
      const cx = 960, cy = 360, rx = 650, ry = 250, a0 = -Math.PI / 2;
      const sweep = TAU * (1 + 0.35 * clamp((f.t - wR) / Math.max(0.2, f.to - wR))) * clamp((f.t - wR) / 0.30);
      const a1 = a0 + sweep;
      g.save();
      g.strokeStyle = C.yellow; g.lineWidth = 40; g.lineCap = 'round';
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, a0, a1); g.stroke();
      g.restore();
      head = [cx + rx * Math.cos(a1), cy + ry * Math.sin(a1)];
      // the head is a proper 90 px arrow head: SG.arrow sizes it by the stub's length, so the stub is 140 long
      const tx = -rx * Math.sin(a1), ty = ry * Math.cos(a1), tl = Math.hypot(tx, ty) || 1;
      SG.arrow(g, head[0] - tx / tl * 140, head[1] - ty / tl * 140, head[0], head[1], { w: 40, head: 90, color: C.yellow });
    }
    MV.focus(head[0], head[1], 'arrow head');
    // the lyric goes on the screen layer (MV.overlay): a low-zone step caption, drawn after the camera — the
    // timeline's warp tilts the scene canvas away and the caption has to stay square to the page (qa can still
    // measure it on the tilted frames: engine/qa.js maps screen-layer text as drawn)
    MV.overlay(o => WD.line(o, f, { treat: 'step', split: [0, 2, 3], zone: 'low' }));
  },
});
