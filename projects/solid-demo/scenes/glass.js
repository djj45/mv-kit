// glass — rose palette. A glass heart (Taubin's heart surface, built with SG.implicit) beats on the beat in front of a
// wall of light points; the wall bends through the glass, red and blue splitting at the edges. On "inside" a nucleus
// ignites in it; a ring of particles orbits through the glass — the half behind is refracted, the half in front sharp.
// Contour bands climb the surface like a height plot. Terminal lyrics bottom left, the heart right of centre.
MV.scene('glass', {
  init() {
    // (x² + 9/4 z² + y² − 1)³ − x² y³ − 9/80 z² y³ = 0, with y up (Taubin 1994). That is A³ − B³ = 0 with
    // A = x² + 9/4 z² + y² − 1, B = y·∛(x² + 9/80 z²), and A³ − B³ = (A − B)(A² + AB + B²), so the same surface is A − B = 0.
    // Mesh that: the cubic form has a vanishing gradient round the waist (y = 0), i.e. no usable normal there.
    const heart = (x, y, z) => x * x + 2.25 * z * z + y * y - 1 - y * Math.cbrt(x * x + 0.1125 * z * z);
    this.heart = SG.implicit(heart, [-1.3, -1.12, -0.85], [1.3, 1.32, 0.85], 132);
    // the wall behind: a grid of points, brighter towards the middle, at z = −3
    const nx = 132, ny = 74, sp = 0.115, wall = new Float32Array(nx * ny * 3), wc = new Float32Array(nx * ny * 3), fg = lmPal('rose').fg;
    const base = [parseInt(fg.slice(1, 3), 16) / 255, parseInt(fg.slice(3, 5), 16) / 255, parseInt(fg.slice(5, 7), 16) / 255];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3, x = (i - (nx - 1) / 2) * sp, y = (j - (ny - 1) / 2) * sp + 0.2;
      wall[k] = x; wall[k + 1] = y; wall[k + 2] = -3;
      const b = 0.25 + 0.75 * Math.exp(-(x * x + y * y) / 9);
      wc[k] = base[0] * b; wc[k + 1] = base[1] * b; wc[k + 2] = base[2] * b;
    }
    this.wall = wall; this.wallCol = wc;
    this.floor = LG.grid(36, 36, { y: -1.45 });
    // bars of light behind the heart: straight lines are what shows a lens bending
    const bars = []; for (let i = -3; i <= 2; i++) bars.push([[i * 0.62, -1.25, -2.4], [i * 0.62, 1.0, -2.4]]);
    this.bars = LG.pairs(bars);
    this.core = LG.gauss(5000, [0.1, 0.12, 0.08], { seed: 21, at: [0, 0.05, 0] });
    this.ring = LG.ring(16000, { r: 1.22, width: 0.06, thick: 0.008, seed: 22 });
    this.dust = LG.stars(2200, 16, { seed: 23 });
  },
  beat(f) {                                                 // lub-dub on every beat, a harder one on the bar
    const bt = 60 / (f.audio.bpm || 120), since = f.beatPhase * bt, bar = Math.floor(f.beat) % 4 === 0 ? 1.6 : 1;
    const p = u => (u < 0 ? 0 : Math.exp(-u * 13));
    return (p(since) + 0.55 * p(since - 0.19)) * (bar > 1 ? 2.2 : 0.6);
  },
  render(g, f) {
    const t = f.t, lt = f.lt;
    // still between events: the heart turns (with an overshoot) and the camera eases round on the bars (2 s, 4 s); a
    // camera that drifts all the time moves every one of the wall's ten thousand dots and nothing ever holds
    const turn = te => ease.outBack(clamp((lt - te) / 0.5)), ease2 = te => ease.inOutCubic(clamp((lt - te) / 0.6));
    const cam = lmOrbit({ yaw: 0.16 + 0.05 * (ease2(2) + ease2(4)), pitch: 0.1, dist: 5.4 - 0.12 * (ease2(2) + ease2(4)), fov: 34, shift: [270, -6] });
    const b = this.beat(f), s = 0.8 * (1 + 0.04 * b);
    const ign = ease.outCubic(prog(lt, 1.22, 1.6));                      // the nucleus lights on "inside" (1.25 s)
    const model = { rot: [0.05 - 0.08 * turn(4), -0.4 + 0.5 * turn(2) + 0.45 * turn(4), 0], scale: [s * (1 - 0.012 * b), s * (1 + 0.025 * b), s * (1 - 0.012 * b)] };
    const ringM = { rot: [1.15 + 0.05 * Math.sin(lt * 0.4), lt * 0.35, 0.32] };
    const shock = Math.exp(-Math.max(0, lt - 4) * 3.5) * (lt >= 4 ? 1 : 0);    // the hard beat on the bar: the glass flexes, colours split
    const pal = lmBegin('rose');
    lmPoints(cam, this.dust, { size: 1.0, gain: 0.35 });
    lmPoints(cam, this.wall, { size: 1.7, gain: 1.6 + 1.2 * shock, colors: this.wallCol, dof: 3 });
    lmLines(cam, this.bars, { width: 1.6, gain: 0.55, color: 'fg', glow: 0.3, dof: 3, upto: ease.inOutCubic(prog(lt, 0, 0.9)) });
    lmLines(cam, this.floor, { width: 1, gain: 0.12, glow: 0, fog: 7 });
    smGlass(cam, this.heart, {
      model, ior: 1.5, refract: 90 + 140 * shock, dispersion: 0.08 + 0.3 * shock, tint: 'accent', tintK: 0.25, glow: 0.12 + 0.2 * ign,
      rim: 0.5 + 0.3 * b + 1.2 * shock, rimPow: 3.5, spec: 1.6, shine: 140, env: 0.55,
      bands: { axis: [0, 1, 0], step: 0.075, width: 1, gain: 0.06 + 0.08 * ign },
    }, occ => {
      lmPoints(cam, this.core, { size: 1.2, gain: 0.32 * ign * (1 + 0.6 * b), color: 'hot', model: { scale: s }, occlude: occ });
      lmPoints(cam, this.ring, { size: 1.1, gain: 0.55, color: 'accent', model: ringM, count: 16000 * ease.inOutCubic(prog(lt, 0.2, 2.2)), occlude: occ });
    });
    lmEnd(g, { bloom: 1.05 });
    const c = cam.project([0, 0.05, 0]);
    MV.focus(c[0], c[1], lt < 1.2 ? 'heart' : lt < 2.6 ? 'core' : 'heart');
    lmHud(g, f, {
      id: 's1', name: 'glass', on: lmFlick(t, f.from, 0.4),
      rows: [['surface', 'Taubin heart'], ['triangles', lmFmt(this.heart.tris, { sep: ' ' })], ['ior', '1.50'], ['beat', b.toFixed(2)]],
      foot: `smGlass · ${SG.samples ? SG.samples + '× msaa' : 'no msaa'} · refraction + dispersion`,
    });
    const tip = cam.project(lmXf(model, [-0.62, 0.95, 0.35]));
    if (lt > 0.3 && tip) lmLabel(g, tip[0], tip[1], '(x² + 9/4·z² + y² − 1)³ − x²y³ − 9/80·z²y³ = 0', { dx: -170, dy: -110, draw: prog(lt, 0.3, 1.0), color: 'fg' });
    lmTerminal(g, f);
  },
});
