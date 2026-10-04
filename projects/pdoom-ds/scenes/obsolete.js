// obsolete — 77.72–81.21, ember, with the turn in `warn`. "Now von Neumann's obsolete": a box of light on a floor,
// with twelve cables running out of it, and every kick kills one cable. Nothing is added to the frame after the
// first beat — the shot only takes things away, and the camera backs off while it happens, so the last live thing in
// the picture gets smaller. One thing at full gain at the start: the core inside the box.
//
// It measured 0.52 because once the cables were gone there was nothing left to watch. Taking things away can still
// move: a cable that is cut WHIPS and then hangs (its geometry is rebuilt every frame — 24 segments is nothing), the
// dead cables keep venting embers for the rest of the shot, the box keeps turning in the light, the core stutters
// like a failing machine, and the shot carries the house activity layer on top.
MV.scene('obsolete', {
  init() {
    this.box = LG.wirebox([2.4, 1.8, 2.4]);
    // twelve cables, each one drooping from the box down to the floor and away from the camera, so nothing crosses
    // the lens: they are read as cables, not as a tangle
    this.wires = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.13, r0 = 1.3, r1 = 2.5, r2 = 3.7;
      this.wires.push(LG.seg([
        [Math.cos(a) * r0, -0.55, Math.sin(a) * r0],
        [Math.cos(a) * r1, -1.5, Math.sin(a) * r1],
        [Math.cos(a) * r2, -2.15, Math.sin(a) * r2],
      ], { bright: 0.7 }));
    }
    // the same twelve cables, as a buffer this shot rewrites every frame so they can move when they are cut
    this.wireSeg = new Float32Array(12 * 2 * 8);
    // and the spark that jumps when a cable is cut: two bright segments per cable, at the cut end, for ~0.35 s
    this.sparkSeg = new Float32Array(12 * 2 * 8);
    // what a dead cable vents: 6 embers each, plus a rising heat column off the box — the only things that keep
    // moving after the last cable has gone
    this.ember = new Float32Array(12 * 6 * 3);
    const n = 320, rnd = mulberry32(97);
    this.heat = new Float32Array(n * 3);
    this.heatPh = new Float32Array(n); this.heatA = new Float32Array(n); this.heatR = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.heatPh[i] = rnd(); this.heatA[i] = rnd() * TAU; this.heatR[i] = 0.25 + rnd() * 0.85; }
    this.core = LG.gauss(3000, 0.42, { seed: 91 });
    this.ring = LG.ring(1100, { r: 1.05, width: 0.1, thick: 0.02, seed: 92 });
    this.pad = LG.ring(900, { r: 2.3, width: 0.14, thick: 0.02, seed: 95 });
    this.air = LG.ball(700, 5.4, { seed: 43 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.4, ease.outCubic) * dsOut(d, 0.3);
    // one cable dies per kick: the number alive is a function of t, not a counter
    const ks = dsEvents(f, 'kick', f.from, f.to);
    const live = Math.max(0, 12 - dsEvents(f, 'kick', f.from, t).length);
    const last = dsEvents(f, 'kick', f.from, t);
    const deadAt = (i) => (ks[i] ? ks[i].t : Infinity);
    // the machine is failing: the core stutters on the beat and breathes on the low end
    const stutter = 0.72 + 0.38 * d.kick + 0.1 * Math.sin(t * 3.1) + 0.06 * d.low;

    // ---- the cables, rewritten this frame: a cut cable whips (damped) and then hangs slack; a dead cable vents
    // embers that keep rising, so the frame still has something in it after the last kick
    let ek = 0;
    for (let i = 0; i < 12; i++) {
      const t0 = deadAt(i);
      const cut = t0 === Infinity ? 0 : prog(t, t0, t0 + 0.12, ease.inCubic);
      const age = t0 === Infinity ? 0 : Math.max(0, t - t0);
      const sw = cut * Math.exp(-age * 0.8) * Math.sin(age * 6.2);         // the whip, gone in about a second
      const ang = (i / 12) * TAU + 0.13, ca = Math.cos(ang), sa = Math.sin(ang);
      const r1 = 2.5 + cut * 0.18 + sw * 0.16, r2 = 3.7 + cut * 0.3 + sw * 0.5;
      const y1 = -1.5 - cut * 0.34, y2 = -2.15 + Math.abs(sw) * 0.18;
      const k = i * 16;
      const put = (o2, ax, ay, az, bx, by, bz, br) => {
        this.wireSeg[k + o2] = ax; this.wireSeg[k + o2 + 1] = ay; this.wireSeg[k + o2 + 2] = az;
        this.wireSeg[k + o2 + 3] = bx; this.wireSeg[k + o2 + 4] = by; this.wireSeg[k + o2 + 5] = bz;
        this.wireSeg[k + o2 + 6] = br; this.wireSeg[k + o2 + 7] = 0;
      };
      const dim = 1 - 0.72 * cut;                                          // a dead cable is still hanging there, dark
      put(0, ca * 1.3, -0.55, sa * 1.3, ca * r1, y1, sa * r1, 0.8 * dim);
      put(8, ca * r1, y1, sa * r1, ca * r2, y2, sa * r2, 0.6 * dim);
      // the snap: a bright cross at the cut end, growing and dying over the first third of a second
      const sk = t0 === Infinity ? 0 : Math.max(0, 1 - age / 0.35), sk2 = i * 16;
      const ex = ca * r2, ez = sa * r2, rr = 0.12 + (1 - sk) * 0.6;
      this.sparkSeg[sk2] = ex - rr; this.sparkSeg[sk2 + 1] = y2; this.sparkSeg[sk2 + 2] = ez;
      this.sparkSeg[sk2 + 3] = ex + rr; this.sparkSeg[sk2 + 4] = y2; this.sparkSeg[sk2 + 5] = ez;
      this.sparkSeg[sk2 + 6] = sk; this.sparkSeg[sk2 + 7] = 3;
      this.sparkSeg[sk2 + 8] = ex; this.sparkSeg[sk2 + 9] = y2 - rr; this.sparkSeg[sk2 + 10] = ez;
      this.sparkSeg[sk2 + 11] = ex; this.sparkSeg[sk2 + 12] = y2 + rr; this.sparkSeg[sk2 + 13] = ez;
      this.sparkSeg[sk2 + 14] = sk; this.sparkSeg[sk2 + 15] = 3;
      for (let j = 0; j < 6; j++) {
        const m = (ek++) * 3;
        if (cut <= 0.5) { this.ember[m] = 0; this.ember[m + 1] = -99; this.ember[m + 2] = 0; continue; }
        const u = ((age * 0.75 + j / 6) % 1);
        this.ember[m] = ca * (3.7 + u * 0.4) + (hash(i * 7 + j, 3) - 0.5) * 0.3;
        this.ember[m + 1] = y2 + u * 1.9;
        this.ember[m + 2] = sa * (3.7 + u * 0.4) + (hash(i * 7 + j, 5) - 0.5) * 0.3;
      }
    }
    for (let i = 0; i < this.heatPh.length; i++) {
      const u = (t * 0.45 + this.heatPh[i]) % 1, m = i * 3;
      this.heat[m] = Math.cos(this.heatA[i]) * this.heatR[i] * (0.4 + u);
      this.heat[m + 1] = -0.5 + u * 2.3;
      this.heat[m + 2] = Math.sin(this.heatA[i]) * this.heatR[i] * (0.4 + u);
    }

    const cam = dsCam(d, {
      yaw: 0.3 + d.lt * 0.07, pitch: 0.24 - d.lt * 0.014, dist: lerp(6.0, 8.6, clamp(d.lt / d.dur)),
      fov: 34, punch: 0.02, seed: 47,
    });
    const list = [
      { P: this.pad, o: { size: 1.1, gain: 0.3 * a, color: 'accent', dof: 8, focus: 6, model: { rot: [0, d.lt * 0.3, 0] } } },
      dsAir(d, this.air, { gain: 0.16 * a, size: 1.0, dof: 30, drift: 0.05, t }),
      // the heat: a column of the machine's own waste, rising the whole time
      { P: this.heat, o: { size: 1.35, gain: 0.45 * a, color: 'accent', dof: 16, focus: 6, twinkle: 0.5, t } },
      { S: this.box, o: { width: 1.3, gain: 0.42 * a * (0.35 + 0.65 * live / 12), color: 'dim', glow: 0.3, model: { rot: [0, d.lt * 0.34, 0] } } },
      { S: this.ring, o: { width: 1.2, gain: 0.3 * a * (live / 12), color: 'accent', glow: 0.35, model: { rot: [0, -d.lt * 0.45, 0] } } },
      // the core: the last thing alive in the frame, and the only thing that ever hit full gain
      { P: this.core, o: { size: 1.6, gain: (0.25 + 0.9 * Math.pow(live / 12, 1.3)) * a * stutter, color: 'hot', dof: 6, focus: 6, twinkle: 0.3, t } },
      // every cable, in one draw call, in the shape it has this frame
      { S: this.wireSeg, o: { width: 1.3, gain: 0.55 * a, color: 'fg', glow: 0.4, fog: 14, focus: 6 } },
      // and the embers off the dead ones
      { P: this.ember, o: { size: 1.9, gain: 1.1 * a, color: 'warn', dof: 10, focus: 6, twinkle: 0.7, t } },
      // every cut cable throws a spark: the loudest thing in this quiet shot, and it belongs to the story
      { S: this.sparkSeg, o: { width: 2.2, gain: 1.3 * a, color: 'hot', glow: 0.8, glowR: 6, blur: 0.5, fog: 16 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.5 + 0.2 * (live / 12) + d.kick * 0.3, exposure: 0.86 + d.kick * 0.05, ca: 0.42, radius: 0.5 } });

    g.save();
    g.globalAlpha = a;
    TL.stamp(g, d, 'DECOMMISSIONING', 110, 150, { size: 14, track: 4, color: live === 0 ? 'warn' : 'dim' });
    TL.block(g, d, [
      ['architecture', 'von Neumann'],
      ['cables', live + ' / 12'],
      ['throughput', live > 0 ? (live * 1.1e14).toExponential(1) : '0'],
      ['status', live === 0 ? 'OBSOLETE' : live < 5 ? 'FADING' : 'RUNNING'],
      ['replacement', live === 0 ? 'the model' : '—'],
    ], { x: 110, y: 300, hot: [3], valueColor: live === 0 ? 'warn' : 'accent' });
    // the status LED: a hairline that blinks on the beat, so the panel is alive even when the box is not
    g.fillStyle = dsTone(d, live === 0 ? 'warn' : 'fg', 0.9 * (d.beatPhase < 0.35 ? 1 : 0.15));
    g.fillRect(112, 424, 26, 3);
    dsScan(g, 100, 272, 430, 168, { alive: 0.5 * a, alpha: 0.1, step: 3, phase: d.t * 0.45 });
    TL.matrix(g, d, W - 640, H - 300, 450, 130, { size: 13, alpha: 0.2, seed: 23, tail: 6 });
    g.restore();

    dsTele(g, d, { id: 'c25', name: 'obsolete', rows: [['live cables', String(live)], ['kicks', String(last.length)], ['box', '2.7 m'], ['note', 'nothing was added']], foot: 'the shot only takes things away' });
    // lyric: the plate gives this line 'ghost' — von Neumann's obsolete, the line echoing the thing it buries.
    // Pinned line, mode off the plate: the sentence and its own dimmer copy, while the cables it describes die.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 60, x: W * 0.46, y: H * 0.68 });
    // the house activity layer: dust, the CRT line, and a counter of what has gone
    dsLife(g, d, { gain: 1.0, dust: 100 });
    dsScanSweep(g, d, { alpha: 0.055, period: 6.0 });
    dsTick(g, d, { x: 620, y: 976, label: 'DEAD', value: 12 - live, rate: 1 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.55 + d.kick * 1.2),
      flash: 0.04 * d.snare * a, flashColor: '255,140,90',
      vignette: 0.22 + (1 - live / 12) * 0.14,
    }, dsLifePost(d, { amount: 1.4 })));
  },
});
