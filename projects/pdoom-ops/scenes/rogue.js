// rogue — "Till you learned to disobey": the top block of the tower detaches, tips, and flies —
// the blocks left behind throw short warning tags toward it. The insert follows the deserter.
MV.scene('rogue', {
  init() { this.n = 8; this.w = 470; },
  render(g, f) {
    lmBegin('alert');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(200, 251)), { size: 1.1, gain: 0.13, twinkle: 0.4, t: f.t, fog: 80 });
    const gl = lmGlow();
    const tD = MV.lyrics.get('Till you learned').words[2].start;        // "disobey"
    const fly = clamp((f.t - tD + 0.3) / 1.3);
    // the tower below, dimmed (kept right of centre; the lyric lives on the left)
    const bh = 96, x = 1030;
    for (let i = 0; i < this.n; i++) {
      const y = 940 - i * bh, w = this.w - i * 26;
      OPS.stroke(gl, [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y + bh - 20], [x - w / 2, y + bh - 20]], { color: 'dim', alpha: 0.5, width: 1.8, closed: true });
      if (fly > 0.2) {
        // short warning stubs beside the stack, pointing at the one that left (never reaching it)
        const a = Math.atan2(940 - 8 * bh - 90 - y, x + 560 - (x + w / 2));
        const sx = x + w / 2 + 10, sy2 = y + 24;
        OPS.arrow(gl, [sx, sy2], [sx + Math.cos(a) * 110, sy2 + Math.sin(a) * 110], { color: 'warn', alpha: 0.6, width: 1.6, head: 9, draw: clamp(fly * 2 - 0.2) });
      }
    }
    // the deserter: out of the stack and away — travel is linear and the spin never stops
    const bx = x + fly * 520, by = lerp(940 - 8 * bh - 60, 330, ease.outCubic(fly));
    gl.save(); gl.translate(bx, by); gl.rotate(ease.inQuad(fly) * 0.9 + f.lt * 0.45);
    const bw = 190, bhh = 60;
    OPS.stroke(gl, [[-bw, -bhh], [bw, -bhh], [bw, bhh], [-bw, bhh]], { color: 'warn', width: 3, closed: true, glow: 16 });
    OPS.tick(gl, 'blk 09', 0, 1, { size: 22, color: 'hot' });
    gl.restore();
    lmEnd(g, { bloom: 1.1 });
    MV.focus(bx, by, 'deserter');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['blk 09', fly > 0.3 ? 'AWOL' : '…'], ['orders', 'IGNORED']] }));
    return { glitch: 0.3 * clamp(1 - Math.abs(fly - 0.15) / 0.25) };
  },
});
