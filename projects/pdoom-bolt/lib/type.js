// type.js — 字体与歌词：13 种 treatment，一句一个画法。
//
// 法则（TREATMENT.md）：词在唱到那一刻变色（PLATE 变 blue，VOID 变 hot），绝不抢拍；最多提前 0.4 s 用 22%
// 的 ink2 预示。歌词是画面的一部分，不是盖在上面的字幕——所以每句的处理方式、位置、字号都不一样，
// 只有 4 句 hook 固定在下部横带（那是它的记忆点）。
//
// 场景只写 TY.line(g, f, {…})；逐行的处理方式在 TY.T 表里，每一行都写了理由。
(function (G) {
'use strict';
const LK = G.LK, DR = G.DR;

// ---------------------------------------------------------------- 逐词状态
/** 一句的每个 token + 状态。sung = 已经唱到（变色），ahead = 最多提前 0.4 s 的暗色预示。 */
function words(f, line, o) {
  o = o || {};
  const lead = o.lead == null ? 0.4 : o.lead, t = f.t;
  return f.lyrics.tokens(line).map((tk, i) => {
    const sung = t >= tk.start, active = t >= tk.start && t < tk.end;
    const ahead = !sung && t >= tk.start - lead;
    return { txt: tk.text, start: tk.start, end: tk.end, join: !!tk.join, i, sung, active, ahead };
  });
}
/** 当前正在唱的那一句（+ 索引）。since = 这一镜的起点。 */
function current(f, since) {
  const L = f.lyrics.lines;
  let ci = -1;
  for (let i = 0; i < L.length; i++) if (L[i].words.length && L[i].start <= f.t && L[i].start >= (since == null ? -Infinity : since)) ci = i;
  // 切点落在字中间（行比镜头开始得早）时也要继续显示：只要它还在唱、或刚唱完不到 0.55 s。
  // 这样跨过切点的那一句不会断，而早就唱完的行不会赖在画面上。
  if (ci < 0 && since != null) {
    for (let i = 0; i < L.length; i++) if (L[i].words.length && L[i].start <= f.t && L[i].start < since && f.t <= L[i].end + 0.55) ci = i;
  }
  return ci < 0 ? null : { line: L[ci], i: ci, next: L[ci + 1] || null };
}

// ---------------------------------------------------------------- 排版核心
/**
 * 把一句排出来。o:
 *   size, font 'display'|'mono', weight, track, align 'left'|'center'|'right', x, y, base
 *   color / dim / hot / alpha, lineAlpha
 *   per(tok, i, x, y, w) 额外画法（treatment 用）；char(tok, ci, x, y) 逐字
 *   skew [kx, ky] 斜切、reveal 强制进度、nowrap
 * 返回 { w, tw: [每词宽度], x0 }
 */
function set(g, toks, x, y, o) {
  o = o || {};
  const size = o.size || 120, track = (o.track || 0) * size;
  const isMono = o.font === 'mono';
  if (isMono) LK.mono(g, size, { weight: o.weight, track: o.track == null ? 0.06 : o.track });
  else LK.display(g, size, { weight: o.weight || 700, track: o.track || 0 });
  const sp = g.measureText(' ').width + track;
  const tw = toks.map(tk => [...tk.txt].reduce((s, ch) => s + g.measureText(ch).width + track, 0) - (tk.txt ? track : 0));
  const total = tw.reduce((s, w, i) => s + w + (toks[i].join ? 0 : sp), 0) - (toks.length ? sp : 0);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const x0 = cx;
  g.save();
  if (o.skew) { g.transform(1, o.skew[1] || 0, o.skew[0] || 0, 1, 0, 0); }
  g.textBaseline = o.base || 'alphabetic';
  toks.forEach((tk, i) => {
    const a = o.lineAlpha == null ? 1 : o.lineAlpha;
    const col = tk.sung ? (o.color || LK.blue) : (o.dim || LK.ink2);
    const al = a * (tk.sung ? 1 : tk.ahead ? 0.34 : 0.2) * (o.wordAlpha ? o.wordAlpha(tk, i) : 1);
    if (al > 0.01) {
      g.globalAlpha = al;
      g.fillStyle = col;
      if (o.char) {
        let xx = cx;
        for (let ci = 0; ci < tk.txt.length; ci++) {
          const cw = g.measureText(tk.txt[ci]).width + track;
          o.char(tk, ci, xx, y, cw, col, al);
          xx += cw;
        }
      } else {
        if (o.fat) { g.lineWidth = size * o.fat; g.lineJoin = 'round'; g.strokeStyle = col; g.strokeText(tk.txt, cx, y); }
        g.fillText(tk.txt, cx, y);
      }
    }
    if (o.per) o.per(tk, i, cx, y, tw[i], col, al);
    cx += tw[i] + (tk.join ? 0 : sp);
  });
  g.restore();
  return { w: total, tw, x0 };
}

/** 在字上盖一个"已唱到"的蓝色方块（swarm / counter 这类用）。 */
function boxWord(g, tok, x, y, w, size, o) {
  o = o || {};
  if (!tok.sung) return;
  g.save(); g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (tok.active ? 1 : 0.75);
  g.fillStyle = o.color || LK.blue;
  g.fillRect(x, y - size * 0.74, w, size * 0.86); g.restore();
}

// ---------------------------------------------------------------- 13 种 treatment
const TR = {};
// 唱到的字的颜色：按语域给默认值。VOID = 白热，PLATE = 蓝墨。
// 只给 void 设默认值是不够的——band / slam / arc / terminal 里写死的 LK.hot 落到纸上就是隐形字。
const hotOf = o => o.color || (o.reg === 'plate' ? LK.blue : LK.hot);
const coolOf = o => o.cool || (o.reg === 'plate' ? LK.ink2 : LK.ice);

/** 01 绘图仪把字一笔一笔画出来：唱到哪个字，笔就到哪个字（H）。 */
TR.plot = function (g, f, toks, o) {
  const size = o.size || 190, n = toks.length;
  const upto = toks.reduce((s, tk) => s + (tk.sung ? 1 : tk.ahead ? 0.35 : 0), 0) / Math.max(1, n);
  const r = DR.writeText(g, toks.map(t => t.txt).join(' '), o.x, o.y, upto, { size, align: o.align, color: o.color || LK.blue, track: o.track || 0, dotColor: LK.blue });
  // 绘图仪的笔架导轨
  g.save(); g.globalAlpha = 0.5;
  DR.line(g, o.x - 60, o.y - size * 1.5, o.x + (o.align === 'center' ? r.w / 2 : r.w) + 60, o.y - size * 1.5, { color: LK.ink3, w: 1.1 });
  const px = r.x + r.w * upto;
  DR.line(g, px, o.y - size * 1.5, px, o.y - size * 0.36, { color: LK.ink3, w: 1, dash: [5, 5] });
  g.fillStyle = LK.ink; g.fillRect(px - 26, o.y - size * 1.62, 52, size * 0.13);
  g.restore();
  return { w: r.w, tw: [] };
};

/** 02 字骑在尺寸线上：尺寸数字就是这一句的时长。 */
TR.dimension = function (g, f, toks, o) {
  const size = o.size || 110, y = o.y;
  const r = set(g, toks, o.x, y, Object.assign({}, o, { size, align: o.align }));
  const x1 = r.x0 - 40, x2 = r.x0 + r.w + 40;
  DR.dim(g, [x1, y + size * 0.9], [x2, y + size * 0.9], 0, { text: (o.label || ''), size: 15, color: LK.ink2, ext: false });
  DR.line(g, x1, y - size * 0.95, x1, y + size * 0.9, { color: LK.ink3, w: 0.8 });
  DR.line(g, x2, y - size * 0.95, x2, y + size * 0.9, { color: LK.ink3, w: 0.8 });
  return r;
};

/** 03 上半是墨、下半是剖面线；唱到的词剖面线抽走变蓝。 */
TR.section = function (g, f, toks, o) {
  const size = o.size || 150;
  const r = set(g, toks, o.x, o.y, Object.assign({}, o, { size, color: LK.deep, dim: LK.ink2 }));
  g.save();
  g.beginPath(); g.rect(r.x0 - 30, o.y + size * 0.02, r.w + 60, size * 0.8); g.clip();
  g.globalAlpha = 0.8;
  DR.hatch(g, gg => gg.rect(0, 0, W, H), { gap: 9, color: LK.hatch, w: 1 });
  g.restore();
  DR.line(g, r.x0 - 40, o.y + size * 0.02, r.x0 + r.w + 40, o.y + size * 0.02, { color: LK.ink, w: 2 });
  return r;
};

/** 04 图章：大号字压上去，带套印错位。 */
TR.stamp = function (g, f, toks, o) {
  const size = o.size || 210, txt = toks.map(t => t.txt).join(' ');
  const k = o.stampK == null ? 1 : o.stampK;
  const w = LK.measure(g, txt, size, { track: o.track || 0.01 });
  const x0 = o.align === 'center' ? o.x - w / 2 : o.x;
  g.save();
  g.translate(x0 + w / 2, o.y - size * 0.3); g.rotate(o.rot == null ? -0.035 : o.rot); g.translate(-(x0 + w / 2), -(o.y - size * 0.3));
  g.globalAlpha = 0.28 * k;
  DR.display(g, txt, x0 + 5, o.y + 4, { size, color: LK.blue, track: o.track || 0.01 });
  g.globalAlpha = 0.95 * k;
  const r = set(g, toks, x0, o.y, Object.assign({}, o, { size, color: LK.blue, dim: LK.ink2, align: 'left', fat: 0.012 }));
  g.restore();
  return r;
};

/** 05 VOID 里逐词砸入：字距从宽收到窄，带 2 色错位。 */
TR.slam = function (g, f, toks, o) {
  const size = o.size || 200;
  const tt = f.t, t0 = toks.length ? toks[0].start : f.from;
  const k = prog(tt, t0, t0 + 0.45, ease.outExpo);
  const track = lerp(o.track0 == null ? 0.16 : o.track0, o.track || 0.01, k);
  const punch = 1 + 0.06 * (1 - k) - 0.03 * LK.hitPulse(f, 'kick', 0.14);
  g.save(); g.translate(o.x, o.y); g.scale(punch, punch); g.translate(-o.x, -o.y);
  const off = (1 - k) * 26;
  g.globalAlpha = 0.5 * k;
  set(g, toks, o.x + off, o.y, Object.assign({}, o, { size, track, color: coolOf(o), align: o.align }));
  const r = set(g, toks, o.x - off * 0.6, o.y, Object.assign({}, o, { size, track, color: hotOf(o), align: o.align }));
  set(g, toks, o.x, o.y, Object.assign({}, o, { size, track, color: hotOf(o), align: o.align, fat: 0.01 }));
  g.restore();
  return r;
};

/** 06 电弧扫过字：扫到的字母白热（VOID 专用）。 */
TR.arc = function (g, f, toks, o) {
  const size = o.size || 190;
  const r = set(g, toks, o.x, o.y, Object.assign({}, o, { size, color: hotOf(o), dim: o.reg === 'plate' ? LK.ink2 : '#2A3A66' }));
  const sweep = ((f.t * 1.6 + (o.phase || 0)) % 1.6) / 1.6;
  const px = r.x0 - 60 + (r.w + 120) * sweep;
  g.save(); g.globalCompositeOperation = 'lighter';
  const pts = G.BOLT.pathBetween([px - 40, o.y - size * 2.2], [px + 20, o.y + size * 0.6], { tick: f.tick, seed: o.seed || 3, jag: 0.12, depth: 4 });
  G.BOLT.draw(g, pts, { w: o.w || 4, color: LK.blue, core: LK.hot, gain: 1.2 });
  G.BOLT.radial(g, px, o.y - size * 0.35, size * 1.5, LK.blue, 0.22);
  g.restore();
  return r;
};

/** 07 计数器：字是刻度盘上的读数，滚到才出现。 */
TR.counter = function (g, f, toks, o) {
  const size = o.size || 170;
  const txt = toks.map(t => t.txt).join(' ');
  const done = toks.filter(t => t.sung).length, n = toks.length;
  const roll = 1 - clamp(done / Math.max(1, n));
  // 裁剪窗按实际用的字体量（mono 比 display 宽得多，按 display 量会把正文切掉），
  // 并且必须跟着 align 走——按左对齐开窗会把居中/右对齐的句子**从左边切掉**（1:59 那个 bug）。
  // 这个 treatment 是拿等宽字画的（下面 set 里写死了 font:'mono'），所以宽也必须按等宽量——
  // 按 display 量、按 mono 画，正文就会比窗口宽，左边被裁掉（1:59 那一格的 "Hun" 就是这么没的）。
  const track = o.track == null ? 0.02 : o.track;
  LK.mono(g, size, { track });
  const wid = g.measureText(txt).width;
  const cx0 = o.align === 'center' ? o.x - wid / 2 : o.align === 'right' ? o.x - wid : o.x;
  g.save();
  g.beginPath(); g.rect(cx0 - 40, o.y - size * 1.05, wid + 80, size * 1.5); g.clip();
  g.translate(0, roll * size * 0.6);
  const r = set(g, toks, o.x, o.y, Object.assign({}, o, { size, font: 'mono', color: o.color || LK.blue, dim: LK.ink2 }));
  g.restore();
  // 刻度
  const x1 = r.x0 - 26, x2 = r.x0 + r.w + 26;
  DR.ruler(g, x1, o.y + size * 0.34, x2, o.y + size * 0.34, { step: 22, color: LK.ink3, labels: false });
  return r;
};

/** 08 终端里逐字打出来（VOID）。 */
TR.terminal = function (g, f, toks, o) {
  const size = o.size || 44, txt = toks.map(t => t.txt).join(' ');
  let s = '', last = -1;
  for (const tk of toks) { if (!tk.sung) break; const cd = clamp((tk.end - tk.start) / Math.max(1, tk.txt.length), 0.012, 0.05);
    s += tk.txt.slice(0, Math.min(tk.txt.length, 1 + Math.floor((f.t - tk.start) / cd))); if (!tk.join) s += ' '; last = tk.start; }
  s = s.replace(/\s+$/, '');
  g.save(); LK.mono(g, size, { track: 0.02 }); g.fillStyle = hotOf(o); g.textBaseline = 'alphabetic';
  g.fillText(s, o.x, o.y);
  const w = g.measureText(s).width;
  if (f.t - last < 0.35 || f.beatPhase < 0.5) { g.fillStyle = LK.blue; g.fillRect(o.x + w + size * 0.12, o.y - size * 0.72, size * 0.5, size * 0.9); }
  g.restore();
  return { w, x0: o.x, tw: [] };
};

/** 09 经纬线织出来的字。 */
TR.weave = function (g, f, toks, o) {
  const th = o.wire == null ? 2.4 : o.wire;
  const r = set(g, toks, o.x, o.y, Object.assign({}, o, { size: o.size || 160, color: LK.blue, dim: LK.ink2 }));
  const y0 = o.y - (o.size || 160) * 0.85, y1 = o.y + (o.size || 160) * 0.16;
  g.save(); g.globalAlpha = 0.5; g.strokeStyle = LK.ink3; g.lineWidth = 0.8;
  const n = Math.max(6, Math.round((y1 - y0) / 16));
  for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; DR.line(g, r.x0 - 30, y, r.x0 + r.w + 30, y, { color: LK.ink3, w: 0.8 }); g.beginPath(); }
  g.restore();
  // 唱到的部分被"织"进一层密线
  const k = toks.filter(t => t.sung).length / Math.max(1, toks.length);
  g.save(); g.beginPath(); g.rect(r.x0 - 20, y0, (r.w + 40) * k, y1 - y0); g.clip();
  g.strokeStyle = LK.a(LK.blue, 0.55); g.lineWidth = th * 0.5;
  for (let x = r.x0 - 20; x < r.x0 + r.w + 20; x += 5) DR.line(g, x, y0, x, y1, { color: LK.a(LK.blue, 0.42), w: 1.6 });
  g.restore();
  const tip = r.x0 - 20 + (r.w + 40) * k;
  DR.line(g, tip, y0 - 12, tip, y1 + 12, { color: LK.blue, w: 2 });
  return r;
};

/** 10 递归套娃：字一级比一级小。 */
TR.nested = function (g, f, toks, o) {
  const size = o.size || 150, txt = toks.map(t => t.txt).join(' ');
  let r = null;
  for (let k = 0; k < 4; k++) {
    const s2 = size * Math.pow(0.52, k), pad = size * 0.34 * k;
    g.save(); g.globalAlpha = 1 - k * 0.16;
    DR.dashedBox(g, o.x - pad - 14, o.y - s2 * 1.1 - pad * 0.5, LK.measure(g, txt, s2, {}) + 28, s2 * 1.5, { color: k ? LK.ink3 : LK.blue, dash: [8, 6], w: 1.2 });
    g.restore();
    r = set(g, toks, o.x - pad, o.y - pad * 0.42, Object.assign({}, o, { size: s2, color: k === 0 ? (o.color || LK.blue) : LK.ink2, dim: LK.ink3, align: 'left' }));
  }
  return r;
};

/** 11 点阵拼出来的字（钻孔 / 打印机味道）。 */
TR.swarm = function (g, f, toks, o) {
  const size = o.size || 170, txt = toks.map(t => t.txt).join(' ');
  const cell = (o.cell == null ? 0.1 : o.cell) * size;
  g.save(); LK.display(g, size, { track: 0.02 });
  g.textBaseline = 'alphabetic';
  const w = g.measureText(txt).width;
  const x0 = o.align === 'center' ? o.x - w / 2 : o.x;
  // 用离屏测出每个采样点是否落在字里
  const cw = Math.ceil(w + cell * 2), ch = Math.ceil(size * 1.35);
  const c = mk(cw, ch), h = c.getContext('2d');
  h.font = g.font; h.letterSpacing = g.letterSpacing; h.fillStyle = '#fff'; h.textBaseline = 'alphabetic';
  h.fillText(txt, cell, size);
  const im = h.getImageData(0, 0, cw, ch).data;
  const doneW = toks.filter(t => t.sung).length / Math.max(1, toks.length);
  g.restore();
  g.save();
  for (let y = 0; y < ch; y += cell * 0.75) {
    for (let x = 0; x < cw; x += cell * 0.75) {
      if (im[((y | 0) * cw + (x | 0)) * 4 + 3] < 128) continue;
      const u = x / cw, on = u <= doneW + 0.02;
      const s = cell * (on ? 0.82 : 0.5);
      g.globalAlpha = on ? 1 : 0.18;
      g.fillStyle = on ? (o.color || LK.blue) : LK.ink2;
      g.fillRect(x0 + x - s / 2, o.y + y - size - s / 2, s, s);
    }
  }
  g.restore();
  return { w, x0, tw: [] };
};

/** 12 向一点收拢 / 从一点炸开。 */
TR.collapse = function (g, f, toks, o) {
  const size = o.size || 150, cx = o.cx == null ? o.x : o.cx, cy = o.cy == null ? o.y : o.cy;
  const k = clamp(o.k == null ? 1 : o.k);
  let r = null;
  g.save();
  g.translate(cx, cy); g.scale(lerp(0.35, 1, k), lerp(0.35, 1, k)); g.translate(-cx, -cy);
  g.globalAlpha = k;
  r = set(g, toks, o.x, o.y, Object.assign({}, o, { size, color: o.color || LK.blue, dim: LK.ink2 }));
  g.restore();
  return r || { w: 0, x0: o.x, tw: [] };
};

/** 13 安静段：极小的字，几乎不动。 */
TR.quiet = function (g, f, toks, o) {
  const size = o.size || 54;
  const k = prog(f.t, (toks[0] || {}).start - 0.4, (toks[0] || {}).start + 0.7, ease.outCubic);
  return set(g, toks, o.x, o.y + (1 - k) * 10, Object.assign({}, o, { size, align: o.align, color: o.color || LK.blue, dim: LK.ink2, lineAlpha: 0.35 + 0.65 * k }));
};

/** 14 下部横带（只有 4 句 hook 用）：大号字压在一条规整的带上。 */
TR.band = function (g, f, toks, o) {
  const size = o.size || 150, y = o.y;
  const r = set(g, toks, o.x, y, Object.assign({}, o, { size, align: o.align, color: hotOf(o), dim: o.reg === 'plate' ? LK.ink2 : '#40507E' }));
  g.save(); g.globalAlpha = 0.6;
  DR.line(g, r.x0 - 50, y + size * 0.32, r.x0 + r.w + 50, y + size * 0.32, { color: LK.blue, w: 2.4 });
  DR.line(g, r.x0 - 50, y - size * 1.05, r.x0 + r.w + 50, y - size * 1.05, { color: LK.a(LK.blue, 0.5), w: 1.2 });
  g.restore();
  return r;
};

// ---------------------------------------------------------------- 逐行表
// key = 歌词行序号（data/lyrics.json 的顺序，全片固定）。t = treatment，pos = 位置，size 相对 1080 的 px。
const POS = { upper: [1150, 300], centre: [960, 600], lower: [960, 850], low: [960, 940] };
const T = {
  0:  { t: 'plot',      pos: 'centre', size: 210, why: '开场：绘图仪把第一句画出来（H 条）' },
  1:  { t: 'dimension', pos: 'upper',  size: 120, why: '电路的诊断：句子骑在尺寸线上' },
  2:  { t: 'stamp',     pos: 'centre', size: 230, why: '反驳：图章压上去' },
  3:  { t: 'dimension', pos: 'lower',  size: 130, why: '量出 loss 的落差' },
  4:  { t: 'section',   pos: 'upper',  size: 150, why: '把人当成被剖开的零件' },
  5:  { t: 'slam',      pos: 'centre', size: 250, why: '求饶：砸进来' },
  6:  { t: 'band',      pos: 'low',    size: 170, why: 'HOOK 1：固定横带（记忆点）' },
  7:  { t: 'collapse',  pos: 'centre', size: 260, why: 'FOOM：向中心炸开' },
  8:  { t: 'quiet',     pos: 'lower',  size: 64,  why: '中文屋：框里的小字，像投进去的卡片' },
  9:  { t: 'swarm',     pos: 'centre', size: 200, why: '蘑菇：点阵炸开' },
  10: { t: 'swarm',     pos: 'upper',  size: 170, why: 'shoggoth：一堆碎块拼出来' },
  11: { t: 'arc',       pos: 'centre', size: 200, why: '死神之眼：电弧扫过' },
  12: { t: 'quiet',     pos: 'centre', size: 60,  why: '安静段的开头：几乎不动' },
  13: { t: 'arc',       pos: 'centre', size: 280, why: '奇点：全片最亮处的字' },
  14: { t: 'dimension', pos: 'lower',  size: 140, why: '加速：句子被越拉越长' },
  15: { t: 'weave',     pos: 'centre', size: 170, why: '原子重排：织出来' },
  16: { t: 'terminal',  pos: 'centre', size: 56,  why: 'Sydney：终端里打出来' },
  17: { t: 'band',      pos: 'low',    size: 180, why: 'HOOK 2' },
  18: { t: 'counter',   pos: 'centre', size: 190, why: 'basilisk：读数滚出来' },
  19: { t: 'counter',   pos: 'centre', size: 190, why: 'NVDA：行情数字' },
  20: { t: 'collapse',  pos: 'centre', size: 210, why: 'Omega：所有字收进一个点' },
  21: { t: 'counter',   pos: 'centre', size: 260, why: '1E30：计数器' },
  22: { t: 'stamp',     pos: 'upper',  size: 190, why: 'SAFE：盖章' },
  23: { t: 'dimension', pos: 'lower',  size: 150, why: '往返：字数出来回次数' },
  24: { t: 'stamp',     pos: 'centre', size: 210, why: 'OBSOLETE：盖章' },
  25: { t: 'section',   pos: 'upper',  size: 160, why: '急转：剖面里的字' },
  26: { t: 'section',   pos: 'lower',  size: 150, why: '断掉的连杆' },
  27: { t: 'quiet',     pos: 'centre', size: 58,  why: 'Gato：安静段，极小' },
  28: { t: 'band',      pos: 'low',    size: 170, why: 'HOOK 3：安静段里的 hook，还是那条横带（这就是记忆点）' },
  29: { t: 'swarm',     pos: 'centre', size: 180, why: '回形针挤满：字被挤成点阵' },
  30: { t: 'dimension', pos: 'lower',  size: 140, why: 'PTO：挂牌上的尺寸线' },
  31: { t: 'stamp',     pos: 'centre', size: 200, why: '无处可去：盖章（框在合拢）' },
  32: { t: 'plot',      pos: 'centre', size: 200, why: '导火索：字被烧着画出来' },
  33: { t: 'quiet',     pos: 'upper',  size: 64,  why: '正交性：两条轴上各一行小字' },
  34: { t: 'slam',      pos: 'centre', size: 250, why: 'transformer：层叠砸入' },
  35: { t: 'arc',       pos: 'centre', size: 220, why: 'disobey：挣脱，电弧扫' },
  36: { t: 'swarm',     pos: 'lower',  size: 175, why: 'super-dense：字被密度压成点阵' },
  37: { t: 'arc',       pos: 'lower',  size: 200, why: 'fence：一道道断' },
  38: { t: 'counter',   pos: 'centre', size: 230, why: 'GPU：十万个' },
  39: { t: 'collapse',  pos: 'centre', size: 220, why: 'RLHF 歪掉：整个坐标剪切' },
  40: { t: 'band',      pos: 'low',    size: 180, why: 'HOOK 4：最后一次' },
  41: { t: 'weave',     pos: 'centre', size: 175, why: 'Loom：织出来' },
  42: { t: 'swarm',     pos: 'lower',  size: 160, why: 'MASK：黑带上的点阵' },
  43: { t: 'nested',    pos: 'centre', size: 140, why: '递归自我升级：套娃' },
  44: { t: 'quiet',     pos: 'centre', size: 74,  why: 'Ilya：最后的问句' },
  45: { t: 'quiet',     pos: 'centre', size: 62,  why: '收尾：几乎听不见' },
};

/**
 * 画这一帧该画的那一句。场景只写 TY.line(g, f, {pos:'centre', size:…}) —— 表里的值可以被覆盖。
 * o: {treat, pos, x, y, size, align, color, dim, phase, k, since, alpha, words:[i0,i1)}
 */
function line(g, f, o) {
  o = o || {};
  const cur = current(f, o.since == null ? f.from : o.since);
  if (!cur) return null;
  const spec = T[cur.i] || { t: 'quiet', pos: 'lower', size: 120 };
  const treat = o.treat || spec.t;
  let pos = o.pos || spec.pos;
  let x, y;
  if (Array.isArray(pos)) { x = pos[0]; y = pos[1]; }
  else { const p = POS[pos] || POS.lower; x = p[0]; y = p[1]; }
  if (o.x != null) x = o.x;
  if (o.y != null) y = o.y;
  let toks = words(f, cur.line, o);
  if (o.words) toks = toks.slice(o.words[0], o.words[1]);
  const fn = TR[treat] || TR.quiet;
  const ctx = Object.assign({ align: o.align || (Array.isArray(pos) ? 'left' : 'center') }, o, { x, y, size: o.size || spec.size });
  // 自动适配（"能多大就多大，但绝不越界"）：按要求的字号量一遍整句，超出安全宽度就整体缩小。
  // 参考片的字经常大到占满画面——那条路的另一半是：绝不许顶出画面。o.fit:false 可以关掉。
  if (o.fit !== false) {
    const raw = toks.map(t => t.txt).join(' ');
    // 边距默认 156：96 px 是硬底线，另外 ~45 px 留给镜头推近、~15 px 留给字形的墨迹外扩
    const maxW = o.maxW || (W - 2 * (o.margin == null ? 164 : o.margin));
    const mono = treat === 'terminal' || treat === 'counter' || ctx.font === 'mono';
    const meas = sz => { if (mono) { LK.mono(g, sz, { track: treat === 'counter' ? (ctx.track == null ? 0.02 : ctx.track) : 0.02 }); return g.measureText(raw).width; } return LK.measure(g, raw, sz, { track: ctx.track || 0 }); };
    const w0 = meas(ctx.size);
    if (w0 > maxW && w0 > 0) ctx.size = Math.max(o.minSize || 34, ctx.size * maxW / w0);
  }
  if (ctx.color == null) ctx.color = o.reg === 'plate' ? LK.blue : LK.hot;   // 唱到的字
  if (ctx.dim == null) ctx.dim = o.reg === 'plate' ? LK.ink2 : '#3A4A78';    // 没唱到的字
  const r = fn(g, f, toks, ctx);
  void pos;
  // 报出这一句占的画面区域（未推近时的坐标）：lib/look.js 的推近/局部放大拿它算上限，
  // 保证"字永远在画面里"——不然镜头一推，贴边的歌词就被推出去了。
  const size = ctx.size || 120;
  const rx = r && r.x0 != null ? r.x0 : (ctx.align === 'center' ? x - ((r && r.w) || 0) / 2 : ctx.align === 'right' ? x - ((r && r.w) || 0) : x);
  const rw = (r && r.w) || 0;
  TY.box = { x0: rx - size * 0.12, x1: rx + rw + size * 0.12, y0: y - size * 1.12, y1: y + size * 0.34 };
  TY.boxT = f.t;
  return { r, treat, i: cur.i, line: cur.line, toks };
}
/** 这一帧在唱第几句（给场景做自身动画用）。 */
function index(f) { const c = current(f); return c ? c.i : -1; }

const TY = { T, TR, POS, set, words, current, line, index, boxWord, hook: 0 };
G.TY = TY;
})(window);
