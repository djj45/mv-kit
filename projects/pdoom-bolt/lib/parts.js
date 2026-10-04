// parts.js — THE CELL（全片唯一的主角）和它的零件。一份几何，两种存在方式：
//   PLATE：S3.draw 投影成实体图   VOID：S3.cloud / S3.wireSegs 交给 kits/lumen.js 变成点云和线框
// 图纸编号见 TREATMENT.md。零件表：外六角框 / 三道具环 / 内球 / 12 片光圈 / 电极 / 板 / 晶格 / 机柜 / 层叠 / 织机 / 回形针 / 中文屋。
(function (G) {
'use strict';
const S3 = G.S3, LK = G.LK;

/** 2D 多边形（CCW）沿 z 挤出厚度 t → 实体。 */
function extrude(poly2d, t, o) {
  o = o || {};
  const n = poly2d.length, h = t / 2, V = [], F = [];
  for (const p of poly2d) V.push([p[0], p[1], h]);
  for (const p of poly2d) V.push([p[0], p[1], -h]);
  F.push({ i: Array.from({ length: n }, (_, i) => i) });
  F.push({ i: Array.from({ length: n }, (_, i) => 2 * n - 1 - i) });
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; F.push({ i: [i, j, n + j, n + i] }); }
  const m = S3.mesh(V, F);
  if (o.at) S3.move(m, o.at);
  return m;
}

/** 垫圈 / 环：内外两个圆柱 + 上下两个圆环面。 */
function tube(rIn, rOut, h, n, o) {
  o = o || {}; n = n || 32;
  const V = [], F = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a);
    V.push([c * rIn, -h / 2, s * rIn], [c * rOut, -h / 2, s * rOut], [c * rIn, h / 2, s * rIn], [c * rOut, h / 2, s * rOut]); }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = i * 4, b = j * 4;
    F.push(quad4(a + 1, b + 1, b + 3, a + 3));   // 外壁
    F.push(quad4(a + 2, b + 2, b + 0, a + 0));   // 内壁
    F.push(quad4(a + 0, b + 0, b + 1, a + 1));   // 下环面
    F.push(quad4(a + 3, b + 3, b + 2, a + 2));   // 上环面
  }
  const m = S3.mesh(V, F);
  if (o.at) S3.move(m, o.at);
  return m;
}
const quad4 = (a, b, c, d) => [a, b, c, d];

/** 六角框：n 边棱柱环。 */
function frameRing(r, h, t, n, o) { return tube(r - t, r, h, n || 6, o); }

/** 螺栓 / 电极 / 连杆：a → b 之间的一段圆柱（可选锥度）。 */
function pin(a, b, r, o) {
  o = o || {};
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]) || 1;
  const m = S3.cyl(r, r * (o.taper == null ? 1 : o.taper), L, o.sides || 12, { centered: true });
  const u = [d[0] / L, d[1] / L, d[2] / L];
  const dot = clamp(u[1], -1, 1);                       // 从 +y 转到 u 的轴角 → 旋转矩阵
  let R;
  if (dot > 0.99999) R = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  else if (dot < -0.99999) R = [1, 0, 0, 0, -1, 0, 0, 0, -1];
  else {
    const ax = [-u[2], 0, u[0]], al = Math.hypot(ax[0], ax[1], ax[2]);
    const x = ax[0] / al, y = 0, z = ax[2] / al, s = Math.sin(Math.acos(dot)), c = dot, t1 = 1 - c;
    R = [c + x * x * t1, x * y * t1 - z * s, x * z * t1 + y * s,
         y * x * t1 + z * s, c + y * y * t1, y * z * t1 - x * s,
         z * x * t1 - y * s, z * y * t1 + x * s, c + z * z * t1];
  }
  const rot = [Math.atan2(R[7], R[8]), Math.asin(clamp(-R[6], -1, 1)), Math.atan2(R[3], R[0])];
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return S3.bake(m, { rot, pos: mid });
}

/** 线圈：一圈一圈的螺旋（电感、磁场线、电极导轨）。 */
function coil(r, turns, len, wire, o) {
  o = o || {};
  const pts = [];
  const N = Math.max(24, Math.round(turns * 14));
  for (let i = 0; i <= N; i++) {
    const u = i / N, a = u * turns * TAU;
    pts.push([Math.cos(a) * r, -len / 2 + u * len, Math.sin(a) * r]);
  }
  return S3.sweep(pts, wire, wire, {});
}

// ---------------------------------------------------------------- 光圈（= 眼睛）
/**
 * 叶片轮廓：枢轴在原点（= 外缘），向内伸 L 并在尖端收窄。宽 w 要大于相邻叶片在该半径上的弧距
 * （2πr/n），合上时才没有缝：w > 2π·ro/n。
 */
function bladePoly(L, w) {
  return [[0, w * 0.5], [-L * 0.5, w * 0.62], [-L * 0.94, w * 0.20], [-L, 0],
          [-L * 0.94, -w * 0.20], [-L * 0.5, -w * 0.62], [0, -w * 0.5]];
}
/**
 * n 片光圈叶片。返回 { blades, pivot: [ [ro, ang] … ], ring, hub, ri, ro, n, L, w }。
 * open 0 = 合上（中间只剩 ri 的小孔）、1 = 全开。每片绕自己在外缘的枢轴转。
 */
function irisParts(n, o) {
  o = o || {};
  const ro = o.ro == null ? 1.0 : o.ro, ri = o.ri == null ? ro * 0.10 : o.ri;
  const t = o.thick == null ? 0.045 : o.thick, L = ro - ri;
  const w = o.w == null ? Math.max(2 * Math.PI * ro / n * 1.06, L * 0.55) : o.w;
  const blades = [], pivot = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU;
    blades.push(extrude(bladePoly(L, w), t));
    pivot.push([ro, a]);
  }
  const ring = o.ring === false ? null : S3.bake(tube(ro + 0.04, ro + 0.17, t * 2.6, o.rn || 64), { rot: [Math.PI / 2, 0, 0] });  // 躺进 xy 平面（叶片所在的平面）
  const hub = o.hub === false ? null : tube(ri * 0.75, ri * 1.5, t * 1.6, 20);
  return { blades, pivot, ring, hub, ri, ro, n, L, w };
}
const IRIS_SPIN = 0.78;      // 完全打开时每片转过的弧度
/** 第 i 片在开度 open 下的 model：世界 = Rz(a)·T(ro,0)·Rz(spin)  ⇔  pos = Rz(a)(ro,0), rot = a + spin */
function irisModel(P, i, open) {
  const a = P.pivot[i][1];
  const spin = -(1 - clamp(open)) * IRIS_SPIN;
  return { pos: [Math.cos(a) * P.ro, Math.sin(a) * P.ro, 0], rot: [0, 0, a + spin] };
}
/** 光圈开度 → 中心孔半径（画瞳孔 / 算光斑用）。 */
function irisHole(P, open) {
  const spin = -(1 - clamp(open)) * IRIS_SPIN;
  return Math.sqrt(Math.max(0, P.ro * P.ro - 2 * P.ro * P.L * Math.cos(spin) + P.L * P.L));
}
/** 整只光圈画成实体（PLATE 用）。o: S3.drawAll 的选项 */
function irisDraw(g, P, open, o) {
  const items = [];
  for (let i = 0; i < P.blades.length; i++) items.push({ mesh: P.blades[i], model: irisModel(P, i, open) });
  if (P.ring) items.push({ mesh: P.ring });
  if (P.hub) items.push({ mesh: P.hub });
  S3.drawAll(g, items, o);
}
/** 光圈在开度 open 下的世界线段缓冲（VOID 用；12 片 × 6 边 = 72 段）。 */
function irisSegs(P, open) {
  const M = G.S3.modelM, AP = G.S3.applyM, E = G.S3.edges;
  const out = [];
  for (let i = 0; i < P.blades.length; i++) {
    const m = P.blades[i], T = M(irisModel(P, i, open)), ed = E(m);
    for (const e of ed) {
      const a = AP(T, m.V[e.a]), b = AP(T, m.V[e.b]);
      out.push(a[0], a[1], a[2], b[0], b[1], b[2], 1, 0);
    }
  }
  for (const extra of [P.ring, P.hub]) {
    if (!extra) continue;
    for (const e of E(extra)) {
      const a = extra.V[e.a], b = extra.V[e.b];
      out.push(a[0], a[1], a[2], b[0], b[1], b[2], 0.75, 0);
    }
  }
  return new Float32Array(out);
}

// ---------------------------------------------------------------- THE CELL 总成
/** 外六角框 + 三道具环 + 内球 + 电极。返回 { frame, rings:[mesh…], core, pins:[mesh…] } */
function cellParts(o) {
  o = o || {};
  const R = o.R == null ? 1.0 : o.R;
  const frame = frameRing(R * 2.3, R * 0.5, R * 0.22, 6);
  const rings = [
    S3.torus(R * 1.75, R * 0.055, o.rn || 48, 10),
    S3.bake(S3.torus(R * 1.5, R * 0.05, o.rn || 44, 10), { rot: [Math.PI / 2, 0, 0] }),
    S3.bake(S3.torus(R * 1.28, R * 0.045, o.rn || 40, 10), { rot: [0, Math.PI / 2.6, 0] }),
  ];
  const core = S3.sphere(R * 0.42, o.sn || 24, o.sv || 14);
  const pins = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + Math.PI / 6;
    pins.push(pin([Math.cos(a) * R * 2.1, Math.sin(a) * R * 2.1, 0], [Math.cos(a) * R * 1.15, Math.sin(a) * R * 1.15, 0], R * 0.07, { sides: 8 }));
  }
  return { frame, rings, core, pins };
}

// ---------------------------------------------------------------- 板 / 晶格 / 机柜 / 层叠 / 织机 / 回形针 / 中文屋
/** 线路板：底板 + 走线 + 焊盘 + 一颗大芯片。种子确定，形状固定。 */
function board(w, h, o) {
  o = o || {};
  const parts = [S3.box(w, h, o.t == null ? 0.12 : o.t)];
  const rnd = mulberry32(o.seed || 41);
  const n = o.traces || 26;
  for (let i = 0; i < n; i++) {
    let x = (rnd() - 0.5) * w * 0.92, y = (rnd() - 0.5) * h * 0.92;
    let dx = rnd() < 0.5 ? 1 : -1, dy = 0;
    const pts = [[x, y, 0.09]];
    for (let k = 0; k < 3 + Math.floor(rnd() * 3); k++) {
      const L = (0.06 + rnd() * 0.16) * w;
      if (rnd() < 0.5) { dx = (rnd() < 0.5 ? 1 : -1); dy = 0; } else { dy = (rnd() < 0.5 ? 1 : -1); dx = 0; }
      x = clamp(x + dx * L, -w * 0.46, w * 0.46); y = clamp(y + dy * L, -h * 0.46, h * 0.46);
      pts.push([x, y, 0.09]);
    }
    parts.push(S3.sweep(pts, 0.045, 0.045));
  }
  const chip = S3.box(w * 0.3, h * 0.3, 0.22, { at: [(rnd() - 0.5) * w * 0.2, (rnd() - 0.5) * h * 0.2, 0.16] });
  parts.push(chip);
  for (let i = 0; i < 26; i++) parts.push(S3.cyl(0.05, 0.05, 0.08, 8, { centered: true, at: [(rnd() - 0.5) * w * 0.95, (rnd() - 0.5) * h * 0.95, 0.08] }));
  return S3.merge.apply(null, parts);
}

/** 晶格：n×n×n 个原子球 + 最近邻键。 */
function lattice(n, gap, o) {
  o = o || {};
  const parts = [], r = o.r == null ? gap * 0.17 : o.r;
  const id = (i, j, k) => [i, j, k];
  const at = (i, j, k) => [(i - (n - 1) / 2) * gap, (j - (n - 1) / 2) * gap, (k - (n - 1) / 2) * gap];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
    parts.push(S3.bake(S3.sphere(r, o.sn || 8, o.sv || 6), { pos: at(i, j, k) }));
    if (i + 1 < n) parts.push(pin(at(i, j, k), at(i + 1, j, k), r * 0.22, { sides: 5 }));
    if (j + 1 < n) parts.push(pin(at(i, j, k), at(i, j + 1, k), r * 0.22, { sides: 5 }));
    if (k + 1 < n) parts.push(pin(at(i, j, k), at(i, j, k + 1), r * 0.22, { sides: 5 }));
  }
  void id;
  return S3.merge.apply(null, parts);
}

/** 机柜阵列：cols × rows 个柜子，每柜带面板槽和指示灯。 */
function racks(cols, rows, bw, bh, bd, o) {
  o = o || {};
  const parts = [];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const x = (c - (cols - 1) / 2) * bw * 1.06, y = (r - (rows - 1) / 2) * bh * 1.12;
    parts.push(S3.box(bw, bh, bd, { at: [x, y, 0] }));
    const slots = o.slots == null ? 7 : o.slots;
    for (let i = 0; i < slots; i++) {
      parts.push(S3.box(bw * 0.86, bh * 0.055, bd * 0.1, { at: [x, y - bh * 0.38 + bh * 0.76 * i / (slots - 1), bd * 0.52] }));
    }
  }
  return S3.merge.apply(null, parts);
}

/** 层叠的层板（transformer 堆）：n 层，每层四角有立柱。 */
function stack(n, w, d, gap, o) {
  o = o || {};
  const parts = [];
  for (let i = 0; i < n; i++) {
    const y = i * gap;
    parts.push(S3.box(w, o.t == null ? gap * 0.22 : o.t, d, { at: [0, y, 0] }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      parts.push(pin([sx * w * 0.42, 0, sz * d * 0.42], [sx * w * 0.42, (n - 1) * gap, sz * d * 0.42], w * 0.018, { sides: 6 }));
  }
  return S3.merge.apply(null, parts);
}

/** 织机：机框 + 经线（n 根）+ 两根纬线梳。 */
function loom(nw, w, h, o) {
  o = o || {};
  const parts = [S3.box(w, h * 0.06, 0.5, { at: [0, h / 2, 0] }), S3.box(w, h * 0.06, 0.5, { at: [0, -h / 2, 0] }),
    S3.box(w * 0.05, h, 0.5, { at: [-w / 2, 0, 0] }), S3.box(w * 0.05, h, 0.5, { at: [w / 2, 0, 0] })];
  for (let i = 0; i < nw; i++) {
    const x = -w / 2 + w * (i + 0.5) / nw;
    parts.push(pin([x, -h / 2, 0], [x, h / 2, 0], o.wire == null ? 0.022 : o.wire, { sides: 4 }));
  }
  parts.push(S3.box(w * 1.04, 0.16, 0.3, { at: [0, 0, 0.3] }));
  return S3.merge.apply(null, parts);
}

/** 回形针：一条折线扫出来的。 */
function clip(scale, at) {
  const s = scale == null ? 1 : scale;
  const p = [];
  const A = (x, y) => p.push([x * s, y * s, 0]);
  A(-1.0, 0.62); A(0.72, 0.62); A(1.0, 0.38); A(1.0, -0.20); A(0.76, -0.46); A(-0.52, -0.46);
  A(-0.52, 0.30); A(0.44, 0.30); A(0.62, 0.14); A(0.62, -0.06); A(0.48, -0.20); A(-0.30, -0.20);
  A(-0.30, 0.44); A(0.16, 0.44);
  const m = S3.sweep(p, 0.13 * s, 0.13 * s);
  if (at) S3.move(m, at);
  return m;
}

/** 中文屋：一个箱子 + 一道投卡口 + 内部台面。 */
function roomBox(w, h, d, o) {
  o = o || {};
  const t = o.t == null ? 0.16 : o.t;
  const parts = [
    S3.box(w, t, d, { at: [0, -h / 2, 0] }), S3.box(w, t, d, { at: [0, h / 2, 0] }),
    S3.box(t, h, d, { at: [-w / 2, 0, 0] }), S3.box(w, h, t, { at: [0, 0, -d / 2] }),
    S3.box(w * 0.5, h * 0.5, t, { at: [0, -h * 0.2, d / 2] }),
  ];
  if (o.slot !== false) parts.push(S3.box(w * 0.3, h * 0.045, t * 2.4, { at: [0, h * 0.3, d / 2] }));
  return S3.merge.apply(null, parts);
}

/** 人形剪影（2D 多边形，单位高 1、脚在 y=0）。人不画脸：剪影或零件。 */
function figure2d(o) {
  o = o || {};
  const k = o.k == null ? 1 : o.k, w = 0.20 * k;
  const shoulder = 0.80 * k, hip = 0.48 * k, head = 0.93 * k;
  return [
    [0, 0], [w * 0.55, 0], [w * 0.5, hip * 0.52], [w * 0.72, hip],
    [w * 1.15, shoulder], [w * 0.85, shoulder + 0.055 * k], [w * 0.42, shoulder * 0.92],
    [0, shoulder * 0.9], [-w * 0.42, shoulder * 0.92], [-w * 0.85, shoulder + 0.055 * k],
    [-w * 1.15, shoulder], [-w * 0.72, hip], [-w * 0.5, hip * 0.52], [-w * 0.55, 0],
  ];
}
/** 人形剪影 → 点云（VOID 里的人是点，不是线）。 */
function figureCloud(n, o) {
  o = o || {};
  const poly = figure2d(o), P = new Float32Array(n * 3), rnd = mulberry32(7);
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const p of poly) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
  let i = 0, guard = 0;
  while (i < n && guard++ < n * 60) {
    const x = minx + rnd() * (maxx - minx), y = miny + rnd() * (maxy - miny);
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      if ((poly[a][1] > y) !== (poly[b][1] > y) && x < (poly[b][0] - poly[a][0]) * (y - poly[a][1]) / (poly[b][1] - poly[a][1]) + poly[a][0]) inside = !inside;
    }
    if (inside) { P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = (rnd() - 0.5) * 0.04; i++; }
  }
  return P;
}

const PART = {
  extrude, tube, frameRing, pin, coil, quad4,
  irisParts, irisModel, irisDraw, irisHole, irisSegs, bladePoly,
  cellParts, board, lattice, racks, stack, loom, clip, roomBox, figure2d, figureCloud,
};
G.PART = PART;
})(window);
