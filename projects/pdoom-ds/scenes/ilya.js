// ilya — shot 43, 02:12.5–02:17.4, ice. "What did Ilya see? We'll never know" (line 44) is already half sung
// when the cut lands on the beat before "Ilya", so the recursion opens underneath the words.
//
// The aperture opens fully and inside it there is another aperture, and inside that another: six irises
// (MX.eye), each 0.65 of the size of the one outside it, set 0.9 world units further back along the camera's
// own axis (so they stay exactly concentric while perspective shrinks them a second time) and drawn between 0.62
// and 0.10 of its gain. At the end of the recursion there is one point of light and nothing else: the film does
// not answer the question. This is the most restrained frame in the last third, which is not the same as a still one:
// measured on the first cut it changed by 0.33 of luma a frame with 91 % of its frames under 0.25 — a held
// still, not a quiet shot. Each aperture now arrives on its own beat, overshoots and settles, then recedes; a
// bar-long ripple of ±34 % of the radius travels inward through the six of them so no two are ever at the same
// radius at once; a wave of brightness follows the same path a little behind it; the rings turn slowly,
// alternating direction, so the speckle of the recursion is never twice the same; a second radial frequency and
// the low end keep the recursion from stalling at the ripple's peaks; and the camera drifts across the frame
// while it creeps in, with a pan that takes the recursion off-centre and back. Now 1.02 a frame, 5 % still.

// The outer lip of an aperture's iris: MX.eye's annulus is broad, and six broad annuli nest into one filled
// disk. Keeping a narrow band of each one — and fewer points the smaller it gets — leaves six rings with dark
// gaps between them, each one dimmer than the last: what "inside it there is another aperture" has to look like.
function D_lip(P, lo, hi) {
  const out = [];
  for (let i = 0; i < P.length; i += 3) {
    const rho = Math.hypot(P[i], P[i + 1]);
    if (rho >= lo && rho <= hi) out.push(P[i], P[i + 1], P[i + 2]);
  }
  return new Float32Array(out);
}

// LY's modes draw a line the moment the line starts; this hands them a line that stops at the word being sung,
// so no word is in the frame before its own `start` (the film's one lyric rule). It is also what makes the
// treatment visible: the question is written into the recursion one word at a time instead of appearing at once.
function ILY_sung(line, t) {
  if (!line) return null;
  const words = [];
  for (const w of line.words) if (w.start <= t) words.push(w);
  if (!words.length) return null;
  return { start: line.start, end: words[words.length - 1].end, text: words.map(w => w.w).join(' '), words };
}

MV.scene('ilya', {
  init(MV) {
    // The shot's first frame is a beat (timeline.js cuts on beatBefore("Ilya")), so counting beats from the cut
    // puts every entrance on the grid without naming a single second.
    const e = (MV.entries || []).find(x => x.scene === 'ilya');
    this.b0 = e && MV.audio ? Math.floor(MV.audio.beatAt(e.from + 0.02)) : null;

    // r, points, gain: the same aperture six times, each smaller, sparser and dimmer than the one outside it.
    // The point counts are the shot's motion budget as much as its look: this is the darkest frame in the film
    // (mean luma 3.6), so the only way its movement can be seen is to have enough of it lit to move
    const R = [1.20, 0.78, 0.507, 0.330, 0.214, 0.139];
    const N = [7200, 2600, 1100, 460, 200, 90];
    const G = [1.00, 0.62, 0.42, 0.28, 0.20, 0.10];
    this.levels = R.map((r, j) => ({
      lip: D_lip(MX.eye(r, { n: N[j], pupil: 1 }).iris, r * 0.76, r * 0.99),
      d: j * 0.9, gain: G[j], at: j === 0 ? 0 : 1.0 + (j - 1) * 0.75,
      lag: j * 0.13,                                  // the ripple and the wave reach level j this much later
      spin: (j % 2 ? 1 : -1) * (0.22 + 0.06 * j),    // rings turning, the even ones against the odd ones
    }));
    // the blades: a tight ring of ticks just outside the iris, so "the aperture opens" happens to the frame
    // instead of being a number going up. They retract outward and keep a last slow tick after that.
    const bl = [];
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU, r0 = 1.02 * 1.20, r1 = 1.13 * 1.20 + hash(k, 5) * 0.05 * 1.20;
      bl.push([[Math.cos(a) * r0, Math.sin(a) * r0, 0], [Math.cos(a) * r1, Math.sin(a) * r1, 0]]);
    }
    this.blades = LG.pairs(bl, { bright: 0.45 });
    // the point at the end of the recursion (LG.disk lies in xz, so it is turned to face the camera once here)
    this.pin = dsXf(LG.disk(170, 0.045), { rot: [Math.PI / 2, 0, 0] });
    this.rain = MX.rain(800, { w: 8, spread: 11, h: 7, len: 0.45, seed: 47 });
    this.dust = LG.ball(1500, 6.5, { seed: 12 });
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');
    d.g = g;
    const lt = d.lt;
    const b = this.b0 == null ? lt * (d.audio.bpm / 60) : d.beat - this.b0;   // beats since the cut
    const open = prog(b, 0, 1.05, ease.outCubic);        // the outer aperture opens on the first beat
    // one wave of light per bar, travelling inward: level j sees it A.lag of a bar after level j-1
    const wave = (A) => ((d.barPhase - A.lag) % 1 + 1) % 1;
    const dil = 1 + d.kick * 0.04;                       // the pupil answers the kick, barely
    // the light layer breathes with the low end — the instrument is on, and it never sits perfectly still
    const breath = 1 + 0.35 * d.low + 0.10 * d.kick;
    // the whole recursion throbs with the low end — the same heartbeat the pupil keeps, one order bigger
    const throb = (1 + 0.09 * d.low + 0.05 * d.kick)
      // two radial frequencies, not one: a single sine stalls at both of its peaks, and a shot that stalls twice
      // a bar is the freeze this shot was measured to be
      * (1 + 0.14 * Math.sin(TAU * 0.23 * lt + 1.1) + 0.03 * noise1(lt * 0.45, 9));
    // the camera drifts across the frame while it creeps in — two incommensurate frequencies (0.12 and 0.26 Hz,
    // ~4 px a frame at the peak) so the pan never stops to turn around, which a single sine does twice a cycle.
    // The 120 px bias to the left keeps the ring out of the telemetry column at its largest.
    const sway = 190 * Math.sin(TAU * 0.12 * lt) + 70 * Math.sin(TAU * 0.26 * lt + 1.7) + 55 * noise1(lt * 0.12, 5);

    const cam = dsCam(d, {
      yaw: 0.05 + Math.sin(lt * 0.21) * 0.02 + lt * 0.005, pitch: 0.03,
      dist: 6.6 - 0.075 * lt, fov: 34, shift: [sway - 120, -110 + sway * 0.25], punch: 0.02, seed: 41,
    });
    // every level is placed along the camera's own axis, so the recursion stays concentric while it recedes
    const el = Math.hypot(cam.eye[0], cam.eye[1], cam.eye[2]);
    const ax = [-cam.eye[0] / el, -cam.eye[1] / el, -cam.eye[2] / el];
    const along = (k) => [ax[0] * k, ax[1] * k, ax[2] * k];

    const list = [
      dsAir(d, this.dust, { gain: 0.15 * breath, size: 1.05, dof: 30, count: 900 }),
      // token rain thinned to a drift but not to nothing, outside the aperture: the film's last falling data,
      // still falling faster than the aperture breathes
      { S: this.rain, o: { width: 1, gain: 0.38 * breath, color: 'dim', glow: 0.1, fog: 34, model: { pos: [0, -0.75 * lt, 0] } } },
    ];
    for (let j = 0; j < this.levels.length; j++) {
      const A = this.levels[j];
      const ap = prog(b, A.at, A.at + 0.65, ease.outBack);   // one new aperture per beat: in, overshoot, settle
      if (ap <= 0.001) continue;
      const u = wave(A);
      const fire = Math.max(0, 1 - Math.abs(u - 0.15) / 0.45);           // the brightness wave behind the ripple
      // and the ring itself riding it inward: ±34 % of its radius, about 11 px a frame at the outer aperture's
      // peak — the largest thing moving in the frame, and what "arriving or receding" looks like from inside
      const ripple = 0.34 * Math.sin(TAU * u);
      // after it has arrived an aperture keeps receding, slowly, for the rest of the shot
      const recede = j === 0 ? 0 : 0.06 * clamp((b - A.at) / 8);
      const model = {
        pos: along(A.d), rot: [0, 0, A.spin * lt + j * 0.3 * ap],
        scale: (j === 0 ? 0.38 + 0.48 * open : 0.50 + 0.41 * ap) * (1 + ripple) * throb * (1 - recede),
      };
      list.push({
        P: A.lip,
        o: {
          size: 1.35, gain: A.gain * ap * breath * (0.5 + 0.9 * fire), color: j === 0 ? 'accent' : 'dim',
          dof: 4.5, focus: 6.6, twinkle: 0.35, t: d.t, drift: 0.015, model,
        },
      });
      if (j === 0) {
        list.push({ S: this.blades, o: { width: 1, gain: 0.34 * (1.25 - 0.8 * open) * breath, color: 'dim', glow: 0.25, model: { scale: 1 + 0.2 * open, rot: [0, 0, lt * 0.03] } } });
      }
    }
    // the centre: small, dense, pulsing on the low end, and the only thing the recursion resolves to
    list.push({ P: this.pin, o: { size: 1.3, gain: 0.4 * dil * breath * (0.8 + 0.5 * d.low), color: 'hot', dof: 2, focus: 6.6, model: { pos: along(5.4) } } });
    dsLight(d, list, { cam, end: { bloom: 0.58 + d.kick * 0.06, exposure: 0.82 * (1 + 0.06 * d.low), ca: 0.45, radius: 0.5 } });

    // ---- the house activity layer: the air in front of the lens is never empty either
    dsLife(g, d, { gain: 1.0, dust: 120 });

    // ---- the instrument panel: the depth of the recursion, and no answer to the question being sung
    dsTele(g, d, { id: 'c43', name: 'ilya', rows: null, foot: 'aperture · six levels · nothing behind them' });
    TL.block(g, d, [
      ['aperture', open > 0.999 ? 'OPEN' : 'OPENING'],
      ['depth', this.levels.length + ' levels'],
      ['ratio', '0.65 ^ n'],
      ['answer', '—'],
    ], { x: W - 520, y: 168, hot: [0] });

    // The plate gives this line 'columnstack' — the question stacked and unanswered, each line dropping in.
    // What the plate's mode cannot know is the film's other lyric rule: LY draws a whole line the moment it
    // starts, so the shot hands it a line that stops at the word being sung. The words are written into the
    // recursion one at a time instead of the whole question arriving with 'What'.
    LY.draw(g, d, { mode: 'plate', line: ILY_sung(d.line, d.t), size: 40, x: W - 150, y: H - 190, rows: 1, alpha: 0.95 });

    return dsFin(d, Object.assign({ shake: dsShake(d, 0.35 + d.kick * 0.25), vignette: 0.24 }, dsLifePost(d, { amount: 1.6 })));
  },
});
