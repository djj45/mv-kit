// pigment-demo — a small 勾勒 + 分水 motif (a flower on a vine) drawn as densities into pigment layers.
// Outlines go to L.dry (even-width 勾线 with a small entry dot), fills to L.wet (分水: flat tones, darker at the base).

/** A petal as a closed polyline: base near (cx, cy), tip r1 away along angle a, half-width w. jit = hand wobble (px). */
function pgdPetal(cx, cy, a, r0, r1, w, seed, jit = 0, tk = 0) {
  const ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => [cx + ca * u - sa * v, cy + sa * u + ca * v];
  const left = bez3(P(r0, 0), P(r0 + (r1 - r0) * 0.25, -w * 1.1), P(r0 + (r1 - r0) * 0.8, -w * 0.9), P(r1, -w * 0.12), 14);
  const tip = [P(r1 + 6, 0)];
  const right = bez3(P(r1, w * 0.12), P(r0 + (r1 - r0) * 0.8, w * 0.9), P(r0 + (r1 - r0) * 0.25, w * 1.1), P(r0, 0), 14);
  const pts = left.concat(tip, right);
  // ruffled edge, then a small wobble that changes per drawing (on twos)
  return pts.map((p, i) => {
    const s = i / (pts.length - 1), rf = 5 * Math.sin(s * Math.PI) * noise1(s * 9, seed);
    const j = jit ? [(hash(tk, i, seed) - 0.5) * jit, (hash(tk, i, seed + 1) - 0.5) * jit] : [0, 0];
    return [p[0] + rf * -sa + j[0], p[1] + rf * ca + j[1]];
  });
}

/** Even-width 勾线 along pts (closed if asked), with a small dot where the brush touched down. */
function pgdLine(c, pts, lw, a, closed = true) {
  c.save(); c.strokeStyle = ink(a); c.fillStyle = ink(a); c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (closed) c.closePath(); c.stroke();
  c.beginPath(); c.arc(pts[0][0], pts[0][1], lw * 0.95, 0, TAU); c.fill();
  c.restore();
}
function pgdFillPoly(c, pts, style) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = style; c.fill(); }

/**
 * The flower at (cx, cy), size s (1 = 170 px petals). o.fill 0..1 (how far the 分水 has spread from each petal's
 * base), o.line 0..1 (how much of the outline is drawn), o.tk (drawing index for the wobble), o.jit.
 */
function pgdFlower(L, cx, cy, s, o = {}) {
  const n = 6, fill = o.fill ?? 1, line = o.line ?? 1, tk = o.tk || 0, jit = o.jit ?? 0.9;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * TAU / n + 0.12, pts = pgdPetal(cx, cy, a, 26 * s, 170 * s, 58 * s, 30 + i, jit, tk);
    // 分水: pale body, deeper towards the base; the tone spreads outward from the base as `fill` grows
    // each petal fills from a drop at its own base; the petals start one after another
    const fp = clamp(fill * 1.3 - i * 0.06);
    if (fp > 0) {
      L.wet.save();
      pgdFillPoly(L.wet, pts, 'rgba(0,0,0,0)'); L.wet.clip();
      const bx = cx + Math.cos(a) * 40 * s, by = cy + Math.sin(a) * 40 * s, Rf = 170 * s, R = Rf * fp;
      const gr = L.wet.createRadialGradient(bx, by, 0, bx, by, Rf);
      gr.addColorStop(0, ink(0.62)); gr.addColorStop(0.3, ink(0.5)); gr.addColorStop(0.5, ink(0.36)); gr.addColorStop(1, ink(0.3));
      L.wet.fillStyle = gr;
      pathSmooth(L.wet, blobPts(bx, by, Math.max(1, R), 50 + i, 0.16, 48)); L.wet.fill();
      L.wet.restore();
    }
    if (line > 0) pgdLine(L.dry, cutPolyline(pts, clamp(line * 1.15 - i * 0.03)), 3.6 * Math.max(0.8, s), 0.86, line >= 1);
  }
  // heart: heavy dots (where 铁锈斑 gather on fired cobalt)
  if (line > 0.6) for (let k = 0; k < 9; k++) {
    const a = k * 2.4, r = (k ? 14 + 7 * (k % 3) : 0) * s;
    L.dry.fillStyle = ink(0.97); L.dry.beginPath(); L.dry.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, (k ? 5 : 9) * s, 0, TAU); L.dry.fill();
  }
}

/** A leaf: 勾线 outline + midrib, 分水 fill. */
function pgdLeaf(L, x, y, a, len, o = {}) {
  const pts = pgdPetal(x, y, a, 0, len, len * 0.24, 70 + (o.seed || 0), o.jit ?? 0.9, o.tk || 0);
  if ((o.fill ?? 1) > 0) pgdFillPoly(L.wet, pts, ink(0.44 * (o.fill ?? 1)));
  pgdLine(L.dry, pts, 3.2, 0.86);
  pgdLine(L.dry, [[x, y], [x + Math.cos(a) * len * 0.85, y + Math.sin(a) * len * 0.85]], 2.2, 0.8, false);
}
