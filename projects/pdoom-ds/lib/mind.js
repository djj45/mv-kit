// mind.js — the film's recurring shapes. Every shot is built from these, which is why 48 shots read as one
// machine instead of 48 demos. Geometry only: each builder returns buffers you draw with dsLight(), so the same
// motif can be a hero in one shot and a background detail in the next.
//
//   MX.layers(7, 220)        the transformer stack
//   MX.cage(6)               the containment lattice
//   MX.rain(1200)            falling tokens / glyphs
//   MX.tokens(900, 64)       the token stream that everything is made of
//   MX.floor(28)             the endless grid
//   MX.eye(3.2)              the aperture: a ring iris that is also a pupil
//   MX.shoggoth(9000)        the thing under the pretraining
//   MX.tower(9)              GPU tower / datacentre rack
//   MX.core(1)               the point the whole film converges on
//   MX.graph(fn, n)          a trace in screen space, sample any function of u
'use strict';
const MX = {};

// ---------------------------------------------------------------- the transformer stack

// A stack of `n` layer planes, each a `m`-point square lattice. o.spread = distance between layers,
// o.size = half-width of a layer. Returns { wire, dots, planes } — planes is per-layer so a shot can light
// one layer at a time (the "forward pass" shot does exactly that).
MX.layers = function (n, m, o) {
  o = o || {};
  const size = o.size == null ? 1.6 : o.size, spread = o.spread == null ? 0.5 : o.spread;
  const side = Math.max(3, Math.round(Math.sqrt(m)));
  const wire = [], dots = [], planes = [];
  for (let l = 0; l < n; l++) {
    const y = (l - (n - 1) / 2) * spread;
    const pts = [];
    for (let i = 0; i < side; i++) for (let j = 0; j < side; j++) {
      const x = (i / (side - 1) - 0.5) * 2 * size, z = (j / (side - 1) - 0.5) * 2 * size;
      pts.push([x, y, z]);
    }
    const P = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; });
    planes.push(P);
    dots.push(P);
    // the layer's frame: a square in xz
    wire.push(LG.seg([[-size, y, -size], [size, y, -size], [size, y, size], [-size, y, size]], { closed: true, bright: 0.55 }));
  }
  return { wire: Array.isArray(wire) ? wire : [wire], dots, planes, n, spread, size };
};

// Draw a stack with a "signal" travelling up it: `k` 0..1 = how far the wave has reached.
// Returns the descriptors to hand to dsLight (points and lines mixed in one array).
MX.layersDraw = function (st, k, o) {
  o = o || {};
  const out = [], hot = o.live == null ? 0.14 : o.live;
  for (let l = 0; l < st.n; l++) {
    const u = st.n > 1 ? l / (st.n - 1) : 0;
    const fire = Math.max(0, 1 - Math.abs(u - k) / hot) * (o.fire == null ? 1 : o.fire);
    out.push({ P: st.planes[l], o: { size: (o.size || 1.5) * (1 + fire * 1.6), gain: (o.gain == null ? 0.4 : o.gain) * (0.55 + fire * 1.8), color: fire > 0.15 ? 'hot' : (o.color || 'accent'), dof: o.dof || 8, focus: o.focus } });
    out.push({ S: st.wire[l], o: { width: 1, gain: (o.wire == null ? 0.28 : o.wire) * (0.5 + fire), color: fire > 0.15 ? 'hot' : 'dim', glow: 0.2, fog: o.fog || 9 } });
  }
  return out;
};

// ---------------------------------------------------------------- containment

// The lattice: a wireframe sphere cage plus radial struts. This is what the film means by "safety fence".
MX.cage = function (r, o) {
  o = o || {};
  const rings = o.rings || 5, seg = o.seg || 72;
  const E = [];
  for (let i = 1; i < rings; i++) {
    const y = -r + 2 * r * (i / rings), rr = Math.sqrt(Math.max(0, r * r - y * y));
    const ring = LG.circle(rr, seg, 'xz').map(p => [p[0], y, p[2]]);
    E.push(LG.seg(ring, { closed: true, bright: 0.45 }));
  }
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU;
    E.push(LG.seg([[0, -r, 0], [Math.cos(a) * r * 0.98, 0, Math.sin(a) * r * 0.98], [0, r, 0]], { bright: 0.35 }));
  }
  return LG.join.apply(null, E);
};

// ---------------------------------------------------------------- token rain

// Falling glyphs: point clouds in vertical streams. Each stream is a `w`-point run; feed to lmLines or as points.
// Returns { S } — a segment buffer meant to be drawn with a scrolling model.
MX.rain = function (n, o) {
  o = o || {};
  const w = o.w == null ? 12 : o.w, spread = o.spread == null ? 7 : o.spread, h = o.h == null ? 9 : o.h;
  const rnd = mulberry32(o.seed || 41), list = [];
  const count = Math.max(1, Math.round(n / w));
  for (let i = 0; i < count; i++) {
    const x = (rnd() - 0.5) * spread, z = (rnd() - 0.5) * spread, y0 = rnd() * h * 2 - h;
    const seg = [];
    for (let j = 0; j < w; j++) seg.push([x, y0 - (j / w) * (o.len == null ? 0.9 : o.len), z]);
    list.push(LG.seg(seg, { bright: 0.5 + rnd() * 0.5 }));
  }
  return LG.join.apply(null, list);
};

// ---------------------------------------------------------------- token stream

// The token stream: a braided set of long polylines, the "everything is tokens" motif. o.len long, o.strands of them.
MX.tokens = function (n, o) {
  o = o || {};
  const strands = o.strands || 5, len = o.len == null ? 8 : o.len, rad = o.rad == null ? 1.1 : o.rad;
  const seg = Math.max(16, Math.round(n / strands)), list = [];
  for (let s = 0; s < strands; s++) {
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, a = u * TAU * (o.twist == null ? 1.4 : o.twist) + (s / strands) * TAU;
      const r = rad * (0.75 + 0.35 * Math.sin(u * TAU * 2 + s));
      pts.push([Math.cos(a) * r, (u - 0.5) * len, Math.sin(a) * r]);
    }
    list.push(LG.seg(pts, { bright: 0.6 }));
  }
  return LG.join.apply(null, list);
};

// ---------------------------------------------------------------- the floor

// The endless grid: 2D grid as a segment buffer + a sparse point cloud sitting on it (dust in the beam).
MX.floor = function (size, o) {
  o = o || {};
  const grid = LG.grid(o.n || 30, size, { y: o.y == null ? -2.2 : o.y });
  return { wire: grid, dust: LG.ball(o.dust || 900, size * 0.5, { seed: o.seed || 13 }) };
};

// ---------------------------------------------------------------- the aperture

// The eye that opens through the film: an iris ring (point cloud), a pupil of dense points, and a lid arc.
// Everything scales off r, so a shot can push in until it is the whole frame.
MX.eye = function (r, o) {
  o = o || {};
  const iris = LG.ring(o.n || 5200, { r: r * 0.72, width: r * 0.42, thick: r * 0.04, seed: 61 });
  const pupil = LG.disk(o.pupil || 2600, r * 0.3);
  const rot = { rot: [Math.PI / 2, 0, 0] };
  const irisP = dsXf(iris, rot), pupilP = dsXf(pupil, rot);
  const lid = [];
  for (let k = 0; k < (o.lids || 14); k++) {
    const a = (k / (o.lids || 14)) * TAU, r0 = r * 1.06, r1 = r * (1.28 + hash(k, 5) * 0.5);
    lid.push([[Math.cos(a) * r0, Math.sin(a) * r0, 0], [Math.cos(a) * r1, Math.sin(a) * r1, 0]]);
  }
  return { iris: irisP, pupil: pupilP, lid: LG.pairs(lid, { bright: 0.4 }), r };
};

// ---------------------------------------------------------------- the thing under the pretraining

// The shoggoth: a big noisy blob built from gaussian shells at several radii, so it never reads as a sphere.
// o.tint uses per-point colours, warm in the core and cold at the edge (used once, in the shoggoth shot).
MX.shoggoth = function (n, r, o) {
  o = o || {};
  const shell = (cnt, rad, jit, seed) => {
    const P = LG.sphere(cnt, rad, { jitter: jit, seed });
    const rnd = mulberry32(seed + 7);
    for (let i = 0; i < P.length; i += 3) {
      const k = 1 + 0.22 * fbm1(P[i] * 1.6 + P[i + 1] * 1.3, seed) + 0.12 * fbm1(P[i + 2] * 2.1, seed + 3);
      P[i] *= k; P[i + 1] *= k; P[i + 2] *= k;
    }
    return P;
  };
  const a = shell(Math.round(n * 0.5), r * 0.62, 0.14, o.seed || 71);
  const b = shell(Math.round(n * 0.3), r * 0.86, 0.2, (o.seed || 71) + 11);
  const c = shell(Math.round(n * 0.2), r * 1.06, 0.26, (o.seed || 71) + 23);
  const P = LG.join(a, b, c);
  const colors = o.tint ? MX.tintByRadius(P, r) : null;
  return { P, colors };
};

// Per-point colour ramp: bright/warm where the point is close to the middle, cold at the rim.
MX.tintByRadius = function (P, r) {
  const n = P.length / 3, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) / r, k = clamp(d);
    col[i * 3] = lerp(1.0, 0.34, k); col[i * 3 + 1] = lerp(0.82, 0.62, k); col[i * 3 + 2] = lerp(0.55, 1.0, k);
  }
  return col;
};

// ---------------------------------------------------------------- the compute

// The GPU tower: `n` stacked wire boxes with a point cloud inside each, so a shot can light one at a time.
MX.tower = function (n, o) {
  o = o || {};
  const w = o.w == null ? 2.2 : o.w, h = o.h == null ? 0.34 : o.h, gap = o.gap == null ? 0.06 : o.gap;
  const units = [];
  for (let i = 0; i < n; i++) {
    const y = (i - (n - 1) / 2) * (h + gap);
    units.push({
      wire: LG.wirebox([w, h, w], { at: [0, y, 0] }),
      dots: LG.box(Math.round((o.dots || 240)), [w * 0.92, h * 0.7, w * 0.92], { seed: 100 + i, surface: true }).map((v, k) => v + (k % 3 === 1 ? y : 0)),
      y,
    });
  }
  return { units, n, w, h };
};

// ---------------------------------------------------------------- the core

// The point everything converges on: a dense nucleus, a halo, and a lens flare we draw as radial segments.
MX.core = function (r, o) {
  o = o || {};
  const nucleus = LG.gauss(o.n || 4200, r * 0.16, { seed: 91 });
  const halo = LG.sphere(o.halo || 3200, r, { jitter: 0.35, seed: 92 });
  const rays = [];
  for (let k = 0; k < (o.rays || 26); k++) {
    const a = hash(k, 4) * TAU, b = Math.acos(2 * hash(k, 9) - 1), r0 = r * 1.05, r1 = r * (1.4 + hash(k, 12) * 1.6);
    rays.push([[Math.sin(b) * Math.cos(a) * r0, Math.cos(b) * r0, Math.sin(b) * Math.sin(a) * r0],
               [Math.sin(b) * Math.cos(a) * r1, Math.cos(b) * r1, Math.sin(b) * Math.sin(a) * r1]]);
  }
  return { nucleus, halo, rays: LG.pairs(rays, { bright: 0.5 }) };
};

// ---------------------------------------------------------------- screen-space graph

// A trace in screen space: sample fn(u) → value 0..1 for `n` points across [x, x+w]. `k` draws it on,
// `jitter` adds the small vertical noise of a live read-out. Returns points + segments for dsLight.
MX.graph = function (fn, n, x, y, w, h, o) {
  o = o || {};
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const v = clamp(fn(u));
    // z carries a little depth so a laser-thin trace still gets a soft edge out of focus
    pts.push([x + u * w, y - v * h + (o.jitter ? noise1(u * 40, o.seed || 3) * o.jitter : 0), o.z || 0]);
  }
  return { pts, P: dsScreenPoints(pts, o.gain == null ? 0.75 : o.gain), S: dsScreenSeg(pts, { bright: 0.9 }) };
};

// ---------------------------------------------------------------- glyph field

// A field of running glyphs (fake log lines, fake code, fake telemetry) as a point cloud, sampled once.
// `alive` lets a shot switch a region on as the machine wakes.
MX.glyphs = function (n, o) {
  o = o || {};
  const w = o.w == null ? 6 : o.w, h = o.h == null ? 3.4 : o.h, seed = o.seed || 55;
  const rnd = mulberry32(seed);
  const pts = [], glyphs = [];
  const cols = Math.max(1, Math.round(Math.sqrt(n)));
  const rows = Math.max(1, Math.round(n / cols));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gx = (c / cols - 0.5) * w, gy = (r / rows - 0.5) * h;
      const ch = Math.floor(rnd() * DS_GLYPH.length);
      glyphs.push(ch);
      pts.push(gx, gy, 0);
    }
  }
  const P = new Float32Array(pts);
  return { P, w, h, cols, rows, glyphs };
};
