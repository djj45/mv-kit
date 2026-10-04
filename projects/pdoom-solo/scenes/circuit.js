// circuit — 眼睛下方的脸颊：实黑里刻出电路走线（白刀口），节点是小方块，走线里渗蓝墨。
// v1 "Your circuits make me nervous,"：整帧是脸颊的黑，白走线一条条爬出来，最右端那颗大节点是主角（缓推 + 轻微手持）。
// v2 "that's no surprise"：镜头拉开，版的黑边退到右下露出白地；爬得最快的那根走线的末端还在长；
// 这一句刻在右下白地边上的实黑条里（场景层，WD.lyric 自己报 keep）。
(function () {
'use strict';

// ---- 走线：脚本加载时算好一次（正交 + 45°，像版上刻出来的电路）
function traceSet(seed, n, x0, y0, x1, y1, step) {
  const R = mulberry32(seed), out = [];
  for (let i = 0; i < n; i++) {
    const pts = [];
    let x = x0 + Math.round((0.04 + 0.9 * R()) * (x1 - x0) / step) * step;
    let y = y0 + Math.round((0.04 + 0.9 * R()) * (y1 - y0) / step) * step;
    pts.push([x, y]);
    let d = ((R() * 4) | 0) * (Math.PI / 2);
    const segs = 3 + ((R() * 5) | 0);
    for (let k = 0; k < segs; k++) {
      const len = step * (1 + ((R() * 3) | 0));
      const a = d + (R() < 0.42 ? (R() < 0.5 ? 1 : -1) * Math.PI / 4 : 0);
      x += Math.cos(a) * len; y += Math.sin(a) * len;
      pts.push([x, y]);
      if (R() < 0.45) d += (R() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    out.push(pts);
  }
  return out;
}
/** 折线按弧长取到 u（0..1）那一段 */
function part(pts, u) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1] * clamp(u);
  if (tot <= 0.01) return [pts[0], pts[0]];
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= tot) { out.push(pts[i]); continue; }
    const k = (tot - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]);
    break;
  }
  if (out.length < 2) out.push(pts[1]);
  return out;
}
function tipOf(pts, u) { const P = part(pts, u); return P[P.length - 1]; }
/** 小方块节点：纸色方垫 + 黑芯（+ 蓝芯） */
function node(g, f, x, y, r, o) {
  o = o || {};
  WD.wipe(g, f, [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]], { seed: (o.seed || 3) + 0.7, jit: r * 0.1 });
  WD.carve(g, f, [[x - r * 0.42, y - r * 0.42], [x + r * 0.42, y - r * 0.42], [x + r * 0.42, y + r * 0.42], [x - r * 0.42, y + r * 0.42]],
    { seed: (o.seed || 3) + 2.1, jit: r * 0.06, holes: false, seg: 18 });
  if (o.blue) {
    g.save(); g.globalAlpha *= o.blue; g.fillStyle = WD.blue;
    g.fillRect(x - r * 0.22, y - r * 0.22, r * 0.44, r * 0.44); g.restore();
  }
}
/** 走线里渗的蓝墨：沿折线的一条细蓝线 */
function seep(g, f, pts, w, a, seed) {
  if (a <= 0.02) return;
  g.save(); g.globalAlpha *= a;
  WD.contour(g, f, pts, w, { color: WD.blue, seed: seed, boil: 0.5, prof: function () { return 1; } });
  g.restore();
}

const TR1 = traceSet(11, 10, -60, 120, 1520, 980, 76);
const TR2 = traceSet(37, 9, -60, 60, 1360, 800, 88);
const NODE1 = [1636, 556];
const BUS = [[-40, 700], [420, 700], [420, 430], [900, 430], [900, 200], [1500, 200], [1500, 556], [1636, 556]];
const FAST = [[120, 110], [560, 110], [560, 388], [948, 388], [948, 636], [1290, 636], [1290, 330], [1470, 300]];

/** 画面上的"脸"：整块黑 + 上方的下眼睑和睫毛 */
function face(g, f, P, seed) {
  const Q = WD.carve(g, f, P, { seed: seed, jit: 6.5, seg: 130 });
  WD.gouge(g, f, [[-30, 128], [400, 176], [990, 190], [1560, 168], [1950, 130]], 27, { seed: 21, pw: 0.22, rough: 1.5 });
  for (let i = 0; i < 10; i++) {
    const x = 120 + i * 196, y = 176 + noise1(i * 2.3, 4) * 16;
    WD.gouge(g, f, [[x, y], [x - 16 + noise1(i * 1.7, 8) * 10, y + 44 + noise1(i, 3) * 12]], 9 - (i % 3) * 2, { seed: 60 + i, pw: 0.3 });
  }
  return Q;
}

MV.scene('circuit', {
  render: function (g, f) {
    const v = (f.params && f.params.v) || 1;
    WD.ground(g, f, { ox: 36 });
    if (v === 1) {
      face(g, f, [[-40, -40], [W + 40, -40], [W + 40, H + 40], [-40, H + 40]], 4.2);
      // 左缘：脸颊转过去的暗部（这一镜的排线档）
      WD.crosshatch(g, f, [[-40, -40], [430, -40], [300, 520], [150, H + 40], [-40, H + 40]], { gap: 15, lw: 4.6, ang: 0.03, seed: 9, wob: 3.6 });
      // 主干线：从左边一直爬到右边那颗端子上
      const kb = prog(f.t, f.from - 1.1, f.from + 1.5, ease.outCubic);
      WD.gouge(g, f, part(BUS, kb), 22, { seed: 5, pw: 0.05, rough: 0.8 });
      seep(g, f, part(BUS, clamp(kb - 0.16)), 4.5, 0.85 * prog(f.t, f.from - 0.6, f.from + 1.2), 71);
      // 细走线：一条条爬出来
      for (let i = 0; i < TR1.length; i++) {
        const a = f.from - 1.35 + i * 0.13, k = prog(f.t, a, a + 1.0, ease.outCubic);
        if (k <= 0.01) continue;
        const P = part(TR1[i], k);
        WD.gouge(g, f, P, 13.5 - (i % 3) * 1.6, { seed: 100 + i, pw: 0.07, rough: 0.75 });
        seep(g, f, part(P, 0.92), 3.6, 0.55 * prog(f.t, a + 0.35, a + 0.9), 110 + i);
        for (let j = 1; j < P.length - 1; j++) node(g, f, P[j][0], P[j][1], 20 + (j % 2) * 4, { seed: 200 + i * 3 + j, blue: 0.55 * prog(f.t, a + 0.5, a + 1.1) });
      }
      // 主角：最右端那颗大节点（"它"的端子）
      const pulse = 1 + 0.05 * f.a.kick + 0.03 * f.a.onset;
      const R = 190 * pulse;
      WD.wipe(g, f, [[NODE1[0] - R, NODE1[1] - R], [NODE1[0] + R, NODE1[1] - R], [NODE1[0] + R, NODE1[1] + R], [NODE1[0] - R, NODE1[1] + R]], { seed: 8.4, jit: 5 });
      WD.carve(g, f, [[NODE1[0] - R * 0.62, NODE1[1] - R * 0.62], [NODE1[0] + R * 0.62, NODE1[1] - R * 0.62], [NODE1[0] + R * 0.62, NODE1[1] + R * 0.62], [NODE1[0] - R * 0.62, NODE1[1] + R * 0.62]],
        { seed: 12.6, jit: 4, seg: 30 });
      g.save(); g.fillStyle = WD.blue;
      const br = R * 0.42 * (0.9 + 0.1 * f.a.kick);
      g.fillRect(NODE1[0] - br, NODE1[1] - br, br * 2, br * 2);
      g.fillStyle = WD.red; g.globalAlpha = 0.9;
      g.fillRect(NODE1[0] - 14, NODE1[1] - R + 16, 28, 10);
      g.restore();
      // 电流：每一拍沿着主干跑一个蓝方块
      const pp = tipOf(BUS, clamp(kb) * f.beatPhase);
      g.save(); g.fillStyle = WD.blue; g.globalAlpha = 0.9;
      const q = 16 + 14 * f.a.kick;
      g.fillRect(pp[0] - q, pp[1] - q, q * 2, q * 2); g.restore();
      MV.focus(700, 420, 'cheek');
      MV.focus(NODE1[0], NODE1[1], 'node');
      MV.overlay(function (o) {
        WD.lyric(o, f, { x: 960, y: 900, size: 72, align: 'center', mode: 'strip', maxW: 1560 });
      });
      return { shake: [2.6 * Math.sin(f.t * 1.9), 2.1 * Math.sin(f.t * 2.7 + 1)], vignette: 0.24 };
    }
    // ---- v2：镜头拉开，版的黑边退开
    const e = ease.outCubic(f.p);
    const pr = 1980 - 430 * e, pb = 1108 - 286 * e;
    const P = face(g, f, [[-40, -40], [pr, -40], [pr, pb], [-40, pb]], 6.7);
    g.save();
    g.beginPath(); P.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); g.clip();
    for (let i = 0; i < TR2.length; i++) {
      const a = f.from - 0.9 + i * 0.16, k = prog(f.t, a, a + 0.95, ease.outCubic);
      if (k <= 0.01) continue;
      const Q = part(TR2[i], k);
      WD.gouge(g, f, Q, 14, { seed: 300 + i, pw: 0.06, rough: 0.8 });
      seep(g, f, part(Q, 0.94), 4.4, 0.75, 310 + i);
      for (let j = 1; j < Q.length - 1; j++) node(g, f, Q[j][0], Q[j][1], 19, { seed: 400 + i * 3 + j, blue: 0.7 });
    }
    // 爬得最快的那根：整镜都在长，末端是主角
    const kf = prog(f.t, f.from - 0.55, f.to - 0.05, ease.linear);
    const PF = part(FAST, kf), tf = PF[PF.length - 1];
    WD.gouge(g, f, PF, 19, { seed: 501, pw: 0.04, rough: 0.7 });
    seep(g, f, part(PF, 0.9), 5, 0.9, 502);
    g.restore();
    node(g, f, tf[0], tf[1], 44 + 8 * f.a.kick, { seed: 511, blue: 1 });
    g.save(); g.fillStyle = WD.blue; g.globalAlpha = 0.7;
    g.beginPath(); g.arc(tf[0], tf[1], 28 + 14 * f.a.kick, 0, Math.PI * 2); g.fill(); g.restore();
    // 版的边缘 + 一条纸色刀口
    WD.gouge(g, f, [[pr - 6, -40], [pr - 16, pb * 0.45], [pr - 8, pb + 6]], 15, { seed: 601, pw: 0.12 });
    WD.gouge(g, f, [[-40, pb - 8], [pr * 0.5, pb - 16], [pr + 6, pb - 6]], 15, { seed: 602, pw: 0.12 });
    // 右下白地上的实黑条：这一句刻在里面
    WD.inkBar(g, f, 1176, 842, 700, 152, { seed: 701, jit: 2.4 });
    g.save(); g.globalAlpha = 0.42;
    WD.hatch(g, f, [[1176, 842], [1876, 842], [1876, 994], [1176, 994]], { gap: 17, lw: 3.2, ang: 0.02, seed: 703, wob: 2.4 });
    g.restore();
    const ly = WD.lyric(g, f, { x: 1806, y: 928, size: 44, align: 'right', mode: 'carve', font: 'ly', band: false, color: WD.paper, maxW: 620 });
    if (ly) { g.save(); g.strokeStyle = WD.red; g.lineWidth = 3; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(1204, 866); g.lineTo(1204, 972); g.stroke(); g.restore(); }
    g.save(); g.globalAlpha = 0.5; g.fillStyle = WD.blue;
    for (let i = 0; i < 6; i++) {
      const x = 900 + i * 118, y = pb + 14 + (i % 3) * 34, w2 = 20 + (i % 3) * 8;
      g.fillRect(x, y, w2, w2 * (1.6 + (i % 2)));
    } g.restore();
    MV.focus(tf[0], tf[1], 'trace tip');
    return {};
  },
});
})();
