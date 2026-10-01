// 青花瓷 — under the river and on it at night. Dark water is dense cobalt, so everything pale in it is a reserve
// (留白): weeds, fish, light, the moon, the net are knocked out of the wash and given only a pale tone.

/** Knock a stroke out of the wash (a pale line on dark water), then lay a faint tone in it. */
function qhcReserveLine(L, pts, w, tone = 0.12, o = {}) {
  for (const c of [L.wet, L.dry]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w; c.strokeStyle = '#000'; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (o.closed) c.closePath(); c.stroke(); c.restore(); }
  if (tone > 0) { const c = L.wet; c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w; c.strokeStyle = qa(tone); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (o.closed) c.closePath(); c.stroke(); c.restore(); }
}
function qhcReserveFill(L, pts, tone = 0.1) {
  qhErase(L, pts); if (tone > 0) qhFill(L.wet, pts, tone);
}
/** A strand of water weed (鱼藻) from (x, y) up, length len, swaying with t; leaves alternate along it. */
function qhcWeed(L, x, y, len, t, seed) {
  const pts = []; for (let s = 0; s <= len; s += 10) { const u = s / Math.max(1, len); pts.push([x + 30 * u * noise1(seed + t * 0.4 + u * 1.5, seed) + 14 * Math.sin(u * 5 + t * 1.2 + seed), y - s]); }
  qhcReserveLine(L, pts, 5, 0.18);
  for (let i = 3; i < pts.length - 1; i += 3) {
    const p = pts[i], side = i % 2 ? 1 : -1, a = -Math.PI / 2 + side * 0.9;
    const leaf = qhPetal(p[0], p[1], a, 0, 34, 9, seed * 7 + i);
    qhcReserveFill(L, leaf, 0.22);
  }
}
/** A mandarin fish (鳜鱼) seen side-on at (x, y), facing +x (dir), size s. */
function qhcFish(L, x, y, s, dir = 1, t = 0) {
  const T = p => p.map(([u, v]) => [x + u * s * dir, y + v * s]);
  const wag = 0.12 * Math.sin(t * 5);
  const body = T([[60, 0], [40, -22], [0, -28], [-40, -18], [-62, -2 + wag * 30], [-40, 16], [0, 22], [40, 16]]);
  const tail = T([[-58, 0], [-92, -24 + wag * 60], [-86, 0], [-92, 24 + wag * 60]]);
  const fin = T([[-10, -26], [0, -46], [26, -30]]);
  qhcReserveFill(L, qhSmooth(body, true, 2), 0.24); qhcReserveFill(L, tail, 0.3); qhcReserveFill(L, fin, 0.3);
  // markings: an eye and a few dapples in the wash
  const e = T([[42, -6]])[0]; L.wet.fillStyle = qa(0.9); L.wet.beginPath(); L.wet.arc(e[0], e[1], 4 * s, 0, TAU); L.wet.fill();
  for (let k = 0; k < 5; k++) { const d = T([[-30 + k * 16, -6 + 8 * Math.sin(k * 2)]])[0]; L.wet.fillStyle = qa(0.5); L.wet.beginPath(); L.wet.arc(d[0], d[1], 5 * s, 0, TAU); L.wet.fill(); }
}
/** Draw a vase canvas (from qhcVase into its own layer) rotated about its centre, tinted by the water. */
function qhcTintedVase(g, drawFn, o = {}) {
  const c = QV.tmpVase || (QV.tmpVase = mk(W, H)), v = c.getContext('2d');
  v.setTransform(1, 0, 0, 1, 0, 0); v.globalCompositeOperation = 'source-over'; v.clearRect(0, 0, W, H);
  drawFn(v);
  if (o.tint) { v.globalCompositeOperation = 'source-atop'; v.fillStyle = o.tint; v.fillRect(0, 0, W, H); v.globalCompositeOperation = 'source-over'; }
  g.save(); if (o.rot) { g.translate(o.px, o.py); g.rotate(o.rot); g.translate(-o.px, -o.py); } g.globalAlpha = o.alpha ?? 1; g.drawImage(c, 0, 0); g.restore();
}
