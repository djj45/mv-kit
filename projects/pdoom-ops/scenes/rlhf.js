// rlhf — "RLHF goes askew": the steering wheel of reinforcement, cranked past its stop; the frame
// tilts with it (post rot) and the reward arrows tie themselves into a loop.
MV.scene('rlhf', {
  render(g, f) {
    lmBegin('alert');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(200, 271)), { size: 1.1, gain: 0.13, twinkle: 0.4, t: f.t, fog: 80 });
    const gl = lmGlow();
    const cx = 960, cy = 610, R = 300;
    // cranked: strain to 70° (the stop), then forced through to 130° with a wobble
    const p = prog(f.lt, 0.1, f.dur * 0.85, ease.inOutCubic);
    const ang = p < 0.55 ? p / 0.55 * 1.22 : 1.22 + (p - 0.55) / 0.45 * 1.1;
    const strain = p > 0.5 ? (p - 0.5) * 2 : 0;
    const wob = strain * Math.sin(f.t * 16) * 0.05 * (1 - p);
    const A = ang + wob;
    gl.save(); gl.translate(cx, cy); gl.rotate(A);
    // rim
    gl.strokeStyle = lmCss('fg', 0.95); gl.lineWidth = 7; glow(gl, lmCss('fg', 0.5), 16);
    gl.beginPath(); gl.arc(0, 0, R, 0, TAU); gl.stroke(); gl.shadowBlur = 0;
    // spokes + hub
    gl.lineWidth = 4;
    for (const a of [0, 2.1, -2.1]) { gl.beginPath(); gl.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); gl.lineTo(Math.cos(a) * (R - 6), Math.sin(a) * (R - 6)); gl.stroke(); }
    gl.fillStyle = lmCss('accent'); gl.beginPath(); gl.arc(0, 0, 26, 0, TAU); gl.fill();
    gl.restore();
    // the stop pin, and the marks where it was forced past
    OPS.stroke(gl, [[cx + R + 34, cy - 40], [cx + R + 74, cy + 20]], { color: 'warn', alpha: 0.9, width: 5 });
    OPS.tick(gl, 'STOP', cx + R + 120, cy - 10, { align: 'left', size: 16, color: 'warn' });
    OPS.tick(gl, 'reward', cx, cy - R - 60, { size: 17, color: 'dim' });
    // the reward loop, tying itself into a knot
    const knot = [];
    for (let i = 0; i <= 220; i++) {
      const u = i / 220;
      const a = u * TAU * 2 + f.t * 0.7;
      const r = 150 + 60 * Math.sin(u * TAU * 3 + f.t);
      knot.push([cx + 620 + Math.cos(a) * r * 0.9, cy - 40 + Math.sin(a) * r]);
    }
    OPS.stroke(gl, knot, { color: 'accent', alpha: 0.85, width: 2.6, upto: clamp(prog(f.lt, 0.2, f.dur * 0.7) * 1.2), glow: 12 });
    lmEnd(g, { bloom: 1.1 });
    MV.focus(cx, cy, 'wheel');
    const tilt = -0.1 * strain;
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['steer', `${Math.round(A * 180 / Math.PI)}°`], ['reward', 'NaN']] }));
    return { rot: tilt, shake: 4 * f.a.kick * strain };
  },
});
