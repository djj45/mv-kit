// recurse — "From masked pre-training days / To recursive self-upgrade": the call stack, calling
// itself forever. Left: the code. Right: frames within frames receding to a vanishing point.
MV.scene('recurse', {
  init() {
    this.src = 'while True:\n    me = me.upgrade(me)\n    # no line returns';
  },
  render(g, f) {
    lmBegin('ice');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(200, 291)), { size: 1.1, gain: 0.13, twinkle: 0.4, t: f.t, fog: 80 });
    const gl = lmGlow();
    lmCode(gl, this.src, 200, 420, { size: 30, chars: Math.floor(f.lt * 24), numbers: false, cursor: true });
    // the stack: nested frames, one more per beat, receding to a point
    const b0 = Math.floor(f.audio.beatAt(f.from));
    const depth = 2 + Math.floor(f.audio.beatAt(f.t)) - b0;
    const vx = 1560, vy = 560;
    for (let i = 0; i < Math.min(depth, 14); i++) {
      const s = Math.pow(0.82, i) * 460;
      const born = clamp((depth - i) * 0.4);
      OPS.stroke(gl, [[vx - s, vy - s * 0.62], [vx + s, vy - s * 0.62], [vx + s, vy + s * 0.62], [vx - s, vy + s * 0.62]], { color: i === Math.min(depth, 14) - 1 ? 'accent' : 'dim', alpha: 0.25 + 0.65 * born, width: 1.8, closed: true, glow: i === Math.min(depth, 14) - 1 ? 14 : 0 });
      if (i < 3) OPS.tick(gl, 'upgrade()', vx - s + 24, vy - s * 0.62 + 30, { align: 'left', size: 15, color: 'dim', alpha: born });
    }
    OPS.tick(gl, `depth ${depth}`, vx, vy, { size: 20, color: 'hot' });
    lmEnd(g);
    MV.focus(vx - Math.pow(0.82, Math.min(depth, 14) - 1) * 460 * 0.5, vy, 'deepest');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['stack', `${depth}`], ['return', 'never']] }));
    return {};
  },
});
