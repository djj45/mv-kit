// "But now the singularity's begun": a black hole on the page — a disc struck solid black, the photon ring left as
// paper, the accretion disc a tilted band whose far side is lensed up over the top. Around it the page's own words
// (SAFETY, OVERSIGHT, CONTROL …) swirl inwards on Kepler orbits, faster the closer they get, and vanish at the
// horizon. "begun": the disc burns red and everything falls in.
MV.scene('singularity', {
  init() {
    this.S = prSheet({ cpi: 15, lpi: 8 });
    const words = ['SAFETY', 'OVERSIGHT', 'CONTROL', 'ALIGNMENT', 'HUMANS', 'REVIEW', 'SHUTDOWN', 'CONSENT', 'LIMITS', 'AUDIT', 'RULES', 'US'];
    const R = mulberry32(5); this.motes = [];
    for (let i = 0; i < 64; i++) this.motes.push({ w: words[i % words.length], r0: 200 + Math.pow(R(), 0.8) * 850, a0: R() * TAU, sp: 0.6 + 0.8 * R() });
  },
  render(g, f) {
    const S = this.S.clear(), tq = f.tq, t = f.t, c = S.g, ln = f.lyrics.get('singularity'), tBeg = ln.words[4].start;
    PP.header(S, f, f.params.page);
    const cx = W / 2, cy = 430, rh = 115, burn = ease.outCubic(clamp((tq - tBeg) / 0.3)), yS = 0.42;
    // words falling in: r shrinks exponentially, angle advances ~ r^-1.5; faster after "begun"
    const age = tq - f.from, fall = 0.16 * age + 0.9 * Math.max(0, tq - tBeg) * Math.max(0, tq - tBeg);
    for (const [i, m] of this.motes.entries()) {
      const r = m.r0 * Math.exp(-fall * m.sp); if (r < rh * 1.3) continue;
      const a = m.a0 + age * 2.2 * Math.pow(300 / r, 1.5) * m.sp, red = r < 300 || (burn > 0 && hash(i, 3) < burn * 0.6);
      // the word keeps together, its letters strung along the orbit, always reading left to right
      const n = m.w.length, pos = [...Array(n)].map((_, k) => { const ak = a - k * S.tcw * 1.05 / r; return S.tcell(cx + Math.cos(ak) * r, cy + Math.sin(ak) * r * yS); });
      const flip = pos[n - 1][0] < pos[0][0];
      pos.forEach(([col, row], k) => { if (row >= 3 && row <= 32) S.put(col, row, m.w[flip ? n - 1 - k : k], { ink: clamp(0.5 + 300 / r * 0.3), red, now: true }); });
    }
    // the disc: lensed far side over the top, the horizon, the photon ring, the near side in front
    const col = burn > 0.5 ? '#ff0000' : '#444', spin = tq * 3;
    const band = (sy, from, to, w) => {
      c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.ellipse(cx, cy, rh * 2.9, rh * 2.9 * sy, 0, from, to); c.stroke();
      c.lineWidth = 3; c.strokeStyle = '#fff'; c.setLineDash([18, 26]); c.lineDashOffset = -spin * 60;
      c.beginPath(); c.ellipse(cx, cy, rh * 2.9, rh * 2.9 * sy, 0, from, to); c.stroke(); c.setLineDash([]);
    };
    band(0.62, Math.PI, TAU, 34 + 18 * burn);
    c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, rh * (1 + 0.15 * burn), 0, TAU); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, rh * (1.16 + 0.15 * burn), 0, TAU); c.stroke();
    band(0.2, 0, Math.PI, 42 + 22 * burn);
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ["SINGULARITY'S", 'BEGUN'], width: 124 });
    const z = lerp(0.9, 1.02, ease.inQuad(clamp(age / (tBeg - f.from)))) - 0.05 * burn;
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z, rot: 0.04 * burn * Math.sin(t * 3) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 14 * pulse(t, tBeg, 0.25), flash: 0.3 * pulse(t, tBeg, 0.12) };
  },
});
