// fuse — 32 (102.46–105.96) · ember · paid for by "Too late now, we lit the fuse".
// One bright point runs along a wire and the wire lights up behind it. The cord is a single hairline polyline
// across the frame, cut into 24 lengths so the heat can travel: the burnt part glows, cools, and a band of heat
// chases the front the whole way, which is what makes the shot live rather than a progress bar. The front itself
// is the only thing at full gain. The camera never stops moving toward the tip and is reframed hard once, halfway,
// so 3.5 s is two shots: the whole cord, then the head of the burn.
MV.scene('fuse', {
  init() {
    const N = 170, pts = [], arc = [0];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      pts.push([-5.7 + 11.4 * u, 1.05 * Math.sin(u * 2.6 + 0.4) - 0.85 * u + 0.45, 0.7 * Math.sin(u * 4.1)]);
      if (i) { const a = pts[i - 1], b = pts[i]; arc.push(arc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
    }
    this.pts = pts; this.arc = arc; this.len = arc[N - 1];
    this.wire = LG.seg(pts, { bright: 0.55 });
    // the cord in 24 lengths: each one can carry its own gain, so heat runs along the wire behind the front
    this.nch = 12; this.chunk = [];
    const per = (N - 1) / this.nch;
    for (let c = 0; c < this.nch; c++) {
      const a = Math.round(c * per), b = Math.max(a + 1, Math.round((c + 1) * per));
      this.chunk.push(this.wire.slice(a * 8, b * 8));
    }
    this.charge = MX.core(0.5, { n: 1000, halo: 800, rays: 10 });
    this.chargeAt = pts[N - 1];
    this.dust = LG.ball(2200, 8.5, { seed: 63 });
    this.sparks = new Float32Array(620 * 3);                    // one small dynamic cloud: the bits coming off
  },
  // where the burn front is, by arc length, without a simulation
  at(k) {
    const s = clamp(k) * this.len, arc = this.arc;
    let i = 1; while (i < arc.length - 1 && arc[i] < s) i++;
    const u = (s - arc[i - 1]) / Math.max(1e-6, arc[i] - arc[i - 1]), a = this.pts[i - 1], b = this.pts[i];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const CUT = 1.58;                                    // intra-shot cut: the cord, then the head of the burn
    const seg = d.lt < CUT ? 0 : 1;
    const lt = d.lt;
    const b0 = d.audio.beatAt(d.from);
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - b0);
    const k = clamp((beats - 0.55) / (span - 0.4));            // lit on the downbeat, burnt out before the cut
    const tip = this.at(k);
    const sparkG = k > 0.001 && k < 1 ? 1 : 0;
    // the sparks: a function of t, not a simulation. 620 points thrown back off the tip, always in flight.
    const rnd = mulberry32(313);
    for (let i = 0; i < 620; i++) {
      const life = (d.t * (1.6 + rnd() * 1.1) + rnd()) % 1;
      const sp = 0.5 + rnd() * 1.9;
      this.sparks[i * 3] = tip[0] + (rnd() - 0.5) * 0.6 - life * sp * 0.8;
      this.sparks[i * 3 + 1] = tip[1] + (rnd() - 0.5) * 0.6 + life * sp * 1.0;
      this.sparks[i * 3 + 2] = tip[2] + (rnd() - 0.5) * 0.6 + life * sp * 0.35;
    }
    const born = clamp((beats - (span - 1.1)) / 1.1);          // the charge takes the last beat
    // the camera travels with the tip the whole shot — and jumps in on the reframe
    const cam = dsCam(d, {
      yaw: (seg ? 0.2 : 0.05) + lt * 0.05 + Math.sin(lt * 0.35) * 0.06, pitch: seg ? 0.04 : 0.09,
      dist: seg ? lerp(5.6, 4.7, clamp((lt - CUT) / 1.9)) : lerp(8.6, 7.0, clamp(lt / CUT)), fov: seg ? 30 : 34, punch: 0.03,
      target: seg ? [lerp(tip[0], this.chargeAt[0], 0.35), lerp(tip[1] * 0.6, this.chargeAt[1], 0.3), 0.3] : [tip[0] * 0.82, tip[1] * 0.6, tip[2] * 0.5], seed: 9,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.18, size: 1.05, dof: 34, count: 1000 }),
      { S: this.wire, o: { width: 1, gain: 0.3, color: 'dim', glow: 0.18 } },                  // the cold cord
      // the heat: the 24 lengths behind the front cool at different rates, and a band of glow chases the tip
      ...this.chunk.map((S, c) => {
        const u = (c + 0.5) / this.nch;
        const behind = k - u;                                  // > 0 once the front has passed this length
        if (behind < -0.005) return null;
        const cool = Math.exp(-Math.max(0, behind) * 1.1);     // what it burnt stays warm, then cools
        const heat = Math.exp(-Math.pow(behind * 7, 2)) * (0.62 + 0.38 * Math.sin(d.t * 26 + c * 1.7));   // the band at the front
        return { S, o: { width: 1.3 + heat * 1.1, gain: 0.22 + 0.55 * cool + 1.0 * heat, color: heat > 0.3 ? 'hot' : 'accent', glow: 0.4 + heat * 0.6, fog: 0 } };
      }).filter(Boolean),
      // the one thing at full gain
      { P: new Float32Array([tip[0], tip[1], tip[2]]), dyn: true, o: { size: 4.4 + d.kick * 3.4, gain: 1.3 * sparkG, color: 'hot', dof: 5, blur: 1.2 } },
      { P: this.sparks, dyn: true, o: { size: 1.3, gain: 0.55 * sparkG, color: 'accent', dof: 12, fog: 9 } },
      { P: this.charge.nucleus, o: { size: 1.8, gain: 0.15 + born * 0.85, color: 'hot', dof: 6, model: { pos: this.chargeAt } } },
      { P: this.charge.halo, o: { size: 1.1, gain: 0.25 * born, color: 'accent', dof: 18, twinkle: 0.55, t: d.t, model: { pos: this.chargeAt, scale: 0.7 + born * 0.6 } } },
      { S: this.charge.rays, o: { width: 1, gain: 0.3 * born, color: 'hot', glow: 0.6, model: { pos: this.chargeAt, scale: 0.8 + born * 0.7, rot: [0, lt * 0.7, 0] } } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.55 + d.kick * 0.35 + born * 0.2, exposure: 0.85, ca: 0.45 + d.kick * 0.4, radius: 0.5 } });

    dsTele(g, d, {
      id: 'c32', name: 'fuse',
      rows: [
        ['fuse', k > 0 ? 'LIT' : 'COLD'],
        ['burn', (k * 100).toFixed(1) + ' %'],
        ['to charge', ((1 - k) * this.len).toFixed(2) + ' m'],
        ['charge', born > 0.5 ? 'ARMED' : 'SAFE'],
        ['time left', ((1 - k) * 1.4).toFixed(2) + ' s'],
      ],
      foot: 'we lit it',
    });
    TL.stamp(g, d, 'CORD — 11.4 m / 1 turn', 110, 452, { color: 'dim', size: 13 });
    TL.gauge(g, d, 110, 484, 340, k, { label: 'BURN', color: 'hot' });
    dsLine(g, (k * 100).toFixed(0) + '%', 110, 560, { font: dsSans(54, 200), size: 54, color: dsTone(d, 'hot', 0.92), glow: 20, align: 'left', track: 3 });

    // the plate gives this line 'wave' — an ignition trace — and that is exactly the shot: the word rides its own
    // amplitude, so the lyric is the burn and not a caption on it.
    LY.draw(g, d, { mode: 'plate', size: 42, y: H - 150 });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.14, period: 1.9 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.5 + 0.7 * d.kick, 13), vignette: 0.24, grain: 0.04 }, dsLifePost(d, { amount: 1.4 })));
  },
});
