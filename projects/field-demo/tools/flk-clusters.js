// connected components of the flock in 3D (birds closer than LINK are linked), and its size, at given shot times
const vm = require('vm'), fs = require('fs'), R = require('path').resolve(__dirname, '../../..');
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON, WeakMap };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + '/engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + '/kits/sim.js', 'utf8'), ctx);
vm.runInContext(`var __opts, __scene; const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
var LG = { gauss: () => ({}), ring: () => ({}) }; MV.scene = (n, o) => { __scene = o; };`, ctx);
vm.runInContext(fs.readFileSync(R + '/projects/field-demo/scenes/flock.js', 'utf8'), ctx);
vm.runInContext('__scene.init(); var __N = FLK_N, __R = FLK_R;', ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N, s = o.init(0), dt = 1 / 60, LINK = +process.argv[2] || 0.15;
const marks = [0.9, 2.0, 2.6, 3.4, 4.25, 5.0, 5.5, 5.95]; let t = 0, mi = 0;
while (mi < marks.length) {
  sc.step(s, t, dt); t += dt;
  if (t < marks[mi] - 1e-9) continue;
  const par = Int32Array.from({ length: N }, (_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j], dz = s.z[i] - s.z[j];
    if (dx * dx + dy * dy + dz * dz < LINK * LINK) { const a = find(i), b = find(j); if (a !== b) par[a] = b; }
  }
  const size = {}; for (let i = 0; i < N; i++) { const r = find(i); size[r] = (size[r] || 0) + 1; }
  const big = Object.values(size).sort((a, b) => b - a);
  let nb = 0; for (let i = 0; i < N; i += 13) for (let j = 0; j < N; j++) { if (i === j) continue; const dx = s.x[i] - s.x[j], dy = s.y[i] - s.y[j], dz = s.z[i] - s.z[j]; if (dx * dx + dy * dy + dz * dz < ctx.__R * ctx.__R) nb++; }
  const ext = a => { const v = Array.from(a).sort((p, q) => p - q); return (v[Math.floor(N * 0.95)] - v[Math.floor(N * 0.05)]).toFixed(2); };
  console.log(`lt ${marks[mi].toFixed(2)}  clusters ≥ 50 birds: ${big.filter(v => v >= 50).join(' / ')}  (strays ${big.filter(v => v < 50).reduce((p, q) => p + q, 0)})  extent x/y/z (5–95 %) ${ext(s.x)} / ${ext(s.y)} / ${ext(s.z)}  neighbours within FLK_R: ${(nb / Math.ceil(N / 13)).toFixed(0)}`);
  mi++;
}
