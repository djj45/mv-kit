// agi_boot — cold open, ice palette. The machine wakes up: a single point on the first downbeat becomes a
// breathing nucleus, the word AGI decodes out of pixel noise inside it, an iris ring assembles around it, and the
// whole thing pushes toward the camera until the first sung word cuts it off. Nothing here is an image: the
// nucleus, the ring and the letters are all point clouds and hairlines.
//
// Grammar this shot sets up for the rest of the film:
//   · every entrance lands on a beat (f.a.kick / f.beatPhase), never on a wall clock
//   · the telemetry panel is always live and always in the shot's palette
//   · the lyric is never drawn by the shot: dsLyric() reads the alignment, so it cannot run early
MV.scene('agi_boot', {
  init() {
    // the word, as points, at three scales: the big centre, the small caption mark, the far ghost
    this.agi = dsTextPoints('AGI', 15000, { scale: 1.62, weight: 200, font: dsSans(200, 200) });
    this.agiSmall = dsTextPoints('AGI', 2600, { scale: 0.52, weight: 300, font: dsSans(200, 300) });
    this.core = MX.core(0.62, { n: 4200, halo: 2400, rays: 16 });
    this.iris = MX.eye(1.32, { n: 4200, pupil: 2000 });
    this.dust = LG.ball(2600, 5.5, { seed: 12 });
    this.ghosts = [];
    for (let i = 0; i < 7; i++) this.ghosts.push(dsScale(this.agi, 1 + i * 0.14, [0, 0, 0]));
    this.tmp = new Float32Array(this.agi.length);
    this.logs = [
      'POST /v1/weights ........................ 200',
      'loading shard 00041/00128  ok',
      'attention mask: causal (n_ctx 131072)',
      'kv cache 1.42 GiB · flash-3',
      'WARN  eval harness not sandboxed',
      'loss 0.0841  ppl 1.088  lr 3.0e-4',
      'checkpoint written: agi-step-000000',
      'sandbox: 0 of 1 containment active',
    ];
    // the word is not a texture: it is 15 000 points sampled from the type once, at init
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');
    d.g = g;
    const lt = d.lt, t = d.t;
    // The shot opens on the song's first downbeat: the machine's first breath, then word, then aperture.
    const wake = dsIn(d, 0.0, 0.12, ease.outExpo);              // power-on
    const born = dsIn(d, 0.1, 1.9, ease.inOutCubic);            // the nucleus gathers
    const word = dsIn(d, 1.6, 2.2, ease.inOutCubic);            // AGI decodes
    const ring = dsIn(d, 3.1, 2.1, ease.inOutCubic);            // the iris assembles
    const push = ease.inOutQuad(clamp(lt / Math.max(0.01, d.dur)));
    const breath = 1 + 0.06 * Math.sin(t * 1.9) + d.kick * 0.16 + d.low * 0.08;

    // ---- light
    const P = lmMorph(this.core.nucleus, this.agi, word, { stagger: 0.62, swirl: 0.55, seed: 6, out: this.tmp });
    const cam = dsCam(d, {
      yaw: 0.15 + Math.sin(lt * 0.24) * 0.13, pitch: 0.06 - push * 0.05,
      dist: lerp(9.4, 5.1, ease.inOutCubic(push)), fov: 34, punch: 0.05, seed: 4,
    });
    const grow = 1 + ring * 0.35;
    const list = [];
    // far dust: the room the machine sits in
    list.push(dsAir(d, this.dust, { gain: 0.3, size: 1.05, dof: 30, count: Math.round(2600 * (0.25 + 0.75 * ring)) }));
    // the nucleus → the word
    list.push({ P, o: { size: 1.35 + d.kick * 0.4, gain: 0.34 * born, colors: null, dof: 9, focus: 5.2, drift: 0.012 * (1 - word), t, twinkle: 0.35 } });
    // a hot core inside the word so the centre of the frame is always the brightest thing
    list.push({ P: this.core.nucleus, o: { size: 1.9, gain: 0.85 * born * (1 - word * 0.6), color: 'hot', dof: 7, focus: 5.2 } });
    // the halo shell — a few hundred points on a big sphere, the "something much larger behind it"
    list.push({ P: this.core.halo, o: { size: 1.05, gain: 0.16 * born, color: 'accent', dof: 22, focus: 5.2, drift: 0.05, t, twinkle: 0.8, count: 900 } });
    list.push({ S: this.core.rays, o: { width: 1, gain: 0.22 * born * (0.5 + d.kick), color: 'hot', glow: 0.5, dof: 14 } });
    // the iris: it arrives as a ring and stays as the aperture of the film
    list.push({ P: this.iris.iris, o: { size: 1.3, gain: 0.6 * ring, color: 'accent', dof: 8, focus: 5.2, model: { rot: [Math.PI / 2, 0, 0], scale: grow } } });
    list.push({ P: this.iris.pupil, o: { size: 1.4, gain: 0.55 * ring, color: 'fg', dof: 8, focus: 5.2, model: { rot: [Math.PI / 2, 0, 0], scale: grow } } });
    list.push({ S: this.iris.lid, o: { width: 1, gain: 0.4 * ring, color: 'dim', glow: 0.3, model: { scale: grow } } });
    // ghost copies of the word, drifting back into the dark (depth without a depth map)
    for (let i = 1; i < this.ghosts.length; i++) {
      const gg = this.ghosts[i];
      list.push({ P: gg, o: { size: 1.05, gain: 0.1 * word * (1 - i / 8), color: 'dim', dof: 24, model: { pos: [0, 0, -i * 0.9], rot: [0, i * 0.06, 0] } } });
    }
    dsLight(d, list, { cam, end: { bloom: 0.55 + d.snare * 0.2, exposure: 0.82, ca: 0.45 + d.kick * 0.35, radius: 0.5 } });

    // ---- the machine talking to itself
    if (wake > 0.02) {
      g.save();
      g.globalAlpha = wake;
      TL.log(g, d, this.logs, { x: 108, y: H - 200, size: 16, rows: 5, every: 1.05, t0: f.from + 0.6, alpha: 0.9 });
      const rows = [
        ['model', 'agi-c0'],
        ['params', TL.num(TL.roll(t, 1.82e12, 8))],
        ['ctx', '131 072'],
        ['steps', TL.num(TL.roll(t, 41200, 1, 8))],
        ['loss', (0.0841 - born * 0.02 + noise1(Math.floor(t * 6) * 0.2, 5) * 0.002).toFixed(4)],
        ['containment', ring < 0.9 ? 'PARTIAL' : 'ACTIVE'],
      ];
      TL.block(g, d, rows, { x: W - 520, y: 168, hot: [4] });
      TL.matrix(g, d, W - 640, H - 420, 560, 150, { size: 13, alpha: 0.28, seed: 8, tail: 6 });
      // a hairline frame that draws itself on the wake, so the first shot already has the film's ruler
      const fr = dsIn(d, 0.0, 0.7);
      g.strokeStyle = dsTone(d, 'dim', 0.5); g.lineWidth = 1;
      g.beginPath();
      g.moveTo(44, 44 + (H - 88) * 0); g.lineTo(44, 44 + (H - 88) * fr);
      g.moveTo(W - 44, H - 44); g.lineTo(W - 44, H - 44 - (H - 88) * fr);
      g.stroke();
      g.restore();
    }

    // ---- the title only exists while the word does; it is the same points, so it never floats loose
    // the sentence sits under the cloud that is spelling AGI, so the two never overlap (the first cut had
    // the line behind the letters and it was unreadable)
    LY.draw(g, d, { mode: 'plate', y: H * 0.84, size: 62 });

    dsLife(g, d, { gain: 0.8, dust: 60 });
    dsScanSweep(g, d, { alpha: 0.06, period: 4.0 });
    return dsFin(d, {
      shake: dsShake(d, 1.1 * wake + 0.6),
      flash: Math.max(0, 0.55 * (1 - dsIn(d, 0.0, 0.22, ease.linear)) * wake),
      glitch: d.onset > 0.9 && lt < 3 ? 0.22 * d.onset : 0,
      vignette: 0.18 + 0.1 * d.low,
    });
  },
});
