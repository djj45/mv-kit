// 雨爱 — her end of the scroll, outside: the riverbank path running left into the mist, and the eave of her
// house at the far right (a flying corner, tiled roof, two posts, a stone step, deep shade underneath).
// Painted once into YUAI.near (world coordinates, same width as the scroll); scenes crop it like the land.

const YSHORE = {
  eaveX0: 5215,                                        // tip of the flying corner
  post: [5330, 5690],
  ground: 870,
  eave: x => 238 - 0.055 * (x - 5215) - 38 * Math.exp(-Math.max(0, x - 5215) / 45),   // underside of the eave (y at world x)
};

/** Top edge of the bank (the path) at world x: level by the house, rising into the distance on the left. */
function yuaiBankY(x) {
  return YSHORE.ground - 100 * smoothstep(5150, 3950, x) + 330 * smoothstep(3550, 2900, x) + 5 * noise1(x / 90, 44);
}

MV.onInit(() => {
  YUAI.near = mk(YUAI.SW, H);
  yshorePaint(YUAI.near.getContext('2d'));
  yshorePaintHis(YUAI.near.getContext('2d'));
});

/** His end (far left of the scroll): the two banks and a stone arch bridge; he stands at its right foot. */
const YHIS = { x: 1080, bridge: [360, 960], bankY: x => (x < 420 ? 808 : x > 900 ? 818 + 110 * smoothstep(1500, 1900, x) : 900) + 5 * noise1(x / 70, 9) };
function yshorePaintHis(g) {
  const A = INK.A, R = mulberry32(616), [b0, b1] = YHIS.bridge, bm = (b0 + b1) / 2;
  // banks: paper under their top edge, dry edge lines, reeds
  for (const [x0, x1] of [[-10, b0 + 70], [b1 - 70, 1950]]) {
    const edge = []; for (let x = x0; x <= x1; x += 12) edge.push([x, YHIS.bankY(x)]);
    g.save(); g.beginPath(); edge.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.lineTo(x1, H + 10); g.lineTo(x0, H + 10); g.closePath(); g.clip(); g.drawImage(YUAI.paper, 0, 0);
    const gr = g.createLinearGradient(0, 780, 0, H); gr.addColorStop(0, ink(A.qing * 0.35)); gr.addColorStop(1, ink(0)); g.fillStyle = gr; g.fillRect(x0, 760, x1 - x0, H); g.restore();
    for (let k = 0, i = 0; i < edge.length - 3; k++) { const j = Math.min(edge.length - 1, i + 12 + ((R() * 14) | 0)); inkStroke(g, edge.slice(i, j + 1), 5 + R() * 4, { alpha: A.nong * 0.85, dry: 0.5, seed: 4000 + k + x0, wet: 0.4 }); i = j - 1; }
    for (let i = 0; i < 12; i++) { const x = x0 + 20 + R() * (x1 - x0 - 40), y = YHIS.bankY(x) + 3, hgt = 40 + R() * 60;
      for (let k = 0; k < 4; k++) inkStroke(g, spline([[x + k * 3, y], [x + (R() - 0.3) * 20, y - hgt * 0.5], [x + (R() - 0.3) * 40, y - hgt]], 6), 2 + R(), { alpha: A.zhong * 0.8, dry: 0.4, seed: 4100 + i * 5 + k + x0, taper: BRUSH.tail }); }
  }
  // the bridge: a high arch, a deck that rises over it, piers, a few rail posts, the arch's reflection
  const deck = []; for (let x = b0 - 40; x <= b1 + 40; x += 10) { const u = (x - bm) / (b1 - b0 + 80) * 2; deck.push([x, 800 - 105 * (1 - u * u) + 3 * noise1(x / 40, 3)]); }
  const arch = []; for (let x = b0 + 50; x <= b1 - 50; x += 10) { const u = (x - bm) / (b1 - b0 - 100) * 2; arch.push([x, 905 - 150 * Math.sqrt(Math.max(0, 1 - u * u))]); }
  // a light wash in the spandrels only (deck above, arch below), so the bridge never boxes over the banks
  g.save(); g.beginPath(); deck.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); arch.slice().reverse().forEach(q => g.lineTo(q[0], q[1])); g.closePath();
  g.fillStyle = INK.paper; g.fill(); g.fillStyle = ink(A.qing * 0.7); g.fill(); g.restore();
  inkStroke(g, deck, 9, { alpha: A.nong, dry: 0.35, seed: 4200 });
  inkStroke(g, deck.map(q => [q[0], q[1] + 16]), 3.5, { alpha: A.zhong, dry: 0.5, seed: 4201, taper: BRUSH.both });
  inkStroke(g, arch, 7, { alpha: A.nong, dry: 0.3, seed: 4202 });
  inkStroke(g, arch.map(q => [q[0], 1810 - q[1]]), 3, { alpha: A.qing * 1.2, dry: 0.7, seed: 4203, taper: BRUSH.both });     // reflection
  for (let i = 0; i < 9; i++) { const q = deck[Math.round((i + 0.5) / 9 * (deck.length - 1))]; inkStroke(g, spline([[q[0], q[1]], [q[0] + 1, q[1] - 34]], 3), 3, { alpha: A.zhong, dry: 0.3, seed: 4210 + i, taper: BRUSH.both }); }
  inkStroke(g, deck.map(q => [q[0], q[1] - 34]), 3, { alpha: A.zhong, dry: 0.5, seed: 4220, taper: BRUSH.both });
  for (let i = 0; i < 40; i++) { const x = b0 - 30 + R() * (b1 - b0 + 60), y = 800 + R() * 100; inkStroke(g, spline([[x, y], [x + 16 + R() * 20, y + (R() - 0.5) * 3]], 3), 1.6, { alpha: A.dan * 0.6, dry: 0.7, seed: 4300 + i, taper: BRUSH.both }); }   // stone texture
}

function yshorePaint(g) {
  const A = INK.A, SW = YUAI.SW, R = mulberry32(515), S = YSHORE;
  // --- the bank: paper below the edge (hides the river), a dry edge line, a few texture strokes, reeds
  const edge = []; for (let x = 2850; x <= SW + 10; x += 12) edge.push([x, yuaiBankY(x)]);
  g.save(); g.beginPath(); edge.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.lineTo(SW + 10, H + 10); g.lineTo(2850, H + 10); g.closePath();
  g.clip(); g.drawImage(YUAI.paper, 0, 0);
  const gr = g.createLinearGradient(0, 760, 0, H); gr.addColorStop(0, ink(A.qing * 0.35)); gr.addColorStop(1, ink(0)); g.fillStyle = gr; g.fillRect(2850, 700, SW, H);
  g.restore();
  for (let k = 0, i = 0; i < edge.length - 4; k++) { const j = Math.min(edge.length - 1, i + 14 + ((R() * 18) | 0)); inkStroke(g, edge.slice(i, j + 1), 6 + R() * 4, { alpha: A.nong * 0.9, dry: 0.5, seed: 700 + k, wet: 0.4 }); i = j - 1; }
  for (let i = 0; i < 90; i++) {                         // bank texture: short dry horizontal strokes
    const x = 2950 + R() * (SW - 2950), y = yuaiBankY(x) + 18 + R() * R() * 180; if (y > H - 10) continue;
    inkStroke(g, spline([[x, y], [x + 30 + R() * 90, y + (R() - 0.5) * 6]], 6), 1.5 + R() * 2.5, { alpha: A.dan * (0.5 + R() * 0.6), dry: 0.7, seed: 740 + i, taper: BRUSH.both, wet: 0.2 });
  }
  for (let i = 0; i < 34; i++) {                         // reeds along the edge
    const x = 2980 + R() * (5150 - 2980), y = yuaiBankY(x) + 4, n = 3 + ((R() * 3) | 0), hgt = 40 + R() * 70;
    for (let k = 0; k < n; k++) { const lean = (R() - 0.35) * 0.6, top = [x + lean * hgt + (R() - 0.5) * 10, y - hgt * (0.6 + R() * 0.4)];
      inkStroke(g, spline([[x + k * 3, y], [lerp(x, top[0], 0.5) + lean * 8, lerp(y, top[1], 0.5)], top], 6), 2 + R() * 1.5, { alpha: A.zhong * (0.6 + R() * 0.4), dry: 0.4, seed: 800 + i * 7 + k, taper: BRUSH.tail, wet: 0.5 }); }
  }
  // --- the house corner: shade under the eave, posts, step, roof and tiles
  const x0 = S.eaveX0, gy = S.ground;
  inkSoftInto2(g, x0, s => {
    s.beginPath(); s.moveTo(x0 + 60, S.eave(x0 + 60) + 4); for (let x = x0 + 60; x <= SW + 20; x += 20) s.lineTo(x, S.eave(x) + 4);
    s.lineTo(SW + 20, gy + 6); s.lineTo(x0 + 110, gy + 6); s.closePath();
    const sh = s.createLinearGradient(0, 200, 0, gy); sh.addColorStop(0, ink(A.dan * 0.75)); sh.addColorStop(0.5, ink(A.qing * 1.3)); sh.addColorStop(1, ink(A.qing * 0.7));
    s.fillStyle = sh; s.fill();
    s.globalCompositeOperation = 'destination-out';                                   // the shade thins out towards the open side
    const fx = s.createLinearGradient(x0 + 60, 0, x0 + 330, 0); fx.addColorStop(0, 'rgba(0,0,0,1)'); fx.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = fx; s.fillRect(x0, 0, 400, H); s.globalCompositeOperation = 'source-over';
  });
  const st = (pts, w, o) => inkStroke(g, pts, w, { alpha: A.nong, dry: 0.35, wet: 0.6, ...o });
  const ln = (a, b, n = 5) => spline(Array.from({ length: n }, (_, i) => [lerp(a[0], b[0], i / (n - 1)) + (R() - 0.5) * 3, lerp(a[1], b[1], i / (n - 1)) + (R() - 0.5) * 3]), 6);
  S.post.forEach((px, i) => { st(ln([px, S.eave(px) + 10], [px + 3, gy + 4]), 16, { seed: 900 + i }); st(ln([px + 10, S.eave(px) + 16], [px + 12, gy]), 3, { alpha: A.zhong, seed: 905 + i, taper: BRUSH.both }); });
  st(ln([x0 + 70, gy + 8], [SW + 20, gy + 6]), 9, { seed: 910, dry: 0.45 });                        // step
  st(ln([x0 + 90, gy + 30], [SW + 20, gy + 28]), 4, { seed: 911, alpha: A.zhong, dry: 0.6 });
  // roof: dark wash above the eave line, tile rows, tile ends, the flying corner
  g.save(); g.beginPath(); g.moveTo(x0 - 10, S.eave(x0) - 6); for (let x = x0; x <= SW + 20; x += 15) g.lineTo(x, S.eave(x)); g.lineTo(SW + 20, -10); g.lineTo(x0 + 330, -10); g.closePath();
  g.fillStyle = ink(A.dan * 0.9); g.fill(); g.clip();
  for (let i = 0; i < 26; i++) { const x = x0 + 40 + i * 24; st(ln([x, S.eave(x) - 6], [x + 220, -20]), 5, { alpha: A.nong * 0.8, dry: 0.55, seed: 920 + i, taper: BRUSH.both }); }
  g.restore();
  const eaveLine = []; for (let x = x0 - 18; x <= SW + 20; x += 10) eaveLine.push([x, S.eave(Math.max(x, x0)) - (x < x0 ? (x0 - x) * 1.2 : 0)]);
  st(eaveLine, 12, { seed: 950, dry: 0.3 });
  for (let x = x0 + 30; x < SW; x += 24) { g.fillStyle = ink(A.nong); g.beginPath(); g.ellipse(x, S.eave(x) + 7, 6, 7, 0, 0, TAU); g.fill(); }
  granulate(g, SW, H, 51, 0.3, 1 / 80);
}

/** Soft (blurred) wash drawn in world coords into g, around x0 (init only). */
function inkSoftInto2(g, x0, fn) {
  const w = YUAI.SW - x0 + 200, c = mk(w / 4, H / 4), s = c.getContext('2d');
  s.scale(0.25, 0.25); s.translate(-(x0 - 100), 0); fn(s);
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, x0 - 100, 0, w, H); g.restore();
}

function yuaiNear(g, cam) { g.drawImage(YUAI.near, cam, 0, W, H, 0, 0, W, H); }

/** Water dripping from the eave: every point lets go of a drop on the beat, staggered. Screen coords via cam. */
function yuaiEaveDrips(g, t, cam, audio) {
  const S = YSHORE, A = INK.A;
  for (let i = 0; i < 11; i++) {
    const wx = S.eaveX0 + 40 + i * 48 + 9 * hash(i, 3), sx = wx - cam; if (sx < -20 || sx > W + 20) continue;
    const period = audio ? 60 / audio.bpm : 0.75, ph = hash(i, 5) * period, k = Math.floor((t - ph) / period), age = t - ph - k * period;
    const y0 = S.eave(wx) + 12, fall = 0.42, u = age / fall; if (u > 1) continue;
    const y = y0 + (S.ground - y0) * u * u, len = 8 + 30 * u;
    g.strokeStyle = ink(A.dan * 0.9); g.lineWidth = 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx, y - len); g.lineTo(sx, y); g.stroke();
  }
}
