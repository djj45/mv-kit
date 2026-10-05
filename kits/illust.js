// mv-kit style kit: illust.js — 插画 MV（一枚绘 + 撮影 + 动态歌词）.
//
// The look: every shot is one finished illustration (a still, often generated), brought to life by the camera
// (eased push / pull with holds, long pans across wide art), compositing passes painted once in init (highlight
// diffusion, colour grade), a few code layers on top (dust in the light, flares, rays) and kinetic lyric type.
// The art never animates; the type, the light and the camera do. Pair with drawRate 12, grain ≈ 0.04.
// For a fast song that is not enough on its own: illGroove makes the picture ride the beat, illSnapCam cuts between
// framings of one picture on the bar, and illClipImage swaps a still for an image-to-video clip of it (same first frame).
//
//   const art = illPrep(illImage('B2'), { glow: .35, grade: { tint: '#F7A46B', amt: .15 } });   // init: once
//   const map = illCover(g, art, illCam(f.p, [[0, { x: .5, y: .5, z: 1 }], [1, { x: .55, y: .45, z: 1.15 }, ease.inOutCubic]]));
//   const [x, y] = map(.62, .31);                   // art coords (0..1) → screen px: pin code effects on the picture
//   illDust(g, f.t, { box: [0, 0, W, H], n: 80, color: '255,226,184' });
//   illVerse(g, line, f.t, { x: 140, y: 900, size: 68, hot: ['sparks', 'AGI'] });
//
// Art:      illImage(id) — the picture from a frame pack (frames/<id>.js, made by tools/frames.py; preloaded here).
//           illPrep(src, o) → canvas: o.w (max width, default 2560), o.grade { tint '#hex', amt, lift '#hex', liftAmt,
//           sat, gamma, expo }, o.glow (highlight diffusion 0..1), o.glowR (px), o.thresh (0..1 luma where the glow
//           starts), o.glowTint. Call it in init: it does pixel work.
//           illBright(src, n, o) → the n brightest local maxima [{u, v, b, rgb}] (u, v 0..1): lamps, windows, LEDs.
// Camera:   illCam(p, keys) → {x, y, z, rot}: keyframes over shot progress (keys(t) per field, ease on the arriving key).
//           illCover(g, src, cam, o) → map(u, v) → [x, y]: draws src cover-cropped; cam.x / y (0..1) = the point of
//           the art at the centre of the frame (clamped so the edge never shows), z = zoom over cover, rot = radians
//           (raise z to hide corners). o.alpha, o.blend, o.filter. map.scale = art px → screen px.
//           illSnapCam(f, shots, o) → cam: jumps to the next framing of `shots` on the beat grid (o.every beats from the
//           bar line, or o.at = [times]) in o.snap s, creeping in by o.creep between jumps. A cut inside one picture.
//           illGroove(f, cam, src, e, o) → cam: the picture rides the beat (punch-in + nod per beat, harder on the bar,
//           alternating tilt, slow handheld float, punch-in on the first frames after a cut). e = intensity 0..1
//           (the section's energy works). Only the picture moves: type drawn after illCover stays put and readable.
//           illClipImage(id, ct) → the drawing of a video frame pack at clip time ct (s), or null without the pack.
// Light:    illDust (motes drifting in a beam), illFlare (soft disk + ring), illRays (透过光 god rays from a point),
//           illLeak (warm light leak from an edge), illBokeh (out-of-focus disks).
// Type:     a line is shown from its first word until the next line starts (illLineAt / illLinesIn).
//           illVerse   主歌: words float up 12 px and fade in as they are sung; keywords (o.hot) 1.5× in o.hotColor
//           illPop     主歌 at speed: words drop in big (1.7 → 1, out-back, from a tilt); the word being sung is lifted,
//                      gets the offset colour copy and bounces on the beat (o.beatPhase); keywords 1.3× in o.hotColor
//           illSlam    hook: each word slams in (scale 2.2 → 1, out-back) in the display face, offset colour copy
//           illSlant   title-card rows at −6°, each word pops in on its syllable (o.bounce: the newest word bounces
//                      on the beat, needs o.beatPhase)
//           illQuiet   小号明朝: words fade in without moving
//           illOutline big hollow letters (a name held across the sky), revealed letter by letter over o.over seconds
//           illPrompt  a chat input box: the words are typed as they are sung, block caret, "typing" dots
//           All take o.words = [i0, i1) to show only part of a line, o.alpha, and return the box they used.
// Fonts:    ILL.F.{gothic, display, mincho, dot} are font stacks; a project sets them after embedding its fonts.
(function (G) {
'use strict';
const MV = G.MV;

const ILL = {
  F: {
    gothic: '"Zen Kaku Gothic New","Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans CJK JP","IPAPGothic",sans-serif',
    display: '"Dela Gothic One","Hiragino Sans","Noto Sans CJK JP","IPAPGothic",sans-serif',
    mincho: '"Zen Old Mincho","Hiragino Mincho ProN","Noto Serif CJK JP","IPAPMincho",serif',
    dot: '"DotGothic16","Osaka-Mono","DejaVu Sans Mono",monospace',
  },
  paper: '#FFF8EE', ink: '#15121F', hot: '#FF6A1A',
};

// ---------------------------------------------------------------- art
MV.onInit(async () => {
  const packs = Object.entries(G.MV_FRAMES || {}).filter(([, p]) => !p.images);
  await Promise.all(packs.flatMap(([name, p]) => {
    p.name = name; p.n = p.frames.length; p.rate = p.rate || 12; p.t0 = p.t0 || 0;
    p.images = p.frames.map(() => new Image());
    return p.images.map((im, i) => new Promise((res, rej) => {
      im.onload = res; im.onerror = () => rej(new Error(`illust: frame ${i} of "${name}" failed to decode`));
      im.src = p.frames[i];
    }));
  }));
});
/** The still from frame pack `id`, or null when there is no pack (yet). */
function illImage(id) {
  const p = (G.MV_FRAMES || {})[id];
  return p && p.images ? p.images[0] : null;
}

const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

/** Grade + highlight diffusion, painted once. Returns a canvas (≤ o.w wide). */
function illPrep(src, o = {}) {
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const s = Math.min(1, (o.w || Math.max(2560, 1920 * (MV.scale || 1))) / sw), w = Math.round(sw * s), h = Math.round(sh * s);   // 4K keeps 3840 px of the art
  const c = mk(w, h), g = c.getContext('2d');
  g.drawImage(src, 0, 0, w, h);
  const gr = o.grade;
  const thresh = o.thresh ?? 0.72, glow = o.glow ?? 0;
  const im = g.getImageData(0, 0, w, h), d = im.data;
  const hl = glow > 0 ? new ImageData(w, h) : null, hd = hl && hl.data;
  const tint = gr && gr.tint ? hex(gr.tint).map(v => v / 255) : null, amt = gr ? gr.amt ?? 0.2 : 0;
  const lift = gr && gr.lift ? hex(gr.lift) : null, liftA = gr ? gr.liftAmt ?? 0.1 : 0;
  const sat = gr ? gr.sat ?? 1 : 1, gam = gr ? gr.gamma ?? 1 : 1, expo = gr ? gr.expo ?? 1 : 1;
  const gt = o.glowTint ? hex(o.glowTint).map(v => v / 255) : [1, 1, 1];
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
    if (gr) {
      r *= expo; gg *= expo; b *= expo;
      if (gam !== 1) { r = Math.pow(r, gam); gg = Math.pow(gg, gam); b = Math.pow(b, gam); }
      if (tint) { r = lerp(r, r * tint[0] * 1.25, amt); gg = lerp(gg, gg * tint[1] * 1.25, amt); b = lerp(b, b * tint[2] * 1.25, amt); }
      if (sat !== 1) { const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b; r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat; }
      if (lift) { const k = liftA * (1 - (0.2126 * r + 0.7152 * gg + 0.0722 * b)); r += (lift[0] / 255 - r) * k; gg += (lift[1] / 255 - gg) * k; b += (lift[2] / 255 - b) * k; }
      d[i] = clamp(r) * 255; d[i + 1] = clamp(gg) * 255; d[i + 2] = clamp(b) * 255;
    }
    if (hd) {
      const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b, k = clamp((l - thresh) / (1 - thresh));
      hd[i] = r * k * gt[0] * 255; hd[i + 1] = gg * k * gt[1] * 255; hd[i + 2] = b * k * gt[2] * 255; hd[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  if (hd) {
    const hc = mk(w, h); hc.getContext('2d').putImageData(hl, 0, 0);
    const R = o.glowR ?? Math.round(w / 90);
    g.save(); g.globalCompositeOperation = 'screen';
    g.globalAlpha = glow; g.filter = `blur(${R}px)`; g.drawImage(hc, 0, 0);
    g.globalAlpha = glow * 0.6; g.filter = `blur(${R * 4}px)`; g.drawImage(hc, 0, 0);
    g.restore();
  }
  return c;
}

/** The n brightest local maxima of src: [{u, v, b, rgb}] — window lights, LEDs, lamps. o.thresh, o.cell (px), o.w. */
function illBright(src, n = 200, o = {}) {
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const w = o.w || 480, h = Math.round(sh * w / sw), c = mk(w, h), g = c.getContext('2d');
  g.drawImage(src, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  const out = [], th = o.thresh ?? 0.55, r = o.cell ?? 2;
  if (o.box) { /* [u0, v0, u1, v1] */ }
  for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) {
    const v = L[y * w + x]; if (v < th) continue;
    if (o.box && (x / w < o.box[0] || y / h < o.box[1] || x / w > o.box[2] || y / h > o.box[3])) continue;
    let max = true;
    for (let j = -r; j <= r && max; j++) for (let i = -r; i <= r; i++) if ((i || j) && L[(y + j) * w + x + i] > v) { max = false; break; }
    if (max) { const k = (y * w + x) * 4; out.push({ u: (x + 0.5) / w, v: (y + 0.5) / h, b: v, rgb: [d[k], d[k + 1], d[k + 2]] }); }
  }
  out.sort((a, b) => b.b - a.b);
  return out.slice(0, n);
}

// ---------------------------------------------------------------- camera
/** Camera keyframes over shot progress p: keys = [[p, {x, y, z, rot}, ease?], …] (missing fields carry over). */
function illCam(p, ks) {
  const base = { x: 0.5, y: 0.5, z: 1, rot: 0 }, out = {};
  let prev = { ...base };
  const full = ks.map(([kp, v, e]) => { prev = { ...prev, ...v }; return [kp, prev, e]; });
  for (const f of ['x', 'y', 'z', 'rot']) out[f] = keys(p, full.map(([kp, v, e]) => [kp, v[f], e]));
  return out;
}
/** Cover-crop src into the frame through cam; returns map(u, v) → screen [x, y] (map.scale: art px → screen px). */
function illCover(g, src, cam = {}, o = {}) {
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const z = cam.z ?? 1, rot = cam.rot || 0, s = Math.max(W / sw, H / sh) * z;
  const hw = W / 2 / s, hh = H / 2 / s;
  const cx = sw <= 2 * hw ? sw / 2 : clamp((cam.x ?? 0.5) * sw, hw, sw - hw);
  const cy = sh <= 2 * hh ? sh / 2 : clamp((cam.y ?? 0.5) * sh, hh, sh - hh);
  g.save();
  if (o.alpha != null) g.globalAlpha = o.alpha;
  if (o.blend) g.globalCompositeOperation = o.blend;
  if (o.filter) g.filter = o.filter;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';   // the default ('low') blurs an upscaled clip and aliases a downscaled still
  g.translate(W / 2, H / 2); if (rot) g.rotate(rot); g.scale(s, s);
  g.drawImage(src, -cx, -cy);
  g.restore();
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const map = (u, v) => { const x = (u * sw - cx) * s, y = (v * sh - cy) * s; return [W / 2 + x * cs - y * sn, H / 2 + x * sn + y * cs]; };
  map.scale = s; map.sw = sw; map.sh = sh;
  return map;
}
/**
 * Cuts inside one picture: the framing jumps to the next of `shots` ([{x, y, z, rot}, …], cycled) on the beat grid —
 * every o.every beats counted from the bar line (4 = on each bar), or at the times in o.at — landing in o.snap s
 * (outExpo) and creeping in by o.creep (zoom fraction) until the next jump. shots[0] holds from the shot's start; a jump
 * within o.guard s of the cut, or of the shot's end, is skipped.
 */
function illSnapCam(f, shots, o = {}) {
  const A = f.audio, every = o.every ?? 4, guard = o.guard ?? 0.25, marks = [];
  if (o.at) o.at.forEach(t => { if (t > f.from + guard && t < f.to - 0.1) marks.push(t); });
  else for (let b = Math.ceil((A.beatAt(f.from + guard) - 1e-6) / every) * every; marks.length < 64; b += every) {
    const tb = A.timeOfBeat(b); if (tb > f.to - 0.1) break; marks.push(tb);
  }
  let i = 0; while (i < marks.length && f.t >= marks[i]) i++;
  const B = { x: 0.5, y: 0.5, z: 1, rot: 0 }, n = shots.length;
  const P = { ...B, ...shots[(i - 1 + n) % n] }, C = { ...B, ...shots[i % n] };
  const t0 = i ? marks[i - 1] : f.from, t1 = i < marks.length ? marks[i] : f.to;
  const k = i ? prog(f.t, t0, t0 + (o.snap ?? 0.12), ease.outExpo) : 1, h = prog(f.t, t0, t1);
  return { x: lerp(P.x, C.x, k), y: lerp(P.y, C.y, k), z: lerp(P.z, C.z, k) * (1 + (o.creep ?? 0.05) * h), rot: lerp(P.rot, C.rot, k) };
}
/**
 * The picture rides the beat. Returns a new cam for illCover: on every beat a punch-in (o.zoom) and a nod down (o.nod px)
 * that decay over o.decay s, both o.bar× on the bar line; a tilt that alternates beat to beat (o.tilt rad); a slow
 * handheld float (o.float px); and a punch-in on the first 0.2 s after a hard cut (o.cut). e scales everything (0 = off).
 * Continuous in f.t (camera, not drawing). Zoom is raised with the tilt so the corners never show.
 */
function illGroove(f, cam, src, e = 1, o = {}) {
  if (!(e > 0)) return cam;
  const A = f.audio, b = Math.floor(f.beat + 1e-6), dt = f.t - A.timeOfBeat(b);
  const k = dt >= 0 ? Math.exp(-dt / (o.decay ?? 0.14)) : 0, onBar = ((b % 4) + 4) % 4 === 0 ? (o.bar ?? 1.7) : 1;
  const cut = f.entry && f.entry.fadeIn ? 0 : 1 - prog(f.lt, 0, 0.2, ease.outCubic);
  const tilt = e * (o.tilt ?? 0.006) * k * (b % 2 ? 1 : -1);
  const z0 = cam.z ?? 1, z = z0 * (1 + e * ((o.zoom ?? 0.026) * k * onBar + (o.cut ?? 0.07) * cut + 0.006 * f.a.kick)) * (1 + 1.9 * Math.abs(tilt));
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height, s = Math.max(W / sw, H / sh) * z;
  const fl = e * (o.float ?? 6), px = fl * noise1(f.t * 0.35, 3), py = fl * noise1(f.t * 0.3, 7) - e * (o.nod ?? 9) * k * onBar;
  return { ...cam, z, x: (cam.x ?? 0.5) + px / (s * sw), y: (cam.y ?? 0.5) + py / (s * sh), rot: (cam.rot || 0) + tilt };
}
/** The drawing of video frame pack `id` (tools/frames.py from a clip) at clip time ct (s), held on the pack's rate; null without the pack. */
function illClipImage(id, ct) {
  const p = (G.MV_FRAMES || {})[id];
  if (!p || !p.images || p.n < 2) return null;
  return p.images[clamp(Math.floor(ct * p.rate + 1e-6), 0, p.n - 1)];
}

// ---------------------------------------------------------------- light
/** Motes drifting slowly in a light beam. o: box [x, y, w, h], n, color 'r,g,b', size, seed, speed, alpha, mask(x, y) → 0..1. */
function illDust(g, t, o = {}) {
  const [bx, by, bw, bh] = o.box || [0, 0, W, H], n = o.n ?? 60, R = mulberry32(o.seed ?? 7), sp = o.speed ?? 1;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x0 = R(), y0 = R(), r = (o.size ?? 2.4) * (0.4 + R() * 1.4), ph = R() * 100, vx = (R() - 0.3) * 0.012 * sp, vy = (R() - 0.65) * 0.01 * sp;
    const u = ((x0 + vx * t + 0.015 * noise1(t * 0.3 + ph, i)) % 1 + 1) % 1, v = ((y0 + vy * t + 0.02 * noise1(t * 0.25 + ph, i + 50)) % 1 + 1) % 1;
    const x = bx + u * bw, y = by + v * bh;
    const m = o.mask ? o.mask(x, y) : 1; if (m <= 0) continue;
    const a = (o.alpha ?? 0.7) * m * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.8 + R() * 1.5) + ph))) * smoothstep(0, 0.08, u) * smoothstep(1, 0.92, u);
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.5);
    gr.addColorStop(0, `rgba(${o.color || '255,236,200'},${a})`); gr.addColorStop(0.35, `rgba(${o.color || '255,236,200'},${a * 0.45})`); gr.addColorStop(1, `rgba(${o.color || '255,236,200'},0)`);
    g.fillStyle = gr; g.fillRect(x - r * 2.5, y - r * 2.5, r * 5, r * 5);
  }
  g.restore();
}
/** A soft additive disk (+ optional ring): a light source, a lens flare element. */
function illFlare(g, x, y, r, color = '255,200,150', a = 1, o = {}) {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = o.blend || 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${o.core || color},${a})`); gr.addColorStop(o.k ?? 0.25, `rgba(${color},${a * 0.5})`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  if (o.ring) { g.strokeStyle = `rgba(${color},${a * 0.18})`; g.lineWidth = r * 0.04; g.beginPath(); g.arc(x, y, r * o.ring, 0, TAU); g.stroke(); }
  g.restore();
}
/** God rays: n soft wedges fanning from (x, y) toward angle ang ± spread, slowly breathing. */
function illRays(g, t, x, y, ang, spread, len, color = '255,214,160', a = 0.25, o = {}) {
  const R = mulberry32(o.seed ?? 3), n = o.n ?? 9;
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(ang);
  for (let i = 0; i < n; i++) {
    const da = (R() - 0.5) * 2 * spread, w = (0.02 + R() * 0.06) * (1 + 0.3 * noise1(t * 0.4 + i, 9)), L = len * (0.6 + R() * 0.5);
    const aa = a * (0.4 + 0.6 * R()) * (0.6 + 0.4 * noise1(t * 0.5 + i * 3, 4));
    const gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, `rgba(${color},${aa})`); gr.addColorStop(1, `rgba(${color},0)`);
    g.save(); g.rotate(da); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(L, -L * w); g.lineTo(L, L * w); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}
/** A warm light leak creeping in from an edge ('l' | 'r' | 't' | 'b'). */
function illLeak(g, side, a, color = '255,150,90', size = 0.45) {
  if (a <= 0) return;
  const d = { l: [0, H / 2], r: [W, H / 2], t: [W / 2, 0], b: [W / 2, H] }[side], r = Math.max(W, H) * size;
  g.save(); g.globalCompositeOperation = 'screen';
  const gr = g.createRadialGradient(d[0], d[1], 0, d[0], d[1], r);
  gr.addColorStop(0, `rgba(${color},${a})`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
}
/** Out-of-focus disks (bokeh) scattered in a box, drifting a little. */
function illBokeh(g, t, o = {}) {
  const [bx, by, bw, bh] = o.box || [0, 0, W, H], R = mulberry32(o.seed ?? 11), n = o.n ?? 14;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = bx + R() * bw + noise1(t * 0.2 + i, 3) * 20, y = by + R() * bh + noise1(t * 0.2 + i, 5) * 14, r = (o.r ?? 40) * (0.5 + R());
    const col = (o.colors || ['255,210,150'])[i % (o.colors || [0]).length], a = (o.alpha ?? 0.15) * (0.5 + R() * 0.5);
    const gr = g.createRadialGradient(x, y, r * 0.7, x, y, r);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.85, `rgba(${col},${a * 1.3})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- lyrics
const norm = s => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[^\p{L}\p{N}']/gu, '');
/** The line on screen at t: from its first word until the next line's first word (or its end + o.hold). */
function illLineAt(lyrics, t, o = {}) {
  const ls = lyrics.lines.filter(l => l.words.length), lead = o.lead ?? 0, hold = o.hold ?? 1.2;
  for (let i = ls.length - 1; i >= 0; i--) {
    const l = ls[i], s = l.words[0].start - lead;
    if (t < s) continue;
    const next = ls[i + 1], until = Math.min(next ? next.words[0].start - lead : Infinity, l.end + hold);
    return t < until ? l : null;
  }
  return null;
}
/** Words of a line that should show: o.words = [i0, i1). */
const pick = (line, o) => { const [a, b] = o.words || [0, line.words.length]; return line.words.slice(a, b); };
/** Lay words out in rows no wider than maxW. sizes(w) → font px. Returns rows [{words: [{w, x, wd, size}], width, h}]. */
function layout(g, ws, font, size, maxW, sizeOf, space = 0.3) {
  const rows = []; let row = { words: [], width: 0, h: 0 };
  for (const w of ws) {
    const sz = sizeOf ? sizeOf(w) : size; g.font = font(sz);
    const prev = row.words.length ? row.words[row.words.length - 1].size : 0;
    const wd = g.measureText(w.w).width, gap = row.words.length ? Math.max(size, sz, prev) * space : 0;   // next to a bigger (hot) word the gap grows with it
    if (row.words.length && row.width + gap + wd > maxW) { rows.push(row); row = { words: [], width: 0, h: 0 }; }
    const x = row.width + (row.words.length ? Math.max(size, sz, row.words[row.words.length - 1].size) * space : 0);
    row.words.push({ w, x, wd, size: sz }); row.width = x + wd; row.h = Math.max(row.h, sz);
  }
  if (row.words.length) rows.push(row);
  return rows;
}
function strokeFill(g, s, x, y, fill, stroke, lw) {
  g.lineJoin = 'round'; g.miterLimit = 2;
  if (stroke && lw > 0) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
}
const alignX = (o, width) => (o.align === 'center' ? o.x - width / 2 : o.align === 'right' ? o.x - width : o.x);

/** 主歌: words float up and fade in when sung. o: x, y (first baseline), align, size, maxW, hot [words], color, hotColor, stroke, font, lineH. */
function illVerse(g, line, t, o = {}) {
  if (!line) return null;
  const size = o.size ?? 68, hot = new Set((o.hot || []).map(norm)), F = o.font || (s => `900 ${s}px ${ILL.F.gothic}`);
  const ws = pick(line, o), isHot = w => hot.has(norm(w.w));
  g.save(); g.textBaseline = 'alphabetic';
  const room = o.align === 'right' ? o.x - 96 : o.align === 'center' ? 2 * Math.min(o.x, W - o.x) - 192 : W - 96 - o.x;
  const rows = layout(g, ws, F, size, Math.min(o.maxW ?? 1300, room), w => (isHot(w) ? size * 1.5 : size));
  // o.y is the baseline of the last row (rows stack upward), unless o.top: then of the first row
  const lhs = rows.map(r => Math.max(size, r.h) * (o.lineH ?? 1.18)), span = lhs.slice(1).reduce((a, b) => a + b, 0);
  let y = o.top ? o.y : o.y - span; const box = [Infinity, Infinity, -Infinity, -Infinity];
  rows.forEach((r, ri) => {
    if (ri) y += lhs[ri];
    const x0 = alignX(o, r.width);
    for (const { w, x, wd, size: sz } of r.words) {
      const k = prog(t, w.start, w.start + (o.dur ?? 0.12), ease.outCubic), pre = o.lead && t < w.start ? prog(t, w.start - o.lead, w.start) * 0.4 : 0;
      const a = Math.max(k, pre) * (o.alpha ?? 1); if (a <= 0) continue;
      g.font = F(sz); g.globalAlpha = a;
      const h = isHot(w) && k > 0;
      strokeFill(g, w.w, x0 + x, y + (1 - k) * 12, h ? o.hotColor || ILL.hot : o.color || ILL.paper, o.stroke ?? ILL.ink, (o.lw ?? 0.11) * sz);
      box[0] = Math.min(box[0], x0 + x); box[2] = Math.max(box[2], x0 + x + wd); box[1] = Math.min(box[1], y - sz); box[3] = Math.max(box[3], y + sz * 0.25);
    }
  });
  g.restore();
  return box;
}
/**
 * 主歌 at speed: each word drops in big when sung (scale 1.7 → 1 out-back, falling 26 px, from a tilt); the word being
 * sung is lifted, gets the offset colour copy (o.offColor) and bounces on the beat (o.beatPhase); keywords (o.hot) 1.3×
 * in o.hotColor. Layout as illVerse: o.x, o.y (baseline of the last row; o.top: of the first), align, size (92), maxW.
 */
function illPop(g, line, t, o = {}) {
  if (!line) return null;
  const size = o.size ?? 92, hot = new Set((o.hot || []).map(norm)), F = o.font || (s => `900 ${s}px ${ILL.F.gothic}`);
  const ws = pick(line, o), isHot = w => hot.has(norm(w.w));
  g.save(); g.textBaseline = 'alphabetic';
  const room = o.align === 'right' ? o.x - 96 : o.align === 'center' ? 2 * Math.min(o.x, W - o.x) - 192 : W - 96 - o.x;
  const rows = layout(g, ws, F, size, Math.min(o.maxW ?? 1500, room), w => (isHot(w) ? size * 1.3 : size), 0.26);
  const lhs = rows.map(r => Math.max(size, r.h) * (o.lineH ?? 1.1)), span = lhs.slice(1).reduce((a, b) => a + b, 0);
  let y = o.top ? o.y : o.y - span, cur = null;
  for (const w of ws) if (t >= w.start) cur = w;
  const bp = o.beatPhase != null ? Math.exp(-o.beatPhase * 6) : 0, box = [Infinity, Infinity, -Infinity, -Infinity];
  rows.forEach((r, ri) => {
    if (ri) y += lhs[ri];
    const x0 = alignX(o, r.width);
    for (const { w, x, wd, size: sz } of r.words) {
      const age = t - w.start; if (age < 0) continue;
      const k = clamp(age / (o.dur ?? 0.14)), on = w === cur;
      const s = lerp(1.7, 1, ease.outBack(k)) * (on ? 1.05 + 0.06 * bp : 1);
      const tilt = (hash(w.line | 0, w.j | 0, 5) - 0.5) * 0.5 * (1 - ease.outCubic(k));
      const dy = -(1 - ease.outCubic(k)) * 26 - (on ? sz * 0.05 * (0.5 + bp) : 0);
      g.save(); g.translate(x0 + x + wd / 2, y - sz * 0.35 + dy); g.rotate(tilt); g.scale(s, s); g.translate(-wd / 2, sz * 0.35);
      g.globalAlpha = clamp(k * 4) * (o.alpha ?? 1); g.font = F(sz);
      if (on) strokeFill(g, w.w, sz * 0.06, sz * 0.06, o.offColor || ILL.hot, o.stroke ?? ILL.ink, sz * 0.12);
      strokeFill(g, w.w, 0, 0, isHot(w) ? o.hotColor || ILL.hot : o.color || ILL.paper, o.stroke ?? ILL.ink, sz * 0.12);
      g.restore();
      box[0] = Math.min(box[0], x0 + x); box[2] = Math.max(box[2], x0 + x + wd); box[1] = Math.min(box[1], y - sz); box[3] = Math.max(box[3], y + sz * 0.25);
    }
  });
  g.restore();
  return box;
}
/** Hook: each word slams in. o: x (centre), y (centre of the block), size, maxW, color, offColor, stroke, rot, font, tiltEach. */
function illSlam(g, line, t, o = {}) {
  if (!line) return null;
  const size = o.size ?? 150, F = o.font || (s => `400 ${s}px ${ILL.F.display}`), ws = pick(line, o);
  g.save(); g.textBaseline = 'middle'; g.textAlign = 'left';
  const rows = layout(g, ws, F, size, o.maxW ?? W - 192, o.sizeOf, 0.28), lh = size * (o.lineH ?? 1.05);
  let y = o.y - (rows.length - 1) * lh / 2;
  rows.forEach(r => {
    const x0 = (o.x ?? W / 2) - r.width / 2;
    for (const { w, x, wd, size: sz } of r.words) {
      const age = t - w.start; if (age < 0) continue;
      const k = clamp(age / (o.dur ?? 0.1)), s = lerp(o.from ?? 2.2, 1, ease.outBack(k)), tk = tick(t);
      const jit = (o.jitter ?? 0) * sz, rot = (o.rot ?? 0) + (o.tiltEach ? (hash(w.line, w.j, 7) - 0.5) * o.tiltEach : 0);
      g.save(); g.translate(x0 + x + wd / 2 + (hash(tk, w.j, 1) - 0.5) * jit, y + (hash(tk, w.j, 2) - 0.5) * jit); g.rotate(rot); g.scale(s, s);
      g.globalAlpha = clamp(k * 3) * (o.alpha ?? 1); g.font = F(sz);
      const off = sz * 0.06;
      strokeFill(g, w.w, -wd / 2 + off, off, o.offColor || ILL.hot, o.stroke ?? ILL.ink, sz * 0.12);
      strokeFill(g, w.w, -wd / 2, 0, (o.colorOf && o.colorOf(w)) || o.color || ILL.paper, o.stroke ?? ILL.ink, sz * 0.12);
      g.restore();
    }
    y += lh;
  });
  g.restore();
}
/** Title-card rows at −6°: words pop in on their syllable. o: x, y, align, size, maxW, rot, color, offColor. */
function illSlant(g, line, t, o = {}) {
  if (!line) return null;
  const size = o.size ?? 84, F = o.font || (s => `italic 900 ${s}px ${ILL.F.gothic}`), ws = pick(line, o);
  g.save(); g.translate(o.x ?? W / 2, o.y ?? H * 0.8); g.rotate(o.rot ?? -0.105); g.textBaseline = 'alphabetic';
  const rows = layout(g, ws, F, size, o.maxW ?? W - 300, null, 0.3);
  let y = 0, last = null;
  for (const w of ws) if (t >= w.start) last = w;
  const bounce = o.bounce && o.beatPhase != null ? 1 + 0.07 * Math.exp(-o.beatPhase * 6) : 1;
  rows.forEach((r, ri) => {
    if (ri) y += size * 1.12;
    const x0 = o.align === 'left' ? 0 : o.align === 'right' ? -r.width : -r.width / 2;
    for (const { w, x, wd } of r.words) {
      const age = t - w.start; if (age < 0) continue;
      const k = clamp(age / 0.13), s = lerp(1.5, 1, ease.outBack(k)) * (w === last ? bounce : 1);
      g.save(); g.translate(x0 + x + wd / 2, y - size * 0.35); g.rotate((1 - k) * -0.08); g.scale(s, s); g.translate(-wd / 2, size * 0.35);
      g.globalAlpha = clamp(k * 3) * (o.alpha ?? 1); g.font = F(size);
      const off = size * 0.07;
      strokeFill(g, w.w, off, off, o.offColor || ILL.hot, o.stroke ?? ILL.ink, size * 0.16);
      strokeFill(g, w.w, 0, 0, o.color || ILL.paper, o.stroke ?? ILL.ink, size * 0.16);
      g.restore();
    }
  });
  g.restore();
}
/** Quiet: small serif words fading in in place. o: x (centre), y, size, color, dur, maxW, track (letter spacing px). */
function illQuiet(g, line, t, o = {}) {
  if (!line) return null;
  const size = o.size ?? 54, F = o.font || (s => `700 ${s}px ${ILL.F.mincho}`), ws = pick(line, o);
  g.save(); g.textBaseline = 'alphabetic';
  if (o.track) g.letterSpacing = `${o.track}px`;
  const rows = layout(g, ws, F, size, o.maxW ?? W - 400, null, 0.32);
  let y = o.y ?? H - 150;
  rows.forEach((r, ri) => {
    if (ri) y += size * 1.4;
    const x0 = alignX({ align: o.align || 'center', x: o.x ?? W / 2 }, r.width);
    for (const { w, x } of r.words) {
      const a = prog(t, w.start, w.start + (o.dur ?? 0.3), ease.outQuad) * (o.alpha ?? 1); if (a <= 0) continue;
      g.globalAlpha = a; g.font = F(size);
      if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = size * 0.5; }
      g.fillStyle = (o.colorOf && o.colorOf(w)) || o.color || ILL.paper; g.fillText(w.w, x0 + x, y);
    }
  });
  g.restore();
}
/** Big hollow letters, revealed letter by letter from `at` over o.over s, then held. o: x, y (centre), size, color, lw, track, alpha, font, drift (px/s of tracking widening). */
function illOutline(g, text, t, at, o = {}) {
  if (t < at) return;
  const size = o.size ?? 260, F = o.font || `400 ${size}px ${ILL.F.display}`, chars = [...text], over = o.over ?? 0.6;
  g.save(); g.font = F; g.textBaseline = 'middle';
  const track = (o.track ?? 0.04) * size + (o.drift ?? 0) * (t - at);
  const wds = chars.map(c => g.measureText(c).width), total = wds.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let x = (o.x ?? W / 2) - total / 2;
  g.lineJoin = 'round'; g.lineWidth = o.lw ?? size * 0.025; g.strokeStyle = o.color || ILL.paper;
  chars.forEach((c, i) => {
    const k = prog(t, at + over * i / chars.length, at + over * (i + 1) / chars.length + 0.08);
    if (k > 0) { g.globalAlpha = k * (o.alpha ?? 1); g.strokeText(c, x, (o.y ?? H / 3) + (1 - ease.outCubic(k)) * size * 0.08); }
    x += wds[i] + track;
  });
  g.restore();
}
/** Chat input box: words typed as sung. o: box [x, y, w, h], size, words, typing (0..1 alpha of the dots), sent (0..1 flash), caret, t0 (dots before the first word), color. */
function illPrompt(g, line, t, o = {}) {
  const [bx, by, bw, bh] = o.box || [W * 0.18, H - 260, W * 0.64, 112], size = o.size ?? 52;
  const ws = line ? pick(line, o) : [];
  g.save();
  // box
  const r = Math.min(28, bh / 2);
  g.globalAlpha = o.alpha ?? 1;
  g.fillStyle = o.fill || 'rgba(18,16,28,0.78)'; g.strokeStyle = o.edge || 'rgba(255,248,238,0.55)'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(bx, by, bw, bh, r); g.fill(); g.stroke();
  if (o.sent > 0) { g.fillStyle = `rgba(255,106,26,${0.5 * o.sent})`; g.fill(); }
  // typed text: char by char inside each word's sung span (capped so short words appear fast)
  g.font = `400 ${size}px ${ILL.F.dot}`; g.textBaseline = 'middle'; g.fillStyle = o.color || ILL.paper;
  let s = '';
  for (const w of ws) {
    if (t < w.start) break;
    const n = [...w.w].length, k = clamp((t - w.start) / Math.min(0.18, Math.max(0.05, w.end - w.start)));
    s += (s ? ' ' : '') + [...w.w].slice(0, Math.max(1, Math.ceil(k * n))).join('');
  }
  const pad = 36, tx = bx + pad, ty = by + bh / 2;
  let shown = s, tw = g.measureText(shown).width;
  while (tw > bw - pad * 2 - 40 && shown.length > 1) { shown = shown.slice(1); tw = g.measureText(shown).width; }
  g.fillText(shown, tx, ty);
  // caret: on for the first half of each beat
  if (o.caret !== false && (o.beatPhase == null || o.beatPhase < 0.55)) { g.fillStyle = ILL.hot; g.fillRect(tx + tw + 8, ty - size * 0.45, size * 0.48, size * 0.9); }
  // "typing" dots above the box
  if (o.typing > 0) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 2.2 - i * 0.22) % 1, a = 0.35 + 0.65 * Math.max(0, Math.sin(ph * Math.PI));
      g.globalAlpha = o.typing * a; g.fillStyle = ILL.hot; g.beginPath(); g.arc(bx + 34 + i * 26, by - 30, 8, 0, TAU); g.fill();
    }
  }
  g.restore();
  return [bx, by, bw, bh];
}

MV.illust = { ILL, illImage, illPrep, illBright, illCam, illCover, illSnapCam, illGroove, illClipImage, illPop, illDust, illFlare, illRays, illLeak, illBokeh, illLineAt, illVerse, illSlam, illSlant, illQuiet, illOutline, illPrompt };
Object.assign(G, MV.illust);
})(window);
