// omega — "The Omega Point's coming soon": every line in the world converges on one point; out of
// the crossing, Ω condenses from points — then can barely hold.
MV.scene('omega', {
  init() {
    this.stars = OPS.mkStars(380, 141);
    this.O = LG.text('Ω', { n: 2600, seed: 13, weight: 700 });
    const rnd = mulberry32(23);
    this.rays = [];
    for (let i = 0; i < 34; i++) {
      const a = rnd() * TAU, r = 900 + rnd() * 500;
      this.rays.push([W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * 0.62]);
    }
  },
  render(g, f) {
    lmBegin('ice');
    const cam = lmScreen();
    lmPoints(cam, this.stars, { size: 1.2, gain: 0.2, twinkle: 0.45, t: f.t, fog: 110 });
    const grow = prog(f.lt, 0.05, f.dur * 0.55);
    const on = prog(f.lt, f.dur * 0.35, f.dur * 0.75);
    const gl = lmGlow();
    this.rays.forEach(([x, y], i) => {
      const d = clamp(grow * 1.6 - i / this.rays.length * 0.5);
      OPS.stroke(gl, [[x, y], [W / 2, H / 2]], { color: 'dim', alpha: 0.66 * clamp(d), width: 1.3 });
    });
    // Ω condenses where they cross, then over-brightens
    if (on > 0) lmPoints(cam, this.O, { size: 1.9, gain: 0.35 + 0.85 * on + 0.5 * f.a.kick, color: 'accent', twinkle: 0.3, t: f.t, count: Math.floor(2600 * clamp(on * 1.3)), model: { pos: [W / 2, H / 2 - 30, 0], scale: [300, 300, 300] } });
    gl.fillStyle = lmCss('hot', 0.75 * on + 0.3 * f.a.kick);
    glow(gl, lmCss('hot', 0.8), 40);
    gl.beginPath(); gl.arc(W / 2, H / 2 - 30, 14 + 10 * on, 0, TAU); gl.fill();
    lmEnd(g);
    MV.focus(W / 2, H / 2 - 30, 'omega point');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['entropy', '↓ 0'], ['eta', 'SOON']] }));
    return {};
  },
});
