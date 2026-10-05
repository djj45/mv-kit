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
// MV.sceneSrc: the file that defined each scene. render.py's export keys its cached chunks on it, so after an edit
// only the chunks showing that scene render again.
MV.sceneSrc = {};
MV.scene = (name, def) => { MV.scenes[name] = def; MV.sceneSrc[name] = document.currentScript ? document.currentScript.src : null; return def; };
let timelineFn = null;
MV.timeline = fn => { timelineFn = fn; };
/**
 * Model sheets: a character (or prop) drawn in every view, mood and key pose on one page, the way an animation studio
 * keeps a character on model. Register it next to the character's draw function (lib/):
 *   MV.model('pip', { cell: [340, 420], guides: [150, 230], rows: [
 *       { label: 'views', items: ['front', 'q', 'side', 'qback', 'back'].map(v => ({ label: v, pose: { view: v } })) },
 *       { label: 'moods', items: ['neutral', 'happy', …].map(m => ({ label: m, pose: t => ACT.feel(m, t) })) } ],
 *     draw(g, x, y, pose, t) { pip(g, x, y, 3.2, pose, t); } });
 * draw gets the feet point (x, y) in its cell; a pose may be a function of t. guides = heights in px above the ground,
 * drawn across each row: the head top / eye line must meet them in every view. `render.py model` writes
 * out/model-<name>.png; the preview shows one with index.html?model=<name>.
 */
MV.models = {};
MV.model = (name, def) => { MV.models[name] = def; return def; };
const initHooks = [];
MV.onInit = fn => { initHooks.push(fn); };
/**
 * Transitions. A timeline entry with `fadeIn: seconds, wipe: 'name'` comes in through MV.wipes[name] instead of a
 * cross-fade (k = 0..1 progress, e = the incoming entry, e.params for its settings). Two kinds:
 *   MV.wipe('name', { mask(m, k, e, t), over(g, k, e, t) })   reveal the new shot through a mask (white = new);
 *        `over` (optional) draws on top of the composite, e.g. a wet edge along the mask front
 *   MV.wipe('name', { render(g, A, B, k, e, t, prev) })        draw the frame from both pictures: A = the outgoing
 *        shot (entry prev), B = the incoming one, both W×H canvases at time t. For moves that carry something
 *        across the cut: engine/transitions.js has zoom (match cut), pan and reflow.
 * Either kind may add lint(e, prev) -> message(s) for MV.lint. A scene may expose anchors(f) -> { name: [x, y, w, h] }
 * (canvas px of its own frame at f.t) so a transition can follow an object: MV.anchorOf(entry, spec, t).
 * An entry's own `carry(g, k, e, t)` draws over any transition: the thing that crosses the cut.
 */
MV.wipes = {};
MV.wipe = (name, def) => { MV.wipes[name] = def; return def; };
/**
 * Post filters: MV.postFilter(fn) — fn(canvas, post, t) runs on every finished frame (after motion blur, before
 * shake / zoom, grain, vignette, flash) and may redraw the canvas in place. `post` is the merged post object
 * (project.post + what the scene returned), so a filter can read its own settings from it (e.g. post.pigment).
 * A filter that moves pixels to other places (a 3D tilt, a ripple) sets post.remapped = true: `render.py qa`
 * then knows it cannot map that frame's text and leaves it out instead of reporting it hidden.
 */
MV.postFilters = [];
MV.postFilter = fn => { MV.postFilters.push(fn); };
/**
 * The screen layer: MV.overlay(fn), called from a scene's render(), has fn(o) draw on the finished frame AFTER the
 * camera (push / insert / warp, shake, zoom, rot, pan) and before invert / grain / vignette / flash / fade. o is a
 * W×H context in output pixels, state reset; fn runs later in the same frame, so it may use the render's own f.
 * For what must stay put while the world moves: the lyric zone, a caption, a HUD — the camera can then push in
 * as far as it likes (MV.keep is not needed there and is ignored). In a cross-fade / wipe an entry's overlay fades
 * with it (top: k, under: 1 − k). MV.focus / MV.box / MV.group work inside it too (in output px); qa checks it.
 */
MV.overlay = fn => { (MV.frameOverlay = MV.frameOverlay || []).push({ fn, entry: MV.curEntry, alpha: MV.curAlpha ?? 1 }); };

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
  MV.FRAME = mk(W, H); MV.ACC = mk(W, H); MV.XFADE = mk(W, H); MV.XA = mk(W, H); MV.MASK = mk(W, H); MV.OVL = mk(W, H); MV.GRAIN = makeGrain();
  for (const fn of initHooks) await fn(MV);
  const L = MV.lyrics, A = MV.audio;
  const helpers = {
    lyrics: L, audio: A, project: P, T0: P.from, T1: P.to,
    /** Start of the first word of the nth line containing q. */
    start: (q, nth = 0) => L.get(q, nth).words[0].start,
    /** Start of the nth sung word q itself (a whole word: word('drop'), word('AGI')): for reads and actions on a word. */
    word: (q, nth = 0) => {
      const ws = L.findWords(q);
      if (!ws[nth]) throw new Error(`timeline: word("${q}"${nth ? ', ' + nth : ''}) — no such sung word (${ws.length} found)`);
      return ws[nth].start;
    },
    /**
     * Cut on the beat at/before the first word of the nth line containing q (never after the word).
     * o.hold (default project.cutHold, else 0): the previous line's last word must stay this long (s) in the outgoing
     * shot. When the beat comes sooner after that word, the cut moves onto the line's first sung word instead (still
     * on the song, never into the next line). 0.2 = 6 frames at 30 fps.
     */
    cut: (q, nth = 0, o = {}) => {
      const line = L.get(q, nth), w0 = line.words[0].start, c = A.beatBefore(w0), hold = o.hold ?? P.cutHold ?? 0;
      if (!hold) return c;
      let last = null;
      for (const l of L.lines) for (const w of l.words) if (l !== line && w.start < w0 - 1e-6 && (!last || w.start > last.start)) last = w;
      return last && c < last.start + hold ? Math.max(c, w0) : c;
    },
    /** The downbeat nearest to the end of the nth line containing q. */
    after: (q, nth = 0) => A.nearestDownbeat(L.get(q, nth).end),
    /** `from` for a transition of dur seconds that lands on t: `pre` of it happens before t, the rest settles after. */
    land: (t, dur, pre = 0.7) => t - pre * dur,
  };
  if (!timelineFn) throw new Error('No MV.timeline(...) defined (timeline.js)');
  MV.entries = timelineFn(helpers).filter(e => e && e.to > e.from).sort((a, b) => a.from - b.from)
    .map((e, i) => ({ params: {}, ...e, i, name: e.name || e.scene }));
  // where each entry hands over: the start of the later entry that takes over from it (starts inside it and runs on
  // past its end — the next shot of a dissolve, a zoom, a reflow). A line that starts after that belongs to the next
  // shot: f.lyrics.lineAt leaves it out of this one, so it does not show twice while the two overlap.
  for (const e of MV.entries) {
    const nx = MV.entries.filter(o => o.from > e.from + 1e-6 && o.from < e.to - 1e-6 && o.to >= e.to - 1e-6);
    e.until = nx.length ? Math.min(...nx.map(o => o.from)) : e.to;
  }
  for (const e of MV.entries) e.reads = readsOf(e);
  for (const e of MV.entries) if (!MV.scenes[e.scene]) throw new Error(`timeline: unknown scene "${e.scene}" — add "${e.scene}" to "scenes" in project.js`);
  for (const [name, def] of Object.entries(MV.scenes)) if (def.init && MV.entries.some(e => e.scene === name)) await def.init.call(def, MV);
};

/**
 * Reads: what the viewer has to understand in a shot, in order (ANIMATION_GUIDE "model the viewer", from
 * github.com/JohnHeibel/ClaudeAnimationBase). A timeline entry may carry
 *   reads: [[t, 'what the viewer gets', 'focus name'], [t2, '…', { focus: 'name', quick: true }], …]
 * t is song time (use start('…') / the beat helpers, as for cuts). A read lasts until the next one starts (or the
 * shot hands over): one read at a time. focus = the MV.focus name the eye should be on when it starts (qa checks it:
 * read-unled). quick = a fast action the shot set up (anticipation): it may be shorter. MV.lint checks the timing.
 */
function readsOf(e) {
  return (e.reads || []).map(r => {
    if (!Array.isArray(r)) return { at: +r.at, what: String(r.what || ''), focus: r.focus || null, quick: !!r.quick };
    const o = r[2] && typeof r[2] === 'object' ? r[2] : { focus: r[2] || null };
    return { at: +r[0], what: String(r[1] || ''), focus: o.focus || null, quick: !!o.quick };
  }).filter(r => isFinite(r.at)).sort((a, b) => a.at - b.at);
}

/**
 * Problems in the edit that no single frame shows: `render.py check` prints them, the preview marks them in red
 * on the shot strip. [{t, kind, msg}] sorted by time. project.lint can tune it: { lineTail: seconds, off: [kinds] }.
 *   gap      no shot covers this stretch: the background colour shows
 *   hidden   a shot overlaps the previous one without fadeIn: the previous one is cut short
 *   fade     a fadeIn that cannot play: no overlap (it is a hard cut), or the previous shot ends mid-dissolve (it pops)
 *   wipe     a wipe that is not defined, has no fadeIn, or fails its own lint (e.g. a zoom anchor the scene lacks)
 *   repeat   the same scene with the same params twice in a row: one shot, or a missing change
 *   offbeat  a cut that is neither on a beat nor on a sung word (±1 frame); a transition may also end or land there
 *   linetail a line's last word starts so close to the next line that it can barely stand whole before the swap
 *            (the next line comes < lineTail s after it, default 0.65): look at it with a strip
 *   cuttail  a hard cut comes less than cutTail s (default 6 frames) after a line's last word starts: the word
 *            flashes and is gone. cut(q, n, { hold }) / project.cutHold moves such cuts onto the next line's first word
 *   read     a read (entry.reads) gets less than readMin s (default 0.6; quick reads readQuick, 0.25) before the next
 *            read starts or the shot hands over: the viewer misses it. Or it lies outside its shot. Once any entry has
 *            reads, a shot of 1.5 s or more without any is noted too
 */
MV.lint = function () {
  const P = MV.project, A = MV.audio, L = MV.lyrics, E = MV.entries, fr = 1 / P.fps, out = [];
  const o = P.lint || {}, off = new Set(o.off || []);
  const add = (t, kind, msg) => { if (!off.has(kind)) out.push({ t: +t.toFixed(3), kind, msg }); };
  const f2 = x => x.toFixed(2);
  // coverage
  let reach = P.from;
  for (const e of E) {
    if (e.to <= P.from || e.from >= P.to) continue;
    if (e.from > reach + fr / 2) add(reach, 'gap', `nothing covers ${f2(reach)}–${f2(Math.min(e.from, P.to))} s`);
    reach = Math.max(reach, e.to);
  }
  if (reach < P.to - fr / 2) add(reach, 'gap', `nothing covers ${f2(reach)}–${f2(P.to)} s (the end)`);
  // neighbours
  for (let i = 1; i < E.length; i++) {
    const a = E[i - 1], b = E[i];
    if (b.from < a.to - fr / 2) {
      if (!b.fadeIn) add(b.from, 'hidden', `${b.name} starts at ${f2(b.from)} without fadeIn: ${a.name} is hidden for its last ${f2(a.to - b.from)} s`);
      else if (a.to < b.from + b.fadeIn - fr / 2) add(a.to, 'fade', `${a.name} ends at ${f2(a.to)}, ${f2(b.from + b.fadeIn - a.to)} s before ${b.name}'s ${b.fadeIn} s dissolve finishes: it pops`);
    } else if (b.fadeIn) add(b.from, 'fade', `${b.name} has fadeIn ${b.fadeIn} but does not overlap ${a.name}: a hard cut (extend ${a.name} to ${f2(b.from + b.fadeIn)})`);
    if (a.scene === b.scene && JSON.stringify(a.params) === JSON.stringify(b.params)) add(b.from, 'repeat', `${a.name} → ${b.name}: same scene, same params`);
  }
  E.forEach((e, i) => {
    if (!e.wipe) return;
    const wp = MV.wipes[e.wipe];
    if (!wp) return add(e.from, 'wipe', `${e.name}: unknown wipe "${e.wipe}"`);
    if (!e.fadeIn) return add(e.from, 'wipe', `${e.name}: wipe "${e.wipe}" without fadeIn never plays (a hard cut)`);
    if (!wp.lint || !E[i - 1]) return;
    try { for (const m of [].concat(wp.lint(e, E[i - 1]) || [])) add(e.from, 'wipe', `${e.name} (${e.wipe}): ${m}`); }
    catch (err) { add(e.from, 'wipe', `${e.name} (${e.wipe}): ${err.message}`); }
  });
  // cuts on the grid (only against a real analysis: without data/audio.js the grid is a placeholder)
  const onsets = L.words.map(w => w.start);
  for (const e of A.missing ? [] : E) {
    const c = e.from;
    if (c <= P.from + fr / 2 || c >= P.to) continue;
    // a transition may start on the grid, end on it, or land on it (land(): 70 % before the beat)
    const at = e.fadeIn ? [c, c + 0.7 * e.fadeIn, c + e.fadeIn] : [c];
    const off = x => [Math.abs(A.nearestBeat(x) - x), onsets.reduce((m, s) => Math.min(m, Math.abs(s - x)), Infinity)];
    if (at.some(x => Math.min(...off(x)) <= fr)) continue;
    const [db, dw] = off(c);
    add(c, 'offbeat', `cut to ${e.name} at ${f2(c)} s: ${Math.round(db * 1000)} ms off the nearest beat, ${dw === Infinity ? 'no words' : Math.round(dw * 1000) + ' ms off the nearest sung word'}`);
  }
  // line ends
  const tail = o.lineTail ?? 0.65, sung = L.lines.filter(l => l.words.length);
  for (let i = 0; i + 1 < sung.length; i++) {
    const l = sung[i], last = l.words[l.words.length - 1], next = sung[i + 1].words[0].start, gap = next - last.start;
    if (gap < tail && last.start >= P.from && last.start < P.to)
      add(last.start, 'linetail', `"${last.w}" (end of "${l.text}") starts ${Math.round(gap * 1000)} ms before the next line; look: strip --t ${f2(Math.max(P.from, last.start - 0.25))} --dur 1 --step 0.083`);
  }
  // a hard cut right after a line's last word: the word flashes on for a few frames and the shot is gone
  const cutTail = o.cutTail ?? 6 / P.fps;
  for (const e of E) {
    const c = e.from;
    if (e.fadeIn || c <= P.from + fr / 2 || c >= P.to) continue;
    for (const l of sung) {
      const last = l.words[l.words.length - 1];
      if (last.start < c - 1e-6 && c - last.start < cutTail - 1e-6)
        add(c, 'cuttail', `cut to ${e.name} at ${f2(c)} s comes ${Math.round((c - last.start) * P.fps)} frame(s) after "${last.w}" (end of "${l.text}") starts: it flashes. ` +
          `Use cut(q, n, { hold: ${f2(cutTail)} }) or "cutHold" in project.js`);
    }
  }
  // reads: one at a time, each long enough to be found and understood
  const readMin = o.readMin ?? 0.6, readQuick = o.readQuick ?? 0.25, anyReads = E.some(e => e.reads.length);
  for (const e of E) {
    const end = e.until ?? e.to, rs = e.reads;
    if (e.to <= P.from || e.from >= P.to) continue;
    if (anyReads && !rs.length && end - e.from >= 1.5)
      add(e.from, 'read', `${e.name} (${f2(e.from)}–${f2(end)}): no reads — what must the viewer understand here, in what order? reads: [[t, 'what', 'focus'], …]`);
    rs.forEach((r, k) => {
      if (r.at < e.from - fr / 2 || r.at >= end) return add(r.at, 'read', `${e.name}: read "${r.what}" at ${f2(r.at)} s is outside the shot (${f2(e.from)}–${f2(end)})`);
      const nxAt = k + 1 < rs.length ? rs[k + 1].at : Infinity, last = nxAt >= end, nx = last ? end : nxAt, span = nx - r.at, min = r.quick ? readQuick : readMin;
      if (span < min - fr / 2)
        add(r.at, 'read', `${e.name}: "${r.what}" gets ${Math.round(span * 1000)} ms before ${last ? 'the shot hands over' : `"${rs[k + 1].what}" starts`} — ` +
          `under ${min} s the viewer misses it. Move the next read later, lengthen the shot, or drop a read${r.quick ? '' : " (a fast action the shot set up: { quick: true })"}`);
    });
  }
  return out.sort((a, b) => a.t - b.t);
};

/**
 * The rect [x, y, w, h] a transition aims at in entry e's picture at time t. spec: [x, y, w, h] as is, 'full' or
 * nothing for the whole frame, or the name of an anchor the entry's scene returns from anchors(f) (or a static
 * `anchors` object), so the transition follows that object while it moves.
 */
MV.anchorOf = function (e, spec, t) {
  if (spec == null || spec === 'full') return [0, 0, W, H];
  if (Array.isArray(spec)) return spec;
  const def = MV.scenes[e.scene], an = typeof def.anchors === 'function' ? def.anchors.call(def, frameFor(e, t)) : def.anchors;
  if (!an || !an[spec]) throw new Error(`${e.name}: no anchor "${spec}" (its scene's anchors(f) should return { ${spec}: [x, y, w, h] })`);
  return an[spec];
};

/** Everything a scene needs about time t, relative to its timeline entry e. */
function frameFor(e, t) {
  const A = MV.audio, beat = A.beatAt(t), bar = A.barAt(t);
  return {
    t, lt: t - e.from, p: clamp((t - e.from) / (e.to - e.from)), from: e.from, to: e.to, until: e.until ?? e.to, dur: e.to - e.from,
    params: e.params, entry: e, W, H, fps: MV.project.fps,
    tick: tick(t), tq: onTwos(t),
    beat, beatPhase: beat - Math.floor(beat), bar, barPhase: bar - Math.floor(bar), section: A.section(t),
    a: { rms: A.env('rms', t), low: A.env('low', t), mid: A.env('mid', t), high: A.env('high', t),
         vocals: A.env('vocals', t), drums: A.env('drums', t),
         kick: A.hit('kick', t, 0.12), snare: A.hit('snare', t, 0.14), hat: A.hit('hat', t, 0.05), onset: A.hit('onset', t, 0.1) },
    lyrics: shotLyrics(e), audio: A,
  };
}
/** MV.lyrics as one entry sees it: lineAt(t, from) also leaves out the lines that start after the entry hands over */
const SHOT_LYRICS = new WeakMap();
function shotLyrics(e) {
  const L = MV.lyrics;
  if (!L) return L;
  let v = SHOT_LYRICS.get(e);
  if (!v || Object.getPrototypeOf(v) !== L) {
    v = Object.create(L);
    v.lineAt = (t, from, until) => L.lineAt(t, from, until === undefined ? (e.until ?? e.to) : until);
    SHOT_LYRICS.set(e, v);
  }
  return v;
}
MV.frameFor = frameFor;

function reset(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.setLineDash([]); }
function run(e, g, t) {
  reset(g); g.save();
  const def = MV.scenes[e.scene];
  MV.curEntry = e;                                         // MV.focus / MV.box (engine/qa.js) tag what they record with it
  let r;
  try { r = def.render.call(def, g, frameFor(e, t)); }
  catch (err) { g.restore(); reset(g); g.fillStyle = '#400'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = '28px monospace'; g.fillText(`${e.scene}: ${err.message}`, 40, 60); console.error(err); MV.lastError = `${e.scene}: ${err.stack || err}`; return {}; }
  g.restore(); return r || {};
}
MV.activeAt = t => MV.entries.filter(e => t >= e.from && t < e.to);

/** Draw the scene(s) active at t into g, return their post overrides. */
function compose(g, t) {
  MV.frameFocus = []; MV.frameKeep = [];                   // MV.focus / MV.keep (engine/qa.js): this frame's subject and must-stay-visible boxes
  MV.frameOverlay = []; MV.curAlpha = 1;                   // MV.overlay: this frame's screen layer, and how strongly its entry shows
  reset(g); g.fillStyle = MV.project.background; g.fillRect(0, 0, W, H);
  const act = MV.activeAt(t); if (!act.length) return {};
  const top = act[act.length - 1];
  const k = top.fadeIn && act.length > 1 ? clamp((t - top.from) / top.fadeIn) : 1;
  if (k >= 1) return run(top, g, t);
  const prev = act[act.length - 2], wp = top.wipe && MV.wipes[top.wipe];
  if (top.wipe && !wp) throw new Error(`timeline: unknown wipe "${top.wipe}"`);
  const two = wp && wp.render;                             // needs both pictures: A gets its own canvas
  MV.curAlpha = 1 - k;
  const under = run(prev, two ? MV.XA.getContext('2d') : g, t);
  MV.curAlpha = k;
  const xg = MV.XFADE.getContext('2d'), over = run(top, xg, t);
  MV.curAlpha = 1;
  reset(g);
  if (two) {
    g.fillStyle = MV.project.background; g.fillRect(0, 0, W, H);
    g.save();
    try { wp.render(g, MV.XA, MV.XFADE, k, top, t, prev); }
    catch (err) {     // report it like a scene error, and dissolve instead
      console.error(err); MV.lastError = `${top.name} (${top.wipe}): ${err.stack || err}`;
      reset(g); g.drawImage(MV.XA, 0, 0); g.globalAlpha = k; g.drawImage(MV.XFADE, 0, 0);
    }
    g.restore(); reset(g);
  } else if (wp) {
    const mg = MV.MASK.getContext('2d'); reset(mg); mg.clearRect(0, 0, W, H);
    mg.save(); wp.mask(mg, k, top, t); mg.restore();
    reset(xg); xg.globalCompositeOperation = 'destination-in'; xg.drawImage(MV.MASK, 0, 0); reset(xg);
    g.drawImage(MV.XFADE, 0, 0);
    if (wp.over) { g.save(); wp.over(g, k, top, t); g.restore(); reset(g); }
  } else { g.globalAlpha = k; g.drawImage(MV.XFADE, 0, 0); g.globalAlpha = 1; }
  if (top.carry) { g.save(); top.carry(g, k, top, t); g.restore(); reset(g); }
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
  let post = {}, src = MV.FRAME, ovs = [];
  if (n === 1) { post = compose(fg, t); ovs = MV.frameOverlay; }
  else {
    const ag = MV.ACC.getContext('2d');
    for (let i = 0; i < n; i++) {
      const p = compose(fg, t + ((i + 0.5) / n - 0.5) * shutter / fps);
      if (i === n >> 1) { post = p; ovs = MV.frameOverlay; }   // the screen layer is drawn once, sharp, from the middle sub-frame
      reset(ag); ag.globalAlpha = 1 / (i + 1); ag.drawImage(MV.FRAME, 0, 0);
    }
    ag.globalAlpha = 1; src = MV.ACC;
  }
  applyPost(out, src, t, post, ovs);
  return post;
};

/** MV.overlay: each entry's screen layer drawn into MV.OVL, then laid on the output at that entry's strength */
function drawOverlays(o, ovs) {
  const og = MV.OVL.getContext('2d'), keep = MV.curEntry, groups = new Map();
  for (const v of ovs) { if (!groups.has(v.entry)) groups.set(v.entry, []); groups.get(v.entry).push(v); }
  MV.inOverlay = true;
  try {
    for (const [e, list] of groups) {
      reset(og); og.clearRect(0, 0, W, H);
      for (const v of list) {
        MV.curEntry = e; reset(og); og.save();
        try { v.fn(og); }
        catch (err) { console.error(err); MV.lastError = `${e ? e.scene : '?'} (overlay): ${err.stack || err}`; }
        og.restore();
      }
      reset(o); o.globalAlpha = clamp(list[0].alpha); o.drawImage(MV.OVL, 0, 0);
    }
  } finally { MV.inOverlay = false; MV.curEntry = keep; reset(o); }
}

function makeGrain() {
  const c = mk(256, 256), g = c.getContext('2d'), im = g.createImageData(256, 256), R = mulberry32(99);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (R() - 0.5) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return c;
}

function applyPost(o, src, t, post, ovs) {
  const q = { ...POST_DEFAULTS, ...(MV.project.post || {}), ...post }, tk = tick(t);
  reset(o);
  for (const fn of MV.postFilters) fn(src, q, t);
  let sx = 0, sy = 0;
  if (Array.isArray(q.shake)) [sx, sy] = q.shake;
  else if (q.shake) { sx = (hash(tk, 91) - 0.5) * 2 * q.shake; sy = (hash(tk, 92) - 0.5) * 2 * q.shake; }
  // shake is a hand: it gets a little extra zoom so the frame edge never shows. pan is a camera move (kits/camera.js):
  // it is applied as is, so a zoom can be pinned on a point (pan = −(zoom − 1)·(point − centre)).
  const [px, py] = Array.isArray(q.pan) ? q.pan : [0, 0];
  if (sx || sy || px || py || q.zoom !== 1 || q.rot) {
    const z = q.zoom * (1 + (Math.abs(sx) + Math.abs(sy)) * 2 / W);
    MV.lastPost = { sx: sx + px, sy: sy + py, z, rot: q.rot, remapped: !!q.remapped };   // what the picture went through (engine/qa.js maps text and focus with it)
    o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
    o.save(); o.translate(W / 2 + sx + px, H / 2 + sy + py); o.rotate(q.rot); o.scale(z, z); o.translate(-W / 2, -H / 2); o.drawImage(src, 0, 0); o.restore();
  } else { MV.lastPost = { sx: 0, sy: 0, z: 1, rot: 0, remapped: !!q.remapped }; o.drawImage(src, 0, 0); }
  if (ovs && ovs.length && !MV.noOverlay) drawOverlays(o, ovs);   // MV.noOverlay: engine/qa.js looks at the picture without it
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
