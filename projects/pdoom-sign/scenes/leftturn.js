// 24 leftturn · 81.15–84.79 · B · #25「Sharp left turn and there you are」
// Picture: a diamond road sign (yellow, ink frame, 80 % of the frame's height) with a sharp-left arrow inside,
// standing over a road. At 'turn' start the world — sign and road, not the lyric — turns 90° to the left about
// the centre of the frame with g.rotate; when it comes round, the road runs off to the right and there is a
// machine standing at the end of it. The turn is drawn in the scene, never with the post's `rot`: the black
// ground goes on forever, so there are no corners to expose. The arrow juts on the kick.
// focus: the head of the arrow → the eye of the machine. Lyric: tape, angle 0, low zone, outside the turn —
// on the screen layer (MV.overlay): the tape never turns with the world, so it lives in screen space.
MV.scene('leftturn', {
  render(g, f) {
    SG.bg(g, 'B');
    const C = SG.C, cx = 960, cy = 540;
    const wTurn = f.lyrics.findWords('turn')[0].start;
    const th = -Math.PI / 2 * ease.inOutCubic(clamp((f.t - wTurn) / 0.5));
    const ct = Math.cos(th), st = Math.sin(th);
    const X = (x, y) => [cx + (x - cx) * ct - (y - cy) * st, cy + (x - cx) * st + (y - cy) * ct];
    const jut = -10 * f.a.kick;
    g.save();
    g.translate(cx, cy); g.rotate(th); g.translate(-cx, -cy);
    // the road: it leaves the frame at the bottom and comes back on the right once the world has turned
    g.fillStyle = C.paper; g.fillRect(840, 500, 240, 900);
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.rule; g.setLineDash([46, 38]);
    g.beginPath(); g.moveTo(960, 520); g.lineTo(960, 1440); g.stroke(); g.setLineDash([]);
    // the machine at the end of it (off the bottom of the frame until the world turns)
    SG.machine(g, 960, 1250, 0.7, { fill: C.ink, color: C.ink, eye: C.paper, pupil: C.ink,
                                    gaze: [0.2, 0], blink: clamp(1.4 * f.a.snare), focus: false });
    // the sign: an 864 px diamond (80 % of the height) with the sharp left turn arrow inside
    const pts = [[960, 108], [1392, 540], [960, 972], [528, 540]];
    g.save();
    SG.rpoly(g, pts, 49);
    g.fillStyle = C.yellow; g.fill();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate; g.lineJoin = 'round'; g.stroke();
    g.restore();
    const ax = 1000 + jut;
    SG.poly(g, [[ax, 730], [ax, 430], [838 + jut, 430]], { lw: SG.LW.pict, color: C.ink });
    g.save();
    g.fillStyle = C.ink;
    g.beginPath(); g.moveTo(750 + jut, 430); g.lineTo(838 + jut, 386); g.lineTo(838 + jut, 474); g.closePath(); g.fill();
    g.restore();
    g.restore();                       // the world stops turning here: the lyric is drawn in screen space
    // focus: the head of the arrow, handed over to the machine's eye as the world comes round
    const kf = clamp((f.t - (wTurn + 0.30)) / 0.35);
    const p = X(lerp(750, 960, kf), lerp(430, 1250, kf));
    MV.focus(p[0], p[1], kf > 0.5 ? 'machine eye' : 'arrow head');
    // The tape is a caption across the bottom of the page, and the scene's world (sign + road) turns 90° under it:
    // the screen layer (MV.overlay) is exactly where it belongs — drawn after the camera it cannot inherit the
    // scene's g.rotate (it was already drawn outside that transform), the push leaves it alone, and its keep box no
    // longer clamps the push.
    MV.overlay(o => WD.line(o, f, { treat: 'tape', angle: 0, size: 'M', zone: 'low' }));
  },
});
