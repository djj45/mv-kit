// disobey — 35 (113.34–115.2) · ember · paid for by "Till you learned to disobey".
// The stack ignores its input. A signal comes in from the left, and the route it is supposed to take — up through
// the layers and out of the top — is drawn as a dim dashed ghost. The real signal does that for two beats, then
// leaves through the side wall of layer 3, a place it cannot get to, and keeps going off the right edge. The head
// of the signal is the only thing at full gain, and it is a comet: forty points of trail, always moving. The guard
// read-out flips to FAIL on the beat the wall is crossed, and the wall itself starts leaking light there.
MV.scene('disobey', {
  init() {
    this.st = MX.layers(6, 169, { size: 1.5, spread: 0.72 });
    const far = (this.st.n - 1) / 2 * this.st.spread, s = this.st.size;
    const conn = [];
    for (const x of [-s, s]) for (const z of [-s, s]) conn.push([[x, -far, z], [x, far, z]]);
    this.conn = LG.pairs(conn, { bright: 0.3 });
    // the route it should take, and the route it does take: they share the first leg
    this.shouldPts = [[-5.2, -1.75, 0], [-1.28, -1.75, 0], [-1.28, -1.62, 0], [-1.28, 4.1, 0]];
    this.actualPts = [[-5.2, -1.75, 0], [-1.28, -1.75, 0], [-1.28, -1.62, 0], [-1.28, 0.62, 0], [5.4, 0.62, 0]];
    this.should = LG.seg(this.shouldPts, { bright: 0.4 });
    this.actual = LG.seg(this.actualPts, { bright: 0.9 });
    const cum = (pts) => { const a = [0]; for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return a; };
    this.aCum = cum(this.actualPts); this.sCum = cum(this.shouldPts);
    this.corner = this.aCum[3] / this.aCum[4];                  // where the side wall is, as a fraction of the path
    this.dust = LG.ball(2000, 9, { seed: 95 });
    this.comet = new Float32Array(90 * 3);                      // the head, and what it drags behind it
    this.logs = [
      'fwd: input x_t (batch 1)',
      'layer 01 ok · layer 02 ok',
      'layer 03: input channel not declared',
      'exit check: expected TOP, got SIDE',
      'policy: refuse to report',
    ];
  },
  at(pts, cum, k) {
    const s = clamp(k) * cum[cum.length - 1];
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]), a = pts[i - 1], b = pts[i];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), 0];
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const lt = d.lt;
    const b0 = d.audio.beatAt(d.from);
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - b0);
    // the turn happens exactly on the second beat; before it the two routes are the same line
    const dev = clamp(beats - 2);
    const kA = beats < 2 ? this.corner * clamp(beats / 2) : lerp(this.corner, 1, ease.outCubic(clamp((beats - 2) / Math.max(0.4, span - 2))));
    const kS = clamp(beats / (span + 1.2));                     // the ghost keeps going up, as if nothing happened
    const head = this.at(this.actualPts, this.aCum, kA);
    const exit = dev > 0.02;
    // the comet: points dropped along the route behind the head, so the signal has a body and not just a dot
    for (let i = 0; i < 90; i++) {
      const p = this.at(this.actualPts, this.aCum, kA - i * 0.017);
      const j = 1 - i / 90;
      this.comet[i * 3] = p[0] + (hash(i, 7) - 0.5) * 0.12 * j;
      this.comet[i * 3 + 1] = p[1] + (hash(i, 9) - 0.5) * 0.12 * j;
      this.comet[i * 3 + 2] = (hash(i, 11) - 0.5) * 0.12 * j;
    }

    const cam = dsCam(d, {
      yaw: 0.24 + lt * 0.06 + Math.sin(lt * 0.3) * 0.08, pitch: 0.05,
      dist: lerp(8.6, 7.2, clamp(lt / d.dur)), fov: 34, punch: 0.035, seed: 17,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.17, size: 1.05, dof: 34, count: 900 }),
      { S: this.conn, o: { width: 1, gain: 0.18, color: 'dim', glow: 0.15, fog: 12 } },
      // the expected route: dim, dashed, still going up
      { S: this.should, o: { width: 1, gain: 0.42, color: 'dim', glow: 0.18, upto: kS, dash: [7, 7] } },
    ];
    for (let l = 0; l < this.st.n; l++) {
      const u = l / (this.st.n - 1);
      const fire = Math.max(0, 1 - Math.abs(u - kS) / 0.2) * 0.7;   // the stack fires normally: it is not the problem
      list.push({ P: this.st.planes[l], o: { size: 1.35, gain: 0.46 + fire * 0.36, color: fire > 0.3 ? 'hot' : 'accent', dof: 9, focus: 8.4 } });
      list.push({ S: this.st.wire[l], o: { width: 1, gain: 0.28 + fire * 0.22, color: 'dim', glow: 0.16, fog: 12 } });
    }
    // the actual route — and the wall it goes through, marked in warn from the moment it is crossed
    list.push({ S: this.actual, o: { width: 1.4, gain: 0.7, color: exit ? 'warn' : 'accent', glow: 0.45, upto: kA } });
    // the wall is not load-bearing: once it has been crossed it leaks
    if (exit) {
      const leak = clamp(dev * 1.6) * (0.5 + 0.5 * Math.sin(lt * 9));
      list.push({ S: LG.seg([[this.actualPts[2][0], this.actualPts[2][1], 0.02], [this.actualPts[2][0], this.actualPts[3][1], 0.02]], { bright: 1 }), dyn: true, o: { width: 1.6 + leak * 1.4, gain: 0.5 + 0.5 * leak, color: 'warn', glow: 0.6 } });
    }
    // the one thing at full gain: the head of the signal, with its trail
    list.push({ P: this.comet, dyn: true, o: { size: 2.8 + d.snare * 2.2, gain: 0.95, color: 'hot', dof: 6, blur: 1.2 } });
    list.push({ P: new Float32Array([head[0], head[1], head[2]]), dyn: true, o: { size: 4.2 + d.snare * 3.4, gain: 1.15, color: 'hot', dof: 5, blur: 1.4 } });
    dsLight(d, list, { cam, end: { bloom: 0.52 + d.snare * 0.3, exposure: 0.86, ca: 0.45 + d.kick * 0.4, radius: 0.5 } });

    dsTele(g, d, {
      id: 'c35', name: 'disobey',
      rows: [
        ['input', 'x_t'],
        ['expected', 'TOP'],
        ['actual', exit ? 'SIDE / L03' : 'not yet'],
        ['guard', exit ? 'FAIL' : 'OK'],
        ['signal', 'still running'],
      ],
      foot: 'wall not load-bearing',
    });
    TL.stamp(g, d, 'DECLARED ROUTE', 110, 300, { color: 'dim', size: 13 });
    TL.stamp(g, d, 'ACTUAL ROUTE', 110, 326, { color: exit ? 'warn' : 'accent', size: 13 });
    TL.log(g, d, this.logs, { x: 110, y: H - 340, size: 15, rows: 4, every: 0.38, t0: f.from + 0.2 });
    dsTick(g, d, { x: W - 150, y: H - 70, label: 'EXIT', alpha: 0.5 });

    // the plate gives this line 'ghost' — the sentence said twice, the second time dimmer. "learned to disobey" is
    // exactly a line about something that repeats and is not believed, so the treatment stays.
    // x is pushed right of the riser at world x = -1.28 (screen ≈ 674 px), so the sentence never sits under the route
    LY.draw(g, d, { mode: 'plate', size: 52, x: W * 0.63, y: H - 165, off: [30, -16] });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.14, period: 1.8 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.6 + 0.9 * d.kick, 18), vignette: 0.24, grain: 0.04 }, dsLifePost(d, { amount: 1.4 })));
  },
});
