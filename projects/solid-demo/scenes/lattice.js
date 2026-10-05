// lattice — ice palette. A raymarched megastructure (smShader): an endless lattice of box frames, some cells holding
// a smaller frame or a lit panel. It starts dark and powers on cell by cell from the camera outwards; then the camera
// surges down the corridor one room per beat (fast, then a stop), a pulse of light running ahead of it on every bar.
// The shader writes depth, so the lumen probe (a wire cube with a hot core) and the dust slip behind the frames.
const LAT_SRC = `
uniform float uPow, uPulse, uPulseZ;
uniform vec4 uQuiet;                                       // a soft dark zone behind the lyrics (px: x0, y0, x1, y1)
const float C = 2.0;                                       // cell size
float cellH(vec3 c, float k) { return hash13(c * 1.37 + k); }
// distance to the structure; kind: 0 big frame, 1 inner frame, 2 panel. Some cells are empty (dark space); the corridor
// (cells x = y = 0) never is. The step is also capped at the cell wall (+ a margin), so a neighbour's frame lying close
// to the shared face is never jumped over: the field stays a safe bound for sphere tracing.
float mapK(vec3 p, out float kind, out vec3 cid) {
  vec3 c = smCell(p, vec3(C)), q = smRep(p, vec3(C)), aq = abs(q);
  cid = c; kind = 0.;
  float wall = C * .5 - max(aq.x, max(aq.y, aq.z)) + .02;
  bool corridor = abs(c.x) + abs(c.y) < .5;
  float d = 1e3;
  if (corridor || cellH(c, 11.) > .38) d = sdBoxFrame(q, vec3(.97), .0045);
  float h = cellH(c, 1.);
  if (!corridor && h > .6) {                               // an inner frame, off-centre
    vec3 o = (vec3(cellH(c, 2.), cellH(c, 3.), cellH(c, 4.)) - .5) * .7;
    float d2 = sdBoxFrame(q - o, vec3(.14 + .3 * cellH(c, 5.)), .0035);
    if (d2 < d) { d = d2; kind = 1.; }
  }
  if (!corridor && h < .035) {                             // a lit panel on one face
    float d3 = sdBox(q - vec3(0., 0., -.92), vec3(.36, .2, .003));
    if (d3 < d) { d = d3; kind = 2.; }
  }
  return min(d, max(wall, .004));
}
float lit(vec3 c) {                                         // cells switch on in order of distance, with a flicker
  float k = uPow * uPow * 40. - length(c * vec3(1., 1., .5)) - cellH(c, 9.) * 4.;
  return clamp(k, 0., 1.) * (k < 1. ? step(.45, fract(sin(dot(c, vec3(12.9, 78.2, 37.7)) + floor(uTime * 30.)) * 43758.5)) : 1.);
}
vec4 shade(vec2 px) {
  vec3 ro, rd; smRay(px, ro, rd);
  float t = .02, glow = 0., kind = 0.; vec3 cid = vec3(0.), p = ro; bool hit = false;
  for (int i = 0; i < 120; i++) {
    p = ro + rd * t;
    float d = mapK(p, kind, cid);
    glow += exp(-d * 160.) * .0045 * exp(-t * .08) * (.03 + lit(cid));
    if (d < .00035 * t + .0002) { hit = true; break; }
    t += d * .95;
    if (t > 48.) break;
  }
  float pulse = uPulse * exp(-abs(p.z - uPulseZ) * 1.2);
  vec3 col = uAccent * glow * (1. + 3. * pulse);
  if (hit) {
    float on = lit(cid), fog = exp(-t * .085);
    vec3 base = kind > 1.5 ? uFg * .55 : kind > .5 ? uAccent * 1.1 : mix(uAccent, uFg, .3) * .75;
    col += base * fog * (.07 + on) * (1. + 2.5 * pulse) + uHot * pulse * fog * .4 * on;
    smHit(p);
  }
  vec2 qd = max(max(uQuiet.xy - px, px - uQuiet.zw), 0.);
  col *= mix(.1, 1., smoothstep(0., 150., length(qd)));     // the structure steps back where the words are
  return vec4(col, 1.);
}`;

MV.scene('lattice', {
  init() {
    this.probe = LG.wirebox([0.16, 0.16, 0.16]);
    this.probeCore = LG.gauss(400, 0.02, { seed: 31 });
    // dust in the corridor, fixed in the world (so it streams past), kept off the camera's own path
    const r = mulberry32(32), D = [];
    while (D.length < 4500 * 3) { const x = (r() - 0.5) * 1.8, y = (r() - 0.5) * 1.8; if (Math.abs(x - 0.12) < 0.3 && Math.abs(y + 0.08) < 0.3) continue; D.push(x, y, 1 - r() * 34); }
    this.dust = new Float32Array(D);
  },
  camZ(f) {                                                  // a slow creep while it powers on, then one room per beat:
    const bt = 60 / (f.audio.bpm || 120), lt = f.lt, s0 = 1.05;  // a fast surge (0.22 s), then a dead stop (from the 2nd "room")
    if (lt < s0) return -0.4 * ease.inOutCubic(lt / s0);
    const u = (lt - s0) / bt, nb = Math.floor(u), ph = u - nb;
    return -0.4 - (nb + ease.inOutCubic(Math.min(1, ph / 0.44))) * 1.0;
  },
  render(g, f) {
    const t = f.t, lt = f.lt, z = this.camZ(f);
    const sway = Math.sin(-z * 0.55) * 0.08;                     // sway and roll follow the travel: still when it stops
    const cam = lmCamera({ eye: [0.12 + sway, -0.08, z], target: [0.3 * Math.sin(-z * 0.3), 0.05, z - 6], fov: 62, roll: 0.06 * Math.sin(-z * 0.4), near: 0.02 });
    const bt = 60 / (f.audio.bpm || 120), barPh = (f.barPhase ?? 0);
    const pulse = lt > 1.05 ? Math.exp(-barPh * 4 * bt * 2.2) : 0, pulseZ = z - 1 - barPh * 4 * bt * 14;
    lmBegin('ice');
    smShader('lattice', LAT_SRC, { cam, t, depth: true, u: { uPow: prog(lt, 0.25, 1.9), uPulse: pulse, uPulseZ: pulseZ, uQuiet: [70, 790, 940, 965] } });
    const pz = z - 1.6 - 0.25 * Math.sin(-z * 0.9), pm = { pos: [0.32 + 0.12 * Math.sin(-z * 0.7), -0.22 + 0.08 * Math.sin(-z * 1.1), pz], rot: [lt * 0.5, -z * 0.8, 0] };
    const on = prog(lt, 0.5, 0.9);
    lmLines(cam, this.probe, { width: 1.4, gain: 1.1 * on, color: 'fg', glow: 0.3, model: pm, occlude: true });
    lmPoints(cam, this.probeCore, { size: 1.5, gain: 0.3 * on, color: 'hot', model: { pos: pm.pos }, occlude: true });
    lmPoints(cam, this.dust, { size: 1.2, gain: 0.45, color: 'accent', dof: 6, focus: 2, occlude: true });
    lmEnd(g, { bloom: 0.95 });
    const pp = cam.project(pm.pos);
    if (lt < 0.6) MV.focus(W * 0.62, H * 0.45, 'lattice');
    else if (pp) MV.focus(pp[0], pp[1], 'probe');
    lmHud(g, f, {
      id: 's2', name: 'lattice', on: lmFlick(t, f.from, 0.4),
      rows: [['cells lit', lmFmt(Math.round(Math.pow(prog(lt, 0.25, 1.9), 4) * 39304), { sep: ' ' })], ['depth', `${(-z).toFixed(2)} u`], ['march', '110 steps'], ['pass', 'smShader · depth']],
      foot: 'raymarch · sdBoxFrame × domain repetition',
    });
    lmTerminal(g, f);
  },
});
