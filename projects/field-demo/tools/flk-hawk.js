// The tear the intruder makes: how many birds are within 0.5 u of the point it crosses, before / while / after it goes
// through, next to how many are within 0.5 u of the flock's own centre at the same moment.
//   node tools/flk-hawk.js
const vm = require('vm'), fs = require('fs'), R = __dirname + '/../../..';
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON, WeakMap };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + '/engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + '/kits/sim.js', 'utf8'), ctx);
vm.runInContext(`var __opts, __scene; const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
var LG = { gauss: () => ({}), ring: () => ({}) }; MV.scene = (n, o) => { __scene = o; };`, ctx);
vm.runInContext(fs.readFileSync(R + '/projects/field-demo/scenes/flock.js', 'utf8'), ctx);
vm.runInContext('__scene.init(); var __N = FLK_N;', ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N, s = o.init(0), dt = 1 / 60;
const CROSS = [0.0, -0.05, 0.30];                      // the middle of the chord the intruder cuts (z = HAWK_CZ)
const near = (x, y, z) => { let c = 0; for (let i = 0; i < N; i++) if (Math.hypot(s.x[i] - x, s.y[i] - y, s.z[i] - z) < 0.5) c++; return c; };
let t = 0; const marks = [1.0, 1.6, 2.0, 2.6, 3.0, 3.4, 4.0, 4.6, 5.0, 5.5, 5.95]; let mi = 0;
console.log('   lt   birds within 0.5 of the crossing point   within 0.5 of the flock centre   intruder at');
while (mi < marks.length) {
  sc.step(s, t, dt); t += dt;
  if (t >= marks[mi] - 1e-9) {
    const hk = sc.hawk(marks[mi]);
    console.log(`${marks[mi].toFixed(2)}   ${String(near(...CROSS)).padStart(28)}   ${String(near(s.cx, s.cy, s.cz)).padStart(29)}   ${hk ? `(${hk.map(v => v.toFixed(2)).join(', ')})` : '—'}`);
    mi++;
  }
}
