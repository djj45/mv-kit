// S46 hook4 — the biggest one: each word flashes one of her faces (B4, C9, F2, G1); on "doom" an inverted impact
// frame and 99% across the whole screen.
MV.scene('hook4', akCustom({
  init() { ['B4', 'C9', 'F2', 'G1'].forEach(id => akArt(id)); },
  render(g, f) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const { line, hit } = akHookLine(f.lyrics, 3), ids = ['B4', 'C9', 'F2', 'G1'];
    let i = 0; line.words.forEach((w, j) => { if (f.t >= w.start) i = j; });
    const w = line.words[i], k = prog(f.t, w.start, w.start + 0.2, ease.outCubic);
    const face = (akMotionOn(f) && akClipArt(ids[i] + 'v', ids[i], f.tq - w.start)) || akArt(ids[i]);   // each face moves (B4v, C9v, F2v, G1v) once generated
    illCover(g, face, { z: lerp(1.3, 1.12, k), rot: (i % 2 ? 1 : -1) * 0.03 });
    focusLines(g, W / 2, H / 2, 160, 360, 'rgba(255,248,238,0.4)', 46 + i, f.tick, 10);
    if (f.t >= hit) { g.save(); g.font = `400 560px ${ILL.F.display}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = 0.9 * prog(f.t, hit, hit + 0.1); g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = AK.ink; g.strokeText('99%', W / 2, H * 0.48); g.fillStyle = AK.signal; g.fillText('99%', W / 2, H * 0.48); g.restore(); }
    illSlam(g, line, f.t, { x: W / 2, y: H * 0.8, size: 120, colorOf: ww => (/doom/i.test(ww.w) ? AK.signal : AK.paper), maxW: 1700 });
    return { invert: f.t >= hit && f.t < hit + 2 / 24, flash: 0.6 * pulse(f.t, hit, 0.15), shake: f.t >= hit ? 20 * (1 - prog(f.t, hit, hit + 0.5)) : 6 * f.a.kick };
  },
}));
