// boot — the cold open: star dust, a boot log typing itself, the title decoding out of garbage.
MV.scene('boot', {
  init() { this.stars = OPS.mkStars(700, 11); },
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars, { size: 1.5, gain: 0.42, twinkle: 0.55, t: f.t, fog: 130 });
    const gl = lmGlow();
    const log = [
      '> ops-init 4.2.1 — night shift',
      '> loading weights …… 1.7T params',
      '> watchdog .............. ARMED',
      '> doom meter ............ ONLINE',
    ].join('\n');
    lmCode(gl, log, 170, 250, { size: 23, numbers: false, cursor: true, chars: Math.floor(f.lt * 52) });
    lmBig(gl, 'P(DOOM)', W / 2, 500, { size: 122, decode: prog(f.t, f.from + 0.25, f.from + 1.1), t: f.t, track: 0.42, color: 'fg' });
    lmTag(gl, 'OPERATIONS — LIVE FEED', W / 2, 596, { size: 17, color: 'accent', track: 0.55 });
    lmEnd(g);
    MV.focus(W / 2, 500, 'title');
    OPS.lyr(f, o => OPS.hud(o, f, { name: 'boot', rows: [['feed', 'LIVE']] }));
    return {};
  },
});
