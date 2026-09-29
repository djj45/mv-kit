function shot4(g, t) {
  const { open } = showdown(g, t, CUT.s4);
  // "alive" held and stretched, letter by letter
  const a = wAlive, letters = [...'alive'], size = 230;
  g.save(); g.font = `italic 900 ${size}px ${FONT}`;
  const stretch = 1 + 0.5 * ease.outCubic(prog(t, a.start, a.end)); let x = 140;
  letters.forEach((ch, i) => {
    const at = a.start + i * 0.1, w = g.measureText(ch).width;
    if (t >= at) { const k = clamp((t - at) / 0.12), s = lerp(1.6, 1, ease.outBack(k)); g.save(); g.translate(x + w / 2, 900); g.scale(s * stretch, s); g.rotate(-0.05); titleText(g, ch, -w / 2, 0, size, true); g.restore(); }
    x += w * stretch * 1.02;
  });
  g.restore();
  jpSub(g, JP.plea, t, CUT.s3 - 1, 146, 1000);
  // drum fill flashes, then white-out into the hook
  let fl = 0; for (const k of MV.audio.events('kick', CUT.s4 + 0.9, CUT.s5)) fl = Math.max(fl, pulse(t, k.t, 0.12) * 0.5);
  fl = Math.max(fl, prog(t, CUT.s5 - 0.16, CUT.s5, ease.inCubic));
  if (fl > 0) { g.fillStyle = `rgba(255,250,240,${fl})`; g.fillRect(0, 0, W, H); }
}

// S5 — the hook as impact frames: I'M / UPPING / MY / P(DOOM)

MV.scene('alive', { render(g, f) { shot4(g, f.t); } });
