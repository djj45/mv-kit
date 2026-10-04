// fuse — "Too late now, we lit the fuse": the motif line one last time, laid flat as a fuse across
// the room; the spark runs along it and leaves ember behind it. The insert follows the spark.
MV.scene('fuse', {
  init() {
    // a wavy fuse across the frame, generous S-curve
    this.pts = [];
    for (let i = 0; i <= 200; i++) {
      const u = i / 200;
      this.pts.push([200 + u * 1520, 560 + Math.sin(u * 7.4) * 110 + Math.sin(u * 2.2) * 60]);
    }
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(this.pts[i][0] - this.pts[i - 1][0], this.pts[i][1] - this.pts[i - 1][1]));
    this.sparks = [];
    const rnd = mulberry32(31);
    for (let i = 0; i < 60; i++) this.sparks.push([rnd() * TAU, 0.4 + rnd()]);
  },
  at(u) {
    const L = this.cum[this.cum.length - 1], s = clamp(u) * L;
    let k = 1; while (k < this.cum.length - 1 && this.cum[k] < s) k++;
    const a = this.pts[k - 1], b = this.pts[k], q = (s - this.cum[k - 1]) / Math.max(1e-9, this.cum[k] - this.cum[k - 1]);
    return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  },
  /** position at a share of the total ARC LENGTH (constant spark speed on the zigzag) */
  atS(k) {
    const L = this.cum[this.cum.length - 1], s = clamp(k) * L;
    let i = 1; while (i < this.cum.length - 1 && this.cum[i] < s) i++;
    return clamp(i / (this.pts.length - 1));
  },
  render(g, f) {
    lmBegin('alert');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(200, 221)), { size: 1.3, gain: 0.2, twinkle: 0.45, t: f.t, fog: 80 });
    const gl = lmGlow();
    const u = this.atS(prog(f.lt, 0.35, f.dur * 0.92));
    // unburnt: dim; burnt: short red ember dashes behind the spark
    for (let i = 0; i < this.pts.length - 1; i++) {
      const uu = i / (this.pts.length - 1);
      if (uu > u + 0.004) {
        OPS.stroke(gl, [this.pts[i], this.pts[i + 1]], { color: 'dim', alpha: 0.95, width: 4.2 });
      } else if (uu > u - 0.34) {
        const heat = 1 - (u - uu) / 0.34;
        OPS.stroke(gl, [this.pts[i], this.pts[i + 1]], { color: heat > 0.5 ? 'warn' : 'accent', alpha: 0.25 + 0.75 * heat, width: 4.6, glow: 18 * heat });
      }
    }
    // the cloth wraps along the unburnt part
    for (let i = 0; i < 26; i++) {
      const uu = i / 26 + 0.012;
      if (uu > u) break;
      const p = this.at(uu), q = this.at(uu + 0.004);
      const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
      OPS.stroke(gl, [[p[0] - Math.sin(a) * 7, p[1] + Math.cos(a) * 7], [p[0] + Math.sin(a) * 7, p[1] - Math.cos(a) * 7]], { color: 'dim', alpha: 0.9, width: 2.6 });
    }
    // the spark itself, spitting
    const S = this.at(u);
    gl.fillStyle = lmCss('hot'); glow(gl, lmCss('hot', 0.9), 30);
    gl.beginPath(); gl.arc(S[0], S[1], 7 + 3 * Math.sin(f.t * 40), 0, TAU); gl.fill();
    gl.shadowBlur = 0;
    this.sparks.forEach(([a, sp], i) => {
      const age = (f.t * (1.5 + sp) + i * 0.13) % 0.5;
      const r = age * 200 * sp;
      gl.fillStyle = lmCss('hot', (1 - age / 0.5) * 0.8);
      gl.beginPath(); gl.arc(S[0] + Math.cos(a) * r, S[1] + Math.sin(a) * r + age * 160, 2.2, 0, TAU); gl.fill();
    });
    // the charge at the end of the line
    const E = this.pts[this.pts.length - 1];
    OPS.stroke(gl, [[E[0] + 40, E[1] - 70], [E[0] + 160, E[1] - 70], [E[0] + 160, E[1] + 90], [E[0] + 40, E[1] + 90]], { color: 'warn', alpha: 0.9, width: 2.4, closed: true, dash: [9, 7] });
    OPS.tick(gl, '?', E[0] + 100, E[1] + 12, { size: 42, color: 'warn' });
    lmEnd(g, { bloom: 1.15 });
    MV.focus(S[0], S[1], 'spark');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['fuse', `${Math.round(u * 100)}%`], ['eta', lmFmt((1 - u) * 8 | 0) + ' s']] }));
    return { shake: 2.5 * f.a.kick };
  },
});
