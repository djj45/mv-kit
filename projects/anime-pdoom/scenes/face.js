function shot3a(g, t) {
  const p = prog(t, CUT.s3, CUT.s3b), kick = pulse(t, wDont.start, 0.35) * 0.035;
  const z = 1 + 0.06 * ease.outCubic(p) + kick;
  const cam = c => { c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2 + p * 8); };
  g.save(); cam(g); g.drawImage(EAST, -120 - p * 25, -150); g.restore();
  // warm light from the halo in front of her; a cool rim from the evening sky behind
  drawLit(g, c => { cam(c); drawFace(c, 1150, 400, 200, t); }, 0, -5, '#a9a2ff', 0.85);
  g.save(); g.globalCompositeOperation = 'soft-light'; const wl = g.createRadialGradient(1500, -200, 100, 1500, -200, 1500);
  wl.addColorStop(0, 'rgba(255,170,90,0.9)'); wl.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = wl; g.fillRect(0, 0, W, H); g.restore();
  lyricRow(g, TOK.plea, t, 140, 930, 120);
  jpSub(g, JP.plea, t, CUT.s3 - 1, 146, 1000);
}


MV.scene('face', { render(g, f) { shot3a(g, f.t); } });
