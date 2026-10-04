// mv-kit — qa: the measurements behind `tools/render.py qa`, plus the declarations scenes and kits make for it.
//
//   MV.focus(x, y, name)        Where the eye should be in this frame (scene canvas px, called from render()):
//                               the pen tip, the fuse's flame, the face. kits/camera.js follows it; qa checks it
//                               never leaves the picture. Call it every frame the subject is on screen.
//   MV.keep(g, x, y, w, h)      A rectangle that must stay on screen whatever the camera does (a lyric line):
//                               kits/camera.js limits its zooms so these stay inside the frame.
//   MV.box(g, x, y, w, h, o)    "Text goes inside this rectangle": a table cell, a title-block row, a label plate,
//                               a terminal panel. In g's current coordinates. Its own text (drawn in the same
//                               MV.group, or MV.within(o.owner)) must sit inside with room to breathe (o.pad: minimum
//                               gap in px, default 40 % of the text's ink height, at least 3 px); any other text that
//                               lands on it is a clash. kits/layout.js registers its boxes and owns their text itself.
//   MV.group(tag, fn)           Run fn with every box and text it draws marked as one owner (see MV.box).
//   MV.lyric(fn)                fn draws a lyric and its bar / plate (qa leaves all of it out of the bare picture).
//   MV.decor(fn)                fn draws song words that are part of the picture (on a prop, in a pattern): not lyrics.
//
// All of these also work inside MV.overlay (engine.js: the screen layer drawn after the camera): there they are in
// output pixels, and qa maps them as they are instead of through the camera.
//
// With ?qa=1 the page also records every fillText / strokeText drawn on the frame canvases (string, font,
// transform) and can render a frame again with the lyrics left out. render.py compares the two pictures inside
// each sung word's own glyph shapes: that is how much of the word actually reaches the screen, whatever covered,
// clipped, pushed or faded it. Without ?qa=1 nothing is wrapped and the declarations cost next to nothing.
(function (G) {
'use strict';
const MV = G.MV;
const QA = MV.qa = { on: false, mode: 'off', texts: [], boxes: [], offscreen: [], ctx: [] };
const mctx = document.createElement('canvas').getContext('2d');   // measuring

MV.frameFocus = [];
MV.focus = function (x, y, name) {
  if (!isFinite(x) || !isFinite(y)) return;
  MV.frameFocus.push({ x, y, name: name || 'focus', entry: MV.curEntry || null, screen: !!MV.inOverlay });
};
/** a rectangle that must stay in the picture whatever the camera does (a lyric line, a title): kits/camera.js
 *  clamps its push / insert zoom so these stay inside the frame. In g's current coordinates. */
MV.keep = function (g, x, y, w, h) {
  if (MV.inOverlay) return;                                     // the screen layer does not move with the camera
  const m = g.getTransform(), q = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([u, v]) => [m.a * u + m.c * v + m.e, m.b * u + m.d * v + m.f]);
  (MV.frameKeep = MV.frameKeep || []).push(aabb(q));
};
MV.box = function (g, x, y, w, h, o) {
  if (!QA.on || QA.mode !== 'record' || !frameCanvas(g.canvas)) return;
  const m = g.getTransform();
  QA.boxes.push({ m: [m.a, m.b, m.c, m.d, m.e, m.f], rect: [x, y, w, h], name: (o && o.name) || '', where: frameCanvas(g.canvas),
                  pad: o && o.pad != null ? o.pad : null, entry: MV.curEntry ? MV.curEntry.i : -1, alpha: g.globalAlpha,
                  owner: (o && o.owner) || currentOwner() });
};
/**
 * Ownership: which texts are a box's own. A helper that draws a box AND the text that goes in it (a table and its
 * cells, a title block and its rows, a panel and its lines) does both inside one group:
 *     return MV.group('title block', () => { ...MV.box(...)...; g.fillText(...); return result; });
 * or, when the box and its text are drawn by separate calls (a table now, its cells later):
 *     T.owner = MV.owner('table');  MV.box(g, x, y, w, h, { owner: T.owner });  ...  MV.within(T.owner, () => g.fillText(...));
 * qa holds a box's own text to the strict rules (inside, with room; poking out is an error) and reports any other
 * text that lands on the box as box-clash: two unrelated things drawn on top of each other (a warning).
 */
let GSEQ = 0;
const GSTACK = [];
function currentOwner() { return GSTACK.length ? GSTACK[GSTACK.length - 1] : null; }
MV.owner = tag => `${tag || 'group'}#${++GSEQ}`;
MV.within = (id, fn) => { GSTACK.push(id || null); try { return fn(); } finally { GSTACK.pop(); } };
MV.group = (tag, fn) => { const id = MV.owner(tag); return MV.within(id, () => fn(id)); };
/**
 * MV.lyric(fn): fn draws a lyric AND what goes with it — the bar, plate or block behind the words. Runs as is; qa
 * just knows that all of it belongs to the lyric, and leaves it out when it looks at the bare picture to measure how
 * much the lyrics hide (lyric-cover). Wrap a project's lyric helper in it: WD.line = (g, f, o) => MV.lyric(() => …).
 * (On the screen layer, MV.overlay already marks everything as lyric-side; MV.lyric is for the scene layer.)
 */
MV.lyric = fn => {
  if (!(QA.on && QA.mode === 'bare')) return fn();
  QA.suppress = (QA.suppress || 0) + 1;
  try { return fn(); } finally { QA.suppress--; }
};
/**
 * MV.decor(fn): the text fn draws is part of the picture, not the lyric — a word of the song lettered on a prop, woven
 * into cloth, stamped on a crate ("P(doom)" on the loom, "AGI" on a chart). qa matches lyrics by their words, so such
 * a text would otherwise count as a lyric drawn twice (lyric-overlap) or carried over (lyric-carryover). Texts inside
 * are measured as ordinary texts (text-touch, text-cut, box-clash); draw them whole, never letter by letter to hide them.
 */
MV.decor = fn => {
  QA.decor = (QA.decor || 0) + 1;
  try { return fn(); } finally { QA.decor--; }
};

/** 'frame' / 'xfade' / 'xa': a scene canvas (the camera moves it); 'out': the screen layer (MV.overlay), in output px */
function frameCanvas(c) { return c === MV.FRAME ? 'frame' : c === MV.XFADE ? 'xfade' : c === MV.XA ? 'xa' : c === MV.OVL ? 'out' : null; }
/** letters and digits only, lower case: "P(doom)," -> "pdoom". idx[k] = the raw index of normalised char k. */
function normMap(s) {
  let n = '', idx = [];
  const raw = [...String(s)];
  let ri = 0;
  for (const ch of raw) {
    const c = ch.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]/gu, '');
    for (const x of c) { n += x; idx.push(ri); }
    ri += ch.length;
  }
  idx.push(String(s).length);
  return { n, idx };
}
const norm = s => normMap(s).n;
const cjk = s => /[぀-ヿ㐀-鿿가-힯]/.test(s);
function isLyric(s) {
  const n = norm(s);
  if (!n || (n.length < 2 && !cjk(n))) return false;
  return QA.ctx.some(L => L.n.includes(n));
}
/** the lines (index) around now whose text contains s: which line a drawn lyric belongs to */
function lyricLines(s) {
  const n = norm(s);
  return QA.ctx.filter(L => L.n.includes(n)).map(L => L.i);
}
function setContext(t) {
  QA.ctx = MV.lyrics.lines.map((l, i) => ({ l, i })).filter(({ l }) => l.words.length && l.start - 1.5 <= t && t <= l.end + 3)
    .map(({ l, i }) => ({ i, n: norm(l.text) }));
}

// ---------------------------------------------------------------- the text hook (only with ?qa=1)
function install() {
  const P = CanvasRenderingContext2D.prototype;
  // inside MV.lyric while qa looks at the bare picture: nothing reaches the canvas
  for (const name of ['fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'drawImage', 'putImageData']) {
    const orig = P[name];
    P[name] = function () { if (QA.suppress > 0) return; return orig.apply(this, arguments); };
  }
  for (const [name, kind] of [['fillText', 'fill'], ['strokeText', 'stroke']]) {
    const orig = P[name];
    P[name] = function (text) {
      if (QA.on) {
        const where = frameCanvas(this.canvas);
        if (!where && QA.mode === 'record' && String(text).trim()) QA.offscreen.push(norm(text));   // drawn into a layer first
        if (where && String(text).trim() && Number.isFinite(+arguments[1]) && Number.isFinite(+arguments[2])) {
          const lyric = !(QA.decor > 0) && isLyric(text);
          if (QA.suppress > 0 || ((QA.mode === 'nolyric' || QA.mode === 'bare') && lyric)) return;
          if (QA.mode === 'record') {
            const m = this.getTransform(), str = String(text);
            // metrics from the live context: its letterSpacing getter can read '' after save() + font (Chrome),
            // while the drawing still uses the spacing — so measure, and derive the spacing per letter
            const mt = this.measureText(str);
            mctx.font = this.font; mctx.letterSpacing = '0px'; mctx.textAlign = 'left'; mctx.textBaseline = this.textBaseline;
            const n = [...str].length, nat = mctx.measureText(str).width;
            QA.texts.push({ s: str, kind, x: +arguments[1], y: +arguments[2], maxW: arguments.length > 3 && arguments[3] != null ? +arguments[3] : null,
                            font: this.font, lsPx: n ? (mt.width - nat) / n : 0, align: this.textAlign, base: this.textBaseline, dir: this.direction,
                            w: mt.width, abl: mt.actualBoundingBoxLeft, abr: mt.actualBoundingBoxRight, asc: mt.actualBoundingBoxAscent, desc: mt.actualBoundingBoxDescent,
                            m: [m.a, m.b, m.c, m.d, m.e, m.f], alpha: this.globalAlpha, lw: this.lineWidth, where, lyric, decor: QA.decor > 0, lines: lyric ? lyricLines(str) : null,
                            paint: typeof (kind === 'fill' ? this.fillStyle : this.strokeStyle) === 'string' ? (kind === 'fill' ? this.fillStyle : this.strokeStyle) : null,
                            entry: MV.curEntry ? MV.curEntry.i : -1, owner: currentOwner() });
          }
        }
      }
      return orig.apply(this, arguments);
    };
  }
}

// ---------------------------------------------------------------- geometry
/** scene canvas -> output frame: what applyPost did to the picture (shake, zoom, rotation). */
function postMatrix() {
  const p = MV.lastPost || {}, m = new DOMMatrix();
  if (!p.z || (p.z === 1 && !p.sx && !p.sy && !p.rot)) return m;
  return m.translate(W / 2 + (p.sx || 0), H / 2 + (p.sy || 0)).rotate((p.rot || 0) * 180 / Math.PI).scale(p.z).translate(-W / 2, -H / 2);
}
/** a recorded transform -> output px: through the camera for the scene canvases, as is for the screen layer */
function full(tx, post) { return tx.where === 'out' ? new DOMMatrix(tx.m) : post.multiply(new DOMMatrix(tx.m)); }
function styleFor(c, tx, align) {
  c.font = tx.font; c.letterSpacing = `${tx.lsPx || 0}px`; c.textAlign = align || tx.align; c.textBaseline = tx.base; c.direction = tx.dir;
}
function fontPx(font) { const m = /([\d.]+)px/.exec(font); return m ? +m[1] : 0; }
/** ink box of the whole string in the output frame [x0, y0, x1, y1] (axis-aligned around the transformed box) */
/** the text's ink box, as a quad in output px (4 corners) — measured when it was drawn */
function inkQuad(tx, M) {
  let l = tx.x - tx.abl, r = tx.x + tx.abr;
  if (tx.maxW != null && tx.w > tx.maxW && tx.w > 0) { const k = tx.maxW / tx.w; l = tx.x + (l - tx.x) * k; r = tx.x + (r - tx.x) * k; }
  const t = tx.y - tx.asc, b = tx.y + tx.desc;
  return [[l, t], [r, t], [r, b], [l, b]].map(([x, y]) => { const p = M.transformPoint({ x, y }); return [p.x, p.y]; });
}
function aabb(q) {
  const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
const scaleOf = M => Math.sqrt(Math.abs(M.a * M.d - M.b * M.c));

// glyph masks: the substring s[i0:i1] of a recorded text, drawn exactly where it landed (output frame px)
let MASK = null;
function maskCanvas() {
  if (!MASK || MASK.width !== W || MASK.height !== H) { MASK = mk(W, H); QA.mask = MASK; }
  return MASK.getContext('2d', { willReadFrequently: true });
}
function subStart(c, tx, i0) {
  // x where s[i0] starts, for a left-aligned redraw of the substring
  styleFor(c, tx, 'left');
  const wFull = c.measureText(tx.s).width;
  const al = tx.align, rtl = tx.dir === 'rtl';
  const x0 = (al === 'center') ? tx.x - wFull / 2 : (al === 'right' || (al === 'end' && !rtl) || (al === 'start' && rtl)) ? tx.x - wFull : tx.x;
  return { x: x0 + (i0 ? c.measureText(tx.s.slice(0, i0)).width : 0), wFull };
}
/** {ink, inside, visible, box}: ink = glyph px the substring should cover (on or off frame), inside = of those on the
 *  frame, visible = of those where the frame with lyrics differs from the frame without (it really shows). */
function glyphStats(tx, i0, i1, M, A, B) {
  const sub = tx.s.slice(i0, i1);
  // 1) how much ink the substring has at this size (untransformed), times the transform's area scale
  styleFor(mctx, tx, 'left');
  const mt = mctx.measureText(sub);
  const asc = Math.ceil(mt.actualBoundingBoxAscent) + 2, desc = Math.ceil(mt.actualBoundingBoxDescent) + 2;
  const lw = Math.ceil(mt.actualBoundingBoxLeft) + 2, rw = Math.ceil(mt.actualBoundingBoxRight) + 2;
  const sw = Math.max(1, lw + rw), sh = Math.max(1, asc + desc);
  let ink0 = 0;
  if (sw * sh < 6e6) {
    const sc = mk(sw, sh), s = sc.getContext('2d', { willReadFrequently: true });
    styleFor(s, tx, 'left'); s.textBaseline = 'alphabetic'; s.fillStyle = '#fff';
    // same baseline as the measurement context
    s.textBaseline = tx.base; s.fillText(sub, lw, asc);
    const d = s.getImageData(0, 0, sw, sh).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 127) ink0++;
  }
  let kx = 1;
  // 2) the same glyphs where they landed in the output frame
  const g = maskCanvas();
  const st = subStart(g, tx, i0);
  if (tx.maxW != null && st.wFull > tx.maxW && st.wFull > 0) kx = tx.maxW / st.wFull;
  const ink = ink0 * scaleOf(M) * scaleOf(M) * kx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
  if (kx !== 1) { g.translate(tx.x, 0); g.scale(kx, 1); g.translate(-tx.x, 0); }
  styleFor(g, tx, 'left'); g.fillStyle = '#fff'; g.globalAlpha = 1;
  g.fillText(sub, st.x, tx.y);
  // where: transform the substring's own box
  const sx0 = st.x - lw, sx1 = st.x + rw, sy0 = tx.y - asc, sy1 = tx.y + desc;
  const q = [[sx0, sy0], [sx1, sy0], [sx1, sy1], [sx0, sy1]].map(([x, y]) => { const p = M.transformPoint({ x, y }); return [p.x, p.y]; });
  const box = aabb(q);
  const bx0 = Math.max(0, Math.floor(box[0])), by0 = Math.max(0, Math.floor(box[1]));
  const bx1 = Math.min(W, Math.ceil(box[2])), by1 = Math.min(H, Math.ceil(box[3]));
  g.setTransform(1, 0, 0, 1, 0, 0);
  let inside = 0, visible = 0, touch = 0, cross = 0, geo = {};
  if (bx1 > bx0 && by1 > by0) {
    // read the mask with a margin around the word: the ring just outside its glyphs is where "touching" is measured
    const r = Math.max(2, Math.round(0.06 * fontPx(tx.font) * scaleOf(M)));
    const ex0 = Math.max(0, bx0 - r), ey0 = Math.max(0, by0 - r), ex1 = Math.min(W, bx1 + r), ey1 = Math.min(H, by1 + r);
    const ew = ex1 - ex0, eh = ey1 - ey0;
    const d = g.getImageData(ex0, ey0, ew, eh).data;
    const glyph = new Uint8Array(ew * eh);
    const col = [0, 0, 0];
    for (let k = 0; k < ew * eh; k++) {
      if (d[k * 4 + 3] <= 127) continue;
      glyph[k] = 1;
      const x = ex0 + (k % ew), y = ey0 + ((k / ew) | 0);
      if (x < bx0 || x >= bx1 || y < by0 || y >= by1) continue;
      inside++;
      if (!B) continue;
      const o = (y * W + x) * 4;
      const dd = Math.max(Math.abs(A[o] - B[o]), Math.abs(A[o + 1] - B[o + 1]), Math.abs(A[o + 2] - B[o + 2]));
      if (dd >= 24) { visible++; col[0] += A[o]; col[1] += A[o + 1]; col[2] += A[o + 2]; }
    }
    if (B && visible > 20) { const tc = touching(B, glyph, ex0, ey0, ew, eh, r, col.map(v => v / visible), fontPx(tx.font) * scaleOf(M)); touch = tc.same; cross = tc.cross; geo = { sameGeo: tc.sameGeo, crossGeo: tc.crossGeo }; }
  }
  return { ink: Math.max(ink, inside), inside, visible, box, touch, cross, geo };
}
/** a CSS colour as [r, g, b, a] (0..255, a 0..1), or null for gradients / patterns */
function rgba(css) {
  if (!css) return null;
  mctx.fillStyle = '#000'; mctx.fillStyle = css;
  const v = mctx.fillStyle;
  if (v[0] === '#') return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1];
  const m = /rgba?\(([^)]+)\)/.exec(v);
  if (!m) return null;
  const p = m[1].split(',').map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
/**
 * The same ring test for a text that is not a lyric (a stamp, a title, a big number): there is no picture without
 * it, so the ring is read from the frame itself and the text's colour is the paint it was drawn with. 0..1.
 */
function textTouch(tx, M, A) {
  const c = rgba(tx.paint);
  if (!c || c[3] < 0.9 || tx.alpha < 0.9) return { same: 0, cross: 0 };
  const g = maskCanvas();
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  g.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
  styleFor(g, tx); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.globalAlpha = 1; g.lineWidth = tx.lw;
  if (tx.kind === 'stroke') g.strokeText(tx.s, tx.x, tx.y, tx.maxW == null ? undefined : tx.maxW);
  else g.fillText(tx.s, tx.x, tx.y, tx.maxW == null ? undefined : tx.maxW);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const b = aabb(inkQuad(tx, M)), r = Math.max(2, Math.round(0.06 * fontPx(tx.font) * scaleOf(M)));
  const ex0 = Math.max(0, Math.floor(b[0]) - r - 2), ey0 = Math.max(0, Math.floor(b[1]) - r - 2);
  const ex1 = Math.min(W, Math.ceil(b[2]) + r + 2), ey1 = Math.min(H, Math.ceil(b[3]) + r + 2);
  const ew = ex1 - ex0, eh = ey1 - ey0;
  if (ew < 4 || eh < 4) return { same: 0, cross: 0 };
  const d = g.getImageData(ex0, ey0, ew, eh).data, glyph = new Uint8Array(ew * eh);
  for (let k = 0; k < ew * eh; k++) if (d[k * 4 + 3] > 127) glyph[k] = 1;
  return touching(A, glyph, ex0, ey0, ew, eh, r, c, fontPx(tx.font) * scaleOf(M), 1);
}
/** square dilation of a w × h mask by r px (two separable passes) */
function dilate(m, w, h, r) {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -1e9;
    for (let x = 0; x < w; x++) { if (m[y * w + x]) last = x; if (x - last <= r) tmp[y * w + x] = 1; }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) { if (m[y * w + x]) last = x; if (last - x <= r) tmp[y * w + x] = 1; }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) { if (tmp[y * w + x]) last = y; if (y - last <= r) out[y * w + x] = 1; }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) { if (tmp[y * w + x]) last = y; if (last - y <= r) out[y * w + x] = 1; }
  }
  return out;
}
/**
 * What touches a text: the thin ring (r px) just outside its glyphs, read from B. c = the text's colour, em = its
 * size in output px. inner > 0 starts the ring that many px out (when B is the frame WITH the text: its own
 * anti-aliased edge is not something touching it). { same: share of the ring in the text's own colour, cross: length
 * of outline touched by any drawing that stands out from the ground, in em }.
 */
function touching(B, glyph, x0, y0, w, h, r, c, em, inner) {
  if (inner) glyph = dilate(glyph, w, h, inner);
  const dil = dilate(glyph, w, h, r);
  // the ring's usual colour (what the word stands on); a text too close to it in colour is not judged here
  const ringIdx = [];
  const mean = [0, 0, 0], hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  for (let k = 0; k < w * h; k++) {
    if (!dil[k] || glyph[k]) continue;
    const o = ((y0 + ((k / w) | 0)) * W + x0 + (k % w)) * 4;
    ringIdx.push(o); mean[0] += B[o]; mean[1] += B[o + 1]; mean[2] += B[o + 2];
    hist[0][B[o]]++; hist[1][B[o + 1]]++; hist[2][B[o + 2]]++;
  }
  if (!ringIdx.length) return { same: 0, cross: 0 };
  const ringK = [];
  for (let k = 0; k < w * h; k++) if (dil[k] && !glyph[k]) ringK.push(k);
  for (let i = 0; i < 3; i++) mean[i] /= ringIdx.length;
  const dist = (o, q) => Math.max(Math.abs(B[o] - q[0]), Math.abs(B[o + 1] - q[1]), Math.abs(B[o + 2] - q[2]));
  const con = q => Math.max(Math.abs(q[0] - c[0]), Math.abs(q[1] - c[1]), Math.abs(q[2] - c[2]));
  // same: share of the ring in the text's own colour (it merges with what it touches)
  let same = 0;
  const sameHit = [], crossHit = [];
  const contrast = con(mean);
  if (contrast >= 64) {
    const tol = Math.min(48, 0.4 * contrast);
    for (let i = 0; i < ringIdx.length; i++) if (dist(ringIdx[i], c) < tol) { same++; sameHit.push(i); }
  }
  // cross: drawing of ANY colour that stands out from the ground (the ring's median colour) at least half as strongly
  // as the text does — a grey fence post, a green chart line, blue rays, dots — as a contact length in em: ring px / r
  // is about the length of the outline it touches. A line straight through a word touches ~2 line widths per letter
  // it passes; letters standing on a rule touch the whole word's width.
  let cross = 0;
  const bg = hist.map(hh => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hh[v]; if (acc * 2 >= ringIdx.length) return v; } return 255; });
  const cbg = con(bg);
  if (cbg >= 64) {
    const far = Math.max(56, 0.55 * cbg);
    for (let i = 0; i < ringIdx.length; i++) if (dist(ringIdx[i], bg) >= far) { cross++; crossHit.push(i); }
  }
  const out = { same: Math.round(same / ringIdx.length * 1000) / 1000, cross: Math.round(cross / r / Math.max(1, em) * 100) / 100 };
  if (sameHit.length) out.sameGeo = contactGeo(sameHit, ringK, ringIdx, glyph, x0, y0, w, h, B);
  if (crossHit.length) out.crossGeo = contactGeo(crossHit, ringK, ringIdx, glyph, x0, y0, w, h, B);
  return out;
}

/**
 * Where the drawing touches a text, so a report can say it in words: which side of the letters the contact is on
 * (share of contact px above / below / left / right of the ink, or in the middle band between and through the
 * letters), how far it spans along the text, its mean colour, and its box in output px.
 */
function contactGeo(hit, ringK, ringIdx, glyph, x0, y0, w, h, B) {
  let gx0 = w, gy0 = h, gx1 = -1, gy1 = -1;
  for (let k = 0; k < w * h; k++) if (glyph[k]) { const x = k % w, y = (k / w) | 0; if (x < gx0) gx0 = x; if (x > gx1) gx1 = x; if (y < gy0) gy0 = y; if (y > gy1) gy1 = y; }
  if (gx1 < 0) return null;
  const gh = Math.max(1, gy1 - gy0), gw = Math.max(1, gx1 - gx0), e = 0.18 * gh;
  const z = { above: 0, below: 0, left: 0, right: 0, through: 0 }, col = [0, 0, 0];
  let cx0 = w, cy0 = h, cx1 = -1, cy1 = -1;
  for (const i of hit) {
    const k = ringK[i], x = k % w, y = (k / w) | 0, o = ringIdx[i];
    z[y < gy0 + e ? 'above' : y > gy1 - e ? 'below' : x < gx0 + e ? 'left' : x > gx1 - e ? 'right' : 'through']++;
    col[0] += B[o]; col[1] += B[o + 1]; col[2] += B[o + 2];
    if (x < cx0) cx0 = x; if (x > cx1) cx1 = x; if (y < cy0) cy0 = y; if (y > cy1) cy1 = y;
  }
  const n = hit.length, hex = '#' + col.map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  for (const k in z) z[k] = Math.round(z[k] / n * 100) / 100;
  return { zones: z, color: hex, hspan: Math.round(Math.min(1, (cx1 - cx0) / gw) * 100) / 100, vspan: Math.round(Math.min(1, (cy1 - cy0) / gh) * 100) / 100,
           box: [x0 + cx0, y0 + cy0, x0 + cx1 + 1, y0 + cy1 + 1] };
}

// ---------------------------------------------------------------- what render.py calls
function outCtx() { return document.getElementById('mv').getContext('2d', { willReadFrequently: true }); }
function render(t, mode) {
  setContext(t);
  QA.on = true; QA.mode = mode;
  if (mode === 'record') { QA.texts = []; QA.boxes = []; QA.offscreen = []; }
  MV.lastError = null;
  const c = outCtx();
  MV.noOverlay = mode === 'bare';                      // 'bare': the picture alone, no lyrics and no screen layer
  try { MV.renderAt(c, t); } finally { QA.on = false; QA.mode = 'off'; MV.noOverlay = false; }
  return c;
}
/**
 * How much of the picture the lyrics hide: the footprint is where the frame differs from the bare picture (no
 * lyrics, no screen layer) — glyphs, and the bars / plates the screen layer lays behind them; the picture's detail
 * is its edges. Measured at 1/4 size. { hidden: share of the picture's edge pixels under the footprint, area: share
 * of the frame the footprint covers, edges, under: [names of MV.focus points under it] }.
 */
const SMALL = { w: 0, h: 0 };
function small(c) {
  const w = Math.round(W / 4), h = Math.round(H / 4);
  if (!SMALL.c || SMALL.w !== w) { SMALL.c = mk(w, h); SMALL.w = w; SMALL.h = h; SMALL.g = SMALL.c.getContext('2d', { willReadFrequently: true }); }
  SMALL.g.drawImage(c.canvas, 0, 0, w, h);
  return SMALL.g.getImageData(0, 0, w, h).data;
}
function coverage(SA, SC, focus) {
  const w = SMALL.w, h = SMALL.h, L = new Float32Array(w * h), fp = new Uint8Array(w * h);
  let area = 0;
  for (let k = 0; k < w * h; k++) {
    const o = k * 4;
    L[k] = 0.2126 * SC[o] + 0.7152 * SC[o + 1] + 0.0722 * SC[o + 2];
    if (Math.max(Math.abs(SA[o] - SC[o]), Math.abs(SA[o + 1] - SC[o + 1]), Math.abs(SA[o + 2] - SC[o + 2])) > 32) { fp[k] = 1; area++; }
  }
  let edges = 0, under = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x;
    if (Math.abs(L[k + 1] - L[k - 1]) + Math.abs(L[k + w] - L[k - w]) <= 48) continue;
    edges++;
    if (fp[k]) under++;
  }
  const hit = (fx, fy) => {
    const cx = Math.round(fx / 4), cy = Math.round(fy / 4);
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++)
      if (x >= 0 && y >= 0 && x < w && y < h && fp[y * w + x]) return true;
    return false;
  };
  // dens: how busy the picture is under the lyrics, against the frame as a whole (1 = as busy as the average spot)
  const dens = edges && area ? Math.round((under / area) / (edges / (w * h)) * 100) / 100 : 0;
  return { hidden: edges ? Math.round(under / edges * 1000) / 1000 : 0, area: Math.round(area / (w * h) * 1000) / 1000, edges, dens,
           under: focus.filter(f => hit(f.x, f.y)).map(f => ({ name: f.name, entry: f.entry })) };
}
function rnd(b) { return b.map(v => Math.round(v * 10) / 10); }

G.MV_QA = {
  /** the song's words: [{i, w, n, start, end, line, j, next}] — next = start of the following word in the line */
  words() {
    return MV.lyrics.words.map((w, i) => {
      const l = MV.lyrics.lines[w.line], nx = l.words[w.j + 1];
      return { i, w: w.w, n: norm(w.w), start: w.start, end: w.end, line: w.line, j: w.j, next: nx ? nx.start : null, lineEnd: l.end };
    });
  },
  /**
   * Render t (with and, when words are asked about, without the lyrics) and report:
   *   texts  every text drawn on the frame: string, lyric?, output font px, ink box
   *   boxes  every MV.box: output box
   *   focus  every MV.focus: output point
   *   words  for each asked word index: vis (share of its glyphs that really show), off (share off the frame)
   */
  probe(t, ids, opt) {
    ids = ids || [];
    const c = render(t, 'record');
    const err = MV.lastError;
    const M0 = postMatrix(), post = Object.assign({}, MV.lastPost || {});
    const texts = QA.texts, boxes = QA.boxes, offscreen = QA.offscreen;
    const focus = MV.frameFocus.map(f => { const p = f.screen ? { x: f.x, y: f.y } : M0.transformPoint({ x: f.x, y: f.y }); return { x: p.x, y: p.y, name: f.name, entry: f.entry ? f.entry.i : -1, screen: f.screen }; });
    const act = MV.activeAt(t), top = act[act.length - 1];
    const solo = act.length <= 1 || !(top.fadeIn && t < top.from + top.fadeIn);
    const A = ids.length || (opt && opt.touch) ? c.getImageData(0, 0, W, H).data : null;
    const SA = opt && opt.touch && !post.remapped ? small(c).slice() : null;
    let B = null;
    if (ids.length && texts.some(x => x.lyric)) { const c2 = render(t, 'nolyric'); B = c2.getImageData(0, 0, W, H).data; }
    if (QA.debug) { QA.A = A; QA.B = B; }
    const cover = SA ? coverage(SA, small(render(t, 'bare')), focus) : null;
    const T = texts.map(tx => { const M = full(tx, M0), q = inkQuad(tx, M); return { tx, M, n: normMap(tx.s), q, box: aabb(q), px: fontPx(tx.font) * scaleOf(M) }; });
    const ws = MV.lyrics.words;
    const words = ids.map(i => {
      const w = ws[i], nw = norm(w.w);
      if (!nw || (nw.length < 2 && !cjk(nw))) return { i, status: 'skip' };
      // a post filter moved the scene's pixels (3D tilt): only the screen layer can still be measured
      const TT = post.remapped ? T.filter(o => o.tx.where === 'out') : T;
      let best = null;
      const partial = { ink: 0, visible: 0, inside: 0, cover: 0, box: null };
      for (const o of TT) {
        if (!o.tx.lyric) continue;
        const k = o.n.n.indexOf(nw);
        if (k >= 0) {
          const s = glyphStats(o.tx, o.n.idx[k], o.n.idx[k + nw.length], o.M, A, B);
          const vis = s.ink > 0 ? s.visible / s.ink : 0;
          if (!best || vis > best.vis) best = { vis, off: s.ink > 0 ? 1 - s.inside / s.ink : 0, box: s.box, px: o.px, s: o.tx.s, alpha: o.tx.alpha, touch: s.touch, cross: s.cross, geo: s.geo };
        } else if (o.n.n.length >= 2 && nw.includes(o.n.n)) {   // the word is drawn in pieces (syllables, letters)
          const s = glyphStats(o.tx, 0, o.tx.s.length, o.M, A, B);
          partial.ink += s.ink; partial.visible += s.visible; partial.inside += s.inside; partial.cover += o.n.n.length;
          partial.box = partial.box ? [Math.min(partial.box[0], s.box[0]), Math.min(partial.box[1], s.box[1]), Math.max(partial.box[2], s.box[2]), Math.max(partial.box[3], s.box[3])] : s.box;
          partial.px = Math.max(partial.px || 0, o.px);
        }
      }
      if (partial.cover >= 0.6 * nw.length && partial.ink > 0) {
        const vis = partial.visible / partial.ink;
        if (!best || vis > best.vis) best = { vis, off: 1 - partial.inside / partial.ink, box: partial.box, px: partial.px, s: '(pieces)' };
      }
      if (!best) return { i, status: post.remapped || offscreen.some(o => o.includes(nw)) ? 'offscreen' : 'missing' };
      return { i, status: 'ok', vis: Math.round(best.vis * 1000) / 1000, off: Math.round(best.off * 1000) / 1000, box: rnd(best.box), px: Math.round(best.px), s: best.s, touch: best.touch || 0, cross: best.cross || 0, geo: best.geo || {} };
    });
    const tt = o => opt && opt.touch && A && o.px >= 24 && !post.remapped ? textTouch(o.tx, o.M, A) : { same: 0, cross: 0 };
    return {
      t, err, solo, shots: act.map(e => e.i), post,
      texts: T.map(o => ({ s: o.tx.s.slice(0, 80), ...(({ same, cross, sameGeo, crossGeo }) => ({ touch: same, cross, geo: { sameGeo, crossGeo } }))(tt(o)), q0: o.tx.where === 'out' ? null : aabb(inkQuad(o.tx, new DOMMatrix(o.tx.m))).map(v => Math.round(v)),
                           lyric: o.tx.lyric, decor: o.tx.decor, lines: o.tx.lines, px: Math.round(o.px * 10) / 10, box: rnd(o.box), q: o.q.map(rnd), entry: o.tx.entry, alpha: o.tx.alpha, where: o.tx.where, owner: o.tx.owner })),
      boxes: boxes.map(b => {
        const B = full(b, M0), [x, y, w, h] = b.rect;
        const q = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([u, v]) => { const p = B.transformPoint({ x: u, y: v }); return [p.x, p.y]; });
        return { name: b.name, pad: b.pad, entry: b.entry, owner: b.owner, where: b.where, alpha: b.alpha, box: rnd(aabb(q)), rect: b.rect, m: [B.a, B.b, B.c, B.d, B.e, B.f] };
      }),
      focus, words, cover,
    };
  },
  /** how much the picture (lyrics left out) changes across times: share of 1/4-size pixels that moved, per step */
  motion(times) {
    const w = Math.round(W / 4), h = Math.round(H / 4), sm = mk(w, h).getContext('2d', { willReadFrequently: true });
    let prev = null, first = null;
    const steps = [];
    let gray = null;
    for (const t of times) {
      const c = render(t, 'nolyric');
      sm.drawImage(c.canvas, 0, 0, w, h);
      const d = sm.getImageData(0, 0, w, h).data;
      gray = new Float32Array(w * h);
      for (let k = 0; k < w * h; k++) gray[k] = 0.2126 * d[k * 4] + 0.7152 * d[k * 4 + 1] + 0.0722 * d[k * 4 + 2];
      if (prev) steps.push(changed(prev, gray));
      else first = gray;
      prev = gray;
    }
    return { steps, span: first && gray ? changed(first, gray) : 0 };
    function changed(a, b) { let n = 0; for (let k = 0; k < a.length; k++) if (Math.abs(a[k] - b[k]) > 10) n++; return Math.round(n / a.length * 10000) / 10000; }
  },
};

if (new URLSearchParams(location.search).has('qa')) install();
})(window);
