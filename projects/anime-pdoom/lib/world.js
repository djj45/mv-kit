// The painted world of the rooftop shots: sky, clouds, city, fence; camera; the rooftop composition.
const WORLD = { w: 3200, h: 1800, horizon: 1250, sun: [1600, 1270] };
let SKY, CLOUDS, CITY, FENCE, PUFFS, TMP;

function paintSky() {
  const c = mk(WORLD.w, WORLD.h), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, WORLD.horizon);
  gr.addColorStop(0, '#171d4d'); gr.addColorStop(0.3, '#3a3a7c'); gr.addColorStop(0.58, '#a4588c');
  gr.addColorStop(0.8, '#f08a7c'); gr.addColorStop(0.93, '#ffbb86'); gr.addColorStop(1, '#ffe0a6');
  g.fillStyle = gr; g.fillRect(0, 0, WORLD.w, WORLD.h);
  const R = mulberry32(7);
  for (let i = 0; i < 260; i++) { const y = Math.pow(R(), 1.6) * 620; g.fillStyle = `rgba(255,240,230,${(0.25 + 0.6 * R()) * (1 - y / 700)})`; g.beginPath(); g.arc(R() * WORLD.w, y, 0.8 + R() * 1.8, 0, TAU); g.fill(); }
  // sun glow at the horizon
  const sg = g.createRadialGradient(WORLD.sun[0], WORLD.sun[1], 0, WORLD.sun[0], WORLD.sun[1], 1100);
  sg.addColorStop(0, 'rgba(255,236,190,0.9)'); sg.addColorStop(0.25, 'rgba(255,170,120,0.35)'); sg.addColorStop(1, 'rgba(255,120,120,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = sg; g.fillRect(0, 0, WORLD.w, WORLD.h); g.globalCompositeOperation = 'source-over';
  // cirrus brush streaks
  g.filter = 'blur(2px)';
  for (let i = 0; i < 38; i++) {
    const y = 560 + R() * 520, x = R() * WORLD.w, len = 220 + R() * 620, th = 4 + R() * 10;
    g.fillStyle = y > 900 ? `rgba(255,200,160,${0.25 + R() * 0.25})` : `rgba(240,150,170,${0.18 + R() * 0.2})`;
    g.beginPath(); g.ellipse(x, y, len, th, (R() - 0.5) * 0.05, 0, TAU); g.fill();
  }
  g.filter = 'none';
  return c;
}

function paintClouds() {
  const c = mk(WORLD.w, WORLD.h), g = c.getContext('2d');
  paintCumulus(g, 480, 1190, 980, 760, 11, WORLD.sun);
  paintCumulus(g, 2780, 1200, 1060, 860, 12, WORLD.sun);
  paintCumulus(g, 1120, 520, 320, 120, 13, WORLD.sun);
  paintCumulus(g, 2150, 430, 420, 150, 14, WORLD.sun);
  paintCumulus(g, 1600, 1236, 1500, 150, 15, WORLD.sun);   // low bank the halo rises from
  paintCumulus(g, 900, 1230, 700, 110, 16, WORLD.sun);
  paintCumulus(g, 2300, 1232, 800, 120, 17, WORLD.sun);
  return c;
}

function paintCity() {
  const c = mk(WORLD.w, WORLD.h), g = c.getContext('2d'), R = mulberry32(21), Y = WORLD.horizon;
  let x = -20; // far row
  while (x < WORLD.w) { const w = 40 + R() * 90, h = 30 + R() * 140; g.fillStyle = '#7b5f92'; g.fillRect(x, Y - h, w, h + 10); x += w + R() * 6; }
  x = -20; // near row
  while (x < WORLD.w) {
    const w = 60 + R() * 120, h = 50 + R() * 250;
    g.fillStyle = '#382a58'; g.fillRect(x, Y - h + 40, w, h + 600);
    g.fillStyle = 'rgba(255,160,120,0.8)'; g.fillRect(x, Y - h + 40, w, 3);
    for (let yy = Y - h + 56; yy < Y + 300; yy += 15) for (let xx = x + 6; xx < x + w - 8; xx += 13) if (R() < 0.22) { g.fillStyle = `rgba(255,214,140,${0.45 + R() * 0.5})`; g.fillRect(xx, yy, 6, 7); }
    x += w + R() * 10;
  }
  // radio tower
  const tx = 2640, top = Y - 560;
  g.strokeStyle = '#2b2146'; g.lineWidth = 5; g.beginPath(); g.moveTo(tx - 70, Y + 40); g.lineTo(tx, top); g.lineTo(tx + 70, Y + 40); g.stroke();
  g.lineWidth = 2.5; for (let i = 0; i < 12; i++) { const a = i / 12, b = (i + 1) / 12; const y0 = lerp(Y + 40, top, a), y1 = lerp(Y + 40, top, b), w0 = 70 * (1 - a), w1 = 70 * (1 - b); g.beginPath(); g.moveTo(tx - w0, y0); g.lineTo(tx + w1, y1); g.moveTo(tx + w0, y0); g.lineTo(tx - w1, y1); g.moveTo(tx - w1, y1); g.lineTo(tx + w1, y1); g.stroke(); }
  g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(tx, top, 7, 0, TAU); g.fill();
  // ground below the skyline
  const gg = g.createLinearGradient(0, Y + 60, 0, WORLD.h); gg.addColorStop(0, '#2d2248'); gg.addColorStop(1, '#1a1430');
  g.fillStyle = gg; g.fillRect(0, Y + 60, WORLD.w, WORLD.h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,${190 + R() * 50},${120 + R() * 60},${0.3 + R() * 0.6})`; g.fillRect(R() * WORLD.w, Y + 70 + Math.pow(R(), 1.5) * 500, 3, 3); }
  return c;
}

function paintFence() { // rooftop chain-link fence, backlit
  const c = mk(2800, 700), g = c.getContext('2d');
  g.strokeStyle = 'rgba(24,16,40,0.55)'; g.lineWidth = 1.6;
  for (let x = -700; x < 2800; x += 30) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 700, 730); g.moveTo(x + 700, 30); g.lineTo(x, 730); g.stroke(); }
  g.fillStyle = '#1d1531'; g.fillRect(0, 18, 2800, 18); g.fillRect(0, 380, 2800, 12);
  for (let x = 60; x < 2800; x += 340) { g.fillStyle = '#1d1531'; g.fillRect(x, 18, 16, 700); g.fillStyle = 'rgba(255,170,130,0.9)'; g.fillRect(x, 36, 3, 680); }
  g.fillStyle = 'rgba(255,180,140,0.95)'; g.fillRect(0, 18, 2800, 3); g.fillRect(0, 380, 2800, 2);
  return c;
}

function paintPuff(seed, col, shade) { // foreground cloud puff sprite (cel two-tone)
  const c = mk(700, 380), g = c.getContext('2d'), R = mulberry32(seed), b = [];
  for (let i = 0; i < 9; i++) b.push([130 + i * 55 + R() * 20, 230 - Math.sin(i / 8 * Math.PI) * 90 + R() * 30, 70 + R() * 50]);
  g.fillStyle = shade; g.beginPath(); for (const [x, y, r] of b) { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.fill();
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = col;
  g.beginPath(); for (const [x, y, r] of b) { g.moveTo(x + r * 0.8, y + r * 0.25); g.arc(x, y + r * 0.25, r * 0.8, 0, TAU); } g.fill();
  return c;
}

// ------------------------------------------------------------------ camera over the painted world
function worldXf(g, cam) { g.translate(W / 2, H / 2); g.rotate(cam.rot || 0); g.scale(cam.zoom, cam.zoom); g.translate(-cam.x, -cam.y); }
function toScreen(cam, x, y) {
  const c = Math.cos(cam.rot || 0), s = Math.sin(cam.rot || 0), dx = (x - cam.x) * cam.zoom, dy = (y - cam.y) * cam.zoom;
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}

// ------------------------------------------------------------------ shared: rooftop composition (sky, halo, clouds, city, fence, girl)
function drawRooftop(g, t, cam, o) {
  g.save(); worldXf(g, cam);
  g.drawImage(SKY, 0, 0);
  if (o.halo && !o.haloFront) drawHalo(g, o.halo.x, o.halo.y, o.halo.R, t, o.halo.open || 0, o.halo.collapse || 0);
  g.drawImage(CLOUDS, 0, 0);
  if (o.halo && o.haloFront) drawHalo(g, o.halo.x, o.halo.y, o.halo.R, t, o.halo.open || 0, o.halo.collapse || 0);
  if (o.boom) o.boom(g);
  g.drawImage(CITY, 0, 0);
  g.restore();
  if (o.fence) { g.save(); g.globalAlpha = o.fence.a || 1; g.drawImage(FENCE, o.fence.x, o.fence.y, FENCE.width * o.fence.s, FENCE.height * o.fence.s); g.restore(); }
  if (o.girl) {
    const G = o.girl; let [lx, ly] = [G.lx - G.x, G.ly - G.y]; const d = Math.hypot(lx, ly) || 1; const rw = G.rimW || 5;
    drawLit(g, c => drawGirl(c, G.x, G.y, G.r, t, G.wind), lx / d * rw, ly / d * rw, G.rim || '#ffb27a', G.rimA || 1);
  }
}


// S4 / S5 shared composition
function showdown(g, t, openAt) {
  const tq = onTwos(t), tk = tick(t);
  const open = ease.inOutCubic(prog(t, openAt, openAt + 1.1));
  const cam = { x: 1470, y: 930, zoom: 1.22 + 0.06 * open, rot: 0.06 };
  const h = { x: 1450, y: 800, R: 270, open };
  const hs = toScreen(cam, h.x, h.y);
  drawRooftop(g, t, cam, { halo: h, fence: { x: -500, y: 990, s: 1.35 } });
  g.save(); g.globalAlpha = 0.25 + 0.4 * open; focusLines(g, hs[0], hs[1], 110, 330, '#1a1030', 9, tk, 16); g.restore();
  drawLit(g, c => drawGirl(c, 1520 + Math.sin(tq * 20) * 3 * open, 760, 106, t, -0.5 - 1.1 * open), (hs[0] - 1520) / 300 * 6, (hs[1] - 760) / 300 * 6, '#ffc08a');
  return { hs, open };
}

MV.onInit(() => {
  SKY = paintSky(); CLOUDS = paintClouds(); CITY = paintCity(); FENCE = paintFence();
  PUFFS = [paintPuff(41, '#ffb49a', '#8d6fa6'), paintPuff(42, '#ffc6a8', '#9a7ab0')];
  EAST = paintEast(); TMP = mk(W, H);
});
