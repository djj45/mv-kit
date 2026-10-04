// prompt_plea — 89.28–95.47, rose, the first shot of act III. "Gato, please don't let me go": the aperture again,
// huge, throwing a ring across the whole frame, with one small dense cloud in the middle of the pupil — the thing
// that is asking. One thing at full gain: the iris.
//
// It used to be the quietest shot in the film and it read as a freeze (0.15 of frame-to-frame change — the worst
// shot in the cut). It is still the quiet shot, but it is never still now, and every movement belongs to an
// aperture rather than to a filter: the rim carries two comets running round it in opposite directions (blades
// moving), a brightness wave leaves the pupil once a bar, the pupil's cloud turns, the camera dollies in the whole
// time (not just at the start), and at the word "let" the shot is CUT — hard reframing, wide aperture → the pupil
// filling the frame — so the 6.2 s is two shots and the plea itself pays for the second one.
MV.scene('prompt_plea', {
  init() {
    this.eye = MX.eye(5.3, { n: 5200, pupil: 1400, lids: 18 });
    // The aperture has to read as an aperture and not as a ball: a crisp outer rim, a sparse iris, a thin ring where
    // the pupil ends, and a small dense centre. All four are the same shape at different radii, which is the motif.
    // LG.ring builds in the xz plane; MX.eye pre-rotates its own rings into the xy plane (facing the camera), so
    // these two have to be rotated the same way or they come out edge-on and the aperture reads as a flat line.
    const face = { rot: [Math.PI / 2, 0, 0] };
    this.rim = dsXf(LG.ring(4200, { r: 4.86, width: 0.09, thick: 0.02, seed: 86 }), face);
    this.pupilRing = dsXf(LG.ring(2600, { r: 2.52, width: 0.07, thick: 0.02, seed: 87 }), face);
    // two arcs of the rim, drawn again and hot: they spin about the aperture's own axis (model rot z), which is what
    // makes a ring of points read as a mechanism and not as a circle. Opposite directions, one long, one short.
    const arc = (a0, a1, n, r, seed) => {
      const P = new Float32Array(n * 3), rnd = mulberry32(seed);
      for (let i = 0; i < n; i++) {
        const a = lerp(a0, a1, i / (n - 1)), rr = r * (1 + (rnd() - 0.5) * 0.012);
        P[i * 3] = Math.cos(a) * rr; P[i * 3 + 1] = Math.sin(a) * rr; P[i * 3 + 2] = (rnd() - 0.5) * 0.03;
      }
      return P;
    };
    this.cometA = arc(0, 0.62, 900, 4.86, 101);
    this.cometB = arc(0, 0.22, 420, 2.52, 102);
    this.mind = LG.gauss(3000, 0.34, { seed: 83 });
    this.skin = LG.sphere(1400, 0.5, { jitter: 0.06, seed: 84 });
    this.spark = new Float32Array(3);
    this.air = LG.ball(900, 11.5, { seed: 85 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 1.1, ease.outCubic) * dsOut(d, 0.6);
    const breath = 1 + 0.006 * d.low + 0.008 * d.kick;        // the machine breathing under everything else

    // ---- the internal cut. "Gato, please" is sung at 89.28; the plea proper ("don't let me go") starts at 92.46
    // and the downbeat under it is 92.97. That is the cut: the aperture stops being a wide object with something
    // small inside it and becomes the inside. Beat-locked (the first downbeat after the word), not a wall clock.
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('let') === 0) wi = i;
    const plea = wi >= 0 ? ws[wi].start : f.from + d.dur * 0.6;
    const cutT = d.audio.downbeatBefore(plea + 0.9);
    const seg2 = t >= cutT ? 1 : 0;

    // two brightness waves leave the pupil per bar and die at the rim: the aperture is working, slowly
    const waveK = (d.barPhase * 2) % 1;
    const cam = dsCam(d, {
      yaw: 0.06 + d.lt * 0.006, pitch: 0.055,
      dist: seg2 ? lerp(7.6, 6.4, clamp((d.lt - (cutT - f.from)) / Math.max(0.01, d.to - cutT)))
                 : lerp(12.6, 10.4, clamp(d.lt / d.dur)),        // the aperture is opening the whole time
      fov: seg2 ? 30 : 32, shift: seg2 ? [120, 40] : [215, -30], punch: 0.006 + seg2 * 0.02, seed: 59,
    });
    const spin = d.lt * 0.72;
    dsLight(d, [
      dsAir(d, this.air, { gain: 0.12 * a, size: 1.05, dof: 32, drift: 0.05, t }),
      // the aperture: MX.eye is built already facing the camera, so no extra rotation here
      { P: this.eye.iris, o: { size: 1.15, gain: 0.5 * a, color: 'accent', dof: 9, focus: 11.4, drift: 0.02, twinkle: 0.3, t, model: { scale: breath } } },
      { S: this.eye.lid, o: { width: 1, gain: 0.3 * a, color: 'dim', glow: 0.2, model: { scale: breath, rot: [0, 0, spin * 0.5] } } },
      // a second ring, half a wave behind the first, so the pupil is always pushing something outward
      { P: this.pupilRing, o: { size: 1.2, gain: (0.3 + 0.7 * (1 - ((waveK + 0.5) % 1))) * a, color: 'accent', dof: 9, focus: 11.4, model: { scale: breath * (1 + ((waveK + 0.5) % 1) * 0.5) } } },
      { P: this.eye.pupil, o: { size: 1.15, gain: 0.3 * a, color: 'hot', dof: 10, focus: 11.4, twinkle: 0.25, t, model: { scale: breath } } },
      // the brightness wave: the pupil ring pushed outward once a bar, bright while it is young
      { P: this.pupilRing, o: { size: 1.25, gain: (0.35 + 0.75 * (1 - waveK)) * a, color: 'hot', dof: 8, focus: 11.4, model: { scale: breath * (1 + waveK * 0.5) } } },
      // the rim: the shot's only full-gain object, and the thing that makes the ring read as an aperture
      { P: this.rim, o: { size: 1.4, gain: 1.0 * a, color: 'fg', dof: 7, focus: 11.4, model: { scale: breath, rot: [0, 0, -spin * 0.35] } } },
      // and the two comets running round it in opposite directions: the blades of the aperture, always turning
      { P: this.cometA, o: { size: 1.5, gain: 0.85 * a, color: 'hot', dof: 7, focus: 11.4, model: { scale: breath, rot: [0, 0, spin] } } },
      { P: this.cometB, o: { size: 1.35, gain: 0.7 * a, color: 'accent', dof: 8, focus: 11.4, model: { scale: breath, rot: [0, 0, -spin * 1.5] } } },
      // what is inside the pupil: the thing that is asking — and it turns, slowly, the whole time
      { P: this.skin, o: { size: 1.1, gain: 0.28 * a, color: 'accent', dof: 8, focus: 11.4, drift: 0.02, t, model: { scale: breath, rot: [0, d.lt * 0.3, 0] } } },
      { P: this.mind, o: { size: 1.4, gain: (0.6 + seg2 * 0.25) * a, color: 'fg', dof: 7, focus: 11.4, twinkle: 0.25, t, model: { scale: breath, rot: [0, -d.lt * 0.5, 0] } } },
      { P: this.spark, o: { size: 2.9 + d.kick * 0.9, gain: 0.9 * a, color: 'hot', dof: 6, focus: 11.4, model: { pos: [0, 0.03 * Math.sin(t * 0.7), 0] } } },
    ], { cam, end: { bloom: 0.5, exposure: 0.82, ca: 0.5, radius: 0.52 } });

    g.save();
    g.globalAlpha = a;
    dsLine(g, 'GATO', 150, 212, { font: dsSans(34, 200), size: 34, track: 14, color: dsTone(d, 'dim', 0.95), glow: 0, align: 'left' });
    TL.stamp(g, d, seg2 ? 'INSIDE THE APERTURE' : 'THE APERTURE, AGAIN', 152, 254, { size: 13, track: 3, alpha: 0.6 });
    TL.block(g, d, [
      ['session', 'gato-01'],
      ['asked', 'let me go'],
      ['answer', '—'],
      ['wave', (waveK * 100).toFixed(0) + ' %'],
    ], { x: 110, y: 330, hot: [1] });
    // the radar hairline: one line sweeping the pupil, so the aperture is *scanning* even between the bars
    const c0 = cam.project([0, 0, 0]);
    g.globalAlpha = a * 0.55;
    g.strokeStyle = dsTone(d, 'accent', 0.8); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(c0[0], c0[1]);
    g.lineTo(c0[0] + Math.cos(d.lt * 2.6) * 330, c0[1] + Math.sin(d.lt * 2.6) * 330); g.stroke();
    g.restore();

    dsTele(g, d, { id: 'c28', name: 'gato', rows: [['motion', 'slow'], ['aperture', 'r 5.3'], ['pleas', '1 of 3'], ['answer', 'none']], foot: 'the aperture, again' });
    // one line only, off the regenerated plate: 'columnstack', the quiet middle stacked and still — each row drops
    // in on its own line's start and settles, which is motion this quiet shot can afford. Pinned line; rows: 1 so
    // the next sentence (hook 3) is never pre-drawn here.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 40, x: W - 150, y: H * 0.62, rows: 1 });

    // the house activity layer: dust with parallax, one CRT line crossing the frame forever, a plea counter, and a
    // post that never settles (dsLifePost) — quiet, but the frame is live in every single one of them
    dsLife(g, d, { gain: 1.0, dust: 110 });
    dsScanSweep(g, d, { alpha: 0.055, period: 7.2 });
    dsTick(g, d, { x: 620, y: 976, label: 'T+', value: d.lt * 3.2, rate: 1 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.14 + d.kick * 0.2), vignette: 0.32 }, dsLifePost(d, { amount: 1.5 })));
  },
});
