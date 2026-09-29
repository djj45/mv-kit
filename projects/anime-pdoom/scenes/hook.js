function shot5(g, t) {
  const w = L_HOOK.words, tk = tick(t);
  const sh = (hash(tk, 1) - 0.5) * 14, sv = (hash(tk, 2) - 0.5) * 14;
  if (t < w[1].start) { // I'M
    g.fillStyle = '#0e0a18'; g.fillRect(0, 0, W, H); focusLines(g, W / 2, H / 2, 160, 380, '#f4ede2', 21, tk, 9);
    const k = ease.outExpo(prog(t, w[0].start, w[0].start + 0.12)); bigWord(g, 'I’M', W / 2 + sh, H / 2 + sv, lerp(700, 430, k), '#fff7ea', INK);
  } else if (t < w[2].start) { // UPPING rises
    g.fillStyle = '#f6efe4'; g.fillRect(0, 0, W, H); upLines(g, t, '#15101f');
    const letters = [...'UPPING'], size = 300; g.save(); g.font = `italic 900 ${size}px ${FONT}`;
    const widths = letters.map(c => g.measureText(c).width), tot = widths.reduce((a, b) => a + b, 0); let x = W / 2 - tot / 2;
    letters.forEach((c, i) => { const k = ease.outExpo(prog(t, w[1].start + i * 0.035, w[1].start + i * 0.035 + 0.18)); bigWord(g, c, x + widths[i] / 2 + sh * 0.5, lerp(H + 300, H / 2 - i * 14, k), size, '#15101f', INK, 1, '#ff5a1f'); x += widths[i]; });
    g.restore();
  } else if (t < w[3].start) { // MY
    g.fillStyle = '#ff5a1f'; g.fillRect(0, 0, W, H); focusLines(g, W / 2, H / 2, 150, 420, '#15101f', 22, tk, 10);
    const k = ease.outExpo(prog(t, w[2].start, w[2].start + 0.1)); bigWord(g, 'MY', W / 2 + sh, H / 2 + sv, lerp(640, 420, k), '#fff7ea', INK, 1, '#15101f');
  } else { // P(DOOM): monochrome impact frame of the showdown + the gauge
    const tc = TMP.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); showdown(tc, t, CUT.s4);
    const age = t - w[3].start, inv = age < 1 / 12 || (age >= 2 / 12 && age < 3 / 12);
    g.save(); g.filter = `grayscale(1) contrast(3.2) brightness(1.15)${inv ? ' invert(1)' : ''}`; g.drawImage(TMP, 0, 0); g.restore();
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = inv ? '#ffd0c0' : '#ff8a6a'; g.globalAlpha = 0.5; g.fillRect(0, 0, W, H); g.restore();
    g.save(); g.globalAlpha = 0.9; focusLines(g, 960, 420, 170, 520, inv ? '#fff' : '#0e0a18', 23, tk, 12); g.restore();
    const k = ease.outExpo(prog(t, w[3].start, w[3].start + 0.12)), syl2 = w[3].syl ? w[3].syl[1][0] : w[3].start + 0.27;
    bigWord(g, 'P(DOOM)', W / 2 + sh * 0.6, 250 + sv * 0.6, lerp(420, 250, k), '#fff7ea', INK, t > syl2 ? 1 + 0.15 * ease.outCubic(prog(t, syl2, w[3].end)) : 1);
    sfx(g, 'ドン!!', 330, 640, 190, -0.15, t, w[3].start);
    gauge(g, 1500, 760, 190, lerp(0.02, 0.15, ease.outExpo(prog(t, syl2, syl2 + 0.35))), t);
  }
  jpSub(g, JP.hook, t, w[0].start, W / 2, 1010, { align: 'center', size: 38 });
}
function gauge(g, x, y, r, v, t) { // mecha-anime style readout
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(14,10,24,0.85)'; g.beginPath(); g.arc(0, 0, r * 1.12, 0, TAU); g.fill();
  g.lineWidth = r * 0.12; g.strokeStyle = '#3a3050'; g.beginPath(); g.arc(0, 0, r * 0.85, Math.PI * 0.75, Math.PI * 2.25); g.stroke();
  g.strokeStyle = '#ff5a1f'; g.beginPath(); g.arc(0, 0, r * 0.85, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * clamp(v)); g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#fff4e6';
  for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + Math.PI * 1.5 * i / 10; g.beginPath(); g.moveTo(Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0); g.lineTo(Math.cos(a) * r * 1.06, Math.sin(a) * r * 1.06); g.stroke(); }
  g.textAlign = 'center'; g.fillStyle = '#fff4e6'; g.font = `700 ${r * 0.45}px ${MONO}`; g.fillText(v.toFixed(2), 0, r * 0.15);
  g.font = `700 ${r * 0.16}px ${MONO}`; g.fillStyle = '#ff8a4a'; g.fillText('P(doom)', 0, -r * 0.35); g.fillText('▲ UPPED', 0, r * 0.55);
  g.restore();
}

// S6 — "'cause the future goes FOOM": the halo falls into the city as a spark, then the blast.

MV.scene('hook', { render(g, f) { shot5(g, f.t); } });
