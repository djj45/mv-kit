// board — a framed plate (BOX.panel + BOX.lines: the lines shrink to fit the plate, never past its padding) that the
// timeline's `warp` tilts into 3D: the flat drawing stands up and turns away.
MV.scene('board', {
  render(g, f) {
    D.paperBg(g);
    const Pn = BOX.panel(g, 980, 210, 760, 420, { fill: '#F7F8FA', stroke: D.ink, lw: 2.4, pad: 28, name: 'spec plate' });
    BOX.lines(g, Pn, ['SERVANT CLASS — FITS OR IT DOESN’T', 'OWNER: LOAD BEARING', 'DO NOT REMOVE', 'REV C'], { size: 40, color: D.ink, font: D.mono });
    MV.focus(980 + 380, 210 + 210, 'plate');
    D.line(g, f, { x: 140, y: 860, size: 120, maxW: 1640 });
  },
});
