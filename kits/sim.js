// mv-kit kit: sim.js — simulations (sand on a vibrating plate, flocks, cloth, cracks spreading, a training run
// diverging) that still obey the engine's rule: a frame depends only on t.
//
// A simulation's state at time t is defined as: init() at the shot's start t0, then step() applied in fixed steps of dt
// up to t. That is a pure function of t, however the frames are asked for: forwards (export: each worker steps on from
// the frame before), out of order (qa, motion-blur sub-frames, a chunk that starts mid-shot: it steps from t0 or from
// the nearest checkpoint), or backwards (scrubbing the preview: back to a checkpoint, then forwards). Checkpoints (a
// copy of the state every `every` seconds) keep any jump cheap.
//
//   init() {
//     this.sand = SIM.make({ dt: 1 / 60, every: 1,
//       init: t0 => ({ x: Float32Array.from(…), y: …, rng: Uint32Array.from(…) }),   // typed arrays and numbers
//       step: (s, t, dt, i) => { … },                                                // mutate s in place
//     });
//   },
//   render(g, f) {
//     const s = this.sand.at(f.t, f.from);        // the state at f.t of a run that started at f.from
//     …                                            // read it; it changes on the next at()
//   }
//
// step(s, t, dt, i): t = t0 + i·dt is the time at the START of step i. Randomness must come from the state (keep a
// per-particle xorshift seed in a Uint32Array: SIM.xs) or from hash(i, …) — never Math.random. State = a plain object of
// numbers, typed arrays and nested plain objects (that is what a checkpoint copies). With --samples (motion blur), use
// a dt no longer than one sub-frame, or the sub-frames land on the same step.
(function (G) {
'use strict';
const MV = G.MV;

function clone(s) {
  if (s == null || typeof s !== 'object') return s;
  if (ArrayBuffer.isView(s)) return s.slice();
  if (Array.isArray(s)) return s.map(clone);
  const o = {}; for (const k in s) o[k] = clone(s[k]); return o;
}
function bytes(s) {
  if (s == null || typeof s !== 'object') return 8;
  if (ArrayBuffer.isView(s)) return s.byteLength;
  let n = 0; for (const k in s) n += bytes(s[k]); return n;
}

/**
 * def: init(t0) → state, step(state, t, dt, i), dt (1/60), every (seconds between checkpoints, 1), keep (most
 * checkpoints held per run, 12; the one at t0 always stays), budget (bytes of checkpoints, 768 MB).
 */
function make(def) {
  const dt = def.dt ?? 1 / 60, every = Math.max(1, Math.round((def.every ?? 1) / dt)), keep = def.keep ?? 12, budget = def.budget ?? 768e6;
  const runs = new Map();
  const run = t0 => {
    let r = runs.get(t0);
    if (!r) { r = { cur: null, cps: new Map(), size: 0 }; runs.set(t0, r); }
    return r;
  };
  const save = (r, n, s) => {
    if (r.cps.has(n)) return;
    const c = clone(s); r.cps.set(n, c); r.size += bytes(c);
    while (r.cps.size > 1 && (r.cps.size > keep || r.size > budget)) {     // drop the checkpoint farthest from here (never step 0)
      let far = -1, fd = -1; for (const k of r.cps.keys()) if (k !== 0 && Math.abs(k - n) > fd) { fd = Math.abs(k - n); far = k; }
      if (far < 0) break;
      r.size -= bytes(r.cps.get(far)); r.cps.delete(far);
    }
  };
  const api = {
    dt,
    /** Step index for time t of a run that starts at t0 (the last step at or before t). */
    stepAt(t, t0 = 0) { return Math.max(0, Math.floor((t - t0) / dt + 1e-6)); },
    /** The state at time t of the run that starts at t0. Read it before the next at(): it is the live state. */
    at(t, t0 = 0) {
      const r = run(t0), n = api.stepAt(t, t0);
      if (!r.cur) { r.cur = { n: 0, s: def.init(t0) }; save(r, 0, r.cur.s); }
      let best = 0; for (const k of r.cps.keys()) if (k <= n && k > best) best = k;
      // behind us: back to the nearest checkpoint; ahead: jump to a checkpoint if it is nearer than where we are
      if (r.cur.n > n || best > r.cur.n) r.cur = { n: best, s: clone(r.cps.get(best)) };
      const c = r.cur;
      while (c.n < n) { def.step(c.s, t0 + c.n * dt, dt, c.n); c.n++; if (c.n % every === 0) save(r, c.n, c.s); }
      return c.s;
    },
    /** Forget every run (after changing something the steps depend on). */
    reset() { runs.clear(); },
  };
  return api;
}

/** xorshift32 on slot i of a Uint32Array of seeds: a uniform 0..1, advancing that slot. Seed slots with SIM.seed. */
function xs(rng, i) { let x = rng[i]; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; rng[i] = x >>> 0; return (x >>> 0) / 4294967296; }
/** n non-zero xorshift seeds from one number. */
function seed(n, s = 1) { const r = new Uint32Array(n); for (let i = 0; i < n; i++) r[i] = (Math.imul(i + 1, 2654435761) ^ Math.imul(s + 7, 40503)) >>> 0 || 1; for (let k = 0; k < 4; k++) for (let i = 0; i < n; i++) xs(r, i); return r; }

const SIM = { make, xs, seed, clone };
MV.sim = SIM;
G.SIM = SIM;
})(window);
