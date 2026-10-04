// stack — "'Just transformers all the way!': a tower of transformer blocks lighting up from the
// bottom, one block per beat, growing past the top of the frame. The warp stands the tower up.
MV.scene('stack', {
  init() {
    this.n = 9;
    this.w = 560;
  },
  block(gl, f, i, on, y) {
    const x = W / 2, w = this.w - i * 26, h = 76;
    const a = on ? 1 : 0.22;
    OPS.stroke(gl, [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + h], [x - w / 2, y + h]], { color: on ? 'accent' : 'dim', alpha: a, width: 2.4, closed: true, glow: on ? 12 : 0 });
    if (on) {
      // the attention pattern inside: a little X of cross-links
      OPS.stroke(gl, [[x - w / 2 + 26, y + h / 2], [x + w / 2 - 26, y + h / 2]], { color: 'fg', alpha: 0.5, width: 1.4 });
      for (let k = 0; k < 5; k++) {
        const px = x - w / 2 + 40 + k * (w - 80) / 4;
        gl.fillStyle = lmCss('hot', 0.35 + 0.55 * Math.sin(f.t * 3 + i + k) ** 2);
        gl.beginPath(); gl.arc(px, y + h / 2, 4, 0, TAU); gl.fill();
      }
      OPS.tick(gl, `blk ${String(i + 1).padStart(2, '0')}`, x - w / 2 + 20, y + 22, { align: 'left', size: 14, color: 'dim' });
    }
  },
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(200, 241)), { size: 1.1, gain: 0.13, twinkle: 0.4, t: f.t, fog: 80 });
    const gl = lmGlow();
    const b0 = Math.floor(f.audio.beatAt(f.from));
    const lit = Math.min(this.n + 2, Math.floor(f.audio.beatAt(f.t)) - b0 + 2);
    const bh = 96;
    for (let i = 0; i < this.n + 2; i++) {
      const on = i < lit;
      const y = 940 - i * bh - (i >= this.n ? bh * prog(f.lt, 0.8, f.dur) : 0);   // two more keep growing out of frame
      this.block(gl, f, i, on, y);
      if (i === lit - 1) this.tipY = y;
    }
    OPS.tick(gl, '×' + lit + ' layers', W / 2, 990, { size: 17, color: 'dim' });
    lmEnd(g);
    MV.focus(W / 2, Math.max(140, this.tipY ?? 940), 'top block');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['depth', `${lit}`], ['loss', '↓ forever']] }));
    return {};
  },
});
