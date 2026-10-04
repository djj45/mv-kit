// solid.js — 三角/多边网格 → 轴测或透视投影 → 平色实体 + 隐藏虚线 + 剖面线（纯 Canvas 2D）。
//
// 这是"硬邦邦"的来源：按面法线分 5 档平色（没有渐变），可见棱 1.4 px 墨线，被挡住的棱画成虚线
// （工程图的隐藏线画法），剖面面填 45° 剖面线。没有任何模糊、没有任何手抖。
//
// 同一份网格还能导出成 kits/lumen.js 要的数据（cloud / wireSegs），所以 VOID 里发光的和 PLATE 里
// 画出来的是同一个零件——参考片 §1.9 的"共享几何"在这里是代码级的：一个定义，两种存在方式。
//
//   const m = S3.merge(S3.box(2, 1, 1), S3.xf(S3.cyl(.4, 2, 24), { pos: [0, 1.2, 0] }));
//   S3.draw(g, m, { cam: { yaw: .6, pitch: .35, zoom: 130, cx: W / 2, cy: H / 2 } });
(function (G) {
'use strict';

// ---------------------------------------------------------------- 网格
function mesh(V, F) { return { V, F: F.map(f => (Array.isArray(f) ? { i: f } : f)) }; }

/** 四边形面（a,b,c,d 为顶点下标）。 */
const quad = (a, b, c, d) => [a, b, c, d];

function box(sx, sy, sz, o) {
  o = o || {};
  const x = sx / 2, y = sy / 2, z = sz / 2;
  const V = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
  const F = [quad(0, 1, 2, 3), quad(4, 5, 6, 7), quad(0, 1, 5, 4), quad(2, 3, 7, 6), quad(1, 2, 6, 5), quad(0, 3, 7, 4)];
  const m = mesh(V, F);
  if (o.at) S3.move(m, o.at);
  return m;
}

/** 圆柱 / 圆锥台：y 轴，底面在 y = 0（o.centered 时以原点为中心）。 */
function cyl(r0, r1, h, n, o) {
  o = o || {};
  n = n || 24;
  const y0 = o.centered ? -h / 2 : 0, y1 = y0 + h, V = [], F = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; V.push([Math.cos(a) * r0, y0, Math.sin(a) * r0]); }
  for (let i = 0; i < n; i++) { const a = i / n * TAU; V.push([Math.cos(a) * r1, y1, Math.sin(a) * r1]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push(quad(i, j, n + j, n + i)); }
  if (!o.open) {
    if (r0 > 0.001) F.push({ i: Array.from({ length: n }, (_, i) => n - 1 - i) });
    if (r1 > 0.001) F.push({ i: Array.from({ length: n }, (_, i) => n + i) });
  }
  const m = mesh(V, F);
  if (o.at) S3.move(m, o.at);
  return m;
}

/** 圆环体（y 轴为轴）。 */
function torus(R, r, nu, nv, o) {
  o = o || {}; nu = nu || 40; nv = nv || 12;
  const V = [], F = [];
  for (let i = 0; i < nu; i++) {
    const a = i / nu * TAU, ca = Math.cos(a), sa = Math.sin(a);
    for (let j = 0; j < nv; j++) {
      const b = j / nv * TAU, cb = Math.cos(b), sb = Math.sin(b);
      V.push([(R + r * cb) * ca, r * sb, (R + r * cb) * sa]);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const i2 = (i + 1) % nu, j2 = (j + 1) % nv;
    F.push(quad(i * nv + j, i2 * nv + j, i2 * nv + j2, i * nv + j2));
  }
  const m = mesh(V, F);
  if (o.at) S3.move(m, o.at);
  return m;
}

/** 球（经纬）。 */
function sphere(r, nu, nv) {
  nu = nu || 32; nv = nv || 18;
  const V = [], F = [];
  for (let j = 0; j <= nv; j++) {
    const p = j / nv * Math.PI;
    for (let i = 0; i < nu; i++) { const a = i / nu * TAU; V.push([r * Math.sin(p) * Math.cos(a), r * Math.cos(p), r * Math.sin(p) * Math.sin(a)]); }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const i2 = (i + 1) % nu;
    F.push([j * nu + i, j * nu + i2, (j + 1) * nu + i2, (j + 1) * nu + i]);
  }
  return mesh(V, F);
}

/** 正 n 棱柱：y 轴，高度 h，外接圆半径 r。 */
function prism(r, h, n, o) { return cyl(r, r, h, n, o); }

/** 长方体：以原点为中心（box 的别名，语义清楚点）。 */
function slab(w, h, d, o) { return box(w, h, d, o); }

/** 平行四边形板：由三个向量张成（做叶片、斜面、纸片）。 */
function plate(u, v, w, o) {
  const V = [];
  for (const a of [0, 1]) for (const b of [0, 1]) for (const c of [0, 1])
    V.push([(a ? u[0] : 0) + (b ? v[0] : 0) + (c ? w[0] : 0), (a ? u[1] : 0) + (b ? v[1] : 0) + (c ? w[1] : 0), (a ? u[2] : 0) + (b ? v[2] : 0) + (c ? w[2] : 0)]);
  const F = [quad(0, 2, 3, 1), quad(4, 5, 7, 6), quad(0, 1, 5, 4), quad(2, 6, 7, 3), quad(0, 4, 6, 2), quad(1, 3, 7, 5)];
  const m = mesh(V, F);
  if (o && o.at) S3.move(m, o.at);
  return m;
}

/** 沿折线扫一个矩形截面（做线缆、管子、回形针、钢筋）。pts: [[x,y,z],…]，closed 时首尾相接。 */
function sweep(pts, w, h, o) {
  o = o || {};
  const up = o.up || [0, 1, 0], N = pts.length, V = [], F = [];
  const V3 = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
    const t = V3.norm(V3.sub(b, a));
    let n1 = V3.cross(t, up); if (Math.hypot(n1[0], n1[1], n1[2]) < 1e-4) n1 = V3.cross(t, [1, 0, 0]);
    n1 = V3.norm(n1); const n2 = V3.norm(V3.cross(t, n1));
    const p = pts[i];
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]])
      V.push([p[0] + n1[0] * su * w / 2 + n2[0] * sv * h / 2, p[1] + n1[1] * su * w / 2 + n2[1] * sv * h / 2, p[2] + n1[2] * su * w / 2 + n2[2] * sv * h / 2]);
  }
  const M = o.closed ? N : N - 1;
  for (let i = 0; i < M; i++) { const j = (i + 1) % N; for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; F.push(quad(i * 4 + k, i * 4 + k2, j * 4 + k2, j * 4 + k)); } }
  if (!o.closed) { F.push(quad(0, 1, 2, 3)); F.push(quad((N - 1) * 4 + 3, (N - 1) * 4 + 2, (N - 1) * 4 + 1, (N - 1) * 4)); }
  return mesh(V, F);
}

// ---------------------------------------------------------------- 变换（与 kits/lumen.js 的 lmModel 同一套：rot 依次绕 x→y→z）
function modelM(m) {
  m = m || {};
  const [rx, ry, rz] = m.rot || [0, 0, 0];
  const s = m.scale == null ? [1, 1, 1] : typeof m.scale === 'number' ? [m.scale, m.scale, m.scale] : m.scale;
  const p = m.pos || [0, 0, 0];
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return [
    [cz * cy * s[0], (cz * sy * sx - sz * cx) * s[1], (cz * sy * cx + sz * sx) * s[2], p[0]],
    [sz * cy * s[0], (sz * sy * sx + cz * cx) * s[1], (sz * sy * cx - cz * sx) * s[2], p[1]],
    [-sy * s[0], cy * sx * s[1], cy * cx * s[2], p[2]],
  ];
}
function applyM(M, p) {
  return [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2] + M[0][3],
          M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2] + M[1][3],
          M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2] + M[2][3]];
}
/** 把 model 烤进顶点（init 里做一次，之后点云和线框都是世界坐标）。 */
function bake(m, model) {
  if (!model) return m;
  const M = modelM(model);
  return { V: m.V.map(v => applyM(M, v)), F: m.F.map(f => Object.assign({}, f)) };
}
function move(m, d) { for (const v of m.V) { v[0] += d[0]; v[1] += d[1]; v[2] += d[2] || 0; } return m; }
function scaleM(m, k) { for (const v of m.V) { v[0] *= k; v[1] *= k; v[2] *= k; } return m; }
/** 各轴分别缩放（x,y,z 三个数）。 */
function scale3(m, k) { for (const v of m.V) { v[0] *= k[0]; v[1] *= k[1]; v[2] *= k[2]; } return m; }

function merge() {
  const out = { V: [], F: [] };
  for (const m of arguments) {
    if (!m) continue;
    const off = out.V.length;
    for (const v of m.V) out.V.push(v.slice());
    for (const f of m.F) out.F.push(Object.assign({}, f, { i: f.i.map(i => i + off) }));
  }
  return out;
}
function xf(m, model) { return bake(m, model); }

// 面法线（网格空间，逆时针为正面）
function faceNormal(V, idx) {
  const a = V[idx[0]], b = V[idx[1]], c = V[idx[2]];
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

// ---------------------------------------------------------------- 边表（一次算好，挂在网格上）
function edges(m) {
  if (m._E) return m._E;
  const map = new Map(), list = [];
  m.F.forEach((f, fi) => {
    const idx = f.i;
    for (let k = 0; k < idx.length; k++) {
      const a = idx[k], b = idx[(k + 1) % idx.length];
      const key = a < b ? a + '_' + b : b + '_' + a;
      let e = map.get(key);
      if (!e) { e = { a: Math.min(a, b), b: Math.max(a, b), f: [] }; map.set(key, e); list.push(e); }
      e.f.push(fi);
    }
  });
  m._E = list;
  if (!m._N) m._N = m.F.map(f => faceNormal(m.V, f.i));
  return list;
}

// ---------------------------------------------------------------- 相机
function camOf(o) {
  const c = o.cam || {};
  const yaw = c.yaw || 0, pitch = c.pitch || 0;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return {
    yaw, pitch, cy, sy, cp, sp,
    dist: c.dist == null ? 8 : c.dist,
    zoom: c.zoom == null ? 120 : c.zoom,
    cx: c.cx == null ? W / 2 : c.cx,
    cyc: c.cy == null ? H / 2 : c.cy,
    persp: c.persp || 0,           // 0 = 轴测（工程图默认），>0 = 透视强度
    target: c.target || [0, 0, 0],
    near: c.near || 0.05,
    pan: c.pan || [0, 0],
  };
}
/** 世界坐标 → 视图坐标。cam 可以是 camOf() 的结果，也可以是 {yaw,pitch,zoom,cx,cy} 这种裸对象。 */
function toView(cam, p) {
  if (cam.cyc === undefined) cam = camOf({ cam: cam });
  const x = p[0] - cam.target[0], y = p[1] - cam.target[1], z = p[2] - cam.target[2];
  const x1 = x * cam.cy + z * cam.sy, z1 = -x * cam.sy + z * cam.cy;
  const y2 = y * cam.cp - z1 * cam.sp, z2 = y * cam.sp + z1 * cam.cp;
  return [x1, y2, z2];
}
/** 视图坐标 → 屏幕 [x, y, depth]。 */
function viewToScreen(cam, q) {
  if (cam.cyc === undefined) cam = camOf({ cam: cam });
  const s = cam.persp > 0 ? cam.zoom * cam.dist / Math.max(cam.near, cam.dist - q[2]) : cam.zoom;
  return [cam.cx + cam.pan[0] + s * q[0], cam.cyc + cam.pan[1] - s * q[1], q[2]];
}
function proj(cam, p) { return viewToScreen(cam, toView(cam, p)); }

const LIGHT = (function () { const v = [-0.42, 0.66, 0.62], l = Math.hypot(v[0], v[1], v[2]); return v.map(x => x / l); })();

// ---------------------------------------------------------------- 剖面线图案
let HATCHP = null;
function hatchPattern(g, o) {
  o = o || {};
  const gap = o.gap == null ? 9 : o.gap, w = o.width == null ? 1.1 : o.width, col = o.color || G.LK.hatch, ang = o.angle == null ? -Math.PI / 4 : o.angle;
  const S = 64, c = mk(S, S), h = c.getContext('2d');
  h.strokeStyle = col; h.lineWidth = w;
  h.translate(S / 2, S / 2); h.rotate(ang);
  for (let k = -3; k <= 3; k++) { h.beginPath(); h.moveTo(k * gap, -S); h.lineTo(k * gap, S); h.stroke(); }
  return g.createPattern(c, 'repeat');
}

// ---------------------------------------------------------------- 渲染
/**
 * 画一批零件。items: [{ mesh, model, tone(face,i)->color, active(face,i)->bool, hatch(face)->bool, hidden }]
 * o: cam, mode 'solid'|'wire'|'ghost', edge/edgeW, hidden/hiddenW/hiddenCol, alpha, tone(face,i,item),
 *    back(face)->bool 只画背面（做"内部结构"），light
 * 排序：所有面一起按深度从远到近（画家算法），所以多个零件互相遮挡是对的。
 */
function drawAll(g, items, o) {
  o = o || {};
  const cam = camOf(o), mode = o.mode || 'solid', alpha = o.alpha == null ? 1 : o.alpha;
  const edgeW = o.edgeW == null ? 1.35 : o.edgeW;
  const hidW = o.hiddenW == null ? 0.7 : o.hiddenW;
  const edgeCol = o.edge || G.LK.ink, hidCol = o.hiddenCol || G.LK.ink2;
  const cy = cam.cy, sy = cam.sy, cp = cam.cp, sp = cam.sp;
  // 每个零件：顶点投影 + 视图空间法线，各算一次（边循环只读结果，不再分配）
  const prep = items.map(it0 => {
    const m = it0.mesh, M = it0.model ? modelM(it0.model) : null;
    const vs = new Array(m.V.length);
    for (let i = 0; i < m.V.length; i++) vs[i] = viewToScreen(cam, toView(cam, M ? applyM(M, m.V[i]) : m.V[i]));
    const N = m._N || (m._N = m.F.map(f => faceNormal(m.V, f.i)));
    const vn = new Array(m.F.length);
    for (let i = 0; i < N.length; i++) {
      const n = N[i];
      const a0 = M ? M[0][0] * n[0] + M[0][1] * n[1] + M[0][2] * n[2] : n[0];
      const a1 = M ? M[1][0] * n[0] + M[1][1] * n[1] + M[1][2] * n[2] : n[1];
      const a2 = M ? M[2][0] * n[0] + M[2][1] * n[1] + M[2][2] * n[2] : n[2];
      const l = Math.hypot(a0, a1, a2) || 1;
      const x1 = (a0 / l) * cy + (a2 / l) * sy, z1 = -(a0 / l) * sy + (a2 / l) * cy;
      vn[i] = [(a0 / l), (a1 / l) * cp - z1 * sp, (a1 / l) * sp + z1 * cp, x1];
    }
    return { it: it0, m, vs, vn, E: it0.edges === false && !o.hidden ? null : edges(m) };
  });
  // 所有面一起按深度排序（画家算法）：多个零件互相遮挡也是对的
  const faces = [];
  for (const P of prep) {
    const m = P.m;
    for (let fi = 0; fi < m.F.length; fi++) {
      const idx = m.F[fi].i;
      let z = 0;
      for (let k = 0; k < idx.length; k++) z += P.vs[idx[k]][2];
      faces.push({ P, fi, i: idx, z: z / idx.length });
    }
  }
  faces.sort((a, b) => a.z - b.z);
  g.save();
  g.globalAlpha = alpha;
  // 1) 实体填充（剖面面填剖面线）
  if (mode !== 'wire') {
    const hp = mode === 'ghost' ? null : hatchPattern(g, o.hatchOpt);
    const ghostFill = G.LK.a(o.ghostTone || G.LK.tone[2], o.ghostAlpha == null ? 0.5 : o.ghostAlpha);
    let lastFill = null;
    for (const fc of faces) {
      const it0 = fc.P.it, m = fc.P.m, f = m.F[fc.fi];
      let fill;
      if (mode === 'ghost') fill = ghostFill;
      else if (it0.hatch && it0.hatch(f, fc.fi)) fill = hp;
      else if (it0.tone) fill = it0.tone(f, fc.fi, fc.P.vn[fc.fi], o);
      else if (o.tone) fill = o.tone(f, fc.fi, fc.P.vn[fc.fi], it0);
      else {
        const n = fc.P.vn[fc.fi];
        const d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
        const k = Math.max(0, Math.min(0.999, 0.5 + 0.5 * d));
        fill = G.LK.tone[Math.min(G.LK.tone.length - 1, Math.floor((1 - k) * G.LK.tone.length))];
      }
      if (!fill) continue;
      const vs = fc.P.vs, idx = fc.i;
      g.beginPath();
      g.moveTo(vs[idx[0]][0], vs[idx[0]][1]);
      for (let k = 1; k < idx.length; k++) g.lineTo(vs[idx[k]][0], vs[idx[k]][1]);
      g.closePath();
      if (fill !== lastFill) { g.fillStyle = fill; lastFill = fill; }
      g.fill();
    }
  }
  // 2) 隐藏棱（虚线，画在实体之上：工程图的"看穿"画法）
  if (o.hidden !== false && mode !== 'ghost') {
    g.save();
    g.lineWidth = hidW; g.setLineDash(o.dash || [4, 3.4]);
    for (const P of prep) {
      if (P.it.hidden === false || !P.E) continue;
      g.beginPath();
      for (const e of P.E) {
        const ef = e.f;
        let front = false;
        for (let k = 0; k < ef.length; k++) if (P.vn[ef[k]][2] > 0.001) { front = true; break; }
        if (front) continue;
        const a = P.vs[e.a], b = P.vs[e.b];
        g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      }
      g.strokeStyle = typeof hidCol === 'function' ? hidCol(P.it) : (P.it.hiddenCol || hidCol);
      g.stroke();
    }
    g.restore();
  }
  // 3) 可见棱
  if (mode !== 'ghost' || o.edges) {
    for (const P of prep) {
      if (P.it.edges === false || !P.E) continue;
      g.lineWidth = P.it.edgeW == null ? edgeW : P.it.edgeW;
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.beginPath();
      for (const e of P.E) {
        const ef = e.f;
        let front = false;
        for (let k = 0; k < ef.length; k++) if (P.vn[ef[k]][2] > 0.001) { front = true; break; }
        if (!front) continue;
        const a = P.vs[e.a], b = P.vs[e.b];
        g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      }
      g.strokeStyle = typeof edgeCol === 'function' ? edgeCol(P.it) : (P.it.edge || edgeCol);
      g.stroke();
    }
  }
  g.restore();
}

function draw(g, m, o) { return drawAll(g, [Object.assign({ mesh: m }, o.item)], o); }

// ---------------------------------------------------------------- 导出给 kits/lumen.js（点云 / 线段缓冲）
function triArea(a, b, c) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}
/** 在表面上按面积均匀撒 n 个点 → Float32Array（喂 lmPoints）。o.edge 只撒在棱上。o.jitter 法向抖动。 */
function cloud(m, n, o) {
  o = o || {};
  const rnd = mulberry32(o.seed || 11), tris = [];
  let tot = 0;
  for (const f of m.F) {
    const idx = f.i;
    for (let k = 1; k < idx.length - 1; k++) {
      const a = m.V[idx[0]], b = m.V[idx[k]], c = m.V[idx[k + 1]];
      const ar = triArea(a, b, c); tot += ar;
      tris.push({ a, b, c, ar });
    }
  }
  const P = new Float32Array(n * 3), j = o.jitter || 0;
  for (let i = 0; i < n; i++) {
    let r = rnd() * tot, t = tris[tris.length - 1];
    for (const q of tris) { r -= q.ar; if (r <= 0) { t = q; break; } }
    let u = rnd(), v = rnd();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    const nx = -(t.b[1] - t.a[1]) * (t.c[2] - t.a[2]) + (t.b[2] - t.a[2]) * (t.c[1] - t.a[1]);
    P[i * 3]     = t.a[0] * w + t.b[0] * u + t.c[0] * v + (j ? (rnd() - 0.5) * j : 0);
    P[i * 3 + 1] = t.a[1] * w + t.b[1] * u + t.c[1] * v + (j ? (rnd() - 0.5) * j : 0);
    P[i * 3 + 2] = t.a[2] * w + t.b[2] * u + t.c[2] * v + (j ? (rnd() - 0.5) * j : 0);
  }
  return P;
}
/** 棱 → 线段缓冲（8 个数一段，喂 lmLines）。o.front 只出可见棱。 */
function wireSegs(m, o) {
  o = o || {};
  const E = edges(m), N = m._N || (m._N = m.F.map(f => faceNormal(m.V, f.i)));
  const out = [];
  for (const e of E) {
    const a = m.V[e.a], b = m.V[e.b];
    out.push(a[0], a[1], a[2], b[0], b[1], b[2], o.bright == null ? 1 : o.bright, o.caps == null ? 0 : o.caps);
  }
  const S = new Float32Array(out);
  return S;
}
/** 只要某条边被至少一个面共享（做线框时用的原始折线，按面拆开）。 */
function faceOutline(m, fi) { return m.F[fi].i.map(i => m.V[i]); }

const S3 = {
  mesh, box, slab, cyl, prism, torus, sphere, plate, sweep, quad,
  bake, xf, move, scale: scaleM, scale3, merge, modelM, applyM, faceNormal,
  edges, camOf, toView, viewToScreen, proj, draw, drawAll, cloud, wireSegs, faceOutline,
  hatchPattern, LIGHT,
};
G.S3 = S3;
})(window);
