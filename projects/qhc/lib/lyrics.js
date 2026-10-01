// 青花瓷 — lyric helpers shared by the shots.
// Lines 0–12 (the verse) are unfired grey; from line 13 (the chorus) they are fired cobalt.
const QL = { FIRED: 13 };
/** The lyric at (x, y), vertical, right to left; o as qhLyrics (o.dark on deep water). */
function qhcLyrics(g, f, x, y, o = {}) {
  return qhLyrics(g, f, x, y, { size: 64, styleOf: l => ({ fired: l.i >= QL.FIRED, dark: o.dark }), ...o });
}
/** Progress 0..1 through a sung line, advancing one equal segment per character (eased inside each). */
function qhcLineProg(line, t, o = {}) {
  const w = line.words, n = w.length;
  if (t <= w[0].start) return 0;
  for (let i = 0; i < n; i++) {
    const a = w[i].start, b = i + 1 < n ? w[i + 1].start : Math.max(w[i].end, a + (o.last || 0.35));
    if (t < b) return (i + (o.ease || ease.inOutQuad)(clamp((t - a) / Math.max(0.05, Math.min(b - a, o.max || 0.45))))) / n;
  }
  return 1;
}
/** A vase point (unwrap u, v in texels) → screen, for a vase drawn with qhcVase({cx, top, h, rot}). */
function qhcVasePt(u, y, o) {
  const th = (u / QV.UW) * TAU - (TAU * 0.25 + (o.rot || 0)), v = y / QV.UH, r = qhcRadius(v) * o.h;
  return { x: o.cx + r * Math.sin(th), y: o.top + v * o.h, front: Math.cos(th) };
}
/**
 * For flat close-ups of the vase body (panel-local world, camera tx, ty, z): darken towards the edges where the
 * body turns away, and paint the room beyond the silhouette. The flat view is arc length, so the edge sits a bit
 * further out than the projected radius.
 */
function qhcBodyShade(g, tx, ty, z, o = {}) {
  const axis = tx + (QV.PW / 2) * z, spread = o.spread || 1.3;
  const half = yy => qhcRadius((QV.PY + (yy - ty) / z) / QV.UH) * QV.UH * z * spread;
  g.save();
  for (let yy = 0; yy < H; yy += 12) {
    const hw = half(yy + 6);
    if (axis - hw > W || axis + hw < 0) continue;
    const sh = g.createLinearGradient(axis - hw, 0, axis + hw, 0);
    sh.addColorStop(0, `rgba(90,80,64,${o.a ?? 0.34})`); sh.addColorStop(0.25, 'rgba(90,80,64,0.02)'); sh.addColorStop(0.6, 'rgba(90,80,64,0)'); sh.addColorStop(1, `rgba(90,80,64,${(o.a ?? 0.34) * 0.8})`);
    g.fillStyle = sh; g.fillRect(axis - hw, yy, 2 * hw, 12);
  }
  g.beginPath(); g.rect(0, 0, W, H);
  const edge = []; for (let yy = -40; yy <= H + 40; yy += 12) edge.push([axis + half(yy), yy]);
  g.moveTo(edge[0][0], edge[0][1]); edge.forEach(p => g.lineTo(p[0], p[1])); for (let i = edge.length - 1; i >= 0; i--) g.lineTo(2 * axis - edge[i][0], edge[i][1]); g.closePath();
  g.fillStyle = o.room || '#E6DFD0'; g.fill('evenodd');
  g.restore();
}
/** Panel A as a flat close-up: frame, peony, her (panel-local world through camera tx, ty, z) into layers L. */
function qhcPanelAFlat(L, tx, ty, z, o = {}) {
  for (const c of [L.wet, L.dry, L.col]) c.setTransform(z, 0, 0, z, tx, ty);
  qhcPanelAContent(L, { parts: { frameA: true, peony: true, lady: o.lady !== false }, hong: o.hong, sky: o.sky, face: o.face, lips: o.lips, tk: o.tk, wind: o.wind });
  for (const c of [L.wet, L.dry, L.col]) c.setTransform(1, 0, 0, 1, 0, 0);
}
/**
 * The glaze going on: everything above the wet front (with a row of round drips) is covered. Near the front the
 * glaze is wet and still half clear; behind it, dry, powdery and nearly opaque. front = screen y of the curtain.
 */
function qhcGlazeCurtain(g, front, t, o = {}) {
  const col = o.col || '239,235,228', dryA = o.dry ?? 0.9, wetA = o.wet ?? 0.5, band = o.band || 260;
  const dripY = x => front + (o.drips ?? 1) * (26 + 70 * Math.pow(hash(Math.floor(x / 46), 3), 3) * (0.6 + 0.4 * Math.sin(t * 0.8 + x)));
  const edge = []; for (let x = -20; x <= W + 20; x += 46) {
    const d = dripY(x); edge.push([x, front], [x + 10, front + 4], [x + 16, d - 12], [x + 23, d], [x + 30, d - 12], [x + 36, front + 4]);
  }
  const path = () => { g.beginPath(); g.moveTo(-20, -20); g.lineTo(W + 20, -20); for (let i = edge.length - 1; i >= 0; i--) g.lineTo(edge[i][0], edge[i][1]); g.closePath(); };
  g.save();
  path(); g.clip();
  const gr = g.createLinearGradient(0, front - band, 0, front + 100);
  gr.addColorStop(0, `rgba(${col},${dryA})`); gr.addColorStop(0.72, `rgba(${col},${wetA})`); gr.addColorStop(1, `rgba(${col},${wetA * 0.8})`);
  g.fillStyle = gr; g.fillRect(0, -20, W, front + 140);
  g.restore();
  // the wet lip: a soft shine along the front and on each drip
  g.save(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); edge.forEach((p, i) => (i ? g.lineTo(p[0], p[1] - 3) : g.moveTo(p[0], p[1] - 3))); g.stroke();
  g.lineWidth = 2; g.strokeStyle = 'rgba(150,140,125,0.35)'; g.beginPath(); edge.forEach((p, i) => (i ? g.lineTo(p[0], p[1] + 1) : g.moveTo(p[0], p[1] + 1))); g.stroke();
  g.restore();
}
