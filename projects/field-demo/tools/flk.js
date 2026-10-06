const vm = require('vm'), fs = require('fs'), R = require('path').resolve(__dirname, '../../..') + '/';
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON, WeakMap };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + 'engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + 'kits/sim.js', 'utf8'), ctx);
vm.runInContext(`var __opts, __scene; const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
var LG = { gauss: () => ({}), ring: () => ({}) }; MV.scene = (n, o) => { __scene = o; };`, ctx);
vm.runInContext(fs.readFileSync(R + 'projects/field-demo/scenes/flock.js', 'utf8'), ctx);
vm.runInContext(`__scene.init(); var __N = FLK_N;`, ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N, s = o.init(0), dt = 1 / 60;
let t = 0; const marks = [0.9, 2.0, 2.6, 3.4, 4.25, 5.0, 5.5, 5.95]; let mi = 0;
while (mi < marks.length) {
  sc.step(s, t, dt); t += dt;
  if (t >= marks[mi] - 1e-9) {
    let cx = 0, cz = 0; for (let i = 0; i < N; i++) { cx += s.x[i]; cz += s.z[i]; } cx /= N; cz /= N;
    const r = []; for (let i = 0; i < N; i++) r.push(Math.hypot(s.x[i] - cx, s.z[i] - cz)); r.sort((a, b) => a - b);
    const R90 = r[Math.floor(N * 0.9)], inner = r.filter(v => v < R90 * 0.35).length / N;
    console.log(`lt ${marks[mi].toFixed(2)}  r90 ${R90.toFixed(2)}  share inside 0.35·r90 = ${(inner * 100).toFixed(1)} %  (filled disc ≈ ${(0.35 * 0.35 * 90).toFixed(1)} %)  median r ${r[N >> 1].toFixed(2)}`);
    mi++;
  }
}
