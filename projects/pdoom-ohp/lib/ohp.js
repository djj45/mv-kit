// lib/ohp.js — the look of projects/pdoom-ohp: one overhead projector in a dark seminar room.
//
// Everything on screen is what the projector throws on the wall: a warm pool of light, a hand-drawn acetate sheet,
// the SHADOW of the hand that draws it (there is no lit hand in this film, only its shadow), dust in the beam,
// marker ink and grease pencil. Scenes paint their diagram in ink colours on top of OHP.back(g, f).
//
// Deterministic: every wobble comes from hash(tick, i, seed) / noise1, never Math.random.
(function (G) {
'use strict';
const MV = G.MV;
const TAU2 = Math.PI * 2;

const C = {
  room: '#0B0E14', wall: '#D6CDB4', lit: '#F7EFDA', lit2: '#EDE0C0',
  ink: '#23262E', ink2: '#737A85', ink3: '#A9AFA8',
  blue: '#2C5C9E', red: '#C8342A', red2: '#8E2018', amber: '#D98829',
  green: '#3D7C5A', chalk: '#F4EEE0', metal: '#9AA0A8', dark: '#15161B',
  shadow: '26,22,28',
};

// ---- fonts: every one of them is a pen, a typewriter or a stamp. set g.font / letterSpacing.
const F = {
  hand(g, size, o) { o = o || {}; g.font = (o.weight || 400) + ' ' + size + 'px "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive'; g.letterSpacing = ((o.track || 0) * size) + 'px'; },
  mark(g, size, o) { o = o || {}; g.font = (o.weight || 700) + ' ' + size + 'px "Marker Felt", Chalkduster, "Bradley Hand", cursive'; g.letterSpacing = ((o.track || 0.01) * size) + 'px'; },
  type(g, size, o) { o = o || {}; g.font = (o.weight || 400) + ' ' + size + 'px "American Typewriter", "Courier New", monospace'; g.letterSpacing = ((o.track || 0) * size) + 'px'; },
  mono(g, size) { g.font = '500 ' + size + 'px Menlo, "Courier New", monospace'; g.letterSpacing = '0px'; },
  stamp(g, size, o) { o = o || {}; g.font = (o.weight || 700) + ' ' + size + 'px "Avenir Next Condensed", "DIN Condensed", Impact, sans-serif'; g.letterSpacing = ((o.track || 0.08) * size) + 'px'; },
  cjk(g, size) { g.font = '500 ' + size + 'px "PingFang SC", "Hiragino Sans GB", sans-serif'; g.letterSpacing = '0px'; },
};

// ---- small geometry helpers -------------------------------------------------------------
/** Resample a polyline to (about) equal steps. */
function resample(pts, step) {
  if (pts.length < 2) return [pts[0].slice(), pts[0].slice()];
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1];
  if (total < 1e-6) return [pts[0].slice(), pts[pts.length - 1].slice()];
  const n = Math.max(1, Math.round(total / step)), out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const d = total * k / n;
    while (j < L.length - 2 && L[j + 1] < d) j++;
    const t = (d - L[j]) / Math.max(1e-6, L[j + 1] - L[j]);
    out.push([lerp(pts[j][0], pts[j + 1][0], t), lerp(pts[j][1], pts[j + 1][1], t)]);
  }
  return out;
}
/** The first `k` (0..1) of a polyline by arc length. */
function sliceTo(pts, k) {
  if (k >= 1) return pts.map(p => p.slice());
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const want = L[L.length - 1] * clamp(k), out = [pts[0].slice()];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= want) { out.push(pts[i].slice()); continue; }
    const t = (want - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    out.push([lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]);
    break;
  }
  if (out.length < 2) out.push(pts[1] ? pts[1].slice() : pts[0].slice());
  return out;
}
/** Sample y = fn(x) over [x0, x1] with n points. */
function plot(x0, x1, fn, n) { const o = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); o.push([x, fn(x)]); } return o; }
/** The egg-shaped bag of light the lamp throws on the wall (pre-rendered once). */
function lightField(cold, red) {
  const c = mk(W, H), g = c.getContext('2d');
  g.fillStyle = C.wall; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W * 0.44, H * 1.06, H * 0.10, W * 0.44, H * 1.06, H * 1.42);
  if (!cold && !red) {
    rg.addColorStop(0, '#FFF8E8'); rg.addColorStop(0.30, C.lit); rg.addColorStop(0.66, C.lit2); rg.addColorStop(1, C.wall);
  } else if (cold) {
    rg.addColorStop(0, '#F3F2EC'); rg.addColorStop(0.34, '#E4E3DA'); rg.addColorStop(0.70, '#CFD2CE'); rg.addColorStop(1, '#AFB2B0');
  } else {
    rg.addColorStop(0, '#FFEEDC'); rg.addColorStop(0.34, '#F3D9C2'); rg.addColorStop(0.70, '#E0B69C'); rg.addColorStop(1, '#C99C86');
  }
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  // the wall: a very quiet grain, and the projector's slightly trapezoid edge (a keystone hint)
  const R = mulberry32(7);
  for (let i = 0; i < 5200; i++) {
    const x = R() * W, y = R() * H, a = 0.018 + 0.05 * R();
    g.fillStyle = R() < 0.5 ? 'rgba(60,52,40,' + a + ')' : 'rgba(255,252,240,' + a + ')';
    g.fillRect(x, y, 1 + R() * 1.6, 1 + R() * 1.6);
  }
  // the sheet of light: its corners are the projector's frame, a touch darker just outside
  g.save();
  g.globalCompositeOperation = 'multiply';
  const kg = g.createLinearGradient(0, 0, 0, H);
  kg.addColorStop(0, 'rgba(120,112,98,0.30)'); kg.addColorStop(0.16, 'rgba(255,255,255,0)');
  kg.addColorStop(0.9, 'rgba(255,255,255,0)'); kg.addColorStop(1, 'rgba(120,112,98,0.16)');
  g.fillStyle = kg; g.fillRect(0, 0, W, H);
  g.restore();
  return c;
}
function acetateTex() {
  const c = mk(W, H), g = c.getContext('2d'), R = mulberry32(23);
  for (let i = 0; i < 46; i++) {                      // scratches on the film
    const x = R() * W, y = R() * H, a = R() * TAU2, L = 60 + R() * 420;
    g.strokeStyle = R() < 0.6 ? 'rgba(255,255,255,0.10)' : 'rgba(70,62,52,0.07)';
    g.lineWidth = 0.7 + R() * 1.5;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (R() - 0.5) * 30, y + Math.sin(a) * L * 0.5 + (R() - 0.5) * 30, x + Math.cos(a) * L, y + Math.sin(a) * L);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) {                       // fingerprints
    const x = R() * W, y = R() * H, r0 = 26 + R() * 30;
    g.strokeStyle = 'rgba(250,246,232,0.055)'; g.lineWidth = 2.2;
    for (let k = 0; k < 7; k++) { const r = r0 + k * 5.5; g.beginPath(); g.arc(x, y, r, R() * 3, R() * 3 + 2.1); g.stroke(); }
  }
  for (let i = 0; i < 900; i++) {                     // film dirt
    const x = R() * W, y = R() * H, s = 0.6 + R() * 2.1;
    g.fillStyle = R() < 0.55 ? 'rgba(54,48,40,0.10)' : 'rgba(255,252,244,0.13)';
    g.beginPath(); g.arc(x, y, s, 0, TAU2); g.fill();
  }
  return c;
}

let f0t = 0;                                  // the current frame's t (so penAt can be called without f)
const OHP = {
  C: C, F: F,
  lightWarm: null, lightCold: null, lightRed: null, tex: null, dusts: null,

  // ================================================================ the world
  /** The wall under the lamp. o: {cold, red, dim, tex, edge, tape, swap, glow} */
  back(g, f, o) {
    o = o || {};
    const cold = o.cold || 0, red = o.red || 0;
    if (!OHP.lightWarm) { OHP.lightWarm = lightField(false, false); OHP.lightCold = lightField(true, false); OHP.lightRed = lightField(false, true); OHP.tex = acetateTex(); }
    g.drawImage(OHP.lightWarm, 0, 0);
    if (cold > 0) { g.save(); g.globalAlpha = cold; g.drawImage(OHP.lightCold, 0, 0); g.restore(); }
    if (red > 0) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = red; g.drawImage(OHP.lightRed, 0, 0); g.restore(); }
    if (o.tex !== false) { g.save(); g.globalAlpha = 0.75; g.drawImage(OHP.tex, 0, 0); g.restore(); }
    if (o.dim) { g.fillStyle = 'rgba(10,12,20,' + clamp(o.dim) * 0.92 + ')'; g.fillRect(0, 0, W, H); }
    // the acetate sheet is always on the glass: its edge, its shadow and its tape, a little different every shot
    if (o.sheet !== false) {
      const n = o.sheet != null ? o.sheet : (f.entry ? f.entry.i + 1 : 0);
      OHP.sheetEdge(g, o.edge && o.edge !== true ? Object.assign({ n: n }, o.edge) : { n: n });
    }
    if (o.glow) {                                   // the lamp itself: a hot spot that breathes with the bass
      const k = 0.5 + 0.5 * f.a.low;
      const rg = g.createRadialGradient(W * 0.5, H * 1.02, 10, W * 0.5, H * 1.02, H * (0.5 + 0.1 * k));
      rg.addColorStop(0, 'rgba(255,246,222,' + (0.30 * k) + ')'); rg.addColorStop(1, 'rgba(255,246,222,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    }
    const swap = o.swap != null ? o.swap : !!(f.entry && f.entry.swap);
    if (swap) {                                     // the new sheet is on the glass: its shadow leaves the frame
      const k = prog(f.t, f.from, f.from + 0.34, ease.outCubic);
      if (k < 1) {                                  // the shadow of the sheet's near edge, retreating upwards
        g.save(); g.globalAlpha = (1 - k) * 0.52; g.fillStyle = 'rgba(18,16,24,1)';
        const y = H * 0.34 * (1 - k);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, y * 1.12); g.lineTo(0, y * 0.86); g.closePath(); g.fill();
        g.restore();
        // and the lamp comes back to full: a short, quiet settle over the whole sheet
        g.save(); g.globalAlpha = 0.13 * (1 - k);
        g.fillStyle = 'rgba(255,250,236,1)';
        g.fillRect(0, 0, W, H);
        g.restore();
      }
    }
    if (o.warm) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = o.warm; g.fillStyle = '#E8C79A'; g.fillRect(0, 0, W, H); g.restore(); }
  },
  /**
   * The acetate sheet itself: its edge, its shadow on the wall and its corner tape. Every shot gets its own
   * inset and angle (from the shot number) so the film looks like a stack of transparencies and not one still.
   * o: { n: shot number, m, rot, tape: [which corners] }
   */
  sheetEdge(g, o) {
    o = o || {};
    const n = o.n == null ? 0 : o.n;
    const m = o.m == null ? 40 + hash(n, 3, 7) * 34 : o.m;                    // 40..74 px inside the frame
    const rot = o.rot == null ? (hash(n, 5, 9) - 0.5) * 0.016 : o.rot;        // up to ±0.46°
    const x = m, y = m * 0.66, w = W - 2 * m, h = H - m * 1.42;
    g.save();
    g.translate(W / 2, H / 2); g.rotate(rot); g.translate(-W / 2, -H / 2);
    g.save();                                 // the sheet's own shadow, a couple of px down-right
    g.strokeStyle = 'rgba(40,34,26,0.20)'; g.lineWidth = 5;
    g.beginPath(); g.rect(x + 4, y + 6, w, h); g.stroke();
    g.strokeStyle = 'rgba(46,40,32,0.30)'; g.lineWidth = 2.0;
    g.beginPath(); g.rect(x + 2, y + 3, w, h); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(255,252,240,0.55)'; g.lineWidth = 1.6;              // the lit edge of the film
    g.beginPath(); g.rect(x, y, w, h); g.stroke();
    g.strokeStyle = 'rgba(120,110,92,0.22)'; g.lineWidth = 1.0;
    g.beginPath(); g.rect(x + 1.5, y + 1.5, w - 3, h - 3); g.stroke();
    const T = [[x + 26, y + 10, -0.02], [x + w - 96, y + 12, 0.03], [x + 34, y + h - 42, 0.02], [x + w - 112, y + h - 46, -0.04]];
    const pick = o.tape || [hash(n, 11, 3) < 0.5 ? 0 : 3, hash(n, 13, 5) < 0.5 ? 1 : 2];
    for (const i of pick) if (T[i]) OHP.tape(g, T[i][0], T[i][1], T[i][2], 78, 27);
    g.restore();
  },
  /** A strip of paper tape. */
  tape(g, x, y, ang, w, h) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = 'rgba(226,190,120,0.62)'; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = 'rgba(255,240,205,0.35)'; g.fillRect(-w / 2, -h / 2, w, h * 0.42);
    g.strokeStyle = 'rgba(120,96,54,0.30)'; g.lineWidth = 1; g.strokeRect(-w / 2, -h / 2, w, h);
    g.restore();
  },
  /** Dust in the beam: two layers (behind and in front of the drawing). */
  dust(g, f, o) {
    o = o || {};
    if (!OHP.dusts) {
      const R = mulberry32(41); OHP.dusts = [];
      for (let i = 0; i < 150; i++) OHP.dusts.push([R() * W, R() * H, 0.6 + R() * 2.4, R(), R() * 6.28]);
    }
    const front = o.front ? 1 : 0, gain = o.gain == null ? 1 : o.gain;
    g.save();
    for (let i = 0; i < OHP.dusts.length; i++) {
      const d = OHP.dusts[i];
      if ((i % 2) !== front) continue;
      const x = (d[0] + 26 * noise1(f.t * 0.07 + i * 0.11, 5) + W) % W;
      const y = (d[1] + 16 * noise1(f.t * 0.05 + i * 0.07, 9) + H) % H;
      const tw = 0.55 + 0.45 * noise1(f.t * 0.9 + i, 3);
      const fall = 0.35 + 0.65 * clamp(1 - Math.hypot((x - W * 0.44) / W, (y - H * 1.06) / H * 0.9));
      const a = (front ? 0.22 : 0.15) * d[2] * tw * fall * gain;
      g.fillStyle = 'rgba(255,248,228,' + a.toFixed(3) + ')';
      g.beginPath(); g.arc(x, y, d[2] * 0.55, 0, TAU2); g.fill();
      if (d[3] > 0.86) { g.fillStyle = 'rgba(60,52,40,' + (a * 0.5).toFixed(3) + ')'; g.fillRect(x, y, d[2] * 1.4, 1); }
    }
    g.restore();
  },

  // ================================================================ ink
  /**
   * A marker stroke through pts. o: {w, color, seed, tick, boil, vary, upto, taper, grease, alpha, cap, step}
   * Width breathes along the stroke (noise), every point is nudged per drawing (f.tick), so the line boils.
   */
  ink(g, f, pts, o) {
    o = o || {};
    if (!pts || pts.length < 2) return;
    const tk = o.tick == null ? f.tick : o.tick, seed = o.seed || 0;
    let P = o.upto == null || o.upto >= 1 ? pts.map(p => p.slice()) : sliceTo(pts, o.upto);
    P = resample(P, o.step || 7);
    const amp = o.boil == null ? 1.35 : o.boil, n = P.length;
    const J = [], Wd = [];
    const w0 = o.w == null ? 8 : o.w, vary = o.vary == null ? 0.20 : o.vary;
    for (let i = 0; i < n; i++) {
      J.push([P[i][0] + (hash(tk, i * 5 + seed * 977, 3) - 0.5) * 2 * amp,
              P[i][1] + (hash(tk, i * 5 + seed * 977, 4) - 0.5) * 2 * amp]);
      const s = n > 1 ? i / (n - 1) : 0;
      let ww = w0 * (1 + vary * noise1(i * 0.5 + seed * 1.7, seed + 9));
      if (o.taper) ww *= o.taper(s);
      Wd.push(Math.max(0.4, ww));
    }
    const draw = (jj, ww, alpha, col) => {
      const Lp = [], Rp = [];
      for (let i = 0; i < n; i++) {
        const a = jj[Math.max(0, i - 1)], b = jj[Math.min(n - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const hw = ww[i] / 2;
        Lp.push([jj[i][0] - dy * hw, jj[i][1] + dx * hw]);
        Rp.push([jj[i][0] + dy * hw, jj[i][1] - dx * hw]);
      }
      g.save();
      g.globalAlpha = alpha;
      g.fillStyle = col;
      pathPoly(g, Lp.concat(Rp.reverse()));
      g.fill();
      if (o.cap !== false) {
        g.beginPath(); g.arc(jj[0][0], jj[0][1], ww[0] / 2, 0, TAU2); g.fill();
        g.beginPath(); g.arc(jj[n - 1][0], jj[n - 1][1], ww[n - 1] / 2, 0, TAU2); g.fill();
      }
      g.restore();
    };
    const col = o.color || C.ink;
    draw(J, Wd, o.alpha == null ? 1 : o.alpha, col);
    if (o.grease) {                                  // grease pencil: a second pass, drier and offset
      const J2 = J.map((p, i) => [p[0] + (hash(tk + 3, i * 7 + seed, 8) - 0.5) * 4.2, p[1] + (hash(tk + 3, i * 7 + seed, 9) - 0.5) * 4.2]);
      draw(J2, Wd.map(w => w * 0.62), (o.alpha == null ? 1 : o.alpha) * 0.55, o.color2 || col);
    }
  },
  /** A dashed marker line (same jitter rules). */
  inkDash(g, f, pts, o) {
    o = o || {}; o = Object.assign({}, o);
    const on = o.dashOn || 26, off = o.dashOff || 20;
    let rest = o.upto == null ? 1 : o.upto;
    const L = [];
    for (let i = 1; i < pts.length; i++) L.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = L.reduce((a, b) => a + b, 0), pick = (a, b) => {          // sub-polyline between lengths a..b
      const out = []; let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const s0 = acc, s1 = acc + L[i - 1];
        if (s1 >= a && s0 <= b) {
          const t0 = clamp((a - s0) / Math.max(1e-6, L[i - 1])), t1 = clamp((b - s0) / Math.max(1e-6, L[i - 1]));
          out.push([lerp(pts[i - 1][0], pts[i][0], t0), lerp(pts[i - 1][1], pts[i][1], t0)]);
          out.push([lerp(pts[i - 1][0], pts[i][0], t1), lerp(pts[i - 1][1], pts[i][1], t1)]);
        }
        acc = s1;
      }
      return out;
    };
    for (let d = 0; d < total * rest; d += on + off) OHP.ink(g, f, pick(d, Math.min(d + on, total * rest)), o);
  },
  /**
   * A marker stroke that STOPS SHORT of a rectangle: the parts of the polyline inside rect (grown by o.pad) are
   * left out. For the things that must not run into a line of the lyric: a chart line, fence posts, iris rays.
   */
  inkOutside(g, f, pts, rect, o) {
    o = o || {};
    const pad = o.pad == null ? 8 : o.pad;
    const R = [rect[0] - pad, rect[1] - pad, rect[0] + rect[2] + pad, rect[1] + rect[3] + pad];
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      let t0 = 0, t1 = 1, inside = true;
      const clip = (p, q) => {
        if (Math.abs(p) < 1e-9) { if (q < 0) inside = false; return; }
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
      };
      clip(-dx, a[0] - R[0]); clip(dx, R[2] - a[0]);
      clip(-dy, a[1] - R[1]); clip(dy, R[3] - a[1]);
      const pt = t => [a[0] + dx * t, a[1] + dy * t];
      if (!inside || t0 >= t1) { segs.push([a, b]); continue; }        // the whole segment stays outside
      if (t0 > 0.001) segs.push([a, pt(t0)]);
      if (t1 < 0.999) segs.push([pt(t1), b]);
    }
    for (const s2 of segs) if (Math.hypot(s2[1][0] - s2[0][0], s2[1][1] - s2[0][1]) > 1.2) OHP.ink(g, f, s2, o);
  },
  /** The ink box a line of the lyric will occupy at (y, size): for keeping drawings out of it. */
  lyricBand(y, size, o) {
    o = o || {};
    const w = o.w || W;
    return [o.x || 0, y - size * 0.80 - (o.pad || 10), w, size * 1.05 + 2 * (o.pad || 10)];
  },
  /** Fill a closed shape (a point list) with marker hatching; o.stroke also inks its outline. */
  hatch(g, f, poly, o) {
    o = o || {};
    const box = o.box || [0, 0, W, H], gap = o.gap || 17, ang = o.ang == null ? -0.9 : o.ang;
    const outline = gg => { pathPoly(gg, poly); };
    g.save();
    outline(g); g.clip();
    if (o.fill) { g.fillStyle = o.fill; g.fill(); }
    const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2, R = Math.hypot(box[2], box[3]);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const n = Math.ceil(R * 2 / gap);
    for (let i = -n; i <= n; i++) {
      const ox = cx + Math.cos(ang + Math.PI / 2) * i * gap, oy = cy + Math.sin(ang + Math.PI / 2) * i * gap;
      if (o.upto != null && Math.abs(i) / n > o.upto) continue;
      OHP.ink(g, f, [[ox - dx * R, oy - dy * R], [ox + dx * R, oy + dy * R]], { w: o.w || 7, color: o.color || C.ink, alpha: o.alpha == null ? 0.85 : o.alpha, seed: (o.seed || 0) + i * 13, boil: o.boil == null ? 1.1 : o.boil, step: 12 });
    }
    g.restore();
    if (o.stroke) OHP.ink(g, f, o.close === false ? poly : poly.concat([poly[0]]), { w: o.sw || o.w || 8, color: o.color || C.ink, seed: (o.seed || 0) + 7, boil: o.boil });
  },
  /** The straight line you get with a ruler: no wobble, one clean pass, a slight start/stop blob. */
  rule(g, f, a, b, o) {
    o = o || {};
    g.save();
    g.strokeStyle = o.color || C.ink; g.lineWidth = o.w || 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.restore();
  },
  arrow(g, f, a, b, o) {
    o = o || {};
    OHP.ink(g, f, [a, b], Object.assign({ w: o.w || 7 }, o));
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = o.head || 34;
    const p1 = [b[0] - Math.cos(ang - 0.42) * L, b[1] - Math.sin(ang - 0.42) * L];
    const p2 = [b[0] - Math.cos(ang + 0.42) * L, b[1] - Math.sin(ang + 0.42) * L];
    OHP.ink(g, f, [p1, b, p2], Object.assign({}, o, { w: (o.w || 7) * 0.9, seed: (o.seed || 0) + 5 }));
  },
  /** Axes drawn with a ruler, tick marks, small typewriter numbers (kept under 24 px: no qa text checks). */
  axes(g, f, o) {
    const x = o.x, y = o.y, w = o.w, h = o.h;
    OHP.rule(g, f, [x, y], [x, y + h], { w: 4, color: o.color || C.ink });
    OHP.rule(g, f, [x, y + h], [x + w, y + h], { w: 4, color: o.color || C.ink });
    const nx = o.nx || 6, ny = o.ny || 4;
    for (let i = 0; i <= nx; i++) { const xx = x + w * i / nx; OHP.rule(g, f, [xx, y + h], [xx, y + h + (i % 2 ? 7 : 13)], { w: 3, color: o.color || C.ink }); }
    for (let i = 0; i <= ny; i++) { const yy = y + h * i / ny; OHP.rule(g, f, [x, yy], [x - (i % 2 ? 7 : 13), yy], { w: 3, color: o.color || C.ink }); }
    if (o.labels) {
      g.save(); g.fillStyle = o.labelColor || C.ink2; F.mono(g, o.labelSize || 19); g.textAlign = 'center'; g.textBaseline = 'top';
      for (let i = 0; i <= nx; i += 2) g.fillText(String(i), x + w * i / nx, y + h + 16);
      g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let i = 0; i <= ny; i += 2) g.fillText(String(ny - i), x - 18, y + h * i / ny);
      g.restore();
    }
  },

  // ================================================================ shadow of the hand
  /**
   * The presenter's hand, as a SHADOW on the wall (the lamp is low and to the left, so the shadow sits up-right).
   * o: { tip: [x, y], ang, s, kind: 'pen' | 'stamp' | 'flat' | 'point', alpha, mirror, pen, soft }
   */
  hand(g, f, o) {
    o = o || {};
    const tip = o.tip, s = o.s == null ? 1.15 : o.s, ang = o.ang == null ? 0 : o.ang;
    const kind = o.kind || 'pen', alive = o.alive == null ? 1 : o.alive;
    const br = 26 * (0.6 + 0.4 * f.a.low) * alive;          // the shadow breathes a little with the music
    const al = (o.alpha == null ? 0.9 : o.alpha) * (1 - 0.16 * (1 - alive));
    g.save();
    g.translate(tip[0], tip[1]); g.rotate(ang); g.scale(o.mirror ? -s : s, s);
    // local frame: the pen points down-right at 30 deg. P(t, u) = t along the barrel, u below it (u < 0 = above).
    const c30 = Math.cos(0.5236), s30 = Math.sin(0.5236);
    const P = (t, u) => [c30 * t - s30 * u, s30 * t + c30 * u];
    const cap = (p, a, b, w) => capsule(p, a[0], a[1], b[0], b[1], w);
    // closed smooth loop; reversed when needed so every sub-path winds the SAME way as capsule().
    const smooth = (p, pts0) => {
      let s = 0;
      for (let i = 0; i < pts0.length; i++) { const a = pts0[i], b = pts0[(i + 1) % pts0.length]; s += a[0] * b[1] - b[0] * a[1]; }
      const pts = s > 0 ? pts0.slice().reverse() : pts0;
      const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const m = mid(pts[n - 1], pts[0]);
      p.moveTo(m[0], m[1]);
      for (let i = 0; i < n; i++) { const q = pts[i], r2 = pts[(i + 1) % n], mm = mid(q, r2); p.quadraticCurveTo(q[0], q[1], mm[0], mm[1]); }
      p.closePath();
    };
    // The hand, built from separated fingers so it reads as a hand and not as a stick with a ball on it:
    // four fingers wrap the barrel (the index lies along the top of it), the thumb crosses underneath, the back of
    // the hand and the wrist come after, and the forearm gets WIDER and runs out of the picture - never a stump.
    const build = (withIndex) => {
      const p = new Path2D();
      cap(p, P(360, 300), P(760, 640), 118);                 // forearm, wider than the wrist
      cap(p, P(700, 590), P(6200, 3720), 150);               // ... and out of the frame, at any scale or angle
      cap(p, P(250, 160), P(430, 330), 106);                 // wrist
      smooth(p, [P(180, -40), P(340, -30), P(452, 90), P(420, 250), P(250, 250), P(170, 110)]);   // back of the hand
      cap(p, P(220, -42), P(40, -28), 36);                   // index, lying along the top of the barrel
      cap(p, P(196, 104), P(62, 44), 42);                    // thumb, crossed under it
      cap(p, P(296, 40), P(96, 74), 38);                     // middle finger, curled
      cap(p, P(316, 84), P(126, 110), 35);                   // ring finger
      cap(p, P(328, 126), P(156, 142), 31);                  // little finger
      return p;
    };
    const paint = (path, alpha) => { g.fillStyle = 'rgba(' + C.shadow + ',' + alpha.toFixed(3) + ')'; g.fill(path); };
    if (o.soft !== false) {                                 // penumbra: three soft rings behind the silhouette
      for (const [sc, a] of [[1.085, 0.07], [1.05, 0.09], [1.022, 0.11]]) {
        g.save(); g.scale(sc, sc); g.translate(-6 * (sc - 1) * 12, -4 * (sc - 1) * 12);
        paint(build(true), a);
        g.restore();
      }
    }
    // the pen goes down first (the hand closes over it): its shadow touches the wall, so it is the darkest
    const wob = (hash(f.tick, 3, 7) - 0.5) * br * 0.35;
    g.save(); g.translate(wob, wob * 0.6);
    if (kind === 'pen' && o.pen !== false) {
      const p = new Path2D();
      p.moveTo(P(-5, -7)[0], P(-5, -7)[1]);                 // chisel tip: narrow at the wall, wide at the grip
      p.lineTo(P(238, -34)[0], P(238, -34)[1]);
      p.lineTo(P(238, 16)[0], P(238, 16)[1]);
      p.lineTo(P(-5, 10)[0], P(-5, 10)[1]);
      p.closePath();
      g.fillStyle = 'rgba(8,8,12,0.96)'; g.fill(p);
    } else if (kind === 'stamp') {
      const p = new Path2D();
      p.moveTo(P(-4, -48)[0], P(-4, -48)[1]);
      p.lineTo(P(-4, 48)[0], P(-4, 48)[1]);
      p.lineTo(P(34, 48)[0], P(34, 48)[1]);
      p.lineTo(P(34, -48)[0], P(34, -48)[1]);
      p.closePath();
      g.fillStyle = 'rgba(12,12,16,0.94)'; g.fill(p);
    }
    g.restore();
    paint(build(kind !== 'point'), al);
    if (kind === 'point') {                                 // pointing: the index alone, the rest closed
      g.save(); g.fillStyle = 'rgba(' + C.shadow + ',' + Math.min(0.95, al + 0.05).toFixed(3) + ')';
      g.beginPath(); cap(g, P(250, -46), P(60, -34), 26); g.fill(); g.restore();
    }
    g.restore();
  },
  /**
   * A paperclip: one continuous wire, two loops (Gem clip), drawn at a wire thickness of 0.07 of its size so a
   * hundred of them still read as paperclips. o = { a: alpha, w: wire, soft: penumbra passes } — metal: true draws
   * the clip itself (steel with a highlight) instead of its shadow.
   */
  clip(g, x, y, s, rot, a, metal, o) {
    o = o || {};
    const wire = o.w == null ? 0.07 : o.w;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const path = new Path2D();
    path.moveTo(-0.34, -0.62);                        // outer run, upper end
    path.lineTo(-0.34, 0.34);
    path.bezierCurveTo(-0.34, 0.94, 0.34, 0.94, 0.34, 0.34);   // the big bottom loop
    path.lineTo(0.34, -0.34);
    path.bezierCurveTo(0.34, -0.90, 0.0, -0.90, 0.0, -0.34);   // the top loop, over the middle
    path.lineTo(0.0, 0.34);
    path.bezierCurveTo(0.0, 0.66, 0.17, 0.66, 0.17, 0.34);     // the small loop inside
    path.lineTo(0.17, -0.30);                                  // and the inner end
    const alpha = a == null ? 0.5 : a;
    if (metal) {
      g.strokeStyle = 'rgba(120,126,134,0.95)'; g.lineWidth = wire * 1.25; g.stroke(path);
      g.strokeStyle = 'rgba(232,236,240,0.75)'; g.lineWidth = wire * 0.5; g.stroke(path);
    } else {
      if (o.soft !== false) {                        // a shadow two steps away from the wall: soft edges
        g.strokeStyle = 'rgba(' + C.shadow + ',' + (alpha * 0.22).toFixed(3) + ')';
        for (const k of [2.4, 1.7]) { g.lineWidth = wire * k; g.stroke(path); }
      }
      g.strokeStyle = 'rgba(' + C.shadow + ',' + alpha.toFixed(3) + ')';
      g.lineWidth = wire; g.stroke(path);
    }
    g.restore();
  },
  /** A tally mark cluster (the film counts itself): n marks at (x, y). */
  tally(g, f, x, y, n, o) {
    o = o || {};
    const w = o.w || 6, h = o.h || 44, gap = o.gap || 17;
    for (let i = 0; i < n; i++) {
      const cx = x + i * gap, five = (i % 5 === 4);
      OHP.ink(g, f, [[cx, y], [cx + (five ? 12 : (hash(i, 5, 1) - 0.5) * 4), y + (five ? -h * 1.05 : -h)]], { w: w, color: o.color || C.ink, seed: i * 31 + (o.seed || 0), boil: 1.1 });
    }
  },
  /** A sitting cat, in profile (for "Gato"): a shadow or an ink drawing. */
  cat(g, x, y, sx, sy, col) {
    g.save(); g.translate(x, y); g.scale(sx, sy);
    g.beginPath();
    // sitting in profile, facing right: haunch, back, head with two ears, front legs, tail curled round the base
    g.moveTo(-92, 0);
    g.bezierCurveTo(-96, -40, -74, -62, -44, -62);          // back
    g.bezierCurveTo(-30, -62, -26, -74, -22, -88);          // up to the head
    g.lineTo(-8, -104); g.lineTo(-4, -86);                  // left ear
    g.bezierCurveTo(6, -92, 20, -94, 26, -86);              // forehead
    g.lineTo(40, -102); g.lineTo(44, -80);                  // right ear
    g.bezierCurveTo(52, -72, 52, -60, 44, -54);             // muzzle
    g.bezierCurveTo(56, -48, 58, -36, 50, -30);             // chest
    g.lineTo(54, 0);                                        // front leg
    g.lineTo(20, 0);
    g.bezierCurveTo(6, -14, -18, -12, -30, 0);              // belly between the legs
    g.closePath();
    g.fillStyle = col; g.fill();
    // the tail, drawn as a stroke so it stays thin
    g.beginPath();
    g.moveTo(-90, -6);
    g.bezierCurveTo(-124, -4, -128, -46, -100, -54);
    g.strokeStyle = col; g.lineWidth = 11; g.lineCap = 'round'; g.stroke();
    g.restore();
  },
  /** A rubber stamp: a rough frame plus stamped text, uneven ink. */
  stamp(g, f, x, y, text, o) {
    o = o || {};
    const size = o.size || 52, col = o.color || C.red, ang = o.ang == null ? -0.06 : o.ang, seed = o.seed || 0;
    g.save(); g.translate(x, y); g.rotate(ang);
    F.stamp(g, size, o);
    const w = g.measureText(text).width * 1.12 + size * 0.7, h = size * 1.6;
    g.globalAlpha = o.alpha == null ? 0.92 : o.alpha;
    g.strokeStyle = col; g.lineWidth = size * 0.09;
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.globalAlpha *= 0.72;
    g.strokeRect(-w / 2 + 3, -h / 2 + 2, w - 6, h - 5);
    g.globalAlpha = o.alpha == null ? 0.92 : o.alpha;
    g.fillStyle = col;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const m = g.measureText(text);
    g.fillText(text, 0, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * 0.5 - size * 0.03);
    g.restore();
    // uneven ink: a few dry patches, painted with the colour of the wall (never a hole punched in the frame)
    g.save(); g.globalAlpha = 0.5;
    for (let i = 0; i < 7; i++) {
      const a = hash(seed + i, 3, 9) * TAU2, r = size * (0.2 + hash(seed + i, 5, 2) * 0.9);
      g.fillStyle = '#F4ECD8'; g.beginPath();
      g.arc(x + Math.cos(a) * r * (w / (size * 3)), y + Math.sin(a) * r * 0.5, 1.6 + hash(i, seed, 4) * 3.4, 0, TAU2);
      g.fill();
    }
    g.restore();
  },
  /** A hand-drawn rectangle (a block, a rack, a card): corners overshoot a little, like a real marker. */
  block(g, f, x, y, w, h, o) {
    o = o || {};
    const c = o.color || C.ink, wd = o.w || 7, ov = o.overshoot == null ? 8 : o.overshoot, s = o.seed || 0;
    const seg = (a, b, i) => OHP.ink(g, f, [[a[0] - (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * ov, a[1] - (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]) * ov], b], { w: wd, color: c, seed: s + i * 7, boil: o.boil });
    seg([x, y], [x + w, y], 0); seg([x + w, y], [x + w, y + h], 1); seg([x + w, y + h], [x, y + h], 2); seg([x, y + h], [x, y], 3);
    if (o.fill) { g.save(); g.globalAlpha = o.fillA == null ? 1 : o.fillA; g.fillStyle = o.fill; g.fillRect(x, y, w, h); g.restore(); }
  },
  /** A small stick-figure person, drawn in ink (used where someone has to be drawn, never as an icon). */
  figure(g, f, x, y, s, o) {
    o = o || {};
    const c = o.color || C.ink, w = 6 * s, wob = (n) => (hash(f.tick, n, o.seed || 0) - 0.5) * 2 * (o.boil == null ? 1.2 : o.boil);
    g.save(); g.translate(x, y); g.scale(s, s);
    OHP.ink(g, f, [[0, -132], [0, -52]], { w: w, color: c, seed: (o.seed || 0) + 1 });                  // body
    const hd = [];
    for (let i = 0; i <= 14; i++) { const a = i / 14 * TAU2; hd.push([Math.cos(a) * 26, -160 + Math.sin(a) * 26]); }
    OHP.ink(g, f, hd, { w: w * 0.85, color: c, seed: (o.seed || 0) + 2 });
    OHP.ink(g, f, [[0, -118], [-42 + wob(5), -84]], { w: w, color: c, seed: (o.seed || 0) + 3 });        // arms
    OHP.ink(g, f, [[0, -118], [42 + wob(6), -84]], { w: w, color: c, seed: (o.seed || 0) + 4 });
    OHP.ink(g, f, [[0, -52], [-30 + wob(7), 0]], { w: w, color: c, seed: (o.seed || 0) + 5 });           // legs
    OHP.ink(g, f, [[0, -52], [30 + wob(8), 0]], { w: w, color: c, seed: (o.seed || 0) + 6 });
    g.restore();
  },
  /** A soft light dot (a lamp, a hot spot, a burning head). */
  glowDot(g, x, y, r, col, a) {
    const rg = g.createRadialGradient(x, y, 1, x, y, Math.max(2, r));
    rg.addColorStop(0, col.replace('ALPHA', String(clamp(a))));
    rg.addColorStop(0.35, col.replace('ALPHA', String(clamp(a) * 0.55)));
    rg.addColorStop(1, col.replace('ALPHA', '0'));
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, Math.max(2, r), 0, TAU2); g.fill();
  },
  /** Sparks: short bright strokes and dots that live for a moment (deterministic in t). */
  sparks(g, f, x, y, r, n, seed, t0, life) {
    const age = f.t - t0;
    if (age < 0) return;
    const fade = Math.max(0, 1 - age / life);
    if (fade <= 0) return;
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i, 3, 7) * TAU2, rr = r * (0.15 + 0.85 * hash(seed + i, 5, 9));
      const drift = (1 - fade) * 40 * hash(seed + i, 8, 2);
      const px = x + Math.cos(a) * (rr + drift), py = y + Math.sin(a) * (rr + drift * 0.6);
      const tw = 0.5 + 0.5 * noise1(f.t * 5 + i, seed);
      g.save(); g.globalAlpha = clamp(fade * tw);
      g.strokeStyle = OHP.C.amber; g.lineWidth = 1.8;
      const L = 5 + 8 * hash(seed + i, 11, 4);
      g.beginPath(); g.moveTo(px - L, py); g.lineTo(px + L, py); g.moveTo(px, py - L); g.lineTo(px, py + L); g.stroke();
      g.restore();
    }
  },
  /** A burning line: pts drawn up to k, the rest still ink; a live head (flame + smoke) at the burn point. */
  burn(g, f, pts, k, o) {
    o = o || {};
    const head = (() => {
      const L = [0];
      for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const want = L[L.length - 1] * clamp(k);
      for (let i = 1; i < pts.length; i++) if (L[i] >= want) {
        const t = (want - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
        return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
      }
      return pts[pts.length - 1];
    })();
    OHP.ink(g, f, pts, Object.assign({}, o, { upto: k, w: o.w || 9, color: o.color || C.ink2 }));
    OHP.ink(g, f, pts, Object.assign({}, o, { upto: k, w: (o.w || 9) * 1.05, color: o.burnt || '#5A4A40', alpha: 0.5, seed: (o.seed || 0) + 3 }));
    const alive = 0.6 + 0.4 * f.a.high;
    OHP.glowDot(g, head[0], head[1], 40 * alive, 'rgba(255,206,120,ALPHA)', 0.75);
    g.save(); g.fillStyle = '#FFF0C8';
    g.beginPath(); g.arc(head[0], head[1], 7 * alive, 0, TAU2); g.fill();
    g.restore();
    for (let i = 0; i < 7; i++) {                            // smoke
      const a = f.t * 1.2 + i, up = 30 + 22 * i + 20 * noise1(f.t * 0.6 + i, 4);
      g.save(); g.globalAlpha = 0.16 * (1 - i / 7);
      g.fillStyle = '#8A8378';
      g.beginPath(); g.arc(head[0] + 18 * noise1(f.t + i, 9) + a * 2, head[1] - up, 8 + 5 * hash(i, 3, 3), 0, TAU2); g.fill();
      g.restore();
    }
  },
  /** A typed label plate on the sheet (BOX.panel + BOX.lines: qa checks the text against the plate). */
  label(g, f, x, y, w, h, lines, o) {
    o = o || {};
    g.save();
    g.globalAlpha = o.plate == null ? 0.9 : o.plate;
    g.fillStyle = o.fill || '#F2E9D2';
    g.fillRect(x, y, w, h);
    g.globalAlpha = 1;
    g.strokeStyle = o.stroke || 'rgba(46,40,32,0.5)'; g.lineWidth = 1.6; g.strokeRect(x, y, w, h);
    g.restore();
    const P = BOX.panel(g, x, y, w, h, { stroke: o.edge || null, lw: 1.4, fill: null, pad: o.pad || 18, name: o.name || 'label' });
    BOX.lines(g, P, lines, { size: o.size || 30, color: o.color || C.ink, font: o.font || F.type, gap: o.gap || 1.45, alpha: o.alpha });
    return P;
  },
  /** "SHEET 07 / 46" in the corner: the film counting its own transparencies (small: under qa's text size). */
  slide(g, f, n, o) {
    o = o || {};
    g.save();
    g.globalAlpha = 0.62;
    g.fillStyle = C.ink2; F.type(g, o.size || 21, { track: 0.10 });
    g.textAlign = 'left'; g.textBaseline = 'top';
    const t = 'SHEET ' + (n < 10 ? '0' + n : n) + ' / 46';
    g.fillText(t, o.x || 152, o.y || 86);
    g.restore();
  },
  /** Wipe a clean patch in the drawing (the ink is rubbed off so a line of the lyric can stand there). */
  erase(g, x, y, w, h, o) {
    o = o || {};
    g.save();
    const c = o.color || C.lit;
    g.globalAlpha = 0.92;
    g.fillStyle = c;
    g.beginPath();
    const r = o.rough == null ? 9 : o.rough;
    const N = 17;
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU2, rr = 0.5;
      const px = x + w / 2 + Math.cos(a) * (w / 2) * rr * (1 + (hash(i, 3, 5) - 0.5) * 0.22);
      const py = y + h / 2 + Math.sin(a) * (h / 2) * rr * (1 + (hash(i, 5, 6) - 0.5) * 0.3);
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fill();
    g.globalAlpha = 0.35; g.fillStyle = o.color2 || 'rgba(255,252,240,1)';
    g.save(); g.translate(0, 1.5); g.fill(); g.restore();
    g.restore();
  },

  // ================================================================ the lyric
  /**
   * The line being sung, word by word, in the pen of this film. Styles:
   *   'hand'  handwriting on the sheet (verse)        'mark'  felt-tip (big statements)
   *   'type'  typewriter on a label strip             'chalk' light writing on a dark shape
   *   'tiny'  small type at the edge of the wall
   * o: {x, y, size, maxW, align, color, ghost, style, rot, seed, tilt}
   * Unsung words are only a pale ghost (never drawn at full strength), the sung word is full ink at its start,
   * every word its own fillText, and the line's ink box is reported with MV.keep so the camera keeps it whole.
   */
  lineInfo(g, f, o) {
    const L = f.lyrics.lineAt(f.t, f.from);
    if (!L) return null;
    o = o || {};
    const style = o.style || 'hand';
    const font = style === 'mark' ? F.mark : style === 'hand' ? F.hand : F.type;
    const size0 = o.size || (style === 'tiny' ? 34 : 58);
    const maxW = o.maxW || (W - 2 * (o.pad || 150));
    const toks = f.lyrics.tokens(L);
    const size = BOX.fit(g, toks.map(t => t.text).join(' '), size0, maxW, { font: font, track: o.track || 0 });
    font(g, size, o);
    const sp = g.measureText(' ').width;
    let tw = 0;
    for (const tk of toks) tw += g.measureText(tk.text).width + sp;
    tw -= sp;
    let x = o.align === 'center' ? o.x - tw / 2 : o.align === 'right' ? o.x - tw : o.x;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const m0 = g.measureText(toks.map(t => t.text).join(''));
    const out = { line: L, size: size, y: o.y, style: style, space: sp, w: tw,
                  asc: m0.actualBoundingBoxAscent, desc: m0.actualBoundingBoxDescent, toks: [] };
    for (const tk of toks) {
      const w = g.measureText(tk.text).width;
      const tilt = (style === 'hand' || style === 'mark') ? (hash(tk.start * 97, 5, 2) - 0.5) * (o.tilt == null ? 0.028 : o.tilt) : 0;
      const dy = style === 'hand' ? (hash(tk.start * 61, 7, 3) - 0.5) * size * 0.05 : 0;
      out.toks.push({ text: tk.text, start: tk.start, end: tk.end, x: x, w: w, tilt: tilt, dy: dy, sung: f.t >= tk.start - 1e-6, soon: f.t >= tk.start - (o.lead == null ? 0.4 : o.lead) });
      x += w + sp;
    }
    out.x0 = o.align === 'center' ? o.x - tw / 2 : o.align === 'right' ? o.x - tw : o.x;
    out.x1 = out.x0 + tw;
    return out;
  },
  /** The pen tip that is writing this line right now (for the shadow hand), or null. */
  penAt(info) {
    if (!info) return null;
    let cur = null;
    for (const tk of info.toks) if (tk.sung) cur = tk;
    if (!cur) cur = info.toks[0];
    const p = clamp((f0t - cur.start) / Math.max(0.06, cur.end - cur.start));
    return [cur.x + cur.w * clamp(p * 1.7), info.y + cur.dy];
  },
  /**
   * The line being sung, word by word, in the pen of this film. Styles:
   *   'hand'  handwriting on the sheet (verse)        'mark'  felt-tip (big statements)
   *   'type'  typewriter (labels, messages)           'tiny'  small type at the edge of the wall
   *   'chalk' light writing on a dark shape
   * o: {x, y, size, maxW, align, color, ghost, style, track, tilt, lead}
   * Unsung words are only a pale ghost; a word is at full ink exactly at its start (qa measures it there), each word
   * is its own fillText, and the line's ink box is reported with MV.keep so the camera keeps it whole.
   */
  lyric(g, f, o) {
    o = o || {};
    f0t = f.t;
    const info = OHP.lineInfo(g, f, o);
    if (!info) return null;
    const ink = o.color || (o.style === 'chalk' ? C.chalk : C.ink);
    const ghost = o.ghost == null ? 0.26 : o.ghost;
    MV.lyric(() => {
      g.save();
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
      for (const tk of info.toks) {
        if (!tk.sung && !tk.soon) continue;
        g.save();
        g.translate(tk.x, info.y + tk.dy); g.rotate(tk.tilt);
        g.globalAlpha = tk.sung ? (o.alpha == null ? 1 : o.alpha) : ghost;
        g.fillStyle = ink;
        g.fillText(tk.text, 0, 0);
        g.restore();
        bx0 = Math.min(bx0, tk.x - 3); bx1 = Math.max(bx1, tk.x + tk.w + 3);
        by0 = Math.min(by0, info.y + tk.dy - info.asc - 3); by1 = Math.max(by1, info.y + tk.dy + info.desc + 3);
      }
      if (bx1 > bx0) MV.keep(g, bx0, by0, bx1 - bx0, by1 - by0);
      g.restore();
    });
    return info;
  },

  /**
   * The line being sung where ONE word is set much larger than the rest (the hook: "I'm upping my P(doom)").
   * o: {x, y, small, bigSize, big: fn(text), align, maxW, color, bigColor, font, underline, space}
   * Same rules as lyric(): full ink at the word's start, one fillText per word, MV.keep on the whole line.
   */
  lyricBig(g, f, o) {
    o = o || {};
    const L = f.lyrics.lineAt(f.t, f.from);
    if (!L) return null;
    const toks = f.lyrics.tokens(L);
    const isBig = o.big || (() => false);
    const font = o.font || F.mark;
    let small = o.small || 56, bigSize = o.bigSize || 170;
    const spaceOf = s => (o.space == null ? s * 0.30 : o.space);
    const measure = (sm, bg) => {
      const sizes = toks.map(tk => (isBig(tk.text) ? bg : sm)), widths = [];
      let total = 0;
      for (let i = 0; i < toks.length; i++) { font(g, sizes[i], o); widths[i] = g.measureText(toks[i].text).width; total += widths[i] + (i < toks.length - 1 ? spaceOf(sm) : 0); }
      return { sizes: sizes, widths: widths, total: total, space: spaceOf(sm) };
    };
    let M = measure(small, bigSize);
    if (o.maxW && M.total > o.maxW) {                        // never let a line run out of the frame: shrink to fit
      const sc = o.maxW / M.total;
      small *= sc; bigSize *= sc;
      M = measure(small, bigSize);
    }
    const sizes = M.sizes, widths = M.widths, total = M.total, space = M.space;
    let x = o.align === 'center' ? o.x - total / 2 : o.x;
    const info = { toks: [], x0: x, x1: x + total, y: o.y, size: small };
    MV.lyric(() => {
      let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
      for (let i = 0; i < toks.length; i++) {
        const tk = toks[i], big = isBig(tk.text);
        const dy = big ? 0 : (hash(tk.start * 61, 7, 3) - 0.5) * sizes[i] * 0.05;
        info.toks.push({ text: tk.text, start: tk.start, end: tk.end, x: x, w: widths[i], dy: dy, big: big, sung: f.t >= tk.start - 1e-6 });
        if (f.t >= tk.start - (o.lead == null ? 0.4 : o.lead)) {
          g.save();
          font(g, sizes[i], o);
          g.textAlign = 'left'; g.textBaseline = 'alphabetic';
          g.globalAlpha = f.t >= tk.start - 1e-6 ? 1 : (o.ghost == null ? 0.24 : o.ghost);
          g.fillStyle = big ? (o.bigColor || C.red) : (o.color || C.ink);
          g.fillText(tk.text, x, o.y + dy);
          g.restore();
          const m = { asc: sizes[i] * 0.78, desc: sizes[i] * 0.24 };
          bx0 = Math.min(bx0, x - 3); bx1 = Math.max(bx1, x + widths[i] + 3);
          by0 = Math.min(by0, o.y + dy - m.asc - 3); by1 = Math.max(by1, o.y + dy + m.desc + 3);
        }
        x += widths[i] + space;
      }
      if (bx1 > bx0) MV.keep(g, bx0, by0, bx1 - bx0, by1 - by0);
      if (o.underline) {                                     // the hand underlines the big word
        const bt = info.toks.filter(t => t.big);
        if (bt.length) {
          const a = bt[0], b = bt[bt.length - 1];
          OHP.ink(g, f, [[a.x - 6, o.y + small * 0.34], [b.x + b.w + 10, o.y + small * 0.30]], { w: 9, color: o.underlineColor || (o.bigColor || C.red), seed: 21, grease: true });
        }
      }
    });
    return info;
  },

  // ================================================================ post helpers
  /** Shake on the kick, a warm flash on the snare — the room reacting to the song. */
  post(f, o) {
    o = o || {};
    const k = o.kick == null ? 0 : o.kick, s = o.snare == null ? 0 : o.snare;
    return {
      shake: [k * f.a.kick * (hash(f.tick, 21, 1) - 0.5) * 2, k * f.a.kick * (hash(f.tick, 21, 2) - 0.5) * 2],
      flash: s * f.a.snare,
      flashColor: o.flashColor || '255,244,222',
      grain: o.grain,
      vignette: o.vignette,
      fade: o.fade,
    };
  },
};
// a rounded capsule as a sub-path of the current path
function capsule(g, x0, y0, x1, y1, w) {
  const a = Math.atan2(y1 - y0, x1 - x0), h = w / 2;
  g.moveTo(x0 + Math.cos(a + Math.PI / 2) * h, y0 + Math.sin(a + Math.PI / 2) * h);
  g.lineTo(x1 + Math.cos(a + Math.PI / 2) * h, y1 + Math.sin(a + Math.PI / 2) * h);
  g.arc(x1, y1, h, a + Math.PI / 2, a - Math.PI / 2, true);
  g.lineTo(x0 + Math.cos(a - Math.PI / 2) * h, y0 + Math.sin(a - Math.PI / 2) * h);
  g.arc(x0, y0, h, a - Math.PI / 2, a + Math.PI / 2, true);
  g.closePath();
}
MV.onInit(() => {
  OHP.lightWarm = lightField(false, false);
  OHP.lightCold = lightField(true, false);
  OHP.lightRed = lightField(false, true);
  OHP.tex = acetateTex();
});
G.OHP = OHP;
G.OHP_C = C;
G.OHP_F = F;
G.OHP_plot = plot;
G.OHP_resample = resample;
})(window);
