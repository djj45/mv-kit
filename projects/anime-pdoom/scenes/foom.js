function boomR(t) { return ease.outExpo(prog(t, FOOM.start, FOOM.start + 1.1)); }
function shot6(g, t) {
  const tk = tick(t), since = t - FOOM.start, boom = since >= 0;
  const pre = prog(t, CUT.s6, FOOM.start);
  const shake = boom ? Math.exp(-since * 2.2) * 26 : 0;
  const cam = { x: 1600 + (hash(tk, 1) - 0.5) * shake, y: 1070 + (hash(tk, 2) - 0.5) * shake, zoom: boom ? lerp(0.95, 0.86, ease.outExpo(clamp(since / 0.6))) : lerp(0.88, 0.95, ease.inCubic(pre)), rot: 0 };
  const fall = ease.inCubic(pre);
  const halo = boom ? null : { x: 1600, y: lerp(860, 1238, fall), R: lerp(250, 60, fall), open: 1 - fall, collapse: prog(pre, 0.55, 0.95), };
  const hs = halo ? toScreen(cam, halo.x, halo.y) : toScreen(cam, 1600, 1150);
  const wind = boom && since > 0.2 ? -1.5 : 0.3;
  drawRooftop(g, t, cam, {
    halo, haloFront: true,
    boom: boom ? gg => drawBoom(gg, t, since) : null,
    fence: { x: -200, y: 860, s: 1 },
    girl: { x: 470, y: 640, r: 62, wind, lx: hs[0], ly: hs[1], rim: boom ? '#fff1d6' : '#ffb27a', rimW: boom ? 9 : 5 },
  });
  if (boom) {
    const bs = toScreen(cam, 1600, 1250);
    g.save(); g.globalCompositeOperation = 'lighter'; // anamorphic streak across the frame
    const a = Math.exp(-since * 1.5);
    const sg = g.createLinearGradient(0, 0, W, 0); sg.addColorStop(0, 'rgba(255,200,150,0)'); sg.addColorStop(bs[0] / W, `rgba(255,250,235,${a})`); sg.addColorStop(1, 'rgba(255,200,150,0)');
    g.fillStyle = sg; g.fillRect(0, bs[1] - 5 - 20 * a, W, 10 + 40 * a); g.restore();
    const fk = ease.outBack(clamp(since / 0.14)), grow = 1 + 0.25 * prog(t, FOOM.start, FOOM.end);
    bigWord(g, 'FOOM', W / 2 + 120 + (hash(tk, 5) - 0.5) * shake, 470 + (hash(tk, 6) - 0.5) * shake, 330 * lerp(1.6, 1, fk), '#fff7ea', INK, grow);
    sfx(g, 'ドォォン', 1560, 760, 140, -0.1, t, FOOM.start + 0.05);
  }
  lyricRow(g, TOK.cause, t, 140, 175, 96);
  jpSub(g, JP.foom, t, CUT.s6, 146, 1000);
  // flash frame, then one inverted frame
  if (since >= 0 && since < 1 / 24) { g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H); }
  else if (since >= 1 / 24 && since < 2 / 24) { g.save(); g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); }
  const end = prog(t, T1 - 0.18, T1); if (end > 0) { g.fillStyle = `rgba(255,250,240,${end})`; g.fillRect(0, 0, W, H); }
}
function drawBoom(g, t, since) { // cel-shaded blast dome in world coords
  const x = 1600, y = WORLD.horizon, R = 980 * boomR(t), tk = tick(t);
  g.save();
  const sky = g.createRadialGradient(x, y, 0, x, y, 2600); sky.addColorStop(0, `rgba(255,190,140,${0.8 * Math.exp(-since)})`); sky.addColorStop(1, 'rgba(255,120,120,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = sky; g.fillRect(0, 0, WORLD.w, WORLD.h); g.globalCompositeOperation = 'source-over';
  // shockwave ring along the ground plane
  const sr = 3400 * ease.outCubic(clamp(since / 0.9)); g.lineWidth = 26; g.strokeStyle = `rgba(255,245,230,${0.8 * (1 - clamp(since / 0.9))})`;
  g.beginPath(); g.ellipse(x, y, sr, sr * 0.07, 0, 0, TAU); g.stroke();
  // smoke puffs on the rim (two-tone cel, boiling on twos)
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i + 0.5) / n * Math.PI, rr = R * (0.95 + 0.08 * hash(i, tk % 3)), pr = R * (0.16 + 0.05 * hash(i, 3));
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.92;
    g.beginPath(); g.arc(px, py, pr, 0, TAU); fillStroke(g, '#7a5a8e', INK, 4);
    g.beginPath(); g.arc(px + pr * 0.18, py + pr * 0.22, pr * 0.72, 0, TAU); g.fillStyle = '#b8789a'; g.fill();
  }
  const band = (k, col) => { g.beginPath(); g.ellipse(x, y, R * k, R * k * 0.92, 0, Math.PI, TAU); g.closePath(); g.fillStyle = col; g.fill(); };
  band(1.0, '#ff7a4a'); band(0.8, '#ffb070'); band(0.58, '#ffe2a8'); band(0.38, '#fffbf0');
  g.beginPath(); g.ellipse(x, y, R, R * 0.92, 0, Math.PI, TAU); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  // speed-line striations inside the dome
  g.save(); g.beginPath(); g.ellipse(x, y, R, R * 0.92, 0, Math.PI, TAU); g.clip();
  g.globalAlpha = 0.35; focusLines(g, x, y, 60, R * 0.3, '#fff', 31, tk, 30); g.restore();
  g.restore();
}


MV.scene('foom', { render(g, f) { shot6(g, f.t); } });
