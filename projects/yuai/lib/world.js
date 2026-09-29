// 雨爱 — the long scroll. One painted world, YUAI.SW px wide: his end (bridge) on the left, her end
// (house, window) on the right, the mountains and the river in between. Her shots pan right→left,
// his left→right. Everything is painted once in MV.onInit; scenes crop it with a camera x.
const YUAI = { SW: 5760 };

MV.onInit(() => {
  YUAI.paper = paintXuan(YUAI.SW, H, 11);
  YUAI.land = mk(YUAI.SW, H);
  yuaiPaintLand(YUAI.land.getContext('2d'));
  YUAI.tmp = mk(W, H);
});

function yuaiPaintLand(g) {
  const A = INK.A, SW = YUAI.SW, R = mulberry32(404);
  // far ranges: pale, soft, the whole length of the scroll
  inkRidge(g, -200, SW + 200, H * 0.655, H * 0.2, { alpha: A.qing * 1.05, blur: 3.5, seed: 3, peaks: 13, depth: H * 0.07, rough: 0.05, step: 8 });
  inkRidge(g, 500, SW - 300, H * 0.69, H * 0.14, { alpha: A.qing * 1.35, blur: 2, seed: 5, peaks: 11, depth: H * 0.06, step: 8 });
  // middle mountains in clusters, textured, standing in the mist band
  const mids = [[150, 1300, 0.36, 2], [1450, 2650, 0.4, 3], [2850, 3950, 0.25, 3], [4050, 4750, 0.22, 2], [5000, 5800, 0.17, 2]];
  mids.forEach(([a, b, h, pk], i) => inkRidge(g, a, b, H * 0.765, H * h, { alpha: A.dan * 1.05, seed: 20 + i, peaks: pk, cun: 0.9, line: 5, dots: 0.7, depth: H * 0.1, blur: 0.5 }));
  // the river: a few dry horizontal strokes on white
  for (let i = 0; i < 110; i++) {
    const x = R() * SW, y = H * (0.8 + R() * 0.16), L = 40 + R() * R() * 260, wv = (R() - 0.5) * 6;
    inkStroke(g, spline([[x, y], [x + L * 0.5, y + wv], [x + L, y - wv * 0.5]], 8), 1.5 + R() * 2.5,
      { alpha: A.qing * (0.8 + R() * 1.2), dry: 0.55, seed: 900 + i, taper: BRUSH.both, wet: 0.3 });
  }
}

/** Paper (always) cropped at camera x. */
function yuaiPaper(g, cam) { g.drawImage(YUAI.paper, cam, 0, W, H, 0, 0, W, H); }

/** The painted land cropped at cam; edgeX (screen): only the part right of a wet, ragged edge is shown. */
function yuaiLand(g, cam, edgeX = -1e9, alpha = 1) {
  if (edgeX < -400) { g.save(); g.globalAlpha = alpha; g.drawImage(YUAI.land, cam, 0, W, H, 0, 0, W, H); g.restore(); return; }
  if (edgeX > W + 300) return;
  const tg = YUAI.tmp.getContext('2d');
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H);
  tg.drawImage(YUAI.land, cam, 0, W, H, 0, 0, W, H);
  // ragged soft mask (world-anchored noise so the edge does not swim)
  inkSoftMask(tg, s => {
    s.beginPath(); s.moveTo(edgeX, -40);
    for (let y = -40; y <= H + 40; y += 24) s.lineTo(edgeX + 220 * fbm2(y / 210, (edgeX + cam) / 900, 77, 3), y);
    s.lineTo(W + 400, H + 40); s.lineTo(W + 400, -40); s.closePath(); s.fillStyle = '#fff'; s.filter = 'blur(26px)'; s.fill(); s.filter = 'none';
  });
  g.save(); g.globalAlpha = alpha; g.drawImage(YUAI.tmp, 0, 0); g.restore();
}

/** Keep only what fn paints (white) of tg, via a quarter-res mask: soft edges for free. */
let YUAI_MASK = null;
function inkSoftMask(tg, fn) {
  if (!YUAI_MASK) YUAI_MASK = mk(W / 4, H / 4);
  const m = YUAI_MASK.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, YUAI_MASK.width, YUAI_MASK.height);
  m.setTransform(0.25, 0, 0, 0.25, 0, 0); fn(m);
  tg.save(); tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.imageSmoothingEnabled = true; tg.drawImage(YUAI_MASK, 0, 0, W, H); tg.restore();
}

/** Where each lyric line is written. Positions belong to lines, so a line never jumps at a cut. */
function yuaiLyricPlace(l) {
  if (l.text.includes('看不清')) return [1400, 215];        // shot 4: on the washed-out glass
  if (l.text.includes('离开你') || l.text.includes('不忍揭晓')) return [430, 150];   // shot 5: the sky on the left, away from the eave
  if (l.text.includes('真希望') && l.start < 70 || l.text.includes('让想念')) return [1640, 150];   // shot 9: the rain sky in the window
  if (l.text.includes('我相信') || l.text.includes('彩虹的美丽')) return [230, 110];   // shot 13: the left sky, clear of the arc
  return [W - 190, 190];
}
function yuaiLyrics(g, f, fade) { return inkLyrics(g, f, W - 190, 190, { size: 70, place: yuaiLyricPlace, fade }); }

/** Paper texture over a flat paper-coloured veil, so a fade to white still looks like paper. */
function yuaiPaperVeil(g, a) { g.save(); g.globalAlpha = a; yuaiPaper(g, 1200); g.restore(); }
