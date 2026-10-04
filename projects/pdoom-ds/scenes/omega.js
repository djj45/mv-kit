// omega — 64.10–66.22, ember. "The Omega Point's coming soon": everything in the frame converges on one point, and
// the point gets brighter as the frame empties. The shell, the cage, the ring and the dust all ride one scale that
// runs from 1 to almost nothing; the core rides one that runs the other way. A thin reticle is drawn in Canvas 2D so
// the audience can see exactly what the machine is aimed at. One thing at full gain: the core.
//
// The shot measured 0.70: the collapse finished after two seconds and then the frame sat there, empty and frozen.
// Two things fixed it without touching the idea: the shell keeps FALLING IN forever (a stream whose position is a
// function of t, so the frame is never empty of movement even when it is empty of matter), and the core throws a
// ring outward once a bar — the collapse keeps happening, at a smaller scale, for as long as the shot lasts.
MV.scene('omega', {
  init() {
    this.shell = LG.sphere(12000, 3.9, { jitter: 0.07, seed: 88 });
    this.cage = MX.cage(3.8, { rings: 4, seg: 64 });
    this.ring = LG.ring(2600, { r: 3.9, width: 0.3, thick: 0.04, seed: 3 });
    this.core = MX.core(0.46, { n: 2600, halo: 1400, rays: 22 });
    this.air = LG.ball(1100, 7.4, { seed: 29 });
    // the infall: 1500 points, each with its own radius, height and phase. Per frame the position is
    // r = R0 · (1 − u) with u = (t·rate + phase) mod 1, so every point runs the same spiral forever, cheaply.
    const n = 1500, rnd = mulberry32(31);
    this.inP = new Float32Array(n * 3);
    this.inA = new Float32Array(n); this.inR = new Float32Array(n);
    this.inY = new Float32Array(n); this.inPh = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.inA[i] = rnd() * TAU; this.inR[i] = 2.4 + rnd() * 3.6;
      this.inY[i] = (rnd() - 0.5) * 3.6; this.inPh[i] = rnd();
    }
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.06, 0.4, ease.outCubic) * dsOut(d, 0.25);
    const conv = ease.inCubic(dsIn(d, 0.12, 1.75));          // everything falls inward
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('soon') === 0) wi = i;
    const tight = wi >= 0 ? prog(t, ws[wi].start, ws[wi].start + 0.7) : 0;   // "soon" slams it shut
    const shrink = lerp(1, 0.09, clamp(conv * 0.82 + tight * 0.18));
    const empty = clamp(conv * 0.7 + tight * 0.3);
    const echo = d.barPhase;                                 // one ring leaves the point per bar, for ever

    // the infall, before the light call: far points fall in and vanish into the core
    for (let i = 0; i < this.inPh.length; i++) {
      const u = (t * 0.42 + this.inPh[i]) % 1, k = 1 - u;
      const r = this.inR[i] * k * (1 - empty * 0.7), ang = this.inA[i] + u * 2.6, m = i * 3;
      this.inP[m] = Math.cos(ang) * r; this.inP[m + 1] = this.inY[i] * k; this.inP[m + 2] = Math.sin(ang) * r;
    }

    const cam = dsCam(d, {
      yaw: 0.28 + d.lt * 0.09, pitch: 0.11 + d.lt * 0.01,
      dist: lerp(8.6, 5.5, ease.inOutQuad(clamp(d.lt / d.dur))), fov: 36, punch: 0.035, seed: 33,
    });
    dsLight(d, [
      dsAir(d, this.air, { gain: (0.26 - empty * 0.2) * a, size: 1.05, dof: 30, drift: 0.06, t }),
      { P: this.shell, o: { size: 1.05, gain: 0.46 * a * (1 - empty * 0.85), color: 'accent', dof: 14, focus: 5, twinkle: 0.3, t, model: { scale: shrink, rot: [0, d.lt * 0.22, 0] } } },
      { S: this.cage, o: { width: 1, gain: 0.36 * a * (1 - empty * 0.9), color: 'dim', glow: 0.25, dof: 14, model: { scale: shrink, rot: [0, -d.lt * 0.3, 0] } } },
      { P: this.ring, o: { size: 1.3, gain: 0.7 * a * (1 - empty * 0.75), color: 'hot', dof: 9, focus: 5, model: { scale: shrink, rot: [0, d.lt * 0.4, 0] } } },
      // the point: brighter as the frame empties around it
      { P: this.core.nucleus, o: { size: 1.6 + empty * 1.1, gain: (0.34 + empty * 0.85) * a, color: 'hot', dof: 6, focus: 5, model: { scale: 1 + empty * 0.7 } } },
      { P: this.core.halo, o: { size: 1.05, gain: (0.12 + empty * 0.2) * a, color: 'accent', dof: 16, focus: 5, twinkle: 0.4, t, model: { scale: 1 + empty * 0.5 } } },
      { S: this.core.rays, o: { width: 1.2, gain: (0.2 + empty * 0.35) * a, color: 'hot', glow: 0.6, dof: 12, model: { scale: 1 + empty * 0.6, rot: [0, d.lt * 0.55, 0] } } },
      // the point keeps collapsing: a ring leaves it every bar and dies before it reaches the old radius
      { P: this.ring, o: { size: 1.2, gain: (0.55 * (1 - echo)) * a, color: 'hot', dof: 9, focus: 5, model: { scale: (0.5 + echo * 1.5) * (1 + empty * 0.4), rot: [0, -t * 0.5, 0] } } },
      // and the matter that is still out there keeps falling in, all the way through the shot
      { P: this.inP, o: { size: 1.3, gain: (0.3 + empty * 0.35) * a, color: 'accent', dof: 12, focus: 5, twinkle: 0.5, t } },
    ], { cam, end: { bloom: 0.72 + empty * 0.35, exposure: 0.9, ca: 0.45 + empty * 0.2, radius: 0.5 } });

    // the reticle: what the machine is aimed at. Four hairlines and a ring, crisp, no fill — and it is tracking:
    // the ticks turn, the radius is written by the low end, and a second arc turns the other way inside it.
    g.save();
    g.globalAlpha = a;
    const cx = W / 2, cy = H * 0.46, rr = (46 + (1 - empty) * 120) * (1 + d.low * 0.06);
    g.strokeStyle = dsTone(d, 'dim', 0.55); g.lineWidth = 1;
    g.beginPath(); g.arc(cx, cy, rr, 0, TAU); g.stroke();
    g.save();
    g.translate(cx, cy); g.rotate(d.lt * 0.5);
    g.beginPath();
    g.moveTo(-rr - 26, 0); g.lineTo(-rr + 12, 0);
    g.moveTo(rr - 12, 0); g.lineTo(rr + 26, 0);
    g.moveTo(0, -rr - 26); g.lineTo(0, -rr + 12);
    g.moveTo(0, rr - 12); g.lineTo(0, rr + 26);
    g.stroke();
    g.restore();
    g.strokeStyle = dsTone(d, 'accent', 0.5); g.lineWidth = 1.4;
    g.beginPath(); g.arc(cx, cy, rr * 1.22, -d.lt * 0.8, -d.lt * 0.8 + 1.1); g.stroke();
    g.beginPath(); g.arc(cx, cy, rr * 1.22, -d.lt * 0.8 + Math.PI, -d.lt * 0.8 + Math.PI + 1.1); g.stroke();
    TL.stamp(g, d, 'OMEGA POINT', 110, 150, { size: 14, track: 4 });
    TL.block(g, d, [
      ['convergence', (empty * 100).toFixed(1) + ' %'],
      ['mass', '(' + (1.4 * (1 + empty * 8)).toFixed(1) + 'e12) kg'],
      ['distance', (lerp(4.1, 0.0, empty)).toFixed(3)],
      ['soon', empty > 0.92 ? 'NOW' : 'SOON'],
    ], { x: 110, y: 300, hot: [3] });
    dsScan(g, 100, 272, 420, 122, { alive: 0.55 * a, alpha: 0.1, step: 3, phase: d.t * 0.5 });
    TL.matrix(g, d, W - 660, H - 300, 470, 130, { size: 13, alpha: 0.22, seed: 17, tail: 6 });
    g.restore();

    dsTele(g, d, { id: 'c21', name: 'omega', rows: [['scale', shrink.toFixed(3)], ['empty', (empty * 100).toFixed(0) + '%'], ['aim', 'ONE POINT'], ['soon', 'YES']], foot: 'the frame empties into the point' });
    // lyric: the plate gives this line 'cloud' — everything becomes one point, and the line is made of them; the
    // words are drawn as points of light, which is the shot's own material. Pinned line, mode off the plate.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 72, y: H * 0.26 });
    dsLife(g, d, { gain: 1.0, dust: 100 });
    dsScanSweep(g, d, { alpha: 0.06, period: 5.2 });
    dsTick(g, d, { x: 620, y: 976, label: 'r→0', value: (1 - empty) * 1000, rate: 1 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.6 + d.kick * 1.2 + tight * d.snare * 1.4),
      flash: 0.12 * tight * d.snare,
      vignette: 0.2 + empty * 0.16,
    }, dsLifePost(d, { amount: 1.2 })));
  },
});
