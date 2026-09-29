// mv-kit — the engine: scenes, the timeline (the edit), frame composition, post-processing, motion blur.
//
//   MV.scene('name', { init(MV) {...}, render(g, f) { ...; return { shake: 8, flash: 0.3 } } })
//   MV.timeline(({ lyrics, audio, cut, after, T0, T1 }) => [ { scene: 'name', from, to, params, fadeIn }, ... ])
//   MV.onInit(async MV => { /* paint backgrounds, build geometry once */ })
//
// render(g, f) draws one frame of that scene into g (a W×H Canvas 2D context, state already reset) and
// must fully cover it. f = frame info (see frameFor). Output must depend on f.t only.
(function (G) {
'use strict';
const MV = G.MV;

MV.scenes = {};
MV.scene = (name, def) => { MV.scenes[name] = def; return def; };
let timelineFn = null;
MV.timeline = fn => { timelineFn = fn; };
const initHooks = [];
MV.onInit = fn => { initHooks.push(fn); };
/**
 * Masked transitions. MV.wipe('name', { mask(m, k, e, t), over(g, k, e, t) }) — a timeline entry with
 * `fadeIn: seconds, wipe: 'name'` reveals itself through the mask (white = incoming scene) instead of a
 * cross-fade; k = 0..1 progress, e = the incoming entry (e.params for wipe settings). `over` (optional)
 * draws on top of the composite, e.g. a wet edge along the mask front.
 */
MV.wipes = {};
MV.wipe = (name, def) => { MV.wipes[name] = def; return def; };

const POST_DEFAULTS = { grain: 0.06, vignette: 0.25, vignetteColor: '20,10,30', shake: 0, zoom: 1, rot: 0, flash: 0, flashColor: '255,250,240', fade: 0, invert: false };

MV.setup = async function () {
  const P = (MV.project = Object.assign({ title: 'untitled', width: 1920, height: 1080, fps: 24, drawRate: 12, from: 0, to: null, post: {}, background: '#000' }, G.MV_PROJECT || {}));
  G.W = P.width; G.H = P.height; MV.drawRate = P.drawRate;
  const D = G.MV_DATA || {};
  MV.warnings = MV.warnings || [];
  if (!D.audio) MV.warnings.push('data/audio.js missing: run analysis/analyze_audio.py (using a plain 4/4 grid at project.bpm meanwhile)');
  if (!D.lyrics) MV.warnings.push('data/lyrics.js missing: run analysis/align_lyrics.py (no lyrics meanwhile)');
  MV.lyrics = new MV.Lyrics(D.lyrics);
  MV.audio = new MV.Audio(D.audio, { bpm: P.bpm, duration: P.to || 600 });
  if (P.to == null) P.to = MV.audio.duration || 60;
  MV.FRAME = mk(W, H); MV.ACC = mk(W, H); MV.XFADE = mk(W, H); MV.MASK = mk(W, H); MV.GRAIN = makeGrain();
  for (const fn of initHooks) await fn(MV);
  const L = MV.lyrics, A = MV.audio;
  const helpers = {
    lyrics: L, audio: A, project: P, T0: P.from, T1: P.to,
    /** Start of the first word of the nth line containing q. */
    start: (q, nth = 0) => L.get(q, nth).words[0].start,
    /** Cut on the beat at/before the first word of the nth line containing q (never after the word). */
    cut: (q, nth = 0) => A.beatBefore(L.get(q, nth).words[0].start),
    /** The downbeat nearest to the end of the nth line containing q. */
    after: (q, nth = 0) => A.nearestDownbeat(L.get(q, nth).end),
  };
  if (!timelineFn) throw new Error('No MV.timeline(...) defined (timeline.js)');
  MV.entries = timelineFn(helpers).filter(e => e && e.to > e.from).sort((a, b) => a.from - b.from)
    .map((e, i) => ({ params: {}, ...e, i, name: e.name || e.scene }));
  for (const e of MV.entries) if (!MV.scenes[e.scene]) throw new Error(`timeline: unknown scene "${e.scene}" — add "${e.scene}" to "scenes" in project.js`);
  for (const [name, def] of Object.entries(MV.scenes)) if (def.init && MV.entries.some(e => e.scene === name)) await def.init.call(def, MV);
};

/** Everything a scene needs about time t, relative to its timeline entry e. */
function frameFor(e, t) {
  const A = MV.audio, beat = A.beatAt(t), bar = A.barAt(t);
  return {
    t, lt: t - e.from, p: clamp((t - e.from) / (e.to - e.from)), from: e.from, to: e.to, dur: e.to - e.from,
    params: e.params, entry: e, W, H, fps: MV.project.fps,
    tick: tick(t), tq: onTwos(t),
    beat, beatPhase: beat - Math.floor(beat), bar, barPhase: bar - Math.floor(bar), section: A.section(t),
    a: { rms: A.env('rms', t), low: A.env('low', t), mid: A.env('mid', t), high: A.env('high', t),
         vocals: A.env('vocals', t), drums: A.env('drums', t),
         kick: A.hit('kick', t, 0.12), snare: A.hit('snare', t, 0.14), hat: A.hit('hat', t, 0.05), onset: A.hit('onset', t, 0.1) },
    lyrics: MV.lyrics, audio: A,
  };
}
MV.frameFor = frameFor;

function reset(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.setLineDash([]); }
function run(e, g, t) {
  reset(g); g.save();
  const def = MV.scenes[e.scene];
  let r;
  try { r = def.render.call(def, g, frameFor(e, t)); }
  catch (err) { g.restore(); reset(g); g.fillStyle = '#400'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = '28px monospace'; g.fillText(`${e.scene}: ${err.message}`, 40, 60); console.error(err); MV.lastError = `${e.scene}: ${err.stack || err}`; return {}; }
  g.restore(); return r || {};
}
MV.activeAt = t => MV.entries.filter(e => t >= e.from && t < e.to);

/** Draw the scene(s) active at t into g, return their post overrides. */
function compose(g, t) {
  reset(g); g.fillStyle = MV.project.background; g.fillRect(0, 0, W, H);
  const act = MV.activeAt(t); if (!act.length) return {};
  const top = act[act.length - 1];
  const k = top.fadeIn && act.length > 1 ? clamp((t - top.from) / top.fadeIn) : 1;
  if (k >= 1) return run(top, g, t);
  const under = run(act[act.length - 2], g, t);
  const xg = MV.XFADE.getContext('2d'), over = run(top, xg, t);
  const wp = top.wipe && MV.wipes[top.wipe];
  if (top.wipe && !wp) throw new Error(`timeline: unknown wipe "${top.wipe}"`);
  reset(g);
  if (wp) {
    const mg = MV.MASK.getContext('2d'); reset(mg); mg.clearRect(0, 0, W, H);
    mg.save(); wp.mask(mg, k, top, t); mg.restore();
    reset(xg); xg.globalCompositeOperation = 'destination-in'; xg.drawImage(MV.MASK, 0, 0); reset(xg);
    g.drawImage(MV.XFADE, 0, 0);
    if (wp.over) { g.save(); wp.over(g, k, top, t); g.restore(); reset(g); }
  } else { g.globalAlpha = k; g.drawImage(MV.XFADE, 0, 0); g.globalAlpha = 1; }
  const post = { ...under };
  for (const [key, v] of Object.entries(over)) post[key] = typeof v === 'number' && typeof under[key] === 'number' ? lerp(under[key], v, k) : k > 0.5 ? v : (under[key] ?? v);
  return post;
}

/**
 * Render the frame at t into the output context. opt.samples > 1 averages that many sub-frames spread
 * over opt.shutter (fraction of a frame, centred on t): motion blur for the export.
 */
MV.renderAt = function (out, t, opt = {}) {
  const n = Math.max(1, opt.samples | 0), shutter = opt.shutter ?? 0.5, fps = MV.project.fps;
  const fg = MV.FRAME.getContext('2d');
  let post = {}, src = MV.FRAME;
  if (n === 1) post = compose(fg, t);
  else {
    const ag = MV.ACC.getContext('2d');
    for (let i = 0; i < n; i++) {
      const p = compose(fg, t + ((i + 0.5) / n - 0.5) * shutter / fps);
      if (i === n >> 1) post = p;
      reset(ag); ag.globalAlpha = 1 / (i + 1); ag.drawImage(MV.FRAME, 0, 0);
    }
    ag.globalAlpha = 1; src = MV.ACC;
  }
  applyPost(out, src, t, post);
  return post;
};

function makeGrain() {
  const c = mk(256, 256), g = c.getContext('2d'), im = g.createImageData(256, 256), R = mulberry32(99);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (R() - 0.5) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}

function applyPost(o, src, t, post) {
  const q = { ...POST_DEFAULTS, ...(MV.project.post || {}), ...post }, tk = tick(t);
  reset(o);
  let sx = 0, sy = 0;
  if (Array.isArray(q.shake)) [sx, sy] = q.shake;
  else if (q.shake) { sx = (hash(tk, 91) - 0.5) * 2 * q.shake; sy = (hash(tk, 92) - 0.5) * 2 * q.shake; }
  if (sx || sy || q.zoom !== 1 || q.rot) {
    const z = q.zoom * (1 + (Math.abs(sx) + Math.abs(sy)) * 2 / W);
    o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
    o.save(); o.translate(W / 2 + sx, H / 2 + sy); o.rotate(q.rot); o.scale(z, z); o.translate(-W / 2, -H / 2); o.drawImage(src, 0, 0); o.restore();
  } else o.drawImage(src, 0, 0);
  if (q.invert) { o.globalCompositeOperation = 'difference'; o.fillStyle = '#fff'; o.fillRect(0, 0, W, H); o.globalCompositeOperation = 'source-over'; }
  if (q.grain > 0) {
    o.save(); o.globalCompositeOperation = 'overlay'; o.globalAlpha = q.grain;
    const pat = o.createPattern(MV.GRAIN, 'repeat'); o.translate((hash(tk, 1) * 256) | 0, (hash(tk, 2) * 256) | 0);
    o.fillStyle = pat; o.fillRect(-256, -256, W + 512, H + 512); o.restore();
  }
  if (q.vignette > 0) {
    const vg = o.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, `rgba(${q.vignetteColor},0)`); vg.addColorStop(1, `rgba(${q.vignetteColor},${q.vignette})`);
    o.fillStyle = vg; o.fillRect(0, 0, W, H);
  }
  if (q.flash > 0) { o.fillStyle = `rgba(${q.flashColor},${clamp(q.flash)})`; o.fillRect(0, 0, W, H); }
  if (q.fade > 0) { o.fillStyle = `rgba(0,0,0,${clamp(q.fade)})`; o.fillRect(0, 0, W, H); }
}
})(window);
