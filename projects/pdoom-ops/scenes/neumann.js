// neumann — "Now von Neumann's obsolete": the architecture that ran the last century — CPU, store,
// bus — drawn as one diagram; its wires unplug themselves one by one. The timeline's warp tips the
// whole board over at the end.
MV.scene('neumann', {
  init() {
    this.boxes = [
      { n: 'CPU', x: 660, y: 380 }, { n: 'STORE', x: 1260, y: 380 }, { n: 'I/O', x: 660, y: 740 }, { n: 'HUMAN', x: 1260, y: 740 },
    ];
    this.wires = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3]];
  },
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(240, 181)), { size: 1.1, gain: 0.15, twinkle: 0.4, t: f.t, fog: 90 });
    const gl = lmGlow();
    const dead = prog(f.lt, f.dur * 0.5, f.dur * 0.9);
    const b = (i, k) => this.boxes[i];
    // wires unplug: each end drifts off its box with its own delay
    this.wires.forEach(([a, c], i) => {
      const A = this.boxes[a], B = this.boxes[c];
      const k = clamp(dead * 1.5 - i * 0.13);
      const wob = Math.sin(f.t * 1.7 + i) * 5 * k;
      const p1 = [A.x + 180 + k * (hash(i, 1, 2) - 0.3) * 240, A.y + wob * (hash(i, 2, 3) - 0.5)];
      const p2 = [B.x - 180 - k * (hash(i, 3, 4) - 0.3) * 240, B.y - wob * (hash(i, 4, 5) - 0.5)];
      OPS.stroke(gl, [[A.x, A.y], p1, p2, [B.x, B.y]], { color: 'dim', alpha: 0.8 * (1 - k * 0.7), width: 1.6 });
    });
    // the boxes dim with the diagram
    this.boxes.forEach((B, i) => {
      const alive = 1 - clamp(dead * 1.2 - i * 0.08);
      OPS.stroke(gl, [[B.x - 180, B.y - 74], [B.x + 180, B.y - 74], [B.x + 180, B.y + 74], [B.x - 180, B.y + 74]], { color: 'fg', alpha: 0.25 + 0.75 * alive, width: 2.2, closed: true, glow: 10 });
      OPS.tick(gl, B.n, B.x, B.y, { size: 30, color: i === 3 ? 'accent' : 'fg', alpha: 0.3 + 0.7 * alive });
      if (i === 3) OPS.tick(gl, '(deprecated)', B.x, B.y + 40, { size: 16, color: 'fg', alpha: 0.3 + 0.7 * (1 - alive) });
    });
    if (dead > 0.55) lmBig(gl, 'OBSOLETE', W / 2, 950, { size: 54, glitch: clamp((dead - 0.55) * 2), t: f.t, color: 'warn', track: 0.3 });
    lmEnd(g);
    MV.focus(960, 560, 'bus');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['arch', 'VON NEUMANN'], ['wires', `${Math.round((1 - dead) * 5)}/5`]] }));
    return {};
  },
});
