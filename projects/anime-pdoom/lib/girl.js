// ------------------------------------------------------------------ the girl (original design), seen from behind, backlit
function drawGirl(g, x, y, r, t, wind) {
  const tq = onTwos(t), tk = tick(t);
  const J = (px, py, i, a = 0.018) => [px + (hash(tk, i, 1) - 0.5) * 2 * a, py + (hash(tk, i, 2) - 0.5) * 2 * a];
  const lw = 0.055;
  g.save(); g.translate(x, y); g.scale(r, r);
  const wo = s => wind * Math.pow(s, 1.6) * 1.3 + (0.1 + 0.16 * Math.abs(wind)) * s * Math.sin(tq * 6.3 + s * 3.5);
  // ribbon of the sailor scarf, fluttering on the wind side
  const side = wind >= 0 ? 1 : -1;
  for (let k = 0; k < 2; k++) {
    const pts = [];
    for (let i = 0; i <= 14; i++) { const s = i / 14; pts.push(J(side * (1.05 + s * (0.7 + 0.35 * k + Math.abs(wind) * 1.5)), 1.75 + s * (1.3 - Math.abs(wind) * 0.6) + Math.sin(tq * 9 + s * 5 + k * 1.3) * 0.2 * s, 300 + k * 20 + i, 0.01)); }
    brush(g, pts, 0.32, '#a3203a', s => 0.55 + 0.45 * Math.sin(s * Math.PI * 0.9), INK, lw);
  }
  // neck, torso
  g.beginPath(); g.moveTo(-0.25, 0.5); g.lineTo(0.25, 0.5); g.lineTo(0.29, 1.62); g.lineTo(-0.29, 1.62); g.closePath(); fillStroke(g, '#b98385', INK, lw);
  // pleated skirt
  pathPoly(g, [J(-1.08, 4.6, 60), J(1.08, 4.6, 61), J(1.95, 9.6, 62), J(-1.95, 9.6, 63)]); fillStroke(g, '#232852', INK, lw);
  for (let i = 1; i < 7; i++) { const u = lerp(-1, 1, i / 7); brush(g, [J(u * 1.0, 4.75, 70 + i), J(u * 1.85, 9.6, 80 + i)], 0.05, '#12163a', 'head'); }
  // shirt: sloping shoulders into a waist
  pathSmooth(g, [J(-0.3, 1.5, 1), J(0.3, 1.5, 2), J(0.72, 1.6, 3), J(1.2, 1.8, 4), J(1.42, 2.15, 5), J(1.38, 3.3, 6), J(1.08, 4.5, 7), J(1.12, 4.95, 8), J(-1.12, 4.95, 9), J(-1.08, 4.5, 10), J(-1.38, 3.3, 11), J(-1.42, 2.15, 12), J(-1.2, 1.8, 13), J(-0.72, 1.6, 14)]);
  fillStroke(g, '#8f87ae', INK, lw);
  brush(g, [J(0, 3.6, 30), J(-0.1, 4.2, 31), J(0.05, 4.85, 32)], 0.05, '#6c648f', 'both');
  // arms hanging at the sides, hands
  for (const sx of [-1, 1]) {
    const arm = bez2(J(sx * 1.2, 2.05, 20 + sx), J(sx * 1.55, 4.2, 22 + sx), J(sx * 1.5, 6.5, 24 + sx), 12);
    g.beginPath(); g.ellipse(sx * 1.5, 6.75, 0.2, 0.3, sx * 0.15, 0, TAU); fillStroke(g, '#b98385', INK, lw);
    brush(g, arm, 0.5, '#8f87ae', s => 1 - 0.3 * s, INK, lw);
    g.beginPath(); g.moveTo(sx * 1.32, 6.25); g.lineTo(sx * 1.68, 6.3); g.lineWidth = 0.1; g.strokeStyle = '#20264f'; g.stroke();
  }
  // sailor collar with stripes
  pathPoly(g, [J(-1.12, 1.62, 40), J(1.12, 1.62, 41), J(1.24, 3.35, 42), J(-1.24, 3.35, 43)]); fillStroke(g, '#20264f', INK, lw);
  g.lineJoin = 'miter'; g.lineCap = 'butt';
  for (const ins of [0.11, 0.22]) { g.beginPath(); g.moveTo(-1.12 + ins, 1.64); g.lineTo(-1.22 + ins, 3.33 - ins); g.lineTo(1.22 - ins, 3.33 - ins); g.lineTo(1.12 - ins, 1.64); g.lineWidth = 0.05; g.strokeStyle = '#b9b2d0'; g.stroke(); }
  // hair mass
  const pts = []; let id = 100;
  for (let i = 0; i <= 16; i++) { const a = (160 + 220 * i / 16) * Math.PI / 180; pts.push(J(Math.cos(a) * 1.07, Math.sin(a) * 1.07, id++)); }
  const HX = y => { const P = [[0.36, 0.99], [1.2, 0.8], [1.9, 1.02], [2.6, 1.14], [3.96, 1.2]]; for (let i = 1; i < P.length; i++) if (y <= P[i][0]) { const u = (y - P[i - 1][0]) / (P[i][0] - P[i - 1][0]), e = u * u * (3 - 2 * u); return lerp(P[i - 1][1], P[i][1], e); } return 1.2; };
  for (let i = 1; i <= 12; i++) { const s = i / 12; pts.push(J(HX(0.36 + 3.6 * s) + wo(s), 0.36 + 3.6 * s, id++, 0.02)); }
  const N = 11;
  for (let k = 1; k < N; k++) { const u = k / N, tip = k % 2 === 1; pts.push(J(lerp(1.2, -1.2, u) + wo(1) + (tip ? wind * 0.3 : 0), tip ? 4.2 + 0.4 * hash(k, 7) : 3.7 + 0.15 * hash(k, 9), id++, 0.03)); }
  for (let i = 12; i >= 1; i--) { const s = i / 12; pts.push(J(-HX(0.36 + 3.6 * s) + wo(s), 0.36 + 3.6 * s, id++, 0.02)); }
  pathPoly(g, pts); fillStroke(g, '#1d1b3a', INK, lw);
  // angel-ring highlight
  const hi = [];
  for (let i = 0; i <= 10; i++) { const a = (205 + 130 * i / 10) * Math.PI / 180; hi.push(J(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 200 + i, 0.01)); }
  for (let i = 10; i >= 0; i--) { const a = (205 + 130 * i / 10) * Math.PI / 180, rr = i % 2 ? 0.6 : 0.72; hi.push(J(Math.cos(a) * rr, Math.sin(a) * rr, 220 + i, 0.01)); }
  pathPoly(g, hi); g.fillStyle = '#3a3e72'; g.fill();
  // strand lines
  for (let k = 0; k < 7; k++) { const x0 = lerp(-0.75, 0.75, k / 6); brush(g, bez2(J(x0 * 0.5, 0.1, 240 + k), J(x0 * 1.2, 1.6, 250 + k), J(x0 * 1.55 + wo(1), 3.9, 260 + k)), 0.045, '#0c0b1c', 'both'); }
  // flying locks
  for (let k = 0; k < 6; k++) {
    const s0 = 0.25 + 0.12 * k, sx = Math.abs(wind) > 0.2 ? Math.sign(wind) : (k % 2 ? 1 : -1), base = [sx * (s0 < 0.3 ? 0.9 : 1.12) + wo(s0), 0.36 + 3.6 * s0];
    const dir = Math.abs(wind) > 0.2 ? Math.sign(wind) : sx, L = 0.6 + Math.abs(wind) * 1.3 + 0.3 * hash(k, 3);
    const lp = [];
    for (let i = 0; i <= 10; i++) { const s = i / 10; lp.push(J(base[0] + dir * s * L, base[1] + s * (0.7 - Math.abs(wind) * 0.35) + Math.sin(tq * 8 + k * 1.7 + s * 4) * 0.22 * s, 400 + k * 20 + i, 0.012)); }
    brush(g, lp, 0.2, '#1d1b3a', 'tail', INK, lw * 0.8);
  }
  g.restore();
}

// render a character into its own layer, then add rim light on the edges facing the light
