// mv-kit — acting kit: the pose math that makes a code-drawn character move like a cartoon instead of a machine.
// Add "act" to project.kits. Renderer-agnostic: every function only returns numbers, so any character in any
// style (ink, cel, puppet, paper cut-out) can use it. Code moves every part at once, on one curve, by the same amount;
// these put back what an animator would: anticipation, squash and stretch, overshoot and settle, arcs, holds,
// follow-through, parts out of step.
//
// Conventions (what a character's draw function reads from a pose):
//   dx, dy   offsets in the character's own unit u (multiply by u). dy < 0 is up.
//   sq       squash: + squashes down, − stretches up. Keep the volume: [sx, sy] = ACT.squash(sq), scaled about the feet.
//   rot      lean in radians, about the feet.
//   aL, aR   arm angles in radians: 0 = straight out sideways, + up, − down (±1.5 ≈ vertical).
//   lookX/Y  where the eyes look, −1..1.
//   walk     a step phase (one unit = one step) for the legs, or null.
//   view     a drawn key view ('front', 'q', 'side', 'qback', 'back'), flip = face left. Turns step through drawings
//            (ACT.turn), never a 3D projection.
// Poses compose by spreading: { ...ACT.feel('happy', t), ...ACT.turn(t, 2, 2.2, 0, 0.25) }. When two of them move the
// same field (dy, sq), ADD them (ACT.add) instead of letting the later one replace the earlier.
// Pass f.tq (time held on the drawing, project.drawRate) for character acting, f.t for the camera.
//
// Beat-locked motion (ACT.move, the mood bodies) reads the song's real beat grid (MV.audio), so every idle and dance
// shares the song's pulse.
//
// Adapted from Claude Animation Base (MIT License, Copyright (c) 2026 John Heibel,
// https://github.com/JohnHeibel/ClaudeAnimationBase): jump, take, spring, ring, arc, walk, the mood bodies, the acted
// mood changes, the dance moves and the drawn turn. Re-timed to mv-kit's beat grid; ACT.poses, ACT.antic, ACT.lag,
// ACT.vary and ACT.add are mv-kit's. The animation principles behind them: docs/ENGINE.md «act.js», CLAUDE.md.
(function (G) {
'use strict';
const MV = G.MV;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const frac = x => x - Math.floor(x);
const backOut = x => ease.outBack(clamp(x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };

/** the beat at t: b = beat position (MV.audio's grid), f = phase in the beat, s1 = sin(bπ) (one swing per beat),
 *  ab = |s1| (one bounce per beat), s2 = sin(2πb), hit = 1 on the beat and decaying after */
function beat(t, phase = 0) {
  const b = (MV.audio ? MV.audio.beatAt(t) : t * 2) + phase, f = frac(b), s1 = Math.sin(b * Math.PI);
  return { b, f, s1, ab: Math.abs(s1), s2: Math.sin(b * TAU), hit: Math.exp(-f * 6), hit2: Math.exp(-frac(b * 2) * 6), n: Math.floor(b) };
}

const ACT = {
  beat,

  // ------------------------------------------------------------------ actions

  /** A jump from t0 (take-off) to t1 (landing), h units high: a crouch 0.12 s before (anticipation), a stretch on the way
   *  up and down, a squash on landing that springs back. → { dy, sq } */
  jump(t, t0, t1, h = 3) {
    if (t < t0 - 0.12) return { dy: 0, sq: 0 };
    if (t < t0) return { dy: 0, sq: 0.18 * smooth(seg(t, t0 - 0.12, t0)) };
    if (t < t1) { const k = (t - t0) / (t1 - t0); return { dy: -h * 4 * k * (1 - k), sq: -0.16 * Math.abs(1 - 2 * k) }; }
    const a = t - t1; return { dy: 0, sq: 0.22 * Math.exp(-8 * a) * Math.cos(20 * a) };
  },

  /** A surprise take peaking at t0: a quick squash, then a big stretch up that springs back. amt scales it. → { dy, sq } */
  take(t, t0, amt = 1) {
    if (t < t0 - 0.1) return { sq: 0, dy: 0 };
    if (t < t0) return { sq: 0.12 * amt * smooth(seg(t, t0 - 0.1, t0)), dy: 0 };
    const a = t - t0; return { sq: -0.26 * amt * Math.exp(-6 * a) * Math.cos(16 * a), dy: -1.2 * amt * Math.exp(-7 * a) * Math.max(0, Math.cos(9 * a)) };
  },

  /** Anticipation for any action at t0: 0 → 1 over dur before t0, gone 0.05 s after. Subtract it the opposite way:
   *  x = lerp(x0, x1, ease(…)) − 30 · ACT.antic(t, t0) (a wind-up before the throw, a lean back before the run). */
  antic(t, t0, dur = 0.18) { return t < t0 ? smooth(seg(t, t0 - dur, t0)) : 1 - seg(t, t0, t0 + 0.05); },

  /** A damped wobble after an event at t0 (settles, follow-through): 0 before t0, then decays from a kick. */
  spring(t, t0, k = 6, w = 18) { return t < t0 ? 0 : Math.exp(-k * (t - t0)) * Math.sin(w * (t - t0)); },
  /** One spring kick per event time: hits that each shake a hat, a sign, a tail. */
  ring(t, times, k = 6, w = 18) { return times.reduce((s, e) => s + ACT.spring(t, e, k, w), 0); },

  /** A point k (0..1) along a thrown arc from p0 to p1, h px high at the middle. */
  arc(p0, p1, h, k) { return [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)]; },

  /** Walk from x0 to x1 (px) between t0 and t1, `stride` px a step: eases in and out, bobs on each step.
   *  → { x, walk (step phase for the legs), moving, dir (±1), dy, view, flip } */
  walk(t, t0, t1, x0, x1, stride = 60) {
    const x = lerp(x0, x1, ease.inOutCubic(seg(t, t0, t1))), d = Math.abs(x - x0) / stride, moving = t > t0 && t < t1, dir = x1 < x0 ? -1 : 1;
    return { x, walk: d, moving, dir, dy: moving ? -Math.abs(Math.sin(d * Math.PI)) * 0.5 : 0, view: moving ? 'q' : 'front', flip: dir < 0 };
  },

  /**
   * Pose to pose, with holds: keys = [[t0, pose0], [t1, pose1, dur, ease], …]. Holds pose i−1 until t_i, then moves to
   * pose i in `dur` s (default 0.25) and holds it. Fast moves, held meanings — the opposite of keys(), which spends the
   * whole gap moving. Poses are numbers, arrays or objects of numbers. ease defaults to an overshoot (outBack).
   */
  poses(t, keys) {
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [ti, pi, dur = 0.25, e = ease.outBack] = keys[i];
      if (t < ti) break;
      v = mix(v, pi, e(clamp((t - ti) / dur)));
    }
    return v;
  },

  /** Follow-through: the value a trailing part (hat, ears, tail, hair) takes now = the main motion `lag` s ago. */
  lag(fn, t, lag = 0.08) { return fn(t - lag); },

  /** Per-character variation so a crowd is not a copy: { phase (beats), amp, lag (s), seed }. Feed phase to ACT.move
   *  / ACT.feel and lag to the times you pass, multiply the swings by amp. */
  vary(seed) { return { phase: (hash(seed, 11) - 0.5) * 0.24, amp: 0.85 + 0.3 * hash(seed, 12), lag: 0.06 * hash(seed, 13), seed }; },

  /** The scale for a squash, about the feet: [sx, sy] = [1 + 0.6·sq, 1 − sq] (wider as it flattens, thinner as it
   *  stretches: it keeps reading as the same mass). g.translate(feet); g.scale(sx, sy); then draw. */
  squash(sq) { const s = clamp(sq, -0.6, 0.6); return [1 + 0.6 * s, 1 - s]; },

  /** Add poses field by field (numbers add, everything else: the later one wins). ACT.add(mood, jump, { aR: 1 }). */
  add(...ps) {
    const o = {};
    for (const p of ps) for (const k in p) o[k] = typeof p[k] === 'number' && typeof o[k] === 'number' ? o[k] + p[k] : p[k];
    return o;
  },

  // ------------------------------------------------------------------ views

  /** The drawn key view for a heading a (in turns: 0 front, .25 facing right, .5 back, −.25 facing left). */
  view(a) {
    const K = [['front', 0], ['q', 0], ['side', 0], ['qback', 0], ['back', 0], ['qback', 1], ['side', 1], ['q', 1]];
    const [view, f] = K[((Math.round(a * 8) % 8) + 8) % 8]; return { view, flip: !!f };
  },
  /** A turn from heading a0 to a1 between t0 and t1 (0.12–0.25 s reads best): steps through the drawn views, with
   *  smear 0..1 on the in-between drawings. → { view, flip, smear } */
  turn(t, t0, t1, a0, a1) {
    const k = smooth(seg(t, t0, t1)), v = ACT.view(lerp(a0, a1, k));
    return { ...v, smear: t > t0 && t < t1 ? 0.55 * Math.sin(k * Math.PI) : 0 };
  },

  // ------------------------------------------------------------------ moods

  /**
   * Each mood is a way of moving (the character's own draw function supplies the face for the name): body(t, b) →
   * pose offsets, alive and locked to the beat (b = ACT.beat(t)). take = how big the reaction is on switching INTO it;
   * fade = its emote is a one-off. Add or replace moods per project: ACT.moods.smitten = { take: .7, body: … }.
   */
  moods: {
    neutral:    { take: .3, body: (t, b) => ({ dy: -.25 * b.ab, sq: .03 * b.hit, aL: .15 + .05 * b.s1, aR: .15 - .05 * b.s1 }) },
    happy:      { take: .6, emote: null, body: (t, b) => ({ dy: -1.2 * b.ab, sq: .1 * b.hit, aL: .4 + .4 * b.s1, aR: .4 - .4 * b.s1 }) },
    excited:    { take: 1, emote: 'spark', body: (t, b) => { const h = Math.abs(b.s2); return { dy: -2.4 * h, sq: .16 * b.hit2 - .06 * h, aL: 1 + .5 * Math.sin(b.b * TAU * 2), aR: 1 - .5 * Math.sin(b.b * TAU * 2) }; } },
    laugh:      { take: .8, body: t => { const c = Math.abs(Math.sin(t * TAU * 5)); return { dy: -.45 * c, sq: .08 * c - .04, rot: -.07 + .03 * Math.sin(t * TAU * 5), aL: -.35 + .12 * c, aR: -.35 + .12 * c }; } },
    love:       { take: .7, emote: 'heart', body: (t, b) => { const s = Math.sin(b.b * Math.PI / 2); return { rot: .08 * s, dx: .5 * s, dy: -.6 * b.ab, sq: .05 * b.hit, aL: -.1 + .15 * b.s1, aR: -.1 - .15 * b.s1 }; } },
    shy:        { take: .3, body: (t, b) => { const s = Math.sin(b.b * Math.PI / 2); return { lookX: -.7, lookY: .8, sq: .06, rot: -.05 + .02 * s, dx: .15 * s, aL: -.55 + .15 * Math.sin(t * TAU * 1.5), aR: -.6 - .12 * Math.sin(t * TAU * 1.5) }; } },
    proud:      { take: .5, emote: 'spark', body: (t, b) => ({ sq: -.1 - .03 * b.ab, dy: -.3 * b.hit, aL: -.9, aR: -.9, rot: .02 * b.s1 }) },
    smug:       { take: .4, body: (t, b) => { const s = Math.sin(b.b * Math.PI / 2); return { lookX: .4, rot: -.06 + .03 * s, dy: -.2 * b.ab, aL: -.5, aR: .5 + .15 * s }; } },
    relieved:   { take: .4, emote: 'sweat', body: (t, b) => { const br = Math.sin(t * TAU * .35); return { sq: .05 + .05 * br, dy: -.15 * b.ab, aL: -.7 + .1 * br, aR: -.7 + .1 * br }; } },
    sad:        { take: .3, emote: 'cloud', body: (t, b) => { const s = Math.sin(b.b * Math.PI / 4); return { sq: .08 + .02 * s, rot: .03 * s, aL: -.75, aR: -.75, lookY: .5 }; } },
    cry:        { take: .8, body: (t, b) => { const sob = Math.sin(b.f * Math.PI) * Math.exp(-b.f * 2); return { sq: .14 * sob - .02, dy: -.7 * sob, aL: .9 + .15 * Math.sin(t * TAU * 6), aR: .9 - .15 * Math.sin(t * TAU * 6), rot: .03 * b.s1 }; } },
    angry:      { take: .8, emote: 'anger', body: (t, b) => ({ dx: .1 * Math.sin(t * TAU * 18), sq: .12 * b.hit, aL: -.3 + .1 * b.hit, aR: -.3 + .1 * b.hit }) },
    furious:    { take: 1.2, emote: 'steam', body: (t, b) => ({ dx: .22 * Math.sin(t * TAU * 20), rot: .025 * Math.sin(t * TAU * 13), sq: .2 * b.hit, dy: -.8 * Math.sin(b.f * Math.PI) * (1 - b.f), aL: 1 + .2 * Math.sin(t * TAU * 9), aR: 1 - .2 * Math.sin(t * TAU * 9) }) },
    scared:     { take: 1.1, emote: 'sweat', body: t => ({ dx: .1 * Math.sin(t * TAU * 22), sq: -.06, aL: 1 + .08 * Math.sin(t * TAU * 17), aR: 1 + .08 * Math.sin(t * TAU * 19), lookX: .6 * Math.sign(Math.sin(t * 2.3)) }) },
    surprised:  { take: 1.3, emote: '!', fade: true, body: (t, b) => ({ sq: -.12, dy: -.3 - .15 * b.ab, aL: 1.1 + .05 * b.s2, aR: 1.1 - .05 * b.s2 }) },
    confused:   { take: .6, emote: '?', body: (t, b) => ({ rot: .1 * Math.sin(b.b * Math.PI / 4), aL: .1, aR: 1.5 + .15 * Math.sin(t * TAU * 3), dy: -.15 * b.ab }) },
    thinking:   { take: .4, emote: 'dots', body: (t, b) => ({ lookX: .5, lookY: -.8, rot: .05, aR: .9, aL: -.3 + .25 * Math.sin(b.f * Math.PI), dy: -.1 * b.ab }) },
    idea:       { take: 1.1, emote: 'bulb', body: (t, b) => ({ dy: -1 * b.ab, sq: -.05 + .1 * b.hit, aR: 1.55 + .1 * b.s2, aL: .2 + .2 * b.s1 }) },
    determined: { take: .7, body: (t, b) => { const p1 = Math.sin(b.f * Math.PI), p2 = Math.abs(Math.cos(b.f * Math.PI)); return { rot: .06, sq: -.04 + .06 * b.hit, dy: -.3 * b.ab, aL: .1 + .7 * p1, aR: .1 + .7 * p2 }; } },
    sleepy:     { take: .2, emote: 'zzz', body: t => { const br = Math.sin(t * TAU * .3); return { sq: .05 + .05 * br, rot: .06 * Math.sin(t * .8), aL: -.6, aR: -.6 }; } },
    bored:      { take: .2, body: (t, b) => { const f = frac(b.b / 4), sigh = f < .3 ? smooth(f / .3) : 1 - smooth((f - .3) / .7); return { lookX: -.3, lookY: .4, sq: .08 - .14 * sigh, rot: -.04, aL: -.85 + .05 * Math.sin(t * 2), aR: -.85 - .05 * Math.sin(t * 2) }; } },
    nervous:    { take: .5, emote: 'sweat', body: (t, b) => ({ lookX: b.n % 2 ? .8 : -.8, dx: .3 * b.s1, sq: .04, aL: -.1 + .2 * Math.sin(t * TAU * 5), aR: -.1 + .2 * Math.sin(t * TAU * 5 + 1) }) },
    suspicious: { take: .4, body: t => { const s = Math.sin(t * TAU * .25); return { lookX: s, rot: -.08 * s, dx: .4 * s, sq: .04, aL: -.4, aR: -.4 }; } },
    disgusted:  { take: .8, body: (t, b) => { const a = frac(b.b / 2) * 2 * (MV.audio ? 60 / (MV.audio.bpm || 120) : .5), sh = Math.exp(-a * 6) * Math.sin(a * 45); return { rot: -.1, dx: -.3 + .15 * sh, sq: .05, aL: .7 + .2 * sh, aR: .7 - .2 * sh }; } },
    dizzy:      { take: .7, emote: 'stars', body: t => { const a = t * TAU * .8; return { rot: .12 * Math.sin(a), dx: .7 * Math.sin(a), dy: -.3 * Math.abs(Math.cos(a)), aL: .3 + .6 * Math.sin(a * 1.3), aR: .3 - .6 * Math.sin(a * 1.3) }; } },
    cool:       { take: .4, emote: 'music', body: (t, b) => ({ rot: .04 * b.hit, dy: -.35 * b.hit, sq: .06 * b.hit, aL: -.4, aR: .7 + .1 * b.s1 }) },
    starstruck: { take: 1, emote: 'spark', body: (t, b) => { const h = Math.abs(b.s2); return { dy: -1.6 * h, sq: .1 * b.hit2, aL: 1.1 + .35 * Math.sin(b.b * TAU * 2), aR: 1.1 + .35 * Math.sin(b.b * TAU * 2) }; } },
    ko:         { take: 1, emote: 'stars', body: t => ({ sq: .28 + .02 * Math.sin(t * 3), rot: .12, aL: -1, aR: -.9 }) },
    playful:    { take: .6, body: (t, b) => { const side = b.n % 2 ? 1 : -1, k = lerp(-side, side, ease.outCubic(clamp(b.f * 3))); return { dx: .8 * k, dy: -1.4 * b.ab, rot: .1 * k, sq: .1 * b.hit, aL: .65 + .55 * k, aR: .65 - .55 * k }; } },
    mischief:   { take: .5, body: t => { const r = Math.sin(t * TAU * 4); return { lookX: .3, sq: .07, rot: .04, aL: -.05 + .15 * r, aR: -.05 - .15 * r, dy: -.1 * Math.abs(r) }; } },
    hopeful:    { take: .5, body: (t, b) => ({ sq: -.06 - .02 * b.ab, dy: -.25 * b.ab, lookY: -.4, aL: .5 + .05 * b.s1, aR: .5 - .05 * b.s1, rot: .03 * Math.sin(b.b * Math.PI / 2) }) },
  },

  /** One mood, alive at t: { mood, emote, ...body }. o.phase (beats) puts this character out of step with others. */
  feel(name, t, over = {}, o = {}) {
    const E = ACT.moods[name] || ACT.moods.neutral;
    return { mood: name, emote: E.emote || null, ...(E.body ? E.body(t, beat(t, o.phase || 0)) : {}), ...over };
  },

  /**
   * Acted mood changes: keys = [[t0, 'neutral'], [t1, 'surprised'], [t2, 'happy', { emote: null }]]. Never a snap:
   * just before each change the eyes squeeze shut and the body squashes (anticipation); the face swaps under the
   * squint; a take fires, sized to the new mood; the body settles into its new motion with overshoot; the new emote
   * pops in. → the pose plus { mood, prev, k (0..1: blend colours from prev to mood), squint (0..1: how closed the
   * eyes are), emote, emoteK (0..1 pop), emoteAge }. o.take scales every take, o.phase as in feel.
   */
  emotions(t, keys, o = {}) {
    let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const [tc, name, over] = keys[i], age = t - tc, cur = ACT.feel(name, t, over, o);
    const tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity, tkS = o.take ?? 1, E = ACT.moods[name] || ACT.moods.neutral;
    let squint = cur.squint || 0;
    if (tn - t < 0.1) squint = Math.max(squint, 1 - (tn - t) / 0.1);
    if (i > 0 && age < 0.14) squint = Math.max(squint, 1 - age / 0.14);
    const prev = i > 0 ? ACT.feel(keys[i - 1][1], t, keys[i - 1][2], o) : null;
    cur.prev = prev ? prev.mood : null;
    cur.k = prev ? smooth(seg(age, 0, 0.3)) : 1;
    if (prev && age < 0.5) {
      const base = { dy: 0, sq: 0, aL: 0.2, aR: 0.2, rot: 0, dx: 0, lookX: 0, lookY: 0 }, k = backOut(seg(age, 0, 0.4));
      for (const f in base) cur[f] = lerp(prev[f] ?? base[f], cur[f] ?? base[f], k);
    }
    // takes: the one this key fires, plus the anticipation squash of the next one
    const t1 = prev ? ACT.take(t, tc, (E.take ?? 0.6) * tkS) : { sq: 0, dy: 0 };
    const En = i + 1 < keys.length ? ACT.moods[keys[i + 1][1]] || ACT.moods.neutral : null, t2 = En ? ACT.take(t, tn, (En.take ?? 0.6) * tkS) : { sq: 0, dy: 0 };
    cur.sq = (cur.sq || 0) + t1.sq + t2.sq; cur.dy = (cur.dy || 0) + t1.dy + t2.dy;
    cur.squint = squint;
    // the emote pops in after the swap (it carries on if it didn't change); one-off emotes fade out
    const same = prev && prev.emote === cur.emote;
    cur.emoteK = same ? 1 : seg(age, 0.06, 0.32) * (E.fade && !(over && 'emote' in over) ? 1 - seg(age, 1.4, 1.8) : 1);
    cur.emoteAge = age;
    return cur;
  },

  // ------------------------------------------------------------------ dances

  /**
   * Beat-locked moves: bounce, hop, roof (arms up), sway, wave, walk, run, idle, stomp, shimmy, spin (through the drawn
   * views, once a bar), mix (changes every two bars). o.phase / o.amp (from ACT.vary) put a dancer out of step with the
   * others. → pose offsets.
   */
  move(style, t, o = {}) {
    const b = beat(t, o.phase || 0), amp = o.amp ?? 1, bp = b.b, bf = b.f, hit = Math.max(0, 1 - bf * 3.5), s1 = b.s1, ab = b.ab;
    const p = { dy: 0, sq: 0, aL: 0.2, aR: 0.2, rot: 0, walk: null, dx: 0 };
    if (style === 'mix') style = ['bounce', 'roof', 'sway', 'spin', 'hop', 'wave'][(Math.floor(bp / 8) + (o.seed || 0)) % 6];
    switch (style) {
      case 'bounce': p.dy = -ab * 1.6; p.sq = hit * 0.12; p.aL = 0.4 + s1; p.aR = 0.4 - s1; break;
      case 'hop': p.dy = -ab * 4; p.sq = hit * 0.18; p.aL = p.aR = 0.3 + ab * 1.1; break;
      case 'roof': p.dy = -ab * 1.2; p.sq = hit * 0.1; p.aL = p.aR = 1.25 + 0.3 * Math.sin(bp * TAU); break;
      case 'sway': p.dx = s1 * 3; p.rot = s1 * 0.12; p.aL = 0.5 + 0.6 * s1; p.aR = 0.5 - 0.6 * s1; p.sq = hit * 0.08; break;
      case 'spin': {
        const ph = (((b.n % 4) + 4) % 4 === 3) ? bf : 0;
        Object.assign(p, ACT.view(ph)); p.smear = ph > 0.1 && ph < 0.9 ? 0.5 : 0;
        p.dy = -Math.sin(ph * Math.PI) * 3 - ab; p.aL = p.aR = 0.6 + ph; p.sq = hit * 0.1; break;
      }
      case 'wave': p.dy = -ab; p.aL = 1.1 + 0.5 * Math.sin(bp * TAU * 2); p.aR = -0.2; p.sq = hit * 0.08; break;
      case 'walk': p.walk = bp / 2; p.dy = -ab * 0.6; p.aL = 0.3 * s1; p.aR = -p.aL; break;
      case 'run': p.walk = bp * 1.5; p.dy = -Math.abs(Math.sin(bp * TAU)); p.aL = 0.8 * Math.sin(bp * TAU * 1.5); p.aR = -p.aL; p.rot = -0.08; break;
      case 'idle': p.dy = -ab * 0.5; p.sq = hit * 0.05; break;
      case 'stomp': p.dy = -Math.max(0, Math.sin(bp * TAU)) * 1.4; p.sq = hit * 0.2; p.rot = (b.n % 2 ? 1 : -1) * 0.06 * hit; p.aL = p.aR = -0.3 + hit * 0.9; break;
      case 'shimmy': p.dx = Math.sin(bp * TAU * 2) * 0.6; p.rot = Math.sin(bp * TAU * 2) * 0.05; p.aL = 0.9 + 0.4 * Math.sin(bp * TAU * 2); p.aR = 0.9 - 0.4 * Math.sin(bp * TAU * 2); p.dy = -ab * 0.5; break;
    }
    if (amp !== 1) for (const k of ['dy', 'dx', 'rot', 'sq']) p[k] *= amp;
    return p;
  },
};

/** blend two poses (numbers, arrays, or objects of numbers; other values switch at the half) */
function mix(a, b, k) {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, k);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => mix(v, b[i], k));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const o = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) o[key] = key in a && key in b ? mix(a[key], b[key], k) : (key in b ? b[key] : a[key]);
    return o;
  }
  return k < 0.5 ? a : b;
}
ACT.mix = mix;

G.ACT = ACT;
})(window);
