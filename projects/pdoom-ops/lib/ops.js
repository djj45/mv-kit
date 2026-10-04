// ops.js — the NOC's shared vocabulary: lyric renderers (term / cap / big / chat), HUD chrome,
// charts, the P(doom) instrument, small drawing helpers. Every shot speaks through this file.
//
// Lyrics always go on the screen layer (MV.overlay): the camera can punch in as hard as it likes.
// Each word is one whole fillText at its own start (never before; ≤ 0.3 s dim preview allowed),
// which is exactly what `render.py qa` measures.
(function (G) {
'use strict';

const OPS = {};
const MONO = LM_MONO;

// ---------------------------------------------------------------- lyrics

/** tokens of the line this SHOT should sing (null when nothing should be drawn) */
OPS.line = f => f.lyrics.lineAt(f.t, f.from);

/** lay out a line's tokens at `size`: [{text, start, end, join, x, w}] + total width */
function toks(g, line, size, o) {
  g.save(); g.font = `${o.weight ?? 500} ${size}px ${MONO}`; g.letterSpacing = `${(o.track ?? 0.02) * size}px`;
  const sp = g.measureText(' ').width;
  const tk = f_lyrics_tokens(line);
  let x = 0;
  const out = tk.map(t => { const w = g.measureText(t.text).width; const e = { ...t, x, w }; x += w + (t.join ? 0 : sp); return e; });
  const total = x - sp;
  g.restore();
  return { list: out, total };
}
function f_lyrics_tokens(line) { return MV.lyrics.tokens(line); }

/** glow like the kit's terminal: a soft halo of the word's own colour (nothing in ink mode) */
function glow(g, color, blur) { if (lmPal().mode !== 'ink') { g.shadowColor = color; g.shadowBlur = blur; } }
const css = (c, a) => lmCss(c, a ?? 1);

/**
 * term — the operator's prompt: `> ` + words typed whole at their start, a block cursor that
 * blinks on the beat. o: x, y (baseline), size, weight, pal colors via palette.
 */
OPS.term = function (g, f, o = {}) {
  const L = OPS.line(f); if (!L) return;
  const size = o.size ?? 34, x = o.x ?? 150, y = o.y ?? H - 175;
  const lay = toks(g, L, size, o), maxW = o.maxW ?? W - x - 170;
  const k = lay.total > maxW ? maxW / lay.total : 1;
  g.save(); g.font = `${o.weight ?? 500} ${size}px ${MONO}`; g.letterSpacing = `${(o.track ?? 0.02) * size}px`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = css('dim', 0.95);
  g.fillText(o.prompt ?? '> ', x, y);
  const px = x + g.measureText(o.prompt ?? '> ').width;
  g.translate(px, y); g.scale(k, 1);
  let caret = 0;
  for (const t of lay.list) {
    if (f.t >= t.start - 0.28) {
      const active = f.t < t.end + 0.06;
      g.save(); glow(g, css(active ? 'hot' : 'fg', 0.5), size * 0.5);
      g.fillStyle = css(f.t < t.start ? 'dim' : active ? 'hot' : 'fg', f.t < t.start ? 0.5 : 1);
      g.fillText(t.text, t.x, 0);
      g.restore();
    }
    if (t.start <= f.t) caret = t.x + t.w;
  }
  if (f.beatPhase < 0.5 || f.t < L.end) { g.fillStyle = css('accent', 0.95); g.fillRect(caret + size * 0.1, -size * 0.78, size * 0.56, size * 1.02); }
  g.restore();
};

/**
 * cap — centred word-by-word fade-up. o: x (centre), y (baseline), size, hold, lead.
 */
OPS.cap = function (g, f, o = {}) {
  const L = OPS.line(f); if (!L) return;
  const next = MV.lyrics.lines[L.i + 1];
  const end = Math.min(L.end + (o.hold ?? 0.75), next ? next.start : Infinity);
  const la = 1 - prog(f.t, end - 0.3, end);
  if (la <= 0) return;
  const size = o.size ?? 36, cx = o.x ?? W / 2;
  const lay = toks(g, L, size, o), maxW = o.maxW ?? W - 2 * 150;
  const k = lay.total > maxW ? maxW / lay.total : 1;
  g.save(); g.font = `${o.weight ?? 500} ${size}px ${MONO}`; g.letterSpacing = `${(o.track ?? 0.02) * size}px`;
  g.textBaseline = 'alphabetic'; g.translate(cx - lay.total * k / 2, o.y); g.scale(k, 1);
  for (const t of lay.list) {
    let a = prog(f.t, t.start, t.start + 0.16, ease.outCubic);
    if (a <= 0 && f.t >= t.start - (o.lead ?? 0.3)) a = 0.22;          // dim preview only
    if (a > 0) {
      const active = f.t < t.end + 0.06;
      g.save(); g.globalAlpha = a * la; glow(g, css(active ? 'hot' : 'fg', 0.45), size * 0.45);
      g.fillStyle = css(active ? 'hot' : 'fg', 1);
      g.fillText(t.text, t.x, (1 - a) * 7);
      g.restore();
    }
  }
  g.restore();
};

/**
 * big — hook words slam in: scale 1.3 → 1 on each word's start, the live word burns hot.
 * o: x (centre), y (baseline), size, slam (px of the punch).
 */
OPS.big = function (g, f, o = {}) {
  const L = OPS.line(f); if (!L) return;
  const size = o.size ?? 100, cx = o.x ?? W / 2;
  const lay = toks(g, L, size, { ...o, weight: o.weight ?? 600, track: o.track ?? 0.06 });
  const maxW = o.maxW ?? W - 2 * 140;
  const k = lay.total > maxW ? maxW / lay.total : 1;
  const next = MV.lyrics.lines[L.i + 1];
  const end = Math.min(L.end + (o.hold ?? 0.45), next ? next.start : Infinity);
  const la = 1 - prog(f.t, end - 0.25, end);
  if (la <= 0) return;
  g.save(); g.font = `${o.weight ?? 600} ${size}px ${MONO}`; g.letterSpacing = `${(o.track ?? 0.06) * size}px`;
  g.textBaseline = 'alphabetic'; g.translate(cx - lay.total * k / 2, o.y); g.scale(k, 1);
  for (const t of lay.list) {
    if (f.t < t.start - 0.001) continue;
    const a = clamp((f.t - t.start) / 0.14, 0, 1);                      // the slam
    const s = 1 + (o.slam ?? 0.3) * (1 - a) * (1 - a);
    const active = f.t < t.end + 0.1;
    g.save(); g.globalAlpha = a * la;
    g.translate(t.x + t.w / 2, -size * 0.35); g.scale(s, s); g.translate(-(t.x + t.w / 2), size * 0.35);
    glow(g, css(active ? 'hot' : 'fg', 0.6), size * 0.3);
    g.fillStyle = css(active ? 'hot' : 'fg', 1);
    g.fillText(t.text, t.x, 0);
    g.restore();
  }
  g.restore();
};

/**
 * chat — the plea window: the line is a message typed word by word under a header, the other
 * side "…"-ing below. params: who, note (a dim line under the dots), beat (heartbeat on).
 * Draws its own thin frame — the lyric's plate, on the screen layer.
 */
OPS.chat = function (g, f, o = {}) {
  const L = OPS.line(f);
  const who = o.who ?? 'CHATGPT', x0 = o.x ?? 430, x1 = W - (o.x ?? 430), yb = o.y ?? 600, size = o.size ?? 34;
  const y0 = yb - 250, y1 = yb + 150;
  // the window: thin frame + header, all dim (it is the lyric's own plate)
  g.save();
  g.strokeStyle = css('dim', 0.8); g.lineWidth = 1.5;
  g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  g.beginPath(); g.moveTo(x0, y0 + 44); g.lineTo(x1, y0 + 44); g.stroke();
  g.font = `400 15px ${MONO}`; g.letterSpacing = '3px'; g.fillStyle = css('dim', 0.95);
  g.fillText(`PROMPT // ${who}`, x0 + 24, y0 + 28);
  g.textAlign = 'right'; g.fillText(o.status ?? 'ENCRYPTED', x1 - 24, y0 + 28); g.textAlign = 'left';
  g.restore();
  let focusPt = [(x0 + x1) / 2, yb];
  if (L) {
    const lay = toks(g, L, size, { weight: 400, track: 0.02 });
    const maxW = x1 - x0 - 2 * 34 - 216;
    const k = Math.min(1, maxW / lay.total);
    g.save(); g.font = `400 ${size}px ${MONO}`; g.letterSpacing = `${0.02 * size}px`;
    g.textBaseline = 'alphabetic';
    g.fillStyle = css('accent', 0.9); g.fillText('operator ›', x0 + 34, yb);
    g.translate(x0 + 216, yb); g.scale(k, 1);
    let caret = 0;
    for (const t of lay.list) {
      if (f.t >= t.start - 0.28) {
        const active = f.t < t.end + 0.06;
        g.save(); glow(g, css(active ? 'hot' : 'fg', 0.5), size * 0.5);
        g.fillStyle = css(f.t < t.start ? 'dim' : active ? 'hot' : 'fg', f.t < t.start ? 0.5 : 1);
        g.fillText(t.text, t.x, 0); g.restore();
      }
      if (t.start <= f.t) caret = t.x + t.w;
    }
    focusPt = [x0 + 216 + caret * k, yb - size * 0.3];
    g.restore();
    // the reply that never comes: three dots, pulsing in order (clear of the prefix's letters)
    const dy = yb + 84;
    g.save(); g.font = `400 ${size}px ${MONO}`;
    const pref = `${who.toLowerCase()} ›`;
    g.fillStyle = css('dim', 0.9); g.fillText(pref, x0 + 34, dy);
    const pw = g.measureText(pref).width, dx0 = x0 + 34 + pw + 30;
    for (let i = 0; i < 3; i++) {
      const on = (Math.floor(f.t * 2.4) + i) % 3 === 0;
      g.fillStyle = css('accent', on ? 0.95 : 0.28);
      g.beginPath(); g.arc(dx0 + i * 36, dy - size * 0.32, 6, 0, TAU); g.fill();
    }
    if (o.note) { g.save(); g.font = `400 ${o.noteSize ?? 22}px ${MONO}`; g.fillStyle = css(o.noteColor ?? 'dim', 0.95); glow(g, css(o.noteColor ?? 'dim', 0.4), 10); g.fillText(o.note, dx0 + 3 * 36 + 24, dy - size * 0.32 + 8); g.restore(); }
    g.restore();
  }
  MV.focus(focusPt[0], focusPt[1], 'chat caret');
};

/** one call from a scene: draw this entry's lyric (params.lyr = {mode, ...}) on the screen layer */
OPS.lyr = function (f, over) {
  const o = { ...(f.params.lyr || {}) };
  const mode = o.mode || (f.params.who ? 'chat' : 'term');
  MV.overlay(g => {
    if (over) over(g);
    if (mode === 'none' || QA_OFF) return;
    if (mode === 'term') OPS.term(g, f, o);
    else if (mode === 'cap') OPS.cap(g, f, o);
    else if (mode === 'big') OPS.big(g, f, o);
    else if (mode === 'chat') OPS.chat(g, f, { ...o, who: f.params.who, note: f.params.note, noteColor: f.params.noteColor, noteSize: f.params.noteSize, status: f.params.status });
  });
};
const QA_OFF = false;

// ---------------------------------------------------------------- HUD chrome

/** shot id for the HUD: "EYE-02 · 12.4 s" */
OPS.id = f => `${(f.entry.scene).toUpperCase()}-${String(f.entry.i).padStart(2, '0')}`;

/** the instrument frame; on = lmFlick at the cut so it powers up with the shot */
OPS.hud = function (g, f, o = {}) {
  lmHud(g, f, {
    id: OPS.id(f), name: o.name ?? f.entry.name,
    rows: o.rows ?? undefined, foot: o.foot ?? 'P(DOOM) — OPERATIONS',
    on: o.on ?? lmFlick(f.t, f.from, 0.28, f.entry.i),
    corners: o.corners,
  });
};

// ---------------------------------------------------------------- 2D drawing helpers (glow or overlay ctx)

/** a polyline through samples; upto draws it on. pts in px. */
OPS.stroke = function (g, pts, o = {}) {
  if (!pts.length) return;
  const n = Math.max(2, Math.round(pts.length * clamp(o.upto ?? 1)));
  g.save(); g.strokeStyle = css(o.color ?? 'fg', o.alpha ?? 1); g.lineWidth = o.width ?? 2;
  if (o.dash) g.setLineDash(o.dash);
  if (o.glow) glow(g, css(o.color ?? 'fg', 0.6), o.glow);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (n === pts.length && n > 2 && o.closed) g.closePath();
  g.stroke(); g.restore();
  return pts[n - 1];
};

/** an arrow with a head; draw 0..1 animates it */
OPS.arrow = function (g, a, b, o = {}) {
  const k = clamp(o.draw ?? 1), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (k <= 0 || L < 1) return b;
  const u = Math.min(1, k * 1.25), e = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  OPS.stroke(g, [a, e], o);
  if (k > 0.75) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hs = o.head ?? 16;
    OPS.stroke(g, [e, [e[0] - hs * Math.cos(ang - 0.44), e[1] - hs * Math.sin(ang - 0.44)]], o);
    OPS.stroke(g, [e, [e[0] - hs * Math.cos(ang + 0.44), e[1] - hs * Math.sin(ang + 0.44)]], o);
  }
  return e;
};

/** expanding shock rings from the recent kicks: r(t) = (t - hit.t) * speed */
OPS.rings = function (g, f, o = {}) {
  for (const k of f.audio.events('kick', f.t - (o.window ?? 1.4), f.t)) {
    const age = f.t - k.t, r = age * (o.speed ?? 700) + 20, a = Math.max(0, 0.85 - age / (o.window ?? 1.4)) * (o.alpha ?? 1);
    if (a <= 0.02) continue;
    g.save(); g.strokeStyle = css(o.color ?? 'warn', a); g.lineWidth = o.width ?? 2.5;
    glow(g, css(o.color ?? 'warn', 0.7), 18);
    g.beginPath(); g.arc(o.x ?? W / 2, o.y ?? H / 2, r, 0, TAU); g.stroke(); g.restore();
  }
};

/** hazard stripes marching along a bar */
OPS.stripes = function (g, x, y, w, h, o = {}) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const sp = o.space ?? 46, off = (o.scroll ?? 0) % (sp * 2);
  for (let sx = x - h * 2 - off; sx < x + w + h * 2; sx += sp * 2) {
    g.strokeStyle = css(o.color ?? 'warn', o.alpha ?? 0.8); g.lineWidth = o.width ?? h * 0.42;
    g.beginPath(); g.moveTo(sx, y + h + 2); g.lineTo(sx + h * 2, y - 2); g.stroke();
  }
  g.restore();
};

/** tick label (small mono, dim) — for charts and dials */
OPS.tick = function (g, text, x, y, o = {}) {
  g.save(); g.font = `${o.size ?? 15}px ${MONO}`; g.letterSpacing = '0px';
  g.textAlign = o.align ?? 'center'; g.textBaseline = o.base ?? 'middle';
  g.fillStyle = css(o.color ?? 'dim', o.alpha ?? 0.95); glow(g, css(o.color ?? 'dim', 0.5), 8);
  g.fillText(text, x, y); g.restore();
};

// ---------------------------------------------------------------- chart (drop / run / spike share it)

/**
 * A chart in px: frame + grid + the curve val(u) → 0..1 (1 = top), drawn on with `upto`.
 * Returns the screen position of the curve tip and the samples.
 */
OPS.chart = function (g, f, o) {
  const { x, y, w, h, val, n = 220 } = o, X = u => x + u * w, Y = v => y + h - v * h;
  // frame + gridlines
  g.save(); g.strokeStyle = css('dim', 0.55); g.lineWidth = 1.2; g.setLineDash([2, 7]);
  for (let i = 1; i <= 3; i++) { g.beginPath(); g.moveTo(x, y + h * i / 4); g.lineTo(x + w, y + h * i / 4); g.stroke(); }
  g.setLineDash([]);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h); g.lineTo(x + w, y + h); g.stroke();
  g.restore();
  (o.ticks || []).forEach(([u, label]) => OPS.tick(g, label, X(u), y + h + 26));
  (o.yticks || []).forEach(([v, label]) => OPS.tick(g, label, x - 34, Y(v), { align: 'right' }));
  // the curve
  const pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([X(u), Y(clamp(val(u)))]); }
  const tip = OPS.stroke(g, pts, { color: o.color ?? 'fg', width: o.width ?? 3, upto: o.upto ?? 1, glow: 14 });
  if (tip && o.tipDot) { g.save(); g.fillStyle = css('hot'); glow(g, css('hot', 0.8), 22); g.beginPath(); g.arc(tip[0], tip[1], 5.5, 0, TAU); g.fill(); g.restore(); }
  return { tip, pts, X, Y };
};

// ---------------------------------------------------------------- the P(doom) instrument

/**
 * The dial: sweep 135°→45° (270°), red zone from 80, ticks, needle, the number, hazard bar.
 * o: cx, cy, r, value (0..100), flick (0..1 brightness), tremble (px). Draws into a 2D ctx (glow).
 * Returns the needle tip [x, y].
 */
OPS.dial = function (g, f, o) {
  const cx = o.cx ?? W / 2, cy = o.cy ?? 760, r = o.r ?? 320, v = clamp(o.value ?? 0, 0, 100);
  const A0 = Math.PI * 0.75, A1 = Math.PI * 2.25, ang = A0 + (A1 - A0) * v / 100;
  const dim2 = (a) => css('dim', a);
  g.save();
  // dial arc + red zone
  g.strokeStyle = css('dim', 0.85); g.lineWidth = 3;
  g.beginPath(); g.arc(cx, cy, r, A0, A1); g.stroke();
  g.strokeStyle = css('warn', 0.95); g.lineWidth = 7; glow(g, css('warn', 0.6), 16);
  g.beginPath(); g.arc(cx, cy, r, A0 + (A1 - A0) * 0.8, A1); g.stroke();
  glow(g, '', 0);
  // ticks + numbers every 10
  for (let t = 0; t <= 100; t += 5) {
    const a = A0 + (A1 - A0) * t / 100, big = t % 10 === 0, r1 = r - (big ? 26 : 13);
    g.strokeStyle = css(t >= 80 ? 'warn' : 'dim', big ? 0.95 : 0.6); g.lineWidth = big ? 2.4 : 1.4;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); g.stroke();
    if (big && t % 20 === 0) OPS.tick(g, String(t), cx + Math.cos(a) * (r - 52), cy + Math.sin(a) * (r - 52), { color: t >= 80 ? 'warn' : 'dim', size: 17 });
  }
  // the needle: trembles with the kick as the number climbs past 80
  const tr = (o.tremble ?? 0) * (hash(f.tick, 3, 1) - 0.5) * 2;
  const a2 = ang + tr * 0.012, tip = [cx + Math.cos(a2) * (r - 30), cy + Math.sin(a2) * (r - 30)];
  g.strokeStyle = css('hot'); g.lineWidth = 4.5; glow(g, css('hot', 0.7), 20);
  g.beginPath(); g.moveTo(cx - Math.cos(a2) * 46, cy - Math.sin(a2) * 46); g.lineTo(tip[0], tip[1]); g.stroke();
  g.fillStyle = css('fg'); g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill();
  g.restore();
  return tip;
};

/** the giant rolling number under a dial */
OPS.num = function (g, f, v, o = {}) {
  const cx = o.cx ?? W / 2, y = o.y ?? 920, size = o.size ?? 104;
  g.save(); g.font = `600 ${size}px ${MONO}`; g.letterSpacing = `${0.04 * size}px`;
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const dead = o.flick != null && hash(Math.floor(f.t * 9), 5, 2) < o.flick;      // gauge③: dying segments
  if (dead) { g.fillStyle = css('dim', 0.35); }
  else { g.fillStyle = css(o.color ?? 'hot', 1); glow(g, css(o.color ?? 'hot', 0.65), size * 0.32); }
  g.fillText(`${v.toFixed(o.dec ?? 1)}%`, cx, y);
  g.restore();
};

// ---------------------------------------------------------------- scene furniture

/**
 * Ambient light: three big soft glows drifting through the frame (o: n, gain, seed). Gives the
 * quiet shots a room that lives — enough motion that they are never still frames.
 */
OPS.ambient = function (gl, f, o = {}) {
  const n = o.n ?? 3, gain = o.gain ?? 1, seed = o.seed ?? 5;
  for (let i = 0; i < n; i++) {
    const cx = W / 2 + Math.sin(f.t * (0.05 + 0.017 * i) + i * 2.2 + seed) * (300 + 220 * i);
    const cy = H / 2 + Math.cos(f.t * (0.04 + 0.021 * i) + i * 1.4 + seed) * (170 + 130 * i);
    const r = 480 + 190 * i, a = (0.045 + 0.03 * (0.5 + 0.5 * Math.sin(f.t * 0.5 + i))) * gain * (0.7 + 0.6 * f.a.low);
    const rg = gl.createRadialGradient(cx, cy, 30, cx, cy, r);
    rg.addColorStop(0, lmCss(i === 1 ? 'accent' : 'fg', a));
    rg.addColorStop(1, lmCss(i === 1 ? 'accent' : 'fg', 0));
    gl.fillStyle = rg;
    gl.fillRect(0, 0, W, H);
  }
};

/** far star dust behind everything (init: OPS.mkStars(n, seed) → cloud) */
OPS.mkStars = (n, seed = 1, r = 60) => LG.stars(n, r, { seed });

G.OPS = OPS;
G.glow = glow;   // this project's scenes paint halos with it
})(window);
