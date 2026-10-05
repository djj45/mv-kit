// chase — the spark zips off; Pip trots after it (ACT.walk, side view, nervous); stops and turns to us, smug (ACT.turn
// steps through the drawn views); the spark drops off the ledge; Pip's take, then it creeps to the edge and peers down.
MV.scene('chase', {
  render(g, f) {
    const t = f.tq, GY = 860, EDGE = 1380, U = 26;
    LK.bg(g); LK.floor(g, GY, EDGE);
    // the spark: zips right (5.7 → 6.4), hovers past the ledge, drops on "drop" (10.66) and leaves the frame
    let sx = lerp(420, 1520, ease.outExpo(prog(t, 5.7, 6.4))), sy = 560 + 12 * Math.sin(t * 4);
    if (t >= 10.66) sy = lerp(560, 1300, ease.inCubic(prog(t, 10.66, 11.2)));
    if (sy < H + 60) LK.spark(g, sx, sy, 26, f.t);
    // Pip: trots 6.0 → 8.0, turns to us on "no" (8.09), the take on the drop, then creeps to the edge from 11.34
    const w1 = ACT.walk(t, 6.0, 8.0, 260, 980, 70), w2 = ACT.walk(t, 11.34, 12.3, 980, 1260, 50);
    const x = t < 11.34 ? w1.x : w2.x, walking = w1.moving || w2.moving;
    const mood = ACT.emotions(t, [[5.7, 'neutral'], [6.56, 'nervous'], [8.5, 'smug'], [10.8, 'surprised'], [11.6, 'scared']]);
    let view = { view: 'front', flip: false };
    if (t < 8.09) view = walking ? { view: 'side', flip: false } : { view: 'q', flip: false };
    else if (t < 8.4) view = ACT.turn(t, 8.09, 8.29, 0.25, 0);
    else if (t >= 11.2) view = ACT.turn(t, 11.2, 11.38, 0, 0.25);
    const peer = ACT.poses(t, [[0, { rot: 0, lookY: 0 }], [12.3, { rot: 0.32, lookY: 1, lookX: 0.6 }, 0.35]]);
    const pose = ACT.add(mood, walking ? { walk: (t < 11.34 ? w1 : w2).walk, dy: (t < 11.34 ? w1 : w2).dy } : {}, t >= 12.3 ? { rot: peer.rot } : {});
    PIP.draw(g, x, GY, U, { ...pose, ...view, ...(t >= 12.3 ? { lookX: peer.lookX, lookY: peer.lookY } : {}) }, t);
    const head = [x, GY + (pose.dy || 0) * U - 6.4 * U];
    // the subject: the spark while it zips off and while it drops (until it leaves the picture), Pip otherwise
    const sparkLead = (f.t < 6.5) || (f.t >= 10.66 && sy < H - 40);
    if (sparkLead) { MV.focus(...head, 'pip'); MV.focus(sx, sy, 'spark'); }
    else { if (sy < H) MV.focus(sx, sy, 'spark'); MV.focus(...head, 'pip'); }
    MV.overlay(o => LK.line(o, f, { x: 150, y: 230, size: 150, maxW: 1100 }));    // the empty sky, top left: short lines shout
  },
});
