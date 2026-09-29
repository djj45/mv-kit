// Shot 9 — her point of view: over her shoulder, out of the window at a heavy-rain landscape gliding right → left.
// The rain thickens with the song. On "透明" her breath spreads over the glass from where she sits and the view
// fades to the palest ink.
MV.scene('her_view', {
  render(g, f) {
    const t = f.t, L = f.lyrics.get('让想念继续'), tBian = L.words[7].start, tTou = L.words[8].start, tStop = f.lyrics.get('真希望', 0).words[7].start;
    yroomShot(g, f, {
      cam: t => { const z = keys(t, [[f.from, 1.35], [f.to + 0.8, 1.5, ease.inOutQuad]]); return { z, rx: 900, ry: 470, sx: 1000, sy: 520 }; },
      viewCam: t => keys(t, [[f.from - 0.8, 1520], [f.to + 0.8, 1080, ease.inOutQuad]]),
      rainSky: () => 1,
      rain: t => keys(t, [[f.from, 1.3], [tStop, 1.9], [tTou, 2.3]]) * (0.8 + 0.4 * f.a.rms),
      fog: t => { const u = prog(t, tBian + 0.1, tTou + 0.7, ease.outCubic); return { x: 600, y: 580, r: 1150 * u, a: 0.68 * u }; },
      viewFade: t => 0.5 * prog(t, tTou - 0.2, tTou + 0.8, ease.inOutQuad),
      pose: () => ({ lift: 1 }),
    });
    yuaiLyrics(g, f);
    return { shake: 1.2 * f.a.kick };
  },
});
