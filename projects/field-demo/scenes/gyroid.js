// gyroid — ice palette. A raymarched gyroid: the minimal surface sin x·cos y + sin y·cos z + sin z·cos x = 0, thickened
// into a solid sheet and cut to a hollow ball (smShader, in the same light as everything else, writing depth). It grows
// out of the dark on the first bar; on the second the camera plunges through the shell and travels in the hollow inside
// it — one pocket per beat, fast then a dead stop — while the maze turns slowly around the lens, so the corridors never
// end; on the third it climbs back out and the whole of it is one surface with no edge. A sample and some dust ride the
// tunnels and hide behind the walls, because the shader wrote their depth.
const GYR_S = 3.7;                          // spatial frequency (period 2π/s ≈ 1.70 u)
const GYR_R = 4.4, GYR_RI = 2.6;            // outer radius of the shell, and the hollow inside it
const GYR_SRC = `
uniform float uS, uTh, uR, uRi, uPow, uPulse, uRa, uRb, uIn;
uniform vec3 uDoorA, uDoorB;                           // the way in and the way out, fixed where the lens crossed
uniform float uDoorAR, uDoorBR;

float gyr(vec3 p) {
  vec3 q = p;
  q.xz = rot2(uRa) * q.xz;                             // the maze turns around the lens
  q.yz = rot2(uRb) * q.yz;
  q *= uS;
  return dot(sin(q), cos(q.zxy)) / uS;
}
/** The material: a sheet of half-thickness uTh between two spheres (hollow, so the lens can travel inside). */
float mapG(vec3 p) {
  float r = length(p);
  float d = max(abs(gyr(p)) - uTh, max(r - uR, uRi - r));
  d = max(d, uDoorAR - length(p - uDoorA));            // subtract: the surface opens where the lens goes through
  d = max(d, uDoorBR - length(p - uDoorB));            // …and again where it comes back out, then both heal over
  return d;
}
vec3 gyrN(vec3 p) {
  vec2 e = vec2(0.005, 0.);
  return normalize(vec3(mapG(p + e.xyy) - mapG(p - e.xyy), mapG(p + e.yxy) - mapG(p - e.yxy), mapG(p + e.yyx) - mapG(p - e.yyx)));
}
vec4 shade(vec2 px) {
  vec3 ro, rd; smRay(px, ro, rd);
  float t = 0.02, glow = 0., hit = -1.;
  vec3 p = ro;
  for (int i = 0; i < 150; i++) {
    p = ro + rd * t;
    float d = mapG(p);
    float on = clamp(uPow * 2.2 - t * 0.045, 0., 1.);  // it materialises from the lens outwards
    glow += exp(-abs(d) * 55.) * 0.011 * exp(-t * 0.13) * on;
    if (d < 0.0012 * t + 0.0007) { hit = t; break; }
    t += max(d * 0.62, 0.0016);
    if (t > 26.) break;
  }
  // inside the ball the walls are close and fill the frame: the shape has to come from edge light and highlights, not
  // from a lit face. uIn damps the flat surfaces and the bar pulse out there, and leaves the rim alone.
  float dim = mix(1., 0.34, uIn), rimK = mix(1., 0.85, uIn);
  float pulse = uPulse * exp(-length(p) * 0.55) * mix(1., 0.35, uIn);
  vec3 col = uAccent * glow * (1. + 3.5 * pulse) * mix(1., 0.40, uIn);
  if (hit > 0.) {
    vec3 n = gyrN(p), v = -rd;
    float fog = exp(-t * 0.075), on = clamp(uPow * 2.2 - t * 0.045, 0., 1.);
    float near = smoothstep(0.04, 0.65, t);            // right at the lens everything goes dark: no white-out
    float dif = .5 + .5 * dot(n, normalize(vec3(.42, .78, .46)));
    float rim = pow(1. - abs(dot(n, v)), 2.6);
    float side = step(0., gyr(p));                     // the two labyrinths either side of the sheet
    vec3 base = mix(uAccent * .85, uFg * .75, side) * (.10 + .55 * dif);
    col += (base * dim + uHot * rim * (.45 + .5 * pulse) * rimK) * fog * on * near * (1. + 2.6 * pulse);
    if (on > 0.05 && near > 0.1) smHit(p);
  }
  return vec4(col, 1.);
}`;

MV.scene('gyroid', {
  init() {
    this.sample = LG.gauss(420, 0.022, { seed: 51 });
    this.ring = LG.ring(900, { r: 0.085, width: 0.012, thick: 0.004, seed: 52 });
    const r = mulberry32(53), D = [];
    while (D.length < 3600 * 3) { const x = (r() - 0.5) * 9, y = (r() - 0.5) * 7, z = (r() - 0.5) * 9; if (x * x + y * y + z * z > 30) continue; D.push(x, y, z); }
    this.dust = new Float32Array(D);
    // where the way in and the way out punch through the shell: the first and last time the path is at mid-shell.
    const mid = (GYR_R + GYR_RI) * 0.5;
    let uIn = null, uOut = null;
    for (let i = 0; i <= 600; i++) {
      const u = i / 600, p = this.path(u);
      if (Math.hypot(p[0], p[1], p[2]) < mid) { if (uIn == null) uIn = u; uOut = u; }
    }
    this.doorA = this.path(uIn); this.doorB = this.path(uOut);
  },
  /** How far along the way the lens is: a slow drift, a plunge, then a surge and a dead stop per beat (the stops
   *  hold u almost still: inside a maze even a hundredth of a unit moves every wall in the frame), then the climb out. */
  UK: [[0, 0], [1.45, 0.20, ease.inOutCubic], [2.05, 0.400, ease.inCubic], [2.60, 0.404, ease.outCubic],
       [3.10, 0.560, ease.inOutCubic], [3.60, 0.564, ease.outCubic],
       [4.15, 0.750, ease.inOutCubic], [4.55, 0.754, ease.outCubic],
       [5.30, 0.960, ease.inOutCubic], [6.0, 1.0]],
  path(u) {
    const rr = keys(u, [[0, 11.6], [0.20, 10.2, ease.inOutCubic], [0.40, 3.8, ease.inCubic], [0.47, 1.45, ease.outCubic], [0.72, 1.35, ease.linear],
                        [0.84, 3.4, ease.inOutCubic], [0.92, 8.6, ease.outCubic], [1, 11.2]]);
    const a = 1.15 + 3.4 * u, y = 0.75 * Math.sin(2.3 * u + 1.0) + 0.5 * u;
    return [Math.cos(a) * rr, y, Math.sin(a) * rr];
  },
  render(g, f) {
    const t = f.t, lt = f.lt;
    const u = keys(lt, this.UK);
    const eye = this.path(u), look = this.path(Math.min(1, u + 0.04)), roll = 0.05 * Math.sin(u * 6.1);
    const inside = smoothstep(0.30, 0.40, u) * (1 - smoothstep(0.80, 0.90, u));       // outside: look at the ball
    const target = [look[0] * inside, look[1] * inside, look[2] * inside];
    const fov = keys(u, [[0, 42], [0.36, 46, ease.inOutCubic], [0.47, 68, ease.outCubic], [0.74, 68, ease.linear], [0.86, 52, ease.inOutCubic], [1, 41]]);
    const cam = lmCamera({ eye, target, fov, roll, near: 0.02 });
    const grow = ease.outCubic(prog(lt, 0.10, 1.80)), pow_ = ease.outCubic(prog(lt, 0.10, 1.55));
    const bar = Math.exp(-f.barPhase * 3.4), beat = Math.exp(-f.beatPhase * 6);
    const s = this.samplePos(u);
    // the hole opens just before the lens reaches the shell and heals once it is through
    const doorAR = 1.30 * smoothstep(0.30, 0.40, u) * (1 - smoothstep(0.50, 0.60, u));
    const doorBR = 1.20 * smoothstep(0.70, 0.79, u) * (1 - smoothstep(0.90, 0.98, u));
    lmBegin('ice');
    smShader('gyroid', GYR_SRC, {
      cam, t, depth: true,
      u: { uS: GYR_S, uTh: 0.048, uR: GYR_R * grow, uRi: (0.15 + (GYR_RI - 0.15) * grow) * smoothstep(0.05, 0.5, inside),
           uPow: pow_, uPulse: bar, uRa: 2.2 * u, uRb: 1.1 * u,      // the maze turns with the travel: it stops when we stop
           uDoorA: this.doorA, uDoorB: this.doorB, uDoorAR: doorAR, uDoorBR: doorBR, uIn: inside },
    });
    lmLines(cam, this.ring, { width: 1.3, gain: 0.5, color: 'fg', glow: 0.3, model: { pos: s, rot: [lt * 1.2, lt * 0.8, 0] }, occlude: true });
    lmPoints(cam, this.sample, { size: 1.3, gain: 0.42, color: 'hot', model: { pos: s }, occlude: true });
    lmPoints(cam, this.sample, { size: 2.6, gain: 0.03, color: 'accent', model: { pos: s } });        // its glow bleeds through
    lmPoints(cam, this.dust, { size: 1.2, gain: 0.42, color: 'accent', dof: 7, focus: 1.6, occlude: true });
    lmEnd(g, { bloom: 0.95 });
    const name = lt < 2.45 ? 'ball' : lt < 4.25 ? 'probe' : 'ball';
    // on the way in and out the ball's centre is behind the lens or below the frame: the eye then rides the sample
    const ok = q => q && q[0] > 60 && q[0] < W - 60 && q[1] > 60 && q[1] < H - 60;
    let p = cam.project(name === 'probe' ? s : [0, 0, 0]);
    if (!ok(p)) p = cam.project(s);
    if (!ok(p)) p = cam.project(look);
    if (p) MV.focus(p[0], p[1], name);
    MV.decor(() => lmSection(g, 2, 3, '曲面', 'MINIMAL SURFACE'));
    lmHud(g, f, {
      id: 's2', name: 'gyroid', on: lmFlick(t, f.from, 0.4),
      rows: [['surface', 'gyroid'], ['period', (2 * Math.PI / GYR_S).toFixed(2) + ' u'], ['march', '150 steps'], ['r', Math.hypot(eye[0], eye[1], eye[2]).toFixed(2) + ' u']],
      foot: 'smShader · |g(p)| − t < 0 ∩ shell · depth',
    });
    if (lt > 0.4) MV.decor(() => { g.save(); g.globalAlpha = Math.min(1, (lt - 0.4) * 2); lmCode(g, `g(p) = sin x·cos y + sin y·cos z + sin z·cos x\n|g(p·s)| − t = 0   ∩   ri < |p| < r`, 112, 300, { size: 19 }); g.restore(); });
    lmTerminal(g, f);
    // a tear right as the lens punches through the shell: after the word qa is still looking at (its last check is
    // 0.3 s after the word starts) and before the first stop, which has to read as a stop
    return { glitch: 0.30 * Math.exp(-Math.abs(lt - 2.02) * 22) };
  },
  /** Where the sample rides: a little ahead of the lens, and always inside the hollow. */
  samplePos(u) {
    const p = this.path(Math.min(1, u + 0.045)), q = this.path(Math.min(1, u + 0.09));
    let s = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + 0.05, (p[2] + q[2]) / 2];
    const l = Math.hypot(s[0], s[1], s[2]) || 1, k = Math.min(1, (GYR_RI - 0.4) / l);
    if (u > 0.40 && u < 0.88) s = [s[0] * k, s[1] * k, s[2] * k];
    return s;
  },
});
