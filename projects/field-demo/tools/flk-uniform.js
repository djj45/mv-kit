// How even the flock is inside its own outline, seen from above (xz): bird counts in CELL-u squares that lie wholly
// inside the convex hull. p10 / median low = thin lanes or holes (a corridor with a few birds still in it counts);
// p90 / median high = ridges (birds piled onto a line). thin = share of cells under 0.35 × median.
//   node flk-uniform.js [cell=0.2] [times…]
const vm = require('vm'), fs = require('fs'), R = require('path').resolve(__dirname, '../../..');
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON, WeakMap };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + '/engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + '/kits/sim.js', 'utf8'), ctx);
vm.runInContext(`var __opts, __scene; const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
var LG = { gauss: () => ({}), ring: () => ({}) }; MV.scene = (n, o) => { __scene = o; };`, ctx);
vm.runInContext(fs.readFileSync(R + '/projects/field-demo/scenes/flock.js', 'utf8'), ctx);
vm.runInContext('__scene.init(); var __N = FLK_N;', ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N, s = o.init(0), dt = 1 / 60;
const CELL = +process.argv[2] || 0.2, marks = process.argv.length > 3 ? process.argv.slice(3).map(Number) : [0.9, 2.0, 2.6, 3.0, 3.4, 4.25, 5.0, 5.5, 5.95];
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
let t = 0, mi = 0;
while (mi < marks.length) {
  sc.step(s, t, dt); t += dt;
  if (t < marks[mi] - 1e-9) continue;
  const P = []; for (let i = 0; i < N; i++) P.push([s.x[i], s.z[i]]);
  const Q = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), lo = [], up = [];
  for (const p of Q) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = Q.length - 1; i >= 0; i--) { const p = Q[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const hull = lo.slice(0, -1).concat(up.slice(0, -1)), inside = (x, z) => hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], [x, z]) >= 0);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const gx = Math.ceil((x1 - x0) / CELL), gz = Math.ceil((z1 - z0) / CELL), occ = new Uint16Array(gx * gz);
  for (const [x, z] of P) occ[Math.min(gx - 1, (x - x0) / CELL | 0) + gx * Math.min(gz - 1, (z - z0) / CELL | 0)]++;
  const v = [];
  for (let a = 0; a < gx; a++) for (let b = 0; b < gz; b++) {
    const cx = x0 + a * CELL, cz = z0 + b * CELL;
    if ([[cx, cz], [cx + CELL, cz], [cx, cz + CELL], [cx + CELL, cz + CELL]].every(([x, z]) => inside(x, z))) v.push(occ[a + gx * b]);
  }
  v.sort((p, q) => p - q);
  const med = v[v.length >> 1] || 1, p10 = v[Math.floor(v.length * 0.1)], p90 = v[Math.floor(v.length * 0.9)], thin = v.filter(c => c < 0.35 * med).length / v.length;
  console.log(`lt ${marks[mi].toFixed(2)}  cells ${v.length}  median ${med}  p10/median ${(p10 / med).toFixed(2)}  p90/median ${(p90 / med).toFixed(2)}  thin (< 0.35 × median) ${(thin * 100).toFixed(1)} %`);
  mi++;
}
