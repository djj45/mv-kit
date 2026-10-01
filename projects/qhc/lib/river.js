// 青花瓷 — the picture inside panel B, full screen: his bank (willow, boat, him in the bow), the river in rows of
// little waves, the far shore with her under a peony tree, his village (white walls, dark tiles, a chimney),
// a 天青 sky and fine rain. World x is panned with cam; o.wide 0..1 widens the river (the far shore recedes).

function qhcRainLines(L, t, o = {}) {
  const n = o.n || 150, R = mulberry32(o.seed || 5), tk = tick(t), sp = o.speed || 900, len = o.len || 46, ang = o.ang ?? 0.22;
  L.dry.save(); L.dry.lineCap = 'round'; L.dry.strokeStyle = qa(o.a ?? QH.D.dan); L.dry.lineWidth = o.w || 1.8;
  L.dry.beginPath();
  for (let i = 0; i < n; i++) {
    const x0 = R() * (W + 300) - 150, ph = R(), tq = tk / MV.drawRate;
    const y = ((ph * (H + 200) + tq * sp) % (H + 200)) - 100, x = x0 - (y + 100) * ang;
    if (o.clip && o.clip(x, y)) continue;
    L.dry.moveTo(x, y); L.dry.lineTo(x - len * ang, y + len);
  }
  L.dry.stroke(); L.dry.restore();
}
/** Houses: white walls, dark tiled roofs (马头墙), a chimney at chimney[]. */
function qhcVillage(L, x0, yb, o = {}) {
  const tk = o.tk || 0, houses = [[0, 260, 200], [240, 340, 250], [600, 220, 180], [840, 300, 230]];
  const chimneys = [];
  houses.forEach(([dx, w, h], i) => {
    const x = x0 + dx, y = yb;
    const wall = [[x, y], [x, y - h], [x + w, y - h], [x + w, y]];
    qhErase(L, wall); qhFill(L.wet, wall, 0.04); qhLine(L.dry, wall, { w: 3.2, a: 0.9, closed: true, tk, seed: 500 + i });
    // stepped gable walls (马头墙) with dark caps
    const cap = (cx, cy, cw) => { const c = [[cx - cw / 2 - 12, cy], [cx + cw / 2 + 12, cy], [cx + cw / 2, cy - 22], [cx - cw / 2, cy - 22]]; qhFill(L.wet, c, QH.D.zheng * 0.9); qhLine(L.dry, c, { w: 2.6, a: 0.92, closed: true, tk, seed: 510 + i + cx }); };
    cap(x + w / 2, y - h, w);
    cap(x + w * 0.18, y - h - 40, w * 0.28); cap(x + w * 0.82, y - h - 40, w * 0.28);
    qhLine(L.dry, [[x + w * 0.04, y - h], [x + w * 0.04, y - h - 40]], { w: 2.6, a: 0.9, tk, seed: 520 + i });
    qhLine(L.dry, [[x + w * 0.96, y - h], [x + w * 0.96, y - h - 40]], { w: 2.6, a: 0.9, tk, seed: 530 + i });
    // a door and a small window
    const d = [[x + w * 0.42, y], [x + w * 0.42, y - 90], [x + w * 0.58, y - 90], [x + w * 0.58, y]];
    qhFill(L.wet, d, QH.D.er); qhLine(L.dry, d, { w: 2.6, a: 0.9, closed: true, tk, seed: 540 + i });
    const wn = [[x + w * 0.14, y - h * 0.62], [x + w * 0.3, y - h * 0.62], [x + w * 0.3, y - h * 0.46], [x + w * 0.14, y - h * 0.46]];
    qhFill(L.wet, wn, QH.D.dan); qhLine(L.dry, wn, { w: 2.2, a: 0.88, closed: true, tk, seed: 550 + i });
    if (i % 2 === 1) {
      const cx = x + w * 0.7, ct = y - h - 110, c = [[cx - 16, y - h - 22], [cx - 14, ct], [cx + 14, ct], [cx + 16, y - h - 22]];
      qhFill(L.wet, c, QH.D.er); qhLine(L.dry, c, { w: 2.6, a: 0.9, closed: true, tk, seed: 560 + i }); chimneys.push([cx, ct]);
    }
  });
  qhLine(L.dry, [[x0 - 80, yb], [x0 + 1200, yb]], { w: 3, a: 0.88, dot: false, seed: 570 });
  return chimneys;
}
/**
 * The river world into layers L (screen space). o.cam world x at the screen's left edge; o.wide 0..1; o.sky 0..1;
 * o.smoke: age of the village smoke (s) or null; o.her: draw her on the far shore; o.t for the wind and rain.
 */
function qhcRiverWorld(L, o = {}) {
  const cam = o.cam || 0, wide = o.wide || 0, t = o.t || 0, tk = o.tk || 0;
  const hz = lerp(560, 400, ease.inOutQuad(wide));                   // the far shore's waterline
  const X = x => x - cam;
  // sky
  if (o.sky) { L.col.fillStyle = rgba(QH.tianqing, 0.88 * o.sky); L.col.fillRect(-W, -H, 3 * W, H + hz - 30); L.col.fillStyle = rgba(QH.tianqing, 0.4 * o.sky); L.col.fillRect(-W, hz - 30, 3 * W, 40); L.wet.qhClear = L.dry.qhClear = L.col; }
  // far shore: low hills and her under a peony tree, shrinking with the river's width
  const fs = lerp(1, 0.42, ease.inOutQuad(wide)), fx = X(1650);
  const hills = []; for (let x = -600; x <= 900; x += 30) hills.push([fx + x * fs, hz - (120 + 70 * Math.sin(x / 170) + 40 * noise1(x / 120, 2)) * fs * clamp(1 - Math.abs(x) / 900 + 0.3)]);
  qhFill(L.wet, hills.concat([[fx + 900 * fs, hz], [fx - 600 * fs, hz]]), QH.D.ying); qhLine(L.dry, hills, { w: 2.6, a: 0.8, dot: false, seed: 600, tk });
  qhLine(L.dry, [[fx - 700 * fs, hz], [fx + 1000 * fs, hz]], { w: 2.4, a: 0.8, dot: false, seed: 601 });
  if (o.her !== false) {
    const hx = fx - 120 * fs, hh = 190 * fs;
    // the peony tree over her
    qhLine(L.dry, [[hx - 70 * fs, hz], [hx - 76 * fs, hz - hh * 1.2], [hx - 40 * fs, hz - hh * 1.6]], { w: 2.6 * Math.max(0.6, fs), a: 0.88, seed: 610, dot: false });
    for (let k = 0; k < 4; k++) qhPeony(L, hx - (90 - k * 34) * fs, hz - hh * (1.35 + 0.2 * (k % 2)), 0.22 * fs, { w: 1.8 });
    qhcLady(L, hx, hz, hh, { tk, wind: 0.5 + 0.2 * Math.sin(t), lw: Math.max(1.4, 2.6 * fs), jit: 0.3 });
  }
  // water: rows of little waves, more rows as it widens
  const rows = 9 + Math.round(6 * wide);
  for (let r = 0; r < rows; r++) {
    const u = r / (rows - 1), y = lerp(hz + 16, 1000, Math.pow(u, 1.35)), sc = lerp(0.45, 1.3, u), step = 120 * sc;
    const off = ((r * 53 - cam * 0.9 + t * 20 * (r % 2 ? 1 : -1)) % step + step) % step;
    for (let x = -step + off - W * 0.25; x < W * 1.25 + step; x += step) {
      if (o.clipWater && o.clipWater(x, y)) continue;
      qhLine(L.dry, [[x, y], [x + 20 * sc, y - 9 * sc], [x + 40 * sc, y]], { w: lerp(1.6, 2.6, u), a: 0.72, dot: false, seed: 620 + r * 31 + Math.floor((x + cam) / step), tk, jit: 0.4 });
    }
  }
  // his bank: foreground left, willow, the landing
  const bank = [[X(-2200), 760], [X(260), 760], [X(420), 800], [X(560), 880], [X(620), H + 20], [X(-2200), H + 20]];
  qhErase(L, bank); qhFill(L.wet, bank, QH.D.dan); qhLine(L.dry, bank.slice(0, 5), { w: 3.2, a: 0.9, dot: false, seed: 630, tk });
  for (let k = 0; k < 8; k++) qhLine(L.dry, [[X(-2100 + k * 300), 820 + 30 * (k % 3)], [X(-2040 + k * 300), 812 + 30 * (k % 3)]], { w: 2, a: 0.7, dot: false, seed: 640 + k });
  qhcWillow(L, X(200), 770, 2.3, t, { tk });
  // the village along his bank, further left
  const chim = qhcVillage(L, X(-1900), 764, { tk });
  if (o.smoke != null) chim.forEach(([cx, cy], i) => {
    const age = o.smoke - i * 0.4; if (age <= 0) return;
    qhSmoke(cx, cy, 1200, age, 700 + i, { rise: 230, amp: 46, drift: 0.9 }).forEach((p, k) => qhLine(L.dry, p.map(([x, y]) => { const u = Math.max(0, cy - y); return [x + u * 0.9, cy - u * 0.62]; }), { w: 3.2, a: 0.62, seed: 710 + i * 5 + k, tk, dot: false, jit: 1 }));
  });
  // the boat at the landing, him in the bow looking across
  if (o.boat !== false) qhcBoat(L, X(760), 900, 2.3, { tk, lw: 4, look: o.look || 0 });
  L.wet.qhClear = L.dry.qhClear = null;
  return { hz };
}
