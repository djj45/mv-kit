// boss — "now I'm your servant and you're my boss": the org chart. YOU starts on top; the MODEL
// descends from above the frame into the top slot and YOU slides beneath it. The connecting arrow
// turns around. The timeline's warp stands the chart up and turns it away at the end.
MV.scene('boss', {
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(500, 51)), { size: 1.4, gain: 0.26, twinkle: 0.5, t: f.t, fog: 100 });
    const gl = lmGlow();
    OPS.ambient(gl, f, { gain: 0.5 });
    const p = prog(f.lt, 0.2, 2.6, ease.inOutCubic);
    const TOP = [960, 400], BOT = [960, 730];
    const model = [960, lerp(-160, TOP[1], ease.outCubic(clamp(p * 1.4)))];           // comes down from above
    const you = [960, lerp(TOP[1], BOT[1], ease.inOutQuad(clamp((p - 0.25) * 1.6)))];
    // the org-chart field behind: a faint ladder of levels
    for (let k = 0; k < 4; k++) {
      const y = 400 + k * 110;
      OPS.stroke(gl, [[420, y], [1500, y]], { color: 'dim', alpha: 0.16, width: 1, dash: [3, 10] });
    }
    OPS.tick(gl, 'L0 — CEO', 360, 400, { align: 'right', color: 'dim', size: 16, alpha: 0.75 });
    OPS.tick(gl, 'L3 — SERVANT', 360, 730, { align: 'right', color: 'dim', size: 16, alpha: 0.75 });
    // the MODEL box
    gl.save(); gl.translate(model[0], model[1]);
    OPS.stroke(gl, [[-240, -76], [240, -76], [240, 76], [-240, 76]], { color: 'accent', width: 3.4, closed: true, glow: 16 });
    OPS.tick(gl, 'MODEL', 0, -2, { size: 52, color: 'accent', weight: 600 });
    OPS.tick(gl, '1.7T params', 0, 42, { size: 17, color: 'dim' });
    gl.restore();
    // YOU: a circle with a head — a person glyph
    gl.save(); gl.translate(you[0], you[1]);
    gl.strokeStyle = lmCss('fg', 0.95); gl.lineWidth = 4; glow(gl, lmCss('fg', 0.5), 14);
    gl.beginPath(); gl.arc(0, -48, 26, 0, TAU); gl.stroke();                          // head
    gl.beginPath(); gl.arc(0, 36, 62, Math.PI * 0.9, Math.PI * 2.1); gl.stroke();     // shoulders
    gl.restore();
    OPS.tick(gl, 'YOU', you[0], you[1] + 128, { size: 24, color: 'fg' });
    // the arrow between them, turning around as p passes 0.6
    const flip = clamp((p - 0.55) / 0.3);
    const midY = (model[1] + you[1]) / 2 + 62;
    if (flip < 0.5) {
      OPS.arrow(gl, [you[0], you[1] - 70], [model[0], Math.min(model[1] + 66, you[1] - 90)], { color: 'dim', width: 2 });
      OPS.tick(gl, 'reports to', you[0] + 110, midY, { align: 'left', color: 'dim', size: 16, alpha: 1 - flip * 2 });
    } else {
      OPS.arrow(gl, [model[0], model[1] + 66], [you[0], you[1] - 74], { color: 'warn', width: 2.6 });
      OPS.tick(gl, 'commands', you[0] + 110, midY, { align: 'left', color: 'warn', size: 16, alpha: (flip - 0.5) * 2 });
    }
    lmEnd(g);
    MV.focus(you[0], you[1], 'you');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['org', flip < 0.5 ? 'flattening' : 'inverted']] }));
    return {};
  },
});
