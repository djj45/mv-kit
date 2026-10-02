// "We had a stable training run": the slew from the last page lands here, and the steadiest thing a printer ever
// drew turns in the middle of the page — a torus at constant speed, shaded in characters and z-buffered drawing by
// drawing. Beside it the loss as a strip chart: flat, boring, safe.
MV.scene('stable', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8, crisp: 1.0 }); },
  render(g, f) {
    const S = this.S.clear(), tq = f.tq, t = f.t, c = S.g;
    const R = 1.0, r = 0.45;
    const tor = (u, v) => { const a = u * TAU, b = v * TAU; return [(R + r * Math.cos(b)) * Math.cos(a), (R + r * Math.cos(b)) * Math.sin(a), r * Math.sin(b)]; };
    const img = PP.surface(420, 300, tor, [1.0 + 0.6 * tq, 0, 0.7 * tq], 120, { nu: 380, nv: 160, light: [-0.4, -0.8, 0.5], amb: 0.06, splat: 2 });
    c.filter = 'blur(1px)'; c.drawImage(img, W * 0.5 - 640, 100, 1040, 742); c.filter = 'none';
    // strip chart: the loss, flat with a little noise, scrolling left one column per drawing
    S.box(96, 7, 126, 25, { title: 'LOSS / STEP' });
    const k0 = Math.floor(tq * 12);
    for (let i = 0; i < 27; i++) { const y = 16 + Math.round(1.4 * (hash(i + k0, 2) - 0.5)); S.put(98 + i, y, '*', { now: true }); }
    S.put(98, 22, `STEP ${41200 + k0 * 10}`, { ink: 0.85, now: true }); S.put(98, 23, 'STATUS: STABLE', { ink: 0.85, now: true });
    PP.header(S, f, f.params.page);
    PP.lyric(S, f, 'We had a stable', 10, 36, { x: 3, red: ['STABLE'], width: 116 });
    // the slew from the previous page lands: the paper decelerates into place
    const land = 1500 * Math.pow(1 - ease.outCubic(clamp((t - f.from) / 0.55)), 2);
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 - land, z: 0.88 }, seed: f.tick, key: f.tick });
    return { shake: 1.5 * f.a.kick };
  },
});
