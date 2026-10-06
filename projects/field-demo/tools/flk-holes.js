// How much of the flock's own outline (convex hull in the xz plane, seen from above) is empty: occupancy grid of
// CELL u; a filled sheet leaves ~1 % of the cells inside its hull empty, a cut or a hole leaves a lane of them.
const vm = require('vm'), fs = require('fs'), R = require('path').resolve(__dirname, '../../..');
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON, WeakMap };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + '/engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + '/kits/sim.js', 'utf8'), ctx);
vm.runInContext(`var __opts, __scene; const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
var LG = { gauss: () => ({}), ring: () => ({}) }; MV.scene = (n, o) => { __scene = o; };`, ctx);
vm.runInContext(fs.readFileSync(R + '/projects/field-demo/scenes/flock.js', 'utf8'), ctx);
vm.runInContext('__scene.init(); var __N = FLK_N;', ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N, s = o.init(0), dt = 1 / 60, CELL = +process.argv[2] || 0.12;
const marks = [0.9, 2.0, 2.6, 3.0, 3.4, 4.0, 4.6, 5.0, 5.5, 5.95]; let t = 0, mi = 0;
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
while (mi < marks.length) {
  sc.step(s, t, dt); t += dt;
  if (t < marks[mi] - 1e-9) continue;
  const P = []; for (let i = 0; i < N; i++) P.push([s.x[i], s.z[i]]);
  P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const hull = lo.slice(0, -1).concat(up.slice(0, -1));
  const inside = (x, z) => hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], [x, z]) >= 0);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const gx = Math.ceil((x1 - x0) / CELL), gz = Math.ceil((z1 - z0) / CELL), occ = new Uint16Array(gx * gz);
  for (const [x, z] of P) occ[Math.min(gx - 1, (x - x0) / CELL | 0) + gx * Math.min(gz - 1, (z - z0) / CELL | 0)]++;
  let cells = 0, empty = 0;
  for (let a = 0; a < gx; a++) for (let b = 0; b < gz; b++) {
    // a cell counts when it lies well inside the hull (all four corners), so the ragged edge is not "empty"
    const cx = x0 + a * CELL, cz = z0 + b * CELL;
    if (![[cx, cz], [cx + CELL, cz], [cx, cz + CELL], [cx + CELL, cz + CELL]].every(([x, z]) => inside(x, z))) continue;
    cells++; if (!occ[a + gx * b]) empty++;
  }
  console.log(`lt ${marks[mi].toFixed(2)}  cells inside the outline ${cells}  empty ${empty}  = ${(empty / cells * 100).toFixed(1)} %`);
  mi++;
}
