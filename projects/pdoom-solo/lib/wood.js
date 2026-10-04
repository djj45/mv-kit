// lib/wood.js — 《减版》的版面：木刻 / 麻胶版画的画法 + 歌词的七种出现方式。
// 所有镜头只调用 WD.*，不自己写版面细节。整支片子 = 一块正在被刻掉的版。
//
// 规矩（TREATMENT「画风」）：
//   明暗只有四档：纸(0) → 排线(1) → 交叉排线(2) → 实黑(3)，外加一档残影灰。
//   黑 = 我们；蓝 = 它；红 = 刀口 / 关键词。
//   白不是画上去的，是"刻掉"的：所有 paper 色的线都用 gouge / wipe 画。
(function (G) {
'use strict';
const MV = G.MV;

const WD = {
  ink: '#14110E', paper: '#E9DFC9', red: '#B93327', blue: '#2B4A6E', ghost: '#9E957F', warm: '#4A4038',
  stripTone: '#F4EDDD',
  v: 1,
};

// ---------------------------------------------------------------- 工具
function pathOf(g, P) { g.beginPath(); for (let i = 0; i < P.length; i++) { if (i) g.lineTo(P[i][0], P[i][1]); else g.moveTo(P[i][0], P[i][1]); } }
function closePath(g, P) { pathOf(g, P); g.closePath(); }
function bbox(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[0] > x1) x1 = p[0]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, x1, y1]; }
function mod(a, n) { return ((a % n) + n) % n; }
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
/** 把折线按 step 像素重采样。 */
function resample(pts, step) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    let u = (step - carry) / L;
    while (u <= 1) { out.push([a[0] + dx * u, a[1] + dy * u]); u += step / L; }
    carry = (carry + L) % step;
  }
  const last = pts[pts.length - 1];
  if (Math.hypot(out[out.length - 1][0] - last[0], out[out.length - 1][1] - last[1]) > 1.5) out.push(last);
  return out;
}
/** 闭合多边形的边加噪声抖动（手刻的边不会直）。 */
function jit(pts, amp, seed, seg) {
  const n = pts.length, out = [], S = seg || 58;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, k = Math.max(1, Math.round(L / S));
    for (let j = 0; j < k; j++) {
      const u = j / k, q = i * 7.3 + u * 3.1 + seed * 0.37;
      const w = noise1(q, seed) * amp + noise1(q * 3.7, seed + 9) * amp * 0.35;
      out.push([a[0] + dx * u + nx * w, a[1] + dy * u + ny * w]);
    }
  }
  return out;
}
function boil(f, k, amp) { return noise1(f.tq * 13.7 + k * 5.1, 31) * amp; }

// ---------------------------------------------------------------- 贴图（init 里做一次）
WD.init = function () {
  if (WD.tex) return;
  // 棉纸纤维：极淡的深浅点
  const fb = mk(512, 512), fg = fb.getContext('2d'), R = mulberry32(4242);
  for (let i = 0; i < 5200; i++) {
    const x = R() * 512, y = R() * 512, a = 0.05 + R() * 0.13;
    fg.fillStyle = R() < 0.55 ? 'rgba(96,78,54,' + a.toFixed(3) + ')' : 'rgba(255,253,244,' + (a * 0.9).toFixed(3) + ')';
    const w = R() < 0.25 ? 3 : 1;
    fg.fillRect(x, y, w, R() < 0.4 ? 2 : 1);
  }
  // 长纤维
  fg.strokeStyle = 'rgba(110,92,64,0.05)'; fg.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = R() * 512, y = R() * 512, a = R() * Math.PI;
    fg.beginPath(); fg.moveTo(x, y); fg.lineTo(x + Math.cos(a) * (10 + R() * 40), y + Math.sin(a) * (10 + R() * 40)); fg.stroke();
  }
  // 缺墨孔：实黑里的小白点（印墨没吃进去的地方）
  const hb = mk(256, 256), hg = hb.getContext('2d'), H2 = mulberry32(777);
  for (let i = 0; i < 130; i++) {
    const x = H2() * 256, y = H2() * 256, r = 0.9 + H2() * 2.1, a = 0.32 + H2() * 0.5;
    hg.fillStyle = 'rgba(233,223,201,' + a.toFixed(3) + ')';
    hg.beginPath(); hg.arc(x, y, r, 0, Math.PI * 2); hg.fill();
  }
  WD.tex = { fiber: fb, hole: hb };
};

// ---------------------------------------------------------------- 纸 / 地子
/** 纸底：棉纸 + 木纹（木纹按世界坐标 ox / oy 钉住，镜头平移时不游）。 */
WD.ground = function (g, f, o) {
  o = o || {};
  g.save();
  g.fillStyle = o.tone || WD.paper; g.fillRect(0, 0, W, H);
  const ox = o.ox || 0, oy = o.oy || 0;
  if (o.wood !== false) {
    g.strokeStyle = o.grainColor || WD.ghost;
    g.globalAlpha = (o.grain == null ? 0.12 : o.grain);
    g.lineWidth = 1.3;
    const gap = o.grainGap || 46, n = Math.ceil(H / gap) + 4;
    for (let i = -2; i < n; i++) {
      const y0 = i * gap + mod(oy, gap);
      g.beginPath();
      for (let x = 0; x <= W + 48; x += 48) {
        const y = y0 + noise1((x + ox) * 0.0026 + i * 3.7, 5) * 15 + noise1((x + ox) * 0.013 + i * 1.3, 6) * 4;
        if (x) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
  }
  if (WD.tex && o.fiber !== 0) {
    const p = g.createPattern(WD.tex.fiber, 'repeat');
    g.globalAlpha = (o.fiber == null ? 1 : o.fiber);
    g.fillStyle = p;
    g.save(); g.translate(-mod(ox, 512), -mod(oy, 512)); g.fillRect(0, 0, W + 512, H + 512); g.restore();
  }
  g.restore();
};

/** 实黑：闭合多边形 + 抖动边 + 可选排线 + 缺墨孔。返回画出来的多边形。 */
WD.carve = function (g, f, pts, o) {
  o = o || {};
  const seed = o.seed == null ? 3.7 : o.seed;
  const P = o.jit === 0 ? pts : jit(pts, o.jit == null ? 2.6 : o.jit, seed, o.seg);
  const col = o.color || WD.ink;
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  closePath(g, P);
  g.fillStyle = col; g.fill();
  if (o.hatch) { g.save(); closePath(g, P); g.clip(); WD.hatch(g, f, P, o.hatch, seed); g.restore(); }
  if (o.holes !== false && col === WD.ink && WD.tex) { g.save(); WD.holes(g, f, o.ox || 0, o.oy || 0, o.holeA == null ? 0.55 : o.holeA, o.holes === 'hard'); g.restore(); }
  g.restore();
  return P;
};
/** 一块干净的实黑（不放缺墨孔）：刻歌词的黑条、牌子。 */
WD.inkBar = function (g, f, x, y, w, h, o) {
  o = o || {};
  return WD.carve(g, f, rectPts(x, y, w, h), Object.assign({ jit: 1.7, holes: false, seg: 40 }, o));
};
/** 缺墨孔贴图。 */
WD.holes = function (g, f, ox, oy, a, hard) {
  if (!WD.tex) return;
  const p = g.createPattern(WD.tex.hole, 'repeat');
  const mx = mod(ox, 256), my = mod(oy, 256);
  g.save();
  if (hard) g.globalCompositeOperation = 'destination-out';
  g.globalAlpha *= (a == null ? 0.55 : a);
  g.fillStyle = p;
  g.translate(-mx, -my);
  g.fillRect(mx - 256, my - 256, W + 512, H + 512);
  g.restore();
};
/** 排线（中间调）：一组平行黑线。调用方负责 clip。 */
WD.hatch = function (g, f, poly, o, seed) {
  o = o || {};
  seed = seed == null ? 1.3 : seed;
  const ang = o.ang == null ? -0.20 : o.ang, gap = o.gap || 12, lw = o.lw || 3.6, col = o.color || WD.ink;
  const bb = bbox(poly), dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  if (o.clip !== false) { g.save(); closePath(g, poly); g.clip(); }
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  const R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) * 0.62 + gap;
  const n = Math.ceil(2 * R / gap);
  g.save();
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'butt';
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  g.beginPath();
  for (let i = -n; i <= n; i++) {
    const w0 = noise1(i * 1.7 + seed * 3.1, seed | 0) * (o.wob == null ? 2.6 : o.wob);
    const px = cx + nx * i * gap, py = cy + ny * i * gap;
    g.moveTo(px - dx * R + nx * w0, py - dy * R + ny * w0);
    g.lineTo(px + dx * R + nx * w0, py + dy * R + ny * w0);
  }
  g.stroke();
  g.restore();
  if (o.clip !== false) g.restore();
};
/** 四档明暗一次画完：0 纸（什么都不画）| 1 排线 | 2 交叉排线 | 3 实黑。 */
WD.tone = function (g, f, poly, level, o) {
  o = o || {};
  if (level <= 0) return;
  if (level === 1) return WD.hatch(g, f, poly, o, o.seed);
  if (level === 2) return WD.crosshatch(g, f, poly, o, o.seed);
  return WD.carve(g, f, poly, o);
};
/** 一排一排一模一样的小人（母题里的"我们"）。返回每个小人的站位。 */
WD.crowd = function (g, f, x0, y0, cols, rows, dx, dy, h, o) {
  o = o || {};
  const out = [];
  for (let r2 = 0; r2 < rows; r2++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * dx + (r2 % 2) * dx * 0.5, y = y0 + r2 * dy;
    out.push(WD.figure(g, f, x, y, h * (o.shrink ? Math.pow(o.shrink, r2) : 1), o));
  }
  return out;
};
/** 交叉排线（最暗的一档中间调）。 */
WD.crosshatch = function (g, f, poly, o, seed) {
  o = o || {};
  WD.hatch(g, f, poly, Object.assign({}, o, { ang: o.ang == null ? -0.20 : o.ang }), seed);
  WD.hatch(g, f, poly, Object.assign({}, o, { ang: (o.ang == null ? -0.20 : o.ang) + 1.15, gap: (o.gap || 12) * 1.35 }), (seed || 1) + 4.4);
};

/** 刀口：两头尖的一条"刻掉的白"。pts 折线，w 最宽处像素。 */
WD.gouge = function (g, f, pts, w, o) {
  o = o || {};
  const seed = o.seed == null ? 5.1 : o.seed;
  const P = resample(pts, o.step || 8);
  if (P.length < 2) return;
  const A = [], B = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const u = i / (P.length - 1);
    const tp = o.taper ? o.taper(u) : Math.pow(Math.sin(Math.PI * u), o.pw == null ? 0.5 : o.pw);
    const hw = w * 0.5 * tp * (1 + 0.16 * noise1(u * 8.3 + seed * 2.7, seed | 0));
    const j1 = noise1(u * 26 + seed, (seed | 0) + 2) * (o.rough == null ? 0.9 : o.rough);
    const j2 = noise1(u * 24 + seed + 3, (seed | 0) + 5) * (o.rough == null ? 0.9 : o.rough);
    A.push([P[i][0] - dy * hw + j1, P[i][1] + dx * hw + j2]);
    B.push([P[i][0] + dy * hw + j2, P[i][1] - dx * hw + j1]);
  }
  const poly = A.concat(B.reverse());
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  closePath(g, poly);
  g.fillStyle = o.color || WD.paper; g.fill();
  g.restore();
  return poly;
};
/** 轮廓线：一条粗细有变化的墨线（纸上的勾线）。 */
WD.contour = function (g, f, pts, w, o) {
  o = o || {};
  const seed = o.seed == null ? 2.3 : o.seed;
  const P = resample(pts, o.step || 9);
  if (P.length < 2) return;
  g.save();
  g.strokeStyle = o.color || WD.ink; g.lineCap = 'round'; g.lineJoin = 'round';
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  for (let i = 0; i < P.length - 1; i++) {
    const u = i / Math.max(1, P.length - 2);
    const k = o.prof ? o.prof(u) : (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.02)));
    g.lineWidth = Math.max(0.6, w * k * (1 + 0.2 * noise1(u * 7.7 + seed, seed | 0)));
    const j1 = noise1(u * 31 + seed, (seed | 0) + 1) * (o.boil == null ? 1.1 : o.boil) + boil(f, i * 0.7 + seed, 0.7);
    const j2 = noise1(u * 29 + seed + 5, (seed | 0) + 2) * (o.boil == null ? 1.1 : o.boil) + boil(f, i * 0.9 + seed + 4, 0.7);
    g.beginPath();
    g.moveTo(P[i][0] + j1, P[i][1] + j2);
    g.lineTo(P[i + 1][0] + j1, P[i + 1][1] + j2);
    g.stroke();
  }
  g.restore();
};
/** 刻掉一块：把多边形里的墨"铲"成纸色（带毛边）。 */
WD.wipe = function (g, f, pts, o) {
  o = o || {};
  const P = jit(pts, o.jit == null ? 2.2 : o.jit, o.seed == null ? 8.3 : o.seed, o.seg);
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  closePath(g, P);
  g.fillStyle = o.color || WD.paper; g.fill();
  g.restore();
  return P;
};
/** 对版十字线。 */
WD.cross = function (g, f, x, y, r, o) {
  o = o || {};
  const c = o.color || WD.ink;
  g.save();
  g.strokeStyle = c; g.lineWidth = o.lw || 2; g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
  g.beginPath(); g.arc(x, y, r * 0.44, 0, Math.PI * 2); g.stroke();
  g.restore();
};

// ---------------------------------------------------------------- 主角小人
/** 木刻小人：一根脊柱 + 两条腿 + 一双手，脸是一块留白。x,y = 脚底中点，h = 身高。 */
WD.figure = function (g, f, x, y, h, o) {
  o = o || {};
  const s = h / 100;
  const p = o.pose || {};
  const lean = p.lean || 0, crouch = p.crouch || 0;
  const col = o.color || WD.ink;
  const hipY = y - (43 - crouch * 16) * s, shoY = y - (72 - crouch * 14) * s;
  const hY = y - (87 - crouch * 14) * s, hX = x + lean * 9 * s, hR = 12.5 * s;
  const jx = k => boil(f, k + x * 0.07, 1.5 * s);
  const hipX = x + lean * 3 * s;
  g.save();
  g.lineCap = 'round'; g.lineJoin = 'round';
  // 腿
  const lw1 = 3.4 * s;
  for (const sgn of [-1, 1]) {
    const fx = x + sgn * (7 + (p.leg || 0) * 9) * s, fy = y + ((p.leg || 0) * sgn * 4) * s;
    WD.contour(g, f, [[hipX + sgn * 2 * s, hipY], [hipX + sgn * 4 * s, (hipY + fy) / 2 + jx(sgn)], [fx, fy]], 4.6 * s * (o.lw || 1), { color: col, seed: 11 + sgn, boil: 1.2 * s, prof: () => 1 });
    g.strokeStyle = col; g.lineWidth = lw1;
  }
  // 躯干：一块实黑；o.outline 时只留一圈轮廓（版被刻空了）
  const torso = [[hipX - 8 * s, hipY + 3 * s], [hipX + 8 * s, hipY + 3 * s], [hX + 9.5 * s, shoY], [hX - 9.5 * s, shoY]];
  if (o.outline) WD.contour(g, f, torso.concat([torso[0]]), 3.2 * s * (o.lw || 1), { color: col, seed: 21, boil: 1.0 * s, prof: () => 1 });
  else WD.carve(g, f, torso, { color: col, jit: 0.9 * s, holes: false, seed: 21, seg: 30 });
  // 胳膊
  // arms: [[上臂角, 前臂角], [上臂角, 前臂角]]，角从"手臂平伸"算起：0 = 平伸，1.4 ≈ 垂下，-1.3 ≈ 举起
  const arms = p.arms || [[1.30, 1.45], [1.30, 1.45]];
  const hands = [];
  for (let i = 0; i < 2; i++) {
    const sgn = i ? 1 : -1;
    const a0 = arms[i][0], a1 = arms[i][1];
    const ex = hX + Math.cos(a0) * 22 * s * sgn, ey = shoY + Math.sin(a0) * 22 * s;
    const wx = ex + Math.cos(a1) * 20 * s * sgn, wy = ey + Math.sin(a1) * 20 * s;
    WD.contour(g, f, [[hX + sgn * 7 * s, shoY + 2 * s], [ex, ey], [wx, wy]], 4.2 * s * (o.lw || 1), { color: col, seed: 31 + i * 3, boil: 1.1 * s, prof: () => 1 });
    hands.push([wx, wy]);
  }
  // 头：轮廓 + 留白的脸
  g.save();
  g.beginPath(); g.arc(hX + jx(9), hY, hR, 0, Math.PI * 2);
  g.fillStyle = o.face === false ? col : WD.paper; g.fill();
  g.restore();
  WD.contour(g, f, circlePts(hX, hY, hR, 14), 3.6 * s * (o.lw || 1), { color: col, seed: 41, boil: 1.0 * s, prof: () => 1 });
  // 脖子
  WD.contour(g, f, [[hX, hY + hR * 0.85], [hX + lean * 3 * s, shoY]], 3.4 * s * (o.lw || 1), { color: col, seed: 44, boil: 0.8 * s, prof: () => 1 });
  g.restore();
  return { head: [hX, hY], hand: hands[1], handL: hands[0], hip: [hipX, hipY], top: [hX, hY - hR] };
};
function circlePts(x, y, r, n) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return o; }
WD.circlePts = circlePts;

/** 一只手（刻出来的）。x,y = 手腕，h = 手长，ang = 朝向。 */
WD.hand = function (g, f, x, y, h, ang, o) {
  o = o || {};
  const col = o.color || WD.ink, s = h / 60;
  g.save(); g.translate(x, y); g.rotate(ang);
  const palm = [[-4 * s, 0], [6 * s, -10 * s], [30 * s, -12 * s], [44 * s, -4 * s], [46 * s, 8 * s], [30 * s, 15 * s], [6 * s, 12 * s], [-4 * s, 6 * s]];
  WD.carve(g, f, palm, { color: col, jit: 1.2 * s, holes: false, seed: o.seed || 61, seg: 22 });
  for (let i = 0; i < 4; i++) {
    const a = -0.36 + i * 0.26 + (o.curl || 0) * (i - 1.5) * 0.12;
    const bx = 30 * s, by = (-9 + i * 7.4) * s;
    const len = (i === 0 ? 22 : i === 3 ? 18 : 26) * s * (o.curl ? 0.82 : 1);
    WD.contour(g, f, [[bx, by], [bx + Math.cos(a) * len * 0.6, by + Math.sin(a) * len * 0.6], [bx + Math.cos(a) * len, by + Math.sin(a) * len + (o.curl || 0) * 12 * s]], 5.2 * s, { color: col, seed: 70 + i, boil: 1.1 * s, prof: () => 1 });
  }
  // 拇指（从掌的左下角长出来，别飘在外面）
  WD.contour(g, f, [[2 * s, 8 * s], [-10 * s, -4 * s], [-2 * s, -18 * s]], 6.0 * s, { color: col, seed: 79, boil: 1.1 * s, prof: () => 1 });
  g.restore();
  return [x + Math.cos(ang) * 44 * s, y + Math.sin(ang) * 44 * s];
};

/** V 形刻刀：x,y = 刀尖，len = 全长，ang = 刀身方向。 */
WD.blade = function (g, f, x, y, len, ang, o) {
  o = o || {};
  g.save(); g.translate(x, y); g.rotate(ang);
  const s = len / 160;
  // 两条刀刃：从刀尖向后张开的 V
  WD.carve(g, f, [[0, 0], [86 * s, -26 * s], [78 * s, -40 * s], [-4 * s, -13 * s]], { color: WD.ink, jit: 0.8 * s, holes: false, seed: o.seed || 91, seg: 26 });
  WD.carve(g, f, [[0, 0], [86 * s, 26 * s], [78 * s, 40 * s], [-4 * s, 13 * s]], { color: WD.ink, jit: 0.8 * s, holes: false, seed: (o.seed || 91) + 3, seg: 26 });
  // 刀口（红版）：两道刀锋的内缘
  WD.gouge(g, f, [[3 * s, 0], [82 * s, -25 * s]], 5.2 * s, { color: WD.red, seed: 93, pw: 0.3 });
  WD.gouge(g, f, [[3 * s, 0], [82 * s, 25 * s]], 5.2 * s, { color: WD.red, seed: 95, pw: 0.3 });
  // 刀杆 + 刀柄
  WD.carve(g, f, rectPts(-70 * s, -15 * s, 96 * s, 30 * s), { color: WD.ink, jit: 1.0 * s, holes: false, seed: 97, seg: 26 });
  WD.carve(g, f, WD.circlePts(-84 * s, 0, 26 * s, 14), { color: WD.ink, jit: 1.2 * s, holes: false, seed: 99, seg: 22 });
  g.restore();
};

// ---------------------------------------------------------------- 字体（三档）
WD.F = {
  ly(g, size, o) {                       // 歌词主档：slab serif
    g.font = '700 ' + size.toFixed(1) + 'px "Superclarendon", "Rockwell", "American Typewriter", Georgia, serif';
    g.letterSpacing = ((o && o.track) || 0) * size + 'px';
  },
  lbl(g, size, o) {                      // 版边标注：等宽
    g.font = '500 ' + size.toFixed(1) + 'px Menlo, "DejaVu Sans Mono", monospace';
    g.letterSpacing = ((o && o.track) == null ? 0.06 : o.track) * size + 'px';
  },
  big(g, size, o) {                      // 巨型词
    g.font = '400 ' + size.toFixed(1) + 'px Impact, "Arial Black", "Helvetica Neue", sans-serif';
    g.letterSpacing = ((o && o.track) || 0) * size + 'px';
  },
};

// ---------------------------------------------------------------- 歌词
/**
 * WD.lyric(g, f, o) — 这一镜该显示的那一句（lyrics.lineAt(f.t, f.from)：切点前唱完的句子不带进来）。
 * 屏幕层用法：MV.overlay(o => WD.lyric(o, f, {...}))。
 * o:
 *   x, y            基线锚点（y = 基线）
 *   align           'left' | 'center' | 'right'
 *   size            想要的字号（会被 maxW 缩到放得下）
 *   maxW            最宽（默认 W - 280）
 *   font            'ly' | 'lbl' | 'big'
 *   mode            'carve' 刻在黑里 | 'ink' 纸上的黑字 | 'strip' 纸带 | 'mono' 巨字
 *                   | 'type' 活字落下 | 'label' 小标注 | 'erased' 只剩最后一个词
 *   color / dim / hi  唱到的字 / 没唱到的字 / 正在唱的那个字
 *   hot             [i0, i1) 这些词永远用 hi 色（关键词走红版）
 *   band            是否给字垫一条底（默认 carve / strip 有）
 *   bandColor / bandPad
 *   keep            是否报 MV.keep（默认 true；屏幕层里自动无效）
 *   drop            type 模式的落下高度
 *   seg             把这个词按字符切开时用（不需要）
 * 返回 { line, size, x, w, asc, desc } 或 null。
 */
WD.lyric = function (g, f, o) {
  o = o || {};
  const L = f.lyrics.lineAt(f.t, f.from);
  if (!L) return null;
  let toks = f.lyrics.tokens(L);
  if (!toks.length) return null;
  // o.words = [i0, i1)：只画这一句里的这几个词（纯排版镜头要把三个词分三档字号摆在三处）
  const wFrom = o.words ? clamp(o.words[0] | 0, 0, toks.length) : 0;
  const wTo = o.words ? clamp(o.words[1] == null ? toks.length : o.words[1] | 0, wFrom, toks.length) : toks.length;
  if (wTo <= wFrom) return null;
  toks = toks.slice(wFrom, wTo);
  const mode = o.mode || 'carve';
  const fontName = o.font || (mode === 'mono' ? 'big' : mode === 'label' ? 'lbl' : 'ly');
  const setF = WD.F[fontName];
  const maxW = o.maxW == null ? W - 2 * 140 : o.maxW;
  const size0 = o.size || 96;
  const track = o.track;

  setF(g, size0, o);
  const sp0 = g.measureText(' ').width;
  let ws = toks.map(t => g.measureText(t.text).width);
  let total = ws.reduce((a, b) => a + b, 0) + sp0 * (toks.length - 1);
  let size = size0, sp = sp0;
  if (total > maxW && total > 0) {
    size = Math.max(8, size0 * maxW / total * 0.995);
    setF(g, size, o);
    sp = g.measureText(' ').width;
    ws = toks.map(t => g.measureText(t.text).width);
    total = ws.reduce((a, b) => a + b, 0) + sp * (toks.length - 1);
  }
  let asc = 0, desc = 0;
  for (const tk of toks) { const m = g.measureText(tk.text); asc = Math.max(asc, m.actualBoundingBoxAscent); desc = Math.max(desc, m.actualBoundingBoxDescent); }
  const x0 = o.align === 'center' ? o.x - total / 2 : o.align === 'right' ? o.x - total : o.x;
  const y = o.y;

  // erased：唱到最后一个词时，前面的词被刻掉（不再 fillText，画几道刀口）
  let cut = -1;
  if (mode === 'erased') {
    const last = toks[toks.length - 1];
    const k = prog(f.t, last.start, last.start + 0.34, ease.outCubic);
    cut = k <= 0 ? -1 : Math.floor(k * toks.length + 1e-6);
  }
  const alive = i => cut < 0 || i >= cut;

  // 垫底
  const bandPad = o.bandPad == null ? size * 0.36 : o.bandPad;
  const wantBand = o.band != null ? o.band : (mode === 'carve' || mode === 'strip' || mode === 'erased');
  const stripBand = mode === 'strip' && !o.bandColor ? WD.stripTone : null;
  if (wantBand) {
    const bx = x0 - bandPad - 8, by = y - asc - bandPad, bw = total + 2 * bandPad + 16, bh = asc + desc + 2 * bandPad;
    const bc = o.bandColor || stripBand || WD.ink;
    if (bc === WD.paper || bc === WD.stripTone) {
      g.save();
      WD.wipe(g, f, rectPts(bx, by, bw, bh), { seed: 13.1, jit: 1.6, seg: 40, color: bc });
      g.strokeStyle = WD.ink; g.lineWidth = 2.4; g.globalAlpha *= 0.85;
      g.beginPath(); g.moveTo(bx + 4, by + 2); g.lineTo(bx + bw - 4, by + 2); g.moveTo(bx + 4, by + bh - 2); g.lineTo(bx + bw - 4, by + bh - 2); g.stroke();
      if (o.ticks !== false) { g.fillStyle = WD.red; g.fillRect(bx - 2, by + 6, 7, bh - 12); }
      g.restore();
    } else {
      WD.inkBar(g, f, bx, by, bw, bh, { seed: 13.1, color: bc });
    }
  }
  if (o.keep !== false) MV.keep(g, x0 - 8, y - asc - 8, total + 16, asc + desc + 16);

  // 字
  const col = o.color || (mode === 'strip' || mode === 'ink' ? WD.ink : WD.paper);
  const dim = o.dim || (col === WD.ink ? WD.ghost : WD.warm);
  const hotCol = o.hi || WD.red;          // 关键词（唱到时才变红，不抢跑）
  const actCol = o.active || col;         // 正在唱的那个词
  g.save();
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  setF(g, size, o);
  let x = x0;
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    const hot = o.hot && (i + wFrom) >= o.hot[0] && (i + wFrom) < o.hot[1];
    if (alive(i)) {
      const sung = f.t >= tk.start - 1e-6;
      const active = sung && f.t < tk.end;
      const cc = !sung ? dim : (hot ? hotCol : active ? actCol : col);
      // 词首的标点（“、'、( …）单独画一次：像素完全一样，但 qa 逐词量字形时不会被标点带偏
      const LEAD = /^[^\p{L}\p{N}]+/u.exec(tk.text);
      const lead = LEAD ? LEAD[0] : '';
      const body = lead ? tk.text.slice(lead.length) : tk.text;
      if (mode === 'type') {
        const k = prog(f.t, tk.start, tk.start + 0.18, ease.outCubic);
        if (k > 0) {
          g.globalAlpha = (o.alpha == null ? 1 : o.alpha);
          g.fillStyle = cc;
          if (lead) g.fillText(lead, x, y - (1 - k) * (o.drop || 44));
          g.fillText(body, x + (lead ? g.measureText(lead).width : 0), y - (1 - k) * (o.drop || 44));
        }
      } else if (mode === 'label' || mode === 'ink' || mode === 'mono') {
        g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (sung ? 1 : (o.pre == null ? 0.85 : o.pre));
        g.fillStyle = cc;
        if (lead) g.fillText(lead, x, y);
        g.fillText(body, x + (lead ? g.measureText(lead).width : 0), y);
      } else {
        g.globalAlpha = (o.alpha == null ? 1 : o.alpha);
        g.fillStyle = cc;
        if (lead) g.fillText(lead, x, y);
        g.fillText(body, x + (lead ? g.measureText(lead).width : 0), y);
        if (o.underline && active) { g.fillRect(x, y + desc * 0.55, ws[i], Math.max(2, size * 0.045)); }
      }
    }
    x += ws[i] + sp;
  }
  g.restore();
  // 刻掉的痕迹
  if (cut > 0) {
    let cx = x0;
    for (let i = 0; i < cut && i < toks.length; i++) {
      const kk = clamp(prog(f.t, toks[toks.length - 1].start, toks[toks.length - 1].start + 0.34) * toks.length - i, 0, 1);
      if (kk > 0.02) {
        g.save(); g.globalAlpha *= kk;
        const yy = y - asc * 0.5;
        WD.gouge(g, f, [[cx - 6, yy - asc * 0.18], [cx + ws[i] * 0.5, yy + asc * 0.22], [cx + ws[i] + 6, yy - asc * 0.05]], size * 0.17, { color: o.scratchColor || WD.paper, seed: 200 + i });
        g.restore();
      }
      cx += ws[i] + sp;
    }
  }
  return { line: L, size, x: x0, w: total, y, asc, desc, toks };
};

// 场景层画的歌词底条也要让 qa 认出来是"歌词"，不是画：整个包进 MV.lyric（屏幕层不用）
(function () { const draw = WD.lyric; WD.lyric = function (g, f, o) { return MV.lyric(function () { return draw(g, f, o); }); }; })();

G.WD = WD;
MV.onInit(function () { WD.init(); });   // 贴图（纸纤维、缺墨孔）只做一次
})(window);