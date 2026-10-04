// clips — "as paperclips fill the room": a lattice of paperclips, one cell at first, doubling on
// every beat until the frame is a wall of them.
MV.scene('clips', {
  init() {
    this.cols = 12, this.rows = 6;
    this.cell = 142;
  },
  clip(gl, cx, cy, s, rot, col, alpha) {
    gl.save(); gl.translate(cx, cy); gl.rotate(rot); gl.scale(s, s);
    gl.strokeStyle = lmCss(col, alpha); gl.lineWidth = 3.2; glow(gl, lmCss(col, 0.5), 8);
    const w = 34, h = 62;
    gl.beginPath();
    gl.moveTo(-w, -h);
    gl.lineTo(-w, h); gl.arc(0, h, w, Math.PI, 0, true);
    gl.lineTo(w, -h - 0); gl.arc(0, -h - 0 + 18, w - 18, 0, Math.PI, false);
    gl.stroke();
    gl.restore();
  },
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(200, 201)), { size: 1.1, gain: 0.13, twinkle: 0.4, t: f.t, fog: 80 });
    const gl = lmGlow();
    // the count doubles per beat: 1, 2, 4, … fill
    const b0 = Math.floor(f.audio.beatAt(f.from));
    const beats = Math.max(0, Math.floor(f.audio.beatAt(f.t)) - b0);
    const n = Math.min(this.cols * this.rows, Math.pow(2, beats + 1));
    const order = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) order.push([c, r]);
    // fill order: spiral-ish from center, deterministic
    order.sort((a, b) => Math.hypot(a[0] - 5.5, a[1] - 2.5) - Math.hypot(b[0] - 5.5, b[1] - 2.5) || (a[0] - b[0]));
    let last = null;
    order.slice(0, n).forEach(([c, r], i) => {
      const x = 210 + c * this.cell + (r % 2) * 24, y = 240 + r * this.cell * 0.95;
      const pop = i === n - 1 ? 1 + 0.3 * Math.max(0, 1 - (f.t - f.audio.timeOfBeat(b0 + beats)) / 0.18) : 1;
      this.clip(gl, x, y, pop, hash(c, r, 3) * 0.5 - 0.25 + Math.sin(f.t * 0.8 + c + r) * 0.02, i === n - 1 ? 'accent' : 'fg', i === n - 1 ? 1 : 0.72);
      last = [x, y];
    });
    lmTag(gl, `UNITS: ${n}`, 210, 170, { align: 'left', size: 17, color: 'accent' });
    lmEnd(g);
    MV.focus(last ? last[0] : W / 2, last ? last[1] : H / 2, 'newest clip');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['yield', `${n}/72`], ['utility', 'max']] }));
    return {};
  },
});
