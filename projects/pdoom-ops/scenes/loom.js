// loom — "Just as foretold by Loom": the loom of fate. The warp threads stand; the shuttle
// crosses row by row, weaving the motif curve (the one from `drop`, read sideways) into the cloth.
MV.scene('loom', {
  init() {
    this.rows = 13;
    this.w0 = 330, this.w1 = 1590;
    // the pattern being woven: the exponential, read as a row → column mapping
    this.pattern = r => clamp(Math.pow(r / (this.rows - 1), 2.2)) ;
    this.shuttlePts = LG.along([[0, 0, 0], [0.001, 0, 0]], 2, {});
  },
  render(g, f) {
    lmBegin('rose');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(240, 281)), { size: 1.1, gain: 0.14, twinkle: 0.4, t: f.t, fog: 90 });
    const gl = lmGlow();
    const y0 = 300, rh = (880 - y0) / this.rows;
    // warp threads, waiting
    for (let i = 0; i <= 40; i++) {
      const x = this.w0 + (this.w1 - this.w0) * i / 40;
      OPS.stroke(gl, [[x, 240], [x, 940]], { color: 'dim', alpha: 0.44 + 0.13 * Math.sin(i * 1.7 + f.t), width: 1 });
    }
    // the woven rows: weft threads left behind, the curve picked out in accent
    const woven = clamp(prog(f.lt, 0.15, f.dur * 0.92)) * this.rows;
    for (let r = 0; r < Math.floor(woven); r++) {
      const y = y0 + r * rh + rh / 2;
      const px = this.pattern(r);
      OPS.stroke(gl, [[this.w0, y], [this.w1, y]], { color: 'dim', alpha: 0.55, width: 2 });
      const cxp = this.w0 + (this.w1 - this.w0) * px;
      OPS.stroke(gl, [[cxp - 34, y], [cxp + 34, y]], { color: 'accent', alpha: 0.95, width: 4.4, glow: 12 });
    }
    // the shuttle on the current row
    const r = Math.min(this.rows - 1, Math.floor(woven));
    const rowP = woven - Math.floor(woven);
    const dir = r % 2 === 0 ? rowP : 1 - rowP;
    const sx = lerp(this.w0, this.w1, dir), sy = y0 + r * rh + rh / 2;
    gl.fillStyle = lmCss('hot'); glow(gl, lmCss('hot', 0.9), 26);
    gl.beginPath(); gl.ellipse(sx, sy, 16, 9, 0, 0, TAU); gl.fill(); gl.shadowBlur = 0;
    // the partial weft behind the shuttle on this row
    OPS.stroke(gl, dir > 0 ? [[this.w0, sy], [sx, sy]] : [[this.w1, sy], [sx, sy]], { color: 'fg', alpha: 0.7, width: 2 });
    lmTag(gl, 'TAPESTRY — PRE-WOVEN', 330, 218, { align: 'left', size: 15 });
    lmEnd(g);
    MV.focus(sx, sy, 'shuttle');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['row', `${r + 1}/${this.rows}`], ['fate', 'FIXED']] }));
    return {};
  },
});
