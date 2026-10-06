// dipole — ember palette. A bar magnet in a tray of iron filings. The filings are needles: 3 600 of them, each with its
// own direction, turning under the torque B × m (a needle has no head, so the alignment has period π), feeling every
// neighbour as a little dipole — parallel needles attract head to tail and shove each other sideways, which is what
// chains them along the field — and creeping up ∇|B|², so the iron collects at *both* poles. They start as grey fuzz:
// on the first beat the magnet switches on and every needle swings round into the field; on the second bar a second
// magnet slides in from the right with its poles opposite, and the lines re-form to run from one to the other; on the
// third the field lifts off the tray — the same field, traced in three dimensions, drawn as glowing arcs over the iron.
// SIM.make: state at t is a pure function of t; tools/dip.js measures what it actually does.
const DIP_N = 3600;                       // iron filings (needles)
const DIP_RX = 2.7, DIP_RY = 1.85;         // tray half-extent
const DIP_P = 1.08;                        // distance from a magnet's centre to its poles
const DIP_LEN = 0.085;                     // needle length (world units)
const DIP_BX0 = 4.35, DIP_BX1 = 1.72;      // the second magnet slides in from here to here
const DIP_ARC = 35, DIP_ARC_SEG = 130;     // field lines traced for the 3D reveal, segments each
// pair interaction (traces of the real dipole–dipole force, in a plane): two *parallel* needles attract head to
// tail and push each other apart side by side — F ∝ [(1 − 5c²) r̂ + 2c û] / r⁴, c = r̂·û. That is what chains them
// along B; the old "pull each needle towards the centre of its neighbours" compressed them *along* B instead and
// left stripes across the field.
const DIP_PAIR = 2e-6;                   // coupling: the force is applied as a velocity (the filings creep)
const DIP_PAIR2 = 0.02;                   // interaction cut-off, squared (0.10 u)
const DIP_PS2 = 0.0020;                    // softened core of the 1/r⁴, squared (0.045 u)
const DIP_CORE2 = 0.0018;                  // hard core, squared (0.030 u): two needles cannot occupy one spot
const DIP_COREV = 0.45;                    // and how hard they shove when they try
const DIP_SHAKE = 0.0008;                  // positional jitter (u/step): the tray being tapped. Without it a purely
                                           // attractive pair force phase-separates into blobs instead of chains
const DIP_REP = 2.5e-6;                      // isotropic soft repulsion (∝ 1/r², so it reaches further than the 1/r⁴
const DIP_RS2 = 0.0012;                    // dipole term): without it the attraction phase-separates into blobs
const DIP_KMAX = 0.10;                     // cap on the pair coupling (u/s): 1/r⁴ without it drives needles
                                           // through each other instead of letting them settle into chains

MV.scene('dipole', {
  init() {
    this.bar = SG.box([0.5, 2.16, 0.5]);
    this.barEdges = SG.wire(this.bar, { bright: 0.9 });
    this.poleN = LG.gauss(2600, [0.1, 0.12, 0.1], { seed: 41 });
    this.poleS = LG.gauss(2600, [0.1, 0.12, 0.1], { seed: 42 });
    const tg = [];                                                      // the tray: a ruled surface under the iron
    for (let i = -7; i <= 7; i++) tg.push([[-i * 0.42, -DIP_RY, -0.02], [-i * 0.42, DIP_RY, -0.02]]);
    for (let j = -4; j <= 4; j++) tg.push([[-DIP_RX, j * 0.49, -0.02], [DIP_RX, j * 0.49, -0.02]]);
    this.trayGrid = LG.pairs(tg);
    this.trayRim = LG.seg([[-DIP_RX, -DIP_RY, 0], [DIP_RX, -DIP_RY, 0], [DIP_RX, DIP_RY, 0], [-DIP_RX, DIP_RY, 0]], { closed: true });
    this.segs = new Float32Array(DIP_N * 8);
    this.CS = 0.11;                                                     // clumping hash: one cell per 0.11 u of tray
    this.GX = Math.ceil(2 * DIP_RX / this.CS) + 1; this.GY = Math.ceil(2 * DIP_RY / this.CS) + 1;
    this.head = new Int32Array(this.GX * this.GY); this.next = new Int32Array(DIP_N);
    this.traceArcs();
    const N = DIP_N, self = this;
    this.sim = SIM.make({
      dt: 1 / 60, every: 0.5, keep: 6,
      init: t0 => {
        const r = mulberry32(101), cx = new Float32Array(N), cy = new Float32Array(N), x = new Float32Array(N), y = new Float32Array(N), z = new Float32Array(N), w = new Float32Array(N), br = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          x[i] = (r() * 2 - 1) * DIP_RX; y[i] = (r() * 2 - 1) * DIP_RY; z[i] = (r() - 0.5) * 0.03;
          const a = r() * Math.PI; cx[i] = Math.cos(a); cy[i] = Math.sin(a); br[i] = 0.5;
        }
        return { t0, x, y, z, cx, cy, w, br, bmax: 0, rng: SIM.seed(N, 17) };
      },
      step: (s, t, dt) => self.step(s, t, dt),
    });
  },
  // ---------------------------------------------------------------- drives (functions of shot time lt)
  /** Magnet A: dead until the first beat, then a power-on flicker. */
  aOn(lt) { return lt < 0.62 ? 0 : Math.min(1, (lt - 0.62) / 0.16) * (0.45 + 0.55 * lmFlick(lt, 0.62, 0.22)); },
  /** Magnet B slides in on the second bar (with an overshoot) and switches on as it arrives. */
  bX(lt) { return lerp(DIP_BX0, DIP_BX1, ease.outBack(clamp((lt - 2.08) / 0.52))); },
  bOn(lt) { return smoothstep(2.08, 2.5, lt); },
  /** The 3D arcs grow out of the tray on the third bar. */
  lift(lt) { return prog(lt, 4.35, 5.75, ease.inOutCubic); },
  /**
   * Field in the tray plane: four poles (A north / south, B south / north — the two magnets attract). Also returns the
   * gradient of |B|² in out[2], out[3] (its half, B·∂B/∂x): that is the force that pulls iron towards *stronger* field,
   * i.e. towards both poles. Drifting along B instead would sweep one pole clean and pile everything on the other.
   */
  field(x, y, a, bx, b, out) {
    let fx = 0, fy = 0, gxx = 0, gxy = 0, gyy = 0, dx, dy, r2, k, k5;
    const pole = (px, py, q) => {
      dx = x - px; dy = y - py; r2 = dx * dx + dy * dy + 0.01;
      k = q / (r2 * Math.sqrt(r2)); k5 = k / r2;                    // q/ρ³, q/ρ⁵
      fx += dx * k; fy += dy * k;
      gxx += k - 3 * dx * dx * k5; gyy += k - 3 * dy * dy * k5; gxy += -3 * dx * dy * k5;
    };
    pole(0, DIP_P, a); pole(0, -DIP_P, -a);
    if (b > 0.002) { pole(bx, DIP_P, -b); pole(bx, -DIP_P, b); }
    out[0] = fx; out[1] = fy;
    out[2] = fx * gxx + fy * gxy; out[3] = fx * gxy + fy * gyy;     // ½∇|B|²
    return fx * fx + fy * fy;
  },
  /**
   * One fixed step for every needle: the torque −K·sin(2Δ) (Δ = angle to B; a needle has no head) with damping, an
   * agitation term that dies away after the power-on (the tray being tapped), the sum of the pair dipole forces within
   * 0.10 u, and a creep up ½∇|B|² (towards stronger field — that is what pulls iron to *both* poles; drifting along B
   * would sweep one pole clean and pile everything on the other).
   */
  step(s, t, dt) {
    const lt = t - s.t0, a = this.aOn(lt), b = this.bOn(lt);
    if (a <= 0 && b <= 0) return;
    const bx = this.bX(lt), N = DIP_N, X = s.x, Y = s.y, CX = s.cx, CY = s.cy, W = s.w, BR = s.br, R = s.rng;
    const o = this._f || (this._f = [0, 0]);
    const agit = 3.4 * Math.exp(-Math.max(0, lt - 0.62) * 4.5) + 0.12;      // the tap: needles shake while it settles
    const jit = agit * dt * 26;
    const K = 340, C = 12, drift = 0.08 * dt;     // creep speed up ∇|B|² (u/s), saturating near a pole
    let bmax = 0;                // the strongest field any needle is standing in, this step (for the HUD)
    // iron attracts iron: a hash of the tray so a needle can feel the ones near it and they collect into chains
    const H = this.head, NX = this.next, GX = this.GX, GY = this.GY, CS = this.CS;
    H.fill(-1);
    for (let i = 0; i < N; i++) {
      const gx = clamp((X[i] + DIP_RX) / CS | 0, 0, GX - 1), gy = clamp((Y[i] + DIP_RY) / CS | 0, 0, GY - 1);
      const k = gx + GX * gy; NX[i] = H[k]; H[k] = i;
    }
    for (let i = 0; i < N; i++) {
      const x = X[i], y = Y[i];
      const m2 = this.field(x, y, a, bx, b, o);
      const fx = o[0], fy = o[1];
      const m = Math.sqrt(m2);
      if (m > 1e-7) {
        const ux = fx / m, uy = fy / m;
        // every neighbour is a little magnet: sum the pair forces (this is what makes the chains)
        let rx = 0, ry = 0, pfx = 0, pfy = 0;
        const ca0 = clamp((x + DIP_RX) / CS | 0, 0, GX - 1), cb0 = clamp((y + DIP_RY) / CS | 0, 0, GY - 1);
        for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) {
          const ga = ca0 + da, gb = cb0 + db;
          if (ga < 0 || gb < 0 || ga >= GX || gb >= GY) continue;
          for (let j = H[ga + GX * gb]; j >= 0; j = NX[j]) {
            if (j === i) continue;
            const dx = X[j] - x, dy = Y[j] - y, d2 = dx * dx + dy * dy;
            if (d2 > DIP_PAIR2 || d2 < 1e-9) continue;
            const r = Math.sqrt(d2), rux = -dx / r, ruy = -dy / r;      // r̂ points from the neighbour to us
            const c = rux * ux + ruy * uy;                              // cos(link, needle axis)
            const s = d2 + DIP_PS2;
            let kk = DIP_PAIR / (s * s); if (kk > DIP_KMAX) kk = DIP_KMAX;
            const a = (1 - 5 * c * c) * kk + DIP_REP / ((d2 + DIP_RS2) * (d2 + DIP_RS2)), bk = 2 * c * kk;
            pfx += rux * a + ux * bk; pfy += ruy * a + uy * bk;
            if (d2 < DIP_CORE2) { const w = (DIP_CORE2 - d2) / DIP_CORE2 * DIP_COREV; rx -= dx * w; ry -= dy * w; }
          }
        }
        let cx = CX[i], cy = CY[i], w = W[i];
        const dot = cx * ux + cy * uy, cross = cx * uy - cy * ux;   // cross = sin(θ_B − θ_needle)
        w += (K * 2 * cross * dot * Math.min(1, m * 6) - C * w) * dt;   // θ̈ = −K·sin 2Δ: stable at Δ = 0 (along B)
        const px = x + (pfx + rx) * dt, py = y + (pfy + ry) * dt;
        const gx2 = o[2], gy2 = o[3], gl = Math.hypot(gx2, gy2);    // creep up the field: towards both poles
        const cr = gl > 1e-12 ? drift * Math.min(1, gl * 0.03) / gl : 0;
        const dx2 = gx2 * cr, dy2 = gy2 * cr;
        // rotate by w·dt (small-angle: no trig in the loop; the vector is re-normalised below)
        const ca = w * dt;
        let nx = cx - cy * ca, ny = cy + cx * ca;
        const l = Math.min(1, m * 2.2), r1 = (SIM.xs(R, i) - 0.5) * jit * (1.4 - 0.6 * l), r2 = (SIM.xs(R, i) - 0.5) * jit * (1.4 - 0.6 * l);
        nx += -ny * r1; ny += nx * r2;                                      // the shake is angular too
        const nl = Math.hypot(nx, ny) || 1;
        CX[i] = nx / nl; CY[i] = ny / nl; W[i] = w * 0.98;
        const sh2 = DIP_SHAKE * (1 + 5 * Math.exp(-Math.max(0, lt - 0.62) * 4.5));
        X[i] = clamp(px + dx2 + (SIM.xs(R, i) - 0.5) * sh2, -DIP_RX, DIP_RX);
        Y[i] = clamp(py + dy2 + (SIM.xs(R, i) - 0.5) * sh2, -DIP_RY, DIP_RY);
        const al = Math.min(1, Math.abs(dot)), al3 = al * al * al;   // a needle lines up with B and starts to catch the light
        BR[i] = 0.02 + 0.98 * al3 * al3 * (0.75 + 0.25 * m / (m + 0.3));
        if (m > bmax) bmax = m;
      } else {
        BR[i] = 0.03;
      }
    }
    s.bmax = bmax;
  },
  /** Trace field lines in 3D from just off A's north pole: the same four poles, integrated along B. */
  traceArcs() {
    const out = new Float32Array(DIP_ARC * DIP_ARC_SEG * 8), bx = DIP_BX1, a = 1, b = 1;
    const B = (x, y, z, o) => {
      let fx = 0, fy = 0, fz = 0, dx, dy, dz, r2, k;
      const add = (px, py, pz, q) => { dx = x - px; dy = y - py; dz = z - pz; r2 = dx * dx + dy * dy + dz * dz + 0.01; k = q / (r2 * Math.sqrt(r2)); fx += dx * k; fy += dy * k; fz += dz * k; };
      add(0, DIP_P, 0, a); add(0, -DIP_P, 0, -a); add(bx, DIP_P, 0, -b); add(bx, -DIP_P, 0, b);
      o[0] = fx; o[1] = fy; o[2] = fz;
    };
    const acc = [0, 0, 0], pts = [];
    for (let i = 0; i < DIP_ARC; i++) {
      const th = 0.40 + (i % 7) * 0.26, ph = (Math.floor(i / 7) * 2 * Math.PI) / 5 + (i % 7) * 0.19;
      let px = Math.sin(th) * Math.cos(ph) * 0.26, py = DIP_P + Math.cos(th) * 0.26, pz = Math.sin(th) * Math.sin(ph) * 0.26;
      pts.length = 0; pts.push(px, py, pz);
      for (let k = 1; k < DIP_ARC_SEG; k++) {
        B(px, py, pz, acc);
        const l = Math.hypot(acc[0], acc[1], acc[2]) || 1;
        px += acc[0] / l * 0.075; py += acc[1] / l * 0.075; pz += acc[2] / l * 0.075;
        pts.push(px, py, pz);
        // a field line ends where it reaches a pole — A's south, or either pole of B (it used to check only A)
        if (Math.hypot(px, py + DIP_P, pz) < 0.22) break;
        if (Math.hypot(px - bx, py - DIP_P, pz) < 0.22) break;
        if (Math.hypot(px - bx, py + DIP_P, pz) < 0.22) break;
        if (Math.hypot(px, py, pz) > 7) break;
      }
      for (let j = 0; j < DIP_ARC_SEG; j++) {                               // interleaved: all lines grow together
        const q = (j * DIP_ARC + i) * 8, have = j + 1 < pts.length / 3, n = have ? 1 : 0;
        const a3 = Math.min(j, pts.length / 3 - 1) * 3, b3 = Math.min(j + 1, pts.length / 3 - 1) * 3;
        out[q] = pts[a3]; out[q + 1] = pts[a3 + 1]; out[q + 2] = pts[a3 + 2];
        out[q + 3] = pts[b3]; out[q + 4] = pts[b3 + 1]; out[q + 5] = pts[b3 + 2];
        out[q + 6] = n; out[q + 7] = 3;
      }
    }
    this.arcs = out;
  },
  /** Where the eye should be, per read: [time into the shot, MV.focus name, world point]. */
  EYES: [
    [0, 'magnet', [0, 0.1, 0]],
    [0.95, 'filings', [0.85, 0.30, 0]],
    [2.25, 'magnet2', [0, 0, 0]],        // the point is the magnet's own position, wherever it has got to
    [3.10, 'filings', [0.75, -0.35, 0]],
    [4.47, 'arcs', [0.15, 1.35, 0]],
    [5.20, 'arcs', [-0.35, 1.45, 0]],
  ],
  render(g, f) {
    const t = f.t, lt = f.lt, s = this.sim.at(t, f.from), N = DIP_N;
    const a = this.aOn(lt), b = this.bOn(lt), bx = this.bX(lt), lift = this.lift(lt);
    const ev = te => ease.inOutCubic(clamp((lt - te) / 0.6));           // the camera holds still between events
    const cam = lmOrbit({ yaw: 0.20 + 0.12 * (ev(0.62) + ev(2.1) + ev(4.35)), pitch: 0.80 - 0.26 * ev(4.35), dist: 8.3 - 0.3 * ev(0.62) - 0.35 * ev(2.1) + 0.25 * ev(4.35), fov: 34, shift: [185, 16] });
    // ---- the needles: two endpoints per filing, built from the simulation state
    const seg = this.segs, L = DIP_LEN * 0.5;
    for (let i = 0; i < N; i++) {
      const cx = s.cx[i], cy = s.cy[i], q = i * 8, x = s.x[i], y = s.y[i], z = s.z[i], h = L * (0.7 + 0.6 * s.br[i]);
      seg[q] = x - cx * h; seg[q + 1] = y - cy * h; seg[q + 2] = z;
      seg[q + 3] = x + cx * h; seg[q + 4] = y + cy * h; seg[q + 5] = z;
      seg[q + 6] = 0.04 + 0.96 * s.br[i]; seg[q + 7] = 3;
    }
    seg.__v = (seg.__v || 0) + 1;
    const bp = Math.exp(-f.beatPhase * 7), bar = Math.exp(-f.barPhase * 4);
    const pal = lmBegin('ember');
    lmLines(cam, this.trayGrid, { width: 1, gain: 0.10, glow: 0, fog: 9 });
    lmLines(cam, this.trayRim, { width: 1.3, gain: 0.22 + 0.2 * bar, color: 'accent', glow: 0.15 });
    // magnets (lit solids: the filings behind them are hidden), then the iron
    const modelA = { pos: [0, 0, 0] };
    smMesh(cam, this.bar, { model: modelA, color: [0.11, 0.10, 0.11], diffuse: 0.30, spec: 0.65, specColor: 'hot', shine: 70, ambient: 0.03, env: 0.5, rim: 0.55, rimColor: 'accent', rimPow: 2.2, twoSided: false });
    lmLines(cam, this.barEdges, { width: 1.1, gain: 0.14 + 0.3 * a, color: 'fg', glow: 0.25, model: modelA, occlude: true });
    if (b > 0.01) {
      const modelB = { pos: [bx, 0, 0] };
      smMesh(cam, this.bar, { model: modelB, color: [0.10, 0.10, 0.12], diffuse: 0.30, spec: 0.65, specColor: 'hot', shine: 70, ambient: 0.03, env: 0.5, rim: 0.55, rimColor: 'fg', rimPow: 2.2 });
      lmLines(cam, this.barEdges, { width: 1.2, gain: 0.20 + 0.5 * b, color: 'fg', glow: 0.25, model: modelB, occlude: true });
    }
    lmLines(cam, seg, { width: 1.1, gain: 0.20, color: 'fg', glow: 0.14, dof: 4, occlude: true });
    // the poles and the field that leaves the tray
    const pg = 0.25 + 1.5 * a + 0.6 * bp;
    lmPoints(cam, this.poleN, { size: 2.0, gain: 0.30 * pg, color: 'hot', model: { pos: [0, DIP_P, 0], scale: 0.75 + 0.3 * a } });
    lmPoints(cam, this.poleS, { size: 2.0, gain: 0.30 * pg, color: 'accent', model: { pos: [0, -DIP_P, 0], scale: 0.75 + 0.3 * a } });
    if (b > 0.01) {
      lmPoints(cam, this.poleS, { size: 2.0, gain: 0.30 * pg * b, color: 'accent', model: { pos: [bx, DIP_P, 0], scale: 0.75 + 0.3 * b } });
      lmPoints(cam, this.poleN, { size: 2.0, gain: 0.30 * pg * b, color: 'hot', model: { pos: [bx, -DIP_P, 0], scale: 0.75 + 0.3 * b } });
    }
    // the arcs sweep out over the tray and across the words: the text helpers lay their own soft backing, and the
    // light fades out in front of them (docs/ENGINE.md, "字自己让出位置")
    if (lift > 0) lmLines(cam, this.arcs, { width: 1.4, gain: 0.34, color: 'accent', glow: 0.4, upto: lift, occlude: true });
    lmEnd(g, { bloom: 1.05 });
    // ---- the eye, per read
    let k = 0; for (let i = 0; i < this.EYES.length; i++) if (lt >= this.EYES[i][0]) k = i;
    const e = this.EYES[k], p = cam.project(e[1] === 'magnet2' ? [bx, 0, 0] : e[2]);
    if (p) MV.focus(p[0], p[1], e[1]);
    MV.decor(() => lmSection(g, 1, 3, '磁场', 'IRON FILINGS'));
    lmHud(g, f, {
      id: 's1', name: 'dipole', on: lmFlick(t, f.from, 0.4),
      rows: [['needles', lmFmt(N, { sep: ' ' })], ['poles', b > 0.5 ? 4 : a > 0.5 ? 2 : 0], ['|B| max', (a > 0.01 || b > 0.01 ? (s.bmax || 0) : 0).toFixed(2)], ['step', this.sim.stepAt(t, f.from)]],
      foot: 'SIM.make · torque −K·sin(2Δ) · drift along ∇|B|²',
    });
    if (lt > 0.35 && a > 0) MV.decor(() => { g.save(); g.globalAlpha = Math.min(1, (lt - 0.35) * 2); lmCode(g, `m = (${DIP_N} needles)\nB(p) = Σ qᵢ (p − pᵢ) / |p − pᵢ|³\nτ = m × B  →  −K·sin(2Δ)`, 112, 300, { size: 19 }); g.restore(); });
    const nA = cam.project([0.36, DIP_P, 0.36]);
    if (nA && a > 0.6) MV.decor(() => lmLabel(g, nA[0], nA[1], 'N', { dx: 54, dy: -34, run: 30, size: 15, color: 'hot', knock: true }));
    const sA = cam.project([0.36, -DIP_P, 0.36]);
    if (sA && a > 0.6) MV.decor(() => lmLabel(g, sA[0], sA[1], 'S', { dx: 54, dy: 34, run: 30, size: 15, color: 'accent', knock: true }));
    lmTerminal(g, f);
    return a > 0 && lt < 0.95 ? { flash: 0.10 * Math.exp(-Math.max(0, lt - 0.62) * 9) } : {};
  },
});
