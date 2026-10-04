// foom — "'cause the future goes FOOM": the same curve from `drop`, turned inside out — it runs up
// exponentially, then on "FOOM" the tip bursts: a point cloud blasts outward, kicks shake and tear
// the frame. The word itself is the biggest lyric in the film.
MV.scene('foom', {
  init() {
    this.pts = [];
    for (let i = 0; i <= 120; i++) {
      const u = i / 120;
      this.pts.push([240 + u * 1240, 920 - (Math.exp(u * 4.4) - 1) / (Math.exp(4.4) - 1) * 420]);
    }
    this.burst = [];
    const rnd = mulberry32(12);
    for (let i = 0; i < 1300; i++) { const a = rnd() * TAU, b = Math.acos(2 * rnd() - 1), sp = 0.35 + rnd() * 1; this.burst.push([a, b, sp]); }
  },
  render(g, f) {
    const tF = MV.lyrics.get('future goes').words[MV.lyrics.get('future goes').words.length - 1].start;
    const burst = f.t - tF;
    lmBegin('ember');
    const gl = lmGlow();
    // faint floor grid, for the sense of a room
    gl.save(); gl.strokeStyle = lmCss('dim', 0.35); gl.lineWidth = 1;
    for (let x = 160; x <= W - 160; x += 176) { gl.beginPath(); gl.moveTo(x, 920); gl.lineTo(x, 940 + (x - 960) * 0.06); gl.stroke(); }
    gl.restore();
    const grow = prog(f.lt, 0.1, 1.05);
    const tip0 = OPS.stroke(gl, this.pts, { color: 'accent', width: 3.6, upto: grow, glow: 16 });
    const tip = burst > 0 ? [1480, 500] : (tip0 || this.pts[this.pts.length - 1]);
    if (burst > 0) {
      const k = clamp(burst / 1.1);
      // the blast cloud — biased down and kept clear of the lyric band up top
      const P = new Float32Array(1300 * 3);
      this.burst.forEach(([a, b, sp], i) => {
        const r = burst * 380 * sp;
        P[i * 3] = tip[0] + Math.sin(b) * Math.cos(a) * r;
        P[i * 3 + 1] = tip[1] + 40 + Math.cos(b) * r * 0.55;
        P[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r * 0.4;
      });
      lmPoints(lmScreen(), P, { size: 2.2, gain: Math.max(0.15, 1 - k * 0.75), color: 'hot', dynamic: true });
      // white core + shock rings
      gl.fillStyle = lmCss('hot', Math.max(0, 0.9 - k));
      glow(gl, lmCss('hot', 0.8), 60); gl.beginPath(); gl.arc(tip[0], tip[1], 26 + burst * 70, 0, TAU); gl.fill();
      gl.shadowBlur = 0;
      OPS.rings(gl, f, { x: tip[0], y: tip[1], speed: 300, color: 'hot', width: 3, window: 0.7 });
    }
    lmEnd(g, { bloom: 1.25 });
    MV.focus(tip[0], tip[1], burst > 0 ? 'blast' : 'tip');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['growth', '×' + lmFmt(Math.exp(grow * 40) | 0, { dec: 0 })], ['status', burst > 0 ? 'FOOM' : 'EXP']] }));
    return { shake: 6 * f.a.kick, glitch: 0.3 * f.a.kick + 0.35 * clamp(1 - burst / 0.3) * (burst > 0 ? 1 : 0) };
  },
});
