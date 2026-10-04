// draft.js — 工程图的家具：纸、图框、尺寸线、引线、剖面符号、印章、标题栏、网点、绘图笔。
//
// 全部是画出来的线：没有模糊、没有阴影、没有渐变。手绘感在这里是**零**——这是一台机器画的图。
(function (G) {
'use strict';
const LK = G.LK;

let TEXP = null, TONEP = null;
/** 纸纹：init 里生成一次，之后每帧只 fillRect 一次（按世界坐标钉住，镜头平移时不游）。 */
function paperTex(g) {
  if (!TEXP) {
    const S = 256, c = mk(S, S), h = c.getContext('2d');
    h.fillStyle = LK.paper; h.fillRect(0, 0, S, S);
    const rnd = mulberry32(90210);
    const im = h.getImageData(0, 0, S, S), d = im.data;
    for (let i = 0; i < S * S; i++) {
      const n = (rnd() - 0.5) * 7 + (hash(i % S, (i / S) | 0, 3) - 0.5) * 5;
      d[i * 4] += n; d[i * 4 + 1] += n; d[i * 4 + 2] += n * 1.1;
    }
    h.putImageData(im, 0, 0);
    // 极淡的纤维
    h.globalAlpha = 0.05; h.strokeStyle = '#8FA0C8';
    for (let i = 0; i < 90; i++) {
      const y = rnd() * S; h.beginPath(); h.moveTo(0, y);
      for (let x = 0; x <= S; x += 32) h.lineTo(x, y + (rnd() - 0.5) * 3);
      h.stroke();
    }
    TEXP = c;
  }
  return g.createPattern(TEXP, 'repeat');
}
/** 网点（halftone）：三档密度，init 里生成（大面积实心用它，不用灰）。 */
function tonePattern(g, dens) {
  if (!TONEP) {
    TONEP = [0.26, 0.5, 0.78].map(al => {
      const S = 8, c = mk(S, S), h = c.getContext('2d');
      h.fillStyle = LK.a(LK.deep, al); h.beginPath(); h.arc(S / 2, S / 2, 1.35, 0, TAU); h.fill();
      return c;
    });
  }
  return g.createPattern(TONEP[dens == null ? 1 : Math.max(0, Math.min(2, dens))], 'repeat');
}

/** 画一整张纸（含图框、分区标记）。o: { zone:true, margin } */
function paper(g, o) {
  o = o || {};
  g.save();
  g.fillStyle = LK.paper; g.fillRect(-4, -4, W + 8, H + 8);
  g.globalAlpha = o.tex == null ? 0.5 : o.tex;
  g.fillStyle = paperTex(g); g.fillRect(-4, -4, W + 8, H + 8);
  g.restore();
  if (o.frame !== false) frame(g, o);
}
/** 图框：外框 + 内框 + 分区标记（A B C…/1 2 3…），图纸感的来源。 */
function frame(g, o) {
  o = o || {};
  const m = o.margin == null ? 44 : o.margin, m2 = m + 26;
  g.save();
  g.strokeStyle = o.color || LK.ink; g.lineWidth = 2.2;
  g.strokeRect(m, m, W - m * 2, H - m * 2);
  g.lineWidth = 0.9; g.strokeRect(m2, m2, W - m2 * 2, H - m2 * 2);
  if (o.zone !== false) {
    LK.mono(g, 13, { track: 0.1 });
    g.fillStyle = LK.ink2; g.textAlign = 'center'; g.textBaseline = 'middle';
    const cols = 8, rows = 5;
    for (let i = 0; i < cols; i++) {
      const x = m2 + (W - m2 * 2) * (i + 0.5) / cols;
      g.fillText(String(i + 1), x, m + 13); g.fillText(String(i + 1), x, H - m - 13);
      g.beginPath(); g.moveTo(m2 + (W - m2 * 2) * i / cols, m); g.lineTo(m2 + (W - m2 * 2) * i / cols, m2); g.stroke();
      g.beginPath(); g.moveTo(m2 + (W - m2 * 2) * i / cols, H - m); g.lineTo(m2 + (W - m2 * 2) * i / cols, H - m2); g.stroke();
    }
    for (let i = 0; i < rows; i++) {
      const y = m2 + (H - m2 * 2) * (i + 0.5) / rows, ch = 'ABCDE'[i];
      g.fillText(ch, m + 13, y); g.fillText(ch, W - m - 13, y);
      g.beginPath(); g.moveTo(m, m2 + (H - m2 * 2) * i / rows); g.lineTo(m2, m2 + (H - m2 * 2) * i / rows); g.stroke();
      g.beginPath(); g.moveTo(W - m, m2 + (H - m2 * 2) * i / rows); g.lineTo(W - m2, m2 + (H - m2 * 2) * i / rows); g.stroke();
    }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }
  g.restore();
}

// ---------------------------------------------------------------- 线
function line(g, x0, y0, x1, y1, o) {
  o = o || {};
  g.save();
  g.strokeStyle = o.color || LK.ink; g.lineWidth = o.w == null ? 1 : o.w;
  g.lineCap = o.cap || 'butt'; g.setLineDash(o.dash || []);
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.restore();
}
function poly(g, pts, o) {
  o = o || {};
  g.save();
  g.strokeStyle = o.color || LK.ink; g.lineWidth = o.w == null ? 1 : o.w;
  g.lineJoin = 'round'; g.lineCap = o.cap || 'round'; g.setLineDash(o.dash || []);
  g.beginPath();
  pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
  if (o.closed) g.closePath();
  if (o.fill) { g.fillStyle = o.fill; g.fill(); }
  if (o.w !== 0) g.stroke();
  g.restore();
}
/** 折线按弧长画到 upto 处（绘图仪的笔 / 生长中的线）。返回笔尖坐标。 */
function pen(g, pts, upto, o) {
  o = o || {};
  if (!pts || pts.length < 2) return null;
  let total = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let left = clamp(upto == null ? 1 : upto, 0, 1) * total, tip = pts[pts.length - 1];
  g.save();
  g.strokeStyle = o.color || LK.ink; g.lineWidth = o.w == null ? 1.2 : o.w;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(o.dash || []);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (left <= 0) { tip = pts[i - 1]; break; }
    const u = Math.min(1, left / seg[i - 1]);
    const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u;
    g.lineTo(x, y); left -= seg[i - 1]; tip = [x, y];
  }
  g.stroke(); g.restore();
  return tip;
}
/** 箭头（实心三角），ang 弧度。 */
function arrow(g, x, y, ang, size, color) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = color || LK.ink;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(-size, -size * 0.28); g.lineTo(-size, size * 0.28); g.closePath(); g.fill();
  g.restore();
}
/** 剖面线：clip 一个路径函数，然后 45° 平行线。 */
function hatch(g, pathFn, o) {
  o = o || {};
  g.save();
  g.beginPath(); pathFn(g); g.clip();
  const gap = o.gap == null ? 11 : o.gap, ang = o.angle == null ? -Math.PI / 4 : o.angle;
  g.translate(o.cx || W / 2, o.cy || H / 2); g.rotate(ang);
  g.strokeStyle = o.color || LK.hatch; g.lineWidth = o.w == null ? 1 : o.w;
  const R = Math.hypot(W, H);
  g.beginPath();
  for (let k = -R / gap; k <= R / gap; k++) { g.moveTo(k * gap, -R); g.lineTo(k * gap, R); }
  g.stroke(); g.restore();
}
/** 网点填充（大面积实心用，代替灰）。 */
function toneFill(g, pathFn, dens, color) {
  g.save(); g.beginPath(); pathFn(g); g.clip();
  g.fillStyle = color ? g.createPattern((function () { const S = 8, c = mk(S, S), h = c.getContext('2d'); h.fillStyle = color; h.beginPath(); h.arc(S / 2, S / 2, 1.5, 0, TAU); h.fill(); return c; })(), 'repeat') : tonePattern(g, dens);
  g.fillRect(0, 0, W, H); g.restore();
}

// ---------------------------------------------------------------- 尺寸线
const AR = (o) => (o && o.arrow == null ? 12 : (o && o.arrow)) || 12;
/**
 * 对齐尺寸线：p0 → p1，向法线方向偏 off。文字写在断开的中间（工程图写法）。
 * o: { text, off, size, color, ext (延伸线长度), tick:true 用斜线代替箭头, above }
 */
function dim(g, p0, p1, off, o) {
  o = o || {};
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const a = [p0[0] + nx * off, p0[1] + ny * off], b = [p1[0] + nx * off, p1[1] + ny * off];
  const col = o.color || LK.ink, w = o.w == null ? 1 : o.w;
  g.save();
  // 延伸线
  if (o.ext !== false) {
    const e = o.extLen == null ? 14 : o.extLen;
    for (const [p, q] of [[p0, a], [p1, b]]) {
      const sx = Math.sign(q[0] - p[0]) || 0, sy = Math.sign(q[1] - p[1]) || 0;
      line(g, p[0] + sx * 6, p[1] + sy * 6, q[0] + sx * e * Math.abs(nx ? 1 : 1) * 0.6 + nx * e * 0.4, q[1] + sy * e * 0.4 + ny * e * 0.4, { color: col, w: w * 0.7 });
    }
  }
  const text = o.text == null ? '' : String(o.text);
  LK.mono(g, o.size || 15, { track: 0.08 });
  const tw = text ? g.measureText(text).width : 0;
  const gap = tw ? tw + (o.pad == null ? 18 : o.pad) : 0;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const seg = (t0, t1) => {
    g.beginPath();
    g.moveTo(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0);
    g.lineTo(a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1);
    g.stroke();
  };
  g.strokeStyle = col; g.lineWidth = w;
  if (tw && L > gap * 1.3) {
    const t = gap / L / 2;
    seg(0, 0.5 - t); seg(0.5 + t, 1);
  } else seg(0, 1);
  // 箭头 / 斜线
  if (o.tick) { }
  else if (L > 26) { arrow(g, a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]), AR(o), col); arrow(g, b[0], b[1], Math.atan2(a[1] - b[1], a[0] - b[0]), AR(o), col); }
  else { arrow(g, a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI, AR(o), col); arrow(g, b[0], b[1], Math.atan2(a[1] - b[1], a[0] - b[0]) + Math.PI, AR(o), col); }
  if (text) {
    let ang = Math.atan2(dy, dx);
    if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
    g.save(); g.translate(mid[0], mid[1]); g.rotate(ang);
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(text, 0, -(o.size || 15) * 0.35);
    g.restore();
  }
  g.restore();
  return { a, b, mid };
}
/** 水平 / 垂直尺寸线（y 是尺寸线所在的坐标）。 */
function dimH(g, x0, x1, y, o) { return dim(g, [x0, o && o.at0 != null ? o.at0 : y], [x1, o && o.at1 != null ? o.at1 : y], 0, Object.assign({}, o, { ext: false })); }
function dimV(g, y0, y1, x, o) { return dim(g, [o && o.at0 != null ? o.at0 : x, y0], [o && o.at1 != null ? o.at1 : x, y1], 0, Object.assign({}, o, { ext: false })); }

/** 半径 / 直径标注：从圆心指向圆周。 */
function dimR(g, c, r, ang, o) {
  o = o || {};
  const p = [c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r];
  const q = [c[0] + Math.cos(ang) * (r + (o.lead == null ? 46 : o.lead)), c[1] + Math.sin(ang) * (r + (o.lead == null ? 46 : o.lead))];
  line(g, p[0], p[1], q[0], q[1], { color: o.color || LK.ink, w: 0.9 });
  arrow(g, p[0], p[1], ang + Math.PI, AR(o), o.color || LK.ink);
  const txt = (o.prefix || 'R') + (o.text == null ? '' : o.text);
  LK.mono(g, o.size || 15, {});
  g.save(); g.fillStyle = o.color || LK.ink; g.textBaseline = 'middle';
  g.textAlign = Math.cos(ang) >= 0 ? 'left' : 'right';
  g.fillText(txt, q[0] + Math.cos(ang) * 8, q[1] + Math.sin(ang) * 8);
  g.restore();
}
/** 中心线 + 中心标记。 */
function center(g, x, y, r, o) {
  o = o || {};
  const col = o.color || LK.ink2;
  g.save(); g.strokeStyle = col; g.lineWidth = o.w || 0.8; g.setLineDash([10, 5, 2.5, 5]);
  g.beginPath(); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
  g.restore();
}
/** 剖切符号：一条粗短线 + 箭头 + 字母。 */
function sectionMark(g, p0, p1, letter, o) {
  o = o || {};
  const col = o.color || LK.ink;
  line(g, p0[0], p0[1], p1[0], p1[1], { color: col, w: 0.9, dash: [12, 5, 3, 5] });
  const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + Math.PI / 2;
  for (const p of [p0, p1]) {
    line(g, p[0], p[1], p[0] + Math.cos(ang) * 26, p[1] + Math.sin(ang) * 26, { color: col, w: 2.4 });
    arrow(g, p[0] + Math.cos(ang) * 30, p[1] + Math.sin(ang) * 30, ang, 14, col);
  }
  LK.display(g, 20);
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(letter, p0[0] - Math.cos(ang) * 18, p0[1] - Math.sin(ang) * 18);
  g.fillText(letter, p1[0] - Math.cos(ang) * 18, p1[1] - Math.sin(ang) * 18);
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}
/** 引线标注：点 → 折线 → 文字。draw 0..1 逐段画出。 */
function leader(g, x, y, dx, dy, text, o) {
  o = o || {};
  const k = o.draw == null ? 1 : clamp(o.draw), sx = Math.sign(dx) || 1;
  const ex = x + dx, ey = y + dy, qx = ex + sx * (o.run == null ? 48 : o.run);
  const segs = [[x, y, ex, ey], [ex, ey, qx, ey]], L1 = Math.hypot(dx, dy), Lt = L1 + (o.run == null ? 48 : o.run);
  g.save();
  g.strokeStyle = o.color || LK.ink2; g.lineWidth = 0.9;
  g.fillStyle = o.color || LK.ink;
  g.beginPath(); g.arc(x, y, o.dot == null ? 2.6 : o.dot, 0, TAU); g.fill();
  let left = clamp(k * 1.5) * Lt;
  g.beginPath(); g.moveTo(x, y);
  for (const s of segs) { const l = Math.hypot(s[2] - s[0], s[3] - s[1]), u = clamp(left / l); g.lineTo(s[0] + (s[2] - s[0]) * u, s[1] + (s[3] - s[1]) * u); left -= l; if (left <= 0) break; }
  g.stroke();
  const ta = prog(k, 0.55, 1);
  if (ta > 0 && text) {
    g.globalAlpha = ta; LK.mono(g, o.size || 15, { track: 0.06 });
    g.textBaseline = 'middle'; g.textAlign = sx > 0 ? 'left' : 'right';
    g.fillStyle = o.color || LK.ink;
    g.fillText(text, qx + sx * 8, ey - 1);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  }
  g.restore();
}

// ---------------------------------------------------------------- 文字
/** 等宽小字（工程图上的真字）。o: size, color, track, align, alpha */
function micro(g, text, x, y, o) {
  o = o || {};
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  LK.mono(g, o.size || 15, { weight: o.weight, track: o.track == null ? 0.06 : o.track });
  g.fillStyle = o.color || LK.ink;
  g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  g.fillText(String(text), x, y);
  g.restore();
  return x;
}
/** 宽字距的机器标签。 */
function tag(g, text, x, y, o) { return micro(g, text, x, y, Object.assign({ size: 14, track: 0.28, color: LK.ink2 }, o)); }
/** display 大字。o: {size, color, track, align, weight, fat, alpha} 返回宽度。 */
function display(g, text, x, y, o) {
  o = o || {};
  g.save();
  if (o.alpha != null) g.globalAlpha *= o.alpha;
  LK.display(g, o.size || 120, { weight: o.weight || 700, track: o.track || 0 });
  g.fillStyle = o.color || LK.ink;
  g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  const t = String(text);
  if (o.fat) { g.lineWidth = (o.size || 120) * o.fat; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle; g.strokeText(t, x, y); }
  g.fillText(t, x, y);
  g.restore();
  return LK.measure(g, t, o.size || 120, { track: o.track || 0 });
}
/** 从右往左被"笔"写出来的字：用裁剪擦除，笔尖带一个墨点。o: {upto, penDot, color, size, track, align} */
function writeText(g, text, x, y, upto, o) {
  o = o || {};
  const size = o.size || 200;
  LK.display(g, size, { track: o.track || 0 });
  const w = g.measureText(String(text)).width;
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const k = clamp(upto == null ? 1 : upto);
  g.save();
  g.beginPath(); g.rect(x0 - size, y - size * 1.2, w * k + size, size * 2.6); g.clip();
  g.fillStyle = o.color || LK.ink;
  if (o.fat) { g.lineWidth = size * o.fat; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle; g.strokeText(String(text), x0, y); }
  g.fillText(String(text), x0, y);
  g.restore();
  if (o.penDot !== false && k > 0 && k < 1) {
    g.save(); g.fillStyle = o.dotColor || o.color || LK.blue;
    g.beginPath(); g.arc(x0 + w * k, y - size * 0.32, o.dot == null ? size * 0.035 : o.dot, 0, TAU); g.fill(); g.restore();
  }
  return { x: x0, w };
}

// ---------------------------------------------------------------- 印章 / 标题栏 / 修改云
/** 图章：双线圆角框 + 大字 + 小字，可以转一个角度。o: {size, rot, color, sub, w} */
function stamp(g, text, x, y, o) {
  o = o || {};
  const size = o.size || 64, rot = o.rot == null ? -0.06 : o.rot, col = o.color || LK.blue;
  const sub = o.sub ? String(o.sub) : '';
  LK.display(g, size, { track: 0.04 });
  const tw = g.measureText(String(text)).width;
  LK.mono(g, size * 0.2, { track: 0.16 });
  const sw = sub ? g.measureText(sub).width : 0;
  const w = Math.max(tw, sw) + size * 0.62, h = size * (sub ? 1.55 : 1.06);
  g.save();
  g.translate(x, y); g.rotate(rot); g.translate(-w / 2, -h / 2);
  g.globalAlpha = o.alpha == null ? 0.92 : o.alpha;
  g.strokeStyle = col; g.lineWidth = o.w == null ? 4 : o.w;
  g.strokeRect(0, 0, w, h);
  g.lineWidth = (o.w == null ? 4 : o.w) * 0.42; g.strokeRect(size * 0.1, size * 0.1, w - size * 0.2, h - size * 0.2);
  LK.display(g, size, { track: 0.04 });
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(text), w / 2, h * (sub ? 0.41 : 0.54));
  if (sub) { LK.mono(g, size * 0.2, { track: 0.16 }); g.fillStyle = col; g.fillText(sub, w / 2, h * 0.79); }
  g.restore();
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  return { w, h };
}
/**
 * 标题栏（图纸右下角）。rows: [[key, value], …]，最后一行是标题。
 * o: { w, h, rows, title, titleSub, x, y, color, rev }
 */
// qa: the title block owns its rows, band and every text in them (MV.group); other text landing on it is a clash
function titleBlock(g, o) { return MV.group('title block', () => titleBlockDraw(g, o)); }
function titleBlockDraw(g, o) {
  o = o || {};
  const rows = o.rows || [];
  const w = o.w == null ? 620 : o.w;
  const x = o.x == null ? W - 70 - w : o.x;
  // 内容决定高度（一行两行字至少要 ~44 px 才不挤），**然后**才定 y：
  // 没给 y 的时候按最终高度贴在图框内侧（H-80），否则它一长高就越过内框，压住图框的分区号。
  const ideal = rows.length * 46 + 76;
  const BOTM = H - 96;                                           // 下沿留出 26 px：内框在 H-70，下面还有分区号带
  const cap = BOTM - (o.y == null ? 0 : 0);
  let h = clamp(Math.max(o.h == null ? 250 : o.h, Math.min(ideal, cap)), 120, Math.max(120, cap));
  if (o.y != null) h = Math.min(h, Math.max(120, BOTM - o.y));   // 给了 y 的也按同一条底线收
  const y = o.y == null ? BOTM - h : o.y;
  const col = o.color || LK.ink, pad = 24;
  const th = clamp(h * 0.30, 58, 92);                            // 标题带
  const rowH = (h - th) / Math.max(1, rows.length);
  // 字号跟着行高走：行矮就小一点，但**两端一定留在格线里**（标签居中在 0.28 行高、数值在 0.66）
  const labSize = clamp(rowH * 0.26, 7, 12), valSize = clamp(rowH * 0.36, 10, 16.5);
  const titleSize = clamp(Math.min(w * 0.052, th * 0.42), 18, 34);
  const revSize = clamp(Math.min(w * 0.040, th * 0.38), 15, 27);
  g.save();
  g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  g.fillStyle = LK.a(LK.paper2, 0.92); g.fillRect(x, y, w, h);
  g.strokeStyle = col; g.lineWidth = 2.4; g.strokeRect(x, y, w, h);
  g.textBaseline = 'middle';
  rows.forEach((r, i) => {
    const ry = y + rowH * i;
    MV.box(g, x, ry, w, rowH, { name: 'title-block row' });   // qa
    if (i) { g.lineWidth = 0.8; g.strokeStyle = LK.ink2; g.beginPath(); g.moveTo(x, ry); g.lineTo(x + w, ry); g.stroke(); }
    LK.mono(g, labSize, { track: 0.14 }); g.fillStyle = LK.ink2;
    g.fillText(String(r[0]).toUpperCase(), x + pad, ry + rowH * 0.28);
    LK.mono(g, valSize, { track: 0.06 }); g.fillStyle = col;
    g.fillText(String(r[1]), x + pad, ry + rowH * 0.66);
  });
  const ty0 = y + h - th;
  g.lineWidth = 1.6; g.strokeStyle = col;
  MV.box(g, x, ty0, w, th, { name: 'title band' });   // qa
  g.beginPath(); g.moveTo(x, ty0); g.lineTo(x + w, ty0); g.stroke();
  LK.display(g, titleSize, { track: 0.03 });
  g.fillStyle = LK.blue; g.textAlign = 'left';
  g.fillText(String(o.title || 'AGI \u00b7 BOLT'), x + pad, ty0 + th * 0.42);
  if (o.titleSub) {
    LK.mono(g, Math.min(12, th * 0.19), { track: 0.18 }); g.fillStyle = LK.ink2;
    g.fillText(String(o.titleSub), x + pad, y + h - Math.max(15, th * 0.21));
  }
  if (o.rev) {
    LK.display(g, revSize, { track: 0.05 });
    g.fillStyle = LK.blue; g.textAlign = 'right';
    g.fillText(o.rev, x + w - pad, ty0 + th * 0.40);
    g.textAlign = 'left';
  }
  g.restore();
  g.textBaseline = 'alphabetic';
  return { x, y, w, h, ty0, th, rowH };
}

/** 修改云（工程变更的云线）。pts 是中心路径上的点。 */
function revCloud(g, pts, o) {
  o = o || {};
  const r = o.r == null ? 22 : o.r, col = o.color || LK.blue;
  g.save(); g.strokeStyle = col; g.lineWidth = o.w == null ? 1.6 : o.w;
  g.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / (r * 1.6)));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.arc(x, y, r * (0.75 + 0.5 * hash(i * 7 + k, o.seed || 3, 5)), ang - 1.2, ang + 1.2);
    }
  }
  g.stroke(); g.restore();
}
/** 折线（运输折痕）。 */
function foldLine(g, x, y0, y1, o) {
  o = o || {};
  line(g, x, y0, x, y1, { color: o.color || LK.ink3, w: 0.9, dash: [14, 6, 2, 6] });
  LK.mono(g, 11, { track: 0.2 }); g.save(); g.fillStyle = LK.ink3;
  g.translate(x + 10, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
  g.fillText('FOLD', 0, 0); g.restore();
}
/** 撕裂边 / 断口。 */
function breakEdge(g, x0, y0, x1, y1, o) {
  o = o || {};
  const n = 14, pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const k = (i === 0 || i === n) ? 0 : (hash(i, o.seed || 7, 2) - 0.5) * (o.amp == null ? 18 : o.amp);
    pts.push([x0 + (x1 - x0) * u + k * (y1 - y0 ? 1 : 0), y0 + (y1 - y0) * u + k * (x1 - x0 ? 1 : 0)]);
  }
  poly(g, pts, { color: o.color || LK.ink, w: o.w == null ? 2 : o.w });
  return pts;
}
/** 刻度尺：水平或垂直，每 step 一个小刻度。 */
function ruler(g, x0, y0, x1, y1, o) {
  o = o || {};
  const col = o.color || LK.ink2, step = o.step == null ? 24 : o.step;
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / step), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const nx = -uy, ny = ux;
  g.save(); g.strokeStyle = col; g.lineWidth = o.w || 0.9;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
  for (let i = 0; i <= n; i++) {
    const big = i % 5 === 0, len = big ? 14 : 7;
    const x = x0 + ux * step * i, y = y0 + uy * step * i;
    g.moveTo(x, y); g.lineTo(x + nx * len, y + ny * len);
  }
  g.stroke();
  if (o.labels !== false) {
    LK.mono(g, 11, { track: 0.1 }); g.fillStyle = col; g.textAlign = 'center';
    for (let i = 0; i <= n; i += 5) {
      const x = x0 + ux * step * i, y = y0 + uy * step * i;
      g.save(); g.translate(x + nx * 20, y + ny * 20);
      g.fillText(String(i * (o.unit || 1)), 0, 0); g.restore();
    }
    g.textAlign = 'left';
  }
  g.restore();
}
/** 虚线框（"这个区域要改"）。 */
function dashedBox(g, x, y, w, h, o) {
  o = o || {};
  g.save(); g.strokeStyle = o.color || LK.blue; g.lineWidth = o.w || 1.4; g.setLineDash(o.dash || [12, 7]);
  g.strokeRect(x, y, w, h); g.restore();
}
/**
 * 表格（规格书、数据表）。cw 可以是数字（每列等宽）或数组（每列各自的宽度）。
 * 返回一个表格对象，交给 DR.cell 放字——**字一律用 DR.cell 放**，它把字垂直居中并在超宽时自动缩字号，
 * 这样任何一行都不会跑到格子外面去。
 */
// qa: 表格和它的字在同一个 group 里 —— 格子里的字从严（box-cross 是错误），别人的字碰到只算 clash
function table(g, x, y, cols, rows, o) { return MV.group('table', () => tableDraw(g, x, y, cols, rows, o)); }
function tableDraw(g, x, y, cols, rows, o) {
  o = o || {};
  const cw = Array.isArray(o.cw) ? o.cw.slice(0, cols) : new Array(cols).fill(o.cw || 150);
  while (cw.length < cols) cw.push(cw[cw.length - 1] || 150);
  const rh = o.rh || 30, col = o.color || LK.ink, w = cw.reduce((a, b) => a + b, 0), h = rows * rh;
  const colX = []; let acc = 0;
  for (const k of cw) { colX.push(x + acc); acc += k; }
  g.save(); g.strokeStyle = col; g.lineWidth = o.w == null ? 1 : o.w;
  for (let i = 0; i <= rows; i++) { g.beginPath(); g.moveTo(x, y + i * rh); g.lineTo(x + w, y + i * rh); g.stroke(); }
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(colX[i] == null ? x + w : colX[i], y); g.lineTo(colX[i] == null ? x + w : colX[i], y + h); g.stroke(); }
  g.restore();
  const owner = MV.owner('table');   // qa: DR.cell(g, T, …) draws as this owner, so its text is checked strictly
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) MV.box(g, colX[c], y + r * rh, cw[c], rh, { name: 'cell', owner });
  return { x, y, cw, rh, cols, rows, colX, w, h, owner, rowY: Array.from({ length: rows }, (_, i) => y + i * rh) };
}
/**
 * 在第 (col, row) 格里放一行字：垂直居中、左边留 pad；比格子宽时自动把字号缩到装得下（o.shrink:false 关掉）。
 * o: size, color, track, font 'mono'|'display', align 'left'|'right'|'center', pad, alpha, dy, shrink
 */
function cell(g, t, col, row, text, o) {
  o = o || {};
  if (text == null || col < 0 || col >= t.cols || row < 0 || row >= t.rows) return 0;
  const pad = o.pad == null ? 14 : o.pad, avail = t.cw[col] - pad * 2;
  let size = o.size || 15;
  const setF = sz => { if (o.font === 'display') LK.display(g, sz, { weight: o.weight || 700, track: o.track || 0 }); else LK.mono(g, sz, { weight: o.weight, track: o.track == null ? 0.06 : o.track }); };
  setF(size);
  let tw = g.measureText(String(text)).width;
  if (tw > avail && o.shrink !== false && tw > 0) { size = Math.max(8, size * avail / tw); setF(size); tw = g.measureText(String(text)).width; }
  const bx = o.align === 'right' ? t.colX[col] + t.cw[col] - pad - tw
    : o.align === 'center' ? t.colX[col] + (t.cw[col] - tw) / 2
    : t.colX[col] + pad;
  g.save();
  g.globalAlpha *= o.alpha == null ? 1 : o.alpha;
  g.fillStyle = o.color || LK.ink; g.textBaseline = 'middle';
  MV.within(t.owner, () => g.fillText(String(text), bx, t.rowY[row] + t.rh * 0.5 + (o.dy || 0)));
  g.restore();
  return tw;
}
/** BMP / 打孔纸带的孔（细节道具）。 */
function sprocket(g, x, y, h, o) {
  o = o || {};
  g.save(); g.fillStyle = o.color || LK.a(LK.ink, 0.5);
  for (let i = 0; i * 18 < h; i++) { g.beginPath(); g.arc(x, y + i * 18 + 6, 3.1, 0, TAU); g.fill(); }
  g.restore();
}

const DR = {
  paperTex, tonePattern, paper, frame, line, poly, pen, arrow, hatch, toneFill,
  dim, dimH, dimV, dimR, center, sectionMark, leader,
  micro, tag, display, writeText,
  stamp, titleBlock, revCloud, foldLine, breakEdge, ruler, dashedBox, table, cell, sprocket,
};
G.DR = DR;
})(window);
