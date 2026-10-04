// ds.js — the shared language of this film. Everything here is used by every scene, so the shot list reads as one
// continuous piece: one palette ramp, one camera grammar, one way of landing on the beat, one type system.
//
// The law of the film (kits/lumen.js): there are no surfaces, only light. Nothing is filled; things are drawn as
// point clouds and thin lines that add up until the dense places burn white. Video: a frame depends only on f.t.
//
//   const d = dsFrame(f, 'ice');            // palette + drum envelope + camera + lookups for this frame
//   dsLight(d, wire, { yaw: .5, dist: 6 }); // palette + point cloud + lines + bloom, all in one call
//   dsTele(g, d, { id: 'c07', name: 'eye' }); // corner read-out, on whichever palette is live
//   dsLyric(g, d);                          // this sentence, in whichever mode the shot is set to
//   return dsFin(d, { shake: 4 * d.kick }); // post: shake / flash / glitch, and the house grain
//
// A shot that only has 6 s to make its point still has to obey three things: the palette of its chapter, the
// camera move that the cut before it set up, and the lyric word that just got sung.

// ---------------------------------------------------------------- palette

// dsPal('ice')            → the kit palette
// dsPal('ice', {accent})  → the same palette with one key overridden for this shot
// dsPal('ice → ember', k) → the palette crossfaded k of the way to another one
function dsPal(name, over) {
  if (name && typeof name === 'object') return name;
  const ramp = String(name || 'ice').split('→');
  let p = Object.assign({}, lmPal(ramp[0].trim()));
  if (ramp[1]) p = dsMixPal(p, lmPal(ramp[1].trim()), over == null ? 1 : over);
  return over && typeof over === 'object' ? Object.assign(p, over) : p;
}

function dsHex(c) {
  if (Array.isArray(c)) return `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;
  const h = String(c).replace('#', '');
  const f = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  return `rgb(${parseInt(f.slice(0, 2), 16)},${parseInt(f.slice(2, 4), 16)},${parseInt(f.slice(4, 6), 16)})`;
}

// Blend two palettes (for the shots that change colour mid-scene).
// Only numbers and '#rrggbb' colours are interpolated; everything else — `mode` above all, which is the string
// 'light' or 'ink' — comes from the destination. Mixing that string character by character yields 'lighe', which
// kits/lumen.js does not recognise, and every colour in the frame collapses to near-black.
function dsMixPal(a, b, k) {
  const o = {};
  for (const key of Object.keys(a)) {
    const x = a[key], y = b[key] === undefined ? x : b[key];
    if (typeof x === 'number' && typeof y === 'number') o[key] = lerp(x, y, k);
    else if (typeof x === 'string' && typeof y === 'string' && x[0] === '#' && y[0] === '#') o[key] = dsMixHex(x, y, k);
    else o[key] = k >= 0.5 ? y : x;
  }
  return o;
}

// '#rrggbb' a fraction k of the way from a to b.
function dsMixHex(a, b, k) {
  const f = (v) => { const h = String(v).replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); };
  const p = f(a), q = f(b);
  return '#' + p.map((v, i) => Math.round(lerp(v, q[i], k)).toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- trigger points from the analysis

// Real onsets of a drum from data/audio.json. The decaying f.a.kick / f.a.snare are for shaking the frame; these
// are for firing something once, at the sample-accurate time the hit happened.
function dsEvents(f, kind, t0, t1) { return f.audio.events(kind, t0, t1); }
// 1 → 0 over `len` seconds. `p` is the f.a.* value already, so dsHit(f.a.kick, .12) is the same thing spelled out.
function dsHit(v, len) { return len ? clamp(v) : clamp(v); }
// Where we are inside a hit of length `len` starting at `at`: 1 at the hit, 0 after it, 0 before.
function dsPulse(t, at, len) { return pulse(t, at, len); }
// The last hit at or before t (never a negative index). dsStep(f, 'kick', .3) → an index that goes up on every hit.
function dsStep(f, kind, win) {
  const ev = f.audio.events(kind, f.t - (win || 0.4), f.t);
  return ev.length ? ev[ev.length - 1].t : -1;
}
// Time since the most recent hit (seconds, capped at `cap`).
function dsSince(f, kind, cap) {
  const t0 = dsStep(f, kind, cap || 0.5);
  return t0 < 0 ? 99 : Math.max(0, f.t - t0);
}

// ---------------------------------------------------------------- motion grammar

// dsIn(d, 0.0, 0.4)  → 0..1 over 0.4 s from the start of the shot, eased out (the house entrance)
function dsIn(d, t0, dur, e) { return prog(d.t, t0, t0 + dur, e || ease.outCubic); }
// Same, but relative to the end of the shot: dsOut(d, .3) → 0 at .3 s before the cut, 1 at the cut.
function dsOut(d, dur, e) { return 1 - prog(d.t, d.to - dur, d.to, e || ease.inCubic); }
// Per-item delay: dsEach(i, n, f.lt, 0, 1.2) → 0..1 for item i, staggered across n items sharing a 1.2 s window.
function dsEach(i, n, t, t0, dur, spread, e) {
  const sp = spread == null ? 0.55 : spread;
  const s = n > 1 ? (i / (n - 1)) * sp * dur : 0;
  const rest = Math.max(1e-3, dur * (1 - sp));
  return prog(t, t0 + s, t0 + s + rest, e || ease.outCubic);
}
// A hard body-shake for the frame: continuous kick component + a slow handheld drift. Never a random number.
function dsShake(d, amp, seed) {
  const s = seed == null ? 7 : seed;
  const hx = noise1(d.t * 23, s) + noise1(d.t * 61, s + 3) * 0.5;
  const hy = noise1(d.t * 27, s + 9) + noise1(d.t * 69, s + 11) * 0.5;
  const slow = [noise1(d.t * 0.7, s + 21) * 3, noise1(d.t * 0.9, s + 22) * 2];
  return [hx * amp * 1.4 + slow[0] + d.kick * amp * 1.6, hy * amp * 1.2 + slow[1] + d.snare * amp * 0.9];
}
// Camera jolt on the kick/snare — the "everything on screen twitches" rule.
function dsJolt(d, amp) { return (d.kick * 1.0 + d.snare * 0.6) * amp; }

// ---------------------------------------------------------------- text (Canvas 2D)

// Faithful font stacks. The pdoom-akari embedding provides DotGothic16; the rest fall back to system faces, which
// is deliberate — the numbers and the terminal are crisp on any machine, the display type gets the pixel face.
const dsMono = (px, w) => `${w || 400} ${px}px "JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace`;
const dsSans = (px, w) => `${w || 300} ${px}px "Helvetica Neue", "PingFang SC", "Noto Sans CJK SC", sans-serif`;
const dsDot = (px, w) => `${w || 400} ${px}px "DotGothic16", "Osaka", Menlo, monospace`;
const DS_GLYPH = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFXZ#%*+=<>/\\|';

// A soft glow on text. Only ever used on small areas (Canvas 2D shadowBlur is expensive full-screen).
function dsGlow(g, color, r) { g.shadowColor = color; g.shadowBlur = r; }
function dsNoGlow(g) { g.shadowBlur = 0; g.shadowColor = 'transparent'; }

// Auto-fit a line of text to a pixel width. Returns the font size that fits (never above `max`).
function dsFit(g, text, maxW, font, size0, min) {
  let s = size0;
  for (let i = 0; i < 24; i++) { g.font = font(s); if (g.measureText(text).width <= maxW || s <= (min || 14)) break; s *= 0.94; }
  return Math.max(min || 14, Math.round(s));
}

// Wrap `text` to `maxW` px with the font currently set on g. Respects existing newlines.
function dsWrap(g, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const try_ = line ? line + ' ' + w : w;
      if (g.measureText(try_).width > maxW && line) { out.push(line); line = w; } else line = try_;
    }
    if (line) out.push(line);
  }
  return out;
}

// Draw a line centred at x with a soft glow; `alpha`, `size`, `track` (extra letter spacing) are options.
function dsLine(g, text, x, y, o) {
  o = o || {};
  const size = o.size || 34;
  g.save();
  g.font = o.font || dsMono(size, o.weight || 500);
  g.textBaseline = o.base || 'middle';
  g.textAlign = o.align || 'center';
  g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.glow !== 0) dsGlow(g, o.glowColor || 'rgba(255,255,255,.6)', o.glow == null ? size * 0.42 : o.glow);
  g.fillStyle = o.color || 'rgba(255,255,255,.92)';
  if (o.track) {
    const chars = [...text], ws = chars.map(c => g.measureText(c).width), total = ws.reduce((a, b) => a + b, 0) + o.track * (chars.length - 1);
    let cx = g.textAlign === 'center' ? x - total / 2 : g.textAlign === 'right' ? x - total : x;
    g.textAlign = 'left';
    chars.forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + o.track; });
  } else g.fillText(text, x, y);
  g.restore();
  return g;
}

// A word drawn as pixels inside a point cloud: the hook punchline, the "AGI" title, the terminal boot text.
// Cached per (text, weight, scale) — sampling is the expensive part, drawing it is one drawImage.
const DS_TEXT_CACHE = {};
function dsTextPoints(text, n, o) {
  o = o || {};
  const key = text + '|' + (o.weight || 700) + '|' + (o.scale || 1) + '|' + (o.font || '') + '|' + n;
  if (DS_TEXT_CACHE[key]) return DS_TEXT_CACHE[key];
  const cache = DS_TEXT_CACHE[key] = {};
  const build = () => {
    const size = 200, PAD = 24;
    const m = mk(8, 8).getContext('2d');
    const font = o.font || dsSans(size, o.weight || 700);
    m.font = font;
    const lines = String(text).split('\n'), lh = size * 1.15;
    const tw = Math.max.apply(null, lines.map(l => m.measureText(l).width));
    const c = mk(Math.ceil(tw + PAD * 2), Math.ceil(lh * lines.length + PAD * 2));
    const q = c.getContext('2d');
    q.font = font; q.textBaseline = 'middle'; q.textAlign = 'center'; q.fillStyle = '#fff';
    lines.forEach((l, i) => q.fillText(l, c.width / 2, PAD + lh * (i + 0.5)));
    const im = q.getImageData(0, 0, c.width, c.height).data;
    const hits = [];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (im[(y * c.width + x) * 4 + 3] > 140) hits.push(x, y);
    cache.hits = hits; cache.w = c.width; cache.h = c.height; cache.size = size;
  };
  if (!cache.hits) build();
  const cnt = cache.hits.length / 2;
  const P = new Float32Array(n * 3), rnd = mulberry32(1234 + text.length);
  const sc = (o.scale || 1);
  for (let i = 0; i < n && cnt; i++) {
    const j = Math.floor(rnd() * cnt);
    P[i * 3] = ((cache.hits[j * 2] + rnd() - cache.w / 2) / cache.size) * sc;
    P[i * 3 + 1] = (-(cache.hits[j * 2 + 1] + rnd() - cache.h / 2) / cache.size) * sc;
    P[i * 3 + 2] = (rnd() - 0.5) * (o.depth == null ? 0.02 : o.depth) * sc;
  }
  return P;
}

// ---------------------------------------------------------------- light

// The one call that makes a lumen frame. Returns nothing; draws the background, the light, and the bloom.
//   dsLight(d, seg, { yaw, pitch, dist, roll, shift, glow })            — lines only
//   dsLight(d, [cloud, seg], { ... })                                   — points + lines, same camera
// Points entries: { P, size, gain, color, colors, sizes, dof, focus, fog, twinkle, drift, count, model }
function dsLight(d, content, o) {
  o = o || {};
  const cam = o.cam || dsCam(d, o);
  lmBegin(d.pal);
  const list = Array.isArray(content) ? content : [content];
  for (const it of list) {
    if (!it) continue;
    if (it.S || it.isSeg) lmLines(cam, it.S || it, Object.assign({}, it.o || {}, it.dyn ? { dynamic: true } : {}));
    else lmPoints(cam, it.P || it, it.o || {});
  }
  lmEnd(d.g, o.end || {});
  return cam;
}

// The camera all shots share: an orbit with a slow drift and a beat accent, so cuts match even between scenes.
function dsCam(d, o) {
  o = o || {};
  const t = d.t, lt = d.lt;
  const yaw = (o.yaw == null ? 0.4 : o.yaw) + (o.spin == null ? 0 : t * o.spin) + noise1(t * 0.31, o.seed || 3) * (o.wobble == null ? 0.012 : o.wobble);
  const pitch = (o.pitch == null ? 0.2 : o.pitch) + noise1(t * 0.27, (o.seed || 3) + 5) * 0.01;
  const dist = (o.dist == null ? 5 : o.dist) * (1 - dsJolt(d, o.punch == null ? 0 : o.punch));
  return lmOrbit({ yaw, pitch, roll: o.roll || 0, dist, fov: o.fov || 36, target: o.target || [0, 0, 0], shift: o.shift || [0, 0], focus: o.focus });
}

// Screen-space point cloud (pixel coordinates) — diagrams, HUD graphs, and anything that must not be perspective
// distorted. `pts` is [[x, y, z?], …]; z is used for depth of field only.
function dsScreenPoints(pts, gain) {
  const P = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => { P[i * 3] = p[0] - W / 2; P[i * 3 + 1] = H / 2 - (p[1] || 0); P[i * 3 + 2] = p[2] || 0; });
  return { P, o: { size: 1.6, gain: gain == null ? 0.8 : gain, blur: 0.4, color: 'accent' } };
}

// Screen-space polyline → segment buffer for lmLines with lmScreen(). Returns a valid buffer even for < 2 points.
function dsScreenSeg(pts, o) {
  o = o || {};
  const z = o.z || 0, b = o.bright == null ? 1 : o.bright, n = Math.max(0, pts.length - 1);
  const S = new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    const a = pts[i], c = pts[i + 1], k = i * 8;
    S[k] = a[0] - W / 2; S[k + 1] = H / 2 - a[1]; S[k + 2] = a[2] == null ? z : a[2];
    S[k + 3] = c[0] - W / 2; S[k + 4] = H / 2 - c[1]; S[k + 5] = c[2] == null ? z : c[2];
    S[k + 6] = b; S[k + 7] = i === 0 ? 1 : 0;
    if (i === n - 1) S[k + 7] += 2;
  }
  S.isSeg = true;
  return S;
}

// A drawn-on polyline: returns the whole segment buffer plus `upto` you pass to lmLines. Used for graphs, traces,
// growth curves — anywhere a line has to be written by the music rather than exist all at once.
function dsTrace(pts, k, o) {
  o = o || {};
  const n = Math.max(2, pts.length), upto = clamp(k);
  const S = dsScreenSeg(pts, o);
  return { S, o: Object.assign({ width: o.width || 1.6, glow: o.glow == null ? 0.3 : o.glow, color: o.color || 'accent', upto }, o.line || {}) };
}

// Vertical bars (a spectrum, a training-loss histogram, a token budget) in screen space.
function dsBars(x, y, w, h, vals, o) {
  o = o || {};
  const n = vals.length, gap = o.gap == null ? 3 : o.gap, bw = (w - gap * (n - 1)) / n;
  const col = o.color || 'accent';
  const S = new Float32Array(n * 8 * 3);
  let k = 0;
  vals.forEach((v, i) => {
    const bx = x + i * (bw + gap), bh = Math.max(1, h * clamp(v, 0, 1) * (o.gain == null ? 1 : o.gain));
    const br = o.bright == null ? 1 : o.bright;
    const push = (x0, y0, x1, y1, b) => { S[k++] = x0 - W / 2; S[k++] = H / 2 - y0; S[k++] = 0; S[k++] = x1 - W / 2; S[k++] = H / 2 - y1; S[k++] = 0; S[k++] = b; S[k++] = 0; };
    // a 4-sided outline drawn as 4 segments: reads as a hairline box at any size
    push(bx, y, bx + bw, y, br); push(bx + bw, y, bx + bw, y - bh, br);
    push(bx + bw, y - bh, bx, y - bh, br); push(bx, y - bh, bx, y, br);
  });
  const out = { S: S.slice(0, k), isSeg: true, o: { width: o.width || 1, color: col, gain: o.lineGain == null ? 0.9 : o.lineGain, glow: o.lineGlow == null ? 0.25 : o.lineGlow, fog: 0 } };
  // and the filled body as a thin point cloud so dense bars actually glow
  const P = [];
  vals.forEach((v, i) => {
    const bx = x + i * (bw + gap), bh = Math.max(1, h * clamp(v, 0, 1));
    const cnt = Math.round(clamp(v) * (o.dots || 60));
    const r = mulberry32(900 + i);
    for (let j = 0; j < cnt; j++) P.push([bx + r() * bw, y - r() * bh]);
  });
  out.dots = P.length ? dsScreenPoints(P, o.dotGain == null ? 0.7 : o.dotGain) : null;
  return out;
}

// Horizontal scan lines across a band of the frame — CRT texture, cheap and only where you need it.
// `alive` 0..1: how much of the band is powered; `phase` scrolls the line pattern.
function dsScan(g, x, y, w, h, o) {
  o = o || {};
  const step = o.step || 3, a = o.alpha == null ? 0.12 : o.alpha, alive = o.alive == null ? 1 : clamp(o.alive);
  if (alive <= 0.001) return;
  g.save();
  g.fillStyle = o.color || 'rgba(190,225,235,1)';  const off = ((o.phase || 0) * step * 2) % (step * 2);
  for (let yy = y - step * 2 + off; yy < y + h; yy += step * 2) {
    const k = clamp((yy - y) / 40) * clamp((y + h - yy) / 40) * alive * a;
    if (k <= 0.002) continue;
    g.globalAlpha = k;
    g.fillRect(x, yy, w, 1);
  }
  g.restore();
}

// A blurred copy of the light layer for the "afterimage" look. Cached, because it is a full-frame blur.
let _dsGhost = null, _dsGhostG = null;
function dsGhost(g, o) {
  if (!_dsGhost) { _dsGhost = mk(W, H); _dsGhostG = _dsGhost.getContext('2d'); }
  _dsGhostG.clearRect(0, 0, W, H);
  _dsGhostG.filter = `blur(${(o && o.blur) || 6}px)`;
  _dsGhostG.drawImage(g.canvas, 0, 0);
  _dsGhostG.filter = 'none';
  g.save();
  g.globalCompositeOperation = (o && o.mode) || 'lighter';
  g.globalAlpha = (o && o.alpha) == null ? 0.5 : o.alpha;
  g.drawImage(_dsGhost, 0, 0);
  g.restore();
}

// ---------------------------------------------------------------- per-frame context

// dsFrame(f, 'ice', {over}) → everything a shot needs, computed once. Keep this call at the top of render().
function dsFrame(f, palette, over) {
  const pal = dsPal(palette, over);
  const d = {
    f, t: f.t, lt: f.lt, p: f.p, dur: f.dur, from: f.from, to: f.to, g: null,
    pal, palName: typeof palette === 'string' ? palette : 'custom',
    beat: f.beat, beatPhase: f.beatPhase, bar: f.bar, barPhase: f.barPhase, tick: f.tick, tq: f.tq,
    sec: f.section, audio: f.audio, lyrics: f.lyrics,
    rms: f.a.rms, low: f.a.low, mid: f.a.mid, high: f.a.high,
    kick: f.a.kick, snare: f.a.snare, hat: f.a.hat, onset: f.a.onset,
    // the sung line right now (or null) and the next one — the shot list is built on these two
    line: dsLineAt(f, f.t), next: dsLineAt(f, f.t, 1),
  };
  d.idx = d.line ? d.line.i : -1;
  d.inSec = d.sec ? d.sec.name : '';
  d.energy = d.sec ? d.sec.energy : 0.5;
  // section progress 0..1 — most chapters change palette at a section head, this is what you ease on
  d.secP = d.sec ? clamp((f.t - d.sec.start) / Math.max(0.001, d.sec.end - d.sec.start)) : 0;
  return d;
}

// The lyric line at t (offset 0) or the next one after it (offset 1). Never hardcode a time for a lyric.
function dsLineAt(f, t, offset) {
  const lines = f.lyrics.lines;
  let cur = null;
  for (let i = 0; i < lines.length; i++) if (lines[i].words.length && lines[i].start <= t) cur = lines[i];
  if (!offset) return cur;
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].words.length && lines[i].start > t) { seen++; if (seen >= offset) return lines[i]; }
  }
  return null;
}

// Lyric word progress within a line: 0..1 across the line's sung span. Handy for per-word reveals.
function dsWordP(line, t) { return line ? clamp((t - line.start) / Math.max(0.001, line.end - line.start)) : 0; }
// Which word index of the line is being sung at t (-1 before it starts).
function dsWordIdx(line, t) {
  if (!line) return -1;
  let k = -1;
  line.words.forEach((w, i) => { if (t >= w.start) k = i; });
  return k;
}

// ---------------------------------------------------------------- the light layer of a scene

// Every scene builds its geometry once, in init(), into these three buffers. This is the only allocation the shot
// does; render() then just draws them with different cameras and gains.
function dsField(o) {
  o = o || {};
  return {
    cloud: o.cloud || new Float32Array(0),
    wire: o.wire || new Float32Array(0),
    dots: o.dots || new Float32Array(0),
    cols: o.cols || null,
    sizes: o.sizes || null,
  };
}

// Push a point cloud through a model transform once, at init (rotation baked into the geometry).
function dsXf(P, model) {
  const out = new Float32Array(P.length);
  for (let i = 0; i < P.length; i += 3) out.set(lmXf(model, [P[i], P[i + 1], P[i + 2]]), i);
  return out;
}

// Scale/offset a point cloud in place-ish (returns a new array; used to lay out repeated motifs).
function dsScale(P, k, off) {
  const out = new Float32Array(P.length);
  for (let i = 0; i < P.length; i += 3) {
    out[i] = P[i] * k + ((off && off[0]) || 0);
    out[i + 1] = P[i + 1] * k + ((off && off[1]) || 0);
    out[i + 2] = P[i + 2] * k + ((off && off[2]) || 0);
  }
  return out;
}

// A drifting dust field: the film is never empty, there is always something in the air.
// i-th point orbits its own position; deterministic in t.
function dsDust(n, r, o) {
  o = o || {};
  const P = LG.ball(n, r, { seed: o.seed || 17 });
  return P;
}

// The house "air": slow drifting dust with per-point twinkle. Returns the draw descriptor for dsLight.
function dsAir(d, P, o) {
  o = o || {};
  return { P, o: { size: o.size || 1.1, gain: o.gain == null ? 0.35 : o.gain, dof: o.dof || 26, drift: o.drift == null ? 0.06 : o.drift, t: d.t, twinkle: o.twinkle == null ? 0.5 : o.twinkle, color: o.color || 'dim', count: o.count } };
}

// ---------------------------------------------------------------- typography blocks

// The film's read-out. Every shot calls this exactly once: corner frame + shot id + right-hand telemetry rows.
// Keeping it identical everywhere is what makes 48 shots feel like one machine.
function dsTele(g, d, o) {
  o = o || {};
  const rows = typeof o.rows === 'function' ? o.rows(d) : o.rows;
  const pal = d.pal;
  lmHud(g, d.f, {
    pal,
    id: o.id == null ? '' : o.id,
    name: o.name || (d.f.params && d.f.params.tag) || '',
    time: d.t,
    rows,
    foot: o.foot,
    on: o.on == null ? 1 : o.on,
    corners: o.corners,
  });
}

// This sentence's lyrics, in the mode the shot asks for. Modes:
//   'terminal'  bottom-left prompt, typed word by word, history scrolls up        (default)
//   'caption'   centred at the bottom, words fade in and lift
//   'big'       huge tracked-out letters, glitch/decode, for hooks
//   'slam'      words punched in one at a time, oversized, with a colour split
//   'column'    stacked right-aligned lines, for quiet sections
// The word that is being sung is always the brightest thing in the block.
function dsLyric(g, d, o) {
  o = o || {};
  const mode = o.mode || 'terminal';
  const line = d.line;
  const pal = d.pal;
  if (mode === 'terminal') {
    lmTerminal(g, d.f, { pal, size: o.size || 27, x: o.x || 110, y: o.y || H - 148, rows: o.rows || 3, commit: o.commit || 1.0, status: o.status, since: o.since });
    return;
  }
  if (!line && !o.keep) return;
  const col = (k) => dsHex(pal[k] || k);
  if (mode === 'caption') {
    lmCaption(g, d.f, { pal, size: o.size, y: o.y, since: o.since, track: o.track });
    return;
  }
  const words = line ? line.words : [];
  const n = words.length;
  const size = o.size || 76;
  const k = dsWordIdx(line, d.t);
  g.save();
  g.textBaseline = 'middle';
  if (mode === 'big') {
    dsLine(g, line ? line.text : '', o.x || W / 2, o.y || H - 210, {
      font: o.font || dsSans(size, 200), size, track: o.track == null ? size * 0.14 : o.track,
      color: col(o.color || 'fg'), glow: size * 0.16, alpha: o.alpha == null ? 1 : o.alpha, align: o.align || 'center',
    });
    g.restore();
    return;
  }
  if (mode === 'slam') {
    // each word punched in at its own start time; the live word is offset in the accent colour
    const pos = dsSlamLayout(g, words, o.font || dsSans(size, 200), size, o.track == null ? size * 0.1 : o.track, o.x || W / 2, o.y || H * 0.58);
    words.forEach((w, i) => {
      const a = prog(d.t, w.start, w.start + 0.13, ease.outExpo);
      if (a <= 0) return;
      const live = i === k;
      const pop = live ? 1 + 0.06 * (1 - clamp((d.t - w.start) / 0.22)) : 1;
      const dx = (1 - a) * 26 * (hash(i, 3) - 0.5) * 2, dy = (1 - a) * 18;
      const ghost = live && o.split !== false;
      if (ghost) {
        dsLine(g, w.w, pos[i] + 5, (o.y || H * 0.58) + dy, { font: o.font || dsSans(size * pop, 200), size, color: col('warn'), glow: size * 0.1, alpha: a * 0.5, align: 'left' });
        dsLine(g, w.w, pos[i] - 5, (o.y || H * 0.58) + dy, { font: o.font || dsSans(size * pop, 200), size, color: col('accent'), glow: size * 0.1, alpha: a * 0.5, align: 'left' });
      }
      dsLine(g, w.w, pos[i] + dx, (o.y || H * 0.58) + dy, {
        font: o.font || dsSans(size * pop, 200), size, color: live ? col(o.live || 'hot') : col(o.color || 'fg'),
        glow: size * (live ? 0.2 : 0.07), alpha: a * (live ? 1 : 0.82), align: 'left',
      });
    });
    g.restore();
    return;
  }
  if (mode === 'column') {
    const y = o.y || H * 0.5, lh = size * 1.5;
    const lines = [];
    let cur = line;
    for (let i = 0; i < (o.rows || 3) && cur; i++) { lines.push(cur); cur = dsLineAt(d.f, cur.end + 0.05, 1); }
    lines.forEach((ln, r) => {
      const live = ln === line;
      dsLine(g, ln.text, (o.x || W - 150), y + r * lh, { font: o.font || dsSans(size, 300), size, color: live ? col('hot') : col('dim'), glow: live ? size * 0.3 : 0, alpha: live ? 1 : 0.55, align: 'right' });
    });
    g.restore();
    return;
  }
  g.restore();
}

// Where each word of a line sits when it is laid out centred at x. Shared by slam / per-word reveals.
function dsSlamLayout(g, words, font, size, track, x, y) {
  g.save(); g.font = font;
  const ws = words.map(w => g.measureText(w.w).width + track);
  const total = ws.reduce((a, b) => a + b, 0) - track;
  g.restore();
  let cx = x - total / 2;
  return words.map((w, i) => { const p = cx; cx += ws[i]; return p; });
}

// ---------------------------------------------------------------- post

// House post: a little grain, a vignette that is part of the palette, and whatever the shot asks for.
// Pass shake as a number or [x, y]; glitch only ever on a hit.
function dsFin(d, o) {
  o = o || {};
  // Post values land in a shader, so a runaway number here is a white frame (a NaN or a 1e12 chromatic
  // aberration reads as garbage). Clamp at the boundary: everything here is 0..1 or a small pixel count.
  const n1 = (v) => (isFinite(v) ? clamp(v, 0, 1) : 0);
  const out = { grain: o.grain == null ? 0.035 : clamp(o.grain, 0, 0.2), vignette: o.vignette == null ? 0 : clamp(o.vignette, 0, 1) };
  if (o.shake) out.shake = Array.isArray(o.shake) ? [clamp(o.shake[0], -60, 60), clamp(o.shake[1], -60, 60)] : clamp(isFinite(o.shake) ? o.shake : 0, -60, 60);
  if (o.flash) { out.flash = n1(o.flash); out.flashColor = o.flashColor || '235,248,255'; }
  if (o.glitch) out.glitch = n1(o.glitch);
  if (o.fade) { out.fade = n1(o.fade); out.fadeColor = o.fadeColor; }
  if (o.invert) out.invert = n1(o.invert);
  if (o.zoom && isFinite(o.zoom)) out.zoom = clamp(o.zoom, 0.2, 5);
  if (o.rot && isFinite(o.rot)) out.rot = clamp(o.rot, -0.6, 0.6);
  return out;
}

// The house fade-in/fade-out on a shot that opens or closes the film (not the cross-fade kind: this one goes to
// black under its own light, which reads as the machine powering up).
function dsRise(d, up, down) {
  const a = up ? prog(d.lt, 0, up, ease.outCubic) : 1;
  const b = down ? 1 - prog(d.lt, d.dur - down, d.dur, ease.inCubic) : 1;
  return a * b;
}

// A palette colour as a CSS string, with alpha. dsTone(d, 'accent', .6) — use this everywhere instead of hex.
function dsTone(d, key, a) {
  const v = d.pal[key] === undefined ? key : d.pal[key];
  const rgb = dsHex(v).match(/\d+/g).map(Number);
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a == null ? 1 : a})`;
}

// Speed lines: radial streaks from a focus, drawn as short segments in screen space. The "acceleration" motif.
function dsSpeed(x, y, n, r0, r1, o) {
  o = o || {};
  const S = [], rnd = mulberry32(o.seed || 5), len = o.len == null ? 22 : o.len, z = o.z || 6;
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, rr = r0 + rnd() * (r1 - r0), L = len * (0.5 + rnd());
    S.push([[x + Math.cos(a) * rr, H / 2 - (y + Math.sin(a) * rr), z],
            [x + Math.cos(a) * (rr + L), H / 2 - (y + Math.sin(a) * (rr + L)), z]]);
  }
  return { S: LG.pairs(S, {}), isSeg: true, o: { width: o.width || 1, color: o.color || 'accent', gain: o.gain == null ? 0.5 : o.gain, glow: 0.2, blur: 1.2 } };
}

// A ring of points whose radius is written by the music (the "expanding shockwave" the drops land on).
function dsRing(n, r, o) {
  o = o || {};
  const P = new Float32Array(n * 3), rnd = mulberry32(o.seed || 23), th = o.thick == null ? 0.02 : o.thick;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (rnd() - 0.5) * 0.02, rr = r * (1 + gauss(rnd) * th);
    P[i * 3] = Math.cos(a) * rr; P[i * 3 + 1] = (o.flat ? 0 : gauss(rnd) * th * r * 0.6); P[i * 3 + 2] = Math.sin(a) * rr;
  }
  return P;
}

// ---------------------------------------------------------------- shorthand

// Short names the shot bodies use. `dsF` for the frame book, `dsL` for the light call — a shot reads as
// geometry, palette and a beat, in as few characters as possible.
const dsF = dsFrame;
const dsL = dsLight;
const dsX = dsTextPoints;

function gauss(rnd) { return (rnd() + rnd() + rnd() + rnd() - 2) * 0.8660254; }

// ---------------------------------------------------------------- the house activity layer

// Every frame of this film has something moving in it. Measured on the first cut, 9 of 47 shots averaged under
// 0.6 of frame-to-frame change (film mean 1.74) — the quiet shots read as stills. This is the fix that applies
// to all of them at once: cheap motions that never stop, at gains that do not disturb the shot's subject.
//
//   dsLife(g, d)        parallax dust, nearer specks moving faster (the camera is never locked off)
//   dsLifePost(d)       the never-quite-still numbers: a breathing zoom + a hair of counter-rotation
//   dsScanSweep(g, d)   one CRT line crossing the frame, forever
//   dsTick(g, d)        a small number in a corner that is always changing
function dsLife(g, d, o) {
  o = o || {};
  const t = d.t, k = o.gain == null ? 1 : o.gain, n = o.dust == null ? 140 : o.dust;
  if (n <= 0) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const dep = 0.25 + hash(i, 3) * 0.75;                     // 0.25 far, 1 near
    const x = ((hash(i, 1) * W + t * (18 + dep * 78)) % (W + 80)) - 40;
    const y = (hash(i, 2) * H + Math.sin(t * (0.35 + dep * 0.8) + i) * 34 * dep) % H;
    const s = 0.6 + dep * 2.2, a = (0.08 + 0.26 * dep) * k;
    g.fillStyle = `rgba(206,228,238,${a.toFixed(3)})`;
    g.fillRect(x, y, s, s);
  }
  g.restore();
}

// The never-quite-still numbers, as values a shot merges into dsFin. Numbers, not draws, so they are free.
function dsLifePost(d, o) {
  o = o || {};
  const k = o.amount == null ? 1 : o.amount;
  return {
    zoom: 1 + k * (0.006 * Math.sin(d.t * 0.31) + 0.004 * noise1(d.t * 0.7, 5)),
    rot: k * (0.0022 * Math.sin(d.t * 0.23 + 1.1) + 0.0012 * noise1(d.t * 0.5, 9)),
  };
}

// One CRT line crossing the frame, top to bottom, forever. On a dark frame it reads as a live feed.
function dsScanSweep(g, d, o) {
  o = o || {};
  const period = o.period == null ? 6.5 : o.period;
  const k = (d.t / period) % 1, y = -40 + k * (H + 80);
  const a = (o.alpha == null ? 0.05 : o.alpha) * Math.sin(k * Math.PI);
  if (a <= 0.002) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const grd = g.createLinearGradient(0, y - 60, 0, y + 60);
  grd.addColorStop(0, 'rgba(190,225,235,0)');
  grd.addColorStop(0.5, `rgba(190,225,235,${a.toFixed(3)})`);
  grd.addColorStop(1, 'rgba(190,225,235,0)');
  g.fillStyle = grd;
  g.fillRect(0, y - 60, W, 120);
  g.restore();
}

// A small number in a corner that never stops changing: the cheapest proof that the frame is live.
function dsTick(g, d, o) {
  o = o || {};
  const x = o.x == null ? W - 150 : o.x, y = o.y == null ? H - 70 : o.y;
  const v = o.value == null ? d.t * (o.rate == null ? 137 : o.rate) : o.value;
  dsLine(g, (o.label ? o.label + ' ' : '') + TL.num(Math.floor(v) % 1e9), x, y, {
    font: dsMono(o.size || 13, 400), size: o.size || 13, track: 2,
    color: dsTone(d, 'dim', o.alpha == null ? 0.7 : o.alpha), glow: 0, align: 'right',
  });
}

// ---------------------------------------------------------------- things that cross a cut

// Dust that keeps flying while two shots cross-fade, so the seam reads as one continuous room.
// Use as `carry: (g, k, e, t) => carryDust(g, k, t)` on a timeline entry.
function carryDust(g, k, t, o) {
  o = o || {};
  const n = o.n || 160, w = W, h = H;
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const seed = i * 7.3;
    const x = ((hash(i, 1) * w + t * (30 + hash(i, 2) * 90)) % (w + 200)) - 100;
    const y = hash(i, 3) * h + Math.sin(t * (0.5 + hash(i, 4)) + seed) * 30;
    const s = 0.6 + hash(i, 5) * 1.8;
    const a = (0.16 + hash(i, 6) * 0.3) * (1 - Math.abs(x / w - 0.5) * 1.2) * clamp(k * 2) * clamp(2 - k * 2);
    if (a <= 0) continue;
    g.fillStyle = `rgba(210,232,240,${a.toFixed(3)})`;
    g.fillRect(x, y, s, s);
  }
  g.restore();
}
window.carryDust = carryDust;
