// morph — ember palette, the continuous "no cut" transition. A word made of 24 000 points breaks into a small
// galaxy on the first line and reassembles into another word on the second; a counter rolls up as it scatters.
// Centred subtitle at the bottom.
MV.scene('morph', {
  init(MV) {
    const n = 24000;
    this.a = LG.text('名字', { n, weight: 500, seed: 1 }).map(v => v * 1.9);
    const disk = LG.galaxy(n, { r: 2.1, arms: 2, twist: 4.2, spread: 0.4, thick: 0.06, core: 0.12, seed: 2 });
    this.b = new Float32Array(n * 3);                                 // the stardust: a galaxy tilted toward us
    for (let i = 0; i < n; i++) this.b.set(lmXf({ rot: [1.1, 0, 0.25] }, [disk[i * 3], disk[i * 3 + 1], disk[i * 3 + 2]]), i * 3);
    this.c = LG.text('你', { n, weight: 500, seed: 3 }).map(v => v * 2.4);
    this.tmp = new Float32Array(n * 3);
    this.l1 = MV.lyrics.get('把名字'); this.l2 = MV.lyrics.get('再拼回你');
    this.stars = LG.stars(1800, 30, { seed: 31 });
  },
  render(g, f) {
    const t = f.t, cam = lmOrbit({ yaw: Math.sin(f.lt * 0.4) * 0.25, pitch: 0.06, dist: 6.2, fov: 36 });
    const k1 = prog(t, this.l1.start + 0.2, this.l1.end + 0.3), k2 = prog(t, this.l2.start, this.l2.end + 0.2);
    const P = k2 > 0 ? lmMorph(this.b, this.c, k2, { stagger: 0.55, swirl: 0.5, seed: 5, out: this.tmp })
                     : lmMorph(this.a, this.b, k1, { stagger: 0.6, swirl: 0.9, seed: 4, out: this.tmp });
    lmBegin('ember');
    lmPoints(cam, this.stars, { size: 1, gain: 0.35, twinkle: 0.5, t });
    lmPoints(cam, P, { size: 1.25, gain: 0.55, dof: 10, drift: 0.015 * (1 - Math.abs(k1 - k2)), t, color: 'fg' });
    lmPoints(cam, P, { size: 1.6, gain: 0.9, count: 900, color: 'accent', dof: 10 });   // a few amber sparks
    lmEnd(g);
    const cnt = Math.round(lerp(2, 24000, ease.inOutCubic(k1)));
    const top = lmFlick(t, this.l1.start, 0.3);
    lmBig(g, lmFmt(cnt), W / 2, 150, { size: 64, track: 0.08, weight: 300, font: LM_SANS, alpha: top, glow: 18 });
    lmTag(g, 'FRAGMENTS · 碎片', W / 2, 205, { alpha: top * 0.9 });
    lmCaption(g, f, { since: f.from - 0.5 });
  },
});
