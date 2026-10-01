// 青花瓷 — the 梅瓶: profile, the unwrapped decoration (2048 × 1024: x = angle all the way round, y = height),
// its unfired (raw) and fired (cobalt) textures, and qhcVase() to draw it lit and turning.
//
// Layout of the unwrap (y in texels, 1024 = full height):
//   0–34 lip · 34–70 neck · 72–262 如意云肩 (four lobes) · 270–282 double line · 290–760 body: two 海棠 panels
//   (A = her + the peony, centred at u 512; B = the river + him, centred at u 1536) in a 缠枝 scroll ·
//   770–782 double line · 792–936 海水江崖 · 946–1000 蕉叶 band · 1000–1024 unglazed foot
// Panel contents are drawn in a local isotropic box (QV.PW × QV.PH) and warped row by row onto the unwrap, so
// they look right on the curved body (the unwrap is squeezed horizontally where the vase is narrow).
const QV = {
  UW: 2048, UH: 1024,
  PW: 440, PH: 460, PY: 300,                // panel box: local size, top row on the unwrap
  A: 512, B: 1536,                          // panel centres (u)
  prof: null, tex: {}, L: null,
};

/** Meiping radius (fraction of the height) at v = 0..1 (top → bottom). */
function qhcRadius(v) {
  const K = [[0, 0.07], [0.014, 0.078], [0.032, 0.074], [0.045, 0.057], [0.068, 0.06], [0.1, 0.125], [0.15, 0.212], [0.2, 0.262],
    [0.26, 0.29], [0.32, 0.293], [0.4, 0.281], [0.5, 0.256], [0.6, 0.226], [0.7, 0.196], [0.8, 0.17], [0.88, 0.153], [0.94, 0.148],
    [0.975, 0.156], [0.99, 0.153], [1, 0.146]];
  v = clamp(v);
  let i = 1; while (i < K.length - 1 && K[i][0] < v) i++;
  const p0 = K[Math.max(0, i - 2)], p1 = K[i - 1], p2 = K[i], p3 = K[Math.min(K.length - 1, i + 1)];
  const u = (v - p1[0]) / (p2[0] - p1[0] || 1);
  // Catmull-Rom on the radius (knots are close to evenly spaced, good enough)
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3);
}
/** Horizontal stretch at unwrap row y so that local shapes look round on the vase. */
const qhcSx = y => QV.UW / (QV.UH * TAU * qhcRadius(y / QV.UH));

/** Warp a local box of layers (src: pigment layers PW×PH) onto the unwrap layers dst, centred at u, top row y0. */
function qhcWarp(src, dst, u, y0) {
  for (const k of ['wet', 'dry', 'col']) {
    const s = src.canvases[k], d = dst[k];
    for (let y = 0; y < s.height; y += 2) {
      const sx = qhcSx(y0 + y + 1), w = s.width * sx;
      d.drawImage(s, 0, y, s.width, 2, u - w / 2, y0 + y, w, 2);
      if (u - w / 2 < 0) d.drawImage(s, 0, y, s.width, 2, u - w / 2 + QV.UW, y0 + y, w, 2);
      if (u + w / 2 > QV.UW) d.drawImage(s, 0, y, s.width, 2, u - w / 2 - QV.UW, y0 + y, w, 2);
    }
  }
}
/** The panel outline in local box coordinates. */
const qhcPanelPts = () => qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 30, QV.PH - 30);
/** The panel outline on the unwrap (for clipping the scroll), centred at u. */
function qhcPanelUnwrap(u) {
  return qhcPanelPts().map(([x, y]) => { const yy = QV.PY + y; return [u + (x - QV.PW / 2) * qhcSx(yy), yy]; });
}

/** 如意云肩: four lobes hanging from the neck ring, each holding a pair of curls and a bud. */
function qhcShoulder(L, o = {}) {
  const top = 72, h = 186, tk = o.tk || 0;
  for (let i = 0; i < 4; i++) {
    const cx0 = i * 512 + 256;
    for (const dx of [0, -QV.UW, QV.UW]) {
      const cx = cx0 + dx; if (cx < -300 || cx > QV.UW + 300) continue;
      const pts = qhRuyi(cx, top, 496, h);
      qhFill(L.wet, pts, QH.D.ying);
      qhLine(L.dry, pts, { w: 4.4, a: 0.9, closed: true, seed: 200 + i, tk });
      const inner = qhRuyi(cx, top, 430, h - 26);
      qhLine(L.dry, inner.slice(1, -1), { w: 2.2, a: 0.8, seed: 210 + i, tk, dot: false });
      const by = top + 70;
      qhLine(L.dry, qhCurl(cx - 64, by, 30, 1.25, -1, 0), { w: 2.8, a: 0.85, tk, seed: 220 + i });
      qhLine(L.dry, qhCurl(cx + 64, by, 30, 1.25, 1, Math.PI), { w: 2.8, a: 0.85, tk, seed: 230 + i });
      const bud = qhPetal(cx, by + 60, -Math.PI / 2, 0, 66, 22, 240 + i);
      qhFill(L.wet, bud, QH.D.er); qhLine(L.dry, bud, { w: 2.6, a: 0.9, closed: true, tk, seed: 250 + i });
      qhLine(L.dry, [[cx, by + 58], [cx, by + 8]], { w: 2, a: 0.8, tk, seed: 260 + i, dot: false });
    }
  }
  // neck ring + lip ring
  for (const y of [14, 34, 66, 72]) qhLine(L.dry, [[-10, y], [QV.UW + 10, y]], { w: y < 40 ? 3 : 3.6, a: 0.9, dot: false, wob: 0.6, seed: y });
  qhFill(L.wet, [[-5, 36], [QV.UW + 5, 36], [QV.UW + 5, 64], [-5, 64]], QH.D.dan);
}
/** The 缠枝 scroll between the panels (clipped away from them). */
function qhcScroll(L, o = {}) {
  const tk = o.tk || 0;
  for (const c of [L.wet, L.dry]) {
    c.save(); c.beginPath(); c.rect(-10, 286, QV.UW + 20, 480);
    for (const u of [QV.A, QV.B]) { const P = qhcPanelUnwrap(u).map(([x, y]) => [QV.A === u || true ? x : x, y]); c.moveTo(P[0][0], P[0][1]); P.forEach(p => c.lineTo(p[0], p[1])); c.closePath(); }
    c.clip('evenodd');
  }
  // the stem: a slow wave all the way round, with a flower in every trough and crest between the panels
  const stem = []; for (let x = -20; x <= QV.UW + 20; x += 8) stem.push([x, 525 + 115 * Math.sin((x / QV.UW) * TAU * 4 + 0.6)]);
  qhLine(L.dry, stem, { w: 4, a: 0.88, dot: false, seed: 300, tk });
  for (let k = 0; k < 16; k++) {
    const x = (k + 0.5) * QV.UW / 16, ph = (x / QV.UW) * TAU * 4 + 0.6, y = 525 + 115 * Math.sin(ph), up = Math.cos(ph) > 0 ? -1 : 1;
    // a tendril curling off the stem, a leaf on the other side
    qhLine(L.dry, qhCurl(x + 30, y + up * 62, 36, 1.15, up, up > 0 ? -Math.PI / 2 : Math.PI / 2), { w: 2.6, a: 0.85, seed: 310 + k, tk });
    qhLeaf(L, x - 6, y, up > 0 ? 2.3 : -2.3, 74, { seed: k, tk, w: 2.4 });
    if (k % 2 === 0) qhPeony(L, x + 16, y + up * -58, 0.3, { tk, w: 2.3 });
  }
  L.wet.restore(); L.dry.restore();
  for (const y of [272, 282, 770, 780]) qhLine(L.dry, [[-10, y], [QV.UW + 10, y]], { w: 3.4, a: 0.9, dot: false, wob: 0.7, seed: y });
}
/** 海水江崖 round the lower body, 蕉叶 band, foot rings. */
function qhcLower(L, o = {}) {
  const tk = o.tk || 0, ph = o.phase || 0;
  L.dry.save(); L.dry.beginPath(); L.dry.rect(-10, 790, QV.UW + 20, 148); L.dry.clip();
  qhWaves(-40, QV.UW + 40, 800, 936, ph, { rows: 4, aw: 92 }).forEach((p, i) => qhLine(L.dry, p, { w: 2.2, a: 0.82, dot: false, seed: 400 + i, tk, wob: 0.5 }));
  L.dry.restore();
  // rocks (江崖): four peaks standing out of the water, filled
  for (let k = 0; k < 4; k++) {
    const x = k * 512 + 256, pts = [[x - 70, 936], [x - 44, 862], [x - 20, 880], [x + 6, 812], [x + 30, 850], [x + 52, 836], [x + 76, 936]];
    L.wet.save(); qhPath(L.wet, pts); L.wet.fillStyle = qa(1); L.wet.globalCompositeOperation = 'destination-out'; L.wet.fill(); L.wet.restore();
    L.dry.save(); qhPath(L.dry, pts); L.dry.globalCompositeOperation = 'destination-out'; L.dry.fillStyle = qa(1); L.dry.fill(); L.dry.restore();
    qhFill(L.wet, pts, QH.D.er); qhLine(L.dry, pts, { w: 3, a: 0.9, closed: true, seed: 420 + k, tk });
    qhLine(L.dry, [[x - 8, 930], [x + 4, 842]], { w: 2, a: 0.8, seed: 430 + k, tk });
  }
  for (const y of [790, 938, 946]) qhLine(L.dry, [[-10, y], [QV.UW + 10, y]], { w: 3.2, a: 0.9, dot: false, wob: 0.6, seed: y });
  // 蕉叶 (banana-leaf) band: tall narrow leaves pointing up
  for (let k = 0; k < 24; k++) {
    const x = (k + 0.5) * QV.UW / 24, pts = [[x - 30, 996], [x - 12, 962], [x, 950], [x + 12, 962], [x + 30, 996]];
    qhFill(L.wet, pts, QH.D.ying); qhLine(L.dry, pts, { w: 2.2, a: 0.85, seed: 450 + k, tk });
    qhLine(L.dry, [[x, 996], [x, 956]], { w: 1.8, a: 0.8, seed: 480 + k, tk, dot: false });
  }
  qhLine(L.dry, [[-10, 998], [QV.UW + 10, 998]], { w: 3.6, a: 0.92, dot: false, seed: 998 });
}

/**
 * Paint the vase's decoration into unwrap layers L. o.parts: which parts ({shoulder, scroll, lower, frameA, frameB,
 * peony, lady, river}); o.frameA 0..1 = how much of panel A's outline is drawn (S1); o.peony 0..1; o.sky (col layer
 * 天青 in the panels, 0..1).
 */
function qhcDecor(L, o = {}) {
  const P = o.parts || {};
  if (P.shoulder) qhcShoulder(L, o);
  if (P.scroll) qhcScroll(L, o);
  if (P.lower) qhcLower(L, o);
  const box = QV.box || (QV.box = pigmentLayers(QV.PW, QV.PH));
  const panel = (u, draw) => { box.clear(); draw(box); qhcWarp(box, L, u, QV.PY); };
  if ((o.frameA ?? (P.frameA ? 1 : 0)) > 0 || P.peony || P.lady) panel(QV.A, b => qhcPanelAContent(b, o));
  if (P.frameB || P.river) panel(QV.B, b => qhcPanelBContent(b, o));
}
/** Panel A: the peony and her (local box). */
function qhcPanelAContent(b, o) {
  const P = o.parts || {}, fa = o.frameA ?? (P.frameA ? 1 : 0), pts = qhcPanelPts();
  if (o.sky) { b.col.save(); qhPath(b.col, pts); b.col.clip(); b.col.fillStyle = rgba(QH.tianqing, 0.9 * o.sky); b.col.fillRect(0, 0, QV.PW, QV.PH * 0.58); b.col.restore(); b.wet.qhClear = b.dry.qhClear = b.col; }
  if (fa > 0) {
    qhLine(b.dry, pts, { w: 4.2, a: 0.92, closed: true, upto: fa, seed: 600 });
    if (fa >= 1) qhLine(b.dry, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 52, QV.PH - 52), { w: 2, a: 0.82, closed: true, seed: 601 });
  }
  b.dry.save(); qhPath(b.dry, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 56, QV.PH - 56)); b.dry.clip();
  b.wet.save(); qhPath(b.wet, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 56, QV.PH - 56)); b.wet.clip();
  if (P.peony || o.peony) qhcPeonyBush(b, 150, 250, { k: o.peony ?? 1, heart: o.heart ?? 1 });
  if (P.lady) qhcLady(b, 300, 402, 300, { face: o.face || 0, lips: o.lips, tk: o.tk, wind: o.wind ?? 0.3, jit: o.tk ? 0.5 : 0 });
  // ground: a few grass strokes and a garden rock
  if (P.peony || P.lady) {
    qhLine(b.dry, [[70, 404], [180, 398], [300, 406], [380, 400]], { w: 2.2, a: 0.8, dot: false, seed: 640 });
    const rock = [[60, 404], [52, 360], [74, 330], [100, 344], [112, 318], [134, 350], [128, 404]];
    qhFill(b.wet, rock, QH.D.dan); qhLine(b.dry, rock, { w: 2.6, a: 0.86, closed: true, seed: 641 });
  }
  b.wet.restore(); b.dry.restore();
  b.wet.qhClear = b.dry.qhClear = null;
  // 釉里红: the peony's heart (only when asked)
  if (o.hong && (P.peony || o.peony)) { b.col.fillStyle = rgba(QH.hong, o.hong); b.col.beginPath(); b.col.arc(150, 244, 9, 0, TAU); b.col.fill(); }
}
/** The peony plant of panel A: one big head, a bud, leaves. k = 0..1 drawn. */
function qhcPeonyBush(b, x, y, o = {}) {
  const k = o.k ?? 1;
  const stem = [[x + 6, y + 150], [x + 2, y + 90], [x, y + 30]];
  qhLine(b.dry, stem, { w: 2.6, a: 0.86, dot: false, upto: clamp(k * 3), seed: 650 });
  const lv = [[x - 14, y + 70, 2.6, 70], [x + 16, y + 60, 0.4, 66], [x - 8, y + 110, 3.0, 60], [x + 14, y + 104, 0.1, 58]];
  lv.forEach(([lx, ly, a, len], i) => qhLeaf(b, lx, ly, a, len, { seed: 20 + i, line: clamp(k * 4 - 1 - i * 0.3), fill: clamp(k * 3 - 1.5), w: 2.2 }));
  qhPeony(b, x, y, 0.62, { line: clamp(k * 1.6 - 0.25), fill: clamp(k * 1.6 - 0.55), heart: k > 0.9, w: 2.6 });
  const bud = qhPetal(x + 58, y - 38, -1.1, 0, 44, 16, 660);
  qhFill(b.wet, bud, QH.D.er, { k: clamp(k * 3 - 2) }); qhLine(b.dry, bud, { w: 2.2, a: 0.88, closed: true, upto: clamp(k * 3 - 1.8), seed: 661 });
  qhLine(b.dry, [[x + 30, y + 20], [x + 58, y - 38]], { w: 2, a: 0.84, dot: false, upto: clamp(k * 3 - 1.8), seed: 662 });
}
/** Panel B: the river, the boat, him — and the far shore. */
function qhcPanelBContent(b, o) {
  const P = o.parts || {}, pts = qhcPanelPts();
  if (o.sky) { b.col.save(); qhPath(b.col, pts); b.col.clip(); b.col.fillStyle = rgba(QH.tianqing, 0.9 * o.sky); b.col.fillRect(0, 0, QV.PW, QV.PH * 0.55); b.col.restore(); b.wet.qhClear = b.dry.qhClear = b.col; }
  if (P.frameB) {
    qhLine(b.dry, pts, { w: 4.2, a: 0.92, closed: true, seed: 700 });
    qhLine(b.dry, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 52, QV.PH - 52), { w: 2, a: 0.82, closed: true, seed: 701 });
  }
  if (!P.river) { b.wet.qhClear = b.dry.qhClear = null; return; }
  b.dry.save(); qhPath(b.dry, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 56, QV.PH - 56)); b.dry.clip();
  b.wet.save(); qhPath(b.wet, qhBegonia(QV.PW / 2, QV.PH / 2, QV.PW - 56, QV.PH - 56)); b.wet.clip();
  // far shore: low hills on the right, pale
  const hills = [[240, 262], [280, 236], [312, 250], [350, 222], [400, 246], [440, 262]];
  qhFill(b.wet, hills.concat([[440, 268], [240, 268]]), QH.D.ying); qhLine(b.dry, hills, { w: 2, a: 0.7, dot: false, seed: 710 });
  // near bank with a willow on the left
  const bank = [[0, 300], [60, 296], [120, 312], [150, 340], [0, 360]];
  qhFill(b.wet, bank, QH.D.dan); qhLine(b.dry, bank.slice(0, 4), { w: 2.4, a: 0.85, dot: false, seed: 711 });
  qhcWillow(b, 70, 300, 1, 0);
  // water: rows of little waves
  for (let r = 0; r < 6; r++) {
    const y = 290 + r * 26, seg = [];
    for (let x = 150 + (r % 2) * 20; x < 440; x += 46) seg.push([[x, y], [x + 12, y - 5], [x + 24, y]]);
    seg.forEach((s, i) => qhLine(b.dry, s, { w: 1.8, a: 0.72, dot: false, seed: 720 + r * 10 + i }));
  }
  // the boat and him in the bow, facing the far shore
  qhcBoat(b, 250, 330, 0.95, { man: true });
  b.wet.restore(); b.dry.restore();
  b.wet.qhClear = b.dry.qhClear = null;
}

/** Build the textures once: 'blank' raw clay, 'raw' (verse state), 'lady' (raw with her), 'fired' (cobalt), 'firedSky'. */
function qhcBuildTex(name) {
  if (QV.tex[name]) return QV.tex[name];
  const L = QV.L || (QV.L = pigmentLayers(QV.UW, QV.UH));
  L.clear();
  const all = { shoulder: true, scroll: true, lower: true, frameA: true, frameB: true, peony: true, river: true };
  const spec = {
    blank: [{}, 'raw'],
    raw: [{ parts: all }, 'raw'],
    rawLady: [{ parts: { ...all, lady: true }, heart: 1 }, 'raw'],
    fired: [{ parts: { ...all, lady: true } }, 'cobalt'],
    firedSky: [{ parts: { ...all, lady: true }, sky: 1 }, 'cobalt'],
  }[name];
  qhcDecor(L, spec[0]);
  const c = mk(QV.UW, QV.UH);
  c.getContext('2d').drawImage(pigmentComp(L, { preset: spec[1], seed: 3, scale: 1.4 }), 0, 0);
  return (QV.tex[name] = c);
}
MV.onInit(() => { const p = new Float32Array(97); for (let i = 0; i <= 96; i++) p[i] = qhcRadius(i / 96); QV.prof = p; });

/**
 * Draw the vase. o.tex (canvas or texture name), o.cx, o.top (px of the lip), o.h (height px), o.rot (radians;
 * 0 = panel A faces us), o.fired (glaze) 0..1, o.shadow (ground shadow alpha), o.fresh (texture changed),
 * o.mouth (draw the opening). Panel A faces the camera at rot = 0, panel B at rot = π.
 */
function qhcVase(g, o = {}) {
  const tex = typeof o.tex === 'string' ? qhcBuildTex(o.tex) : o.tex;
  const h = o.h || 760, cx = o.cx ?? W / 2, top = o.top ?? (H - h) / 2;
  if (o.shadow) {
    const sy = top + h, rw = qhcRadius(1) * h * 2.1;
    const gr = g.createRadialGradient(cx + 18, sy, 0, cx + 18, sy, rw);
    gr.addColorStop(0, `rgba(60,58,54,${o.shadow})`); gr.addColorStop(1, 'rgba(60,58,54,0)');
    g.save(); g.translate(cx + 18, sy); g.scale(1, 0.16); g.translate(-cx - 18, -sy); g.fillStyle = gr; g.fillRect(cx - rw, sy - rw, rw * 2 + 36, rw * 2); g.restore();
  }
  // u of the texture at the front = 0.25 at rot 0 (panel A); the shader samples u = (asin(s) + rot') / TAU
  const rot = TAU * 0.25 + (o.rot || 0);
  const cv = qhCylinder(tex, { prof: QV.prof, cx, top, h, rot, glaze: o.fired ?? 0, fresh: o.fresh, amb: o.fired ? 0.8 : 0.72, env: o.env, flip: o.flip });
  g.drawImage(cv, 0, 0);
  if (o.mouth !== false && !o.flip) {
    const r = qhcRadius(0) * h;
    g.save(); g.fillStyle = o.fired ? '#2a3350' : '#5a554c'; g.globalAlpha = 0.85;
    g.beginPath(); g.ellipse(cx, top + 1, r * 0.7, r * 0.16, 0, 0, TAU); g.fill(); g.restore();
  }
}
