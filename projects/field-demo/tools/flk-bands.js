// How the birds are spread across the cut: slice the flock into 0.06 u bands along z (only birds with |x| < 1.2, the
// middle of the flock where the lane is) and count them. A sheet leaves 29–40 in every band; a lane leaves one band
// with hundreds of birds and bands next to it with almost none; a line of birds is a single band far above the rest.
//   node tools/flk-bands.js 5.5          # one or more shot times, in seconds from the shot's start
//   node tools/flk-bands.js              # the marks below
const vm = require('vm'), fs = require('fs'), R = __dirname + '/../../..';
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON, WeakMap };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + '/engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + '/kits/sim.js', 'utf8'), ctx);
vm.runInContext(`var __opts, __scene; const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
var LG = { gauss: () => ({}), ring: () => ({}) }; MV.scene = (n, o) => { __scene = o; };`, ctx);
vm.runInContext(fs.readFileSync(R + '/projects/field-demo/scenes/flock.js', 'utf8'), ctx);
vm.runInContext('__scene.init(); var __N = FLK_N, __Z = HAWK_CZ;', ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N, s = o.init(0), dt = 1 / 60;
const BAND = 0.06, XMAX = 1.2, ZC = ctx.__Z;
const marks = process.argv.slice(2).map(Number).filter(v => !isNaN(v));
const times = marks.length ? marks.slice().sort((a, b) => a - b) : [0.9, 3.6, 4.0, 4.6, 5.5, 5.95];
let t = 0, mi = 0;
while (mi < times.length) {
  sc.step(s, t, dt); t += dt;
  if (t < times[mi] - 1e-9) continue;
  // bands centred on the cut line, out to where the flock has run out of birds on both sides
  const bins = new Map();
  let inMid = 0;
  for (let i = 0; i < N; i++) {
    if (Math.abs(s.x[i]) >= XMAX) continue;
    inMid++;
    const b = Math.round((s.z[i] - ZC) / BAND);
    bins.set(b, (bins.get(b) || 0) + 1);
  }
  const keys = Array.from(bins.keys()).sort((a, b) => a - b);
  const lo = keys[0] - 2, hi = keys[keys.length - 1] + 2;
  const cols = [];
  for (let b = lo; b <= hi; b++) cols.push(bins.get(b) || 0);
  const nz = cols.filter(v => v > 0).sort((a, b) => a - b);
  const med = nz.length ? nz[nz.length >> 1] : 0;
  const mx = Math.max(...cols);
  console.log(`lt ${times[mi].toFixed(2)}  birds with |x| < ${XMAX}: ${inMid}  bands of ${BAND} u along z (middle first):`);
  console.log('  ' + cols.map((v, i) => `${v}`).join(' '));
  console.log(`  max ${mx}  median ${med}  max/median ${(mx / Math.max(1, med)).toFixed(2)}`);
  mi++;
}
