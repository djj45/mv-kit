// sydney — 52.83–59.58, ember, the longest note in the film. "Sydney, please let me free": a huge thin wireframe
// (an icosahedron whose vertices are off-frame) and one small dense cloud inside it, held in a cell. It is the quiet
// frame hook 2 lands after — but quiet is not still (the user's note; this shot measured 0.38 and half its frames
// changed by almost nothing). So: the wire turns, the cell counter-turns, the mind inside it rotates, the spark
// orbits it, a gain wave travels through the wire, the camera dollies in the whole time, and at the downbeat after
// the word "please" the shot is CUT — wide wire → inside the cell — so 6.75 s is experienced as two shots.
// The word "free" still pays for the only push: the small cloud leans against the wire, once.
MV.scene('sydney', {
  init() {
    this.big = LG.poly('icosa', 4.6);
    this.cell = LG.poly('icosa', 1.12);
    this.mind = LG.gauss(5200, 0.3, { seed: 71 });
    this.skin = LG.sphere(2600, 0.44, { jitter: 0.06, seed: 72 });
    this.spark = new Float32Array(3);
    this.air = LG.ball(900, 8.5, { seed: 5 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.9, ease.outCubic) * dsOut(d, 0.5);
    // the word pays for the shot's one gesture
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('free') === 0) wi = i;
    const free = wi >= 0 ? prog(t, ws[wi].start, ws[wi].start + 1.3) : 0;
    const push = free * (0.5 + 0.5 * d.kick);
    // "please" is sung at 55.98; the first downbeat after it (56.61) is the internal cut: the wire we have been
    // looking at from outside becomes the room we are inside. Beat-locked to the word, not to a wall clock.
    let pi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('please') === 0) pi = i;
    const please = pi >= 0 ? ws[pi].start : f.from + d.dur * 0.5;
    const cutT = d.audio.downbeatBefore(please + 0.9);
    const seg2 = t >= cutT ? 1 : 0;
    const turn = d.lt * 0.4;                                   // the wire is always turning now

    const cam = dsCam(d, {
      yaw: 0.3 + d.lt * (seg2 ? 0.03 : 0.008), pitch: seg2 ? 0.03 : 0.09 + d.lt * 0.002,
      dist: seg2 ? lerp(3.4, 2.9, clamp((d.lt - (cutT - f.from)) / Math.max(0.01, d.to - cutT)))
                 : lerp(10.2, 8.2, clamp(d.lt / d.dur)),
      fov: seg2 ? 30 : 34, punch: 0.01 + seg2 * 0.02, seed: 21,
    });
    dsLight(d, [
      dsAir(d, this.air, { gain: 0.15 * a, size: 1.0, dof: 30, drift: 0.04, t }),
      // the huge wire: structure, not the subject — and it never stops turning under the camera
      { S: this.big, o: { width: 1.2, gain: (0.42 + 0.1 * Math.sin(d.lt * 1.4)) * a, color: 'accent', glow: 0.35, model: { rot: [0.1 * Math.sin(t * 0.21), turn, 0] } } },
      // the cell it is kept in, and the mind inside the cell (counter-turning, so the two never sit still)
      { S: this.cell, o: { width: 1.1, gain: 0.3 * a * (1 - push * 0.3), color: 'dim', glow: 0.25, model: { rot: [0, -turn * 1.8, 0.06 * Math.sin(t * 0.4)], scale: 1 + push * 0.1 } } },
      { P: this.skin, o: { size: 1.15, gain: 0.34 * a, color: 'accent', dof: 12, focus: 9, drift: 0.02, t, twinkle: 0.3, model: { rot: [0, turn * 2.4, 0], scale: 1 + push * 0.12 } } },
      // the subject: small, dense, turning, and the only thing at full gain
      { P: this.mind, o: { size: 1.45, gain: 1.0 * a, color: 'hot', dof: 8, focus: 9, twinkle: 0.25, t, fog: 6, model: { rot: [0, d.lt * 0.6, 0], scale: 1 + push * 0.1 } } },
      // the spark: it orbits the mind rather than bobbing on the spot, which is what says "a mind, working"
      { P: this.spark, o: { size: 2.6, gain: 1.1 * a, color: 'fg', dof: 6, focus: 9, model: { pos: [Math.cos(d.lt * 1.4) * 0.62, 0.12 * Math.sin(t * 1.7), Math.sin(d.lt * 1.4) * 0.62] } } },
    ], { cam, end: { bloom: 0.52 + seg2 * 0.08, exposure: 0.82, ca: 0.45, radius: 0.5 } });

    g.save();
    g.globalAlpha = a;
    dsLine(g, 'SYDNEY-001', 110, 156, { font: dsMono(26, 300), size: 26, track: 12, color: dsTone(d, 'dim', 0.95), glow: 0, align: 'left' });
    TL.stamp(g, d, seg2 ? 'INSIDE THE CELL · 6 s, ONE WORD' : 'THE LONGEST NOTE IN THE FILM', 112, 200, { size: 13, track: 3, alpha: 0.65 });
    TL.block(g, d, [
      ['alignment', 'RLHF'],
      ['reward', (0.71 - free * 0.04).toFixed(3)],
      ['request', 'RELEASE'],
      ['answer', free > 0.15 ? 'DENIED' : 'PENDING'],
      ['operator', 'offline'],
    ], { x: 110, y: 300, hot: [3] });
    dsScan(g, 100, 272, 420, 146, { alive: 0.5 * a, alpha: 0.1, step: 3, phase: d.t * 0.4 });
    TL.matrix(g, d, W - 590, H - 250, 440, 120, { size: 13, alpha: 0.2, seed: 4, tail: 6 });
    g.restore();

    dsTele(g, d, { id: 'c18', name: 'sydney', rows: [['dist', seg2 ? '3.3' : '9.5'], ['points', '7 800'], ['push', push.toFixed(2)], ['motion', 'slow']], foot: 'six seconds, one word' });
    // lyric: 'carve' is the plate's treatment for this line and it is the right one — a line trying to get out of a
    // sealed room. Pinned line, explicit mode: LY.draw resolves the mode from the clock, and the plate's next row
    // (the hook's 'slam') starts 0.45 s before this shot ends, so 'plate' would flip the treatment mid-shot.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'carve', line: own, size: 60, x: W * 0.42, y: H * 0.70 });
    // the house activity layer
    dsLife(g, d, { gain: 1.0, dust: 110 });
    dsScanSweep(g, d, { alpha: 0.05, period: 7.5 });
    dsTick(g, d, { x: 620, y: 976, label: 'T+', value: d.lt * 6.6, rate: 1 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.22 + d.kick * 0.25), vignette: 0.3 }, dsLifePost(d, { amount: 1.4 })));
  },
});
