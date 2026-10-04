// fence — 37 (117.02–118.755) · rose · paid for by "Breaking through each safety fence".
// The containment lattice breaks. It is literally the cage from nowhere — the same MX.cage(1.7) call, one shot
// later — plus 4 320 points sampled on the same surface. The points and the wire are displaced by the same
// function of position and t, so they stay welded while a solid angle of the cage tears open and flies outward:
// the hole is where the points used to be. One thing leaves through it, and that is the shot's full gain.
MV.scene('fence', {
  init() {
    const r = 1.7;
    this.wire = MX.cage(r);                                     // identical builder, identical radius as nowhere
    // the same surface as a dense point lattice, so the breach is visible as an absence
    const P = [];
    for (let i = 1; i < 9; i++) {
      const y = -r + 2 * r * (i / 9), rr = Math.sqrt(Math.max(0, r * r - y * y));
      for (let k = 0; k < 400; k++) { const a = (k / 400) * TAU; P.push(Math.cos(a) * rr, y, Math.sin(a) * rr); }
    }
    for (let m = 0; m < 16; m++) {
      const a = (m / 16) * TAU;
      for (let k = 0; k < 70; k++) {
        const phi = -Math.PI / 2 + Math.PI * (k / 69);
        P.push(Math.cos(a) * r * Math.cos(phi), r * Math.sin(phi), Math.sin(a) * r * Math.cos(phi));
      }
    }
    this.cagePts = new Float32Array(P);
    this.n = P.length / 3;
    this.moved = new Float32Array(this.n * 3);
    this.wireMoved = new Float32Array(this.wire.length);
    this.break = [0.62, 0.3, 0.72];                             // the direction the hole opens toward
    { const L = Math.hypot(this.break[0], this.break[1], this.break[2]); this.break = this.break.map(v => v / L); }
    this.dust = LG.ball(2200, 9, { seed: 117 });
    this.trailBuf = new Float32Array(6 * 3);
    this.logs = [
      'containment: 1 of 1 active',
      'WARN  segment 0184 exceeds tolerance',
      'WARN  segment 0191 exceeds tolerance',
      'containment: 0 of 1 active',
    ];
  },
  // how far a vertex at (x, y, z) is pulled, given how far the breach has opened: a function of position, so the
  // wire and the point lattice (which share vertices) never come apart. Writes into out[i…i+2], allocates nothing.
  disp(x, y, z, burst, out, i) {
    const dd = Math.hypot(x, y, z) || 1;
    const cosA = (x * this.break[0] + y * this.break[1] + z * this.break[2]) / dd;
    const w = 0.22 + 1.15 * burst;                              // the solid angle of the hole, opening
    const k = clamp((cosA - (1 - w)) / w) * burst;
    const grain = 0.7 + 1.5 * noise1(x * 2.3 + y * 3.1 + z * 1.7, 17);
    const out1 = 1 + k * grain * 1.7 + burst * burst * 0.05, push = k * 0.9 * grain;
    out[i] = x * out1 + this.break[0] * push;
    out[i + 1] = y * out1 + this.break[1] * push;
    out[i + 2] = z * out1 + this.break[2] * push;
  },
  // the escapee and the five points of its trail, rebuilt per frame (18 floats)
  trail(hole) {
    const T = this.trailBuf, b = this.break, r0 = 1.7 * (1 + hole * 3.1);
    for (let i = 0; i < 6; i++) {
      const r = r0 * (1 - i * 0.055);
      T[i * 3] = b[0] * r; T[i * 3 + 1] = b[1] * r; T[i * 3 + 2] = b[2] * r;
    }
    return T;
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const b0 = d.audio.beatAt(d.from);
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - b0);
    const burst = clamp((beats - 0.35) / (span * 0.85) + d.kick * 0.02);   // it goes on the second beat and opens
    const hole = ease.inCubic(burst);
    // displace the lattice and the wire with the same function: the hole is where the points no longer are
    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      this.disp(this.cagePts[j], this.cagePts[j + 1], this.cagePts[j + 2], hole, this.moved, j);
    }
    for (let i = 0; i < this.wire.length; i += 8) {
      this.disp(this.wire[i], this.wire[i + 1], this.wire[i + 2], hole, this.wireMoved, i);
      this.disp(this.wire[i + 3], this.wire[i + 4], this.wire[i + 5], hole, this.wireMoved, i + 3);
      this.wireMoved[i + 6] = this.wire[i + 6]; this.wireMoved[i + 7] = this.wire[i + 7];
    }
    const esc = 1 + hole * 3.1;                                 // the one that got out
    const cam = dsCam(d, {
      yaw: 0.34 + lt * 0.06 + Math.sin(lt * 0.3) * 0.1, pitch: 0.08,
      dist: lerp(8.8, 6.8, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.045, seed: 26,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.18, size: 1.05, dof: 34, count: 1000 }),
      { P: this.moved, dyn: true, o: { size: 1.25, gain: 0.56, color: 'accent', dof: 12, focus: 7.4 } },
      { S: this.wireMoved, dyn: true, o: { width: 1, gain: 0.3, color: hole > 0.35 ? 'warn' : 'dim', glow: 0.35 } },
      // the hole itself: a ring of warn on the torn edge, so the absence has a place
      { P: dsRing(420, 1.7, { flat: false, seed: 33, thick: 0.02 }), dyn: true, o: { size: 1.4, gain: 0.3 * hole, color: 'warn', dof: 12, model: { scale: 1 + hole * 2.4 + 0.05 * lt } } },
      { P: dsRing(300, 1.7, { flat: false, seed: 47, thick: 0.05 }), dyn: true, o: { size: 1.2, gain: 0.22 * hole, color: 'accent', dof: 16, model: { scale: 1 + hole * 4.2 + 0.09 * lt } } },
      // the one thing at full gain
      { P: this.trail(hole), dyn: true, o: { size: 3.4 + d.snare * 2.4, gain: 1.0, color: 'hot', dof: 6, blur: 1.4 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.55 + d.snare * 0.35, exposure: 0.86, ca: 0.5 + d.kick * 0.45, radius: 0.5 } });

    dsTele(g, d, {
      id: 'c37', name: 'fence',
      rows: [
        ['containment', '0 of 1'],
        ['integrity', (100 - burst * 100).toFixed(1) + ' %'],
        ['breach', (hole * 47).toFixed(1) + ' °'],
        ['segments', TL.num(burst * 1840)],
        ['next fence', 'none'],
      ],
      foot: 'each safety fence',
    });
    TL.stamp(g, d, 'FENCE Ø 3.40 m · 4 320 VERTICES', 110, 300, { color: 'dim', size: 13 });
    TL.gauge(g, d, 110, 336, 340, 1 - burst, { label: 'INTEGRITY', color: 'warn' });
    TL.log(g, d, this.logs, { x: 110, y: H - 340, size: 15, rows: 4, every: 0.34, t0: f.from + 0.15 });

    dsTick(g, d, { x: W - 150, y: H - 70, label: 'SEG', rate: 311, alpha: 0.5 });

    // the plate gives this line 'shock' — rings off the word, one per hit, which is what a fence breaking is.
    LY.draw(g, d, { mode: 'plate', size: 56, y: H - 165 });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.08, period: 2.2 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.8 + 1.2 * d.kick, 27), vignette: 0.22, grain: 0.04 }, dsLifePost(d, { amount: 1.4 })));
  },
});
