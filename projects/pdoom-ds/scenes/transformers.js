// transformers — 34 (109.335–113.34) · rose · paid for by "Just transformers all the way!".
// Twelve layers, full frame, every one firing in sequence — one wave per two beats, which is faster than is
// comfortable, with a second fainter wave half a cycle behind it. The camera rides the wave up the stack and
// labels the live layer with a leader line, because the film is watching instruments and not a magic trick.
MV.scene('transformers', {
  init() {
    this.st = MX.layers(12, 420, { size: 2.65, spread: 0.64 });
    const far = (this.st.n - 1) / 2 * this.st.spread, s = this.st.size;
    const conn = [];
    for (const x of [-s, s]) for (const z of [-s, s]) conn.push([[x, -far, z], [x, far, z]]);
    this.conn = LG.pairs(conn, { bright: 0.35 });
    this.dust = LG.ball(2200, 9, { seed: 82 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const b0 = d.audio.beatAt(d.from);
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - b0);
    const pass = Math.floor(beats / 2), k = (beats / 2) % 1;      // one sweep up the stack every two beats
    const k2 = (k + 0.5) % 1;                                     // the shadow wave, half a cycle behind
    const li = Math.round(k * (this.st.n - 1));

    const cam = dsCam(d, {
      yaw: 0.42 + lt * 0.07 + Math.sin(lt * 0.4) * 0.09, pitch: 0.24 + 0.02 * Math.sin(lt * 0.8),
      dist: lerp(10.4, 8.9, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.04,
      target: [0, (k - 0.5) * 1.4, 0], seed: 14,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.18, size: 1.05, dof: 34, count: 1000 }),
      { S: this.conn, o: { width: 1, gain: 0.2, color: 'dim', glow: 0.15, fog: 14 } },
    ];
    for (let l = 0; l < this.st.n; l++) {
      const u = l / (this.st.n - 1);
      const fire = Math.max(0, 1 - Math.abs(u - k) / 0.17);
      const fire2 = Math.max(0, 1 - Math.abs(u - k2) / 0.12);
      list.push({ P: this.st.planes[l], o: { size: 1.5 + fire * 1.7, gain: 0.34 + fire * 0.62 + fire2 * 0.2, color: fire > 0.2 ? 'hot' : 'accent', dof: 9, focus: 9.4, twinkle: 0.3, t: d.t, drift: 0.03 } });
      list.push({ S: this.st.wire[l], o: { width: 1, gain: 0.3 + fire * 0.4, color: fire > 0.2 ? 'hot' : 'dim', glow: 0.22, fog: 13 } });
    }
    dsLight(d, list, { cam, end: { bloom: 0.55 + d.kick * 0.3, exposure: 0.85, ca: 0.5 + d.kick * 0.4, radius: 0.5 } });

    // the live layer, labelled: a hairline from the firing plane out to a read-out
    const y = (li - (this.st.n - 1) / 2) * this.st.spread;
    const pr = cam.project([this.st.size * 0.98, y, this.st.size * 0.98]);
    if (pr) {
      const [sx, sy] = pr;
      g.save(); g.strokeStyle = dsTone(d, 'hot', 0.55); g.lineWidth = 1;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 120, sy - 40); g.stroke(); g.restore();
      TL.stamp(g, d, 'L' + String(li + 1).padStart(2, '0') + ' · FIRE', sx + 128, sy - 44, { color: 'hot', size: 13 });
    }
    dsTele(g, d, {
      id: 'c34', name: 'transformers',
      rows: [
        ['layers', '12'],
        ['wave', 'L' + String(li + 1).padStart(2, '0')],
        ['pass', TL.num(pass)],
        ['rate', '2.2 sweeps / s'],
        ['all the way', 'YES'],
      ],
      foot: 'no other component',
    });
    TL.stamp(g, d, 'STACK DEPTH 12 · SWEEP 1 PER 2 BEATS', 110, 108, { color: 'dim', size: 13 });
    dsLine(g, '×' + this.st.n, 110, 380, { font: dsSans(58, 200), size: 58, color: dsTone(d, 'fg', 0.9), glow: 18, align: 'left', track: 3 });
    TL.stamp(g, d, 'LAYERS FIRING IN SEQUENCE', 110, 134, { color: 'dim', size: 12 });

    dsTick(g, d, { x: W - 150, y: H - 70, label: 'SWEEP', rate: 73, alpha: 0.5 });

    // The plate gives this line 'terminal' — "just transformers all the way", printed as the log line it is. It is
    // also the only one of my 14 shots whose own line starts after the cut (110.18 vs 109.335): for those first
    // 0.85 s LY.pick would still be on the previous line's 'carve' and would draw that sentence carved across the
    // stack. So the treatment is pinned with dmode (the line is still drawn live at d.t, as it must be).
    LY.draw(g, d, { mode: 'plate', dmode: 'terminal', size: 26, y: H - 150, rows: 3 });

    dsLife(g, d, { gain: 0.9, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.06, period: 2.3 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.7 + 1.0 * d.kick, 16), vignette: 0.22, grain: 0.042 }, dsLifePost(d, { amount: 1.3 })));
  },
});
