// sand — ember palette. A million grains of sand on a square metal plate (a lit smMesh height field). Still at first;
// on "shake" the plate rings and the sand runs off the moving parts onto the nodal lines — the Chladni figure of that
// mode, u = cos(nπx)cos(mπz) ± cos(mπx)cos(nπz). On each bar a new note: the sand jumps off the old lines and finds the
// new, finer ones. The grains are a real simulation (each grain hops in proportion to how hard the plate moves under
// it, and drifts down the slope of u²), run through SIM.make, so every frame is still a function of t.
const SAND_MODES = [
  // [lt from, n, m, sign]   (lt = time into the shot)
  [0.7, 2, 5, -1],
  [2.0, 3, 7, 1],
  [4.0, 5, 8, -1],
];
const SAND_G = 512;
MV.scene('sand', {
  init() {
    const G = SAND_G;
    this.fields = SAND_MODES.map(([, n, m, sg]) => {
      const A = new Float32Array(G * G), GX = new Float32Array(G * G), GZ = new Float32Array(G * G);
      const u = (x, z) => { const a = (x + 1) / 2, b = (z + 1) / 2; return Math.cos(n * Math.PI * a) * Math.cos(m * Math.PI * b) + sg * Math.cos(m * Math.PI * a) * Math.cos(n * Math.PI * b); };
      let amax = 0, gmax = 0, e = 1 / G;
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const x = i / (G - 1) * 2 - 1, z = j / (G - 1) * 2 - 1, v = u(x, z), k = j * G + i;
        A[k] = Math.abs(v); amax = Math.max(amax, A[k]);
        const gx = (u(x + e, z) ** 2 - u(x - e, z) ** 2) / (2 * e), gz = (u(x, z + e) ** 2 - u(x, z - e) ** 2) / (2 * e);
        GX[k] = gx; GZ[k] = gz; gmax = Math.max(gmax, Math.hypot(gx, gz));
      }
      for (let k = 0; k < G * G; k++) { A[k] /= amax; GX[k] /= gmax; GZ[k] /= gmax; }
      return { A, GX, GZ, u, n, m, sg };
    });
    const N = this.N = 1000000;
    this.sim = SIM.make({
      dt: 1 / 60, every: 0.5,
      init: () => {
        const r = mulberry32(77), x = new Float32Array(N), z = new Float32Array(N);
        for (let i = 0; i < N; i++) { x[i] = (r() * 2 - 1) * 0.985; z[i] = (r() * 2 - 1) * 0.985; }
        return { x, z, rng: SIM.seed(N, 5) };
      },
      step: (s, t, dt, i) => this.step(s, i * dt),
    });
    this.P = new Float32Array(N * 3);
    this.plate = SG.height(() => 0, [2, 2], 120);
    this.rimL = LG.seg([[-1, 0.003, -1], [1, 0.003, -1], [1, 0.003, 1], [-1, 0.003, 1]], { closed: true });
  },
  /** Which mode is ringing at shot time lt, and how hard (0..1, with a kick at each new note). */
  drive(lt) {
    let k = -1; for (let i = 0; i < SAND_MODES.length; i++) if (lt >= SAND_MODES[i][0]) k = i;
    if (k < 0) return { k: 0, amp: 0, since: 0 };
    const since = lt - SAND_MODES[k][0];
    return { k, amp: ease.outCubic(Math.min(1, since / 0.25)) * (1 + 0.8 * Math.exp(-since * 5)), since };
  },
  step(s, lt) {
    const { k, amp } = this.drive(lt);
    if (amp <= 0) return;
    const F = this.fields[k], A = F.A, GX = F.GX, GZ = F.GZ, G = SAND_G, h = (G - 1) * 0.5;
    const X = s.x, Z = s.z, R = s.rng, N = this.N, hop = 0.034 * amp, drift = 0.0105 * amp;
    for (let i = 0; i < N; i++) {
      let x = X[i], z = Z[i];
      const c = (((z + 1) * h + 0.5) | 0) * G + (((x + 1) * h + 0.5) | 0), a = A[c];
      let r = R[i];
      r ^= r << 13; r ^= r >>> 17; r ^= r << 5; const r1 = (r >>> 0) / 4294967296 - 0.5;
      r ^= r << 13; r ^= r >>> 17; r ^= r << 5; const r2 = (r >>> 0) / 4294967296 - 0.5;
      R[i] = r >>> 0;
      x += r1 * hop * a - drift * GX[c]; z += r2 * hop * a - drift * GZ[c];
      if (x > 0.995) x = 1.99 - x; else if (x < -0.995) x = -1.99 - x;
      if (z > 0.995) z = 1.99 - z; else if (z < -0.995) z = -1.99 - z;
      X[i] = x; Z[i] = z;
    }
  },
  render(g, f) {
    const t = f.t, lt = f.lt, d = this.drive(lt), F = this.fields[d.k];
    const s = this.sim.at(t, f.from), P = this.P, N = this.N;
    for (let i = 0; i < N; i++) { P[i * 3] = s.x[i]; P[i * 3 + 1] = 0.006; P[i * 3 + 2] = s.z[i]; }
    P.__v = (P.__v || 0) + 1;
    // the plate moves: a few hundredths of a unit, at a rate far above the frame rate (aliased on purpose to a shimmer)
    const vib = 0.014 * d.amp * Math.sin(t * 2 * Math.PI * 27);
    SG.heightSet(this.plate, (x, z) => vib * F.u(x, z));
    const cam = lmOrbit({ yaw: 0.35 + lt * 0.04, pitch: lerp(0.98, 0.88, ease.inOutCubic(f.p)), dist: lerp(3.4, 3.15, ease.inOutCubic(f.p)), fov: 38, shift: [330, 10] });
    lmBegin('ember');
    smMesh(cam, this.plate, { color: [0.2, 0.19, 0.18], diffuse: 0.5, ambient: 0.05, spec: 0.45, specColor: 'fg', shine: 90, env: 0.7, rim: 0.12, rimColor: 'accent' });
    lmLines(cam, this.rimL, { width: 1.3, gain: 0.5, color: 'accent', glow: 0.2 });
    lmPoints(cam, P, { size: 0.85, gain: 0.085, color: 'fg', dynamic: true });
    lmEnd(g, { bloom: 0.8 });
    const c = cam.project([0, 0, 0]);
    MV.focus(c[0], c[1], 'plate');
    // the drive: a trace whose frequency follows the mode (∝ m² + n² for this plate)
    const fr = F.m * F.m + F.n * F.n, pts = [];
    for (let i = 0; i <= 160; i++) { const u = i / 160; pts.push([112 + u * 400, 236 - 26 * Math.min(1, d.amp) * Math.sin(u * fr * 0.55 + t * 18), 0]); }
    lmBegin('ember'); lmLines(lmScreen(), LG.seg(pts), { width: 1.4, gain: 0.9, color: 'accent', glow: 0.3 }); lmEnd(g, { blend: 'screen', bloom: 0.5 });
    lmTag(g, 'DRIVE', 112, 190, { color: 'dim' });
    lmHud(g, f, {
      id: 's3', name: 'sand', on: lmFlick(t, f.from, 0.4),
      rows: [['grains', lmFmt(N, { sep: ' ' })], ['mode', d.amp ? `(${F.n}, ${F.m}) ${F.sg > 0 ? '+' : '−'}` : '—'], ['f ∝ m²+n²', d.amp ? fr : 0], ['step', this.sim.stepAt(t, f.from)]],
      foot: 'SIM.make · dt 1/60 · checkpoints every 0.5 s',
    });
    if (d.amp) g.save(), g.globalAlpha = Math.min(1, d.since * 3), lmCode(g, `u = cos(${F.n}πx)·cos(${F.m}πz) ${F.sg > 0 ? '+' : '−'} cos(${F.m}πx)·cos(${F.n}πz)`, 112, 300, { size: 20 }), g.restore();
    lmTerminal(g, f);
    return d.since < 0.2 && d.k > 0 ? { shake: 4 * (1 - d.since / 0.2) } : {};
  },
});
