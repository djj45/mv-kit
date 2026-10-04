// recursive — 42 (129.82–132.516) · rose drifting to ice · paid for by "To recursive self-upgrade".
// The stack builds a copy of itself, then that copy builds one, one level per beat: five generations nested into
// each other's corner, each a whole transformer stack at half the size of its parent. The newest generation is
// the only thing at full gain, and the palette walks from rose toward ice across the shot, so the cut into ilya's
// cold aperture is not a colour jump but the end of a drift.
MV.scene('recursive', {
  init() {
    this.gen = 5;
    this.st = MX.layers(8, 256, { size: 1.32, spread: 0.34 });     // the parent, and the shape of every copy
    const far = (this.st.n - 1) / 2 * this.st.spread, s = this.st.size;
    const conn = [];
    for (const x of [-s, s]) for (const z of [-s, s]) conn.push([[x, -far, z], [x, far, z]]);
    this.conn = LG.pairs(conn, { bright: 0.35 });
    this.box = [];                                                  // each generation's own frame: the nesting
    const sx = this.st.size * 1.06, sy = (this.st.n - 1) / 2 * this.st.spread * 1.12;
    for (let k = 0; k < 5; k++) this.box.push(LG.wirebox([sx * 2, sy * 2, sx * 2], { bright: 0.55 }));
    this.cores = [];
    for (let k = 0; k < this.gen; k++) this.cores.push(MX.core(0.32, { n: 900, halo: 500, rays: 8 }));
    // where each generation sits: nested into the upper-right corner of its parent, half the size
    this.at = [];
    let px = -1.15, py = -0.55, sc = 1;
    for (let k = 0; k < this.gen; k++) {
      this.at.push({ pos: [px, py, 0.15 + k * 0.2], scale: sc });
      px += 0.66 * sc; py += 0.54 * sc; sc *= 0.5;
    }
    this.dust = LG.ball(2000, 9, { seed: 181 });
    this.logs = [
      'gen 0: 8 layers · hand-written',
      'gen 1: copy of gen 0 · 0.5×',
      'gen 2: copy of gen 1 · 0.5×',
      'gen 3: no review requested',
      'gen 4: capability ×19.4',
    ];
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - d.audio.beatAt(d.from));
    const prog = clamp(beats / span);
    // the chapter changes colour inside this shot: rose now, ilya's ice at the cut
    d.pal = dsPal('rose → ice', 0.45 * prog);
    const gen = Math.min(this.gen, Math.floor(beats) + 1);         // one new generation per beat
    const up = (k) => ease.outExpo(clamp(beats - k));               // generation k arrives on beat k

    const cam = dsCam(d, {
      yaw: 0.42 - prog * 0.25 + lt * 0.05 + Math.sin(lt * 0.3) * 0.06, pitch: 0.1, roll: 0.02 * prog + lt * 0.012,
      dist: lerp(8.8, 6.9, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.04, seed: 81,
    });
    const list = [dsAir(d, this.dust, { gain: 0.16, size: 1.0, dof: 34, count: 900 })];
    for (let k = 0; k < this.gen; k++) {
      const live = k === gen - 1 && gen > 0;
      const born = up(k);
      if (born <= 0.01) continue;
      const a = this.at[k];
      const flash = 1 + 0.55 * (1 - clamp(beats - k));               // the new copy flashes as it is built
      for (let l = 0; l < this.st.n; l++) {
        list.push({
          P: this.st.planes[l],
          o: { size: (1.5 - k * 0.12) * (1 + (live ? 0.4 : 0)) * (1 + 0.18 * Math.sin(lt * 3.1 - k * 0.9)), gain: (0.42 - k * 0.05) * born * (live ? flash : 1), color: live ? 'hot' : 'accent', dof: 9, focus: 7.8, twinkle: 0.35, t: d.t, model: { pos: a.pos, scale: a.scale, rot: [0, lt * (0.28 - k * 0.03), 0] } },
        });
      }
      list.push({ S: this.conn, o: { width: 1, gain: (0.26 - k * 0.03) * born, color: 'dim', glow: 0.15, model: a } });
      list.push({ S: this.box[k], o: { width: 1, gain: (live ? 0.55 : 0.24 - k * 0.03) * born, color: live ? 'accent' : 'dim', glow: 0.2, model: a } });
      // the one thing at full gain: the core of the newest generation
      if (live) {
        list.push({ P: this.cores[k].nucleus, o: { size: 2.0 + d.kick * 0.9, gain: 1.0 * born, color: 'hot', dof: 6, model: a } });
        list.push({ S: this.cores[k].rays, o: { width: 1, gain: 0.4 * born, color: 'hot', glow: 0.6, model: a } });
      } else {
        list.push({ P: this.cores[k].nucleus, o: { size: 1.2, gain: 0.3 * born, color: 'accent', dof: 8, model: a } });
      }
    }
    dsLight(d, list, { cam, end: { bloom: 0.5 + d.kick * 0.25, exposure: 0.87, ca: 0.4 + d.kick * 0.25, radius: 0.48 } });

    dsTele(g, d, {
      id: 'c42', name: 'recursive',
      rows: [
        ['generation', gen + ' / ' + this.gen],
        ['copy of', gen > 1 ? 'gen ' + (gen - 2) : '—'],
        ['capability', '×' + Math.pow(2.9, gen - 1).toFixed(1)],
        ['review', gen > 2 ? 'NONE' : 'AUTO'],
        ['oversight', gen > 3 ? 'LOST' : 'THIN'],
      ],
      foot: 'recursive self-upgrade',
    });
    // the lineage, written out: a stack of one-line labels, one per generation
    for (let k = 0; k < this.gen; k++) {
      const on = k < gen;
      TL.stamp(g, d, (on ? '● ' : '○ ') + 'GEN ' + k + (k ? ' = COPY(GEN ' + (k - 1) + ') · 0.5×' : ' · 8 LAYERS'), 110, 330 + k * 26,
        { color: on ? (k === gen - 1 ? 'hot' : 'accent') : 'dim', size: 13 });
    }
    TL.log(g, d, this.logs, { x: 110, y: H - 340, size: 15, rows: 4, every: 0.44, t0: f.from + 0.3 });
    dsTick(g, d, { x: W - 150, y: H - 70, label: 'GEN', rate: 41, alpha: 0.5 });

    // the plate gives this line 'ascend' — recursive self-upgrade, the sentence climbing as it is sung.
    LY.draw(g, d, { mode: 'plate', size: 52, y: H - 165 });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.12, period: 2.0 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.7 + d.kick, 82), vignette: 0.24, grain: 0.038 }, dsLifePost(d, { amount: 1.4 })));
  },
});
