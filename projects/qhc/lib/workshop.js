// 青花瓷 — the workshop: 冰裂纹 window, incense burner, low desk, brush rest, the paper for her drawing.

/** Split a convex polygon by the line through p with direction d → [left, right]. */
function qhcSplitPoly(poly, p, d) {
  const side = q => (q[0] - p[0]) * d[1] - (q[1] - p[1]) * d[0], A = [], B = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
    (sa >= 0 ? A : B).push(a);
    if ((sa >= 0) !== (sb >= 0)) { const k = sa / (sa - sb), x = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; A.push(x); B.push(x); }
  }
  return [A, B];
}
/** 冰裂纹 (cracked-ice) lattice inside the rectangle: a list of cell polygons. */
function qhcIceLattice(x0, y0, x1, y1, n = 26, seed = 3) {
  const R = mulberry32(seed); let cells = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]];
  const area = P => { let s = 0; P.forEach((a, i) => { const b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; }); return Math.abs(s) / 2; };
  while (cells.length < n) {
    cells.sort((a, b) => area(b) - area(a));
    const c = cells.shift(); let cx = 0, cy = 0; c.forEach(q => { cx += q[0]; cy += q[1]; }); cx /= c.length; cy /= c.length;
    const ang = R() * Math.PI, p = [cx + (R() - 0.5) * 30, cy + (R() - 0.5) * 30];
    const [A, B] = qhcSplitPoly(c, p, [Math.cos(ang), Math.sin(ang)]);
    if (A.length >= 3 && B.length >= 3) cells.push(A, B); else cells.push(c);
  }
  return cells;
}
/** The workshop wall with the window, the sill and the burner (static, into layers L). Returns anchors. */
function qhcWorkshop(L, o = {}) {
  const win = o.win || [150, 130, 640, 610];
  const [x0, y0, x1, y1] = win;
  // dusk: a pale wash over the wall, the window left light
  L.wet.save(); L.wet.beginPath(); L.wet.rect(0, 0, W, H); L.wet.rect(x0 + 24, y0 + 24, x1 - x0 - 48, y1 - y0 - 48); L.wet.fillStyle = qa(0.13); L.wet.fill('evenodd'); L.wet.restore();
  // floor
  qhFill(L.wet, [[0, o.floor || 760], [W, o.floor || 760], [W, H], [0, H]], 0.2);
  qhLine(L.dry, [[-10, o.floor || 760], [W + 10, o.floor || 760]], { w: 3, a: 0.85, dot: false, seed: 31 });
  for (let k = 0; k < 6; k++) qhLine(L.dry, [[-10, (o.floor || 760) + 50 + k * 58 + k * k * 4], [W + 10, (o.floor || 760) + 48 + k * 58 + k * k * 4]], { w: 1.8, a: 0.5, dot: false, seed: 32 + k });
  // window frame + 冰裂纹
  const fr = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  qhFill(L.wet, fr.concat([[x0, y0], [x0 + 24, y0 + 24], [x0 + 24, y1 - 24], [x1 - 24, y1 - 24], [x1 - 24, y0 + 24], [x0 + 24, y0 + 24]]), QH.D.er);
  qhLine(L.dry, fr, { w: 4, a: 0.9, closed: true, seed: 33 });
  qhLine(L.dry, [[x0 + 24, y0 + 24], [x1 - 24, y0 + 24], [x1 - 24, y1 - 24], [x0 + 24, y1 - 24]], { w: 3, a: 0.88, closed: true, seed: 34 });
  qhcIceLattice(x0 + 24, y0 + 24, x1 - 24, y1 - 24, 24, 7).forEach((c, i) => qhLine(L.dry, c, { w: 5, a: 0.8, closed: true, seed: 40 + i, dot: false }));
  // sill
  const sill = [[x0 - 30, y1], [x1 + 30, y1], [x1 + 30, y1 + 26], [x0 - 30, y1 + 26]];
  qhFill(L.wet, sill, QH.D.er); qhLine(L.dry, sill, { w: 3, a: 0.9, closed: true, seed: 35 });
  // incense burner (a small tripod censer) on the sill
  const bx = o.burner ? o.burner[0] : (x0 + x1) / 2 + 60, by = y1;
  const bowl = [[bx - 40, by - 44], [bx + 40, by - 44], [bx + 34, by - 16], [bx + 20, by - 8], [bx - 20, by - 8], [bx - 34, by - 16]];
  qhFill(L.wet, bowl, QH.D.er); qhLine(L.dry, bowl, { w: 3, a: 0.9, closed: true, seed: 36, smooth: 1 });
  for (const dx of [-24, 0, 24]) qhLine(L.dry, [[bx + dx, by - 10], [bx + dx * 1.1, by]], { w: 3, a: 0.9, seed: 37 + dx, dot: false });
  qhLine(L.dry, [[bx - 30, by - 44], [bx - 34, by - 58], [bx - 24, by - 58]], { w: 2.6, a: 0.85, seed: 38 });
  qhLine(L.dry, [[bx + 30, by - 44], [bx + 34, by - 58], [bx + 24, by - 58]], { w: 2.6, a: 0.85, seed: 39 });
  qhLine(L.dry, qhCurl(bx, by - 28, 10, 1, 1, 0, 20), { w: 2, a: 0.8, seed: 40 });
  return { smoke: [bx, by - 48], win };
}
/** A low desk (side-on): top at y from x0 to x1. */
function qhcDesk(L, x0, x1, y, o = {}) {
  const top = [[x0, y], [x1, y], [x1 + 8, y + 26], [x0 - 8, y + 26]];
  qhFill(L.wet, top, QH.D.er); qhLine(L.dry, top, { w: 3.4, a: 0.9, closed: true, seed: 51 });
  const leg = x => [[x - 14, y + 26], [x + 14, y + 26], [x + 12, (o.floor || y + 150)], [x - 12, (o.floor || y + 150)]];
  for (const x of [x0 + 40, x1 - 40]) { qhFill(L.wet, leg(x), QH.D.dan); qhLine(L.dry, leg(x), { w: 3, a: 0.88, closed: true, seed: 52 + x }); }
  qhLine(L.dry, [[x0 + 54, y + 60], [x1 - 54, y + 60]], { w: 2.6, a: 0.8, seed: 55, dot: false });
}
/** A turntable disc for the vase on the desk. */
function qhcTurntable(L, cx, y, r) {
  const d = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * TAU; d.push([cx + Math.cos(a) * r, y + Math.sin(a) * r * 0.14]); }
  qhFill(L.wet, d, QH.D.dan); qhLine(L.dry, d, { w: 3, a: 0.88, closed: true, seed: 57 });
  const side = [[cx - r, y], [cx - r, y + 14], [cx + r, y + 14], [cx + r, y]];
  qhFill(L.wet, side, QH.D.er); qhLine(L.dry, side.slice(1, 3), { w: 3, a: 0.88, seed: 58, dot: false });
}
