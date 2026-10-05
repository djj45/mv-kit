// wake — Pip asleep; a spark drifts in; Pip wakes with a start, stars in its eyes, and jumps for it.
// Acting: ACT.emotions (sleepy → surprised → starstruck: squint, swap, take, settle), ACT.jump on the beat, the spark's
// hop on an arc (ACT.arc), Pip's eyes leading (lookX/Y follow the spark before the body turns to it).
MV.scene('wake', {
  render(g, f) {
    const t = f.tq, GY = 880, X = 760, U = 34;
    LK.bg(g); LK.floor(g, GY);
    // the spark: drifts in on a wave (1.2 → 2.7 s), hovers, then hops up and away as Pip jumps (4.34 s, a beat)
    let sx, sy;
    if (t < 2.7) { const k = ease.outCubic(prog(t, 0.9, 2.7)); sx = lerp(-80, 1180, k); sy = lerp(260, 470, k) + 40 * Math.sin(k * 7); }
    else if (t < 4.2) { sx = 1180; sy = 470 + 10 * Math.sin(t * 5); }
    else { [sx, sy] = ACT.arc([1180, 470], [1380, 300], 120, ease.outCubic(prog(t, 4.2, 4.9))); sy += t > 4.9 ? 10 * Math.sin(t * 5) : 0; }
    LK.spark(g, sx, sy, 34, f.t, Math.exp(-6 * Math.max(0, t - 2.74)) * (t > 2.74 ? 1 : 0));
    // Pip: mood keys on the sung words, a jump from the beat at 4.34 to the next one
    const mood = ACT.emotions(t, [[0, 'sleepy'], [2.74, 'surprised'], [3.68, 'starstruck']]);
    const hop = ACT.jump(t, 4.337, 4.792, 2.6);
    const look = t < 1.9 ? {} : { lookX: clamp((sx - X) / 500, -1, 1), lookY: clamp((sy - (GY - 6.4 * U)) / 400, -1, 1) };
    const reach = ACT.poses(t, [[0, { aL: -0.6, aR: -0.6 }], [4.2, { aL: 0.6, aR: 1.35 }, 0.18]]);
    PIP.draw(g, X, GY, U, { ...ACT.add(mood, hop), ...look, ...(t >= 4.2 ? reach : {}), view: t > 3.68 ? 'q' : 'front' }, t);
    // the subject: Pip, except while the spark comes in (the read at 1.6 s); the last MV.focus is the subject
    const pipHead = [X, GY + (mood.dy + hop.dy) * U - 6.4 * U];
    if (f.t >= 1.6 && f.t < 2.74) { MV.focus(...pipHead, 'pip'); MV.focus(sx, sy, 'spark'); }
    else { MV.focus(sx, sy, 'spark'); MV.focus(...pipHead, 'pip'); }
    MV.overlay(o => LK.line(o, f, { x: 150, y: 960, size: 56, maxW: 1200 }));    // the empty floor, bottom left: a whisper
  },
});
