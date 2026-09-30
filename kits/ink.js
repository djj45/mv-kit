// mv-kit style kit: ink.js — Chinese ink wash (水墨) on warm xuan paper.
//
// Everything is drawn with ONE ink colour (INK.rgb) at different strengths, so the "five colours of
// ink" are alpha levels: INK.A.qing / dan / zhong / nong / jiao. Paper shows through, which keeps the
// fibres visible under every wash. Deterministic: seeds + time only.
//
//   paintXuan(w, h, seed)              warm xuan paper: mottling, fibres, grain (init only)
//   inkBloom(g, x, y, age, {r, alpha, seed, k, sq, rot})   a drop spreading on wet paper, size = f(age)
//   inkDrop(g, x, y, tLand, t, {fall, size})               a falling drop before it lands
//   inkStroke(g, pts, w, {alpha, dry, seed, upto, taper})  brush stroke: 藏锋 head, 出锋 tail, 飞白 bristles
//   inkRidge(g, x0, x1, baseY, h, {...})                    a mountain range wash (init only)
//   inkRain(g, t, {density, angle, speed, len, alpha, avoid, seed})
//   inkLyrics(g, f, x, y, {size, lines})                    vertical, right-to-left, each character inks in when sung
//   inkSoft(g, fn, {scale, alpha})                          draw fn at low res and upscale: soft wet edges, cheap
//   granulate(g, w, h, seed, amt)                           knock paper-grain speckles out of an ink layer
//   inkLoadFont(family, src)                                FontFace loader for MV.onInit
//   wipes: 'ink' (a blot spreads from params.wx/wy), 'wash' (a wet front sweeps across, params.dir = ±1)
(function (G) {
'use strict';
const MV = G.MV;

const INK = {
  paper: '#EDE6D6', qing: '#BDB6A9', dan: '#8A857C', zhong: '#4E4A44', nong: '#2E2B27', jiao: '#151311',
  rgb: '24,21,18',
  A: { qing: 0.2, dan: 0.42, zhong: 0.64, nong: 0.8, jiao: 0.94 },
  FONT: '"InkKai", "Kaiti SC", "STKaiti", "KaiTi", serif',
};
const ink = a => `rgba(${INK.rgb},${clamp(a)})`;

function fbm2(x, y, s = 0, oct = 4) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * noise2(x * f, y * f, s + i * 31); a *= 0.5; f *= 2; } return v; }

async function inkLoadFont(family, src) {
  const ff = new FontFace(family, `url(${src})`);
  await ff.load(); document.fonts.add(ff);
}

// ---------------------------------------------------------------- paper
function paintXuan(w, h, seed = 7) {
  const c = mk(w, h), g = c.getContext('2d');
  g.fillStyle = INK.paper; g.fillRect(0, 0, w, h);
  // 1. cloudy mottling: low-res noise, smooth upscale
  const s = 12, lw = Math.ceil(w / s) + 2, lh = Math.ceil(h / s) + 2, lo = mk(lw, lh), lg = lo.getContext('2d'), im = lg.createImageData(lw, lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const v = fbm2(x * 0.05, y * 0.05, seed, 4) + 0.35 * fbm2(x * 0.3, y * 0.3, seed + 5, 2), i = (y * lw + x) * 4;
    if (v > 0) { im.data[i] = 255; im.data[i + 1] = 252; im.data[i + 2] = 240; im.data[i + 3] = Math.min(255, v * 70); }
    else { im.data[i] = 125; im.data[i + 1] = 108; im.data[i + 2] = 80; im.data[i + 3] = Math.min(255, -v * 40); }
  }
  lg.putImageData(im, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(lo, -s, -s, lw * s, lh * s);
  // 2. fibres
  const R = mulberry32(seed * 131 + 1), n = Math.round(w * h / 700);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, L = 5 + R() * R() * 80, a0 = R() * TAU, bend = (R() - 0.5) * 1.4, dark = R() < 0.6;
    g.strokeStyle = dark ? `rgba(105,90,66,${0.03 + R() * 0.07})` : `rgba(255,253,246,${0.12 + R() * 0.25})`;
    g.lineWidth = 0.4 + R() * 0.9;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a0 + bend) * L * 0.5, y + Math.sin(a0 + bend) * L * 0.5, x + Math.cos(a0) * L, y + Math.sin(a0) * L);
    g.stroke();
  }
  // 3. fine grain
  const d = g.getImageData(0, 0, w, h), p = d.data; let r = (seed * 9973) | 0;
  for (let i = 0; i < p.length; i += 4) { r = (Math.imul(r, 1664525) + 1013904223) | 0; const v = ((r >>> 24) - 128) / 128 * 4.5; p[i] += v; p[i + 1] += v; p[i + 2] += v * 0.9; }
  g.putImageData(d, 0, 0);
  return c;
}

/** Punch paper-grain speckles out of whatever is on g (ink sits unevenly on fibres). */
function granulate(g, w, h, seed = 1, amt = 0.35, density = 1 / 55) {
  g.save(); g.globalCompositeOperation = 'destination-out';
  const R = mulberry32(seed * 31 + 5), n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${R() * amt})`; const s = 0.6 + R() * 1.8; g.fillRect(R() * w, R() * h, s, s * (0.5 + R())); }
  g.restore();
}

/** Closed noisy loop around (cx, cy): periodic noise, so no seam. */
function blobPts(cx, cy, r, seed, rough = 0.22, n = 72, sq = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, k = 1 + rough * 1.5 * fbm2(Math.cos(a) * 1.5 + 11, Math.sin(a) * 1.5 + 11, seed, 3);
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * sq]);
  }
  return pts;
}

// ---------------------------------------------------------------- blooms (sprites made once)
const SPR = 384, NSPR = 14;
let sprites = null;
function bloomSprite(seed) {
  const S = SPR, c = mk(S, S), g = c.getContext('2d'), R = S * 0.34, cx = S / 2, cy = S / 2;
  // outer bleed: a wider, fainter, blurred halo
  g.filter = `blur(${S * 0.022}px)`; pathSmooth(g, blobPts(cx, cy, R * 1.1, seed + 1, 0.3)); g.fillStyle = ink(0.22); g.fill();
  g.filter = 'none';
  // body: pale wet centre, pooled darker edge
  const body = blobPts(cx, cy, R, seed, 0.24);
  pathSmooth(g, body);
  const rg = g.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
  rg.addColorStop(0, ink(0.42)); rg.addColorStop(0.55, ink(0.5)); rg.addColorStop(0.78, ink(0.66)); rg.addColorStop(0.9, ink(0.78));
  g.fillStyle = rg; g.fill();
  // tide line
  g.filter = `blur(${S * 0.004}px)`; g.lineWidth = S * 0.011; g.strokeStyle = ink(0.5); g.stroke(); g.filter = 'none';
  // capillary hairs where the ink runs along fibres
  const Rr = mulberry32(seed * 77 + 3); g.lineCap = 'round';
  for (let i = 0; i < 240; i++) {
    const p = body[(Rr() * body.length) | 0], dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1;
    const L = S * (0.004 + Rr() * Rr() * 0.05), wob = (Rr() - 0.5) * 0.9, ux = dx / d, uy = dy / d;
    g.strokeStyle = ink(0.07 + Rr() * 0.16); g.lineWidth = 0.5 + Rr() * 0.9;
    g.beginPath(); g.moveTo(p[0] - ux * 2, p[1] - uy * 2); g.lineTo(p[0] + (ux + uy * wob) * L, p[1] + (uy - ux * wob) * L); g.stroke();
  }
  granulate(g, S, S, seed, 0.4, 1 / 40);
  return c;
}
function inkSprites() { if (!sprites) sprites = Array.from({ length: NSPR }, (_, i) => bloomSprite(101 + i * 17)); return sprites; }

/** Radius of a bloom `age` seconds after landing: fast at first, then creeping. */
const bloomR = (r, age, k = 2.2) => (age < 0 ? 0 : r * (0.1 + 0.9 * (1 - Math.exp(-age * k))) * (1 + 0.04 * Math.min(age, 6)));

function inkBloom(g, x, y, age, o = {}) {
  if (age < 0) return;
  const r = bloomR(o.r || 80, age, o.k), seed = o.seed | 0;
  const a = (o.alpha ?? INK.A.nong) * (o.dilute === false ? 1 : 0.62 + 0.38 * Math.exp(-age * 0.9));
  const sp = inkSprites()[((seed % NSPR) + NSPR) % NSPR], s = r / (SPR * 0.34);
  g.save(); g.globalAlpha = clamp(a); g.translate(x, y); g.rotate(o.rot ?? (seed * 2.399) % TAU); g.scale(s, s * (o.sq || 1));
  g.drawImage(sp, -SPR / 2, -SPR / 2); g.restore();
}

/** A falling drop (a small elongated tear) until tLand; nothing afterwards. */
function inkDrop(g, x, y, tLand, t, o = {}) {
  const fall = o.fall || 0.5, u = (tLand - t) / fall;
  if (u <= 0 || u > 1) return;
  const size = o.size || 9, dy = (o.dist || 700) * u * u, stretch = 1 + 1.6 * (1 - u);
  g.save(); g.translate(x, y - dy); g.fillStyle = ink(o.alpha ?? INK.A.jiao);
  g.beginPath(); g.moveTo(0, -size * 2.2 * stretch); g.quadraticCurveTo(size * 1.05, -size * 0.2, 0, size); g.quadraticCurveTo(-size * 1.05, -size * 0.2, 0, -size * 2.2 * stretch); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- brush strokes
/** 藏锋 head (blunt, slightly swollen), steady body, 出锋 tail. */
const BRUSH = {
  std: s => (s < 0.1 ? 0.6 + 0.5 * Math.sin(s / 0.1 * Math.PI / 2) : s < 0.18 ? 1.1 - (s - 0.1) / 0.08 * 0.1 : s > 0.62 ? Math.pow(1 - (s - 0.62) / 0.38, 0.85) : 1),
  both: s => Math.pow(Math.sin(Math.PI * s), 0.55),
  dot: s => Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.15)), 0.4),
  hair: s => 0.25 + 0.75 * Math.pow(Math.sin(Math.PI * s), 0.8),
};

function cutPolyline(pts, u) {
  const L = polylineLength(pts) * clamp(u); let acc = 0; const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + d >= L) { const k = d ? (L - acc) / d : 0; out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]); return out; }
    acc += d; out.push(pts[i]);
  }
  return out;
}

/** The original inkStroke (gaps at absolute arc length; 2-point strokes draw almost nothing). Kept so a finished
 *  project can pin its approved look: "inkStroke": 1 in project.js routes every inkStroke call here. */
function inkStrokeV1(g, pts, w, o = {}) {
  if (!pts || pts.length < 2) return;
  const up = o.upto == null ? 1 : clamp(o.upto); if (up <= 0) return;
  const P = up < 1 ? cutPolyline(pts, up) : pts; if (P.length < 2) return;
  const taper = o.taper || BRUSH.std, a = o.alpha ?? INK.A.nong, seed = o.seed || 1, dry = o.dry ?? 0.25, n = P.length;
  const sAt = i => (i / (n - 1)) * up;
  const len = polylineLength(P);
  g.save();
  // wet core
  const wet = o.wet ?? 0.75;
  if (wet > 0) { pathPoly(g, brushPoly(P, w * 0.9, s => taper(s * up))); g.fillStyle = ink(a * wet * (1 - dry * 0.55)); g.fill(); }
  // bristles
  const nb = o.bristles || Math.max(4, Math.min(22, Math.round(w / 1.8)));
  const nx = [], ny = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(n - 1, i + 1)]; let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const d = Math.hypot(dx, dy) || 1;
    nx.push(-dy / d); ny.push(dx / d);
  }
  g.lineCap = 'round'; g.lineJoin = 'round';
  let acc = 0; const cum = [0]; for (let i = 1; i < n; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); cum.push(acc); }
  for (let b = 0; b < nb; b++) {
    const off = (b + 0.5) / nb - 0.5, hb = hash(seed, b, 7);
    g.lineWidth = Math.max(0.6, w / nb * (1.2 + hb * 0.9));
    g.strokeStyle = ink(a * (0.55 + 0.45 * hb));
    g.beginPath(); let on = false;
    for (let i = 0; i < n; i++) {
      const s = sAt(i), tw = taper(s) * w;
      const edge = Math.abs(off) * 2;                             // outer bristles run dry first
      const dd = dry * (0.35 + 0.9 * smoothstep(0.2, 1, s)) * (0.6 + 0.8 * edge);
      const keep = noise1(cum[i] / (10 + 14 * hb) + b * 7.31, seed) * 0.5 + 0.5 > dd;
      const x = P[i][0] + nx[i] * off * tw, y = P[i][1] + ny[i] * off * tw;
      if (keep && tw > 0.3) { if (!on) { g.moveTo(x, y); on = true; } else g.lineTo(x, y); } else on = false;
    }
    g.stroke();
  }
  g.restore();
  return len;
}

/** Resample a polyline to about `step` px between points; returns {pts, cum} (cum = arc length at each point). */
function resamplePolyline(pts, step) {
  const out = [pts[0]], cum = [0]; let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= 0) continue;
    const k = Math.max(1, Math.ceil(d / step));
    for (let j = 1; j <= k; j++) { out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]); cum.push(acc + d * j / k); }
    acc += d;
  }
  return { pts: out, cum };
}

/**
 * Brush stroke along pts with width w. o.alpha (ink strength), o.dry 0..1 (飞白: bristles break up,
 * more towards the tail), o.upto 0..1 (draw-on: paint only the first part), o.taper (fn of s along the
 * WHOLE stroke), o.seed, o.wet (0..1 soft core under the bristles), o.bristles (count),
 * o.breakLen (px: typical length of a bristle run / gap, default 36; 15–25 = broken texture, 50–80 = long 飞白),
 * o.gapLen (px: pin the gap pattern to this reference length, for strokes whose length animates).
 *
 * Stable on twos: the bristle gaps are placed along the NORMALISED arc length, so a stroke redrawn with a little
 * jitter every drawing (line boil) keeps its 飞白 where it was instead of letting the gaps crawl. Without o.gapLen
 * the reference length is the stroke's own length, snapped to quarter-octave steps and cross-faded between the two
 * nearest (so it never jumps). The stroke is resampled every few px, so gaps start and end smoothly, and short
 * 2-point strokes draw properly. A project that wants the original strokes sets "inkStroke": 1 in project.js.
 */
function inkStroke(g, pts, w, o = {}) {
  if (MV.project && MV.project.inkStroke === 1) return inkStrokeV1(g, pts, w, o);
  if (!pts || pts.length < 2) return;
  const up = o.upto == null ? 1 : clamp(o.upto); if (up <= 0) return;
  const Lfull = polylineLength(pts); if (Lfull <= 0) return;
  const cut = up < 1 ? cutPolyline(pts, up) : pts; if (cut.length < 2) return;
  const { pts: P, cum } = resamplePolyline(cut, clamp(w / 5, 1.5, 4)), n = P.length; if (n < 2) return;
  const taper = o.taper || BRUSH.std, a = o.alpha ?? INK.A.nong, seed = o.seed || 1, dry = o.dry ?? 0.25;
  const sAt = i => cum[i] / Lfull;                              // position along the WHOLE stroke, 0..1
  g.save();
  // wet core
  const wet = o.wet ?? 0.75;
  if (wet > 0) { pathPoly(g, brushPoly(P, w * 0.9, s => taper(s * up))); g.fillStyle = ink(a * wet * (1 - dry * 0.55)); g.fill(); }
  // bristles
  const nb = o.bristles || Math.max(4, Math.min(22, Math.round(w / 1.8)));
  const nx = [], ny = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[Math.min(n - 1, i + 1)]; let dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const d = Math.hypot(dx, dy) || 1;
    nx.push(-dy / d); ny.push(dx / d);
  }
  // gap pattern: noise over s × reference length (two quarter-octave neighbours, cross-faded, variance kept)
  let La, Lb, wq = 0;
  if (o.gapLen) La = Lb = o.gapLen;
  else { const lg = Math.log2(Math.max(8, Lfull)) * 4, lo = Math.floor(lg); wq = lg - lo; La = Math.pow(2, lo / 4); Lb = Math.pow(2, (lo + 1) / 4); }
  const norm = 1 / Math.hypot(1 - wq, wq), bl = o.breakLen;
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let b = 0; b < nb; b++) {
    const off = (b + 0.5) / nb - 0.5, hb = hash(seed, b, 7);
    const sc = (bl || 36) * (0.75 + 0.5 * hb);                  // run / gap length for this bristle
    const nz = L => noise1(L / sc + b * 7.31, seed) * 0.82 + 0.18 * noise1(L / (sc * 0.2) + b * 3.7, seed + 11);
    g.lineWidth = Math.max(0.6, w / nb * (1.2 + hb * 0.9));
    g.strokeStyle = ink(a * (0.55 + 0.45 * hb));
    g.beginPath(); let on = false;
    for (let i = 0; i < n; i++) {
      const s = sAt(i), tw = taper(s) * w;
      const edge = Math.abs(off) * 2;                             // outer bristles run dry first
      const dd = dry * (0.35 + 0.9 * smoothstep(0.2, 1, s)) * (0.6 + 0.8 * edge);   // the ink load drops along the stroke
      const nv = wq ? (nz(s * La) * (1 - wq) + nz(s * Lb) * wq) * norm : nz(s * La);
      const keep = nv * 0.5 + 0.5 > dd;
      const x = P[i][0] + nx[i] * off * tw, y = P[i][1] + ny[i] * off * tw;
      if (keep && tw > 0.3) { if (!on) { g.moveTo(x, y); on = true; } else g.lineTo(x, y); } else on = false;
    }
    g.stroke();
  }
  g.restore();
  return Lfull * up;
}

/** Smooth a sparse control polyline into a dense one (Catmull–Rom). */
function spline(ctrl, per = 10) {
  const out = [], n = ctrl.length; if (n < 3) return ctrl.slice();
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(ctrl[n - 1]); return out;
}

// ---------------------------------------------------------------- mountains (init only)
/**
 * A range of mountains between x0 and x1 standing on baseY (where it dissolves into mist).
 * o.alpha (ink at the ridge), o.blur, o.seed, o.peaks (number of main peaks), o.cun (texture strokes 0..1),
 * o.dots (moss dots 0..1), o.depth (how far below baseY the wash fades out), o.rough.
 * Returns the ridge polyline.
 */
function inkRidge(g, x0, x1, baseY, h, o = {}) {
  const seed = o.seed || 1, a = o.alpha ?? INK.A.dan, R = mulberry32(seed * 7 + 1), step = o.step || 6;
  const npk = o.peaks || 3, pk = [];
  for (let i = 0; i < npk; i++) pk.push({ x: lerp(x0, x1, (i + 0.3 + R() * 0.4) / npk), h: h * (0.55 + R() * 0.45), w: (x1 - x0) / npk * (0.45 + R() * 0.5) });
  const ridge = [];
  for (let x = x0; x <= x1 + 0.1; x += step) {
    let y = 0;
    for (const p of pk) { const u = (x - p.x) / p.w; y = Math.max(y, p.h * Math.exp(-u * u * 1.6) * (1 - 0.35 * Math.abs(noise1(x / 90, seed + 3)))); }
    const edge = Math.min(1, (x - x0) / ((x1 - x0) * 0.12), (x1 - x) / ((x1 - x0) * 0.12));
    y *= smoothstep(0, 1, edge);
    y += (o.rough ?? 0.06) * h * (noise1(x / 23, seed) * 0.6 + noise1(x / 7, seed + 1) * 0.4) * (y > 4 ? 1 : 0);
    ridge.push([x, baseY - Math.max(0, y)]);
  }
  const top = baseY - h, depth = o.depth ?? h * 0.25;
  const L = mk(x1 - x0 + 200, h + depth + 200), lg = L.getContext('2d'), ox = x0 - 100, oy = top - 100;
  lg.translate(-ox, -oy);
  // body wash: dark along the ridge, fading towards the mist
  // the wash hangs below the ridge by an amount that shrinks to nothing where the range ends (no hard sides)
  lg.beginPath(); ridge.forEach((p, i) => (i ? lg.lineTo(p[0], p[1]) : lg.moveTo(p[0], p[1])));
  for (let i = ridge.length - 1; i >= 0; i--) { const p = ridge[i], k = clamp((baseY - p[1]) / (h * 0.45)); lg.lineTo(p[0], baseY + depth * Math.sqrt(k) - (1 - k) * 2); }
  lg.closePath();
  const gr = lg.createLinearGradient(0, top, 0, baseY + depth);
  gr.addColorStop(0, ink(a)); gr.addColorStop(0.45, ink(a * 0.7)); gr.addColorStop(0.78, ink(a * 0.25)); gr.addColorStop(1, ink(0));
  lg.fillStyle = gr; lg.fill();
  // darker band hugging the ridge (ink pools where the brush started)
  lg.save(); lg.clip();
  lg.filter = `blur(${Math.max(2, h * 0.03)}px)`; lg.lineWidth = h * 0.09; lg.strokeStyle = ink(a * 0.55); lg.lineJoin = 'round';
  lg.beginPath(); ridge.forEach((p, i) => (i ? lg.lineTo(p[0], p[1] + h * 0.035) : lg.moveTo(p[0], p[1] + h * 0.035))); lg.stroke();
  lg.filter = 'none'; lg.restore();
  // texture strokes (披麻皴): long dry strokes running down the slopes
  const cun = o.cun ?? 0;
  if (cun > 0) {
    const nC = Math.round((x1 - x0) / 14 * cun);
    for (let i = 0; i < nC; i++) {
      const j = (R() * ridge.length) | 0, p = ridge[j]; if (baseY - p[1] < h * 0.18) continue;
      const q = ridge[Math.min(ridge.length - 1, j + 2)], r0 = ridge[Math.max(0, j - 2)], slope = (q[1] - r0[1]) / (q[0] - r0[0] || 1);
      const dir = slope < 0 ? 1 : -1, L2 = (baseY - p[1]) * (0.3 + R() * 0.55), sx = p[0] + (R() - 0.5) * 20, sy = p[1] + 6 + R() * 18;
      const pts = spline([[sx, sy], [sx - dir * L2 * 0.18, sy + L2 * 0.4], [sx - dir * L2 * 0.25 + (R() - 0.5) * 20, sy + L2]], 8);
      inkStroke(lg, pts, 3 + R() * 5, { alpha: a * (0.35 + R() * 0.4), dry: 0.55 + R() * 0.3, seed: seed * 100 + i, taper: BRUSH.both, wet: 0.2 });
    }
  }
  // the ridge line itself, dry brush
  if (o.line) {
    for (let k = 0, i0 = 0; i0 < ridge.length - 3; k++) {
      const i1 = Math.min(ridge.length - 1, i0 + 12 + ((R() * 30) | 0));
      if (baseY - ridge[i0][1] > h * 0.12) inkStroke(lg, ridge.slice(i0, i1 + 1).map(p => [p[0], p[1] + 2]), o.line * (0.6 + R() * 0.6), { alpha: a * 1.2, dry: 0.45, seed: seed * 50 + k, wet: 0.5 });
      i0 = i1 + ((R() * 6) | 0);
    }
  }
  // moss dots (点苔) on the ridge
  const dots = o.dots ?? 0;
  for (let i = 0; i < ridge.length * dots * 0.25; i++) {
    const p = ridge[(R() * ridge.length) | 0]; if (baseY - p[1] < h * 0.25) continue;
    const s = 2.5 + R() * 4; lg.fillStyle = ink(Math.min(0.95, a * 1.6));
    lg.beginPath(); lg.ellipse(p[0] + (R() - 0.5) * 16, p[1] + R() * 10, s, s * 0.7, R() * 3, 0, TAU); lg.fill();
  }
  granulate(lg, L.width, L.height, seed, 0.45, 1 / 30);
  g.save(); if (o.blur) g.filter = `blur(${o.blur}px)`; g.drawImage(L, ox, oy); g.restore();
  return ridge;
}

// ---------------------------------------------------------------- rain
/** Slanted rain lines, three depths, held on twos. o.avoid: [{x, y, w, h}] rectangles kept clear (lyrics). */
function inkRain(g, t, o = {}) {
  const tq = o.onTwos === false ? t : onTwos(t), seed = o.seed || 3, n = Math.round((o.n || 320) * clamp(o.density ?? 1, 0, 3));
  const ang = o.angle ?? 0.16, sx = Math.sin(ang), cy = Math.cos(ang), a = o.alpha ?? INK.A.dan;
  const x0 = o.x0 ?? 0, y0 = o.y0 ?? 0, w = o.w ?? W, h = o.h ?? H, avoid = o.avoid || [];
  g.save(); g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    g.strokeStyle = ink(a * [0.45, 0.7, 1][pass]); g.lineWidth = [0.8, 1.2, 1.8][pass] * (o.width || 1);
    g.beginPath();
    for (let i = pass; i < n; i += 3) {
      const v = (o.speed || 1500) * (0.6 + pass * 0.3) * (0.9 + 0.2 * hash(i, 9, seed)), L = (o.len || 60) * (0.55 + pass * 0.4) * (0.7 + 0.6 * hash(i, 8, seed));
      const span = h + L + 160, y = y0 + ((hash(i, 1, seed) * span + tq * v) % span) - L - 80;
      const x = x0 + hash(i, 2, seed) * (w + 300) - 150 + (y - y0) * sx / cy;
      const ex = x + sx * L, ey = y + cy * L;
      let hit = false;
      for (const r of avoid) if (Math.max(x, ex) > r.x && Math.min(x, ex) < r.x + r.w && ey > r.y && y < r.y + r.h) { hit = true; break; }
      if (hit) continue;
      g.moveTo(x, y); g.lineTo(ex, ey);
    }
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- soft layer
const SOFTS = {};
let SOFT_FULL = null, SOFT_GRAIN = null;
/**
 * Draw fn(g2, scale) into a low-res canvas (full-res coordinates; the scale is applied for you) and
 * blend it back upscaled: soft wet edges for moving washes. o.scale (default 0.25), o.alpha,
 * o.grain 0..1 (ink settles unevenly: speckles of paper show through the wash).
 */
function inkSoft(g, fn, o = {}) {
  const sc = o.scale || 0.25, key = sc.toFixed(3);
  const S = SOFTS[key] || (SOFTS[key] = mk(W * sc, H * sc));
  const s = S.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, S.width, S.height); s.globalAlpha = 1; s.filter = 'none'; s.globalCompositeOperation = 'source-over';
  s.setTransform(S.width / W, 0, 0, S.height / H, 0, 0); s.beginPath(); fn(s, sc); s.setTransform(1, 0, 0, 1, 0, 0);   // fresh path: canvases are shared
  let src = S, sw = S.width, sh = S.height;
  if (o.grain) {
    if (!SOFT_FULL) { SOFT_FULL = mk(W, H); SOFT_GRAIN = mk(W, H); granulateInto(SOFT_GRAIN.getContext('2d'), W, H, 555); }
    const fg = SOFT_FULL.getContext('2d'); fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalAlpha = 1; fg.globalCompositeOperation = 'source-over';
    fg.clearRect(0, 0, W, H); fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = 'high'; fg.drawImage(S, 0, 0, W, H);
    fg.globalCompositeOperation = 'destination-out'; fg.globalAlpha = clamp(o.grain); fg.drawImage(SOFT_GRAIN, 0, 0);
    fg.globalCompositeOperation = 'source-over'; fg.globalAlpha = 1;
    src = SOFT_FULL; sw = W; sh = H;
  }
  g.save(); g.globalAlpha = o.alpha ?? 1; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, sw, sh, 0, 0, W, H); g.restore();
}
/** A speckle mask (opaque where paper should show through ink), for inkSoft's grain. */
function granulateInto(g, w, h, seed) {
  const R = mulberry32(seed), n = Math.round(w * h / 22);
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${R() * R()})`; const s = 0.7 + R() * 2; g.fillRect(R() * w, R() * h, s, s * (0.5 + R())); }
  // fibre-shaped gaps
  g.lineCap = 'round';
  for (let i = 0; i < w * h / 900; i++) { const x = R() * w, y = R() * h, a = R() * TAU, L = 4 + R() * 30; g.strokeStyle = `rgba(0,0,0,${0.15 + R() * 0.35})`; g.lineWidth = 0.5 + R() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
}

// ---------------------------------------------------------------- lyrics: vertical columns
/** Split a line into columns at the spaces of its text; returns [[token…], …] with Latin marked. */
function inkColumnsOf(line) {
  const cols = [[]], words = line.words; let wi = 0, i = 0; const txt = line.text;
  while (i < txt.length && wi < words.length) {
    if (/\s/.test(txt[i])) { if (cols[cols.length - 1].length) cols.push([]); i++; continue; }
    const w = words[wi], latin = /[A-Za-z]/.test(w.w);
    cols[cols.length - 1].push({ text: w.w, start: w.start, end: w.end, latin });
    i += w.w.length; wi++;
  }
  // Latin words stay with the column before them (a short sideways annotation), not a column of their own
  for (let c = cols.length - 1; c > 0; c--) if (cols[c].length && cols[c].every(tk => tk.latin)) { cols[c - 1].push(...cols[c]); cols.splice(c, 1); }
  return cols.filter(c => c.length);
}

let CHC = null;
/**
 * One character, written rather than popped: a faint ghost fades in during the lead, then from the moment
 * it is sung the ink runs down the character (a soft-edged reveal, top → bottom; left → right for Latin)
 * while it darkens, with a brief wet halo. No scaling, no jumps: every value is continuous in age.
 */
function drawChar(g, text, x, y, size, age, lead, fade, latin, ghostMul = 1) {
  const fs = latin ? Math.round(size * 0.66) : size, REV = 0.36;
  const ghost = 0.075 * smoothstep(-lead, 0, age) * fade * ghostMul;
  const rev = age <= 0 ? 0 : ease.outQuad(clamp(age / REV));
  const dark = lerp(0.6, 0.88, smoothstep(0, 0.9, age));
  const halo = age <= 0 ? 0 : 0.15 * smoothstep(0, 0.15, age) * (1 - smoothstep(0.35, 1.4, age)) * fade;
  g.save(); g.font = `${fs}px ${INK.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (ghost > 0.003 && rev < 1) { g.fillStyle = ink(ghost); g.fillText(text, x, y); }
  if (halo > 0.003) { g.filter = `blur(${fs * 0.07}px)`; g.fillStyle = ink(halo); g.fillText(text, x, y + fs * 0.02); g.filter = 'none'; }
  if (rev >= 1) { g.fillStyle = ink(dark * fade); g.fillText(text, x, y); }
  else if (rev > 0) {
    const w = Math.ceil(g.measureText(text).width + fs * 0.5), h = Math.ceil(fs * 1.6);
    if (!CHC || CHC.width < w || CHC.height < h) CHC = mk(Math.max(w, CHC ? CHC.width : 0), Math.max(h, CHC ? CHC.height : 0));
    const c = CHC.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, w, h);
    c.font = g.font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = ink(dark); c.fillText(text, w / 2, h / 2);
    const fe = fs * 0.4, span = latin ? w : fs * 1.1, a0 = (latin ? w / 2 : h / 2) - span / 2, edge = lerp(a0, a0 + span + fe, rev);
    const gr = latin ? c.createLinearGradient(edge - fe, 0, edge, 0) : c.createLinearGradient(0, edge - fe, 0, edge);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalCompositeOperation = 'destination-in'; c.fillStyle = gr; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
    g.globalAlpha = fade; g.drawImage(CHC, 0, 0, w, h, x - w / 2, y - h / 2, w, h);
  }
  g.restore();
}

/**
 * Draw one lyric line as vertical columns, first column at x (right), going left; y = top of the
 * columns. Characters appear when sung (faint 0.4 s lead). o.fade multiplies everything.
 * Returns the bounding box {x, y, w, h} (use it as a rain `avoid` rect).
 */
function inkColumn(g, line, t, x, y, o = {}) {
  const size = o.size || 68, gap = size * 1.14, colGap = size * 1.45, lead = o.lead ?? 0.4, fade = o.fade ?? 1;
  // a column longer than the page allows folds into the next column (at a Latin word if there is one near)
  const maxRows = o.maxRows || Math.max(3, Math.floor((H - 96 - y - size * 0.2) / gap));
  const cols = [];
  for (const c of inkColumnsOf(line)) {
    const cjk = c.filter(tk => !tk.latin).length;
    if (cjk <= maxRows) { cols.push(c); continue; }
    const per = Math.ceil(cjk / Math.ceil(cjk / maxRows));
    for (let i = 0; i < c.length; i += per) cols.push(c.slice(i, i + per));
  }
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  let maxH = 0;
  cols.forEach((col, c) => {
    const cx = x - c * colGap; let cy = y + size / 2;
    for (const tk of col) {
      if (tk.latin) {
        cy += size * 0.14;
        drawChar(g, tk.text, cx, cy, size, t - tk.start, lead, fade, true, o.ghost ?? 1);
        cy += size * 0.8;
      } else { drawChar(g, tk.text, cx, cy, size, t - tk.start, lead, fade, false, o.ghost ?? 1); cy += gap; }
    }
    maxH = Math.max(maxH, cy - y - (gap - size));
  });
  g.restore();
  const wBox = (cols.length - 1) * colGap + size * 1.3;
  return { x: x - wBox + size * 0.65, y: y - size * 0.3, w: wBox, h: maxH + size * 0.6 };
}

/**
 * The lyric line being sung at f.t, as vertical columns at (x, y). The previous line dries away
 * (0.3 s) just before the next one's first character shows; a finished line lingers o.hold seconds after its end.
 * o.lines: restrict to these line indices; o.place(line) → [x, y] gives a line its own position (so a line
 * that is still on screen across a cut does not jump). Returns the box of the current line (or null).
 */
function inkLyrics(g, f, x, y, o = {}) {
  const L = f.lyrics.lines.filter(l => l.words.length && (!o.lines || o.lines.includes(l.i))), lead = o.lead ?? 0.4, t = f.t, hold = o.hold ?? 1.2;
  let cur = -1; for (let i = 0; i < L.length; i++) if (L[i].words[0].start - lead - 0.3 <= t) cur = i;
  if (cur < 0) return null;
  let box = null, prevVis = 0;
  for (let i = Math.max(0, cur - 1); i <= cur; i++) {
    const l = L[i], next = L[i + 1];
    let fade = 1;
    if (next) {   // dry away before the next line is sung — but not before this line's last character has been written
      const ns = next.words[0].start, lastS = l.words[l.words.length - 1].start;
      const f0 = Math.max(ns - lead - 0.25, Math.min(ns - 0.3, lastS + 0.35));
      fade = 1 - clamp((t - f0) / 0.3);
    }
    fade *= 1 - clamp((t - (l.end + hold)) / 0.8);
    if (o.fade != null) fade *= o.fade;
    if (i === cur - 1) prevVis = Math.max(0, fade);
    if (fade <= 0) continue;
    const [lx, ly] = (o.place && o.place(l)) || [x, y];                       // position belongs to the line, not the shot
    const b = inkColumn(g, l, t, lx, ly, { ...o, fade, ghost: i === cur ? 1 - prevVis : 1 });   // the next line's ghost waits for the old one to go
    if (i === cur) box = b;
  }
  return box;
}

// ---------------------------------------------------------------- wipes
let MSK = null;
const msk = () => { if (!MSK) MSK = mk(W / 4, H / 4); const m = MSK.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, MSK.width, MSK.height); m.setTransform(0.25, 0, 0, 0.25, 0, 0); return m; };
function blotR(k) { return Math.hypot(W, H) * 1.05 * ease.inOutCubic(clamp(k)); }
MV.wipe('ink', {
  mask(m, k, e) {
    const p = e.params || {}, s = msk(), r = blotR(k);
    pathSmooth(s, blobPts(p.wx ?? W / 2, p.wy ?? H / 2, Math.max(1, r), (e.i + 1) * 13, 0.28)); s.fillStyle = '#fff'; s.fill();
    m.imageSmoothingEnabled = true; m.drawImage(MSK, 0, 0, W, H);
  },
  over(g, k, e) {
    const p = e.params || {}, r = blotR(k); if (k <= 0 || k >= 1) return;
    inkSoft(g, s => {
      pathSmooth(s, blobPts(p.wx ?? W / 2, p.wy ?? H / 2, Math.max(1, r), (e.i + 1) * 13, 0.28));
      s.lineWidth = 16; s.strokeStyle = ink(0.35 * Math.sin(Math.PI * k)); s.stroke();
    }, { scale: 0.5 });
  },
});
MV.wipe('wash', {
  mask(m, k, e) {
    const p = e.params || {}, dir = p.dir || -1, s = msk(), X = dir < 0 ? lerp(W + 250, -250, ease.inOutQuad(k)) : lerp(-250, W + 250, ease.inOutQuad(k));
    s.beginPath(); s.moveTo(X, -20);
    for (let y = 0; y <= H + 20; y += 20) s.lineTo(X + 110 * fbm2(y / 260, e.i, e.i * 3 + 1, 3), y);
    s.lineTo(dir < 0 ? W + 400 : -400, H + 20); s.lineTo(dir < 0 ? W + 400 : -400, -20); s.closePath();
    s.fillStyle = '#fff'; s.fill(); m.imageSmoothingEnabled = true; m.drawImage(MSK, 0, 0, W, H);
  },
});

MV.ink = { INK, ink, fbm2, paintXuan, granulate, blobPts, inkSprites, bloomR, inkBloom, inkDrop, BRUSH, cutPolyline, resamplePolyline, inkStroke, spline, inkRidge, inkRain, inkSoft, inkColumnsOf, inkColumn, inkLyrics, inkLoadFont };
Object.assign(G, MV.ink);
})(window);
