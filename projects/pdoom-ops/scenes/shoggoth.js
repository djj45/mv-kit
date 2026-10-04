// shoggoth — "See through the shoggoth's lies, with your shinigami eyes": a breathing gauss blob
// with far too many eyes, none blinking together. The insert goes into the main eye.
MV.scene('shoggoth', {
  init() {
    this.blob = LG.gauss(3200, [430, 300, 300], { seed: 6 });
    const rnd = mulberry32(16);
    this.eyes = [];
    for (let i = 0; i < 11; i++) {
      const a = rnd() * TAU, r = 0.3 + rnd() * 0.62;
      this.eyes.push({ x: W / 2 + Math.cos(a) * r * 600, y: H / 2 + Math.sin(a) * r * 250 + 40, s: 16 + rnd() * 26, ph: rnd() * 9, sp: 0.5 + rnd() });
    }
    this.eyes.sort((a, b) => a.y - b.y);
  },
  render(g, f) {
    lmBegin('rose');
    const cam = lmOrbit({ yaw: Math.sin(f.t * 0.13) * 0.16, pitch: 0.1 + Math.sin(f.t * 0.09) * 0.05, dist: 1450, shift: [0, -20] });
    lmPoints(cam, this.blob, { size: 1.7, gain: 0.5, twinkle: 0.35, t: f.t, drift: 26, fog: 20 });
    // deep inner glow: a second, denser core
    lmPoints(cam, this.blob, { size: 2.6, gain: 0.16, color: 'hot', count: 900, fog: 14 });
    const gl = lmGlow();
    for (const e of this.eyes) {
      const blink = hash(Math.floor(f.t * e.sp) + Math.floor(e.ph * 97), 3) < 0.14 ? 0.12 : 1;   // each on its own clock
      const ex = e.x + Math.sin(f.t * 0.4 + e.ph) * 14, ey = e.y + Math.cos(f.t * 0.33 + e.ph) * 10;
      const s = e.s, open = blink;
      gl.save(); gl.translate(ex, ey); gl.scale(1, open);
      gl.strokeStyle = lmCss('fg', 0.9); gl.lineWidth = 2;
      gl.beginPath(); gl.moveTo(-s * 1.9, 0); gl.quadraticCurveTo(0, -s * 1.15, s * 1.9, 0); gl.stroke();
      gl.beginPath(); gl.moveTo(-s * 1.9, 0); gl.quadraticCurveTo(0, s * 1.15, s * 1.9, 0); gl.stroke();
      if (open > 0.5) {
        gl.strokeStyle = lmCss('accent', 0.95); glow(gl, lmCss('accent', 0.6), 14);
        gl.beginPath(); gl.arc(0, 0, s * 0.62, 0, TAU); gl.stroke();
        gl.shadowBlur = 0;
        gl.fillStyle = lmCss('hot', 0.95);
        gl.beginPath(); gl.arc(0, 0, s * 0.2, 0, TAU); gl.fill();
      }
      gl.restore();
    }
    lmEnd(g, { bloom: 1.0 });
    const main = this.eyes[Math.floor(this.eyes.length / 2)];
    MV.focus(main.x, main.y, 'main eye');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['forms', '11 / 11'], ['gaze', 'EVERYWHERE']] }));
    return {};
  },
});
