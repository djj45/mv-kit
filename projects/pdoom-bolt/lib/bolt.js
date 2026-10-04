// bolt.js — 电弧 / 雷。全片唯一允许抖动的东西（因为电本来就抖）。
//
// 所有形状都由 hash(i, seed, tick) 决定，tick 传 f.tick（一拍二），所以电弧在一拍二上换形，
// 但任何一帧都只由 f.t 决定。VOID 里画进 lmGlow()（会被泛光），PLATE 里只画芯线（图纸不发光）。
(function (G) {
'use strict';
const LK = G.LK;

/** 中点位移法：两点之间一条分叉的折线。o: {tick, seed, jag(0..1), depth, drift} */
function pathBetween(a, b, o) {
  o = o || {};
  const tick = o.tick || 0, seed = o.seed || 1, depth = o.depth == null ? 5 : o.depth;
  const jag = o.jag == null ? 0.24 : o.jag;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  let pts = [a.slice(), b.slice()];
  for (let d = 0; d < depth; d++) {
    const out = [pts[0]];
    const amp = L * jag * Math.pow(0.55, d);
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const k = (hash(i, d * 31 + seed, tick) - 0.5) * 2;
      const along = (hash(i, d * 17 + seed + 5, tick) - 0.5) * L * 0.12 * Math.pow(0.5, d);
      const ux = dx / L, uy = dy / L;
      out.push([mid[0] + nx * amp * k + ux * along, mid[1] + ny * amp * k + uy * along]);
      out.push(q);
    }
    pts = out;
  }
  // 沿路轻微"漂移"，让电弧像在爬
  const dr = o.drift || 0;
  if (dr) for (let i = 1; i < pts.length - 1; i++) {
    pts[i][0] += (hash(i, seed, tick + 91) - 0.5) * dr;
    pts[i][1] += (hash(i, seed, tick + 17) - 0.5) * dr;
  }
  return pts;
}

/** 3D 两点之间的电弧（VOID 用，喂 lmLines）。返回折线 [[x,y,z]…]。 */
function arc3(a, b, o) {
  o = o || {};
  const p = pathBetween([a[0], a[1]], [b[0], b[1]], o);
  const n = p.length;
  return p.map((q, i) => {
    const u = i / (n - 1);
    return [q[0], q[1], a[2] + (b[2] - a[2]) * u + (hash(i, o.seed || 1, o.tick || 0) - 0.5) * (o.dz || 0)];
  });
}
/** 3D 折线 → lmLines 的线段缓冲。 */
function segs(pts3, o) {
  o = o || {};
  const out = [], b = o.bright == null ? 1 : o.bright;
  for (let i = 0; i < pts3.length - 1; i++) {
    out.push(pts3[i][0], pts3[i][1], pts3[i][2], pts3[i + 1][0], pts3[i + 1][1], pts3[i + 1][2], b, i === pts3.length - 2 ? 2 : 0);
  }
  return new Float32Array(out);
}
/** 从一条主干上分出的支叉（电弧的细枝）。 */
function branches(pts, n, o) {
  o = o || {};
  const out = [], tick = o.tick || 0, seed = o.seed || 3;
  for (let k = 0; k < n; k++) {
    const u = 0.15 + 0.75 * ((k + 0.5) / n);
    const i = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
    const p = pts[i], q = pts[i + 1];
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]) + (hash(k, seed, tick) < 0.5 ? 1 : -1) * (0.5 + hash(k, seed + 9, tick) * 0.9);
    const L = (o.len == null ? 90 : o.len) * (0.4 + hash(k, seed + 3, tick) * 0.9);
    const e = [p[0] + Math.cos(ang) * L, p[1] + Math.sin(ang) * L];
    out.push(pathBetween(p, e, { tick, seed: seed + k * 13, jag: 0.3, depth: 3 }));
  }
  return out;
}

/** 径向光：把 ctx 画成"中心亮、边缘透明"。VOID 用（PLATE 禁止）。 */
function radial(g, x, y, r, color, a, o) {
  o = o || {};
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, LK.a(color, a));
  gr.addColorStop(o.core == null ? 0.18 : o.core, LK.a(color, a * 0.55));
  gr.addColorStop(1, LK.a(color, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
/** 一条电弧画进 Canvas 2D。o: {w, core, glow, color, additive, halo:false 画硬边（PLATE 用，不发光）}  */
function draw(g, pts, o) {
  o = o || {};
  const w = o.w == null ? 3 : o.w, col = o.color || LK.blue, coreCol = o.core || LK.hot;
  const path = () => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); };
  g.save();
  if (o.additive !== false) g.globalCompositeOperation = 'lighter';
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (o.halo === false) {                        // 纸上的电：只有硬边（图纸不发光）
    g.strokeStyle = LK.a(col, 0.95); g.lineWidth = w * 1.5; path();
    g.strokeStyle = LK.a(coreCol, 0.9); g.lineWidth = w * 0.5; path();
    g.restore();
    return;
  }
  for (let k = 3; k >= 1; k--) {                 // 外层晕（3 层递减）
    g.strokeStyle = LK.a(col, 0.055 * k * (o.gain == null ? 1 : o.gain));
    g.lineWidth = w * (2.2 + k * 2.6);
    path();
  }
  g.strokeStyle = LK.a(col, 0.85); g.lineWidth = w * 1.1; path();
  g.strokeStyle = LK.a(coreCol, 0.95); g.lineWidth = w * 0.42; path();
  g.restore();
}
/** 一整道闪电（主干 + 支叉）。 */
function strike(g, a, b, o) {
  o = o || {};
  const tick = o.tick || 0, seed = o.seed || 1;
  const main = pathBetween(a, b, { tick, seed, jag: o.jag == null ? 0.22 : o.jag, depth: o.depth == null ? 5 : o.depth });
  if (o.branch !== 0) for (const br of branches(main, o.branch == null ? 3 : o.branch, { tick, seed, len: o.branchLen })) draw(g, br, Object.assign({}, o, { w: (o.w || 3) * 0.45, gain: 0.6 }));
  draw(g, main, o);
  return main;
}
/** 冲击环：一圈扩散的细环（踩点用）。k 0..1。 */
function ring(g, cx, cy, k, o) {
  o = o || {};
  const r = (o.r0 == null ? 20 : o.r0) + (o.r1 == null ? 600 : o.r1) * k;
  const a = (1 - k) * (o.a == null ? 0.8 : o.a);
  g.save(); g.globalCompositeOperation = 'lighter';
  g.strokeStyle = LK.a(o.color || LK.blue, a); g.lineWidth = (o.w == null ? 3 : o.w) * (1 - k * 0.7);
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
  g.strokeStyle = LK.a(o.core || LK.hot, a * 0.7); g.lineWidth = 1.1;
  g.beginPath(); g.arc(cx, cy, r * 0.985, 0, TAU); g.stroke();
  g.restore();
}
/** 火花：n 个点从中心飞出（确定性的，位置 = 时间的函数）。 */
function sparks(g, cx, cy, n, t, o) {
  o = o || {};
  const life = o.life == null ? 0.7 : o.life, sp = o.speed == null ? 620 : o.speed, seed = o.seed || 5;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const born = o.at == null ? 0 : o.at;
    const age = (t - born) - hash(i, seed, 1) * 0.25;
    if (age < 0 || age > life) continue;
    const k = age / life;
    const ang = hash(i, seed, 2) * TAU, v = sp * (0.35 + hash(i, seed, 3) * 0.9);
    const x = cx + Math.cos(ang) * v * age, y = cy + Math.sin(ang) * v * age + 260 * age * age;
    const a = (1 - k) * (o.alpha == null ? 0.9 : o.alpha);
    g.fillStyle = LK.a(i % 3 ? (o.color || LK.blue) : LK.hot, a);
    const r = (o.size == null ? 2.2 : o.size) * (1 - k * 0.6);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.restore();
}
/** 等离子核心：白热核 + 蓝晕 + 一点色差。VOID 的爆点用。 */
function plasma(g, cx, cy, r, t, o) {
  o = o || {};
  const pulse = 1 + 0.06 * Math.sin(t * 9.3) + 0.04 * Math.sin(t * 21.7);
  const R = r * pulse;
  g.save(); g.globalCompositeOperation = 'lighter';
  radial(g, cx, cy, R * 3.4, o.color || LK.blue, o.alpha == null ? 0.5 : o.alpha, { core: 0.12 });
  radial(g, cx, cy, R * 1.7, LK.ice, 0.55);
  radial(g, cx, cy, R * 0.9, o.core || '#FFFFFF', 0.95, { core: 0.3 });
  g.restore();
}

const BOLT = { pathBetween, arc3, segs, branches, draw, strike, ring, sparks, plasma, radial };
G.BOLT = BOLT;
})(window);
