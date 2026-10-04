// show — "Was it all for show?": the proscenium at last — curtains of lines, footlights, and the
// crescent moon from `nvda` descending on its wire. The apocalypse, revealed as a stage set.
MV.scene('show', {
  init() {
    const rnd = mulberry32(35), P = [];
    for (let i = 0; i < 420; i++) {
      const a = rnd() * TAU, r1 = 96 + rnd() * 12;
      const x = Math.cos(a) * r1, y = Math.sin(a) * r1;
      const x2 = x * 0.6 + 36, y2 = y * 0.6 - 10;
      if (Math.hypot(x - x2, y - y2) < 8) continue;
      P.push(x, y, 0);
    }
    this.moon = new Float32Array(P);
    // curtains: vertical wavy polylines, gathered at both sides
    this.curt = [];
    for (let c = 0; c < 7; c++) {
      const side = c < 4 ? 0 : 1, k = c % 4;
      const x = side ? 1740 + k * 46 : 180 - k * 46;
      const pts = [];
      for (let y = 180; y <= 1000; y += 40) pts.push([x + Math.sin(y * 0.01 + c * 2 + Math.sin(f0(y, c))) * 26, y]);
      this.curt.push(pts);
    }
    function f0(y, c) { return Math.sin(y * 0.004 + c); }
  },
  render(g, f) {
    lmBegin('rose');
    lmPoints(lmScreen(), this.stars || (this.stars = OPS.mkStars(300, 311)), { size: 1.2, gain: 0.18, twinkle: 0.5, t: f.t, fog: 100 });
    const gl = lmGlow();
    // the proscenium
    OPS.stroke(gl, [[240, 180], [1680, 180]], { color: 'dim', alpha: 0.85, width: 2.4 });
    OPS.stroke(gl, [[240, 180], [240, 1000]], { color: 'dim', alpha: 0.7, width: 2 });
    OPS.stroke(gl, [[1680, 180], [1680, 1000]], { color: 'dim', alpha: 0.7, width: 2 });
    lmTag(gl, 'SCENE 12 — THE EXPLANATION', 240, 148, { align: 'left', size: 15 });
    // curtains swaying
    this.curt.forEach((pts, c) => {
      const sway = pts.map(([x, y]) => [x + Math.sin(f.t * 0.9 + c * 1.3 + y * 0.002) * 9, y]);
      OPS.stroke(gl, sway, { color: 'accent', alpha: 0.5, width: 2.2 });
    });
    // footlights
    for (let i = 0; i < 9; i++) {
      const x = 340 + i * 155;
      const flick = 0.6 + 0.4 * Math.sin(f.t * 7 + i * 2.7) ** 2;
      gl.fillStyle = lmCss('accent', 0.5 * flick); glow(gl, lmCss('accent', 0.8), 18);
      gl.beginPath(); gl.arc(x, 986, 5, 0, TAU); gl.fill(); gl.shadowBlur = 0;
      gl.fillStyle = lmCss('accent', 0.08 * flick);
      gl.beginPath(); gl.moveTo(x - 26, 986); gl.lineTo(x + 26, 986); gl.lineTo(x, 880); gl.closePath(); gl.fill();
    }
    // the moon on its wire, descending
    const drop = prog(f.lt, 0.25, f.dur * 0.9, ease.inOutQuad);
    const my = lerp(150, 560, drop), mx = 960;
    OPS.stroke(gl, [[mx, 160], [mx, my - 100]], { color: 'dim', alpha: 0.7, width: 1.4, dash: [3, 9] });
    lmPoints(lmScreen(), this.moon, { size: 1.7, gain: 0.7, color: 'hot', twinkle: 0.4, t: f.t, model: { pos: [mx, my, 0] } });
    lmEnd(g);
    MV.focus(mx, my, 'moon');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['scene', '12'], ['house', 'DARK']] }));
    return {};
  },
});
