// flock — rose palette. 2 600 starlings, and no leader: each bird steers on the few neighbours it can see within
// FLK_R (alignment, cohesion, separation), stays inside a soft wall, and turns around its own centre as a body — so
// the shape is not drawn anywhere, it is what the rules look like from outside. On the second bar something fast
// comes in from the left and slashes through the middle: the flock is cut into two halves (2.6 s is the moment to
// read), the intruder turns away, and the two halves close again behind it. A real simulation through SIM.make, so
// the shape at t is still only a function of t. tools/flk-clusters.js is the measure: neighbours, clusters, extents.
const FLK_N = 2600;
const FLK_R = 0.14;                        // how far a bird can see (world units): ~10 neighbours in the calm flock
const FLK_G = 40;                          // hash cells per side: cell ≈ FLK_R, or every bird scans ~1800
                                           // candidates to find its ten neighbours (that is what made
                                           // check's flock frame take 1.2 s)
const FLK_HALF = 2.7;                      // hash half-extent (u): the flock lives well inside it
const FLK_VMIN = 0.2, FLK_VMAX = 2.2;      // speed limits (u/s) — a startled bird gets the whole range, see below
const FLK_R0 = 1.82;                       // the soft wall when the flock is calm (u) — and the disc it starts in
const HAWK_PANIC = 0.85;                   // a bird this close to the intruder, seen from above, is startled (u)
const FLK_PSPEED = 1.5;                    // …and so is a bird whose neighbours are moving this fast: the fright runs
                                           // through the flock as a wave of speed, and dies when the speed does (u/s)
const FLK_PTAU = 0.22;                     // how long the startle lasts once nothing near is fast (s)
const FLK_OM = 0.60;                       // how fast a startled flock turns as a body (rad/s)
const FLK_LCALM = 6;                       // below this many neighbours a bird is at the edge of a hole: weaker cohesion,
                                           // a higher speed cap. Set against the calm flock's own count (~10 with the
                                           // mid-range shove below). At 18 — tuned before the shove spread the birds out —
                                           // 93–100 % of them counted as lonely all the time and the flock never calmed
                                           // down (0.32–0.46 u/s from start to end: qa's one-speed); at 6 it is 5–9 %
const FLK_R2 = 0.50, FLK_R22 = 0.50 * 0.50;   // how far a bird with no neighbours at all looks for the flock (u)
const FLK_H0 = 0.15;                       // the sheet's half-thickness (u): a starling sheet is flat
const HAWK_CZ = 0.30;                      // the intruder crosses the flock along this z
const HAWK_S = 0.40, HAWK_K = 520;          // its bubble, seen from above (u), and how hard it shoves: wide enough to
                                           // clear the ground under it, small next to the flock — a wide push just
                                           // shoves the whole flock aside instead of opening a hole in it
const FLK_SEP = 0.065, FLK_SEP2 = 0.065 * 0.065, FLK_SEPK = 9.0;   // personal space (u) and how hard it pushes
const FLK_PR = 0.13, FLK_PR2 = 0.13 * 0.13, PR_K = 16.0;   // the mid-range shove (u) and its strength: twice the
                                           // personal space, so a bird feels the crowd a body-length away. Inside the
                                           // flock it cancels; at the edge of a hole only one side pushes, and that is
                                           // the pressure that fills the hole — a gas in a box, with the wall as the box

MV.scene('flock', {
  init() {
    const N = FLK_N, self = this;
    this.pts = new Float32Array(N * 3);
    this.head = new Int32Array(FLK_G * FLK_G * FLK_G);
    this.next = new Int32Array(N);
    this.streaks = new Float32Array(Math.ceil(N / 4) * 8);
    this.haze = new Float32Array(Math.ceil(N / 5) * 3);       // a soft body under the dots (see render)
    this.hawkCloud = LG.gauss(700, 0.028, { seed: 61 });
    this.hawkRing = LG.ring(700, { r: 0.075, width: 0.01, thick: 0.004, seed: 62 });
    this.sim = SIM.make({
      dt: 1 / 60, every: 0.5, keep: 6,
      init: t0 => {
        const r = mulberry32(71), x = new Float32Array(N), y = new Float32Array(N), z = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const a = r() * Math.PI * 2, rr = FLK_R0 * Math.sqrt(r());          // sqrt: an even, *filled* disc
          x[i] = Math.cos(a) * rr; z[i] = Math.sin(a) * rr; y[i] = (r() * 2 - 1) * FLK_H0 * (1 - 0.4 * rr / FLK_R0);
          const om = 0.55;                                                    // it starts turning as one body:
          vx[i] = -z[i] * om + (r() - 0.5) * 0.12;                             // v = ω × r, damped away by the air
          vz[i] = x[i] * om + (r() - 0.5) * 0.12; vy[i] = (r() - 0.5) * 0.1;
        }
        const pa = new Float32Array(N);                                     // 0 = calm, 1 = startled
        return { t0, x, y, z, vx, vy, vz, p: pa, cx: 0, cy: 0, cz: 0, sp: 0, mp: 0, th: 0, hit: 0, rng: SIM.seed(N, 23) };
      },
      step: (s, t, dt) => self.step(s, t, dt),
    });
  },
  /**
   * The intruder: in fast from the left, then a *slow* pass through the middle of the flock — about a second over it,
   * so the hole is around it from 2.4 to 2.9 s and travels with it — and then up and away, gone by 3.8 s. It only
   * shoves its own bubble (HAWK_S), a disc seen from above and nothing else — there is no wake. That is the whole
   * interaction: the hole is around it and travels with it, and what closes it afterwards is the flock's own rules.
   */
  hawk(lt) {
    if (lt < 1.05 || lt > 4.0) return null;
    const z = HAWK_CZ, y = 0.45;
    if (lt < 2.05) {                                          // in fast from the left
      const k = ease.inOutCubic((lt - 1.05) / 1.0);
      return [lerp(-3.4, 1.20, k), lerp(2.6, y, ease.inCubic(k)), lerp(-0.15, z, k)];
    }
    if (lt < 3.15) {                                          // a *steady* pass right across the flock at 1.6 u/s: no
      const k = clamp((lt - 2.05) / 1.5);                     // easing (with the fastest part in the middle the hole
      return [lerp(1.20, -1.20, k), y, z];                    // lagged 0.3 s behind it), and it keeps moving, so the
    }                                                         // point it was at a second ago is well behind it
    if (lt < 3.45) {                                          // out of the flock sideways and *up*: climbing takes the
      const k = ease.inOutCubic((lt - 3.15) / 0.3);           // bubble off the sheet, so it stops carving the moment
      return [lerp(-1.20, -2.6, k), lerp(y, 2.9, ease.inCubic(k)), z];   // the pass is over
    }
    const k = ease.inCubic((lt - 3.45) / 0.5);                 // and away, gone by 4.0
    return [lerp(-2.6, 0.9, k), lerp(2.9, 6.4, k), lerp(z, 0.9, k)];
  },
  /** One fixed step: the centroid, a spatial hash, then the four rules plus the intruder, for every bird. */
  step(s, t, dt) {
    const N = FLK_N, X = s.x, Y = s.y, Z = s.z, VX = s.vx, VY = s.vy, VZ = s.vz, R = s.rng;
    const H = this.head, NX = this.next, G = FLK_G, CELL = 2 * FLK_HALF / G, R2 = FLK_R * FLK_R;
    let spd = 0;
    const P = s.p;
    const lt = t - s.t0, hk = this.hawk(lt);
    H.fill(-1);
    let cx = 0, cy = 0, cz = 0, mvx = 0, mvy = 0, mvz = 0, psum = 0;
    for (let i = 0; i < N; i++) {
      cx += X[i]; cy += Y[i]; cz += Z[i]; mvx += VX[i]; mvy += VY[i]; mvz += VZ[i]; psum += P[i];
      const a = clamp(((X[i] + FLK_HALF) / CELL) | 0, 0, G - 1), b = clamp(((Y[i] + FLK_HALF) / CELL) | 0, 0, G - 1), c = clamp(((Z[i] + FLK_HALF) / CELL) | 0, 0, G - 1);
      const k = a + G * (b + G * c);
      NX[i] = H[k]; H[k] = i;
    }
    cx /= N; cy /= N; cz /= N; mvx /= N; mvy /= N; mvz /= N; s.cx = cx; s.cy = cy; s.cz = cz;
    const mp = psum / N; s.mp = mp;                                        // how startled the flock is, as a whole
    // WA alignment, WC cohesion, KS the wall, KY flattens the sheet, HA the anchor (the flock stays where the camera
    // is), DRAG the air (speed follows force instead of hitting the cap), KG the pull to the middle — with the mid-range
    // shove above doing the work, this only has to keep the middle from thinning out
    const WA = 3.4, WC = 0.6, KS = 6.0, OM = FLK_OM, KSW = 6.0, KY = 2.4, HA = 1.2, DRAG = 1.5, KMAX = 16;
    const KG = 0.10;
    // the wall follows the flock's own state (startled → it billows out a little), and closes in slightly once the
    // intruder has gone (3.7–5.0 s); nothing is pulled towards the intruder's line — the shove fills the hole
    const R0 = FLK_R0 + 0.20 * mp - 0.15 * prog(lt, 3.7, 5.0);
    for (let i = 0; i < N; i++) {
      const x = X[i], y = Y[i], z = Z[i], vx = VX[i], vy = VY[i], vz = VZ[i];
      const ca = clamp(((x + FLK_HALF) / CELL) | 0, 0, G - 1), cb = clamp(((y + FLK_HALF) / CELL) | 0, 0, G - 1), cc = clamp(((z + FLK_HALF) / CELL) | 0, 0, G - 1);
      let n = 0, ax = 0, ay = 0, az = 0, px = 0, py = 0, pz = 0, sx = 0, sy = 0, sz = 0, qrx = 0, qrz = 0;
      for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) for (let dc = -1; dc <= 1; dc++) {
        const ga = ca + da, gb = cb + db, gc = cc + dc;
        if (ga < 0 || gb < 0 || gc < 0 || ga >= G || gb >= G || gc >= G) continue;
        for (let j = H[ga + G * (gb + G * gc)]; j >= 0; j = NX[j]) {
          if (j === i) continue;
          const dx = X[j] - x, dy = Y[j] - y, dz = Z[j] - z, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > R2 || d2 < 1e-9) continue;
          n++; ax += VX[j]; ay += VY[j]; az += VZ[j]; px += X[j]; py += Y[j]; pz += Z[j];
          if (d2 < FLK_SEP2) {                                       // too close: a soft shove, proportional to the overlap
            const d = Math.sqrt(d2), w = (1 - d / FLK_SEP) * FLK_SEPK / d;
            sx -= dx * w; sy -= dy * w; sz -= dz * w;
          }
          if (d2 < FLK_PR2) {                                        // and the mid-range shove, in the plane only: it
            const d = Math.sqrt(d2), w = (1 - d / FLK_PR) * PR_K / d; // cancels inside the flock and pushes into a hole
            qrx -= dx * w; qrz -= dz * w;
          }
        }
      }
      // the startle: something fast this close startles a bird; otherwise it calms down — but a bird among startled
      // neighbours is startled too, so the fright runs through the flock the way a manoeuvre wave does
      let dh2 = 1e9;
      if (hk) { const a = x - hk[0], c = z - hk[2]; dh2 = Math.min(dh2, a * a + c * c); }   // seen from above
      let pa = P[i] * Math.exp(-dt / FLK_PTAU);
      if (dh2 < HAWK_PANIC * HAWK_PANIC) pa = 1;
      // …and it is the neighbours moving fast *relative to the flock* that startles a bird (a manoeuvre), not the
      // whole flock drifting: otherwise a flock that is simply flying along keeps itself frightened for ever
      else if (n && Math.hypot(ax / n - mvx, ay / n - mvy, az / n - mvz) > FLK_PSPEED) pa = Math.max(pa, 0.9);
      P[i] = pa;
      // a startled flock turns — and it turns *harder on the outside*: the shear is what winds the hole the intruder
      // made into a spiral and mixes it away. A rigid turn just carries the hole round with the flock.
      const nu = Math.min(1, n / FLK_LCALM);                // 1 = properly in the flock, 0 = on its own at a hole
      const WAe = WA * (1 + 1.5 * pa), OMp = OM * pa * pa;
      // cohesion drops away for a bird that has lost its neighbours: at the edge of the cut it is the *separation*
      // that then wins, and it pushes that bird into the hole — the hole fills from its edges inwards. (Pulling lonely
      // birds towards the neighbours they have left does the opposite: it tightens the flank and widens the hole.)
      const WCe = WC * nu * nu;
      let fx = 0, fy = 0, fz = 0;
      if (n) {
        fx += (ax / n - vx) * WAe + (px / n - x) * WCe; fy += (ay / n - vy) * WAe + (py / n - y) * WCe; fz += (az / n - vz) * WAe + (pz / n - z) * WCe;
      }
      // a bird with no neighbours at all (it is in the middle of a hole) looks further out — FLK_R2 — for the flock
      // and steers to what it finds. The pressure does the bulk of the filling; this is what stops the middle of a
      // hole from staying empty while the edges close in.
      if (n < 6) {
        let qx = 0, qz = 0, qn = 0;
        for (let da = -4; da <= 4; da++) for (let dc = -4; dc <= 4; dc++) {
          const ga = ca + da, gc = cc + dc;
          if (ga < 0 || gc < 0 || ga >= G || gc >= G) continue;
          for (let j = H[ga + G * (cb + G * gc)]; j >= 0; j = NX[j]) {
            if (j === i) continue;
            const ex = X[j] - x, ez = Z[j] - z;
            if (ex * ex + ez * ez < FLK_R22) { qx += X[j]; qz += Z[j]; qn++; }
          }
        }
        if (qn) { fx += (qx / qn - x) * WC * 1.6; fz += (qz / qn - z) * WC * 1.6; }
      }
      fx += sx + qrx; fy += sy; fz += sz + qrz;
      // the shape of the flock: a soft wall at R0 holds the edge, and *inside* it a weak pull towards the middle.
      // (A preferred *distance* from the centre — pushing out when closer than R0 — makes a doughnut instead: nothing
      // fills the hole back in, because cohesion only reaches FLK_R.)
      const dx = x - cx, dy = y - cy, dz = z - cz, dl = Math.hypot(dx, dz) || 1;
      if (dl > R0) { const sh = (dl - R0) * KS; fx -= dx / dl * sh; fz -= dz / dl * sh; }
      else { const g = dl * KG; fx -= dx / dl * g; fz -= dz / dl * g; }
      fy -= dy * KY;
      // a startled flock turns — and harder on the outside: that shear is what carries birds round and into the hole
      // the intruder made, and it is why the ring around the hole is denser than the flock itself
      const OMe = OMp * (0.45 + dl / R0);
      fz += (mvz - dx * OMe - vz) * KSW * pa;
      fx += (mvx + dz * OMe - vx) * KSW * pa;
                  fx -= cx * HA; fy -= (cy - 0.15) * HA; fz -= cz * HA;               // anchor: the flock stays where the camera is
      const bl = Math.hypot(x, y, z) - 4.2;                               // and inside the frame
      if (bl > 0) { fx -= x / (bl + 4.2) * bl * 6; fy -= y / (bl + 4.2) * bl * 6; fz -= z / (bl + 4.2) * bl * 6; }
      fx += (SIM.xs(R, i) - 0.5) * 0.3; fy += (SIM.xs(R, i) - 0.5) * 0.3; fz += (SIM.xs(R, i) - 0.5) * 0.3;
      fx -= vx * DRAG; fy -= vy * DRAG; fz -= vz * DRAG;          // air: speed follows force instead of hitting the cap
      const al = Math.hypot(fx, fy, fz);
      if (al > KMAX) { const k = KMAX / al; fx *= k; fy *= k; fz *= k; }
      // the intruder's bubble is applied *after* the cap: the birds around it are pressed in by the separation of the
      // ring (that is the same pressure that closes the hole behind it), so a capped push just loses to it
      if (hk) {
        // the bubble is a *disc*, seen from above: pushing along the 3-D distance threw birds down out of the sheet
        // (they fell away and the hole they left could never be filled — the sheet simply lost the material), and a
        // falcon over a flock shoves it sideways, not downwards
        const hx = x - hk[0], hz = z - hk[2], hl = Math.hypot(hx, hz) || 1;
        const down = clamp(1 - (hk[1] - 0.15) / 1.1, 0, 1);              // how far down at the sheet it is
        if (hl < HAWK_S && down > 0) { const k = (HAWK_S - hl) * HAWK_K * down; fx += hx / hl * k; fz += hz / hl * k; }
      }
      let nvx = vx + fx * dt, nvy = vy + fy * dt, nvz = vz + fz * dt;
      const sp = Math.hypot(nvx, nvy, nvz) || 1;
      // the floor on speed is scaled by the radius: a bird in the middle of a flock that turns as a body is nearly
      // standing still. A flat floor put a 0.9 u/s kick on it and blew the middle of the flock out.
      const vr = 0.12 + 0.88 * pa;                                        // calm birds fly slowly, startled ones fast
      const vmin = FLK_VMIN * vr * Math.min(1, 0.30 + dl);
      // a bird that has lost the flock is allowed to fly harder: the calm flock's speed cap is what would otherwise
      // make it crawl back into the lane at 0.3 u/s (a 1 u lane then takes seconds to close)
      // a bird that has lost the flock may fly harder: the calm cap (about 0.26 u/s) is far too slow for the birds at
      // the edge of a hole to walk back in, and the pressure alone would take seconds
      const vmax = FLK_VMAX * vr * (1 + 2.4 * (1 - nu));
      if (sp > vmax) { const k = vmax / sp; nvx *= k; nvy *= k; nvz *= k; }
      else if (sp < vmin) { const k = vmin / sp; nvx *= k; nvy *= k; nvz *= k; }
      VX[i] = nvx; VY[i] = nvy; VZ[i] = nvz; spd += nvx * nvx + nvy * nvy + nvz * nvz;
      X[i] = x + nvx * dt; Y[i] = y + nvy * dt; Z[i] = z + nvz * dt;
    }
    s.sp = spd / N;
  },
  render(g, f) {
    const t = f.t, lt = f.lt, s = this.sim.at(t, f.from), N = FLK_N, P = this.pts, S = this.streaks, HZ = this.haze;
    for (let i = 0; i < N; i++) { P[i * 3] = s.x[i]; P[i * 3 + 1] = s.y[i]; P[i * 3 + 2] = s.z[i]; }
    P.__v = (P.__v || 0) + 1;
    let m = 0;                                                            // a few birds leave a streak: the flow, drawn
    for (let i = 0; i < N; i += 4) {
      const q = m * 8, k = 0.11;
      S[q] = s.x[i] - s.vx[i] * k; S[q + 1] = s.y[i] - s.vy[i] * k; S[q + 2] = s.z[i] - s.vz[i] * k;
      S[q + 3] = s.x[i]; S[q + 4] = s.y[i]; S[q + 5] = s.z[i]; S[q + 6] = 0.55; S[q + 7] = 2; m++;
    }
    S.__v = (S.__v || 0) + 1;
    // the flock also has a body: every fifth bird drawn soft and wide, under the sharp dots. It is what the eye reads
    // as "a flock" rather than dust, and it is what moves in the picture — a cloud of 2 px dots is noise at 1/8 scale,
    // so nothing can be matched frame to frame and the shot reads as rushing even while the flock hangs.
    let h = 0;
    for (let i = 0; i < N; i += 5) { HZ[h * 3] = s.x[i]; HZ[h * 3 + 1] = s.y[i]; HZ[h * 3 + 2] = s.z[i]; h++; }
    HZ.__v = (HZ.__v || 0) + 1;
    const ev = te => ease.inOutCubic(clamp((lt - te) / 0.7));             // the camera holds still while things happen
    // the cut lands: the camera takes it — a fast dolly in as the slash goes through, then a slow release. This is
    // the one moment of the shot that changes the whole frame at once (everything else is the flock churning).
    const punch = prog(lt, 2.26, 2.44) * (1 - prog(lt, 2.75, 3.60));
    const cam = lmOrbit({ yaw: -0.55 + 0.22 * (ev(1.3) + ev(3.0)) + 0.01 * lt, pitch: 0.34 + 0.12 * ev(3.0) - 0.05 * punch, dist: 7.2 - 0.5 * ev(1.3) - 0.7 * ev(3.0) - 0.9 * punch, fov: 42, roll: 0.02 * Math.sin(lt * 0.5), shift: [110, 10] });
    const hk = this.hawk(lt);
    const beat = Math.exp(-f.beatPhase * 6), bar = Math.exp(-f.barPhase * 3.2);
    lmBegin('rose');
    lmAmbient(lmGlow(), f, { gain: 0.55, n: 3, colors: ['accent', 'fg'], seed: 9, speed: 0.12 });
    lmLines(cam, S, { width: 1.0, gain: 0.16, color: 'accent', glow: 0.25, dof: 6, focus: 2.6 });
    lmPoints(cam, HZ, { size: 9.5, gain: 0.085, color: 'fg', dof: 5, focus: 2.6, t });
    lmPoints(cam, P, { size: 2.3, gain: 0.46 + 0.10 * bar, color: 'fg', dof: 5, focus: 2.6, t });
    if (hk) {
      const fade = Math.min(1, (lt - 1.05) * 3) * (1 - prog(lt, 3.6, 4.4));
      const tr = []; for (let k = 0; k < 22; k++) { const q = this.hawk(lt - k * 0.022); if (q) tr.push(q); }
      if (tr.length > 1) lmLines(cam, LG.seg(tr), { width: 1.9, gain: 0.5 * fade, color: 'accent', glow: 0.5 });
      lmPoints(cam, this.hawkCloud, { size: 2.4, gain: 0.85 * fade, color: 'hot', model: { pos: hk } });
      lmLines(cam, this.hawkRing, { width: 1.3, gain: 0.6 * fade, color: 'warn', glow: 0.4, model: { pos: hk, rot: [lt * 2.1, lt * 1.5, 0] } });
    }
    lmEnd(g, { bloom: 1.05 });
    const onHawk = hk && lt > 1.5 && lt < 2.35;
    const p = cam.project(onHawk ? hk : [s.cx, s.cy, s.cz]);
    if (p) MV.focus(p[0], p[1], onHawk ? 'hawk' : 'flock');
    MV.decor(() => lmSection(g, 3, 3, '群体', 'MURMURATION'));
    lmHud(g, f, {
      id: 's3', name: 'flock', on: lmFlick(t, f.from, 0.4),
      rows: [['birds', lmFmt(N, { sep: ' ' })], ['neighbours', Math.round(this.avgN(s))], ['speed', Math.sqrt(s.sp).toFixed(2) + ' u/s'], ['step', this.sim.stepAt(t, f.from)]],
      foot: 'SIM.make · alignment · cohesion · separation · soft wall',
    });
    // the panel is everything the birds obey: the four rules, the wall and the anchor, the startle that sets the
    // speed, and the intruder's bubble — every rule the birds obey
    if (lt > 0.4) MV.decor(() => {
      g.save(); g.globalAlpha = Math.min(1, (lt - 0.4) * 2);
      lmCode(g, `for each bird:
  a = align(within ${FLK_R.toFixed(2)}) + cohere − separate + shove(within ${FLK_PR.toFixed(2)}) + wall(${FLK_R0.toFixed(2)})
  + anchor + turn ω(p) ; alone → look ${FLK_R2.toFixed(2)} ; startle p → speed ×${(0.12).toFixed(2)}…1
  intruder: a bubble ${HAWK_S.toFixed(2)} wide, seen from above — no wake`, 112, 292, { size: 19 });
      g.restore();
    });
    lmTerminal(g, f);
    return { flash: 0.10 * Math.exp(-Math.abs(lt - 2.05) * 7) };      // the intruder hits the flock
  },
  /** Mean number of birds a bird can see (for the HUD): sampled, so it stays cheap. */
  avgN(s) {
    let n = 0, tot = 0, cnt = 0;
    for (let i = 0; i < FLK_N; i += 97) {
      let c = 0;
      for (let j = 0; j < FLK_N; j += 7) {
        const dx = s.x[j] - s.x[i], dy = s.y[j] - s.y[i], dz = s.z[j] - s.z[i];
        if (dx * dx + dy * dy + dz * dz < FLK_R * FLK_R && j !== i) c++;
      }
      tot += c * 7; cnt++;
    }
    return tot / Math.max(1, cnt);
  },
});
