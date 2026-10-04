// stable_run — cluster B opens on the calm one: "We had a stable training run,", 38.43–42.46, ember.
// A loss trace that has stopped surprising anyone (flat, screen space, written on left to right), a six-layer
// stack firing evenly once a bar, and a read-out that says NOMINAL in `fg` (this film has no green). Deliberately
// the quietest frame of the chapter, so `singularity` can break it. One thing at full gain: the trace.
//
// Quiet is not still (the user's note): the pen never stops — one sweep of the trace per beat-and-a-bit, landing
// on the beat and starting again, so the run is always being logged — and the shot is cut in two at its second
// downbeat, wide room → hard close on the trace, so 4 s is experienced as two shots (see `cutT` in render).
MV.scene('stable_run', {
  init() {
    this.stack = MX.layers(6, 100, { size: 1.15, spread: 0.44 });
    const fl = MX.floor(22, { n: 22, y: -1.9, dust: 900, seed: 21 });
    this.floor = fl.wire; this.fdust = fl.dust;
    this.air = LG.ball(1100, 5.2, { seed: 31 });
    // The trace is drawn in screen pixels: lmScreen() maps x,y px straight into the frame, so a graph stays a
    // graph wherever the camera is. v decays a little and then does nothing at all — that is the whole joke.
    const x0 = 250, x1 = W - 220, yBase = 690, amp = 300, n = 300;
    this.tr = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const v = 0.33 + 0.44 * Math.exp(-u * 1.35) + 0.004 * Math.sin(u * 34 + 1.2) + 0.0025 * noise1(u * 70, 4);
      this.tr.push([x0 + u * (x1 - x0), yBase - v * amp]);
    }
    const P = new Float32Array(n * 3), S = new Float32Array((n - 1) * 8);
    this.tr.forEach((p, i) => { P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; });
    for (let i = 0; i < n - 1; i++) {
      const a = this.tr[i], b = this.tr[i + 1], k = i * 8;
      S[k] = a[0]; S[k + 1] = a[1]; S[k + 2] = 0; S[k + 3] = b[0]; S[k + 4] = b[1]; S[k + 5] = 0;
      S[k + 6] = 0.85; S[k + 7] = (i === 0 ? 1 : 0) + (i === n - 2 ? 2 : 0);
    }
    this.trPts = P; this.trSeg = S; this.head = new Float32Array(3);
    this.target = LG.pairs([[[250, 300, 0], [W - 220, 300, 0]]], { bright: 0.5 });
    // the playhead: one vertical hairline, moved to wherever the pen is, every frame
    this.playSeg = LG.pairs([[[250, 330, 0], [250, 700, 0]]], { bright: 1 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.6, ease.outCubic) * dsOut(d, 0.3);

    // ---- the internal cut: the shot's second downbeat (40.25 s) reframes the whole picture. 4 s of "stable" is
    // two shots — the wide room with the run logging, then a hard move onto the trace itself. The cut is on the
    // grid the song was analysed to (a downbeat that falls inside this shot), never on a wall clock.
    const dbs = d.audio.downbeats.filter((x) => x >= f.from && x < f.to);
    const cutT = dbs.length > 1 ? dbs[1] : f.from + d.dur * 0.5;
    const seg2 = t >= cutT ? 1 : 0;

    // the pen: one sweep of the trace per beat-and-a-bit, started again and again, so the frame is never a still.
    // `write` is where the pen is now; the rest of the curve stays in `dim` underneath it.
    const sweep = (d.lt % 0.9) / 0.9;
    const write = ease.inOutCubic(sweep);
    // the stack fires two waves per bar (instead of one) and twitches on every kick
    const wave = (d.barPhase * 6) % 1;      // six firing waves a bar: a training run stepping, not posing

    // the room: a small stack, a floor, and air. All of it under 0.5 gain — the trace is the only bright thing.
    const cam = dsCam(d, {
      yaw: 0.26 + d.lt * (seg2 ? 0.06 : 0.04), pitch: seg2 ? 0.22 : 0.15,
      dist: seg2 ? lerp(6.2, 5.0, clamp(d.lt / d.dur)) : lerp(9.8, 5.6, clamp(d.lt / d.dur)),
      fov: seg2 ? 32 : 34, punch: 0.02 + seg2 * 0.03, seed: 6,
    });
    dsLight(d, [
      // the floor keeps streaming under the camera: the run is *going* somewhere even while the loss is flat.
      // The wrap is a whole number of grid cells (MX.floor is on a 1-unit grid), so the jump is invisible and the
      // floor reads as an endless belt.
      { S: this.floor, o: { width: 1, gain: (seg2 ? 0.3 : 0.42) * a, color: 'dim', fog: 13, dof: 15, focus: 8, model: { pos: [0, 0, -((d.lt * 3.5) % 4)] } } },
      dsAir(d, this.fdust, { gain: 0.26 * a, size: 1.0, dof: 26, drift: 0.08, t }),
      // the stack turns while it fires, so the machine in the middle of the frame is a moving object and not a prop
      MX.layersDraw(this.stack, wave, { gain: (0.42 + d.kick * 0.24) * a, size: 1.4 * (1 + seg2 * 0.3), dof: 9, focus: 8, fire: 1.5, wire: 0.24 })
        .map((e) => { e.o.model = { rot: [0, d.lt * 1.8, 0] }; return e; }),
      dsAir(d, this.air, { gain: 0.2 * a, size: 1.05, dof: 30, drift: 0.07, t }),
      // the bloom opens on every hit (the film's grammar): a whole-frame change, which is what keeps a calm frame
      // from being a dead frame
    ], { cam, end: { bloom: 0.5 + d.kick * 0.45 + d.snare * 0.2, exposure: 0.85 + d.kick * 0.06, ca: 0.4, radius: 0.5, levels: 5 } });

    // the trace, over everything, at full gain. It is the shot's whole subject. No second bloom chain here: the
    // line's own glow (o.glow) carries it, which keeps the frame inside the 150 ms budget.
    const hi = clamp(Math.floor(write * (this.tr.length - 1)), 0, this.tr.length - 1);
    this.head[0] = this.tr[hi][0]; this.head[1] = this.tr[hi][1]; this.head[2] = 0;
    const pk = 8;                                             // the playhead's two endpoints, rewritten each frame
    this.playSeg[pk] = this.head[0]; this.playSeg[pk + 1] = 300;
    this.playSeg[pk + 3] = this.head[0]; this.playSeg[pk + 4] = 730;
    // the internal cut is a hard change of framing on the same object: the trace is pushed to 1.7× about the
    // centre of the frame, which reads as a second shot rather than a zoom (nothing eases through the cut).
    const zk = (seg2 ? 1.72 : 1) * (1 + 0.04 * Math.sin(d.lt * 1.15));    // the graph itself is never quite still
    const zp = seg2 ? [0, 74, 0] : [0, 0, 0];
    const zm = { scale: zk, pos: zp };
    dsLight(d, [
      { S: this.target, o: { width: 1, gain: 0.2 * a, color: 'dim', glow: 0.2, dash: [6, 7], model: zm } },
      { S: this.trSeg, o: { width: 1.6, gain: 0.45 * a, color: 'dim', glow: 0.22, blur: 0.5, model: zm } },
      { S: this.trSeg, o: { width: 1.8, gain: 1.0 * a, color: 'fg', glow: 0.55, glowR: 5, blur: 0.5, upto: write, model: zm } },
      { P: this.trPts, o: { size: 1.5, gain: 0.4 * a, color: 'accent', blur: 0.5, count: Math.round(this.tr.length * write), model: zm } },
      { P: this.head, o: { size: 3.2 + d.kick * 1.8, gain: 1.15 * a, color: 'hot', blur: 0.6, model: zm } },
      // the playhead: the vertical line the pen is on, full height of the plot. A chart recorder, running.
      { S: this.playSeg, o: { width: 2.2, gain: 1.05 * a, color: 'hot', glow: 0.8, glowR: 6, blur: 0.5, model: zm } },
    ], { cam: lmScreen(), end: { blend: 'screen', bloom: 0, exposure: 0.95, ca: 0.2 } });

    // ---- the read-out: every number is derived from the run, and none of them move much
    g.save();
    g.globalAlpha = a;
    TL.stamp(g, d, 'RUN 0x41 · CLUSTER B', 110, 150, { size: 14, track: 4 });
    g.fillStyle = dsTone(d, 'fg', 0.9); g.fillRect(110, 172, 8, 8);
    TL.stamp(g, d, seg2 ? 'STILL NOMINAL' : 'NOMINAL', 130, 176, { size: 15, track: 5, color: 'fg', alpha: 0.95 });
    TL.stamp(g, d, seg2 ? 'pen still logging · 41 200 steps clean' : 'no divergence · 41 200 steps clean', 110, 202, { size: 13, track: 2, alpha: 0.7 });
    TL.block(g, d, [
      ['loss', (0.08410 + 0.0002 * noise1(t * 3, 2)).toFixed(5)],
      ['grad norm', (0.941 + 0.004 * noise1(t * 5, 8)).toFixed(3)],
      ['lr', '3.0e-4  cosine'],
      ['tokens', TL.num(TL.roll(t, 4.12e11, 7))],
      ['sweep', (sweep * 100).toFixed(0) + ' %'],
    ], { x: W - 470, y: 330, hot: [1] });
    // the panel's scan lines keep scrolling: the instrument is on, and it is reading
    dsScan(g, W - 516, 306, 420, 160, { alive: 0.6 * a, alpha: 0.1, step: 3, phase: d.t * 0.55 });
    g.restore();

    // ---- the house activity layer (ds.js): parallax dust, a CRT line crossing forever, a step counter that never
    // stops. Cheap, and they belong to the shot: a live terminal with something in the air in front of it.
    dsLife(g, d, { gain: 1.0, dust: 96 });
    dsScanSweep(g, d, { alpha: 0.06, period: 5.6 });
    dsTick(g, d, { x: 610, y: 976, rate: 137, label: 'STEP', value: 41200 + d.lt * 137 });

    dsTele(g, d, { id: 'c14', name: 'stable', rows: [['run', '0x41'], ['step', '41 200'], ['loss', '0.08410'], ['status', 'NOMINAL']], foot: 'training trace · screen space' });
    // lyric: the plate's row for this line is 'terminal' — a training run *is* a log line. Pinned line so the shot
    // draws its own sentence, and an explicit mode because LY.draw resolves the mode from the clock: at this shot's
    // first frames the previous plate row ('shock') would still be live and would punch the last line into frame.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'terminal', line: own, size: 25, y: H - 150, rows: 3 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.4 + d.kick * 0.7),
      flash: 0.035 * d.snare * a,
      vignette: 0.24 - d.kick * 0.05,
    }, dsLifePost(d, { amount: 1.4 })));
  },
});
