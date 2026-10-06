const vm = require('vm'), fs = require('fs'), R = require('path').resolve(__dirname, '../../..') + '/';
const ctx = { console, Math, Float32Array, Int32Array, Uint32Array, Array, Object, Number, JSON };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + 'engine/core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + 'kits/sim.js', 'utf8'), ctx);
vm.runInContext(`
var __opts, __scene;
const _mk = SIM.make; SIM.make = o => { __opts = o; return _mk(o); };
function lmFlick(t, t0, dur = 0.3, seed = 0) { if (t < t0) return 0; if (t >= t0 + dur) return 1; const k = (t - t0) / dur, fr = Math.floor((t - t0) * 60); return hash(fr, seed, 77) < 0.25 + k * 0.75 ? 0.4 + 0.6 * k : 0.08; }
var SG = { box: () => ({}), wire: () => ({}) }, LG = { gauss: () => ({}), pairs: () => ({}), seg: () => ({}) };
MV.scene = (n, o) => { __scene = o; };
`, ctx);
vm.runInContext(fs.readFileSync(R + 'projects/field-demo/scenes/dipole.js', 'utf8'), ctx);
vm.runInContext(`__scene.init(); var __N = DIP_N, __BX1 = DIP_BX1;`, ctx);
const sc = ctx.__scene, o = ctx.__opts, N = ctx.__N;
const s = o.init(0); const dt = 1 / 60;
const T = +process.argv[2] || 3.6;
let t = 0;
const t0 = Date.now();
for (let k = 0; t < T - 1e-9; k++) { sc.step(s, t, dt); t += dt; }
console.log('lt', T, 'steps', Math.round(T / dt), 'ms/step', ((Date.now() - t0) / (T / dt)).toFixed(1));
const lt = T, a = sc.aOn(lt), b = sc.bOn(lt), bx = sc.bX(lt), f = [0, 0];
// alignment
let al = 0; for (let i = 0; i < N; i++) { sc.field(s.x[i], s.y[i], a, bx, b, f); const m = Math.hypot(f[0], f[1]) || 1; al += Math.abs((s.cx[i] * f[0] + s.cy[i] * f[1]) / m); }
console.log('mean |cos(needle, B)|', (al / N).toFixed(3), '(random 0.637, aligned 1)');
// pair orientation relative to local B, by distance band
const bands = [[0.0, 0.03], [0.03, 0.06], [0.06, 0.1], [0.1, 0.16]];
const acc = bands.map(() => [0, 0]);
const S = 3000;
for (let q = 0; q < S; q++) {
  const i = (q * 7919) % N; sc.field(s.x[i], s.y[i], a, bx, b, f); const m = Math.hypot(f[0], f[1]) || 1, ux = f[0] / m, uy = f[1] / m;
  for (let j = 0; j < N; j++) { if (j === i) continue; const dx = s.x[j] - s.x[i], dy = s.y[j] - s.y[i], d = Math.hypot(dx, dy); if (d > 0.16 || d < 1e-6) continue;
    const c = Math.abs((dx * ux + dy * uy) / d); for (let k = 0; k < bands.length; k++) if (d >= bands[k][0] && d < bands[k][1]) { acc[k][0] += c; acc[k][1]++; } }
}
bands.forEach((bd, k) => console.log(`pairs ${bd[0]}-${bd[1]}: mean |cos(offset, B)| = ${(acc[k][0] / acc[k][1]).toFixed(3)}  (n=${acc[k][1]}; random 0.637, >0.637 = chains along B, <0.637 = bands across B)`));
// density contrast
const G = 60, H = new Float32Array(G * G); for (let i = 0; i < N; i++) { const gx = Math.min(G - 1, ((s.x[i] + 2.7) / 5.4 * G) | 0), gy = Math.min(G - 1, ((s.y[i] + 1.85) / 3.7 * G) | 0); H[gx + G * gy]++; }
let mu = N / (G * G), v = 0, mx = 0; for (const h of H) { v += (h - mu) ** 2; mx = Math.max(mx, h); } console.log('cell density mean', mu.toFixed(1), 'sd', Math.sqrt(v / H.length).toFixed(1), 'max', mx);
const poles = [['A north (+)', 0, 1.08], ['A south (-)', 0, -1.08], ['B south (-)', bx, 1.08], ['B north (+)', bx, -1.08]];
for (const [n, px, py] of poles) { let c = 0; for (let i = 0; i < N; i++) if (Math.hypot(s.x[i] - px, s.y[i] - py) < 0.3) c++; console.log(n, 'filings within 0.3:', c, '(uniform would be', Math.round(N * Math.PI * 0.09 / (5.4 * 3.7)), ')'); }
