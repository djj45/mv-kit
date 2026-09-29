function haloRise(t) { return { x: 1450, y: lerp(1120, 800, prog(t, CUT.s1, CUT.s2 + 0.4, ease.outCubic)), R: 270 }; }

// S1 — "Chat · G": the rooftop at magic hour; the halo rises from the cloud bank.
function shot1(g, t) {
  const p = prog(t, CUT.s1, CUT.s2);
  const cam = { x: 1660, y: 930, zoom: lerp(0.72, 0.77, ease.outCubic(p)), rot: 0 };
  const h = haloRise(t), hs = toScreen(cam, h.x, h.y);
  drawRooftop(g, t, cam, {
    halo: h, fence: { x: -300 - p * 30, y: 835, s: 1 },
    girl: { x: 1400 - p * 12, y: 612, r: 56, wind: 0.35, lx: hs[0], ly: hs[1] },
  });
  lyricRow(g, TOK.chat, t, 140, 930, 130);
  jpSub(g, JP.plea, t, CUT.s1, 146, 1000);
}

// S2 — "P · T,": the halo up close, clouds rushing past, ゴゴゴ.

MV.scene('rooftop', { render(g, f) { shot1(g, f.t); } });
