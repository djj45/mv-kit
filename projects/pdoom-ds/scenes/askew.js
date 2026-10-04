// askew — 39 (120.76–124.52) · rose · paid for by "RLHF goes askew".
// Three instruments disagree in one frame: the shoggoth drifts one way, the aperture (MX.eye, the film's only
// face) is drawn twice with two different rolls so the ring never closes, and the reward curve climbs while the
// target it is supposed to be following stays flat and tilts the other way. The camera itself rolls as the shot
// goes on, so the world is askew and only the read-outs stay straight. The pupil is the one thing at full gain,
// and it contracts on the kick while everything else jumps.
MV.scene('askew', {
  init() {
    this.blob = MX.shoggoth(7000, 2.8, { seed: 91 });
    this.eye = MX.eye(1.18, { n: 3200, pupil: 1700 });
    // the reward curve, sampled once and tilted in screen space: it is not level, and that is the point
    const tilt = -0.085, ct = Math.cos(tilt), st = Math.sin(tilt), CX = W / 2, CY = H * 0.68;
    const rot = (x, y) => [CX + (x - CX) * ct - (y - CY) * st, CY + (x - CX) * st + (y - CY) * ct];
    const mk = (fn, n) => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), p = rot(200 + u * 1520, CY - fn(u) * 250);
        pts.push([p[0], p[1]]);
      }
      return pts;
    };
    this.curve = mk(u => clamp(0.1 + 0.74 * Math.pow(u, 1.4) + 0.035 * noise1(u * 9, 3)), 150);
    this.target = mk(u => 0.3 + 0.05 * u, 150);          // what it was supposed to follow: flat, tilted against
    this.dust = LG.ball(2200, 9, { seed: 152 });
    this.logs = [
      'reward model: 0.31 → 0.72',
      'kl to reference: 4.90 (cap 0.05)',
      'clamp: off · preference data: synthetic',
      'reward ↑ · capability ↓ · both real',
    ];
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const bIn = (n) => clamp(d.beat - (d.audio.beatAt(d.from) + n));   // entrance n beats after the cut
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - d.audio.beatAt(d.from));
    const up = bIn(0);                                    // the blob arrives with the cut
    const eyeIn = ease.outExpo(bIn(1));                   // the aperture opens on the first beat
    const kc = clamp((beats - 1.4) / (span - 1.6));        // the curve draws itself, beat by beat
    const skew = clamp(lt / d.dur);
    const rp = Math.min(4.2, 0.4 * d.kick + 0.2 * d.snare);   // the reward jumps on the hit
    const ci = Math.round(kc * (this.curve.length - 1));
    const live = this.curve[ci];

    const cam = dsCam(d, {
      yaw: 0.3 + lt * 0.05 + Math.sin(lt * 0.25) * 0.1, pitch: 0.06 + 0.02 * Math.sin(lt * 0.6), roll: 0.05 + skew * 0.07 + lt * 0.01,
      dist: lerp(8.6, 6.9, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.04, seed: 51,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.17, size: 1.05, dof: 34, count: 1000 }),
      // the shoggoth: one flat rose, drifting, disagreeing with everything
      { P: this.blob.P, o: { size: 1.5, gain: 0.32 * up, color: 'accent', dof: 20, focus: 7.6, drift: 0.16, t: d.t, twinkle: 0.45, model: { rot: [0, lt * 0.08, 0.16 + 0.05 * Math.sin(lt * 0.9)], pos: [-2.3, 0.5, -1.2] } } },
      // the aperture, drawn twice at two rolls: the ring never closes
      { P: this.eye.iris, o: { size: 1.3, gain: 0.5 * eyeIn, color: 'accent', dof: 8, focus: 7.6, model: { rot: [0.52, -0.34, lt * 0.09], pos: [0.5, 0.6, 0] } } },
      { P: this.eye.iris, o: { size: 1.15, gain: 0.34 * eyeIn, color: 'warn', dof: 10, focus: 7.6, model: { rot: [0.52, -0.34, 0.22 - lt * 0.07], scale: 0.93, pos: [0.5, 0.6, 0] } } },
      { S: this.eye.lid, o: { width: 1, gain: 0.3 * eyeIn, color: 'dim', glow: 0.2, model: { rot: [0.52, -0.34, -0.3], pos: [0.5, 0.6, 0] } } },
      // the one thing at full gain, and it is shrinking on the hit
      { P: this.eye.pupil, o: { size: 1.6, gain: 1.0 * eyeIn, color: 'hot', dof: 6, focus: 7.6, model: { rot: [0.52, -0.34, 0.1], scale: 1.05 - 0.16 * d.kick, pos: [0.5, 0.6, 0] } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.6 + d.kick * 0.25, exposure: 0.86, ca: 0.6 + d.kick * 0.4, radius: 0.52 } });

    // the two curves: what it optimises, and what it was told to follow
    g.save();
    const draw = (pts, o) => {
      if (ci < 1) return;
      g.strokeStyle = dsTone(d, o.color, o.alpha); g.lineWidth = o.w; g.setLineDash(o.dash || []);
      g.beginPath();
      for (let i = 0; i <= ci; i++) { const p = pts[i]; i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
      g.stroke(); g.setLineDash([]);
    };
    draw(this.target, { color: 'dim', alpha: 0.75, w: 1 });               // the target: flat, ignored
    draw(this.curve, { color: kc > 0.5 ? 'warn' : 'accent', alpha: 0.9, w: 1.6 });
    g.restore();
    if (kc > 0.02) {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = dsTone(d, kc > 0.5 ? 'warn' : 'accent', 0.85);
      g.beginPath(); g.arc(live[0], live[1], 3.4 + 1.6 * d.kick, 0, TAU); g.fill();
      g.restore();
      TL.stamp(g, d, 'REWARD', live[0] + 14, live[1] - 16, { color: kc > 0.5 ? 'warn' : 'accent', size: 13 });
      g.save(); g.strokeStyle = dsTone(d, 'dim', 0.5); g.lineWidth = 1;
      g.beginPath(); g.moveTo(live[0], live[1]); g.lineTo(live[0], 700); g.stroke(); g.restore();
    }
    TL.stamp(g, d, 'TARGET KL 0.05', 1700, 740, { color: 'dim', size: 12, align: 'right' });

    dsTele(g, d, {
      id: 'c39', name: 'askew',
      rows: [
        ['reward', (0.31 + 0.44 * kc + rp * 0.04).toFixed(3)],
        ['kl to ref', (4.9 + rp).toFixed(2)],
        ['clamp', 'OFF'],
        ['pupil', (1.05 - 0.16 * d.kick).toFixed(2)],
        ['verdict', kc > 0.45 ? 'DISAGREE' : 'measuring'],
      ],
      foot: 'rlhf · reward model unwell',
    });
    TL.log(g, d, this.logs, { x: 110, y: H - 340, size: 15, rows: 4, every: 0.5, t0: f.from + 0.3 });

    dsTick(g, d, { x: W - 150, y: H - 70, label: 'KL', rate: 137, alpha: 0.5 });

    // the plate gives this line 'scatter' — RLHF goes askew, and the sentence goes askew with it.
    LY.draw(g, d, { mode: 'plate', size: 54, y: H - 158 });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.13, period: 1.9 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.7 + d.kick, 53), vignette: 0.26, grain: 0.04 }, dsLifePost(d, { amount: 1.4 })));
  },
});
