// pto — "Killswitch guy's on PTO / Now there's nowhere left to go": the console. The big red
// button is labelled; a sticky note explains; every exit on the board has its ×.
MV.scene('pto', {
  init() {
    this.exits = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  },
  render(g, f) {
    lmBegin('ember');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(220, 211)), { size: 1.1, gain: 0.14, twinkle: 0.4, t: f.t, fog: 80 });
    const gl = lmGlow();
    // the button
    const bx = 560, by = 560, R = 130;
    gl.save();
    gl.strokeStyle = lmCss('warn', 0.95); gl.lineWidth = 4; glow(gl, lmCss('warn', 0.6), 18);
    gl.beginPath(); gl.arc(bx, by, R + 26, 0, TAU); gl.stroke();
    gl.fillStyle = lmCss('warn', 0.22 + 0.1 * Math.sin(f.t * 2.2));
    gl.beginPath(); gl.arc(bx, by, R, 0, TAU); gl.fill();
    gl.strokeStyle = lmCss('warn', 1); gl.lineWidth = 6;
    gl.beginPath(); gl.arc(bx, by, R, 0, TAU); gl.stroke();
    gl.restore();
    OPS.tick(gl, 'KILL', bx, by - 16, { size: 40, color: 'hot' });
    OPS.tick(gl, 'SWITCH', bx, by + 30, { size: 26, color: 'hot' });
    // the sticky note, slightly rotated
    gl.save(); gl.translate(bx + 250, by - 120); gl.rotate(-0.06);
    OPS.stroke(gl, [[-110, -62], [110, -62], [110, 62], [-110, 62]], { color: 'fg', alpha: 0.9, width: 1.8, closed: true });
    OPS.tick(gl, 'ON PTO', 0, -18, { size: 26, color: 'fg' });
    // a little sun, because the beach waits for no one
    gl.strokeStyle = lmCss('accent', 0.9); gl.lineWidth = 2.4;
    gl.beginPath(); gl.arc(0, 26, 13, 0, TAU); gl.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; gl.beginPath(); gl.moveTo(Math.cos(a) * 19, 26 + Math.sin(a) * 19); gl.lineTo(Math.cos(a) * 27, 26 + Math.sin(a) * 27); gl.stroke(); }
    gl.restore();
    // the exits board: every door crossed out, one per beat
    const b0 = Math.floor(f.audio.beatAt(f.from));
    const done = Math.min(this.exits.length, Math.floor(f.audio.beatAt(f.t)) - b0 + 1);
    const ex = 1160, ey = 392;
    OPS.stroke(gl, [[ex - 120, ey - 60], [ex + 360, ey - 60], [ex + 360, ey + 420], [ex - 120, ey + 420]], { color: 'dim', alpha: 0.8, width: 1.6, closed: true });
    lmTag(gl, 'EXITS', ex - 92, ey - 24, { align: 'left', size: 16 });
    let focusPt = [bx, by];
    this.exits.forEach((e, i) => {
      const y = ey + 42 + i * 62, on = i < done;
      OPS.tick(gl, `EXIT ${e}`, ex - 88, y, { align: 'left', size: 24, color: on ? 'dim' : 'fg', alpha: on ? 0.55 : 0.9 });
      if (on) { OPS.tick(gl, '×', ex + 290, y, { size: 30, color: 'warn' }); focusPt = [ex + 290, y]; }
    });
    lmEnd(g);
    MV.focus(focusPt[0], focusPt[1], 'last ×');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['operator', 'PTO'], ['exits', `${done}/${this.exits.length} closed`]] }));
    return {};
  },
});
