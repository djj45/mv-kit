// The hole the intruder makes, and whether it closes behind it. Every 0.1 s while the intruder is over the flock:
//   at   birds within R (xz, seen from above) of where the intruder is now ÷ what an even flock would have there
//   ring the same for the ring 1.5 R … 2.7 R around it: is the hole surrounded by birds (split around it), or was the
//        whole flock just shoved aside?
//   0.3s / 0.6s / 1.0s behind: the same for where it was that long ago (is the hole closing behind it?)
// 1.00 = as dense as the flock's median, 0 = empty. "—" = that point is outside the flock's outline.
//   node flk-vacuole.js [R=0.3]
const vm = require('vm'), fs = require('fs'), Rt = require('path').resolve(__dirname, '../../..');
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON, WeakMap };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(Rt + '/engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(Rt + '/kits/sim.js', 'utf8'), ctx);
vm.runInContext(`var __opts, __scene; const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
var LG = { gauss: () => ({}), ring: () => ({}) }; MV.scene = (n, o) => { __scene = o; };`, ctx);
vm.runInContext(fs.readFileSync(Rt + '/projects/field-demo/scenes/flock.js', 'utf8'), ctx);
vm.runInContext('__scene.init(); var __N = FLK_N;', ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N, s = o.init(0), dt = 1 / 60, R = +process.argv[2] || 0.3, CELL = 0.2;
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
function frameStats() {
  const P = []; for (let i = 0; i < N; i++) P.push([s.x[i], s.z[i]]);
  const Q = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), lo = [], up = [];
  for (const p of Q) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = Q.length - 1; i >= 0; i--) { const p = Q[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const hull = lo.slice(0, -1).concat(up.slice(0, -1)), inside = (x, z) => hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], [x, z]) >= 0);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const gx = Math.ceil((x1 - x0) / CELL), gz = Math.ceil((z1 - z0) / CELL), occ = new Uint16Array(gx * gz), v = [];
  for (const [x, z] of P) occ[Math.min(gx - 1, (x - x0) / CELL | 0) + gx * Math.min(gz - 1, (z - z0) / CELL | 0)]++;
  for (let a = 0; a < gx; a++) for (let b = 0; b < gz; b++) { const cx = x0 + a * CELL, cz = z0 + b * CELL; if ([[cx, cz], [cx + CELL, cz], [cx, cz + CELL], [cx + CELL, cz + CELL]].every(([x, z]) => inside(x, z))) v.push(occ[a + gx * b]); }
  v.sort((p, q) => p - q);
  const rho = (v[v.length >> 1] || 1) / (CELL * CELL);                         // birds per u², the flock's median
  const rel = (x, z, r0, r1) => { let c = 0; for (const [px, pz] of P) { const d2 = (px - x) ** 2 + (pz - z) ** 2; if (d2 >= r0 * r0 && d2 < r1 * r1) c++; } return c / (rho * Math.PI * (r1 * r1 - r0 * r0)); };
  return { inside, rel: (x, z) => rel(x, z, 0, R), ring: (x, z) => rel(x, z, 1.5 * R, 2.7 * R) };
}
let t = 0;
const f = v => (v == null ? '   —' : v.toFixed(2).padStart(4));
console.log('   lt    at  ring   0.3s  0.6s  1.0s behind');
for (let T = 1.0; T <= 6.0 + 1e-9; T += 0.1) {
  while (t < T - 1e-9) { sc.step(s, t, dt); t += dt; }
  const hk = sc.hawk(T); if (!hk) continue;
  const st = frameStats(), val = q => (q && st.inside(q[0], q[2]) ? st.rel(q[0], q[2]) : null);
  const now = val(hk);
  if (now == null) continue;                                                   // only while it is over the flock
  console.log(`${T.toFixed(2).padStart(5)}  ${f(now)}  ${f(st.ring(hk[0], hk[2]))}   ${f(val(sc.hawk(T - 0.3)))}  ${f(val(sc.hawk(T - 0.6)))}  ${f(val(sc.hawk(T - 1.0)))}`);
}
