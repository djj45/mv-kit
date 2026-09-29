// mv-kit style kit: hand-drawn Japanese TV-anime look (cel animation).
// Extracted from the P(doom) anime demo. Everything is a global function, available to any project
// that lists "anime" in project.kits. Pair it with project.drawRate = 12 (drawings "on twos") and
// grain ~0.09 in project.post.
//
//   paintCumulus(dst, cx, base, width, height, seed, sun)  hard-edged cel cumulus with warm rim bands
//   drawLit(g, fn, lx, ly, color, alpha)                   draw a character via fn(ctx), add a rim light
//   focusLines / upLines                                    集中線 focus lines, vertical speed lines
//   sfx(g, 'ドン', x, y, size, rot, t, at, opts)          katakana sound effect that pops in
//   titleText / lyricRow / bigWord / jpSub                   anime title-card lyric type, subtitles
const FONT = '"Noto Sans CJK JP","Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans JP",sans-serif';
const MONO = '"DejaVu Sans Mono","Menlo","SF Mono",monospace';
const INK = '#120c22';

// ------------------------------------------------------------------ painted cel cumulus (static background art)
function paintCumulus(dst, cx, base, width, height, seed, sun = [W / 2, H]) {
  const R = mulberry32(seed), bumps = [], levels = 6;
  for (let j = 0; j < levels; j++) {
    const f = j / (levels - 1), y = base - height * f * 0.8, half = width * 0.5 * (1 - 0.6 * f);
    const n = Math.max(1, Math.round(5 - 3.5 * f));
    for (let k = 0; k < n; k++) {
      const x = cx + (n === 1 ? 0 : lerp(-half, half, k / (n - 1))) + (R() - 0.5) * half * 0.3;
      const r = width * (0.19 - 0.08 * f) * (0.8 + 0.4 * R());
      bumps.push([x, y - r * 0.1, r]);
    }
  }
  const pad = width * 0.45, bx = cx - width / 2 - pad, by = base - height - pad, bw = width + pad * 2, bh = height + pad + 30;
  const cw = Math.ceil(bw), ch = Math.ceil(bh);
  const union = (g, dx, dy, grow = 0) => { g.beginPath(); for (const [x, y, r] of bumps) { g.moveTo(x + dx + r + grow, y + dy); g.arc(x + dx, y + dy, r + grow, 0, TAU); } };
  const c = mk(cw, ch), g = c.getContext('2d'); g.translate(-bx, -by);
  g.save(); g.beginPath(); g.rect(bx, by, bw, base - by); g.clip();
  const sg = g.createLinearGradient(0, base - height, 0, base);
  sg.addColorStop(0, '#8d7bbb'); sg.addColorStop(1, '#6b5089');
  g.fillStyle = sg; union(g, 0, 0); g.fill();
  g.restore();
  // cel bands: the part of the silhouette that the shifted silhouette does not cover
  const band = (col, dx, dy) => {
    const b = mk(cw, ch), bg = b.getContext('2d'); bg.translate(-bx, -by);
    bg.fillStyle = col; union(bg, 0, 0); bg.fill();
    bg.globalCompositeOperation = 'destination-out'; union(bg, -dx, -dy); bg.fill();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.drawImage(b, 0, 0); g.restore();
  };
  let sx = sun[0] - cx, sy = sun[1] - (base - height * 0.4); const sd = Math.hypot(sx, sy); sx /= sd; sy /= sd;
  band('#b99bcf', 0, -width * 0.04);                         // sky light on the tops
  band('#f2908a', sx * width * 0.1, sy * width * 0.1);       // warm lit side
  band('#ffc8a2', sx * width * 0.045, sy * width * 0.045);   // highlight
  band('#fff0d2', sx * width * 0.014, sy * width * 0.014);   // hot rim
  // inner definition: a few lit crescents on the upper bumps
  g.save(); g.globalCompositeOperation = 'source-atop';
  bumps.forEach(([x, y, r], i) => { if (i % 3 !== 1 || y > base - height * 0.25) return;
    const b = mk(cw, ch), bg = b.getContext('2d'); bg.translate(-bx, -by);
    bg.fillStyle = 'rgba(210,160,210,0.55)'; bg.beginPath(); bg.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95); bg.lineTo(x, y); bg.fill();
    bg.globalCompositeOperation = 'destination-out'; bg.beginPath(); bg.arc(x + r * 0.12, y + r * 0.2, r * 0.95, 0, TAU); bg.fill();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(b, 0, 0); g.restore(); });
  g.restore();
  dst.drawImage(c, bx, by);
}


// ------------------------------------------------------------------ rim light: render a character on its own layer, light the edges facing (lx, ly)
let CHAR = null, RIM = null;
function drawLit(g, fn, lx, ly, color, alpha = 1) {
  if (!CHAR || CHAR.width !== W) { CHAR = mk(W, H); RIM = mk(W, H); }
  const c = CHAR.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); fn(c);
  const r = RIM.getContext('2d'); r.setTransform(1, 0, 0, 1, 0, 0); r.globalCompositeOperation = 'source-over'; r.clearRect(0, 0, W, H);
  r.drawImage(CHAR, 0, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = color; r.fillRect(0, 0, W, H);
  r.globalCompositeOperation = 'destination-out'; r.drawImage(CHAR, -lx, -ly); r.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(CHAR, 0, 0); g.globalAlpha = alpha; g.drawImage(RIM, 0, 0); g.restore();
}


// ------------------------------------------------------------------ manga effects
function focusLines(g, cx, cy, n, rIn, color, seed, tk, maxW = 12) {
  const R = mulberry32(seed * 7919 + tk * 13), rOut = 2600; g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = R() * TAU, hw = (0.6 + R() * maxW) / rOut, ri = rIn * (0.75 + R() * 0.7);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
    g.lineTo(cx + Math.cos(a - hw) * rOut, cy + Math.sin(a - hw) * rOut); g.lineTo(cx + Math.cos(a + hw) * rOut, cy + Math.sin(a + hw) * rOut); g.fill();
  }
}
function upLines(g, t, color, n = 110, seed = 5) {
  const R = mulberry32(seed); g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = R() * W, w = 2 + R() * 9, len = 250 + R() * 900, sp = 3500 + R() * 3000;
    const y = ((R() * 3000 - t * sp) % 3000 + 3000) % 3000 - 900;
    g.beginPath(); g.moveTo(x - w / 2, y + len); g.lineTo(x + w / 2, y + len); g.lineTo(x, y); g.fill();
  }
}
function sfx(g, text, x, y, size, rot, t, at, o = {}) {
  const age = t - at; if (age < 0 || (o.until && t > o.until)) return;
  const tk = tick(t), k = clamp(age / 0.12), s = lerp(1.7, 1, ease.outBack(k));
  g.save(); g.translate(x + (hash(tk, 11) - 0.5) * size * 0.05, y + (hash(tk, 12) - 0.5) * size * 0.05); g.rotate(rot); g.scale(s, s); g.transform(1, 0, -0.2, 1, 0, 0);
  g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const chars = o.vertical ? [...text] : [text];
  chars.forEach((ch, i) => {
    const yy = o.vertical ? i * size * 0.92 : 0, xx = o.vertical ? Math.sin(i * 1.7) * size * 0.08 : 0;
    const ii = o.vertical && o.stagger ? clamp((age - i * o.stagger) / 0.1) : 1; if (ii <= 0) return;
    g.save(); g.translate(xx, yy); g.scale(lerp(1.5, 1, ii) * (1 + i * (o.grow || 0)), lerp(1.5, 1, ii) * (1 + i * (o.grow || 0)));
    g.lineWidth = size * 0.26; g.strokeStyle = o.stroke || '#fffaf0'; g.strokeText(ch, 0, 0);
    g.lineWidth = size * 0.07; g.strokeStyle = o.ink || INK; g.strokeText(ch, 0, 0);
    g.fillStyle = o.fill || INK; g.fillText(ch, 0, 0); g.restore();
  });
  g.restore();
}

// ------------------------------------------------------------------ lyric type: anime title-card style, synced per word
function titleText(g, s, x, y, size, hot) {
  g.lineJoin = 'round'; g.miterLimit = 2; const off = size * 0.07;
  g.lineWidth = size * 0.17; g.strokeStyle = INK; g.strokeText(s, x + off, y + off);
  g.fillStyle = hot ? '#ff5a1f' : '#e0482a'; g.fillText(s, x + off, y + off);
  g.strokeText(s, x, y); g.fillStyle = '#fff7ea'; g.fillText(s, x, y);
}
function lyricRow(g, toks, t, x, y, size, o = {}) {
  g.save(); g.font = `italic 900 ${size}px ${FONT}`; g.textBaseline = 'alphabetic';
  const sp = g.measureText(' ').width * 1.35; let cx = x;
  toks.forEach((tk, i) => {
    const w = g.measureText(tk.text).width;
    if (t >= tk.start - 0.01) {
      const k = clamp((t - tk.start) / 0.13), s = lerp(1.5, 1, ease.outBack(k)), hot = t < tk.end + 0.05;
      const sh = (o.shake && o.shake(tk, t)) || 0, tkk = tick(t);
      g.save(); g.translate(cx + w / 2 + (hash(tkk, i, 3) - 0.5) * sh, y - size * 0.35 + (hash(tkk, i, 4) - 0.5) * sh);
      g.rotate((o.rot || 0) + (1 - k) * -0.08); g.scale(s, s); g.translate(-w / 2, size * 0.35);
      titleText(g, tk.text, 0, 0, size, hot); g.restore();
    }
    cx += w + (tk.join ? 0 : sp);
  });
  g.restore();
}
function jpSub(g, text, t, at, x, y, o = {}) {
  const a = prog(t, at, at + 0.15); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = `700 ${o.size || 34}px ${FONT}`; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  g.lineWidth = 7; g.strokeStyle = 'rgba(18,12,34,0.9)'; g.strokeText(text, x, y); g.fillStyle = '#fff4e6'; g.fillText(text, x, y); g.restore();
}

function bigWord(g, s, x, y, size, fill, ink, sx = 1, shadow = '#ff5a1f') {
  g.save(); g.translate(x, y); g.scale(sx, 1); g.font = `italic 900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const off = size * 0.05; g.lineWidth = size * 0.1; g.strokeStyle = ink; g.strokeText(s, off, off); g.fillStyle = shadow; g.fillText(s, off, off);
  g.strokeText(s, 0, 0); g.fillStyle = fill; g.fillText(s, 0, 0); g.restore();
}
