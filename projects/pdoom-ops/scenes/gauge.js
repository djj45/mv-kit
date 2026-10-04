// gauge — the P(doom) instrument, four visits (params: a → b, palette, flick, shake). A dial with
// a red zone, a rolling number, hazard stripes marching at the bottom. The needle trembles with
// the kick once it is past 80; gauge③ (the breakdown) is dying — its digits drop out.
MV.scene('gauge', {
  init() { this.stars = OPS.mkStars(380, 71); },
  render(g, f) {
    const P = f.params;
    lmBegin(P.pal || 'alert');
    lmPoints(lmScreen(), this.stars, { size: 1.3, gain: 0.26, twinkle: 0.45, t: f.t, fog: 95 });
    const gl = lmGlow();
    const v = lmCount(f.t, f.from, f.from + f.dur * 0.8, P.a, P.b, ease.outExpo);
    // a dim radar sweep behind the dial, so the instrument lives in a room
    gl.save(); gl.strokeStyle = lmCss('dim', 0.16); gl.lineWidth = 1;
    for (let r = 380; r <= 700; r += 160) { gl.beginPath(); gl.arc(W / 2, 760, r, 0, TAU); gl.stroke(); }
    gl.restore();
    const tip = OPS.dial(gl, f, { cx: W / 2, cy: 760, r: 310, value: v, tremble: v > 78 ? 4 + 6 * f.a.kick : 0 });
    OPS.num(gl, f, v, { y: 952, size: P.big || 104, flick: P.flick, color: v > 55 ? 'hot' : 'fg' });
    OPS.stripes(gl, 150, 1006, W - 300, 34, { scroll: f.t * 70, alpha: 0.3 + 0.3 * f.a.kick });
    lmTag(gl, 'INSTRUMENT 07 — P(DOOM)', 150, 186, { align: 'left', size: 16 });
    lmEnd(g, { bloom: 1.1 });
    MV.focus(tip[0], tip[1], 'needle');
    OPS.lyr(f, o => OPS.hud(o, f, {
      name: f.entry.name, rows: [['P(DOOM)', v.toFixed(1) + '%'], ['trend', v > P.a + (P.b - P.a) * 0.5 ? 'RISING' : 'ELEVATED']],
      on: lmFlick(f.t, f.from, 0.26, f.entry.i) * (P.flick ? 0.75 + 0.25 * (hash(Math.floor(f.t * 7), 3, 9) < 0.5 ? 1 : 0.2) : 1),
    }));
    return P.shake ? { shake: 6 * f.a.kick, glitch: 0.22 * f.a.snare } : {};
  },
});
