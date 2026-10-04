// circuits — "Your circuits make me nervous, that's no surprise": a chip with manhattan traces,
// pulses running along them; the whole net flinches on "nervous".
MV.scene('circuits', {
  init() {
    const rnd = mulberry32(8), R = mulberry32(9);
    this.traces = [];
    this.chip = { x: W / 2 - 190, y: H / 2 - 130, w: 380, h: 260 };
    for (let i = 0; i < 16; i++) {
      const side = i % 4, pts = [];
      let x, y, dx = 0, dy = 0;
      if (side === 0) { x = this.chip.x + R() * this.chip.w; y = this.chip.y; dy = -1; }
      else if (side === 1) { x = this.chip.x + this.chip.w; y = this.chip.y + R() * this.chip.h; dx = 1; }
      else if (side === 2) { x = this.chip.x + R() * this.chip.w; y = this.chip.y + this.chip.h; dy = 1; }
      else { x = this.chip.x; y = this.chip.y + R() * this.chip.h; dx = -1; }
      pts.push([x, y]);
      const runs = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < runs; k++) {
        const len = 90 + rnd() * 220;
        x += dx * len; y += dy * len; pts.push([x, y]);
        [dx, dy] = rnd() < 0.5 ? [dy, dx] : [-dy, -dx];
      }
      // keep the trace on the canvas
      pts.forEach(p => { p[0] = clamp(p[0], 120, W - 120); p[1] = clamp(p[1], 150, H - 190); });
      this.traces.push(pts);
    }
    this.cum = this.traces.map(pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; });
  },
  pt(ti, u) {
    const pts = this.traces[ti], c = this.cum[ti], L = c[c.length - 1], s = clamp(u) * L;
    let k = 1; while (k < c.length - 1 && c[k] < s) k++;
    const a = pts[k - 1], b = pts[k], q = (s - c[k - 1]) / Math.max(1e-9, c[k] - c[k - 1]);
    return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  },
  render(g, f) {
    const nervous = Math.max(0, 1 - (f.t - MV.lyrics.get('nervous').words[2].start) / 0.45);
    lmBegin('ice');
    lmPoints(lmScreen(), OPS.mkStars.__ || (OPS.mkStars.__ = OPS.mkStars(350, 31)), { size: 1.2, gain: 0.22, twinkle: 0.45, t: f.t, fog: 100 });
    const gl = lmGlow();
    gl.save();
    gl.translate((hash(f.tick, 91) - 0.5) * 10 * nervous, (hash(f.tick, 92) - 0.5) * 10 * nervous);   // the flinch
    this.traces.forEach((pts, i) => OPS.stroke(gl, pts, { color: 'dim', alpha: 0.75, width: 1.6 }));
    // the chip
    OPS.stroke(gl, [[this.chip.x, this.chip.y], [this.chip.x + this.chip.w, this.chip.y], [this.chip.x + this.chip.w, this.chip.y + this.chip.h], [this.chip.x, this.chip.y + this.chip.h]], { color: 'fg', width: 2.4, closed: true, glow: 10 });
    for (let i = 0; i < 5; i++) for (let k = 0; k < 5; k++)
      OPS.stroke(gl, [[this.chip.x + 60 + i * 65, this.chip.y + 55 + k * 38], [this.chip.x + 95 + i * 65, this.chip.y + 55 + k * 38]], { color: 'dim', alpha: 0.5, width: 1.4 });
    OPS.tick(gl, 'FAB-04', this.chip.x + this.chip.w / 2, this.chip.y + this.chip.h / 2, { size: 24, color: 'fg', alpha: 0.9 });
    // pulses: a bright head and a fading tail on every trace
    this.traces.forEach((pts, i) => {
      const sp = 0.1 + (i % 3) * 0.03, u = (f.t * sp + i / this.traces.length) % 1;
      for (let s = 0; s < 4; s++) {
        const p = this.pt(i, u - s * 0.012);
        if (!p) continue;
        gl.fillStyle = lmCss(s ? 'fg' : 'hot', (1 - s / 4) * (0.5 + 0.5 * f.a.mid));
        gl.beginPath(); gl.arc(p[0], p[1], s ? 2.6 : 4.2, 0, TAU); gl.fill();
      }
    });
    gl.restore();
    lmEnd(g);
    const h = this.pt(1, (f.t * 0.13 + 1 / 16) % 1);
    MV.focus(h[0], h[1], 'pulse');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['net', 'FAB-04'], ['activity', Math.round(30 + 60 * f.a.mid) + '%']] }));
    return { shake: 5 * nervous };
  },
});
