// flops — 66.22–69.76, ember. "One E thirty FLOPs a second": the count is the picture. Display type, thin and
// huge, at 1.0 × 10³⁰, and the exponent rolls up one digit per kick (27 → 30) while the last digit scrambles.
// Under it, the compute curve is drawn in screen space on a log grid, with a head that flares on every hit.
// This is the film's one piece of pure read-out type. One thing at full gain: the number.
MV.scene('flops', {
  init() {
    // the curve: steps, not a smooth line — compute arrives in generations
    const x0 = 172, x1 = W - 172, yB = 742, yT = 470, n = 200;
    this.pts = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const v = clamp(0.16 + Math.pow(u, 3.1) * 1.5 + 0.03 * noise1(u * 26, 3));
      const step = Math.floor(v * 9) / 9;                        // quantised: each generation is a step
      this.pts.push([x0 + u * (x1 - x0), yB - (0.28 * v + 0.72 * step) * (yB - yT)]);
    }
    const P = new Float32Array(n * 3), S = new Float32Array((n - 1) * 8);
    this.pts.forEach((p, i) => { P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; });
    for (let i = 0; i < n - 1; i++) {
      const a = this.pts[i], b = this.pts[i + 1], k = i * 8;
      S[k] = a[0]; S[k + 1] = a[1]; S[k + 2] = 0; S[k + 3] = b[0]; S[k + 4] = b[1]; S[k + 5] = 0;
      S[k + 6] = 0.85; S[k + 7] = (i === 0 ? 1 : 0) + (i === n - 2 ? 2 : 0);
    }
    this.trSeg = S; this.trPts = P; this.head = new Float32Array(3);
    this.patrolP = new Float32Array(3);                    // the measuring head, rewritten every frame
    this.grid = new Float32Array(5 * 8);
    for (let i = 0; i < 5; i++) {
      const y = yT + i * (yB - yT) / 4, k = i * 8;
      this.grid[k] = x0; this.grid[k + 1] = y; this.grid[k + 3] = x1; this.grid[k + 4] = y;
      this.grid[k + 6] = 0.4; this.grid[k + 7] = 0;
    }
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.3, ease.outExpo) * dsOut(d, 0.22);
    // the curve is written on once, and then a measuring head keeps running along it, one pass per bar: the number
    // is not a print-out, it is being taken right now
    const write = dsIn(d, 0.1, 1.5, ease.inOutQuad);
    const patrol = d.barPhase;
    // the exponent rides the kicks: 27 at the cut, 30 by the third hit, then it stops and the frame just keeps hitting
    const ks = dsEvents(f, 'kick', f.from, t);
    const exp = Math.min(30, 27 + ks.length);
    const fresh = ks.length > 0 && (t - ks[ks.length - 1].t) < 0.22;
    const gl = DS_GLYPH[Math.floor(hash(exp, Math.floor(t * 30)) * DS_GLYPH.length)];
    const expStr = fresh && exp > 27 ? String(exp)[0] + gl : String(exp);
    const hit = d.kick * a;

    const hi = clamp(Math.floor(write * (this.pts.length - 1)), 0, this.pts.length - 1);
    this.head[0] = this.pts[hi][0]; this.head[1] = this.pts[hi][1]; this.head[2] = 0;
    // the patrol: the same point, walking the finished curve again every bar, so the graph is never a still image
    const pi = clamp(Math.floor(patrol * (this.pts.length - 1)), 0, this.pts.length - 1);
    this.patrolP[0] = this.pts[pi][0]; this.patrolP[1] = this.pts[pi][1]; this.patrolP[2] = 0;

    dsLight(d, [
      { S: this.grid, o: { width: 1, gain: 0.16 * a, color: 'dim', dash: [4, 6] } },
      { S: this.trSeg, o: { width: 1.7, gain: 0.9 * a, color: 'hot', glow: 0.5, blur: 0.6, upto: write } },
      { P: this.trPts, o: { size: 1.5, gain: 0.4 * a, color: 'accent', blur: 0.5, count: Math.round(this.pts.length * write) } },
      { P: this.head, o: { size: 3.6 + hit * 2.4, gain: 1.1 * a, color: 'hot', blur: 0.7 } },
      { P: this.patrolP, o: { size: 2.6 + d.kick * 1.2, gain: 1.05 * a, color: 'hot', blur: 0.6 } },
    ], { cam: lmScreen(), end: { bloom: 0.6 + hit * 0.2, exposure: 0.92, ca: 0.35 } });

    // ---- 1.0 × 10^30, drawn by hand so the exponent can be its own size
    g.save();
    g.globalAlpha = a;
    const mSize = 178, eSize = 104, cy = 302;
    g.font = dsSans(mSize, 200);
    const w1 = g.measureText('1.0 × 10').width;
    g.font = dsSans(eSize, 200);
    const w2 = g.measureText('30').width;
    const x0 = W / 2 - (w1 + w2 + 10) / 2;
    dsLine(g, '1.0 × 10', x0, cy, { font: dsSans(mSize, 200), size: mSize, color: dsTone(d, 'fg', 0.96), glow: 26, align: 'left' });
    dsLine(g, expStr, x0 + w1 + 10, cy - 62, { font: dsSans(eSize, 200), size: eSize, color: dsTone(d, exp === 30 ? 'hot' : 'accent', 0.98), glow: 22, align: 'left' });
    dsLine(g, 'F L O P S   ·   P E R   S E C O N D', W / 2, cy + 132, { font: dsMono(20, 400), size: 20, track: 3, color: dsTone(d, 'dim', 0.9), glow: 0 });
    TL.stamp(g, d, 'ONE SECOND OF COMPUTE', 172, 440, { size: 13, track: 4 });
    for (let i = 0; i < 5; i++) {
      const y = 470 + i * (742 - 470) / 4;
      TL.stamp(g, d, '1e' + (27 + i), 150, y, { size: 12, track: 1, align: 'right', alpha: 0.55 });
    }
    TL.block(g, d, [
      ['compute', '1.0e' + exp],
      ['gpus', '100 000'],
      ['gpu-years', TL.num(TL.roll(t, 2.4e5, 3))],
      ['useful work', '—'],
    ], { x: W - 470, y: H - 262, hot: [3] });
    g.restore();

    dsTele(g, d, { id: 'c22', name: 'flops', rows: [['exponent', expStr], ['kicks', String(ks.length)], ['target', '1e30'], ['safety', 'assumed']], foot: 'the exponent rolls on the kick' });
    // lyric: the plate gives this line 'terminal' — 1e30 FLOPs: a number, printed — and a printed number is the
    // whole shot, so it comes off the map. A log line under a log-scale graph.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 25, y: H - 150, rows: 3 });
    dsLife(g, d, { gain: 1.0, dust: 100 });
    dsScanSweep(g, d, { alpha: 0.055, period: 5.0 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.5 + d.kick * 1.2), flash: hit * 0.08, vignette: 0.22 }, dsLifePost(d, { amount: 1.2 })));
  },
});
