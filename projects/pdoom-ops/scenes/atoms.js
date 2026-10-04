// atoms — "I feel my atoms rearranging": a person made of points, re-sorted onto a lattice — and
// then onto the WRONG lattice, the columns swapped, quietly. The steps land on snares.
MV.scene('atoms', {
  init() {
    const fig = [
      LG.circle(62, 48, 'xy').map(([x, y]) => [x, y + 250]),                          // head
      [[0, 190], [0, -80]], [[-125, 120], [-40, 55]], [[125, 120], [40, 55]],         // spine + arms
      [[0, -80], [-72, -250]], [[0, -80], [72, -250]],                                // legs
    ];
    const P = [];
    fig.forEach(pl => { const pts = LG.along(pl.map(([x, y]) => [x, y, 0]), 210, { jitter: 7, seed: 3 }); for (let i = 0; i < pts.length; i++) P.push(pts[i]); });
    this.A = new Float32Array(P.flat());
    const n = this.A.length / 3, rnd = mulberry32(22);
    this.B = new Float32Array(n * 3); this.C = new Float32Array(n * 3);
    const cols = 20, rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = (i / cols) | 0;
      const x = (c - cols / 2) * 84, y = 260 - r * 38;
      this.B.set([x + (rnd() - 0.5) * 4, y + (rnd() - 0.5) * 4, 0], i * 3);
      // the wrong lattice: each column slid by its own number of rows — same stuff, wrong order
      const slide = 1 + Math.round(4 * Math.abs(Math.sin(c * 1.73 + 1)));
      const r2 = (r + slide) % rows;
      this.C.set([x, 260 - r2 * 38, 0], i * 3);
    }
    this.n = n;
  },
  render(g, f) {
    lmBegin('ice');
    const cam = lmScreen(), at = { pos: [W / 2, H / 2 - 70, 0] };
    const snaps = f.audio.events('snare', f.from, f.t).length;
    // phase 1: figure → lattice (settles by 60 %); phase 2: lattice → the WRONG lattice
    const k1 = clamp(snaps * 0.5 + prog(f.t, f.from + f.dur * 0.25, f.from + f.dur * 0.6));
    const k2 = prog(f.t, f.from + f.dur * 0.62, f.from + f.dur * 0.97);
    const M = k2 > 0 ? lmMorph(this.B, this.C, k2, { stagger: 0.7, swirl: 0.3, ease: ease.inOutCubic, seed: 5, out: this.M2 })
                     : lmMorph(this.A, this.B, k1, { stagger: 0.75, swirl: 0.35, ease: ease.inOutCubic, seed: 4, out: this.M1 });
    lmPoints(cam, this.stars || (this.stars = OPS.mkStars(700, 111)), { size: 1.5, gain: 0.3, twinkle: 0.5, t: f.t, fog: 90 });
    if (k1 > 0.02) lmPoints(cam, this.B, { size: 1.7, gain: 0.3 + 0.3 * k1, color: 'fg', twinkle: 0.35, t: f.t, drift: 2, model: at });
    lmPoints(cam, M, { size: 2.6, gain: 1.15, color: k2 > 0.02 ? 'accent' : 'fg', twinkle: 0.45, t: f.t, drift: k2 > 0 ? 1.5 : 0, dynamic: true, model: at });
    // the room breathes too, so the settled lattice is never a still frame
    OPS.ambient(lmGlow(), f, { gain: 0.8 });
    const gl = lmGlow();
    if (k2 > 0.02) OPS.tick(gl, 'order mismatch', W / 2, H - 320, { color: 'accent', size: 16, alpha: clamp(k2 * 3) });
    lmEnd(g);
    MV.focus(W / 2, H / 2 - 70 + 150 * (1 - clamp(k1)), 'figure');;
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['atoms', lmFmt(this.n)], ['order', k2 > 0.02 ? 'WRONG' : k1 > 0.5 ? 'LATTICE' : 'SELF']] }));
    return {};
  },
});
