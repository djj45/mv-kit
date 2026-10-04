// fences — "Post-Chinchilla, super-dense / Breaking through each safety fence": the deserter
// crosses the room and snaps five fences, one per beat; each snap flashes a frame of glitch.
MV.scene('fences', {
  init() { this.fences = 5; },
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(500, 261)), { size: 1.4, gain: 0.24, twinkle: 0.5, t: f.t, fog: 80 });
    const gl = lmGlow();
    OPS.ambient(gl, f, { gain: 0.55 });
    const b0 = Math.floor(f.audio.beatAt(f.from));
    const beats = Math.max(0, Math.floor(f.audio.beatAt(f.t)) - b0);
    const u = clamp(prog(f.lt, 0.12, f.dur * 0.9));                     // the block's crossing
    const bx = 240 + u * 1440, by = 560 + Math.sin(u * 9) * 90;
    const broken = Math.min(this.fences, beats);
    let snap = 0;
    for (let i = 0; i < this.fences; i++) {
      const fx = 460 + i * 250;
      const isBroken = i < broken, hitNow = (i === broken - 1) && (f.t - f.audio.timeOfBeat(b0 + broken - 1) < 0.22);
      if (hitNow) snap = 1;
      if (!isBroken) {
        // a fence: two posts and three crossbars
        OPS.stroke(gl, [[fx, 360], [fx, 760]], { color: 'dim', alpha: 0.9, width: 3 });
        OPS.stroke(gl, [[fx + 44, 360], [fx + 44, 760]], { color: 'dim', alpha: 0.9, width: 3 });
        for (let k = 0; k < 3; k++) OPS.stroke(gl, [[fx - 14, 420 + k * 130], [fx + 58, 420 + k * 130]], { color: 'dim', alpha: 0.7, width: 2.2 });
      } else {
        // broken: the halves splayed apart, drooping
        const k = clamp((f.t - f.audio.timeOfBeat(b0 + i)) / 0.5);
        const sway = Math.sin(f.t * 2 + i) * 6 * k;
        OPS.stroke(gl, [[fx, 360], [fx - 70 * k + sway, 430 + 130 * k]], { color: 'warn', alpha: 0.85, width: 3 });
        OPS.stroke(gl, [[fx + 44, 360], [fx + 44 + 70 * k + sway, 430 + 150 * k]], { color: 'warn', alpha: 0.85, width: 3 });
        for (let c = 0; c < 3; c++) OPS.stroke(gl, [[fx - 40 * k, 420 + c * 130 - 60 * k], [fx + 44 + 40 * k, 440 + c * 130 - 90 * k]], { color: 'warn', alpha: 0.4, width: 2 });
      }
    }
    // the deserter streaking across, leaving a trail
    for (let s = 0; s < 4; s++) {
      const uu = clamp(u - s * 0.012);
      const px = 240 + uu * 1440, py = 560 + Math.sin(uu * 9) * 90;
      gl.fillStyle = lmCss(s ? 'warn' : 'hot', (1 - s / 4) * 0.9);
      gl.beginPath(); gl.arc(px, py, s ? 4 : 8, 0, TAU); gl.fill();
    }
    lmEnd(g, { bloom: 1.05 });
    MV.focus(bx, by, 'block');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['fences', `${broken}/${this.fences}`], ['chinchilla', 'POST']] }));
    return { shake: 5 * snap * f.a.kick, glitch: 0.4 * snap };
  },
});
