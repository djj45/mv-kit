// mv-kit style kit: shadow.js — backlit shadow play (皮影 / 影戏).
//
// One lamp, one cloth screen, everything else is a silhouette. Form comes from shape; light and shade
// come from DISTANCE. An object held z in front of the screen (0 = against the cloth, L = at the lamp)
// is projected about the lamp by  k = L / (L - z),  and its penumbra grows with  z / (L - z).
// That one rule is the whole style: near the cloth = sharp and small, near the lamp = huge and soft.
//
// A cut seam is not a drawn line: the shape is filled, then the seam is ERASED out of it, so what you
// see through it is the lit cloth behind. Lyrics are cut the same way, one character at a time.
//
//   screenCloth(g, {light, lx, ly, r0, wet, offset, seed})   the lit cloth: falloff + weave + folds + wet
//   lamp(g, x, y, t, {scale, light, h})                      oil lamp: dish, wick, breathing flame, glow
//   smoke(g, t, {x, y, h, seed, alpha, wind})                a thread of lamp / incense smoke
//   silhouette(g, drawFn, {light, z, L, pen, blur, alpha, res, cut, edge, clip})
//                                                            draw a shape, then project + blur + composite it
//   cutStroke(g, pts, w, {tick, jitter, upto, square})       a knife seam: erase a line (upto is by length)
//   cutShape(g, pathFn, {tick, jitter})                      erase a closed shape out of the layer
//   hideEdge(g, pts, w, {alpha})                             the lit inner edge of a cut (draw inside o.edge)
//   dyeInto(g, pts, w, {color, alpha, upto})                 a wash of dye bleeding along a seam
//   polylineUpTo(pts, u)                                     the prefix of a polyline, for growing cuts
//   screenRain(g, t, {amount, hits, avoid, wind, seed})      rain in front of the cloth + blots where it lands
//   carveLyrics(g, f, {x, y, size, lead, hold, fade})        the lyric line, cut through the cloth char by char
//   wipes: 'lightThrough' (a pool of lamp light opens up), 'wetOut' (a wet front soaks across)
(function (G) {
'use strict';
const MV = G.MV;

const SHADOW = {
  lamp: '#FFD79A', hot: '#FFF3D6', screen: '#F3E6CB', cloth: '#C2AC85', hide: '#C9873F',
  ink: '#1D1520', qing: '#2A5C8F', zhu: '#B03A2E', dark: '#150E12',
  FONT_LYRIC: '"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC",serif',
  FONT_SEAL: '"Kaiti SC","STKaiti","KaiTi",serif',
};
const shLamp = (a = 1) => `rgba(255,215,154,${clamp(a)})`;
const shInk = (a = 1) => `rgba(29,21,32,${clamp(a)})`;
const shHide = (a = 1) => `rgba(201,135,63,${clamp(a)})`;

// ---------------------------------------------------------------- light on the cloth
/** How much of the lamp's light reaches a point d away from it. 1 at the lamp. */
const shFall = (d, r0) => 1 / (1 + (d / r0) * (d / r0));

/** Colour of the cloth at transmission k (0 = no light, unlit cloth; 1 = the lamp's full pool). */
const SHADOW_RAMP = [[0, '#120C10'], [0.14, '#2E2018'], [0.34, '#5E4C36'], [0.58, '#96805C'], [0.8, '#CBB68D'], [1, '#F6EAD0']];
function shHex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function shRamp(k) {
  k = clamp(k);
  for (let i = 1; i < SHADOW_RAMP.length; i++) if (k <= SHADOW_RAMP[i][0]) {
    const [a, ca] = SHADOW_RAMP[i - 1], [b, cb] = SHADOW_RAMP[i], u = (k - a) / (b - a);
    const A = shHex(ca), B = shHex(cb);
    return `rgb(${Math.round(lerp(A[0], B[0], u))},${Math.round(lerp(A[1], B[1], u))},${Math.round(lerp(A[2], B[2], u))})`;
  }
  return SHADOW_RAMP[SHADOW_RAMP.length - 1][1];
}

let SH_CACHE = {};
function shLazy(key, build) { return SH_CACHE[key] || (SH_CACHE[key] = build()); }

/** The cloth's weave: a tile of warp, weft and slubs (built once). */
function shWeave() {
  return shLazy('weave', () => {
    const N = 96, c = mk(N, N), g = c.getContext('2d');
    for (let i = 0; i < N; i += 3) {
      g.fillStyle = `rgba(255,246,225,${(0.05 + 0.05 * hash(i, 1)).toFixed(3)})`; g.fillRect(i, 0, 1, N);
      g.fillStyle = `rgba(46,30,20,${(0.05 + 0.05 * hash(i, 2)).toFixed(3)})`; g.fillRect(0, i, N, 1);
    }
    for (let i = 0; i < 120; i++) {
      const x = hash(i, 3) * N, y = hash(i, 4) * N;
      g.fillStyle = `rgba(60,40,25,${(0.04 + 0.07 * hash(i, 5)).toFixed(3)})`;
      g.fillRect(x, y, 2 + hash(i, 6) * 6, 1.3);
    }
    return c;
  });
}

/** Wet patches: rain soaks the cloth from the top, which kills the transmission (built once, drawn with alpha). */
function shWetMask() {
  return shLazy('wet', () => {
    const w = Math.ceil(W / 3), h = Math.ceil(H / 3), c = mk(w, h), g = c.getContext('2d');
    const R = mulberry32(4211);
    for (let i = 0; i < 240; i++) {
      const x = R() * w, y = h * Math.pow(R(), 1.6), r = 8 + R() * R() * 52;      // denser towards the top
      const a = 0.05 + 0.09 * R();
      g.fillStyle = `rgba(22,14,12,${a.toFixed(3)})`;
      g.beginPath();
      for (let k = 0; k <= 14; k++) {
        const ang = k / 14 * TAU, rr = r * (0.6 + 0.5 * (0.5 + 0.5 * noise2(Math.cos(ang) * 2 + i, Math.sin(ang) * 2, 5)));
        const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * 1.4;
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.closePath(); g.fill();
    }
    for (let i = 0; i < 130; i++) {                                   // drips running down
      const x = R() * w, y = R() * h * 0.7, len = 24 + R() * 130;
      g.strokeStyle = `rgba(20,12,10,${(0.04 + 0.08 * R()).toFixed(3)})`; g.lineWidth = 0.8 + R() * 2.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 5, y + len); g.stroke();
    }
    return c;
  });
}

/**
 * The lit cloth, filling the frame. o = { light (0..1), lx, ly (the lamp), r0 (falloff radius),
 * wet (0..1), offset ([x,y] world offset so the weave does not swim when the camera moves), seed }.
 */
function screenCloth(g, o = {}) {
  const light = clamp(o.light ?? 1), lx = o.lx ?? W * 0.5, ly = o.ly ?? H * 0.55, r0 = o.r0 ?? H * 0.95;
  const off = o.offset || [0, 0], R = Math.hypot(W, H) * 1.08;
  const gr = g.createRadialGradient(lx, ly, 0, lx, ly, R);
  for (let i = 0; i <= 10; i++) { const d = R * i / 10; gr.addColorStop(i / 10, shRamp(light * shFall(d, r0))); }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);

  // folds: soft vertical bands (world-locked, so a panning camera does not slide them)
  const fg = g.createLinearGradient(0, 0, 0, 0);
  const fgn = g.createLinearGradient(0, 0, W, 0);
  for (let i = 0; i <= 14; i++) {
    const x = W * i / 14, u = (x + off[0]) / 300;
    const a = clamp(0.06 + 0.10 * fbm1(u, o.seed ?? 3, 3));
    fgn.addColorStop(i / 14, `rgba(38,24,16,${a.toFixed(3)})`);
  }
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = fgn; g.fillRect(0, 0, W, H); g.restore();

  // weave
  const pat = g.createPattern(shWeave(), 'repeat');
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.55;
  g.translate(-(((off[0] % 96) + 96) % 96), -(((off[1] % 96) + 96) % 96));
  g.fillStyle = pat; g.fillRect(0, 0, W + 96, H + 96); g.restore();

  if ((o.wet ?? 0) > 0.001) {
    const m = shWetMask(), k = clamp(o.wet);
    g.save();
    g.globalAlpha = 0.34 * k;
    g.drawImage(m, -off[0] * 0.25, -off[1] * 0.25, W + 40, H + 40);
    g.restore();
  }
  if (o.extra) o.extra(g);
  return { lx, ly, r0, light, fall: (x, y) => light * shFall(Math.hypot(x - lx, y - ly), r0) };
}

// ---------------------------------------------------------------- the lamp
/** The oil lamp: dish, wick, breathing flame and its glow. (x, y) = the wick's base. */
function lamp(g, x, y, t, o = {}) {
  const s = o.scale ?? 1, fl = clamp(o.light ?? 1), tk = tick(t);
  const wob = 1 + 0.05 * noise1(t * 3.1, 7) + 0.04 * (hash(tk, 3) - 0.5) + 0.02 * (hash(tk, 9) - 0.5);
  const h = Math.max(2, (o.h ?? 78) * s * (0.35 + 0.65 * fl) * wob), w = h * 0.40;
  const bx = x + (hash(tk, 4) - 0.5) * 2 * s * 0.8;
  // glow in the air
  const gr = g.createRadialGradient(x, y - h * 0.4, 0, x, y - h * 0.4, h * 5);
  gr.addColorStop(0, `rgba(255,226,178,${0.40 * fl})`);
  gr.addColorStop(0.22, `rgba(255,192,116,${0.13 * fl})`);
  gr.addColorStop(1, 'rgba(255,180,110,0)');
  g.fillStyle = gr; g.fillRect(x - h * 5, y - h * 5.4, h * 10, h * 10);
  // dish
  g.fillStyle = SHADOW.ink;
  g.beginPath(); g.ellipse(x, y + 8 * s, 40 * s, 13 * s, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(x - 40 * s, y + 8 * s); g.quadraticCurveTo(x, y + 42 * s, x + 40 * s, y + 8 * s); g.closePath(); g.fill();
  g.strokeStyle = shLamp(0.5 * fl); g.lineWidth = 2.5 * s;
  g.beginPath(); g.ellipse(x, y + 8 * s, 40 * s, 13 * s, 0, 0, TAU); g.stroke();
  // wick + flame
  g.strokeStyle = SHADOW.ink; g.lineWidth = 5 * s; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y + 6 * s); g.lineTo(bx, y - 6 * s); g.stroke();
  const tip = [bx + (hash(tk, 5) - 0.5) * w * 0.5, y - 6 * s - h];
  g.beginPath(); g.moveTo(bx - w * 0.5, y - 3 * s);
  g.bezierCurveTo(bx - w * 0.9, y - h * 0.55, tip[0] - w * 0.35, tip[1] + h * 0.2, tip[0], tip[1]);
  g.bezierCurveTo(tip[0] + w * 0.35, tip[1] + h * 0.2, bx + w * 0.9, y - h * 0.55, bx + w * 0.5, y - 3 * s);
  g.closePath();
  g.fillStyle = `rgba(255,176,86,${0.85 * fl})`; g.fill();
  const core = [tip[0], lerp(y - 3 * s, tip[1], 0.55)];
  g.beginPath(); g.moveTo(bx - w * 0.26, y - 3 * s);
  g.quadraticCurveTo(bx - w * 0.34, core[1] + h * 0.1, core[0], core[1] - h * 0.16);
  g.quadraticCurveTo(bx + w * 0.34, core[1] + h * 0.1, bx + w * 0.26, y - 3 * s);
  g.closePath();
  g.fillStyle = `rgba(255,247,226,${0.92 * fl})`; g.fill();
  return { x, y, h, bx, tip };
}

/** A thread of smoke rising from (x, y) — lamp soot, or incense. Deterministic (no particles). */
function smoke(g, t, o = {}) {
  const x0 = o.x ?? W * 0.2, y0 = o.y ?? H * 0.8, h = o.h ?? H * 0.5, n = o.n ?? 9;
  const seed = o.seed ?? 3, alpha = o.alpha ?? 0.16, wind = o.wind ?? 0.25;
  g.save(); g.lineCap = 'round';
  const grad = g.createLinearGradient(0, y0, 0, y0 - h);
  grad.addColorStop(0, `rgba(255,228,186,${alpha})`);
  grad.addColorStop(0.55, `rgba(255,224,180,${alpha * 0.55})`);
  grad.addColorStop(1, 'rgba(255,220,175,0)');
  for (let i = 0; i < n; i++) {
    const sp = 0.22 + 0.5 * hash(i, seed), ph = hash(i, seed + 1) * 5;
    const pts = [];
    for (let k = 0; k <= 14; k++) {
      const u = k / 14, y = y0 - u * h;
      const sway = (fbm1(u * 3.1 + t * sp + ph, seed + i * 7, 4) * h * 0.18 + u * u * h * wind) * (0.35 + u);
      pts.push([x0 + sway + (hash(i, seed + 2) - 0.5) * 26, y]);
    }
    g.strokeStyle = grad; g.lineWidth = (0.9 + 2.6 * hash(i, seed + 3)) * (o.w ?? 1);
    g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- silhouettes, projected from the lamp
let SH_LAYER = null;
function shLayer(res) {
  const w = Math.max(1, Math.round(W * res)), h = Math.max(1, Math.round(H * res));
  if (!SH_LAYER || SH_LAYER.width !== w || SH_LAYER.height !== h) SH_LAYER = mk(w, h);
  const c = SH_LAYER.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
  c.clearRect(0, 0, w, h);
  return SH_LAYER;
}

/** The projection factor and penumbra of something held z in front of the cloth, lit from L away. */
function shProject(z, L, pen) {
  const zz = clamp(z, 0, L - 1);
  return { k: L / (L - zz), blur: (pen ?? 26) * (zz / (L - zz)) };
}

/**
 * Draw a silhouette with drawFn(ctx) (full-res coordinates), then project it about the lamp, blur it by
 * its distance from the cloth and composite it. o.cut(ctx) erases the knife seams, o.edge(ctx) draws the
 * lit inner edge of those seams (both get a context with composite mode already set and clipped to the shape).
 */
function silhouette(g, drawFn, o = {}) {
  const res = o.res ?? 0.5, L = o.L ?? 900, z = o.z ?? 0;
  const c = shLayer(res).getContext('2d');
  c.save(); c.setTransform(res, 0, 0, res, 0, 0);
  drawFn(c);
  c.restore();
  if (o.cut) { c.save(); c.setTransform(res, 0, 0, res, 0, 0); c.globalCompositeOperation = 'destination-out'; o.cut(c); c.restore(); }
  if (o.edge) { c.save(); c.setTransform(res, 0, 0, res, 0, 0); c.globalCompositeOperation = 'source-atop'; o.edge(c); c.restore(); }
  const [lx, ly] = o.light || [W * 0.5, H * 0.55];
  const pr = shProject(z, L, o.pen), k = pr.k, blur = (o.blur ?? 1.0) + pr.blur;
  g.save();
  g.translate(lx, ly); g.scale(k, k); g.translate(-lx, -ly);
  if (blur > 2.4) g.filter = `blur(${blur.toFixed(2)}px)`;      // below ~2 px it is not worth a full-frame filter
  g.globalAlpha = clamp(o.alpha ?? 1);
  g.drawImage(SH_LAYER, 0, 0, W, H);
  g.restore();
  return { k, blur };
}

/** A knife seam: erase a line out of the current layer. o.tick = drawing index (line boil), o.upto = 0..1. */
function cutStroke(g, pts, w, o = {}) {
  const tk = o.tick ?? 0, j = o.jitter ?? 0.9;
  const line = o.upto == null ? pts : polylineUpTo(pts, o.upto);   // upto is ALONG THE LENGTH, like polylineUpTo
  const n = line.length;
  if (n < 2) return;
  g.save();
  g.globalCompositeOperation = o.erase === false ? 'source-over' : 'destination-out';
  g.lineCap = 'round'; g.lineJoin = o.square ? 'miter' : 'round';
  g.lineWidth = w;
  g.strokeStyle = o.color || '#fff';                 // destination-out: only the alpha of the source matters
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = line[i][0] + (hash(tk, i, 11) - 0.5) * 2 * j, y = line[i][1] + (hash(tk, i, 12) - 0.5) * 2 * j;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke(); g.restore();
}

/** Erase a closed shape (fn draws it) out of the layer — a petal, a leaf, an eye. */
function cutShape(g, fn, o = {}) {
  g.save(); g.globalCompositeOperation = 'destination-out'; fn(g); g.restore();
}

/** The lit inner edge of a cut seam — call inside silhouette's o.edge. */
function hideEdge(g, pts, w, o = {}) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = shLamp(o.alpha ?? 0.40); g.lineWidth = w;
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  g.restore();
}

/** Dye bleeding along a seam that has just been cut (the first colour that enters the film). */
function dyeInto(g, pts, w, o = {}) {
  const line = o.upto == null ? pts : polylineUpTo(pts, o.upto);
  const n = line.length;
  if (n < 2) return;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.globalCompositeOperation = o.over ? 'source-over' : 'source-atop';
  g.strokeStyle = o.color || `rgba(42,92,143,${o.alpha ?? 0.55})`;
  g.lineWidth = w * (o.wide ?? 2.4);
  g.filter = `blur(${(o.blur ?? 6).toFixed(1)}px)`;
  g.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = line[i]; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.filter = 'none'; g.restore();
}

/** The prefix of a polyline at u = 0..1 along its length (for a cut that grows with the song). */
function polylineUpTo(pts, u) {
  u = clamp(u);
  if (u <= 0) return [];
  if (u >= 1) return pts.slice();
  const total = polylineLength(pts), want = total * u, out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= want) { const f = (want - acc) / (seg || 1); out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); break; }
    out.push(pts[i]); acc += seg;
  }
  return out;
}

// ---------------------------------------------------------------- rain
/**
 * Rain on the far side of the cloth: dark streaks crossing the light, blots where drops land (o.hits =
 * landing times, e.g. the kicks), and a field of small soaked dots. Nothing is accumulated: every drop is
 * a function of t and its index.
 */
function screenRain(g, t, o = {}) {
  const amount = clamp(o.amount ?? 1), seed = o.seed ?? 9, wind = o.wind ?? 0.10;
  const avoid = o.avoid || null, life = o.life ?? 2.8;
  const n = Math.round((o.n ?? 160) * amount), speed = o.speed ?? 1500, len = o.len ?? 110;
  const inAvoid = (x, y) => avoid && x > avoid[0] && x < avoid[2] && y > avoid[1] && y < avoid[3];
  g.save(); g.lineCap = 'round';
  const nb = 4;                                                     // one stroke per width/alpha bucket
  for (let b = 0; b < nb; b++) {
    g.strokeStyle = `rgba(30,19,28,${((0.10 + 0.08 * b) * amount).toFixed(3)})`;
    g.lineWidth = 1.2 + 0.75 * b;
    g.beginPath();
    for (let i = b; i < n; i += nb) {
      const x0 = hash(i, seed) * (W + 500) - 250;
      const sp = speed * (0.7 + 0.6 * hash(i, seed + 1));
      const y = ((hash(i, seed + 2) * 2600 + t * sp) % 2600) - 460;
      const ln = len * (0.45 + 0.95 * hash(i, seed + 3));
      if (inAvoid(x0 + y * wind, y)) continue;
      g.moveTo(x0 + y * wind, y); g.lineTo(x0 + (y + ln) * wind, y + ln);
    }
    g.stroke();
  }
  if (o.head) {                                                    // the drop's own light: refraction in front of the lamp
    g.strokeStyle = `rgba(255,232,190,${(0.30 * amount).toFixed(3)})`;
    g.lineWidth = 1.6;
    g.beginPath();
    for (let i = 0; i < n; i += 3) {
      const x0 = hash(i, seed) * (W + 500) - 250;
      const sp = speed * (0.7 + 0.6 * hash(i, seed + 1));
      const y = ((hash(i, seed + 2) * 2600 + t * sp) % 2600) - 460;
      const ln = len * (0.45 + 0.95 * hash(i, seed + 3));
      g.moveTo(x0, y); g.lineTo(x0, y + 3.2); g.moveTo(x0 + wind * ln, y + ln); g.lineTo(x0 + wind * ln, y + ln + 3.2);
    }
    g.stroke();
  }
  g.restore();
  // small soaked dots, each with its own cycle
  g.save();
  const cyc = 2.6, m = Math.round(110 * amount);
  for (let i = 0; i < m; i++) {
    const ph = ((t + hash(i, seed + 11) * cyc) % cyc) / cyc;
    const x = hash(i, seed + 12) * W, y = hash(i, seed + 13) * H;
    if (inAvoid(x, y)) continue;
    const a = (ph < 0.55 ? 1 - ph / 0.55 : 0) * 0.20 * amount;
    if (a <= 0.01) continue;
    const r = 2.5 + 11 * Math.min(1, ph * 3.4) * (0.5 + hash(i, seed + 14));
    g.fillStyle = `rgba(24,15,14,${a.toFixed(3)})`;
    g.beginPath(); g.ellipse(x, y, r, r * 1.15, 0, 0, TAU); g.fill();
  }
  g.restore();
  // blots where a big drop landed
  for (const ht of (o.hits || [])) {
    const age = t - ht;
    if (age < 0 || age > life) continue;
    const hx = 150 + hash(Math.round(ht * 977), 31) * (W - 300);
    const hy = 120 + hash(Math.round(ht * 977), 32) * (H - 320);
    if (inAvoid(hx, hy)) continue;
    const r = (o.blotR ?? 30) * (1 - Math.exp(-age * 3.2)) * (0.7 + 0.6 * hash(Math.round(ht * 977), 33));
    const a = 0.5 * Math.exp(-age * 0.85) * amount;
    if (r < 1 || a <= 0.01) continue;
    g.save();
    g.fillStyle = `rgba(22,13,13,${a.toFixed(3)})`;
    g.beginPath();
    for (let k = 0; k <= 18; k++) {
      const ang = k / 18 * TAU, rr = r * (0.72 + 0.45 * (0.5 + 0.5 * noise2(Math.cos(ang) * 1.6, Math.sin(ang) * 1.6, 17)));
      const px = hx + Math.cos(ang) * rr, py = hy + Math.sin(ang) * rr;
      k ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill();
    const dl = 90 * (1 - Math.exp(-age * 1.5));                       // the drip it leaves
    const grd = g.createLinearGradient(0, hy, 0, hy + dl + 20);
    grd.addColorStop(0, `rgba(22,13,13,${(a * 0.8).toFixed(3)})`); grd.addColorStop(1, 'rgba(22,13,13,0)');
    g.strokeStyle = grd; g.lineWidth = Math.max(1, r * 0.22);
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.sin(age * 1.7) * 3, hy + dl); g.stroke();
    g.restore();
  }
}

// ---------------------------------------------------------------- carved lyrics
/**
 * The line being sung, cut through the cloth one character at a time: before its start a character is only
 * a faint scar, then the knife goes through it in 0.18 s and the lamp shines through. Returns the band it
 * used ([x0, y0, x1, y1]) so a scene can keep rain and actors out of it.
 */
let SH_LMODE = 'crisp';
function carveLyrics(g, f, o = {}) {
  const t = f.t, lines = o.lines ? f.lyrics.lines.filter(l => o.lines.includes(l.i)) : f.lyrics.lines.filter(l => l.words.length);
  const lead = o.lead ?? 0.30, hold = o.hold ?? 1.4;
  let cur = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].words[0].start - lead <= t) cur = i;
  if (cur < 0) return null;
  const line = lines[cur], start = line.words[0].start;
  const fadeIn = clamp((t - (start - lead)) / 0.22), fadeOut = 1 - clamp((t - (line.end + hold)) / 0.9);
  let fade = fadeIn * fadeOut;
  if (o.fade != null) fade *= o.fade;
  if (fade <= 0.01) return null;

  const size = o.size ?? 68, x = o.x ?? W / 2, y = o.y ?? Math.round(H * 0.20);
  const font = `${o.weight ?? 600} ${size}px ${o.font || SHADOW.FONT_LYRIC}`;
  const toks = f.lyrics.tokens(line);
  g.save(); g.font = font; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const sp = o.space ?? size * 0.14;
  let total = 0;
  toks.forEach((tk, i) => { total += g.measureText(tk.text).width + (i < toks.length - 1 && !tk.join ? sp : 0); });
  const x0 = x - total / 2, tk = tick(t);
  const cutOf = s => clamp((t - s) / 0.18);
  const band = [x0 - 30, y - size * 1.1, x0 + total + 30, y + size * 0.5];

  const paint = (ctx, mode) => karaoke(ctx, toks, t, x0, y, {
    font, space: sp, showUnsung: true,
    draw(c, tok, tx, ty, st) {
      const cut = cutOf(tok.start), jx = (hash(tk, st.i, 21) - 0.5) * 1.1, jy = (hash(tk, st.i, 22) - 0.5) * 1.1;
      if (mode === 'glow') {
        if (cut <= 0) return;
        c.fillStyle = `rgba(255,228,182,${(0.85 * cut * fade).toFixed(3)})`;
        c.fillText(tok.text, tx + jx, ty + jy);
        return;
      }
      if (mode === 'halo') {                                     // the burnt rim of the cut, keeps the word legible on bright cloth
        c.lineJoin = 'round'; c.lineWidth = size * 0.16;
        c.strokeStyle = `rgba(26,15,17,${(0.34 * fade).toFixed(3)})`;
        c.strokeText(tok.text, tx, ty);
        if (cut <= 0) { c.fillStyle = `rgba(38,24,20,${(0.30 * fade).toFixed(3)})`; c.fillText(tok.text, tx, ty); }
        return;
      }
      if (cut <= 0) { c.fillStyle = `rgba(40,26,22,${(0.30 * fade).toFixed(3)})`; c.fillText(tok.text, tx, ty); return; }
      const hot = lerp(0.62, 1, cut) * fade;
      c.fillStyle = `rgba(255,226,178,${hot.toFixed(3)})`;
      c.fillText(tok.text, tx + jx, ty + jy);
      if (cut >= 1) { c.fillStyle = `rgba(255,248,228,${(0.55 * fade).toFixed(3)})`; c.fillText(tok.text, tx + jx, ty + jy - 0.6); }
    },
  });

  paint(g, 'halo');
  // glow: paint the lit characters small, then blow them up — a 4× upscale is a cheap blur, no filter needed
  const gl = shLazy('lyricGlow', () => mk(Math.round(W * 0.25), Math.round(H * 0.25)));
  const gc = gl.getContext('2d');
  gc.setTransform(1, 0, 0, 1, 0, 0); gc.clearRect(0, 0, gl.width, gl.height);
  gc.save(); gc.setTransform(0.25, 0, 0, 0.25, 0, 0);
  SH_LMODE = 'glow'; paint(gc, 'glow'); SH_LMODE = 'crisp';
  gc.restore();
  g.save(); g.globalAlpha = 0.5 * fade;
  g.drawImage(gl, 0, 0, W, H); g.restore();
  paint(g, 'crisp');
  g.restore();
  return band;
}

// ---------------------------------------------------------------- wipes
MV.wipe('lightThrough', {
  mask(m, k, e) {
    const p = e.params || {}, x = p.wx ?? W / 2, y = p.wy ?? H * 0.58;
    const R = Math.max(1, Math.hypot(W, H) * 1.1 * ease.inOutCubic(clamp(k)));
    const gr = m.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)');
    gr.addColorStop(0.78, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    m.fillStyle = gr; m.fillRect(0, 0, W, H);
  },
  over(g, k, e) {
    if (k <= 0 || k >= 1) return;
    const p = e.params || {}, x = p.wx ?? W / 2, y = p.wy ?? H * 0.58;
    const R = Math.max(1, Math.hypot(W, H) * 1.1 * ease.inOutCubic(clamp(k)));
    const gr = g.createRadialGradient(x, y, R * 0.4, x, y, R);
    gr.addColorStop(0, 'rgba(255,226,178,0)');
    gr.addColorStop(1, `rgba(255,226,178,${(0.30 * Math.sin(Math.PI * k)).toFixed(3)})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  },
});
MV.wipe('wetOut', {
  mask(m, k, e) {
    const p = e.params || {}, dir = p.dir ?? 1;
    const X = dir > 0 ? lerp(-260, W + 260, ease.inOutQuad(clamp(k))) : lerp(W + 260, -260, ease.inOutQuad(clamp(k)));
    m.beginPath(); m.moveTo(X, -20);
    for (let y = 0; y <= H + 20; y += 16) m.lineTo(X + 120 * fbm2(y / 230, e.i, e.i * 5 + 2, 3), y);
    m.lineTo(dir > 0 ? W + 600 : -600, H + 20); m.lineTo(dir > 0 ? W + 600 : -600, -20); m.closePath();
    m.fillStyle = '#fff'; m.fill();
  },
  over(g, k, e) {
    if (k <= 0 || k >= 1) return;
    const p = e.params || {}, dir = p.dir ?? 1;
    const X = dir > 0 ? lerp(-260, W + 260, ease.inOutQuad(clamp(k))) : lerp(W + 260, -260, ease.inOutQuad(clamp(k)));
    g.save(); g.globalAlpha = Math.sin(Math.PI * k) * 0.55;
    g.fillStyle = 'rgba(24,15,14,0.5)'; g.fillRect(dir > 0 ? X - 90 : X, 0, 90, H);
    g.strokeStyle = 'rgba(30,19,28,0.45)'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {                                   // drips hanging off the wet front
      const y = hash(i, e.i, 7) * H, len = 40 + 140 * hash(i, e.i, 8);
      g.beginPath(); g.moveTo(X, y); g.lineTo(X + (dir > 0 ? -len : len), y + 12); g.stroke();
    }
    g.restore();
  },
});

MV.shadow = {
  SHADOW, shLamp, shInk, shHide, shFall, shRamp, shProject, shWeave, shWetMask, shLazy,
  screenCloth, lamp, smoke, silhouette, cutStroke, cutShape, hideEdge, dyeInto, polylineUpTo, screenRain, carveLyrics,
};
Object.assign(G, MV.shadow);
})(window);
