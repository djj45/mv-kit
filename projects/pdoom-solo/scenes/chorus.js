// chorus — 全片的母题：压印台上那块版。三排一模一样的小人 + 最前面的一排，主角手里握着刻刀。
// params { c: 1|2|3|4, v: n }：c = 第几次副歌（版被刻掉的程度），v = 这一镜的取景和内容。
//   c1 版是满的、油墨新鲜；c2 后排每个人胸口被刻穿一个洞；c3 版几乎空了（只有轮廓线，音乐也空了）；
//   c4 最黑最满，一把巨大的刀从右上进来，最后整块版立起来转走。
// 18 个条目共用这一个场景：同一张图，每次都不一样。
(function () {
'use strict';
const circlePts = WD.circlePts;
const CW = 1920, CH = 1080;
const PLATE = [[110, 74], [1856, 122], [1820, 1022], [136, 986]];

/** 取景：view = [x, y, w]，高按 16:9 算；返回把世界坐标映射到画面坐标的函数 */
function frame(g, f, view, drift) {
  const s = CW / view[2];
  const dx = view[0] + (drift ? drift[0] : 0), dy = view[1] + (drift ? drift[1] : 0);
  g.save();
  g.translate(-dx * s, -dy * s); g.scale(s, s);
  return { s: s, map: function (p) { return [(p[0] - dx) * s, (p[1] - dy) * s]; } };
}

function plateFace(g, f, c) {
  WD.carve(g, f, PLATE, { color: '#E3D8BF', jit: 0, holes: false, seed: 2 });
  const a = c === 1 ? 0.30 : c === 2 ? 0.24 : c === 3 ? 0.13 : 0.28;
  const gp = c === 3 ? 46 : c === 4 ? 26 : 32;
  WD.hatch(g, f, PLATE, { gap: gp, lw: 1.3, ang: 0.015, color: WD.ghost, alpha: a, wob: 3.6, seed: 3 });
  WD.contour(g, f, PLATE.concat([PLATE[0]]), 4.5, { seed: 5, boil: 0.6, prof: function () { return 1; } });
}

/** 三排小人 + 最前面一排（主角在中间，手里握着刀）。人群压在下 2/3，上面留出一条横带给歌词。 */
const BACK = [];
for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) BACK.push({ x: 336 + i * 166 + (r % 2) * 83, y: 690 + r * 122, h: 116, r: r, i: i });
const FRONT = [{ x: 596, y: 1014, h: 206 }, { x: 1330, y: 1020, h: 200 }];
const HERO = { x: 960, y: 1052, h: 250 };

function crowd(g, f, c) {
  if (c === 4) { mass(g, f); return hero(g, f, c); }
  for (const q of BACK) {
    if (c === 3) { g.save(); g.globalAlpha = 0.82; WD.figure(g, f, q.x, q.y, q.h, { outline: true, lw: 1.15, seed: q.i * 3 + q.r }); g.restore(); continue; }
    WD.figure(g, f, q.x, q.y, q.h, { lw: 0.9, seed: q.i * 3 + q.r });
    if (c === 2) WD.wipe(g, f, circlePts(q.x, q.y - q.h * 0.58, q.h * 0.15, 12), { seed: 40 + q.i + q.r * 9, jit: 1.4 });
  }
  for (const q of FRONT) {
    if (c === 3) { g.save(); g.globalAlpha = 0.86; WD.figure(g, f, q.x, q.y, q.h, { outline: true, lw: 1.5, seed: q.x }); g.restore(); continue; }
    WD.figure(g, f, q.x, q.y, q.h, { lw: 1.1, seed: q.x });
  }
  return hero(g, f, c);
}
/** c4：整个人群压成一块实黑，只有一排头是圆的 */
function mass(g, f) {
  const top = [];
  for (let i = 0; i < 22; i++) {
    const cx = 250 + i * 70;
    for (let k = 0; k <= 8; k++) { const u = Math.PI - k / 8 * Math.PI; top.push([cx + Math.cos(u) * 42, 786 - Math.sin(u) * 46]); }
  }
  const P = [[196, 1052], [1774, 1052], [1774, 786]].concat(top.reverse()).concat([[196, 786]]);
  WD.carve(g, f, P, { seed: 81, jit: 4, seg: 60, holes: true, holeA: 0.26 });
  // 几条没刻净的接缝：人挤在一起了，但还看得出是人
  for (let i = 0; i < 13; i++) {
    const x = 250 + i * 122;
    WD.gouge(g, f, [[x, 830], [x + 4, 940], [x - 2, 1046]], 5, { seed: 90 + i, pw: 0.2, rough: 0.4 });
  }
}
/** c4 的人被压成一块实黑，只有主角留白 */
function solidBlob(g, f, x, y, h, seed) {
  WD.carve(g, f, [[x - h * 0.21, y], [x - h * 0.23, y - h * 0.64], [x - h * 0.12, y - h * 0.8], [x + h * 0.12, y - h * 0.8], [x + h * 0.23, y - h * 0.64], [x + h * 0.21, y]], { color: WD.ink, seed: seed, jit: 3, holes: false });
  WD.wipe(g, f, circlePts(x, y - h * 0.9, h * 0.135, 16), { seed: seed + 1, jit: 2 });
  WD.contour(g, f, circlePts(x, y - h * 0.9, h * 0.135, 16).concat([circlePts(x, y - h * 0.9, h * 0.135, 16)[0]]), 4, { seed: seed + 2, prof: function () { return 1; } });
}
function hero(g, f, c) {
  const x = HERO.x, y = HERO.y, h = HERO.h;
  const raise = prog(f.t, f.from + 0.3, f.from + 1.6, ease.outCubic);
  const pose = { arms: [[-0.72 - 0.42 * raise, -0.98 - 0.32 * raise], [1.35, 1.5]] };
  let p;
  if (c === 3) {
    g.save(); g.globalAlpha = 0.9;
    p = WD.figure(g, f, x, y, h, { outline: true, lw: 1.7, pose: pose, seed: 9 });
    g.restore();
  } else if (c === 4) {
    p = WD.figure(g, f, x, y, h, { face: true, color: WD.paper, lw: 1.8, pose: pose, seed: 9 });
    // 留白的轮廓外面再描一圈墨，才从黑块里跳出来
    g.save(); g.globalAlpha = 0.9;
    WD.contour(g, f, [[x - 10, y], [x - 12, y - h * 0.62], [x + 12, y - h * 0.62], [x + 10, y]], 3, { seed: 21, prof: function () { return 1; } });
    g.restore();
  } else {
    p = WD.figure(g, f, x, y, h, { lw: 1.4, pose: pose, seed: 9 });
  }
  const hand = p.handL;
  if (c !== 4) WD.blade(g, f, hand[0] - 8, hand[1] - 6, 132, -2.15, { seed: 12 });
  return [x, y - h * 0.55];
}

// ---- 各种"东西"
function column(g, f, k, x) {
  x = x == null ? 940 : x;
  const base = 1000, top = base - (60 + 700 * k);
  WD.carve(g, f, [[x - 34, base], [x + 34, base], [x + 24, top], [x - 24, top]], { seed: 15, jit: 3, holes: false });
  WD.gouge(g, f, [[x - 15, base - 20], [x - 6, top + 60], [x + 8, base - 20]], 15, { seed: 16, pw: 0.3 });
  WD.gouge(g, f, [[x - 120, top + 30], [x, top + 10], [x + 120, top + 30]], 13, { seed: 17, pw: 0.4 });
  WD.blade(g, f, x - 130, top + 60, 160, 1.7, { seed: 18 });
  return [x, top + 20];
}
function room(g, f) {
  const x0 = 980, y0 = 150, w = 560, h = 380;
  WD.carve(g, f, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], { seed: 21, jit: 3 });
  WD.wipe(g, f, [[x0 + 38, y0 + 38], [x0 + w - 38, y0 + 38], [x0 + w - 38, y0 + h - 38], [x0 + 38, y0 + h - 38]], { seed: 22, jit: 3 });
  WD.figure(g, f, x0 + 180, y0 + h - 60, 140, { lw: 1, pose: { arms: [[-0.2, 0.1], [1.3, 1.4]] } });
  WD.figure(g, f, x0 + w - 150, y0 + h - 52, 132, { lw: 1 });
  for (let i = 0; i < 3; i++) WD.gouge(g, f, [[x0 + 240, y0 + 220 - i * 34], [x0 + 400, y0 + 214 - i * 34]], 9, { seed: 30 + i, pw: 0.25 });
  const id = MV.owner('doorplate');
  const px = 1000, py = 566, pw = 690, ph = 158;
  MV.within(id, function () {
    WD.inkBar(g, f, px, py, pw, ph, { seed: 25, jit: 2.2 });
    WD.lyric(g, f, { x: px + pw / 2, y: py + ph * 0.68, size: 48, maxW: pw - 70, align: 'center', mode: 'ink', color: WD.paper, dim: WD.warm, band: false, keep: false });
  });
  MV.box(g, px, py, pw, ph, { name: 'doorplate', owner: id, pad: 24 });
  return [px + pw / 2, py + ph / 2];
}
function bag(g, f) {
  const x = 900, y = 1010;
  WD.carve(g, f, [[x - 104, y], [x + 104, y], [x + 88, y - 200], [x - 88, y - 200]], { seed: 31, jit: 4 });
  for (let i = 0; i < 3; i++) {
    const mx = x - 58 + i * 58, my = y - 200 - i * 18, r = 44 + i * 12;
    WD.carve(g, f, circlePts(mx, my, r, 18), { seed: 33 + i, jit: 3 });
    WD.wipe(g, f, [[mx - r, my], [mx + r, my], [mx + r * 0.5, my + 32], [mx - r * 0.5, my + 32]], { seed: 36 + i, jit: 2 });
  }
  return [x, y - 240];
}
function shoggoth(g, f) {
  const cx = 900, cy = 560;
  const P = [];
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * Math.PI * 2;
    const r = 250 + 62 * noise1(a * 1.7 + f.t * 0.3, 7) + 30 * noise1(a * 4.3, 11) + 14 * noise1(a * 9, 17);
    P.push([cx + Math.cos(a) * r * 1.34, cy + Math.sin(a) * r * 0.78]);
  }
  WD.carve(g, f, P, { seed: 41, jit: 3, seg: 34, holes: false });
  for (let i = 0; i < 9; i++) {
    const a = hash(i, 3) * Math.PI * 2, r = 70 + hash(i, 9) * 250;
    const ex = cx + Math.cos(a) * r * 1.25, ey = cy + Math.sin(a) * r * 0.7;
    const rot = hash(i, 15) * Math.PI;
    const lens = [];
    for (let k = 0; k <= 20; k++) { const u = k / 20 * Math.PI * 2; lens.push([ex + Math.cos(u) * 44, ey + Math.sin(u) * 20]); }
    g.save(); g.translate(ex, ey); g.rotate(rot); g.translate(-ex, -ey);
    WD.wipe(g, f, lens, { seed: 50 + i, jit: 1.6 });
    WD.carve(g, f, circlePts(ex, ey, 9, 10), { color: WD.ink, seed: 70 + i, jit: 1, holes: false });
    g.restore();
  }
  return [cx, cy - 60];
}
function face(g, f) {
  const cx = 940, cy = 470;
  WD.carve(g, f, circlePts(cx, cy, 280, 34), { seed: 65, jit: 4 });
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * 118, ey = cy - 26;
    WD.wipe(g, f, circlePts(ex, ey, 78, 18), { seed: 67 + sgn, jit: 3 });
    g.save(); g.translate(ex, ey); g.rotate(sgn * 0.55); g.translate(-ex, -ey);
    WD.blade(g, f, ex, ey + 84, 128, -Math.PI / 2, { seed: 70 + sgn });
    g.restore();
  }
  return [cx + 118, cy - 26];
}
function shadowBeast(g, f) {
  const cy = 250 + 26 * Math.sin(f.t * 0.9);
  const P = [[-120, -260], [2040, -260], [2040, cy]];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30, x = 2040 - u * 2160;
    P.push([x, cy + 62 * Math.sin(u * 7 + f.t * 0.7) + 34 * noise1(u * 6, 3)]);
  }
  WD.carve(g, f, P, { seed: 81, jit: 3, seg: 54, holes: false });
  g.save(); g.globalAlpha = 0.5;
  WD.crosshatch(g, f, P, { gap: 18, lw: 5, alpha: 0.45 }, 8);
  g.restore();
  const ex = 1160, ey = cy - 60;
  const lens = [];
  for (let k = 0; k <= 20; k++) { const u = k / 20 * Math.PI * 2; lens.push([ex + Math.cos(u) * 62, ey + Math.sin(u) * 26]); }
  WD.wipe(g, f, lens, { seed: 84, jit: 2 });
  WD.carve(g, f, circlePts(ex, ey, 13, 10), { color: WD.ink, seed: 86, jit: 1, holes: false });
  return [ex, ey];
}
function moon(g, f, k) {
  const cx = 1300, cy = 800 - k * 250, r = 178;
  WD.carve(g, f, circlePts(cx, cy, r, 32), { seed: 91, jit: 3, holes: false });
  WD.wipe(g, f, circlePts(cx, cy, r - 32, 28), { seed: 92, jit: 3 });
  g.save(); g.strokeStyle = WD.red; g.lineWidth = 6; g.globalAlpha = 0.85;
  g.beginPath(); g.arc(cx, cy, r - 15, -0.4, Math.PI * 1.5); g.stroke(); g.restore();
  return [cx, cy];
}
function redPoint(g, f) {
  g.save(); g.fillStyle = WD.red;
  g.beginPath(); g.arc(1560, 620, 25, 0, Math.PI * 2); g.fill(); g.restore();
  return [1560, 620];
}
function clips(g, f) {
  g.save(); g.strokeStyle = WD.paper; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
  let last = [900, 900];
  for (let i = 0; i < 30; i++) {
    const tx = 240 + hash(i, 3) * 1480;
    const tt = prog(f.t, f.from + hash(i, 7) * 2.0, f.from + 0.9 + hash(i, 7) * 2.0, ease.inQuad);
    if (tt <= 0) continue;
    const ty = 120 + tt * (600 + hash(i, 11) * 320);
    if (ty > 1030) continue;
    const w = 68, h = 106;
    g.beginPath();
    g.moveTo(tx, ty); g.lineTo(tx - w, ty); g.lineTo(tx - w, ty + h); g.lineTo(tx + w, ty + h); g.lineTo(tx + w, ty + 28); g.lineTo(tx - 8, ty + 28);
    g.stroke();
    last = [tx, ty + h];
  }
  g.restore();
  return [clamp(last[0], 260, 1660), clamp(last[1], 200, 860)];
}
function switchBox(g, f) {
  const x = 700, y = 780;
  WD.carve(g, f, [[x - 170, y - 250], [x + 170, y - 250], [x + 170, y + 60], [x - 170, y + 60]], { seed: 101, jit: 3 });
  g.save(); g.fillStyle = WD.red;
  const arm = -0.35 + 0.5 * clamp(prog(f.t, f.from + 1.4, f.from + 2.2, ease.outCubic));
  g.save(); g.translate(x, y - 190); g.rotate(arm); g.fillRect(-18, -22, 150, 44); g.restore();
  g.fillRect(x - 60, y - 90, 120, 42); g.restore();
  const id = MV.owner('nameplate');
  const px = 380, py = 310, pw = 690, ph = 158;
  MV.within(id, function () {
    WD.inkBar(g, f, px, py, pw, ph, { seed: 103, jit: 2 });
    WD.lyric(g, f, { x: px + pw / 2, y: py + ph * 0.68, size: 48, maxW: pw - 70, align: 'center', mode: 'ink', color: WD.paper, dim: WD.warm, band: false, keep: false });
  });
  MV.box(g, px, py, pw, ph, { name: 'nameplate', owner: id, pad: 24 });
  WD.contour(g, f, [[1400, 1010], [1400, 790], [1610, 790], [1610, 1010]], 5, { seed: 105, prof: function () { return 1; } });
  WD.contour(g, f, [[1380, 830], [1380, 1010]], 5, { seed: 106, prof: function () { return 1; } });
  return [x, y - 190];
}
function loom(g, f) {
  const n = 13;
  for (let i = 0; i < n; i++) {
    const x = 240 + i * 118;
    const k = prog(f.t, f.from + 0.35 + i * 0.22, f.from + 1.0 + i * 0.22, ease.outCubic);
    if (k <= 0) continue;
    WD.gouge(g, f, [[x, 300], [x + 6, 300 + k * 700]], 7, { seed: 110 + i, pw: 0.2, rough: 0.5 });
  }
  const kk = prog(f.t, f.from + 1.0, f.from + 3.2);
  if (kk > 0) WD.hatch(g, f, [[180, 400], [1760, 400], [1760, 1020], [180, 1020]], { gap: 36, lw: 3, ang: 1.5708, alpha: 0.55 * kk, wob: 1.4, seed: 120 });
  return [240 + n * 118 / 2, 340 + 260];
}
function maskGrid(g, f) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = 300 + c * 228, y = 150 + r * 218, w = 188, h = 174;
    const covered = hash(r * 7 + c, 13) < 0.5;
    WD.carve(g, f, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { seed: 130 + r * 6 + c, jit: 2.5, holes: !covered });
    if (covered) continue;
    const ex = x + w / 2, ey = y + h / 2;
    const lens = [];
    for (let k = 0; k <= 20; k++) { const u = k / 20 * Math.PI * 2; lens.push([ex + Math.cos(u) * 56, ey + Math.sin(u) * 27]); }
    WD.wipe(g, f, lens, { seed: 160 + r * 6 + c, jit: 2 });
    WD.carve(g, f, circlePts(ex, ey, 13, 12), { color: WD.ink, seed: 190 + r * 6 + c, jit: 1, holes: false });
  }
  return [300 + 2.5 * 228, 150 + 1.5 * 218];
}
function selfCarve(g, f) {
  const x = 900, y = 1040, cut = prog(f.t, f.from + 0.6, f.to, ease.linear);
  WD.figure(g, f, x, y, 320, { lw: 1.35, pose: { arms: [[-1.15, -1.45], [1.4, 1.5]] } });
  WD.blade(g, f, x + 40, y - 300 + cut * 100, 150, 1.35, { seed: 201 });
  for (let i = 0; i < 4; i++) {
    const s = Math.pow(0.62, i + 1), k = prog(f.t, f.from + 0.5 + i * 0.5, f.from + 0.95 + i * 0.5, ease.outCubic);
    if (k <= 0) continue;
    g.save(); g.globalAlpha = k;
    WD.figure(g, f, x + 220 + i * 96, y - 30 + i * 24, 320 * s, { lw: 0.9 });
    g.restore();
  }
  return [x + 40, y - 300 + cut * 100];
}

// ---- 每个条目的取景 / 内容 / 歌词。lyric 直接交给 WD.lyric。
const SPEC = {
  '1,1': { view: [0, 0, 1920], drift: 16, obj: null,
    lyric: { x: 960, y: 430, size: 200, align: 'center', font: 'big', mode: 'mono', band: true, bandColor: WD.ink, hot: [3, 4], maxW: 1600, layer: 'overlay' } },
  '1,2': { view: [320, 260, 1500], drift: 12, obj: 'column',
    lyric: { x: 140, y: 292, size: 110, align: 'left', mode: 'ink', color: WD.ink, maxW: 1160 } },
  '1,3': { view: [560, 40, 1360], drift: 8, obj: 'room', onPlate: true },
  '1,4': { view: [400, 300, 1220], drift: 8, obj: 'bag',
    lyric: { x: 960, y: 918, size: 66, align: 'center', mode: 'strip', layer: 'overlay' } },
  '1,5': { view: [120, 120, 1660], drift: 14, obj: 'shoggoth',
    lyric: { x: 960, y: 215, size: 118, align: 'center', mode: 'carve', maxW: 1600 } },
  '1,6': { view: [420, 40, 1280], drift: 6, obj: 'face', two: [
      { x: 1240, y: 600, size: 76, align: 'left', mode: 'ink', color: WD.ink, maxW: 520, words: [0, 2] },
      { x: 1240, y: 712, size: 76, align: 'left', mode: 'ink', color: WD.ink, maxW: 520, words: [2, 4], hot: [2, 3] }] },

  '2,1': { view: [0, 0, 1920], drift: -14, obj: null,
    lyric: { x: 960, y: 430, size: 200, align: 'center', font: 'big', mode: 'mono', band: true, bandColor: WD.ink, hot: [3, 4], maxW: 1620, layer: 'overlay' } },
  '2,2': { view: [140, 0, 1620], drift: 10, obj: 'beast',
    lyric: { x: 960, y: 560, size: 110, align: 'center', mode: 'ink', color: WD.ink, maxW: 1620 } },
  '2,3': { view: [180, 40, 1680], drift: -10, obj: 'moon',
    lyric: { x: 140, y: 430, size: 130, align: 'left', mode: 'ink', color: WD.ink, hot: [3, 4], maxW: 820 } },
  '2,4': { view: [0, 0, 1920], drift: 10, obj: 'point',
    lyric: { x: 960, y: 380, size: 190, align: 'center', font: 'big', mode: 'mono', band: true, bandColor: WD.ink, hot: [1, 2], maxW: 1600, layer: 'overlay' } },

  '3,1': { view: [0, 0, 1920], drift: 8, obj: null, lead: true,
    lyric: { x: 1080, y: 430, size: 44, align: 'left', font: 'lbl', mode: 'label', color: WD.ink, band: false, maxW: 760 } },
  '3,2': { view: [100, 80, 1740], drift: -8, obj: 'clips',
    lyric: { x: 960, y: 300, size: 96, align: 'center', mode: 'erased', band: true, bandColor: WD.ink, maxW: 1560 } },
  '3,3': { view: [140, 40, 1560], drift: 6, obj: 'switch', onPlate: true },
  '3,4': { view: [0, 0, 1920], drift: 4, bare: true,
    lyric: { x: 960, y: 560, size: 190, align: 'center', font: 'big', mode: 'erased', band: false, color: WD.ink, dim: WD.ghost, maxW: 1660, layer: 'overlay' } },

  '4,1': { view: [0, 0, 1920], drift: -16, obj: null,
    lyric: { x: 960, y: 440, size: 220, align: 'center', font: 'big', mode: 'mono', band: true, bandColor: WD.ink, hot: [3, 4], maxW: 1600, layer: 'overlay' } },
  '4,2': { view: [40, 20, 1840], drift: 8, obj: 'loom',
    lyric: { x: 960, y: 250, size: 120, align: 'center', mode: 'ink', color: WD.ink, maxW: 1620 } },
  '4,3': { view: [160, 80, 1660], drift: -6, obj: 'mask',
    lyric: { x: 960, y: 918, size: 72, align: 'center', mode: 'strip', layer: 'overlay' } },
  '4,4': { view: [380, 60, 1260], drift: 6, obj: 'self',
    lyric: { x: 960, y: 290, size: 190, align: 'center', font: 'big', mode: 'erased', band: true, bandColor: WD.ink, maxW: 1600 } },
};

MV.scene('chorus', {
  render: function (g, f) {
    const c = (f.params && f.params.c) || 1, v = (f.params && f.params.v) || 1;
    const sp = SPEC[c + ',' + v] || SPEC['1,1'];
    const drift = [sp.drift * (f.p - 0.5) * 2, sp.drift * 0.3 * (f.p - 0.5) * 2];

    WD.ground(g, f, { ox: 0, oy: 0 });

    if (sp.bare) {
      // 只有歌词的画面：整张纸 + 一个空的版框（版上什么都没有了）
      WD.contour(g, f, PLATE.concat([PLATE[0]]), 3.2, { seed: 9, color: WD.ghost, boil: 0.5, prof: function () { return 1; } });
      WD.cross(g, f, 250, 880, 36, { color: WD.ghost });
      MV.focus(960, 560, 'the last word');
      MV.overlay(function (o) { WD.lyric(o, f, sp.lyric); });
      return {};
    }

    const V = frame(g, f, sp.view, drift);
    plateFace(g, f, c);
    WD.cross(g, f, 300, 210, 40, { lw: 2.4, color: c === 3 ? WD.ghost : WD.ink });

    let target = crowd(g, f, c);
    if (sp.obj === 'column') target = column(g, f, prog(f.t, f.from + 0.4, f.from + 2.2, ease.outCubic), 1560);
    else if (sp.obj === 'room') target = room(g, f);
    else if (sp.obj === 'bag') target = bag(g, f);
    else if (sp.obj === 'shoggoth') target = shoggoth(g, f);
    else if (sp.obj === 'face') target = face(g, f);
    else if (sp.obj === 'beast') target = shadowBeast(g, f);
    else if (sp.obj === 'moon') target = moon(g, f, prog(f.t, f.from, f.to, ease.outCubic));
    else if (sp.obj === 'point') target = redPoint(g, f);
    else if (sp.obj === 'clips') target = clips(g, f);
    else if (sp.obj === 'switch') target = switchBox(g, f);
    else if (sp.obj === 'loom') target = loom(g, f);
    else if (sp.obj === 'mask') target = maskGrid(g, f);
    else if (sp.obj === 'self') target = selfCarve(g, f);

    const tp = V.map(target);
    g.restore();
    MV.focus(tp[0], tp[1], 'plate');

    if (sp.lead) {
      // 小标签不贴在主角身上：放到人群上方的空处，用一根短引线指回主角
      MV.lyric(function () {
        WD.contour(g, f, [[1096, 452], [1014, 548], [866, 690]], 3.4, { color: WD.ink, seed: 301, boil: 0.6, prof: function () { return 1; } });
        g.save(); g.fillStyle = WD.ink;
        g.beginPath(); g.arc(866, 690, 9, 0, Math.PI * 2); g.fill(); g.restore();
      });
    }
    const rows = sp.two || (sp.lyric ? [sp.lyric] : []);
    if (!sp.onPlate && rows.length) {
      if (rows.some(function (r) { return r.layer === 'overlay'; })) MV.overlay(function (o) { rows.forEach(function (r) { WD.lyric(o, f, r); }); });
      else rows.forEach(function (r) { WD.lyric(g, f, r); });
    }
    return {};
  },
});
})();