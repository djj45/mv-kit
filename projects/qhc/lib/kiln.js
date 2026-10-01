// 青花瓷 — the dragon kiln (龙窑) at night on its hillside, the door and its bricks, fire-eyes, chimney; the fire inside.

/** The kiln scene, static parts, into layers L. Returns anchors {door, eyes, chimney, doorFace}. */
function qhcKiln(L, o = {}) {
  const a = [560, 850], b = [1690, 470], hgt = 120;       // kiln spine from the door end to the chimney end
  // night: sky wash, the hill below a ridge line
  L.wet.fillStyle = qa(0.34); L.wet.fillRect(0, 0, W, H);
  const ridge = []; for (let x = -20; x <= W + 20; x += 30) ridge.push([x, 930 - x * 0.3 + 26 * noise1(x / 260, 4)]);
  qhFill(L.wet, ridge.concat([[W + 20, H + 20], [-20, H + 20]]), 0.62);
  qhLine(L.dry, ridge, { w: 3, a: 0.88, dot: false, seed: 70 });
  // a few pines on the ridge
  for (let k = 0; k < 5; k++) {
    const x = 120 + k * 380 + 60 * hash(k, 3), y = 930 - x * 0.3 + 26 * noise1(x / 260, 4);
    const tree = [[x, y - 150], [x - 40, y - 70], [x - 18, y - 76], [x - 58, y - 10], [x + 58, y - 10], [x + 18, y - 76], [x + 40, y - 70]];
    if (Math.abs(x - 1100) < 700 && k > 0 && k < 4) continue;
    qhFill(L.wet, tree, 0.8); qhLine(L.dry, tree, { w: 2.6, a: 0.9, closed: true, seed: 71 + k });
  }
  // the kiln body: a long vault lying up the slope
  const n = 14, dx = (b[0] - a[0]) / n, dy = (b[1] - a[1]) / n, nx = dy / Math.hypot(dx, dy), ny = -dx / Math.hypot(dx, dy);
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) { const x = a[0] + dx * i, y = a[1] + dy * i; top.push([x + nx * hgt * -1 * -1 * 0 + 0, y - hgt]); bot.push([x, y]); }
  const body = top.concat(bot.slice().reverse());
  qhErase(L, body); qhFill(L.wet, body, 0.3); qhLine(L.dry, body, { w: 3.4, a: 0.9, closed: true, seed: 72 });
  for (let i = 1; i < n; i++) qhLine(L.dry, [top[i], [bot[i][0] + 6, bot[i][1] - 30]], { w: 2, a: 0.75, seed: 73 + i, dot: false });
  // fire-eyes along the back
  const eyes = []; for (let i = 1; i < n; i++) { const p = [top[i][0] + dx * 0.5, top[i][1] + dy * 0.5 + 22]; eyes.push(p); const e = blobPts(p[0], p[1], 11, 80 + i, 0.1, 16); qhFill(L.wet, e, 0.95); }
  // the door end: a rounded face with the arched door in it
  const fx = a[0], fy = a[1];
  const face = [[fx - 150, fy + 20], [fx - 150, fy - 110], [fx - 110, fy - 190], [fx, fy - 220], [fx + 60, fy - 196], [fx + 70, fy + 20]];
  qhErase(L, face); qhFill(L.wet, face, 0.4); qhLine(L.dry, face, { w: 3.6, a: 0.92, closed: true, seed: 75, smooth: 1 });
  const door = [[fx - 110, fy + 16], [fx - 110, fy - 90], [fx - 88, fy - 140], [fx - 45, fy - 162], [fx - 2, fy - 140], [fx + 20, fy - 90], [fx + 20, fy + 16]];
  qhFill(L.wet, door, 0.95); qhLine(L.dry, door, { w: 3, a: 0.92, closed: true, seed: 76, smooth: 1 });
  // chimney at the top end
  const ch = [[b[0] - 30, b[1] - hgt + 10], [b[0] - 26, b[1] - hgt - 170], [b[0] + 26, b[1] - hgt - 170], [b[0] + 30, b[1] - hgt + 10]];
  qhFill(L.wet, ch, 0.5); qhLine(L.dry, ch, { w: 3.2, a: 0.9, closed: true, seed: 77 });
  return { door, eyes, chimney: [b[0], b[1] - hgt - 172], doorBox: [fx - 110, fy - 162, 130, 178] };
}
/** The door bricked up to k (0..n bricks), bottom row first. */
function qhcBricks(L, K, k, tk) {
  const [x, y, w, h] = K.doorBox, rows = 5, cols = 2, bw = w / cols, bh = h / rows;
  let i = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
    const kk = clamp(k - i); if (kk <= 0) continue;
    const drop = (1 - ease.outCubic(kk)) * 40;
    const bx = x + c * bw + (r % 2 ? -bw * 0.5 : 0), by = y + h - (r + 1) * bh - drop;
    const bb = [[Math.max(x, bx) + 2, by + 2], [Math.min(x + w, bx + bw) - 2, by + 2], [Math.min(x + w, bx + bw) - 2, by + bh - 2], [Math.max(x, bx) + 2, by + bh - 2]];
    if (r % 2 && c === cols - 1) { const b2 = [[x + w - bw * 0.5 + 2, by + 2], [x + w - 2, by + 2], [x + w - 2, by + bh - 2], [x + w - bw * 0.5 + 2, by + bh - 2]]; qhErase(L, b2); qhFill(L.wet, b2, 0.46); qhLine(L.dry, b2, { w: 2.4, a: 0.88, closed: true, seed: 200 + i, tk }); }
    qhErase(L, bb); qhFill(L.wet, bb, 0.46); qhLine(L.dry, bb, { w: 2.4, a: 0.88, closed: true, seed: 100 + i, tk });
  }
  return rows * cols;
}
/** 火焰纹: a flame tongue from (x, y) rising h, leaning, flickering with t. */
function qhcFlame(x, y, h, lean, t, seed) {
  const w = h * 0.28, pts = [];
  for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([x - w * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - u * 0.3) + lean * h * u * u + 10 * noise1(u * 3 + t * 2, seed), y - h * u]); }
  const tip = [x + lean * h + 16 * noise1(t * 2, seed + 1), y - h * 1.08];
  const right = []; for (let i = 20; i >= 0; i--) { const u = i / 20; right.push([x + w * Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - u * 0.5) + lean * h * u * u + 10 * noise1(u * 3 + t * 2, seed + 2), y - h * u]); }
  return pts.concat([tip], right);
}
