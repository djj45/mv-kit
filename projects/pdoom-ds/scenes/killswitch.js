// killswitch — 30 (98.82–100.721) · alert · paid for by "Killswitch guy's on PTO".
// A big red switch, caged, lit — and nobody at the station. The station light is a field of points with a chair
// silhouette cut out of it, so the empty chair is not a drawing: it is the place where the light is missing. The
// cage is MX.cage, the film's containment lattice, here at its smallest and locked over the lever. The lever is
// thrown on the second beat of the line, and the lamp at the end of it is the only thing at full gain. The station
// is not a photograph of an empty room: a wave of light keeps rolling across the panel, the lamp breathes, the cage
// turns, and the camera creeps in on the lever the whole shot.
MV.scene('killswitch', {
  init() {
    // ---- the station: a wall plate, a caged lever, a lamp at the end of the lever
    this.plate = LG.wirebox([2.5, 3.3, 0.5], { at: [-2.85, 0.35, 0], bright: 0.5 });
    this.cage = MX.cage(0.98);                                            // the containment lattice, at 0.98 m
    this.lever = LG.seg([[0, 0.1, 0], [0, -1.5, 0]], { bright: 1 });       // drawn with a model rotation: the throw
    this.lamp = MX.core(0.42, { n: 1500, halo: 900, rays: 12 });
    this.pivot = [-2.85, 0.95, 0.34];
    // ---- the station light, with the chair taken out of it
    const chair = [                                                        // [x0, y0, w, h] in chair coordinates
      [-0.62, 0.16, 1.24, 1.3],                                            // back
      [-0.72, -0.14, 1.44, 0.16],                                          // seat
      [-0.78, 0.0, 0.16, 0.5], [0.62, 0.0, 0.16, 0.5],                     // arms
      [-0.62, -1.28, 0.12, 1.14], [0.5, -1.28, 0.12, 1.14],                // legs
    ];
    const CX = 1.45, CY = -0.25;                                           // where the chair stands in the frame
    const inChair = (x, y) => chair.some(r => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]);
    const rnd = mulberry32(9091), pts = [];
    for (let i = 0; i < 6600; i++) {
      const x = -1.55 + rnd() * 5.9, y = -2.3 + rnd() * 4.6;
      if (inChair(x - CX, y - CY)) continue;                               // "empty" = the light is not here
      pts.push([x, y, (rnd() - 0.5) * 0.45]);
    }
    pts.sort((a, b) => a[0] - b[0]);                                       // ordered left → right: it comes up in a sweep
    this.light = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { this.light[i * 3] = p[0]; this.light[i * 3 + 1] = p[1]; this.light[i * 3 + 2] = -1.9 + p[2]; });
    this.lightN = pts.length;
    // the same field in 10 vertical bands: a wave of light rolls across the panel for the whole shot, which is what
    // an instrument panel does when it is on, and what an empty station does not do
    this.bands = 10;
    this.bandP = [];
    { const per = Math.ceil(pts.length / this.bands);
      for (let b = 0; b < this.bands; b++) {
        const a = new Float32Array(per * 3);
        for (let i = 0; i < per; i++) { const j = b * per + i; if (j >= pts.length) break; a[i * 3] = this.light[j * 3]; a[i * 3 + 1] = this.light[j * 3 + 1]; a[i * 3 + 2] = this.light[j * 3 + 2]; }
        this.bandP.push(a);
      } }
    const segs = [];
    for (const [x0, y0, w, h] of chair) {
      const p = [[x0 + CX, y0 + CY, -1.88], [x0 + w + CX, y0 + CY, -1.88], [x0 + w + CX, y0 + h + CY, -1.88], [x0 + CX, y0 + h + CY, -1.88]];
      segs.push(LG.seg(p, { closed: true, bright: 0.5 }));
    }
    this.chairWire = LG.join.apply(null, segs);                            // the edge of the hole catches the light
    this.dust = LG.ball(2000, 8.5, { seed: 44 });
  },
  render(g, f) {
    const d = dsFrame(f, 'alert');
    d.g = g;
    const lt = d.lt;
    const bIn = (n) => clamp(d.beat - (d.audio.beatAt(d.from) + n));   // entrance n beats after the cut
    const up = bIn(0);                                   // the station light comes on with the first beat
    const pull = bIn(2);                                 // the lever is thrown two beats later, on a kick
    const thrown = ease.outExpo(pull);
    const ang = lerp(0.62, -0.55, thrown) + 0.05 * (1 - thrown) * Math.sin(lt * 7.5) * thrown;   // it trembles as it is thrown
    const lampP = thrown * (0.5 + 0.8 * d.kick + 0.25 * d.snare) + (1 - thrown) * 0.35 * up;

    const tip = [this.pivot[0] + Math.sin(ang) * 1.5, this.pivot[1] - Math.cos(ang) * 1.5, this.pivot[2]];
    const cam = dsCam(d, {
      yaw: 0.1 + lt * 0.045 + Math.sin(lt * 0.25) * 0.05, pitch: 0.03,
      dist: lerp(8.9, 7.6, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.02, seed: 6,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.17, size: 1.05, dof: 34, count: 900 }),
      { S: this.plate, o: { width: 1, gain: 0.3, color: 'dim', glow: 0.15 } },
      { S: this.chairWire, o: { width: 1, gain: 0.32 * up, color: 'accent', glow: 0.25 } },
      // the guard cage over the switch: closed, and nobody to open it. It never stops turning, slowly.
      { S: this.cage, o: { width: 1, gain: 0.46, color: 'dim', glow: 0.2, model: { pos: [-2.85, 0.55, 0.3], scale: 1.35, rot: [0, lt * 0.22, 0] } } },
      { S: this.lever, o: { width: 2.2, gain: 0.62, color: 'warn', glow: 0.6, model: { pos: this.pivot, rot: [0, 0, ang] } } },
      // the one thing at full gain: the lamp
      { P: this.lamp.nucleus, o: { size: 2.2 + d.kick * 1.6, gain: 0.3 + lampP, color: 'hot', dof: 6, model: { pos: tip } } },
      { P: this.lamp.halo, o: { size: 1.15, gain: 0.2 + lampP * 0.4, color: 'warn', dof: 16, twinkle: 0.6, t: d.t, model: { pos: tip } } },
      { S: this.lamp.rays, o: { width: 1, gain: 0.25 * lampP, color: 'hot', glow: 0.7, model: { pos: tip, scale: 1 + lampP * 0.5, rot: [0, lt * 0.5, 0] } } },
    ];
    // the station light in ten bands, each with its own gain: a wave of brightness crosses the panel and never stops
    for (let b = 0; b < this.bands; b++) {
      const w = 0.62 + 0.38 * Math.sin(lt * 3.1 - b * 0.72);
      if (up <= 0.01) break;
      list.push({ P: this.bandP[b], o: { size: 1.05, gain: 0.54 * up * w, color: 'fg', dof: 22 } });
    }
    dsLight(d, list, { cam, end: { bloom: 0.6 + d.kick * 0.3, exposure: 0.86, ca: 0.45 + d.kick * 0.4, radius: 0.5 } });

    dsTele(g, d, {
      id: 'c30', name: 'killswitch',
      rows: [
        ['switch', thrown > 0.5 ? 'THROWN' : 'ARMED'],
        ['operator', 'PTO'],
        ['present', 'NO'],
        ['cage', 'CLOSED'],
        ['lamp', lampP > 0.5 ? 'LIT' : 'DIM'],
      ],
      foot: 'station 07 · unstaffed',
    });
    // the chair, labelled like every other instrument in the film
    g.save();
    g.strokeStyle = dsTone(d, 'dim', 0.5); g.lineWidth = 1;
    g.beginPath(); g.moveTo(1052, 700); g.lineTo(1252, 690); g.lineTo(1290, 640); g.stroke();
    g.restore();
    TL.stamp(g, d, 'CHAIR — EMPTY', 1000, 700, { color: 'accent', size: 13 });
    dsLine(g, '0', 1610, 344, { font: dsMono(38, 400), size: 38, color: dsTone(d, 'hot', 0.9), glow: 12, align: 'left' });
    TL.stamp(g, d, 'OPERATORS ON SITE', 1500, 376, { color: 'dim', size: 12 });
    dsTick(g, d, { x: W - 150, y: H - 70, label: 'SHIFT', alpha: 0.5 });

    // the regenerated plate gives this line 'wave' — the flat line of a station nobody is watching, drawn as one.
    LY.draw(g, d, { mode: 'plate', size: 44, y: H - 152 });

    dsLife(g, d, { gain: 0.9, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.12, period: 2.0 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.5 + 0.8 * d.kick, 8), vignette: 0.26, grain: 0.04 }, dsLifePost(d, { amount: 1.4 })));
  },
});
