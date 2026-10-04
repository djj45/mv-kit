// look.js — 全片唯一的调色板、字体、像素换算和攻击点取值。风格法则见 TREATMENT.md。
//
// 一份色：DeepSeek 蓝 #4D6BFE 是全片唯一的彩色，其余全是中性（纸白 / 墨蓝黑 / 钢蓝灰）。
// 两个语域：PLATE（纸 + 墨，纯 Canvas 2D，什么都不发光）和 VOID（黑 + 光，kits/lumen.js，只有蓝白发光）。
(function (G) {
'use strict';

const LK = {
  // 两个底
  void:   '#04060E',   // VOID 的底（偏蓝的黑）
  steel:  '#111C38',   // VOID 里的暗结构
  steel2: '#1B2A52',
  paper:  '#E9EDF7',   // PLATE 的底（冷白纸）
  paper2: '#F5F8FF',   // 纸上最亮的一档
  // 墨
  ink:    '#16224A',   // PLATE 主墨
  ink2:   '#6B7BA8',   // PLATE 次墨：隐藏线、引线、未唱到的字
  ink3:   '#9EACCF',   // 更淡：底纹、网格、辅助线
  hatch:  '#8C9CD2',   // 剖面线
  // 信号
  blue:   '#4D6BFE',   // DeepSeek 蓝：全片唯一的彩色
  deep:   '#2337A8',   // blue 的暗部
  ice:    '#A9BDFF',   // blue 的亮部
  hot:    '#EAF0FF',   // 白热核心 / VOID 里的字（永远锐利，不发光）
  arc:    '#C8DCFF',   // 电弧的芯
  rare:   '#7FF3FF',   // 稀有强调色：只在 41.3–45.0 s 的核心引爆出现

  // 实体的平色阶（浅 → 深，按面法线取档）。中性：只有"活的零件"才是 blue。
  tone:   ['#F5F8FF', '#E2E9F9', '#C8D3EF', '#A9B8E3', '#8798CE'],
};

// ---------------------------------------------------------------- 颜色
function hexRgb(h) {
  const s = String(h).replace('#', '');
  const f = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(a, b, k) {
  const p = hexRgb(a), q = hexRgb(b), o = p.map((v, i) => Math.round(lerp(v, q[i], k)));
  return '#' + o.map(v => v.toString(16).padStart(2, '0')).join('');
}
function shade(hex, k) { return k < 0 ? mixHex(hex, '#000000', -k) : mixHex(hex, '#FFFFFF', k); }

const LKx = {
  hexRgb, mixHex, shade,
  /** '#hex' 或已有的 'rgba(…)' + alpha → rgba()。传进来的已经是 rgba 时按比例改 alpha（不要二次解析成黑）。 */
  a(h, al) {
    if (typeof h === 'string' && h.slice(0, 3) === 'rgb') {
      const m = h.match(/[\d.]+/g) || [0, 0, 0, 1];
      const a0 = m.length > 3 ? parseFloat(m[3]) : 1;
      return `rgba(${m[0]},${m[1]},${m[2]},${clamp(al == null ? a0 : a0 * al, 0, 1).toFixed(3)})`;
    }
    const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${clamp(al == null ? 1 : al, 0, 1)})`;
  },
  /** 两个色按 k 混 */
  mix: mixHex,
  /** 逻辑像素常量：任何写死的像素值都要过这里，4K 时不会崩（参考片 §I） */
  PX(n) { return n * (W / 1920); },

  // ---------------------------------------------------------------- 字体
  F: {
    display: '"DIN Condensed", "DIN Condensed Bold", "Avenir Next Condensed", Impact, "Helvetica Neue", sans-serif',
    mono: 'Menlo, "SF Mono", Monaco, "DejaVu Sans Mono", monospace',
    cn: '"PingFang SC", "Hiragino Sans GB", "Heiti SC", sans-serif',
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },

  /** 设置 display 字体：size 与字距（em）。weight 走 font-weight，宽字距用 letterSpacing（Chrome 支持）。 */
  display(g, size, o) {
    o = o || {};
    g.font = `${o.weight || 700} ${size}px ${LKx.F.display}`;
    g.letterSpacing = `${(o.track || 0) * size}px`;
  },
  mono(g, size, o) {
    o = o || {};
    g.font = `${o.weight || 400} ${size}px ${LKx.F.mono}`;
    g.letterSpacing = `${(o.track == null ? 0.06 : o.track) * size}px`;
  },
  cn(g, size, o) {
    o = o || {};
    g.font = `${o.weight || 600} ${size}px ${LKx.F.cn}`;
    g.letterSpacing = `${(o.track || 0.02) * size}px`;
  },
  /** display 字加肥：同色描边 2%（DIN 只有 Bold 一档，这是唯一的重字手段）。 */
  fatten(g, size, k) { g.lineWidth = size * (k == null ? 0.022 : k); g.lineJoin = 'round'; g.strokeStyle = g.fillStyle; g.strokeText && null; },

  /** 屏幕上量一段 display 字的宽度（含字距）。 */
  measure(g, text, size, o) {
    o = o || {};
    LKx.display(g, size, o);
    const track = (o.track || 0) * size, s = String(text);
    return [...s].reduce((w, ch) => w + g.measureText(ch).width + track, 0) - (s ? track : 0);
  },

  // ---------------------------------------------------------------- 攻击点
  /** 最近一次 hit 之后的秒数（cap 秒封顶），没有就返回 99。 */
  since(f, kind, cap) {
    const ev = f.audio.events(kind, f.t - (cap || 0.6), f.t);
    return ev.length ? Math.max(0, f.t - ev[ev.length - 1].t) : 99;
  },
  /** 距最近一次 hit 的脉冲 1→0，len 秒。 */
  hitPulse(f, kind, len, cap) {
    const s = LKx.since(f, kind, cap || len || 0.4);
    return s >= (len || 0.4) ? 0 : 1 - s / (len || 0.4);
  },
  /** 镜头内 0..1 的入场（eased out）。 */
  in(f, dur, e) { return prog(f.lt, 0, dur == null ? 0.45 : dur, e || ease.outCubic); },
  /** 镜头内 0..1 的出场：离切点 dur 秒时 0，切点上 1。 */
  out(f, dur, e) { return prog(f.lt, f.dur - (dur == null ? 0.35 : dur), f.dur, e || ease.inCubic); },
  /** 第 i / n 项的错开入场。 */
  each(i, n, t, t0, dur, spread, e) {
    const sp = spread == null ? 0.6 : spread;
    const s = n > 1 ? (i / (n - 1)) * sp * dur : 0;
    return prog(t, t0 + s, t0 + s + Math.max(1e-3, dur * (1 - sp)), e || ease.outCubic);
  },

  // ---------------------------------------------------------------- 后期
  /** PLATE 的后期：不发光、不留暗角（图纸是平的）。 */
  plate(f, o) { return Object.assign({ grain: 0.03, vignette: 0, background: LK.paper }, o); },
  /** VOID 的后期：暗角在 lmEnd 里按调色板做。 */
  voidp(f, o) { return Object.assign({ grain: 0.03, vignette: 0 }, o); },

  /** VOID 语域的 lumen 调色板：全片只有一个（不按章节换）。 */
  palVoid() {
    return {
      mode: 'light', bg: LK.void, bg2: '#070C1A',
      fg: LK.hot, dim: '#3E4E7C', accent: LK.blue, hot: '#FFFFFF', warn: LK.ice,
      bloom: 0.95, radius: 0.58, exposure: 1, ca: 0.5, lens: 0.3,
    };
  },
  /** 引爆那一镜：唯一的电青。 */
  palRare() { const p = LKx.palVoid(); p.accent = LK.rare; p.bloom = 1.15; return p; },
};

Object.assign(LK, LKx);

// ---------------------------------------------------------------- 镜头语言（全片统一，写在一处）
// 参考片的三条镜头习惯，都做成"一个地方说了算"，场景/时间线只报一个数：
//
//  ① 缓慢推近：没有真正静止的镜头。2.6%–5.2%，按镜头时长自动，跨切点有淡化/转场的条目不推。
//  ② 局部放大 + 镜头跟随（insert）：推进某个局部，并且**一直跟着它**——被跟的东西待在原处不动，
//     周围往外扫，这就是"有动感"的来源。焦点有两种给法：
//       · 场景里每帧调 LK.focus(f, x, y) 报出主角此刻在画面上的位置（准，能跟住移动的东西）
//       · 时间线上写 insert: { at, dur, amt, x, y } 给一个固定焦点（不用改场景）
//  ③ 二维转三维（warp）：整帧当一块 3D 里的板子重投影（竖条投影 + 透视 + 投影面外的底 + 投影），
//     纸上的图可以"立起来转过去"。时间线上写 warp: { at, dur, from, to, pitch, dist, bg }。
//     from/to 是偏转角（弧度）：0 = 正对镜头（平的），0.6 ≈ 34°。
const FOCUS = { x: 0, y: 0, t: -1e9 };
LK.focus = function (f, x, y) { FOCUS.x = x; FOCUS.y = y; FOCUS.t = f.t; };
LK.focusAt = function (t) { return Math.abs(FOCUS.t - t) < 0.02 ? FOCUS : null; };

let WARPBUF = null;
/** 把整帧当一块 3D 里的板子重画：绕 y 轴 yaw、绕 x 轴 pitch，透视距离 dist。 */
function warpPlane(g, src, o) {
  const w = src.width, h = src.height;
  if (!WARPBUF || WARPBUF.width !== w || WARPBUF.height !== h) WARPBUF = mk(w, h);
  const b = WARPBUF.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'copy';
  b.drawImage(src, 0, 0);
  const yaw = o.yaw || 0, pitch = o.pitch || 0, dist = Math.max(0.35, o.dist == null ? 1.6 : o.dist);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cx0 = w / 2, cy0 = h / 2 + (o.dy || 0);
  const P = x => { const zz = dist + (x / w) * sy; return { x: (x * cy) / Math.max(0.05, zz) * dist, s: dist / Math.max(0.05, zz) }; };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = o.bg || G.LK.void; g.fillRect(0, 0, w, h);
  const N = o.strips || 110, sw = w / N;
  // 投影：板子的影子（有一点点，才看得出它离开了纸面）
  if (o.shadow !== false) {
    g.save(); g.globalAlpha = 0.16 * Math.min(1, Math.abs(sy) * 4 + Math.abs(sp) * 3);
    g.fillStyle = '#000';
    const sh = P(-w / 2), sh2 = P(w / 2);
    g.fillRect(cx0 + sh.x + 26, cy0 - h * cp / 2 + 34, (cx0 + sh2.x) - (cx0 + sh.x), h * cp);
    g.restore();
  }
  for (let i = 0; i < N; i++) {
    const x0 = i * sw - cx0, x1 = (i + 1) * sw - cx0;
    const p0 = P(x0), p1 = P(x1);
    const dx = cx0 + p0.x, dw = (cx0 + p1.x) - dx;
    if (dw <= 0.01) continue;
    const s = (p0.s + p1.s) / 2, dh = h * cp * s, dy = cy0 - dh / 2 + (o.shiftY || 0) * s;
    g.drawImage(WARPBUF, i * sw, 0, sw + 0.6, h, dx, dy, dw + 0.6, dh);
  }
  g.restore();
}

/**
 * 推近的上限：这一帧歌词占的框（TY.box）在 screen(p) = p + (z−1)(p − focus) 之后必须还留在画面里。
 * 字贴着边的时候它会自动把推近压小——宁可少推一点，也不能把字推出画面。
 */
function safeZoom(z, fx, fy, t) {
  const b = G.TY && G.TY.box, bt = G.TY && G.TY.boxT;
  if (!b || bt == null || Math.abs(bt - t) > 0.02) return z;
  // 96 px 是框架的铁律（歌词离画面边缘 ≥96）——推近之后也必须守住，所以在推之前就按它夹紧。
  const pad = Math.min(96, W * 0.05 + 40), lim = (p, f, lo, hi) => {
    const d = p - f;
    if (Math.abs(d) < 1e-6) return Infinity;
    return d > 0 ? (hi - p) / d + 1 : (lo - p) / d + 1;
  };
  let zm = z;
  zm = Math.min(zm, lim(b.x0, fx, pad, W - pad), lim(b.x1, fx, pad, W - pad));
  zm = Math.min(zm, lim(b.y0, fy, pad, H - pad), lim(b.y1, fy, pad, H - pad));
  return clamp(Math.min(z, zm), 1, z);
}

/**
 * 整帧重构图：以 (fx, fy) 为不动点，把画面放大 z 倍。screen(P) = P + (z−1)(P − f)。
 * 自己画（不走 q.zoom）是因为引擎会把 q.shake 当成手抖再乘一个补偿系数，平移会被放大成额外的推近。
 */
function reframe(g, src, z, fx, fy) {
  if (z <= 1.0005) return;
  const w = src.width, h = src.height;
  if (!WARPBUF || WARPBUF.width !== w || WARPBUF.height !== h) WARPBUF = mk(w, h);
  const b = WARPBUF.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'copy';
  b.drawImage(src, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(fx, fy); g.scale(z, z); g.translate(-fx, -fy);
  g.drawImage(WARPBUF, 0, 0);
  g.restore();
}

MV.postFilter(function (src, q, t) {
  const E = MV.entries || [];
  let e = null;
  for (const c of E) if (t >= c.from && t < c.to) { e = c; break; }
  if (!e) return;
  const dur = Math.max(0.2, e.to - e.from);
  const solo = !e.fadeIn && !E.some(o => o !== e && o.from < e.to && o.to > e.from);

  // ① 缓慢推近
  let z = 1;      // 注意：不含场景自己 return 的 q.zoom（那个由引擎照常乘），否则会双份
  const amt = e.push != null ? e.push : clamp(0.020 + 0.0045 * dur, 0.026, 0.052);
  if (solo && amt > 0) z *= 1 + amt * clamp((t - e.from) / dur);

  // ② 局部放大 + 跟随：算出"想要"的倍数与焦点，夹紧之后（下面）再按最终倍数重算平移，
  //    这样焦点永远钉在原处——先算平移再夹紧会把"钉住"这件事算错。
  const ins = e.insert;
  let zIns = 1, F = null;
  if (ins && t >= ins.at) {
    const k = prog(t, ins.at, ins.at + (ins.dur == null ? 1.1 : ins.dur), ins.ease || ease.inOutCubic);
    zIns = 1 + (ins.amt == null ? 0.35 : ins.amt) * k;
    z *= zIns;
    F = ins.x != null ? { x: ins.x, y: ins.y } : LK.focusAt(t);
  }

  // ③ 二维转三维
  const wp = e.warp;
  if (wp) {
    const k = prog(t, wp.at, wp.at + (wp.dur == null ? 1.4 : wp.dur), wp.ease || ease.inOutCubic);
    const yaw = lerp(wp.from == null ? 0 : wp.from, wp.to == null ? 0 : wp.to, k);
    if (Math.abs(yaw) > 0.001 || wp.force) {
      warpPlane(src.getContext('2d'), src, { yaw, pitch: wp.pitch || 0, dist: wp.dist, bg: wp.bg || LK.void, dy: wp.dy, strips: wp.strips, shadow: wp.shadow });
    }
  }

  const fx = F ? F.x : W / 2, fy = F ? F.y : H / 2;
  if (z > 1) z = safeZoom(z, fx, fy, t);
  // 推近 / 局部放大交给引擎那一次带变换的 drawImage（比我再拷一遍整帧快得多）。
  // 平移 sx 让焦点钉在原处：引擎映射 P → W/2 + sx + z_eng·(P − W/2)，要它等于 F + z(P − F)，
  // 就取 sx = −(z−1)(F − W/2)；而引擎还会给 q.shake 补一个 (1 + (|sx|+|sy|)·2/W) 的系数，
  // 所以 q.zoom 要先除掉它，最终倍数才正好是 z。
  const ang = hash(Math.round(e.from * 10), 17, 3) * TAU;
  const drift = clamp((t - e.from) / dur);
  const px = F ? -(z - 1) * (fx - W / 2) : 0, py = F ? -(z - 1) * (fy - H / 2) : 0;
  const dx = px + Math.cos(ang) * 7 * drift, dy = py + Math.sin(ang) * 4 * drift;
  if (z > 1 || dx || dy) {
    const comp = 1 + (Math.abs(dx) + Math.abs(dy)) * 2 / W;
    q.zoom = z / comp;
    if (Array.isArray(q.shake)) q.shake = [q.shake[0] + dx, q.shake[1] + dy];
    else if (typeof q.shake === 'number' && q.shake) q.shake = [q.shake + dx, q.shake + dy];
    else q.shake = [dx, dy];
  }
});

G.LK = LK;
})(window);
