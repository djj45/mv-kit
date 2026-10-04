// nvda — "NVDA to the moon": the motif line as a ticker, stepping up beat by beat toward a
// crescent moon of points in the top right. The insert follows the quote.
MV.scene('nvda', {
  init() {
    this.stars = OPS.mkStars(420, 131);
    // the moon: points along two arcs (a crescent), top right
    const rnd = mulberry32(19), P = [];
    for (let i = 0; i < 520; i++) {
      const a = rnd() * TAU;
      const r1 = 118 + rnd() * 14, r2 = 74;
      const x = Math.cos(a) * r1, y = Math.sin(a) * r1;
      const x2 = x * 0.62 + 42, y2 = y * 0.62 - 12;
      if (Math.hypot(x - x2, y - y2) < 8) continue;                                   // inside the bite
      P.push(1420 + x, 300 + y, 0);
    }
    this.moon = new Float32Array(P);
  },
  render(g, f) {
    lmBegin('ember');
    const cam = lmScreen();
    lmPoints(cam, this.stars, { size: 1.3, gain: 0.26, twinkle: 0.55, t: f.t, fog: 90 });
    lmPoints(cam, this.moon, { size: 1.7, gain: 0.75, color: 'hot', twinkle: 0.45, t: f.t, fog: 40 });
    const gl = lmGlow();
    // grid
    gl.save(); gl.strokeStyle = lmCss('dim', 0.3); gl.lineWidth = 1;
    for (let y = 260; y < 940; y += 110) { gl.beginPath(); gl.moveTo(180, y); gl.lineTo(1800, y); gl.stroke(); }
    gl.restore();
    // the ticker: a step per beat, only up (this chart does not go down)
    const b0 = Math.floor(f.audio.beatAt(f.from)), steps = [];
    const total = Math.floor(f.audio.beatAt(f.to)) - b0;
    for (let i = 0; i <= total; i++) {
      const tb = f.audio.timeOfBeat(b0 + i);
      const u = clamp((f.t - f.from) / (f.to - f.from));
      if (tb > f.t) break;
      const k = i / total;
      steps.push([190 + k * 1180, 880 - k * 560 - 26 * (hash(b0 + i, 3, 5) - 0.5) * 2]);
    }
    if (steps.length > 1) {
      OPS.stroke(gl, steps, { color: 'accent', width: 3.4, glow: 14 });
      const tip = steps[steps.length - 1];
      gl.fillStyle = lmCss('hot'); glow(gl, lmCss('hot', 0.8), 20);
      gl.beginPath(); gl.arc(tip[0] + 6, tip[1] - 6, 6, 0, TAU); gl.fill(); gl.shadowBlur = 0;
      // a small ascending triangle marker
      gl.beginPath(); gl.moveTo(tip[0] + 26, tip[1] - 2); gl.lineTo(tip[0] + 40, tip[1] - 2); gl.lineTo(tip[0] + 33, tip[1] - 18); gl.closePath();
      gl.strokeStyle = lmCss('hot', 0.95); gl.lineWidth = 2; gl.stroke();
      this.tip = tip;
    }
    const q = 118 + 640 * clamp((f.t - f.from) / (f.to - f.from));
    OPS.tick(gl, `$${lmFmt(q, { dec: 2 })}`, 180, 232, { align: 'left', color: 'accent', size: 26 });
    lmTag(gl, 'NVDA — 1D', 1800, 232, { align: 'right', size: 16 });
    lmEnd(g);
    MV.focus(this.tip ? this.tip[0] + 30 : W / 2, this.tip ? this.tip[1] - 10 : H / 2, 'quote');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['tick', 'NVDA'], ['target', 'MOON']] }));
    return {};
  },
});
