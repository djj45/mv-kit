// room — "Trapped in the Chinese room, with a bag of shrooms": a wireframe room; the operator is
// one bright point inside; cards of symbols slide in one wall and out the other, turned by the
// rulebook — meaning never enters or leaves.
MV.scene('room', {
  init() {
    this.stars = OPS.mkStars(220, 81);
    const rnd = mulberry32(14);
    this.cards = [];
    for (let i = 0; i < 7; i++) this.cards.push({ off: i / 7, glyph: '的一是了我不人在'[i] ?? '中', drift: rnd() * TAU });
    this.glyphs = {};
    for (const c of this.cards) this.glyphs[c.glyph] = LG.text(c.glyph, { n: 240, seed: 5 });
  },
  render(g, f) {
    lmBegin('ice');
    const cam = lmOrbit({ yaw: Math.sin(f.t * 0.16) * 0.1 - 0.05, pitch: 0.22, dist: 1500, target: [0, -60, 0], shift: [0, -30] });
    lmPoints(cam, this.stars, { size: 1.2, gain: 0.18, twinkle: 0.4, t: f.t, fog: 140 });
    lmLines(cam, LG.grid(8, 1700, { y: -320 }), { width: 1, color: 'dim', gain: 0.8 });                    // floor
    lmLines(cam, LG.wirebox([1500, 900, 1500], { at: [0, 130, 0] }), { width: 1.2, color: 'dim', gain: 0.55 }); // the room
    // the operator: one bright point and its shadow of a label
    lmPoints(cam, new Float32Array([0, -230, 0]), { size: 5.5, gain: 1.1, color: 'fg', twinkle: 0.25, t: f.t });
    const pc = cam.project([0, -230, 0]);
    lmLines(cam, LG.seg(LG.circle(70, 48, 'xz'), { closed: true }), { width: 1.4, color: 'fg', gain: 0.5, model: { pos: [0, -230, 0] } });
    // cards of symbols crossing the room, in the near wall and out the far one
    const gl = lmGlow();
    for (const c of this.cards) {
      const u = (f.t * 0.09 + c.off) % 1;
      const x = lerp(-820, 820, u), y = -60 + Math.sin(f.t * 1.2 + c.drift) * 26, z = -180 + Math.cos(f.t * 0.7 + c.drift) * 60;
      const P = cam.project([x, y, z]);
      if (!P) continue;
      const s = 34;
      OPS.stroke(gl, [[P[0] - s, P[1] - s], [P[0] + s, P[1] - s], [P[0] + s, P[1] + s], [P[0] - s, P[1] + s]], { color: 'accent', alpha: 0.85, width: 1.8, closed: true });
      lmPoints(cam, this.glyphs[c.glyph], { size: 1.05, gain: 0.75, color: 'fg', model: { pos: [x, y, z], scale: [46, 46, 46] } });
      if (c === this.cards[2] && pc) OPS.arrow(gl, [pc[0], pc[1]], [P[0], P[1] + 40], { color: 'dim', width: 1.2, draw: 0.8, head: 9 });
    }
    if (pc) OPS.tick(gl, 'you', pc[0] + 24, pc[1] + 48, { align: 'left', size: 16, color: 'dim' });
    lmEnd(g);
    if (pc) MV.focus(pc[0], pc[1], 'operator');
    else MV.focus(W / 2, H / 2, 'room');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['room', 'ZH-01'], ['semantics', 'NONE']] }));
    return {};
  },
});
