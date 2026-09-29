// ------------------------------------------------------------------ S3a — "please don't": her face, front view (reverse angle)
// Character sheet: long straight navy hair with sharp pointed bangs and side locks; narrow red-brown eyes
// warming to orange at the bottom; navy sailor collar with two white stripes, red scarf bow.
let EAST;
function paintEast() { // the sky behind her (east, away from the sunset) and the rooftop stairwell, lit from the front
  const c = mk(W + 240, H + 260), g = c.getContext('2d'), cw = c.width, ch = c.height, R = mulberry32(31);
  const gr = g.createLinearGradient(0, 0, 0, ch);
  gr.addColorStop(0, '#0f1238'); gr.addColorStop(0.45, '#262d68'); gr.addColorStop(0.66, '#4a4a8e'); gr.addColorStop(0.75, '#b886ab'); gr.addColorStop(0.8, '#e8a9a8'); gr.addColorStop(0.86, '#6b5f9a'); gr.addColorStop(1, '#3e3772');
  g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 220; i++) { const y = Math.pow(R(), 1.4) * ch * 0.6; g.fillStyle = `rgba(255,245,235,${(0.3 + 0.6 * R()) * (1 - y / (ch * 0.62))})`; g.beginPath(); g.arc(R() * cw, y, 0.8 + R() * 1.7, 0, TAU); g.fill(); }
  const s = mk(cw, ch), q = s.getContext('2d');
  const wall = q.createLinearGradient(0, 430, 0, ch); wall.addColorStop(0, '#e9a28c'); wall.addColorStop(1, '#9a6480');
  q.fillStyle = wall; q.fillRect(60, 430, 560, ch);
  q.fillStyle = '#62487a'; q.beginPath(); q.moveTo(620, 430); q.lineTo(705, 468); q.lineTo(705, ch); q.lineTo(620, ch); q.fill();
  q.fillStyle = '#f5bca2'; q.fillRect(44, 408, 590, 26); q.fillStyle = '#7a5a88'; q.beginPath(); q.moveTo(634, 408); q.lineTo(718, 446); q.lineTo(718, 470); q.lineTo(634, 434); q.fill();
  q.fillStyle = '#3a2a52'; q.fillRect(250, 700, 210, ch); q.strokeStyle = '#f7c6a8'; q.lineWidth = 7; q.strokeRect(250, 700, 210, ch);
  q.fillStyle = '#ffd9a4'; q.fillRect(480, 540, 90, 62); q.strokeStyle = '#5a3d62'; q.lineWidth = 5; q.strokeRect(480, 540, 90, 62);
  q.strokeStyle = '#3a2a4e'; q.lineWidth = 9; for (const lx of [190, 300, 420]) { q.beginPath(); q.moveTo(lx, 300); q.lineTo(lx, 410); q.stroke(); }
  q.fillStyle = '#eca28c'; q.fillRect(150, 170, 340, 150); q.fillStyle = '#7a5a8e'; q.fillRect(390, 170, 100, 150);
  q.fillStyle = '#f7c2a6'; q.beginPath(); q.ellipse(320, 170, 170, 28, 0, 0, TAU); q.fill();
  q.strokeStyle = '#2a1c3c'; q.lineWidth = 5; q.beginPath(); q.ellipse(320, 170, 170, 28, 0, 0, TAU); q.stroke(); q.strokeRect(150, 170, 340, 150);
  for (let x = 1480; x < cw; x += 74) { q.fillStyle = '#2a2146'; q.fillRect(x, 860, 10, 260); q.fillStyle = '#f2a88f'; q.fillRect(x, 860, 3, 260); }
  q.fillStyle = '#f0a890'; q.fillRect(1440, 846, cw, 14);
  q.fillStyle = '#4a3a70'; q.fillRect(0, 1110, cw, ch);
  g.filter = 'blur(3px)'; g.drawImage(s, 0, 0); g.filter = 'none';
  return c;
}

const HAIR = '#1a1934', HAIR_HI = '#353a6e', SKIN = '#f8e2d4', SKIN_SH = '#d99a8f', SKIN_CORE = '#b9777a', SHIRT = '#fbf1ec', SHIRT_SH = '#c4b0d2', NAVY = '#20264f', RED = '#d8324a', RED_SH = '#9e1f38';
function mouthOpen(tq) { // lip flaps (口パク): three mouth shapes, driven by the sung words
  for (const w of [wPlease, wDont]) if (tq >= w.start && tq < w.end) { const u = (tq - w.start) / (w.end - w.start); const m = u < 0.2 ? u / 0.2 : 1 - 0.7 * (u - 0.2) / 0.8; return Math.round(m * 2) / 2; }
  return 0;
}
function drawFace(g, x, y, r, t) {
  const tq = onTwos(t), tk = tick(t), lw = 0.024;
  const J = (px, py, i, a = 0.006) => [px + (hash(tk, i, 1) - 0.5) * 2 * a, py + (hash(tk, i, 2) - 0.5) * 2 * a];
  const scared = ease.outCubic(prog(tq, wDont.start, wDont.start + 0.16)), worry = 0.35 + 0.65 * scared;
  const blink = tq >= CUT.s3 + 0.34 && tq < CUT.s3 + 0.42 ? 0.06 : 1, m = mouthOpen(tq);
  const sway = k => Math.sin(tq * 5.3 + k * 1.3) * 0.03;
  g.save(); g.translate(x, y); g.scale(r, r); g.rotate(-0.035);
  // back hair
  const bh = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (0.94 + 1.12 * i / 14); bh.push(J(Math.cos(a) * 1.1, Math.sin(a) * 1.1, 500 + i)); }
  for (let i = 1; i <= 6; i++) { const u = i / 6; bh.push(J(lerp(1.08, 1.62, u) + sway(1) * u * 3, lerp(0.35, 3.3, u), 520 + i)); }
  for (let k = 1; k < 12; k++) { const u = k / 12; bh.push(J(lerp(1.62, -1.62, u) + sway(2) * 3, k % 2 ? 3.6 : 3.25, 540 + k)); }
  for (let i = 6; i >= 1; i--) { const u = i / 6; bh.push(J(-lerp(1.08, 1.62, u) + sway(3) * u * 3, lerp(0.35, 3.3, u), 560 + i)); }
  pathPoly(g, bh); fillStroke(g, '#15142c', INK, lw);
  // shirt / shoulders
  const body = [J(-0.28, 1.5, 1), J(0.28, 1.5, 2), J(0.7, 1.64, 3), J(1.2, 1.82, 4), J(1.46, 2.2, 5), J(1.56, 3.4, 6), J(1.6, 4.5, 7), J(-1.6, 4.5, 8), J(-1.56, 3.4, 9), J(-1.46, 2.2, 10), J(-1.2, 1.82, 11), J(-0.7, 1.64, 12)];
  pathSmooth(g, body); fillStroke(g, SHIRT, INK, lw);
  g.save(); pathSmooth(g, body); g.clip(); g.fillStyle = SHIRT_SH; g.beginPath(); g.moveTo(0.95, 1.5); g.quadraticCurveTo(1.05, 2.6, 0.8, 4.6); g.lineTo(2, 4.6); g.lineTo(2, 1.5); g.fill(); g.restore();
  // neck and the skin of the V-neck
  g.beginPath(); g.moveTo(-0.25, 0.7); g.lineTo(-0.28, 1.52); g.quadraticCurveTo(-0.34, 1.7, -0.42, 1.74); g.lineTo(0, 2.34); g.lineTo(0.42, 1.74); g.quadraticCurveTo(0.34, 1.7, 0.28, 1.52); g.lineTo(0.25, 0.7); g.closePath();
  fillStroke(g, SKIN, INK, lw);
  g.save(); g.clip(); g.fillStyle = SKIN_SH; g.beginPath(); g.ellipse(0, 0.98, 0.55, 0.36, 0, 0, TAU); g.fill(); g.fillRect(0.12, 0.7, 0.3, 1.8); g.restore();
  for (const sx of [-1, 1]) brush(g, [[sx * 0.1, 1.86], [sx * 0.24, 1.82], [sx * 0.36, 1.84]], 0.022, '#d99586', 'both');
  // sailor collar lapels and the scarf bow
  for (const sx of [-1, 1]) {
    pathPoly(g, [J(sx * 0.36, 1.54, 600 + sx), J(sx * 1.26, 1.86, 602 + sx), J(sx * 1.18, 2.26, 604 + sx), J(0, 2.92, 606), J(0, 2.36, 607)]);
    fillStroke(g, NAVY, INK, lw);
    for (const ins of [0.07, 0.13]) { g.beginPath(); g.moveTo(sx * (1.24 - ins * 0.3), 1.9 + ins * 0.1); g.lineTo(sx * (1.16 - ins), 2.24); g.lineTo(0, 2.92 - ins * 1.3); g.lineWidth = 0.025; g.strokeStyle = '#ece7f4'; g.stroke(); }
  }
  for (const sx of [-1, 1]) { // tails, loops
    brush(g, bez2(J(sx * 0.05, 2.88, 620 + sx), J(sx * 0.2, 3.25, 622 + sx), J(sx * 0.28 + sway(4 + sx) * 3, 3.7, 624 + sx), 10), 0.2, RED, s => 1 - 0.3 * s, INK, lw);
    g.beginPath(); g.ellipse(sx * 0.27, 2.84, 0.28, 0.13, sx * -0.22, 0, TAU); fillStroke(g, RED, INK, lw);
    g.beginPath(); g.ellipse(sx * 0.27, 2.88, 0.18, 0.06, sx * -0.22, 0, TAU); g.fillStyle = RED_SH; g.fill();
  }
  g.beginPath(); g.ellipse(0, 2.86, 0.09, 0.1, 0, 0, TAU); fillStroke(g, RED, INK, lw);
  // face
  const facePath = () => {
    g.beginPath(); g.moveTo(-0.97, -0.05);
    g.bezierCurveTo(-0.97, 0.45, -0.9, 0.74, -0.62, 1.0); g.bezierCurveTo(-0.4, 1.17, -0.12, 1.25, 0, 1.27);
    g.bezierCurveTo(0.12, 1.25, 0.4, 1.17, 0.62, 1.0); g.bezierCurveTo(0.9, 0.74, 0.97, 0.45, 0.97, -0.05);
    g.arc(0, 0, 0.97, -0.05, Math.PI + 0.05, true); g.closePath();
  };
  facePath(); fillStroke(g, SKIN, INK, lw);
  const bangs = [];
  const tips = [0.2, 0.3, 0.16, 0.38, 0.24, 0.44, 0.2, 0.36, 0.26, 0.32, 0.18];
  const NB = tips.length;
  for (let k = 0; k < NB; k++) {
    const u = lerp(-1, 1, k / (NB - 1)), tx = u * 0.98 + sway(k) * 0.5, root = [0.12 + u * 0.18, -1.02];
    bangs.push(bez2(J(root[0], root[1], 640 + k), J(u * 1.05 + 0.06, -0.62, 650 + k), J(tx, tips[k], 660 + k), 14));
  }
  const lockT = s => Math.pow(s < 0.35 ? 0.35 + 0.65 * s / 0.35 : 1 - (s - 0.35) / 0.65, 1.1);
  g.save(); facePath(); g.clip();
  g.fillStyle = SKIN_SH; g.beginPath(); g.moveTo(0.58, -0.4); g.bezierCurveTo(0.74, 0.3, 0.66, 0.8, 0.12, 1.3); g.lineTo(1.4, 1.4); g.lineTo(1.4, -0.4); g.fill();
  g.fillStyle = SKIN_CORE; g.beginPath(); g.moveTo(0.86, 0.2); g.bezierCurveTo(0.9, 0.6, 0.78, 0.95, 0.45, 1.25); g.lineTo(1.4, 1.4); g.lineTo(1.4, 0.2); g.fill();
  for (const L of bangs) brush(g, L.map(p => [p[0] + 0.03, p[1] + 0.1]), 0.34, SKIN_SH, lockT);
  g.restore();
  // nose (bridge shadow + tip), mouth
  g.fillStyle = 'rgba(217,154,143,0.7)'; g.beginPath(); g.moveTo(0.0, 0.64); g.lineTo(0.05, 0.78); g.lineTo(-0.02, 0.8); g.closePath(); g.fill();
  brush(g, [[0.05, 0.74], [0.06, 0.79], [0.0, 0.815]], 0.024, '#9a5c58', 'both');
  const grit = scared > 0.5;
  if (!grit && m < 0.25) brush(g, bez2([-0.09, 1.0], [0, 0.985], [0.09, 1.005], 8), 0.022, '#4a1c2c', 'both');
  else if (!grit) {
    const mw = 0.07 + 0.015 * m, mh = 0.02 + 0.06 * m;
    const mp = () => { g.beginPath(); g.moveTo(-mw, 0.995); g.quadraticCurveTo(0, 0.98, mw, 1.0); g.quadraticCurveTo(mw * 0.7, 0.995 + mh, 0, 0.998 + mh); g.quadraticCurveTo(-mw * 0.7, 0.995 + mh, -mw, 0.995); g.closePath(); };
    mp(); g.fillStyle = '#4e1628'; g.fill(); g.save(); mp(); g.clip(); g.fillStyle = '#f2ece8'; g.fillRect(-mw, 0.975, mw * 2, 0.03); g.restore();
    mp(); g.lineWidth = 0.016; g.strokeStyle = INK; g.stroke();
  } else { // gritted teeth
    const mw = 0.13, mh = 0.05 + 0.03 * m, cy = 1.0;
    const mp = () => { g.beginPath(); g.moveTo(-mw, cy + 0.02); g.quadraticCurveTo(-mw * 0.6, cy - mh * 0.55, 0, cy - mh * 0.5); g.quadraticCurveTo(mw * 0.6, cy - mh * 0.55, mw, cy + 0.02); g.quadraticCurveTo(mw * 0.55, cy + mh * 0.65, 0, cy + mh * 0.6); g.quadraticCurveTo(-mw * 0.55, cy + mh * 0.65, -mw, cy + 0.02); g.closePath(); };
    mp(); g.fillStyle = '#f2ece8'; g.fill(); g.save(); mp(); g.clip();
    g.strokeStyle = '#8a7a86'; g.lineWidth = 0.012; g.beginPath(); g.moveTo(-mw, cy + 0.005); g.lineTo(mw, cy + 0.005); g.stroke();
    for (const tx of [-0.08, -0.035, 0.015, 0.06, 0.1]) { g.beginPath(); g.moveTo(tx, cy - mh * 0.5); g.lineTo(tx + 0.004, cy + mh * 0.6); g.stroke(); }
    g.restore(); mp(); g.lineWidth = 0.02; g.strokeStyle = INK; g.stroke();
  }
  // eyes (same design as the close-up)
  for (const sx of [-1, 1]) {
    g.save(); g.translate(sx * 0.44, 0.55); const k = 0.64 / 805; g.scale(sx * k, k);
    drawEye(g, { x: 0, y: 0 }, t, tk, blink, 0.05 + 0.3 * scared, 0.15 * scared, 0, 0, { tall: 1.38, iris: 1.12, hi: sx, look: [-10, -22] });
    g.restore();
  }
  // crown, angel ring
  g.beginPath(); g.arc(0, 0, 1.08, Math.PI * 0.96, Math.PI * 2.04); g.closePath(); fillStroke(g, HAIR, INK, lw);
  // bangs (outside in, so the middle locks are on top)
  const order = [...Array(NB).keys()].sort((a, b) => Math.abs(b - (NB - 1) / 2) - Math.abs(a - (NB - 1) / 2));
  // fill every lock, ink only the lower part of each (the crown stays clean, like a key drawing)
  for (const k of order) {
    const L = bangs[k], P = brushPoly(L, 0.34, lockT), n = L.length, k0 = Math.round(n * (k % 3 === 1 ? 0.35 : 0.55));
    pathPoly(g, P); g.fillStyle = HAIR; g.fill();
    g.beginPath(); g.moveTo(P[k0][0], P[k0][1]); for (let i = k0 + 1; i < n; i++) g.lineTo(P[i][0], P[i][1]); for (let i = n; i < 2 * n - k0; i++) g.lineTo(P[i][0], P[i][1]);
    g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  }
  // angel ring: one zigzag highlight band across the crown and bangs, clipped to the hair
  g.save(); g.beginPath(); g.arc(0, 0, 1.08, Math.PI * 0.96, Math.PI * 2.04); g.closePath();
  for (const k of order) { const P = brushPoly(bangs[k], 0.34, lockT); g.moveTo(P[0][0], P[0][1]); for (const q of P) g.lineTo(q[0], q[1]); g.closePath(); }
  g.clip('nonzero');
  const band = [];
  for (let i = 0; i <= 16; i++) { const u = lerp(-1, 1, i / 16); band.push(J(u * 1.1, -0.62 + 0.28 * u * u - (i % 2 ? 0.05 : -0.02), 780 + i, 0.01)); }
  for (let i = 16; i >= 0; i--) { const u = lerp(-1, 1, i / 16); band.push(J(u * 1.1, -0.5 + 0.28 * u * u + (i % 2 ? 0.07 : -0.01), 800 + i, 0.01)); }
  pathPoly(g, band); g.fillStyle = HAIR_HI; g.globalAlpha = 0.8; g.fill();
  g.restore();
  // side locks framing the face
  for (const sx of [-1, 1]) {
    const L = bez3(J(sx * 0.7, -0.75, 740 + sx), J(sx * 1.12, 0.1, 742 + sx), J(sx * 1.02, 1.5, 744 + sx), J(sx * 1.0 + sway(6 + sx) * 3, 2.55, 746 + sx), 18);
    brush(g, L, 0.36, HAIR, s => (s < 0.25 ? 0.2 + 3.2 * s : 1 - 0.85 * Math.pow((s - 0.25) / 0.75, 1.4)), INK, lw);
    brush(g, L.slice(3, 10).map(p => [p[0] - sx * 0.04, p[1]]), 0.05, HAIR_HI, 'both');
  }
  // eyebrows, drawn over the bangs as anime does
  for (const sx of [-1, 1]) brush(g, bez2([sx * 0.14, 0.3 + 0.05 * worry], [sx * 0.4, 0.2], [sx * 0.76, 0.22 - 0.02 * worry], 10), 0.05, '#1c1530', s => (s < 0.15 ? 0.5 + 3.3 * s : 1 - 0.7 * Math.pow((s - 0.15) / 0.85, 2)));
  // sweat drop
  if (tq >= wDont.start) {
    const sp = ease.outCubic(prog(tq, wDont.start, wDont.start + 0.6)), sx0 = 0.84, sy0 = 0.02 + 0.22 * sp;
    g.beginPath(); g.moveTo(sx0, sy0 - 0.15); g.bezierCurveTo(sx0 + 0.03, sy0 - 0.07, sx0 + 0.07, sy0 - 0.01, sx0 + 0.07, sy0 + 0.04); g.arc(sx0, sy0 + 0.04, 0.07, 0, Math.PI); g.bezierCurveTo(sx0 - 0.07, sy0 - 0.01, sx0 - 0.03, sy0 - 0.07, sx0, sy0 - 0.15);
    fillStroke(g, '#bfe6ff', INK, lw); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sx0 + 0.025, sy0 + 0.035, 0.014, 0.025, -0.3, 0, TAU); g.fill();
  }
  g.restore();
}
function drawEye(g, E, t, tk, openK, widen, shock, jx, jy, o = {}) {
  // Sharp, grown-up action-anime eye: narrow almond, lifted outer corner, heavy straight lash line,
  // a smaller iris half under the lid, one crisp highlight.
  const tall = o.tall || 1, irisK = (o.iris || 1) * 0.86, hs = o.hi || 1, look = o.look || [0, 0];
  const ex = E.x, ey = E.y, inner = [ex - 400, ey + 62 * tall], outer = [ex + 405, ey - 58 * tall];
  const top = ey - (128 + widen * 60) * tall, low = ey + (96 + widen * 30) * tall;
  const lower = [outer, [ex + 250, low - 8], [ex - 170, low + 4], inner];
  const upperOpen = [inner, [ex - 240, top + 6], [ex + 200, top - 26], outer];
  const upperClosed = [inner, [ex - 170, low + 4], [ex + 250, low - 8], outer];
  const up = upperOpen.map((p, i) => [lerp(upperClosed[i][0], p[0], openK), lerp(upperClosed[i][1], p[1], openK)]);
  const eyePath = () => { g.beginPath(); g.moveTo(...inner); g.bezierCurveTo(...up[1], ...up[2], ...up[3]); g.bezierCurveTo(...lower[1], ...lower[2], ...lower[3]); g.closePath(); };
  g.save(); eyePath(); g.clip();
  g.fillStyle = '#f4f0f6'; g.fillRect(ex - 500, ey - 400, 1000, 800);
  const upPts = bez3(up[0], up[1], up[2], up[3], 24);
  const lidShadow = (dy, col) => { g.beginPath(); upPts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] - 4) : g.moveTo(p[0], p[1] - 4))); for (let i = upPts.length - 1; i >= 0; i--) g.lineTo(upPts[i][0], upPts[i][1] + dy); g.closePath(); g.fillStyle = col; g.fill(); };
  lidShadow(62 * Math.sqrt(tall), '#bdb3d0');
  // iris
  const cx = ex + 20 + jx + look[0], cy = ey + 30 * tall + jy + look[1], rx = 178 * irisK, ry = 205 * irisK;
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.clip();
  const ig = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  ig.addColorStop(0, '#1c0c22'); ig.addColorStop(0.5, '#4a1a36'); ig.addColorStop(0.85, '#a8432f'); ig.addColorStop(1, '#e0773f');
  g.fillStyle = ig; g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  g.fillStyle = 'rgba(240,140,80,0.4)'; g.beginPath(); g.ellipse(cx, cy + ry * 0.72, rx * 0.62, ry * 0.3, 0, 0, TAU); g.fill();
  g.fillStyle = '#0e050c'; g.beginPath(); g.ellipse(cx, cy + 6, lerp(62, 16, shock), lerp(84, 24, shock), 0, 0, TAU); g.fill();
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,160,80,0.8)'; g.lineWidth = 4;
  const hr = 28 * (1 - shock * 0.3); g.beginPath(); g.ellipse(cx - 30 * hs, cy + 60, hr, hr * 0.92, 0, 0, TAU); g.stroke(); g.restore();
  // heavy lid shadow over the top of the iris
  g.beginPath(); upPts.forEach((p, i) => (i ? g.lineTo(p[0], p[1] - 4) : g.moveTo(p[0], p[1] - 4))); for (let i = upPts.length - 1; i >= 0; i--) g.lineTo(upPts[i][0], upPts[i][1] + 105 * Math.sqrt(tall)); g.closePath(); g.fillStyle = 'rgba(12,4,16,0.7)'; g.fill();
  g.restore();
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.lineWidth = 11; g.strokeStyle = '#140810'; g.stroke();
  // one crisp highlight and a pin-point
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(cx - 58 * hs, cy - 50, 30 * irisK, 20 * irisK, -0.5 * hs, 0, TAU); g.fill();
  g.beginPath(); g.arc(cx + 60 * hs, cy + 70, 8, 0, TAU); g.fill();
  g.restore();
  // lash line: thick and straight, heavier at the outer third, with a sharp wing
  const ext = [[outer[0] + 70, outer[1] - 30], [outer[0] + 120, outer[1] - 46]];
  brush(g, upPts.concat(ext), 54, '#120a18', s => (s < 0.55 ? 0.25 + 0.75 * s / 0.55 : 1 - 0.8 * Math.pow((s - 0.55) / 0.45, 1.5)));
  brush(g, bez2([outer[0] - 20, outer[1] - 4], [outer[0] + 50, outer[1] + 6], [outer[0] + 95, outer[1] + 30]), 14, '#120a18', 'tail');
  const loPts = bez3(lower[0], lower[1], lower[2], lower[3], 24);
  brush(g, loPts.slice(0, 16), 11, '#2a1624', 'tail');
  brush(g, loPts.slice(20), 7, '#2a1624', 'head');
  brush(g, loPts.slice(2, 14).map(p => [p[0] - 10, p[1] + 34]), 6, 'rgba(150,90,90,0.6)', 'both'); // under-eye line
  brush(g, upPts.slice(6, 22).map(p => [p[0] + 10, p[1] - 48 - widen * 12]), 9, '#a86a62', 'both');   // crease
}

// S4 / S5 shared — "alive": the halo opens into a maw, her hair is pulled towards it.
