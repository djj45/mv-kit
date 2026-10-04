// cover — the video's thumbnail, drawn by the film's own code. This is a real scene so it renders through the
// same pipeline as the film (same light, same type, same camera grammar), which is the point: the cover is not
// a frame grabbed from the video, it is the film's world at its most legible.
//
// Two things had to be true, because a cover is seen at 320 px wide before it is seen at all:
//   · the shape has to read in a third of a second — a torch lifting out of the dark with P(DOOM) inside it
//   · the type has to survive being shrunk — three lines only, huge, high contrast, nothing small
MV.scene('cover', {
  init() {
    const N = 62000;
    this.doom = dsTextPoints('P(DOOM)', N, { scale: 1.0, weight: 300, font: dsSans(200, 300) });
    // measure the word so the torch flame can be built around it
    let w = 0, h = 0;
    for (let i = 0; i < N; i++) { w = Math.max(w, Math.abs(this.doom[i * 3])); h = Math.max(h, Math.abs(this.doom[i * 3 + 1])); }
    this.wordW = w; this.wordH = h;
    this.torch = MX.core(1.15, { n: 9000, halo: 7000, rays: 30 });
    this.dust = LG.ball(2600, 6.0, { seed: 5 });
    this.ring = dsRing(2600, 1.0, { seed: 21, thick: 0.02 });
    this.eye = MX.eye(1.25, { n: 5200, pupil: 2600 });      // the film's only face, behind the flame
    this.stars = LG.stars(1400, 26, { seed: 8 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');
    d.g = g;
    const t = d.t;
    const inA = dsIn(d, 0, 1.2, ease.outCubic);
    const lift = ease.outCubic(clamp(t / 2.4));                       // the flame rising out of the dark
    const flare = 0.55 + 0.45 * Math.sin(t * 1.1) + d.kick * 0.2;

    // the light: a torch behind the word, an aperture behind that, dust in front
    const cam = dsCam(d, { yaw: 0.02 + Math.sin(t * 0.13) * 0.05, pitch: 0.03, dist: lerp(9.6, 6.4, lift), fov: 34, punch: 0.01, seed: 3 });
    const list = [
      dsAir(d, this.dust, { gain: 0.3, size: 1.2, dof: 30, drift: 0.1, t, twinkle: 0.7 }),
      { P: this.stars, o: { size: 1.0, gain: 0.22, color: 'dim', twinkle: 0.8, t } },
      // the aperture: the thing that has been looking at us for two and a half minutes
      { P: this.eye.iris, o: { size: 1.25, gain: 0.5 * inA, color: 'accent', dof: 14, model: { rot: [0.42, -0.3, 0], scale: 3.4 } } },
      { P: this.eye.pupil, o: { size: 1.4, gain: 0.3 * inA, color: 'fg', dof: 14, model: { rot: [0.42, -0.3, 0], scale: 3.4 } } },
      // the torch: the core of the film, opened up
      { P: this.torch.nucleus, o: { size: 1.7 * flare, gain: 0.55 * inA, color: 'hot', dof: 6 } },
      { P: this.torch.halo, o: { size: 1.3, gain: 0.2 * inA, color: 'accent', dof: 26, drift: 0.2, t, count: 5200 } },
      { S: this.torch.rays, o: { width: 1.3, gain: 0.3 * inA * flare, color: 'hot', glow: 0.7, dof: 16, model: { rot: [t * 0.06, t * 0.05, 0] } } },
      { P: this.ring, o: { size: 1.5, gain: 0.35 * inA, color: 'hot', dof: 18, model: { rot: [0.5, 0.1, 0.15], scale: 1.5 + Math.sin(t * 0.6) * 0.05 } } },
      // the word, on the flame
      { P: this.doom, o: { size: 1.9, gain: 0.95 * inA, color: 'hot', dof: 7, focus: 6.4, model: { pos: [0, 0.1, 0], scale: 1 + d.kick * 0.012 } } },
      { P: this.doom, o: { size: 1.5, gain: 0.4 * inA, color: 'fg', dof: 5, focus: 6.4, model: { pos: [0, 0.1, 0.02] } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.95, exposure: 0.88, ca: 0.4, radius: 0.55, lens: 0.4 } });
    dsLife(g, d, { gain: 1.0, dust: 80 });

    // ---- the title block: three lines, nothing else. This is what has to survive 320 px.
    const titleY = H * 0.185;
    dsLine(g, 'A G I', W / 2, titleY, { font: dsSans(150, 100), size: 150, track: 40, color: dsTone(d, 'fg', 0.97), glow: 30, alpha: inA });
    dsLine(g, '· P ( D O O M ) ·', W / 2, titleY + 92, { font: dsMono(30, 400), size: 30, track: 16, color: dsTone(d, 'fg', 0.86), glow: 14, alpha: inA });
    // the film's own line, printed as the credit it is
    dsLine(g, 'EVERY FRAME DRAWN BY CODE', W / 2, H * 0.875, { font: dsMono(26, 400), size: 26, track: 9, color: dsTone(d, 'dim', 0.95), glow: 0, alpha: inA });
    // a hairline rule under the title, drawn on
    const rw = prog(t, 0.5, 1.5, ease.outCubic) * W * 0.42;
    g.save();
    g.strokeStyle = dsTone(d, 'accent', 0.7 * inA); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(W / 2 - rw / 2, titleY + 132); g.lineTo(W / 2 + rw / 2, titleY + 132); g.stroke();
    g.restore();

    return dsFin(d, { shake: dsShake(d, 0.8), vignette: 0.42, grain: 0.03 });
  },
});
