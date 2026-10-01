// 青花瓷（影戏）— the props: knife, hands, the hide sheet, the peony pattern, the bamboo rod.
// Everything is drawn in LOCAL coordinates at the origin (up = −y, +x = the way it points); the scene
// translates / rotates / scales. All of it ends up as silhouette() fills and cutStroke() seams.
//
//   QHC.knife(g, {len})            carving knife, tip at (+len, 0)
//   QHC.handHold(g, {s})           a fist gripping a handle along +x
//   QHC.handPress(g, {s, curl})    a hand pressing flat onto the work (arm comes in from the left)
//   QHC.fingers(g, pts, w0, w1)    tapered fingers with round knuckles
//   QHC.limb(g, pts, w0, w1)       a tapered, round-jointed limb (a single filled shape)
//   QHC.hideSheet(g, w, h, {seed, wob})   a sheet of hide, edges slightly irregular
//   QHC.peony({size, seed})        the 折枝牡丹 pattern: {path: [...], parts: {stem, leaves, petals, bud}}
//   QHC.rod(g, {len, w, nodes})    a bamboo control rod
const QHC = {};

/** A tapered limb / finger: one filled polygon with round joints. */
QHC.limb = function (g, pts, w0, w1, style) {
  const poly = brushPoly(pts, 1, s => lerp(w0, w1, s));
  g.fillStyle = style || 'rgba(24,16,22,0.94)';
  pathPoly(g, poly); g.fill();
  g.beginPath(); g.arc(pts[0][0], pts[0][1], w0 / 2, 0, TAU); g.fill();
  g.beginPath(); g.arc(pts[pts.length - 1][0], pts[pts.length - 1][1], w1 / 2, 0, TAU); g.fill();
  for (let i = 1; i < pts.length - 1; i++) { g.beginPath(); g.arc(pts[i][0], pts[i][1], lerp(w0, w1, i / (pts.length - 1)) / 2, 0, TAU); g.fill(); }
  return poly;
};
QHC.fingers = function (g, pts, w0, w1, style) { return QHC.limb(g, pts, w0, w1, style); };

/** The carving knife: handle at the origin, blade along +x. */
QHC.knife = function (g, o = {}) {
  const len = o.len ?? 150, s = o.s ?? 1, lit = o.lit ?? 1;
  g.save(); g.scale(s, s);
  g.fillStyle = 'rgba(24,16,22,0.94)';
  // handle
  g.beginPath();
  g.moveTo(-76, -11); g.quadraticCurveTo(-4, -14, 6, -8); g.lineTo(6, 8);
  g.quadraticCurveTo(-4, 14, -76, 11); g.quadraticCurveTo(-84, 0, -76, -11);
  g.closePath(); g.fill();
  // bolster + blade (triangular, thin at the tip)
  g.beginPath();
  g.moveTo(6, -14); g.quadraticCurveTo(len * 0.55, -12, len - 22, -5);
  g.lineTo(len, -1); g.lineTo(len, 1.8); g.lineTo(len - 22, 5);
  g.quadraticCurveTo(len * 0.5, 11, 6, 12); g.closePath(); g.fill();
  // the lit edge (the back of the blade) and a highlight along the cutting edge
  g.strokeStyle = shLamp(0.5 * lit); g.lineWidth = 2.0; g.lineCap = 'round';
  g.beginPath(); g.moveTo(9, -12.4); g.quadraticCurveTo(len * 0.55, -10.6, len - 2.5, -0.9); g.stroke();
  g.strokeStyle = shLamp(0.30 * lit); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(12, 9.4); g.quadraticCurveTo(len * 0.5, 8.6, len - 1.5, 1.0); g.stroke();
  g.restore();
  return { tip: [len * s, 0] };
};

/** A fist gripping a handle that runs along +x (the knife is drawn separately, through the fist). */
QHC.handHold = function (g, o = {}) {
  const s = o.s ?? 1, style = o.style || 'rgba(24,16,22,0.94)';
  g.save(); g.scale(s, s);
  QHC.limb(g, [[-96, 26], [-58, 18], [-30, 10]], 62, 54, style);       // wrist into the fist
  g.beginPath();                                                         // the block of the palm
  g.moveTo(-40, -26); g.quadraticCurveTo(6, -34, 34, -20);
  g.quadraticCurveTo(46, -2, 32, 20); g.quadraticCurveTo(0, 34, -38, 24);
  g.closePath(); g.fillStyle = style; g.fill();
  const fingers = [];
  for (let k = 0; k < 4; k++) {                                          // fingers curled round the handle,
    const y = -22 + k * 15.5, curl = 1 + 0.06 * k;                       // spaced wider than they are thick
    const f = [[26, y], [54, y + 3], [64 + 3 * curl, y + 13], [44, y + 19]];
    fingers.push(f); QHC.limb(g, f, 12, 10, style);
  }
  const thumb = [[4, -30], [44, -40], [64, -26]];
  QHC.limb(g, thumb, 14.5, 12, style);                                   // thumb over the front
  if (o.edge) o.edge(g, { fingers, thumb });
  g.restore();
};

/** A hand pressing flat onto the work: arm in from the left, fingers reaching +x and curling down. */
QHC.handPress = function (g, o = {}) {
  const s = o.s ?? 1, curl = o.curl ?? 1, style = o.style || 'rgba(24,16,22,0.94)';
  g.save(); g.scale(s, s);
  QHC.limb(g, [[-150, 8], [-96, 2], [-52, -6]], 92, 70, style);          // forearm
  g.beginPath();                                                         // back of the hand
  g.moveTo(-56, -26); g.quadraticCurveTo(-4, -34, 30, -22);
  g.quadraticCurveTo(46, -8, 34, 14); g.quadraticCurveTo(-4, 30, -54, 22);
  g.closePath(); g.fillStyle = style; g.fill();
  const fingers = [];
  for (let k = 0; k < 4; k++) {                                          // four fingers, fanned, tips down
    const a = -0.30 + k * 0.20, len = 66 - Math.abs(k - 1.5) * 8;
    const bx = 22 + k * 2, by = 6 + k * 3;
    const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len * 0.5 + 16 * curl;
    const f = [[bx, by], [bx + (ex - bx) * 0.55, by + (ey - by) * 0.4], [ex, ey]];
    fingers.push(f); QHC.limb(g, f, 15, 12, style);
  }
  const thumb = [[-26, -18], [16, -30], [40, -12]];
  QHC.limb(g, thumb, 17, 14, style);
  if (o.edge) o.edge(g, { fingers, thumb });
  g.restore();
};

/** A sheet of hide: a soft rectangle with irregular hand-cut edges. */
QHC.hideSheet = function (g, w, h, o = {}) {
  const seed = o.seed ?? 5, wob = o.wob ?? 16, n = 26, pts = [];
  const edge = (x0, y0, x1, y1, salt) => {
    const L = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const d = (fbm1(u * 3.4 + salt, seed, 3) * 0.6 + (hash(i, salt, seed) - 0.5) * 0.7) * wob;
      pts.push([lerp(x0, x1, u) + nx * d, lerp(y0, y1, u) + ny * d]);
    }
  };
  edge(-w / 2, -h / 2, w / 2, -h / 2, 1);
  edge(w / 2, -h / 2, w / 2, h / 2, 2);
  edge(w / 2, h / 2, -w / 2, h / 2, 3);
  edge(-w / 2, h / 2, -w / 2, -h / 2, 4);
  pathPoly(g, pts);                       // one closed path — four moveTo's would fill as four slivers
  return g;
};

/**
 * 折枝牡丹 as one continuous knife line (so the blade can cut it in one go, growing with the song):
 * stem → two leaves → five petals → the bud. Returns {path, parts} in local coordinates, the flower head
 * around (0, -size).
 */
QHC.peony = function (o = {}) {
  const S = o.size ?? 180, seed = o.seed ?? 3;
  const P = [];
  const stem = [];
  for (let i = 0; i <= 22; i++) {
    const u = i / 22;
    stem.push([Math.sin(u * 3.1) * S * 0.10 + (fbm1(u * 2.6, seed, 3)) * S * 0.045, S * 0.55 * (1 - u) - u * S * 0.1]);
  }
  const leaf = (at, sgn, ln) => {
    const [bx, by] = stem[at];
    const out = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, t = u * Math.PI;
      out.push([bx + sgn * (Math.sin(t) * ln * 0.5), by - Math.sin(t * 0.85) * ln * 0.32 + (1 - Math.cos(t)) * ln * 0.1]);
    }
    for (let i = 14; i >= 0; i--) {
      const u = i / 14, t = u * Math.PI;
      out.push([bx + sgn * (Math.sin(t) * ln * 0.5), by - Math.sin(t * 0.85) * ln * 0.32 + (1 - Math.cos(t)) * ln * 0.1 + 5]);
    }
    return out;
  };
  const stemTop = stem[stem.length - 1];
  const petals = [];
  const head = [stemTop[0], stemTop[1] - S * 0.20];
  for (let k = 0; k < 5; k++) {
    const ang = -Math.PI / 2 + (k - 2) * 0.62, r = S * 0.40 * (0.82 + 0.22 * hash(k, seed, 7));
    const cx = head[0], cy = head[1];
    const pet = [];
    for (let i = 0; i <= 18; i++) {                          // from the heart, round the petal
      const u = i / 18, spread = Math.sin(u * Math.PI);
      const rr = r * (0.05 + 0.95 * spread) * (1 + 0.06 * fbm1(u * 2.2 + k, seed + k, 2));
      const a = ang + (u - 0.5) * 0.9;
      pet.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    for (let i = 18; i >= 0; i--) {                          // and back to the heart
      const u = i / 18, spread = Math.sin(u * Math.PI);
      const rr = r * (0.05 + 0.78 * spread);
      const a = ang + (u - 0.5) * 0.9;
      pet.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    petals.push(pet);
  }
  const bud = [[head[0], head[1]]];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14, a = Math.PI * 0.5 + u * 1.5;
    bud.push([head[0] + S * 0.26 + Math.cos(a) * S * 0.15, head[1] - S * 0.24 + Math.sin(a) * S * 0.20]);
  }
  const leaves = [leaf(6, -1, S * 0.55), leaf(13, 1, S * 0.46)];
  // one stroke: up the stem, round the leaves on the way, round the petals, then the bud
  const path = [];
  const push = a => a.forEach(p => path.push(p));
  push(stem.slice(0, 7)); push(leaves[0]); push(stem.slice(7, 14)); push(leaves[1]); push(stem.slice(14));
  petals.forEach(p => push(p));
  push(bud);
  return { path, parts: { stem, leaves, petals, bud, head } };
};

/** A bamboo control rod (签子): slightly tapered, with nodes. */
QHC.rod = function (g, o = {}) {
  const len = o.len ?? 900, w = o.w ?? 9, bend = o.bend ?? 0.04;
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    pts.push([bend * len * Math.sin(u * 1.2), -u * len]);
  }
  QHC.limb(g, pts, w * 1.25, w * 0.8, o.style || 'rgba(20,13,18,0.88)');
  g.save(); g.strokeStyle = 'rgba(255,222,175,0.10)'; g.lineWidth = 1.0;
  for (let i = 1; i < 20; i++) {                                            // nodes catch the light
    const [x, y] = pts[i];
    g.beginPath(); g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); g.stroke();
  }
  g.restore();
  return pts;
};

/** 毛笔：笔尖在原点，笔杆往 −x 伸（和刻刀同一套摆放逻辑）。 */
QHC.brush = function (g, o = {}) {
  const len = o.len ?? 150, s = o.s ?? 1;
  g.save(); g.scale(s, s);
  g.fillStyle = 'rgba(24,16,22,0.94)';
  QHC.limb(g, [[-len, -7], [-len * 0.35, -5], [-14, -3.4]], 15, 12);
  g.beginPath();                                                          // 笔头（圆锥）
  g.moveTo(-16, -8); g.quadraticCurveTo(-2, -6.5, 0, -1.4);
  g.quadraticCurveTo(-2, 6.5, -16, 8); g.closePath(); g.fill();
  g.strokeStyle = shLamp(0.42); g.lineWidth = 1.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-len + 6, -5.6); g.lineTo(-18, -3.4); g.stroke();
  if (o.tip) { g.strokeStyle = o.tip; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-4, -1.2); g.lineTo(0, 0); g.stroke(); }
  g.restore();
};

/** 窗格：一组竖棂 + 横棂，当作灯前的挡板，投在幕布上就是一片格子光。 */
QHC.windowGrid = function (g, o = {}) {
  const w = o.w ?? 900, h = o.h ?? 700, nv = o.nv ?? 5, nh = o.nh ?? 4, bar = o.bar ?? 26;
  g.fillStyle = o.style || 'rgba(20,13,19,0.96)';
  g.fillRect(-w / 2 - bar, -h / 2 - bar, w + bar * 2, bar);               // 上下框
  g.fillRect(-w / 2 - bar, h / 2, w + bar * 2, bar);
  g.fillRect(-w / 2 - bar, -h / 2 - bar, bar, h + bar * 2);               // 左右框
  g.fillRect(w / 2, -h / 2 - bar, bar, h + bar * 2);
  for (let i = 1; i < nv; i++) g.fillRect(-w / 2 + i * (w / nv) - bar / 2, -h / 2, bar, h);
  for (let i = 1; i < nh; i++) g.fillRect(-w / 2, -h / 2 + i * (h / nh) - bar / 2, w, bar);
  return { w, h };
};

/** 香：一根细香 + 一点亮着的头（画在物体层里，不是剪影）。 */
QHC.incense = function (g, x, y, o = {}) {
  const len = o.len ?? 210, s = o.s ?? 1;
  g.save(); g.translate(x, y); g.rotate(o.rot ?? 0); g.scale(s, s);
  g.fillStyle = 'rgba(22,14,20,0.95)';
  g.fillRect(-3, -len, 6, len);
  const gr = g.createRadialGradient(0, -len, 0, 0, -len, 26);
  gr.addColorStop(0, 'rgba(255,226,178,0.85)'); gr.addColorStop(0.35, 'rgba(255,150,80,0.45)');
  gr.addColorStop(1, 'rgba(255,120,60,0)');
  g.fillStyle = gr; g.fillRect(-26, -len - 26, 52, 52);
  g.restore();
};

/** 铜盆：接雨的浅盆（盆沿用两道弧画，水面由场景自己画）。 */
QHC.basin = function (g, o = {}) {
  const r = o.r ?? 260, s = o.s ?? 1, ry = r * 0.28, lit = o.lit ?? 0.30;
  g.save(); g.scale(s, s);
  g.fillStyle = 'rgba(22,15,20,0.95)';
  g.beginPath(); g.ellipse(0, 0, r, ry, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(0, r * 0.95, r, 0); g.quadraticCurveTo(0, ry * 1.4, -r, 0); g.fill();
  g.strokeStyle = shLamp(lit); g.lineWidth = 3.5;
  g.beginPath(); g.ellipse(0, 0, r, ry, 0, 0, TAU); g.stroke();           // 盆沿的反光
  g.restore();
};

/** 幕前站着的女人（背对镜头）：一个整块剪影，直接画在合成的最上层。 */
QHC.figureBack = function (g, o = {}) {
  const H0 = o.h ?? 780, w = H0 * 0.20, style = o.style || 'rgba(14,9,14,0.97)';
  const sway = o.sway ?? 0;
  g.save(); g.translate(o.x ?? 0, o.y ?? 0); g.scale(o.s ?? 1, o.s ?? 1);
  g.fillStyle = style;
  const hd = H0 * 0.075;                                                  // 头
  g.beginPath(); g.ellipse(sway * 6, -H0 + hd * 1.15, hd * 0.86, hd, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(sway * 7, -H0 + hd * 1.9, hd * 0.95, hd * 0.9, 0, 0, TAU); g.fill();   // 低发髻
  g.beginPath();                                                          // 大衣（从肩到下摆，腰收一点）
  g.moveTo(-w * 0.52 + sway * 3, -H0 + hd * 2.6);
  g.quadraticCurveTo(-w * 0.62, -H0 * 0.74, -w * 0.50, -H0 * 0.52);
  g.quadraticCurveTo(-w * 0.80, -H0 * 0.32, -w * 0.86 + sway * 8, -H0 * 0.06);
  g.quadraticCurveTo(-w * 0.6, H0 * 0.02, -w * 0.30, 0); g.lineTo(-w * 0.16, 0);
  g.lineTo(-w * 0.16, -H0 * 0.30); g.lineTo(w * 0.16, -H0 * 0.30); g.lineTo(w * 0.16, 0);
  g.lineTo(w * 0.30, 0); g.quadraticCurveTo(w * 0.6, H0 * 0.02, w * 0.86 + sway * 8, -H0 * 0.06);
  g.quadraticCurveTo(w * 0.80, -H0 * 0.32, w * 0.50, -H0 * 0.52);
  g.quadraticCurveTo(w * 0.62, -H0 * 0.74, w * 0.52 + sway * 3, -H0 + hd * 2.6);
  g.closePath(); g.fill();
  QHC.limb(g, [[-w * 0.46, -H0 * 0.66], [-w * 0.60, -H0 * 0.44], [-w * 0.52, -H0 * 0.30]], w * 0.16, w * 0.13, style);
  QHC.limb(g, [[w * 0.46, -H0 * 0.66], [w * 0.62, -H0 * 0.46], [w * 0.54, -H0 * 0.28]], w * 0.16, w * 0.13, style);
  g.restore();
};
