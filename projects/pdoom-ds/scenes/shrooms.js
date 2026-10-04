// shrooms — "with a bag of shrooms". The sealed room comes apart into drifting spores: the same walls, but the
// box is now soft and breathing, and the glyphs have come off the wall and are floating. Rose palette, and the
// only shot in the first act where the geometry does not obey the grid.
MV.scene('shrooms', {
  init() {
    const n = 11000, rnd = mulberry32(111);
    const P = new Float32Array(n * 3);
    // spores: a thick shell, each with its own radius and phase, so they drift rather than rotate together
    this.ph = new Float32Array(n); this.rad = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, b = Math.acos(2 * rnd() - 1), r = 2.2 + rnd() * 2.6;
      P[i * 3] = Math.sin(b) * Math.cos(a) * r; P[i * 3 + 1] = Math.cos(b) * r * 0.8; P[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r;
      this.ph[i] = rnd() * TAU * 2; this.rad[i] = r;
    }
    this.spores = P;
    // the room, remembered: a soft wire box that is still there but no longer straight
    this.box = LG.wirebox([5.2, 5.2, 5.2], {});
    // a handful of big caps: the "mushroom" motif done as light only — a dome of points and a stem of hairlines
    this.caps = [];
    for (let k = 0; k < 5; k++) {
      const s = 0.4 + hash(k, 3) * 0.5;
      const dome = LG.sphere(700, s, { jitter: 0.06, seed: 120 + k });
      for (let i = 1; i < dome.length; i += 3) dome[i] = Math.abs(dome[i]) * 0.55;
      this.caps.push({ dome, pos: [(hash(k, 5) - 0.5) * 6.2, -1.8 + hash(k, 7) * 1.2, (hash(k, 9) - 0.5) * 5.0], s });
    }
    const stems = [];
    this.caps.forEach((c) => {
      for (let j = 0; j < 9; j++) {
        const a = hash(j, 11) * TAU, r = 0.06 + hash(j, 13) * 0.12;
        stems.push([[c.pos[0] + Math.cos(a) * r, c.pos[1] - c.s * 0.5, c.pos[2] + Math.sin(a) * r], [c.pos[0] + Math.cos(a) * r * 0.5, c.pos[1] - c.s * 2.1, c.pos[2] + Math.sin(a) * r * 0.5]]);
      }
    });
    this.stems = LG.pairs(stems, { bright: 0.4 });
    this.dust = LG.ball(1200, 6, { seed: 112 });
    this.tmp = new Float32Array(n * 3);
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const inA = dsIn(d, 0, 0.8, ease.outCubic);
    const outA = dsOut(d, 0.25);
    // slow drift: each spore orbits its own axis at its own rate — a function of t, never a sim
    const P = this.tmp;
    for (let i = 0; i < this.spores.length; i += 3) {
      const j = i / 3, ph = this.ph[j];
      const dx = Math.sin(d.t * 0.6 + ph) * 0.34, dy = Math.cos(d.t * 0.44 + ph * 1.3) * 0.3, dz = Math.sin(d.t * 0.52 + ph * 0.7) * 0.34;
      P[i] = this.spores[i] + dx; P[i + 1] = this.spores[i + 1] + dy; P[i + 2] = this.spores[i + 2] + dz;
    }
    P.__v = (P.__v || 0) + 1;

    const p = ease.inOutCubic(clamp(d.lt / Math.max(0.01, d.dur)));
    const cam = dsCam(d, {
      yaw: 0.35 + p * 0.35 + Math.sin(d.lt * 0.2) * 0.08, pitch: 0.1 + Math.sin(d.lt * 0.27) * 0.05,
      dist: lerp(8.0, 6.2, p), fov: 38, punch: 0.008, roll: Math.sin(d.lt * 0.19) * 0.03 + d.t * 0.004, seed: 28,
    });

    const list = [
      dsAir(d, this.dust, { gain: 0.2, size: 1.05, dof: 34, drift: 0.1, t: d.t }),
      { P, o: { dynamic: true, size: 1.15, gain: 0.42 * inA * outA, color: 'fg', dof: 20, focus: 7, twinkle: 1.0, t: d.t } },
      // a swell crossing the field once per bar: the spores it passes flare, so the whole cloud pulses outward
      { P, o: { dynamic: true, size: 2.1, gain: (0.5 + d.kick * 0.4) * inA * outA, color: 'hot', dof: 12, focus: 7, count: Math.round(900 + 700 * (1 - Math.abs(Math.sin(d.barPhase * Math.PI)))), twinkle: 0.4, t: d.t } },
      { S: this.box, o: { width: 1, gain: 0.16 * inA * outA, color: 'dim', glow: 0.2, fog: 18, dof: 26, focus: 7, model: { rot: [Math.sin(d.t * 0.2) * 0.06, d.t * 0.03, Math.cos(d.t * 0.17) * 0.06] } } },
      { S: this.stems, o: { width: 1, gain: 0.28 * inA * outA, color: 'accent', glow: 0.3, dof: 18 } },
    ];
    this.caps.forEach((c, k) => {
      const bob = Math.sin(d.t * 0.5 + k * 1.7) * 0.08;
      list.push({ P: c.dome, o: { size: 1.3, gain: 0.5 * inA * outA * (0.7 + 0.3 * Math.sin(d.t + k)), color: 'hot', dof: 10, model: { pos: [c.pos[0], c.pos[1] + bob, c.pos[2]] } } });
    });
    dsLight(d, list, { cam, end: { bloom: 0.62, exposure: 0.87, ca: 0.5, radius: 0.52 } });

    g.save();
    g.globalAlpha = inA * outA;
    // the glyphs that came off the wall, now floating loose in the air in front of the camera
    g.font = dsMono(30, 400);
    for (let k = 0; k < 26; k++) {
      const x = hash(k, 21) * W * 0.9 + 60, y = hash(k, 23) * H * 0.8 + 60;
      const a = (0.25 + hash(k, 25) * 0.5) * (0.5 + 0.5 * Math.sin(d.t * 0.9 + k));
      g.fillStyle = dsTone(d, hash(k, 27) > 0.6 ? 'hot' : 'accent', a * inA * outA);
      g.fillText(DS_GLYPH[Math.floor((k * 7 + Math.floor(d.t * 1.5)) % DS_GLYPH.length)], x, y);
    }
    TL.block(g, d, [
      ['spores', TL.num(11000)],
      ['room', 'DISSOLVING'],
      ['semantics', (d.mid * 0.9).toFixed(2)],
      ['reality', (1 - clamp(d.low * 0.5 + d.mid * 0.3)).toFixed(2)],
    ], { x: W - 500, y: 168, hot: [3] });
    TL.stamp(g, d, 'DO NOT OPERATE MACHINERY', 120, H - 120, { size: 13, track: 4, color: 'warn', alpha: 0.6 + 0.4 * d.low });
    g.restore();

    dsLife(g, d, { gain: 1.8, dust: 130 });
    dsScanSweep(g, d, { alpha: 0.16, period: 2.4 });
    dsScanSweep(g, d, { alpha: 0.07, period: 1.2 });
    dsTele(g, d, { id: 'c11', name: 'shrooms', rows: null, foot: 'spores · 11 000, each on its own phase' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    return dsFin(d, { shake: dsShake(d, 0.7 + d.kick * 0.8, 33), vignette: 0.3, grain: 0.045 });
  },
});
