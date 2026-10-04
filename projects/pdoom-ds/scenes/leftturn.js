// leftturn — 81.21–85.00, ember with the turn in `warn`. "Sharp left turn and there you are": an L-shaped corridor
// of hairlines and one point of light running down it. The light reaches the corner at the snare nearest the word
// "turn" — and at that instant the camera whips 90° left and the corridor is suddenly the other leg, so the geometry
// turns because the light did. One thing at full gain: the light and the trail behind it.
MV.scene('leftturn', {
  init() {
    const S = [];
    const add = (a, b, br) => S.push([[a[0], a[1], a[2]], [b[0], b[1], b[2]], br]);
    const z0 = 2.6, z1 = -7.0, x0 = -2.6, x1 = -11.5, w = 2.4;
    for (const y of [-1.7, -0.85, 0, 0.85, 1.7]) {
      add([-w, y, z0], [-w, y, z1], y === 0 ? 0.85 : 0.55); add([w, y, z0], [w, y, z1], y === 0 ? 0.85 : 0.55);   // leg 1 (along -z)
      add([x0, y, z1 - w], [x1, y, z1 - w], y === 0 ? 0.85 : 0.5); add([x0, y, z1 + w], [x1, y, z1 + w], y === 0 ? 0.85 : 0.5);  // leg 2
    }
    for (let z = z0; z >= z1; z -= 1.6) { add([-w, -1.7, z], [-w, 1.7, z], 0.4); add([w, -1.7, z], [w, 1.7, z], 0.4); }
    for (let x = x0; x >= x1; x -= 1.6) { add([x, -1.7, z1 - w], [x, 1.7, z1 - w], 0.38); add([x, -1.7, z1 + w], [x, 1.7, z1 + w], 0.38); }
    add([-w, -1.7, z1], [w, -1.7, z1], 0.7); add([-w, 1.7, z1], [w, 1.7, z1], 0.7);
    this.walls = LG.pairs(S, {});
    // the path the light runs: down leg 1, then left along leg 2. The corner is exactly the halfway point.
    this.path = LG.curve((s) => {
      const u = s * 2;
      return u < 1 ? [0, 0.05 * Math.sin(s * 18), lerp(z0, z1, u)] : [lerp(0, x1, u - 1), 0.05 * Math.sin(s * 18), z1];
    }, 160);
    const acc = [0];
    for (let i = 1; i < this.path.length; i++) acc.push(acc[i - 1] + Math.hypot(this.path[i][0] - this.path[i - 1][0], this.path[i][1] - this.path[i - 1][1], this.path[i][2] - this.path[i - 1][2]));
    this.acc = acc; this.len = acc[acc.length - 1];
    this.trailP = new Float32Array(24 * 3);              // the tail, as points on the path
    this.trail = new Float32Array(23 * 8);               // and as a polyline, so it reads as a comet and not as beads
    this.head = new Float32Array(3);
    this.air = LG.ball(800, 6.5, { seed: 51 });
  },
  at(dist) {
    const s = clamp(dist / this.len) * (this.path.length - 1), i = Math.min(this.path.length - 2, Math.floor(s)), u = s - i;
    const a = this.path[i], b = this.path[i + 1];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  },
  render(g, f) {
    const d = dsFrame(f, 'ember');
    d.g = g;
    const t = d.t;
    const a = dsIn(d, 0.0, 0.35, ease.outCubic) * dsOut(d, 0.28);
    // the snap is the snare nearest the word "turn" — the light arrives at the corner on it
    const ws = d.line ? d.line.words : [];
    let wi = -1;
    for (let i = 0; i < ws.length; i++) if (ws[i].w.indexOf('turn') === 0) wi = i;
    const wStart = wi >= 0 ? ws[wi].start : f.from + d.dur * 0.5;
    const sn = dsEvents(f, 'snare', wStart - 0.45, wStart + 0.55);
    const snap = sn.length ? sn[0].t : wStart;
    const turn = prog(t, snap, snap + 0.13, ease.outExpo);
    // the light reaches the corner exactly on the snare, and after that it keeps running at a constant speed, so
    // there is no frame in this shot where the subject has stopped (it used to ease to a halt two thirds of the way
    // through). The camera never settles either: after the 90° snap it keeps drifting and rocking.
    const run = t < snap ? 0.5 * prog(t, f.from, snap, ease.inQuad)
                         : 0.5 + 0.48 * clamp((t - snap) / Math.max(0.01, d.to - snap));
    const head = this.at(run * this.len);
    const jolt = pulse(t, snap, 0.22);

    // the tail: 24 points along the path behind the head, drawn as a polyline
    for (let i = 0; i < 24; i++) {
      const p = this.at(Math.max(0, run * this.len - i * 0.36));
      this.trailP[i * 3] = p[0]; this.trailP[i * 3 + 1] = p[1]; this.trailP[i * 3 + 2] = p[2];
    }
    for (let i = 0; i < 23; i++) {
      const k = i * 8, b = 1 - i / 23;
      this.trail[k] = this.trailP[i * 3]; this.trail[k + 1] = this.trailP[i * 3 + 1]; this.trail[k + 2] = this.trailP[i * 3 + 2];
      this.trail[k + 3] = this.trailP[(i + 1) * 3]; this.trail[k + 4] = this.trailP[(i + 1) * 3 + 1]; this.trail[k + 5] = this.trailP[(i + 1) * 3 + 2];
      this.trail[k + 6] = b; this.trail[k + 7] = i === 0 ? 1 : 0;
    }
    this.head[0] = head[0]; this.head[1] = head[1]; this.head[2] = head[2];

    const cam = dsCam(d, {
      yaw: Math.PI / 2 * turn + d.lt * 0.05, pitch: 0.06,
      roll: -0.05 * Math.sin(Math.PI * turn) + 0.02 * Math.sin(d.lt * 0.5),
      dist: 6.3 + d.lt * 0.1, fov: 36, punch: 0.05, seed: 53,
      target: [lerp(0, -7.0, turn), 0, lerp(0, -7.0, turn)],
    });
    dsLight(d, [
      dsAir(d, this.air, { gain: 0.18 * a, size: 1.0, dof: 30, drift: 0.05, t }),
      { S: this.walls, o: { width: 1.1, gain: 0.62 * a, color: 'dim', glow: 0.3, fog: 22, focus: 6.3 } },
      { S: this.trail, o: { width: 2.4, gain: 0.9 * a, color: 'accent', glow: 0.7, glowR: 5, blur: 0.6 } },
      { P: this.head, o: { size: 4.4 + d.kick * 1.8, gain: 1.4 * a, color: 'hot', dof: 4, focus: 6.3, blur: 0.6 } },
    ], { cam, end: { bloom: 0.66 + jolt * 0.25, exposure: 0.88, ca: 0.5 + turn * 0.25, radius: 0.5 } });

    g.save();
    g.globalAlpha = a;
    TL.stamp(g, d, 'JUNCTION · z −7', 110, 150, { size: 14, track: 4 });
    dsLine(g, (turn > 0.5 ? '090' : '000') + '°', 110, 228, { font: dsSans(72, 200), size: 72, track: 3, color: dsTone(d, turn > 0.5 ? 'warn' : 'fg', 0.95), glow: 20, align: 'left' });
    TL.stamp(g, d, turn > 0.5 ? 'HEADING · CORRECTED LEFT' : 'HEADING · STRAIGHT', 112, 278, { size: 14, track: 4, color: turn > 0.5 ? 'warn' : 'dim' });
    TL.block(g, d, [
      ['turn rate', (turn > 0.02 && turn < 1 ? 90 / 0.13 : 0).toFixed(0) + ' °/s'],
      ['cdr', 'not fitted'],
      ['overshoot', turn > 0.5 ? 'none' : '—'],
      ['there you are', turn > 0.5 ? 'yes' : '…'],
    ], { x: W - 470, y: 330, hot: [3] });
    g.restore();

    dsTele(g, d, { id: 'c26', name: 'leftturn', rows: [['heading', (turn * 90).toFixed(0) + '°'], ['corner', 'z −7'], ['snap', jolt > 0.05 ? 'NOW' : 'held'], ['warn', turn > 0.5 ? 'ON' : 'off']], foot: 'the light turned, the room followed' });
    // lyric: the regenerated plate keys this line at its real start (81.21) and gives it 'scatter' — the sentence
    // takes the turn — so the map can be used directly. Pinned line: the mode is the plate's, the sentence is this
    // shot's, and neither can flip mid-shot.
    const own = (d.line && d.line.end > f.from + 0.2) ? d.line : d.next;
    if (own) LY.draw(g, d, { mode: 'plate', line: own, size: 58, y: H * 0.26 });
    dsLife(g, d, { gain: 1.0, dust: 90 });
    dsScanSweep(g, d, { alpha: 0.055, period: 4.6 });
    dsTick(g, d, { x: 620, y: 976, label: 'RUN', value: run * 1000, rate: 1 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.6 + d.kick * 1.2 + jolt * 2.2),
      flash: jolt * 0.12,
      glitch: jolt > 0.35 ? jolt * 0.3 : 0,
      vignette: 0.24,
    }, dsLifePost(d, { amount: 1.2 })));
  },
});
