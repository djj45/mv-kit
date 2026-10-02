// pdoom-akari — what every shot shares: the palette, the art (or its placeholder), the AI's light (the only thing
// drawn in code on top of the illustrations: always signal orange with a white core), its text (dot font), and
// akStill(), the scene most shots are made of.
const AK = {
  signal: '#FF6A1A', day: false, sig: '255,106,26', core: '255,226,184', paper: '#FFF8EE', ink: '#15121F', acid: '#D8FF3C',
  // per act: placeholder sky / ground, grade for the art, the warm light that is really there in the picture
  ACT: {
    A: { sky: '#F4B66A', low: '#3A4A63', grade: { tint: '#F4B66A', amt: 0.08 }, glow: 0.32 },
    B: { sky: '#F7A46B', low: '#2C2A57', grade: { tint: '#F7A46B', amt: 0.06 }, glow: 0.3 },
    C: { sky: '#3F5FA0', low: '#141B33', grade: { tint: '#3F5FA0', amt: 0.06 }, glow: 0.3 },
    D: { sky: '#1D2C34', low: '#0B1216', grade: { tint: '#9FC3CF', amt: 0.1, sat: 0.85 }, glow: 0.25 },
    E: { sky: '#151821', low: '#0D0E13', grade: { tint: '#7E8BB0', amt: 0.1, sat: 0.8, expo: 0.9 }, glow: 0.35 },
    F: { sky: '#2A1B2E', low: '#0E0A12', grade: { tint: '#FF8A4C', amt: 0.06 }, glow: 0.38 },
    G: { sky: '#232045', low: '#0F0E22', grade: { tint: '#C9C2F0', amt: 0.06 }, glow: 0.35 },
    H: { sky: '#FFE4BC', low: '#A8CBEA', grade: { tint: '#FFE4BC', amt: 0.08 }, glow: 0.35 },
    K: { sky: '#DDDDDD', low: '#999999', grade: null, glow: 0 },
  },
  // 动感 (TREATMENT「动感」): the picture rides the beat, cuts between framings on the bar, the HUD ticks, fast verses pop.
  // motion: false brings back the previous, still version exactly. MOTION_RANGE limits it to a stretch of the song
  // (the act-2 sample); null = the whole film.
  motion: true,
  MOTION_RANGE: null,
  HUD_FROM: 'prompt1',   // the readout comes on the first time she types to it
  // …and is off in the meeting memory, in the blackout (act 5: the power is out — it dies with a glitch and boots again
  // with the tower), and for good once hook 4 has hit 99 % (it glitches out as the loom starts weaving)
  HUD_OFF: ['meeting', 'prompt3', 'hook3', 'paperclips', 'killswitch', 'nowhere', 'fuse', 'blues', 'loom', 'masked', 'recursive', 'see', 'show', 'sunrise', 'hairclip', 'monitor'],
};
/** Is motion on at f (AK.motion, inside MOTION_RANGE)? */
function akMotionOn(f) {
  const r = AK.MOTION_RANGE;
  return AK.motion && !(r && (f.t < r[0] || f.t >= r[1]));
}
/** Motion intensity at f: the section's energy (≈0 in the quiet chorus, 1 in the last), 0 where motion is off. */
function akMotion(f) { return akMotionOn(f) ? (f.section ? f.section.energy : 0.5) : 0; }

// ---------------------------------------------------------------- art
const AK_CACHE = {};
/** The prepared picture for an art id: graded + diffused once; a labelled placeholder until the pack exists. */
function akArt(id, o = {}) {
  const key = id + JSON.stringify(o);
  if (AK_CACHE[key]) return AK_CACHE[key];
  const img = illImage(id), act = AK.ACT[id[0]] || AK.ACT.K;
  const c = img ? illPrep(img, { glow: o.glow ?? act.glow, grade: o.grade === undefined ? act.grade : o.grade, w: o.w || 2560, thresh: o.thresh })
    : akPlaceholder(id);
  c.isPlaceholder = !img;
  return (AK_CACHE[key] = c);
}
const AK_CLIP_CACHE = new Map();
/**
 * A video clip of a picture (tools/dreamina.py → tools/frames.py: frame pack `clipId`, first frame = the still `id`),
 * graded like the still, at clip time ct; null until the pack exists (the shot then falls back to the still).
 * Each drawing is prepared when first shown and a few are kept (a render walks forward, so each is reused on twos).
 */
function akClipArt(clipId, id, ct, o = {}) {
  const img = illClipImage(clipId, ct); if (!img) return null;
  const key = img.src.length + ':' + img.src.slice(-48) + JSON.stringify(o);   // one drawing can be graded two ways (A3v: day in S03, night in S16)
  if (AK_CLIP_CACHE.has(key)) return AK_CLIP_CACHE.get(key);
  const act = AK.ACT[id[0]] || AK.ACT.K;
  const c = illPrep(img, { glow: o.glow ?? act.glow, grade: o.grade === undefined ? act.grade : o.grade, w: 2560, thresh: o.thresh });   // up to 2560: a 21:9 clip (H1v, 2176 wide) keeps its pixels
  AK_CLIP_CACHE.set(key, c); if (AK_CLIP_CACHE.size > 6) AK_CLIP_CACHE.delete(AK_CLIP_CACHE.keys().next().value);
  return c;
}
function akPlaceholder(id) {
  const [w0, h0, her, what] = AK_ART[id] || [2560, 1440, 0, id], s = Math.min(1, 2560 / w0), w = Math.round(w0 * s), h = Math.round(h0 * s);
  const act = AK.ACT[id[0]] || AK.ACT.K, c = mk(w, h), g = c.getContext('2d'), R = mulberry32(id.charCodeAt(0) * 97 + +id.slice(1));
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, act.sky); gr.addColorStop(1, act.low);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // a skyline / horizon so camera moves read
  g.fillStyle = 'rgba(0,0,0,0.28)';
  for (let x = 0; x < w;) { const bw = 40 + R() * 160, bh = h * (0.08 + R() * 0.25); g.fillRect(x, h * 0.72 - bh, bw - 6, bh + h); x += bw; }
  // her, as a grey stand-in where most of these pictures put her
  if (her) {
    g.fillStyle = 'rgba(20,18,30,0.55)';
    const cx = w * 0.42, cy = h * 0.55, r = h * 0.11;
    g.beginPath(); g.arc(cx, cy - r * 1.6, r, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(cx, cy + r * 1.4, r * 1.5, r * 2.2, 0, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48);
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `900 ${h * 0.16}px ${ILL.F.gothic}`; g.textBaseline = 'top';
  g.fillText(id, 70, 60);
  g.font = `700 ${h * 0.035}px ${ILL.F.gothic}`; g.fillStyle = 'rgba(255,255,255,0.7)';
  g.fillText(what, 74, 70 + h * 0.17);
  g.fillText('占位图（等插画）', 74, 70 + h * 0.22);
  return c;
}

// ---------------------------------------------------------------- the AI's light (additive, Canvas 2D)
/** A glowing stroke: wide faint halo, mid glow, white-hot core. pathFn(g) builds the path. */
function akGlowPath(g, pathFn, w = 3, a = 1, col = AK.sig) {
  if (a <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  if (AK.day) {   // painted, not added: on a bright or saturated sky added orange washes out to white
    g.globalCompositeOperation = 'source-over';
    for (const [lw, al, c] of [[w * 5, 0.12, col], [w * 2, 0.55, col], [w * 1.1, 0.95, col], [w * 0.4, 0.6, AK.core]]) { g.lineWidth = lw; g.strokeStyle = `rgba(${c},${al * a})`; pathFn(g); g.stroke(); }
    g.restore(); return;
  }
  for (const [lw, al, c] of [[w * 7, 0.07, col], [w * 3, 0.22, col], [w * 1.4, 0.7, col], [w * 0.55, 0.9, AK.core]]) {
    g.lineWidth = lw; g.strokeStyle = `rgba(${c},${al * a})`; pathFn(g); g.stroke();
  }
  g.restore();
}
/** A point of light: orange glow, white core; flickers per drawing. */
function akDot(g, x, y, r, a = 1, tk = 0, seed = 0) {
  if (a <= 0) return;
  const fl = 0.85 + 0.15 * hash(tk, seed, 5);
  if (AK.day) {   // on a bright sky added light disappears: paint an orange body first, then the light on it
    illFlare(g, x, y, r * 5, AK.sig, 0.35 * a * fl, { blend: 'source-over' });
    g.save(); g.fillStyle = `rgba(${AK.sig},${a})`; g.beginPath(); g.arc(x, y, r * 1.1, 0, TAU); g.fill(); g.restore();
  }
  illFlare(g, x, y, r * 6, AK.sig, 0.35 * a * fl);
  illFlare(g, x, y, r * 2.2, AK.sig, 0.8 * a * fl, { k: 0.4 });
  illFlare(g, x, y, r, AK.core, a, { core: '255,255,250', k: 0.5 });
}
/** The spark: a bright core with a short tail (direction vx, vy in px) and a few embers it sheds. */
function akSpark(g, x, y, r, t, o = {}) {
  const a = o.alpha ?? 1, tk = tick(t), vx = o.vx || 0, vy = o.vy || 0;
  if (vx || vy) akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x - vx, y - vy); }, r * 0.7, a * 0.6);
  // embers: born every 1/8 s, fly out and fade over 0.6 s (a function of time, not a simulation)
  g.save(); g.globalCompositeOperation = 'lighter';
  const n = o.embers ?? 6;
  for (let k = 0; k < n; k++) {
    const born = Math.floor(t * 8 - k) / 8, age = t - born, R = mulberry32(Math.floor(born * 8) * 31 + (o.seed || 0));
    if (age < 0 || age > 0.6) continue;
    const ang = R() * TAU, sp = r * (4 + R() * 8), ex = x + Math.cos(ang) * sp * age - vx * age * 0.8, ey = y + Math.sin(ang) * sp * age + 40 * age * age - vy * age * 0.8;
    g.fillStyle = `rgba(${AK.core},${a * (1 - age / 0.6)})`; g.beginPath(); g.arc(ex, ey, r * 0.12 + 1, 0, TAU); g.fill();
  }
  g.restore();
  akDot(g, x, y, r, a, tk, o.seed || 0);
}
/** Terminal block caret. */
function akCaret(g, x, y, h, on = true, a = 1) {
  if (!on || a <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = AK.signal; g.shadowBlur = h * 0.6;
  g.fillStyle = `rgba(${AK.sig},${a})`; g.fillRect(x, y - h, h * 0.55, h); g.shadowBlur = 0;
  g.fillStyle = `rgba(${AK.core},${0.5 * a})`; g.fillRect(x + h * 0.12, y - h * 0.85, h * 0.31, h * 0.7); g.restore();
}
/**
 * Its face: two dot eyes and (o.smile 0..1) a curved mouth; o.look shifts the eyes. o.evil (0..1) turns the friendly
 * face into the other one: the dots narrow into slanted slits under angled brows, the smile widens into a grin whose
 * corners hook upward, with a row of jagged teeth.
 */
function akFace(g, cx, cy, r, t, o = {}) {
  const tk = tick(t), lk = (o.look || 0) * r * 0.25, blink = o.blink ? 1 - pulse(t, o.blink, 0.12) * 0.9 : 1, a = o.alpha ?? 1;
  const ev = clamp(o.evil || 0);
  for (const s of [-1, 1]) {
    const ex = cx + s * r * 0.38 + lk * (1 - ev), ey = cy - r * 0.15;
    if (ev < 1) { g.save(); g.translate(ex, ey); g.scale(1, blink * (1 - ev)); akDot(g, 0, 0, r * 0.075, a * (1 - ev * 0.6), tk, s + 3); g.restore(); }
    if (ev > 0) {   // slit eye: high at the outer corner, low at the inner one; a brow slashing down toward the middle
      const ox = ex + s * r * 0.17, oy = ey - r * 0.07 * ev, ix = ex - s * r * 0.15, iy = ey + r * 0.05 * ev;
      akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(ox, oy); gg.quadraticCurveTo(ex, ey - r * 0.02, ix, iy); gg.quadraticCurveTo(ex, ey + r * 0.07 * ev, ox, oy); }, r * 0.028, a * ev);
      akDot(g, ex - s * r * 0.02, ey + r * 0.005, r * 0.03 * ev, a * ev, tk, s + 9);
      akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(ex + s * r * 0.2, ey - r * 0.2); gg.lineTo(ex - s * r * 0.17, ey - r * 0.1 + r * 0.03 * (1 - ev)); }, r * 0.03, a * ev);
    }
  }
  if (o.smile > 0 || ev > 0) {
    const sm = Math.max(o.smile || 0, ev), w = lerp(0.32, 0.45, ev) * sm, mr = r * lerp(0.42, 0.52, ev), my = cy + r * lerp(0.05, -0.04, ev), mx = cx + lk * 0.5 * (1 - ev);
    const a0 = Math.PI * (0.5 - w), a1 = Math.PI * (0.5 + w);
    akGlowPath(g, gg => {
      gg.beginPath(); gg.arc(mx, my, mr, a0, a1);
      if (ev > 0) {   // corners hook up and out
        for (const [aa, s] of [[a0, 1], [a1, -1]]) { const x = mx + Math.cos(aa) * mr, y = my + Math.sin(aa) * mr; gg.moveTo(x, y); gg.lineTo(x + s * r * 0.08 * ev, y - r * 0.16 * ev); }
      }
    }, r * lerp(0.035, 0.04, ev), a);
    if (ev > 0.15) {   // jagged teeth between the lip and an inner arc
      const n = 11, ir = mr * 0.78;
      akGlowPath(g, gg => {
        gg.beginPath();
        for (let i = 0; i <= n; i++) {
          const aa = lerp(a0 + 0.06, a1 - 0.06, i / n), rr = i % 2 ? ir : mr * 0.97;
          const x = mx + Math.cos(aa) * rr, y = my + Math.sin(aa) * rr;
          i ? gg.lineTo(x, y) : gg.moveTo(x, y);
        }
      }, r * 0.018, a * clamp((ev - 0.15) / 0.5));
    }
  }
  if (o.ring > 0) akGlowPath(g, gg => { gg.beginPath(); gg.arc(cx, cy, r, 0, TAU * o.ring); }, r * 0.03, a * 0.9);
}
/** What is behind the smile: a tangle of lines and many eyes, boiling per drawing. amt 0..1; o.n lines, o.eyes, o.lineAlpha (thin it out when n is large). */
function akTangle(g, cx, cy, r, t, amt, o = {}) {
  if (amt <= 0) return;
  const tk = tick(t), R = mulberry32(o.seed ?? 77), n = o.n ?? 220;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a0 = R() * TAU, a1 = a0 + (R() - 0.5) * 4, r0 = r * (0.2 + R() * 1.6), r1 = r * (0.2 + R() * 1.8), j = r * 0.04;
    const p0 = [cx + Math.cos(a0) * r0 + (hash(tk, i, 1) - 0.5) * j, cy + Math.sin(a0) * r0 * 0.8];
    const p1 = [cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1 * 0.8 + (hash(tk, i, 2) - 0.5) * j];
    const c1 = [cx + (R() - 0.5) * r * 3, cy + (R() - 0.5) * r * 2.4];
    g.strokeStyle = `rgba(${R() < 0.15 ? AK.core : AK.sig},${amt * (o.lineAlpha ?? 1) * (0.08 + R() * 0.25)})`; g.lineWidth = 0.8 + R() * 2.2;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo(c1[0], c1[1], p1[0], p1[1]); g.stroke();
  }
  g.restore();
  const ne = o.eyes ?? 36;
  for (let i = 0; i < ne; i++) {
    const a = R() * TAU, d = r * (0.3 + R() * 1.5), ex = cx + Math.cos(a) * d, ey = cy + Math.sin(a) * d * 0.75, er = r * (0.03 + R() * 0.07);
    g.save(); g.globalAlpha = amt; g.fillStyle = `rgba(${AK.core},0.9)`; g.beginPath(); g.ellipse(ex, ey, er * 1.8, er, (R() - 0.5) * 0.6, 0, TAU); g.fill();
    g.fillStyle = '#120a06'; g.beginPath(); g.arc(ex + (hash(tk, i, 9) - 0.5) * er * 0.6, ey, er * 0.55, 0, TAU); g.fill(); g.restore();
  }
}
/** A thread of light from a to b (quadratic sag), drawn on to k. */
function akThread(g, ax, ay, bx, by, k, o = {}) {
  if (k <= 0) return;
  const mx = (ax + bx) / 2 + (o.bend ?? 0), my = (ay + by) / 2 - (o.lift ?? 60), n = 24, pts = [];
  for (let i = 0; i <= n * clamp(k); i++) { const s = i / n, u = 1 - s; pts.push([u * u * ax + 2 * u * s * mx + s * s * bx, u * u * ay + 2 * u * s * my + s * s * by]); }
  if (pts.length < 2) return;
  akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(pts[0][0], pts[0][1]); for (const p of pts) gg.lineTo(p[0], p[1]); }, o.w ?? 1.6, o.alpha ?? 0.9);
  if (k < 1 && o.tip !== false) { const p = pts[pts.length - 1]; akDot(g, p[0], p[1], (o.w ?? 1.6) * 2, o.alpha ?? 1); }
}

// ---------------------------------------------------------------- the AI's text
/** Dot-font readout (terminal, HUD, labels). o: size, color, align, glow, alpha. */
function akText(g, s, x, y, o = {}) {
  g.save(); g.font = `400 ${o.size ?? 32}px ${ILL.F.dot}`; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  g.globalAlpha = o.alpha ?? 1;
  if (o.glow !== false) { g.shadowColor = o.glowColor || AK.signal; g.shadowBlur = (o.size ?? 32) * 0.4; }
  g.fillStyle = o.color || AK.signal; g.fillText(s, x, y); g.restore();
}
/** A detection box with a dot-font label, drawn on over 0.15 s from `at`. */
function akBox(g, x, y, w, h, label, t, at) {
  const k = prog(t, at, at + 0.15); if (k <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${AK.sig},${0.9 * k})`; g.lineWidth = 2;
  const c = Math.min(w, h) * 0.22 * k;
  for (const [px, py, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    g.beginPath(); g.moveTo(px + sx * c, py); g.lineTo(px, py); g.lineTo(px, py + sy * c); g.stroke();
  }
  g.restore();
  if (k >= 1 && label) { g.save(); g.fillStyle = 'rgba(255,106,26,0.85)'; g.font = `400 22px ${ILL.F.dot}`; const tw = g.measureText(label).width; g.fillRect(x, y - 30, tw + 14, 28); g.fillStyle = AK.ink; g.textBaseline = 'middle'; g.fillText(label, x + 7, y - 15); g.restore(); }
}
/**
 * Object-detector overlay (YOLO style): every box framing its whole object, a filled label tab "class 0.9x" on its
 * top-left corner. dets = [[class, conf, u, v, w, h], …] in art coords (see AK_SPOT.B8.det); map from illCover.
 * Boxes snap in one after another from `at` (o.stagger s apart), their edges wobble a little on every drawing (a live
 * detector never sits still) and the last digit of each confidence flickers every frame. Class colours stay in the
 * AI's warm light: person signal orange, umbrella amber, traffic light pale core, bags light orange.
 */
const AK_DET_COL = { person: '#FF6A1A', umbrella: '#FFC23D', 'traffic light': '#FFE2B8', handbag: '#FF9F45', backpack: '#FF9F45', car: '#FFE2B8' };
function akDetect(g, map, dets, f, at, o = {}) {
  const fr = Math.floor(f.t * (o.flickerRate ?? 24)), stagger = o.stagger ?? 0.012;
  g.save(); g.lineJoin = 'miter';
  dets.forEach(([cls, conf, u, v, w, h], i) => {
    const t0 = at + i * stagger, k = prog(f.t, t0, t0 + 0.08);
    if (k <= 0) return;
    const [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h), bw = x1 - x0, bh = y1 - y0;
    const jit = 1.2 + 0.012 * Math.max(bw, bh), J = (n) => (hash(f.tick, i, n) - 0.5) * 2 * jit;
    const pop = lerp(1.18, 1, ease.outCubic(k)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const ax = cx + (x0 - cx) * pop + J(1), ay = cy + (y0 - cy) * pop + J(2), bx = cx + (x1 - cx) * pop + J(3), by = cy + (y1 - cy) * pop + J(4);
    const col = AK_DET_COL[cls] || AK.signal, lw = Math.max(2, Math.min(4, bh * 0.012));
    g.globalAlpha = clamp(k * 2);
    g.shadowColor = col; g.shadowBlur = 8; g.strokeStyle = col; g.lineWidth = lw; g.strokeRect(ax, ay, bx - ax, by - ay); g.shadowBlur = 0;
    // label tab: class + confidence, last digit jumping every frame
    const d1 = Math.floor(conf * 10) % 10, d2 = Math.floor(hash(fr, i, 7) * 10), label = `${cls} 0.${d1}${d2}`;
    const fs = Math.round(clamp(bh * 0.09, 13, 20)); g.font = `700 ${fs}px ${ILL.F.gothic}`;
    const tw = g.measureText(label).width + fs * 0.6, th = fs * 1.35, ty = ay - th < 4 ? ay : ay - th;
    g.fillStyle = col; g.fillRect(ax - lw / 2, ty, tw, th);
    g.fillStyle = AK.ink; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(label, ax - lw / 2 + fs * 0.3, ty + th * 0.53);
  });
  g.restore();
}
/** P(doom) readout at shot time t rolling from a to b over [t0, t1]. */
function akPdoom(g, x, y, t, t0, t1, a, b, o = {}) {
  const v = lerp(a, b, prog(t, t0, t1, ease.outExpo));
  if (o.pill) {   // a dark rounded backing so the readout holds over a bright picture
    const sz = o.size ?? 32, tw = sz * 0.62 * 13; g.save(); g.fillStyle = 'rgba(14,12,22,0.72)'; g.beginPath(); g.roundRect(x - (o.align === 'center' ? tw / 2 : 0) - sz * 0.5, y - sz * 1.05, tw + sz, sz * 1.45, sz * 0.3); g.fill(); g.restore();
  }
  akText(g, `P(doom) = ${o.pct === false ? v.toFixed(2) : Math.round(v) + '%'}`, x, y, o);
}

// ---------------------------------------------------------------- HUD (动感): the AI's own readout, top left
const AK_PDOOM = [];   // [song time, %]: 2 % on the terminal, then a step on each hook's "doom" (the hooks roll the same numbers)
function akPdoomAt(f) {
  if (!AK_PDOOM.length) { AK_PDOOM.push([-1, 2]); [15, 42, 81, 99].forEach((v, n) => AK_PDOOM.push([akHookLine(f.lyrics, n).hit, v])); }
  let v = AK_PDOOM[0][1], at = null;
  for (let i = 1; i < AK_PDOOM.length; i++) { const [t0, b] = AK_PDOOM[i]; if (f.t >= t0) { v = lerp(AK_PDOOM[i - 1][1], b, prog(f.t, t0, t0 + 0.5, ease.outExpo)); at = t0; } }
  return { v, at };
}
/** P(doom) with a meter and a caret that blinks on the beat; under it a step counter and tok/s that tick every drawing. */
function akHud(g, f, a = 1) {
  if (a <= 0) return;
  const { v, at } = akPdoomAt(f), x = 96, y = 128, flick = at != null && f.t - at < 0.6 && f.tick % 2 ? 0.35 : 1;
  const label = `P(doom) ${Math.round(v)}%`;
  g.save(); g.globalAlpha = a;
  g.font = `400 30px ${ILL.F.dot}`; const tw = g.measureText(label).width;
  g.fillStyle = 'rgba(14,12,22,0.42)'; g.beginPath(); g.roundRect(x - 18, y - 40, Math.max(tw + 64, 330), 104, 10); g.fill();
  akText(g, label, x, y, { size: 30, alpha: flick });
  akCaret(g, x + tw + 10, y - 2, 24, f.beatPhase < 0.5);
  g.fillStyle = 'rgba(255,248,238,0.22)'; g.fillRect(x, y + 12, 240, 5);
  g.fillStyle = AK.signal; g.fillRect(x, y + 12, 240 * clamp(v / 100), 5);
  const step = 41000 + Math.floor(f.tq * 12 * 23), tok = Math.round(900 + 2600 * f.a.rms + 140 * hash(f.tick, 3));
  akText(g, `step ${step.toLocaleString('en')} · ${tok} tok/s`, x, y + 46, { size: 20, color: AK.paper, glow: false, alpha: 0.75 });
  g.restore();
}

// ---------------------------------------------------------------- lyrics, per shot
/**
 * Draw the line on screen at f.t in a style: spec = { style: 'verse' | 'slam' | 'slant' | 'quiet' | 'prompt' | 'none', ...options }.
 * With motion on and the band playing (energy ≥ 0.3), 'verse' is drawn as illPop at 1.35× and 'slant' bounces on the beat.
 */
function akLy(g, f, spec) {
  if (!spec || spec.style === 'none') return null;
  const line = illLineAt(f.lyrics, f.t, { hold: spec.hold ?? 1.2 });
  if (!line) return null;
  if (spec.only && !spec.only.some(q => line.text.toLowerCase().includes(q.toLowerCase()))) return null;
  let style = spec.style || 'verse';
  const o = { beatPhase: f.beatPhase, ...spec };
  if (akMotion(f) >= 0.3) {
    if (style === 'verse') { style = 'pop'; o.size = Math.round((spec.size ?? 68) * 1.35); }
    else if (style === 'slant') o.bounce = true;
  }
  const fn = { verse: illVerse, pop: illPop, slam: illSlam, slant: illSlant, quiet: illQuiet, prompt: illPrompt }[style];
  return fn(g, line, f.t, o);
}

// ---------------------------------------------------------------- the scene most shots are
/**
 * A still illustration shot. def = {
 *   art: 'A1' | (f) => id,                     the picture (switch by time with a function)
 *   cam: [[p, {x, y, z, rot}, ease], …] | (f) => cam,   camera over shot progress (or absolute time in a function)
 *   prep: { glow, grade, thresh },             override the act's grade
 *   under(g, f, map), fx(g, f, map),           code layers before / after the art's light pass
 *   ly: { style, … } | (f) => spec,            the lyric layer (always on top)
 *   post(f) → { shake, flash, … },             post overrides
 *   anchors(f) → { name: rect },                for zoom transitions
 *   — with motion on (AK.motion, AK.MOTION_RANGE) —
 *   snap: { shots: [{x, y, z, rot}, …], every | at, snap, creep } | (f) => …,   framings to cut between on the bar
 *                                              (illSnapCam); replaces cam
 *   groove: 1,                                 how hard the picture rides the beat (× the section's energy; 0 = still)
 *   clip: 'B4v' | (f) => id | null, clipAt: 0, clipRate: 1,   a video of the picture (frame pack) played from the
 *                                              shot's start (+ clipAt s) at clipRate× speed; the still until the pack
 *                                              exists (a function: which clip now, e.g. only while one of two pictures shows);
 *   clipT: (f) => s                            or time the clip yourself (seconds into the pack; e.g. a blink played fast)
 *   hud: true                                  the P(doom) readout top left
 * }
 */
function akStill(def) {
  return {
    init() { const ids = [].concat(def.arts || (typeof def.art === 'string' ? [def.art] : [])); ids.forEach(id => akArt(id, def.prep)); },
    render(g, f) {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const id = typeof def.art === 'function' ? def.art(f) : def.art, on = akMotionOn(f), e = akMotion(f);
      const snap = on && def.snap && (typeof def.snap === 'function' ? def.snap(f) : def.snap);
      let cam = snap ? illSnapCam(f, snap.shots, snap)
        : typeof def.cam === 'function' ? def.cam(f) : illCam(f.p, def.cam || [[0, { z: 1.02 }], [1, { z: 1.1 }, ease.inOutCubic]]);
      if (def.under) def.under(g, f);
      let map = null;
      if (id) {
        const clip = on && (typeof def.clip === 'function' ? def.clip(f) : def.clip);
        const src = (clip && akClipArt(clip, id, akClipT(f, def), def.prep)) || akArt(id, def.prep);
        if (on) cam = illGroove(f, cam, src, e * (def.groove ?? 1));
        map = illCover(g, src, cam);
      }
      AK.day = !!def.day;
      if (def.fx) def.fx(g, f, map, cam);
      AK.day = false;
      const ly = typeof def.ly === 'function' ? def.ly(f) : def.ly;
      akLy(g, f, ly);
      if (def.top) def.top(g, f, map);
      if (on && def.hud !== false) akHud(g, f, akHudIn(f));
      return akCutHit(f, def.post ? def.post(f) : {});
    },
    anchors: def.anchors,
  };
}
/** Where in its clip a shot is (seconds into the frame pack): def.clipT(f) if the scene times it itself. */
function akClipT(f, def) { return def.clipT ? def.clipT(f) : (f.tq - f.from) * (def.clipRate || 1) + (def.clipAt || 0); }
/**
 * Her eye in a clip, per packed drawing (AK_SPOT[clipId].eye, measured from the pack by tools/eyetrack.py):
 * { open 0..1 (0 = lid shut), dx, dy (pupil offset from the first drawing, art fractions) }, or null when the pack
 * or the measurement is missing (then the still: eye open, pupil where AK_SPOT says).
 */
function akEye(clipId, ct) {
  const p = (window.MV_FRAMES || {})[clipId], e = AK_SPOT[clipId] && AK_SPOT[clipId].eye;
  if (!p || !p.images || p.n < 2 || !e) return null;
  const i = clamp(Math.floor(ct * p.rate + 1e-6), 0, e.open.length - 1);
  return { open: e.open[i], dx: e.dx[i], dy: e.dy[i] };
}
/** Motion on and the band loud (energy > 0.6): the first drawing after a hard cut gets a light flash (an impact on the cut). */
function akCutHit(f, post) {
  if (!(akMotion(f) > 0.6) || (f.entry && f.entry.fadeIn) || f.lt >= 1 / 12) return post;
  return { ...post, flash: Math.max(post.flash || 0, 0.18) };
}
/** The HUD's opacity: it fades in over 0.4 s from the start of the AK.HUD_FROM shot. */
function akHudIn(f) {
  const e = MV.entries.find(x => x.scene === AK.HUD_FROM), t0 = e ? e.from : 0, name = f.entry && f.entry.scene;
  if (AK.HUD_OFF.includes(name)) {   // powering down: the first shot of a dark stretch glitches it out over 0.25 s
    const i = MV.entries.indexOf(f.entry), prev = MV.entries[i - 1];
    if (prev && !AK.HUD_OFF.includes(prev.scene) && f.t >= t0 && f.lt < 0.25) return f.tick % 2 ? 0 : 0.8 * (1 - f.lt / 0.25);
    return 0;
  }
  const i = MV.entries.indexOf(f.entry), prev = MV.entries[i - 1];   // booting again after a dark stretch: flicker on
  if (prev && AK.HUD_OFF.includes(prev.scene) && f.lt < 0.5) return f.lt < 0.3 ? (f.tick % 3 ? 0.2 : 0.9) : prog(f.lt, 0.3, 0.5);
  return prog(f.t, t0, t0 + 0.4);
}
/**
 * A scene drawn in code (not akStill) with the motion layer's top: the HUD and the impact on a hard cut.
 * Wraps def.render (whatever it returns stays the post); def.hud: false leaves the HUD out.
 */
function akCustom(def) {
  const render = def.render;
  def.render = function (g, f) {
    const post = render.call(this, g, f) || {};
    if (akMotionOn(f) && def.hud !== false) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; akHud(g, f, akHudIn(f)); g.restore(); }
    return akCutHit(f, post);
  };
  return def;
}

// ---------------------------------------------------------------- hooks
/** The "I'm upping my P(doom)" line of hook n (0..3) and the time "doom" lands (its second syllable). */
function akHookLine(lyrics, n) {
  const l = lyrics.lines.filter(x => /upping my p\(doom\)/i.test(x.text))[n], w = l.words.find(x => /doom/i.test(x.w));
  return { line: l, word: w, hit: w.syl ? w.syl[w.syl.length - 1][0] : w.start };
}
/** Hook overlay: words slam, then on "doom" a white flash, focus lines, a sound word and the P(doom) readout rolling a → b %. */
function akHook(g, f, o) {
  const { line, hit } = akHookLine(f.lyrics, o.n), cx = o.cx ?? W / 2, cy = o.cy ?? H * 0.44;
  const after = f.t - hit;
  if (after >= 0) focusLines(g, cx, cy, o.lines ?? 140, o.rIn ?? 380, `rgba(255,248,238,${0.5 * (1 - prog(after, 0.15, 1.0))})`, 5, f.tick, 9);
  illSlam(g, line, f.t, { x: cx, y: cy, size: o.size ?? 150, colorOf: w => (/doom/i.test(w.w) ? AK.signal : AK.paper), offColor: AK.signal, maxW: 1500 });
  if (after >= 0) {
    if (o.sfx) sfx(g, o.sfx, o.sfxX ?? W * 0.8, o.sfxY ?? H * 0.2, o.sfxSize ?? 180, 0.1, f.t, hit, { font: ILL.F.display, stroke: '#fffaf0', fill: AK.ink });
    akPdoom(g, o.rx ?? W / 2, o.ry ?? H - 130, f.t, hit, hit + 0.5, o.a, o.b, { size: o.rsize ?? 56, align: 'center', pill: true });
  }
  return { flash: 0.85 * pulse(f.t, hit, 0.18), shake: after >= 0 ? (o.shake ?? 10) * (1 - prog(after, 0, 0.5)) : 0 };
}

/** Lit windows / lamps of an illustration (art coords): its brightest points, or a scatter on a placeholder. */
function akLights(id, n, box = [0, 0.45, 1, 0.95]) {
  const key = 'L' + id + n + box;
  if (AK_CACHE[key]) return AK_CACHE[key];
  const art = akArt(id);
  let pts = art.isPlaceholder ? [] : illBright(art, n, { box, thresh: 0.5 });
  if (pts.length < n / 3) { const R = mulberry32(n + id.length * 7); pts = Array.from({ length: n }, () => ({ u: lerp(box[0], box[2], R()), v: lerp(box[1], box[3], Math.pow(R(), 0.7)), b: 0.6 + 0.4 * R() })); }
  return (AK_CACHE[key] = pts);
}
/** Start of word wordQ in the first line containing lineQ. */
function akWord(f, lineQ, wordQ) {
  const n = s => s.toLowerCase().replace(/[‘’]/g, "'"), l = f.lyrics.get(lineQ), k = n(wordQ), w = l.words.find(x => n(x.w).includes(k));
  if (!w) throw new Error(`akWord: no "${wordQ}" in "${l.text}"`);
  return w.start;
}
