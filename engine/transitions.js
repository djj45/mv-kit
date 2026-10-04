// mv-kit — transitions drawn from both pictures (MV.wipe with render; see engine.js). Each one carries something
// across the cut, so use one for a reason, write the reason next to the timeline entry, and hard-cut otherwise.
//
//   zoom    a match cut: the camera moves so that an object in the old shot lands on the same (or a rhyming)
//           object in the new one, pushing into it (it grows) or pulling out (it shrinks). The other picture
//           shows through the object first, then everywhere. params.match = [a, b]: each [x, y, w, h], 'full'
//           (default), or the name of an anchor the scene returns from anchors(f), so the move follows the object.
//           params.shape 'rect' | 'round' (the object's outline for showing through), feather (0.2 of its size),
//           blend (how the picture inside the object is laid over: 'source-over' by default; 'darken' on paper,
//           so only the marks show and paper over paper stays paper; 'lighten' on dark), ease ('inOutCubic').
//   pan     the two shots are neighbours in one space and the camera slides across. params.dir: 'right' (later in
//           time, the default), 'left' (earlier), 'down' (deeper), 'up' (rising, surfacing); params.gap px, ease.
//   reflow  the old picture comes apart into particles that fly to where the new picture's marks are and settle
//           into them, matched along a Hilbert curve so neighbours stay neighbours. Marks = cells that differ from
//           the picture's dominant tone (ink on paper and light on black alike). params.dot: 'round' | 'square' |
//           'glyph' | fn(g, x, y, r, rgb, alpha, i, k) (kits can add to MV.reflowDots), count (1400), cell (8 px),
//           size (1.1), swirl (1, how far they arc), threshold (0.1), boost (1.5, mark contrast), ghost (0.35, how
//           much of both pictures stays visible in between), seed.
// All three are pure functions of the two pictures and k: deterministic, and they blur well with --samples.
(function (G) {
'use strict';
const MV = G.MV;
const easeOf = (p, d = 'inOutCubic') => (typeof p.ease === 'function' ? p.ease : ease[p.ease || d] || ease[d]);

// ---------------------------------------------------------------- zoom
let FM = null, FMf = -1;
/** Alpha mask, 1 inside with soft edges `f` (fraction of the short side) wide; small, scaled up where used. */
function feather(f) {
  const w = 160, h = Math.max(2, Math.round(160 * H / W));
  if (!FM) FM = mk(w, h);
  if (f === FMf) return FM;
  FMf = f;
  const g = FM.getContext('2d'), im = g.createImageData(w, h), e = Math.max(1e-3, f * Math.min(w, h));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    im.data[(y * w + x) * 4 + 3] = 255 * smoothstep(0, e, Math.min(x + 0.5, w - x - 0.5, y + 0.5, h - y - 0.5));
  g.putImageData(im, 0, 0);
  return FM;
}

/** Smoothing for a scaled draw: bilinear is enough going up; going down needs the filtered (slower) one. */
const quality = sc => (sc > 0.98 ? 'low' : 'high');

/** Draw img mapped by p -> c + sc * (p - c0), at alpha, with its frame edges feathered by f. */
function place(g, img, sc, c, c0, alpha = 1, f = 0) {
  if (alpha <= 0) return;
  let src = img;
  if (f > 0.002) {
    const tg = MV.MASK.getContext('2d');
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = 'copy'; tg.drawImage(img, 0, 0);
    tg.globalCompositeOperation = 'destination-in'; tg.imageSmoothingEnabled = true;
    tg.drawImage(feather(Math.round(f * 100) / 100), 0, 0, W, H);
    tg.globalCompositeOperation = 'source-over';
    src = MV.MASK;
  }
  g.save(); g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = quality(sc);
  g.setTransform(sc, 0, 0, sc, c[0] - sc * c0[0], c[1] - sc * c0[1]); g.drawImage(src, 0, 0); g.restore();
}

let EC = null, LAYER = null, SM = null;
/** The mean colour around a picture's border: what it would continue into past its edges. */
function edgeColor(img) {
  if (!EC) EC = mk(32, 18).getContext('2d', { willReadFrequently: true });
  EC.imageSmoothingEnabled = true; EC.imageSmoothingQuality = 'high'; EC.globalCompositeOperation = 'copy'; EC.drawImage(img, 0, 0, 32, 18);
  const d = EC.getImageData(0, 0, 32, 18).data, c = [0, 0, 0];
  let n = 0;
  for (let y = 0; y < 18; y++) for (let x = 0; x < 32; x++) {
    if (x > 1 && x < 30 && y > 1 && y < 16) continue;
    const i = 4 * (y * 32 + x); c[0] += d[i]; c[1] += d[i + 1]; c[2] += d[i + 2]; n++;
  }
  return `rgb(${(c[0] / n) | 0},${(c[1] / n) | 0},${(c[2] / n) | 0})`;
}

/** Draw img (mapped as in place) only inside rect, an outline 'rect' or 'round' with soft edges. The soft outline
 *  is drawn at quarter resolution and scaled up: a wide blur at full size is slow. */
function through(g, img, sc, c, c0, alpha, rect, o) {
  if (alpha <= 0) return;
  const q = 4, [x, y, w, h] = rect, soft = o.feather * Math.min(w, h) / q;
  if (!SM) SM = mk(Math.ceil(W / q), Math.ceil(H / q));
  const sg = SM.getContext('2d');
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.filter = 'none'; sg.clearRect(0, 0, SM.width, SM.height);
  if (soft > 0.3) sg.filter = `blur(${soft.toFixed(2)}px)`;
  sg.beginPath();
  if (o.shape === 'round') sg.ellipse((x + w / 2) / q, (y + h / 2) / q, w / 2 / q, h / 2 / q, 0, 0, TAU); else sg.rect(x / q, y / q, w / q, h / q);
  sg.fillStyle = '#fff'; sg.fill(); sg.filter = 'none';
  const tg = MV.MASK.getContext('2d');
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = 'source-over'; tg.filter = 'none';
  tg.clearRect(0, 0, W, H);
  tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = quality(sc);
  tg.setTransform(sc, 0, 0, sc, c[0] - sc * c0[0], c[1] - sc * c0[1]); tg.drawImage(img, 0, 0);
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(SM, 0, 0, W, H);
  tg.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.globalCompositeOperation = o.blend; g.drawImage(MV.MASK, 0, 0); g.restore();
}

MV.wipe('zoom', {
  render(g, A, B, k, e, t, prev) {
    const p = e.params || {}, m = p.match || [], u = easeOf(p)(k);
    const o = { shape: p.shape || 'rect', feather: p.feather ?? 0.2, blend: p.blend || 'source-over' };
    const ra = MV.anchorOf(prev, m[0], t), rb = MV.anchorOf(e, m[1], t);
    const ca = [ra[0] + ra[2] / 2, ra[1] + ra[3] / 2], cb = [rb[0] + rb[2] / 2, rb[1] + rb[3] / 2];
    const s = Math.sqrt(Math.max(1, rb[2] * rb[3]) / Math.max(1, ra[2] * ra[3]));   // how much the object grows
    const sa = Math.pow(s, u), sb = sa / s, c = [lerp(ca[0], cb[0], u), lerp(ca[1], cb[1], u)];   // a constant zoom rate
    const ow = (ra[2] * sa + rb[2] * sb) / 2, oh = (ra[3] * sa + rb[3] * sb) / 2, obj = [c[0] - ow / 2, c[1] - oh / 2, ow, oh];
    // a picture moved off its place leaves part of the frame bare: fill it with that picture's own border colour
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = edgeColor(s >= 1 ? A : B); g.fillRect(0, 0, W, H); g.restore();
    if (s >= 1) {   // push in: the old shot grows around the object; the new one shows through it, then everywhere
      place(g, A, sa, c, ca);
      const ob = smoothstep(0.6, 1, u);
      if (ob > 0) {    // the new shot is smaller than the frame until the end: past its edges lies its edge colour
        if (!LAYER) LAYER = mk(W, H);
        const lg = LAYER.getContext('2d');
        lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalAlpha = 1; lg.globalCompositeOperation = 'source-over';
        lg.fillStyle = edgeColor(B); lg.fillRect(0, 0, W, H);
        place(lg, B, sb, c, cb, 1, 0.12 * (1 - smoothstep(0.7, 1, u)));
        g.save(); g.globalAlpha = ob; g.drawImage(LAYER, 0, 0); g.restore();
      }
      through(g, B, sb, c, cb, smoothstep(0.05, 0.4, u), obj, o);
    } else {        // pull out: around the object the new shot is already there; the old one shrinks into it
      place(g, B, sb, c, cb);
      place(g, A, sa, c, ca, 1 - smoothstep(0, 0.4, u), 0.12 * smoothstep(0, 0.3, u));
      through(g, A, sa, c, ca, 1 - smoothstep(0.6, 0.95, u), obj, o);
    }
  },
  lint(e, prev) {
    const p = e.params || {}, m = p.match, out = [];
    if (p.shape && !['rect', 'round'].includes(p.shape)) out.push(`shape "${p.shape}": rect or round`);
    if (!m) return out.concat('no params.match: [a, b] (rects or anchor names); with neither it only dissolves');
    const r = [];
    for (const [en, spec, t] of [[prev, m[0], Math.max(prev.from, e.from)], [e, m[1], e.from]]) {
      try { r.push(MV.anchorOf(en, spec, t)); } catch (err) { out.push(err.message); }
    }
    if (r.length === 2) {
      const s = Math.sqrt(Math.max(1, r[1][2] * r[1][3]) / Math.max(1, r[0][2] * r[0][3]));
      if (s > 1 / 1.6 && s < 1.6) out.push(`the two anchors are about the same size (×${s.toFixed(2)}): the zoom only slides one picture `
        + `over the other. Push into a bigger object in the new shot (a small thing → the whole of the next picture: match [a, 'full']), `
        + `pull out of a big one, use pan for two places in one space — or cut`);
    }
    return out;
  },
});

// ---------------------------------------------------------------- pan
const DIRS = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
MV.wipe('pan', {
  render(g, A, B, k, e) {
    const p = e.params || {}, u = easeOf(p)(k), d = DIRS[p.dir || 'right'] || DIRS.right;
    const L = (d[0] ? W : H) + (p.gap || 0), ox = -d[0] * L * u, oy = -d[1] * L * u;
    g.drawImage(A, ox, oy);
    g.drawImage(B, ox + d[0] * L, oy + d[1] * L);
  },
  lint(e) { const d = (e.params || {}).dir; if (d && !DIRS[d]) return `dir "${d}": right, left, down or up`; },
});

// ---------------------------------------------------------------- reflow
const GRIDS = {};
/** Cell grid of a size: small canvases to sample the pictures into, and the cells in Hilbert-curve order. */
function grid(cell) {
  const cols = Math.max(2, Math.round(W / cell)), rows = Math.max(2, Math.round(H / cell)), key = cols + 'x' + rows;
  if (GRIDS[key]) return GRIDS[key];
  const n = 256, hk = (x, y) => {
    let d = 0;
    for (let s = n >> 1; s > 0; s >>= 1) {
      const rx = x & s ? 1 : 0, ry = y & s ? 1 : 0;
      d += s * s * ((3 * rx) ^ ry);
      if (!ry) { if (rx) { x = n - 1 - x; y = n - 1 - y; } const tmp = x; x = y; y = tmp; }
    }
    return d;
  };
  const keys = [];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) keys.push([hk(Math.floor(q * n / cols), Math.floor(r * n / rows)), r * cols + q]);
  keys.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const small = () => { const c = mk(cols, rows); return { c, g: c.getContext('2d', { willReadFrequently: true }) }; };
  return (GRIDS[key] = { cols, rows, sx: W / cols, sy: H / rows, order: Int32Array.from(keys, v => v[1]), A: small(), B: small(), mid: small() });
}

/** A picture at cell resolution: its pixels, its dominant tone (median luminance, mean colour of those cells), and
 *  the marks (cells off that tone), in Hilbert order. */
function sample(img, S, gr, thr) {
  const { cols, rows } = gr, n = cols * rows, g = S.g;
  g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, cols, rows);
  const d = g.getImageData(0, 0, cols, rows).data, lum = new Uint8Array(n), hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) { const l = (0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2]) | 0; lum[i] = l; hist[l]++; }
  let med = 0;
  for (let acc = 0; med < 255 && acc + hist[med] <= n / 2; med++) acc += hist[med];
  const pts = [], bg = [0, 0, 0];
  let nb = 0;
  for (const i of gr.order) {
    if (Math.abs(lum[i] - med) > thr) pts.push(i);
    else { bg[0] += d[4 * i]; bg[1] += d[4 * i + 1]; bg[2] += d[4 * i + 2]; nb++; }
  }
  return { d, pts, bg: bg.map(v => v / Math.max(1, nb)) };
}
const cap = (pts, N) => (pts.length <= N ? pts : Array.from({ length: N }, (_, i) => pts[Math.floor(i * pts.length / N)]));

MV.reflowDots = {
  round(g, x, y, r, c, a) { g.globalAlpha = a; g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); },
  square(g, x, y, r, c, a) { g.globalAlpha = a; g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; g.fillRect(x - r, y - r, 2 * r, 2 * r); },
  glyph(g, x, y, r, c, a, i, k) {
    const s = '·•*+×#%01';
    g.globalAlpha = a; g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; g.font = `700 ${Math.round(r * 2.6)}px ui-monospace, Menlo, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s[(hash(i, 13, Math.floor(k * 10)) * s.length) | 0], x, y);
  },
};

MV.wipe('reflow', {
  render(g, A, B, k, e) {
    const p = e.params || {}, gr = grid(p.cell || 8), { cols, rows, sx, sy } = gr, seed = p.seed ?? e.i;
    const thr = 255 * (p.threshold ?? 0.1), a = sample(A, gr.A, gr, thr), b = sample(B, gr.B, gr, thr);
    const aA = 1 - smoothstep(0, 0.35, k), aB = smoothstep(0.62, 1, k), ghost = p.ghost ?? 0.35, boost = p.boost ?? 1.5;
    // in between: both pictures at cell resolution, pulled toward their own dominant tone, softly scaled up
    const mid = gr.mid.g.createImageData(cols, rows), md = mid.data, km = smoothstep(0.25, 0.85, k);
    for (let i = 0; i < cols * rows * 4; i += 4) {
      for (let c = 0; c < 3; c++) md[i + c] = lerp(a.bg[c] + (a.d[i + c] - a.bg[c]) * ghost, b.bg[c] + (b.d[i + c] - b.bg[c]) * ghost, km);
      md[i + 3] = 255;
    }
    gr.mid.g.putImageData(mid, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(gr.mid.c, 0, 0, W, H);
    if (aA > 0) { g.globalAlpha = aA; g.drawImage(A, 0, 0); }
    if (aB > 0) { g.globalAlpha = aB; g.drawImage(B, 0, 0); }
    g.globalAlpha = 1;
    const N = p.count ?? 1400, pa = cap(a.pts, N), pb = cap(b.pts, N), m = Math.max(pa.length, pb.length);
    if (!pa.length || !pb.length) return;
    const dot = typeof p.dot === 'function' ? p.dot : MV.reflowDots[p.dot || 'round'] || MV.reflowDots.round;
    const r = 0.5 * Math.min(sx, sy) * (p.size ?? 1.1), swirl = p.swirl ?? 1, col = [0, 0, 0];
    for (let j = 0; j < m; j++) {
      const s0 = 0.04 + 0.28 * hash(j, 11, seed), kk = smoothstep(s0, s0 + 0.58, k);   // each leaves at its own time
      if (kk <= 0) continue;                                                           // still part of the old picture
      const alpha = kk >= 1 ? 1 - aB : 1;                                              // landed: hands over to the new one
      if (alpha <= 0.01) continue;
      const ia = pa[Math.floor(j * pa.length / m)], ib = pb[Math.floor(j * pb.length / m)];
      const ax = (ia % cols + 0.5) * sx, ay = (Math.floor(ia / cols) + 0.5) * sy, bx = (ib % cols + 0.5) * sx, by = (Math.floor(ib / cols) + 0.5) * sy;
      const dx = bx - ax, dy = by - ay, bend = Math.sin(Math.PI * kk) * (0.18 + 0.12 * hash(j, 12, seed)) * swirl;
      for (let c = 0; c < 3; c++)
        col[c] = clamp(lerp(a.bg[c] + (a.d[4 * ia + c] - a.bg[c]) * boost, b.bg[c] + (b.d[4 * ib + c] - b.bg[c]) * boost, kk), 0, 255);
      g.save(); dot(g, ax + dx * kk - dy * bend, ay + dy * kk + dx * bend, r, col, alpha, j, kk); g.restore();
    }
  },
});
})(window);
