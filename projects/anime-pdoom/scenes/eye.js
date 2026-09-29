function shot3(g, t) {
  const tk = tick(t), tq = onTwos(t);
  const E = { x: 1010, y: 560 };
  const shock = t >= wEat.start ? ease.outExpo(clamp((t - wEat.start) / 0.1)) : 0;
  const openK = 1;
  const widen = ease.outCubic(clamp((t - wDont.start) / 0.25)) * 0.3 + shock * 0.5;
  const z = 1.04 + 0.035 * (t - CUT.s3b) + 0.1 * shock;
  const tr = shock > 0 ? 7 : 0, jx = (hash(tk, 1) - 0.5) * 2 * tr, jy = (hash(tk, 2) - 0.5) * 2 * tr;
  g.save(); g.translate(E.x, E.y); g.scale(z, z); g.translate(-E.x, -E.y);
  // skin, warm light from the left, cel shadow on the right
  g.fillStyle = '#ffdcc6'; g.fillRect(-300, -300, W + 600, H + 600);
  const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(255,170,130,0.55)'); lg.addColorStop(0.5, 'rgba(255,170,130,0)');
  g.fillStyle = lg; g.fillRect(-300, -300, W + 600, H + 600);
  g.fillStyle = '#e9a595'; g.beginPath(); g.moveTo(1640, -300); g.quadraticCurveTo(1450, 520, 1700, 1400); g.lineTo(2300, 1400); g.lineTo(2300, -300); g.fill();
  // blush hatching
  g.save(); g.globalAlpha = 0.55 + 0.25 * shock; g.strokeStyle = '#f07c86'; g.lineCap = 'round'; g.lineWidth = 7;
  for (let i = 0; i < 5; i++) { const bx = 470 + i * 42 + (hash(tk, i + 50) - 0.5) * 4; g.beginPath(); g.moveTo(bx, 900); g.lineTo(bx + 30, 845); g.stroke(); }
  g.restore();
  // eyebrow (half under the bangs)
  brush(g, bez2([640, 250 - widen * 40], [980, 175 - widen * 60], [1330, 235 - widen * 30]), 26, '#3b2a48', 'both');
  drawEye(g, E, t, tk, openK, widen, shock, jx, jy);
  // gloom lines (縦線) after the shock
  if (shock > 0) {
    g.save(); g.globalAlpha = 0.6 * shock;
    for (let i = 0; i < 26; i++) { const x = 560 + i * 36 + (hash(i, 8) - 0.5) * 12, len = 180 + 160 * hash(i, 9); const lgv = g.createLinearGradient(0, -40, 0, len); lgv.addColorStop(0, 'rgba(70,60,170,0.9)'); lgv.addColorStop(1, 'rgba(70,60,170,0)'); g.fillStyle = lgv; g.fillRect(x, -40, 5 + 4 * hash(i, 10), len); }
    g.restore();
  }
  // sweat drop sliding down the temple
  if (t >= wDont.start) {
    const sp = ease.outCubic(prog(tq, wDont.start, wDont.start + 1.4)), sx = 1720, sy = 360 + sp * 170;
    g.beginPath(); g.moveTo(sx, sy - 70); g.bezierCurveTo(sx + 12, sy - 30, sx + 34, sy - 5, sx + 34, sy + 20); g.arc(sx, sy + 20, 34, 0, Math.PI); g.bezierCurveTo(sx - 34, sy - 5, sx - 12, sy - 30, sx, sy - 70);
    fillStroke(g, '#bfe6ff', INK, 5); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sx + 12, sy + 16, 7, 12, -0.3, 0, TAU); g.fill();
  }
  // bangs: hair shadow on the skin, then the locks (swaying on twos)
  const locks = [];
  for (let k = 0; k < 9; k++) {
    const rx = 150 + k * 215, tipx = rx + 70 + Math.sin(tq * 5 + k) * 14 + (k === 6 ? 60 : 0), tipy = (k === 6 ? 470 : 190 + 150 * hash(k, 4)) + Math.cos(tq * 4 + k) * 8;
    locks.push(bez2([rx - 40, -80], [rx + 40, tipy * 0.45], [tipx, tipy]));
  }
  const lockT = s => Math.pow(1 - s, 0.5) * (1 - 0.15 * Math.pow(s, 4));
  for (const L of locks) brush(g, L.map(p => [p[0] - 10, p[1] + 40]), 280, '#e59e90', lockT);
  locks.forEach((L, k) => { brush(g, L, 280, '#23203f', lockT, INK, 5); brush(g, L.slice(1, 9).map(p => [p[0] + 18, p[1]]), 34, '#4b4c86', 'both'); });
  g.restore();
  if (shock > 0) focusLines(g, E.x, E.y, 140, 560, 'rgba(255,255,255,0.9)', 3, tk, 10);
  sfx(g, 'ドクン', 1600, 690, 150, 0.12, t, wEat.start);
  lyricRow(g, TOK.plea, t, 140, 930, 120, { shake: (tk2, tt) => (tk2.start === wEat.start && tt >= wEat.start ? 10 : 0) });
  jpSub(g, JP.plea, t, CUT.s3 - 1, 146, 1000);
}


MV.scene('eye', { render(g, f) { shot3(g, f.t); } });
