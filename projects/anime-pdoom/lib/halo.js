// The AI: an original mechanical halo with a ring of teeth.
function drawHalo(g, x, y, R, t, open = 0, collapse = 0) {
  g.save(); g.translate(x, y);
  g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, R * 2.6);
  gl.addColorStop(0, 'rgba(255,190,110,0.6)'); gl.addColorStop(0.3, 'rgba(255,110,60,0.25)'); gl.addColorStop(1, 'rgba(255,80,80,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, R * 2.6, 0, TAU); g.fill();
  for (let i = 0; i < 18; i++) { // god rays
    const a = i / 18 * TAU + t * 0.04 + hash(i, 3) * 0.3, w = 0.02 + 0.04 * hash(i, 4), len = R * (2.6 + 2.4 * hash(i, 5));
    g.fillStyle = `rgba(255,205,160,${(0.04 + 0.05 * hash(i, 6)) * (1 + open)})`;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len); g.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  const ringA = 1 - collapse;
  if (ringA > 0.01) {
    g.save(); g.globalAlpha = ringA; g.scale(1, 0.92);
    const s = (1 + open * 0.55) * (1 - collapse * 0.7), ink = '#2a1230';
    // outer dial ring with ticks
    const r1 = R * s, rot1 = t * 0.12;
    g.lineWidth = R * 0.04; g.strokeStyle = ink; g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.stroke();
    g.lineWidth = R * 0.018; g.strokeStyle = '#ffe9cf'; g.beginPath(); g.arc(0, 0, r1, 0, TAU); g.stroke();
    g.lineCap = 'round';
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * TAU + rot1, len = i % 6 === 0 ? R * 0.1 : R * 0.04;
      g.lineWidth = i % 6 === 0 ? R * 0.016 : R * 0.008; g.strokeStyle = i % 6 === 0 ? '#fff3e2' : 'rgba(255,220,190,0.8)';
      g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * (r1 - len), Math.sin(a) * (r1 - len)); g.stroke();
    }
    // segmented cel-shaded ring
    const rm = R * 0.76 * s, th = R * 0.11, rot2 = -t * 0.35 - open * open * 2.2;
    for (let k = 0; k < 8; k++) {
      const a0 = k / 8 * TAU + rot2 + 0.06, a1 = a0 + TAU / 8 - 0.14, push = open * R * 0.22;
      const ro = rm + th / 2 + push, ri = rm - th / 2 + push;
      g.beginPath(); g.arc(0, 0, ro, a0, a1); g.arc(0, 0, ri, a1, a0, true); g.closePath(); fillStroke(g, '#ff8a4a', ink, R * 0.014);
      g.beginPath(); g.arc(0, 0, rm + push, a0, a1); g.arc(0, 0, ri, a1, a0, true); g.closePath(); g.fillStyle = '#c4432e'; g.fill();
      g.beginPath(); g.arc(0, 0, ro - R * 0.015, a0 + 0.02, a1 - 0.02); g.lineWidth = R * 0.01; g.strokeStyle = '#ffd9a8'; g.stroke();
      g.beginPath(); g.arc(0, 0, ro, a0, a1); g.arc(0, 0, ri, a1, a0, true); g.closePath(); g.lineWidth = R * 0.014; g.strokeStyle = ink; g.stroke();
    }
    // dashed inner ring
    g.save(); g.rotate(t * 0.9 + open * 3); g.setLineDash([R * 0.06, R * 0.035]); g.lineWidth = R * 0.018; g.strokeStyle = '#ffc790';
    g.beginPath(); g.arc(0, 0, R * 0.55 * s, 0, TAU); g.stroke(); g.restore();
    // the maw: a ring of teeth that opens around the core
    if (open > 0.01) {
      const rt = R * 0.4 * s, o = ease.outCubic(open);
      g.fillStyle = '#16081a'; g.beginPath(); g.arc(0, 0, rt * o, 0, TAU); g.fill();
      const n = 22, rot3 = t * 0.6;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + rot3, hw = TAU / n * 0.42, tip = rt * (1 - 0.42 * o);
        g.beginPath(); g.moveTo(Math.cos(a - hw) * rt * o, Math.sin(a - hw) * rt * o); g.lineTo(Math.cos(a) * tip * o, Math.sin(a) * tip * o); g.lineTo(Math.cos(a + hw) * rt * o, Math.sin(a + hw) * rt * o); g.closePath();
        fillStroke(g, '#fff1de', ink, R * 0.01);
      }
    }
    g.restore();
  }
  // core + anime lens star
  const rc = R * 0.2 * (1 - open * 0.35) * (1 - collapse * 0.6);
  const cg = g.createRadialGradient(0, 0, 0, 0, 0, rc);
  cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.45, '#fff0c4'); cg.addColorStop(0.8, '#ffb35a'); cg.addColorStop(1, '#ff6a2b');
  g.fillStyle = cg; g.beginPath(); g.arc(0, 0, rc, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter';
  const cg2 = g.createRadialGradient(0, 0, 0, 0, 0, rc * 3.2); cg2.addColorStop(0, 'rgba(255,220,160,0.8)'); cg2.addColorStop(1, 'rgba(255,120,60,0)');
  g.fillStyle = cg2; g.beginPath(); g.arc(0, 0, rc * 3.2, 0, TAU); g.fill();
  const star = (len, th, a) => { g.save(); g.rotate(a); g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -th); g.lineTo(len, 0); g.lineTo(0, th); g.closePath(); g.fill(); g.restore(); };
  g.fillStyle = 'rgba(255,245,225,0.9)'; star(R * 1.7, R * 0.025, 0); star(R * 1.0, R * 0.02, Math.PI / 2);
  g.fillStyle = 'rgba(255,220,180,0.4)'; star(R * 0.6, R * 0.015, Math.PI / 4); star(R * 0.6, R * 0.015, -Math.PI / 4);
  g.restore();
}

