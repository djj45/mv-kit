// hook_pdoom — the four drops. One scene at four times (22.76 / 59.13 / 95.47 / 124.52), and the four are NOT
// the same footage repeated: the song hooks on one line, but the machine on screen at the last chorus is not the
// machine of the first, so each drop shows a different DEGREE of AGI. What changes is not the loudness — that
// escalates on its own, with `n` — but how the word is MADE, and what is standing behind it:
//
//   n=1  EMERGENT  22.76  the letters never settle. The cloud is half text, half static, and it is still
//                         flickering between the two when the shot ends: it has just learned to say its name.
//   n=2  NESTED    59.13  the letters hold, and there is a second word exactly behind the first and a mirrored
//                         ghost of the whole frame: it has learned that it is a thing with an inside.
//   n=3  PARALLEL  95.47  the word is intact, then comes apart mid-word and reassembles, three times in two
//                         seconds: it has learned that it can be more than one thing at once.
//   n=4  RESOLVED  124.52 it does not move. The word is perfect, huge and still, and the frame around it is
//                         quiet, because there is nothing left for it to prove. The light simply goes.
//
// The escalation of force still rides on `params.n` (more points, wider rays, harder tear, and only n=4 may use
// bloom > 1), and every entrance is on the drum, never on the clock.
MV.scene('hook_pdoom', {
  init() {
    const N = 42000;
    this.N = N;
    this.big = dsTextPoints('P(doom)', N, { scale: 2.35, weight: 200, font: dsSans(200, 200) });
    // the state the word starts from for n=1: the same points, thrown into static around it
    const rnd = mulberry32(311);
    this.noise = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 0.6 + rnd() * 3.4, a = rnd() * TAU, b = Math.acos(2 * rnd() - 1);
      this.noise[i * 3] = Math.sin(b) * Math.cos(a) * r;
      this.noise[i * 3 + 1] = Math.cos(b) * r * 0.75;
      this.noise[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r;
    }
    // the shard field for n=3: every point keeps a direction away from the middle, so the word breaks along its
    // own radius rather than dissolving
    this.shard = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const x = this.big[i * 3], y = this.big[i * 3 + 1], z = this.big[i * 3 + 2];
      const k = 1.5 + (i % 97) / 32;
      this.shard[i * 3] = x * (1 + k * 0.5) + (hash(i, 5) - 0.5) * 0.6;
      this.shard[i * 3 + 1] = y * (1 + k * 0.8) + (hash(i, 7) - 0.5) * 0.6;
      this.shard[i * 3 + 2] = z + (hash(i, 9) - 0.5) * 1.4;
    }
    this.tmp = new Float32Array(N * 3);
    this.core = MX.core(0.72, { n: 3600, halo: 2000, rays: 20 });
    this.dust = LG.ball(3200, 4.4, { seed: 44 });
    this.ring = dsRing(2200, 1.0, { seed: 12, thick: 0.03 });
    this.upping = dsTextPoints('upping', 9000, { scale: 1.5, weight: 300, font: dsSans(200, 300) });
  },
  // which stage of AGI this drop is showing — also the words the panel prints
  stages: [null, ['EMERGENT', 'stateless · 1 pass'], ['NESTED', 'self-model · 2 deep'],
           ['PARALLEL', '3 branches / 2 s'], ['RESOLVED', 'no further objective']],
  render(g, f) {
    const n = clamp((f.params && f.params.n) || 1, 1, 4);
    const d = dsFrame(f, 'alert', n >= 3 ? { warn: '#ff2d1f', hot: '#fff3ec' } : null);
    d.g = g;
    const kicks = dsEvents(f, 'kick', f.from, f.to);
    const t0 = kicks.length ? kicks[0].t : f.from;
    const since = Math.max(0, d.t - t0);
    const hit = Math.exp(-since / 0.24);
    const hold = dsIn(d, 0.06, 0.5);
    const out = dsOut(d, 0.32);
    const edge = ease.outExpo(clamp(since / 0.75));
    let flare = 0;
    for (const e of kicks) flare = Math.max(flare, Math.exp(-Math.max(0, d.t - e.t) / 0.14) * clamp(e.s));
    flare = clamp(flare);
    const blast = clamp(0.55 + 0.14 * n);

    // ---- what the word IS at this point in the song
    let P, ghosts = 0, camDist = 5.9, roll = 0, broken = 0;
    if (n === 1) {
      // EMERGENT: half static, and the fraction that has settled never completes inside the shot
      P = lmMorph(this.noise, this.big, Math.min(0.86, edge), { stagger: 0.62, swirl: 0.3, seed: 9, out: this.tmp });
      camDist = 4.6; roll = 0.04;
    } else if (n === 2) {
      // NESTED: it holds, with copies behind it
      P = lmMorph(this.noise, this.big, ease.outCubic(clamp(since / 0.5)), { stagger: 0.3, swirl: 0.12, seed: 9, out: this.tmp });
      ghosts = 2; camDist = 5.9; roll = 0.02;
    } else if (n === 3) {
      // PARALLEL: three break-and-reform cycles inside the shot, each on a kick
      broken = [0.0, 0.55, 1.05].reduce((a, k) => {
        const s = since - k;
        return (s < 0 || s > 0.5) ? a : Math.max(a, Math.sin(clamp(s / 0.5) * Math.PI));
      }, 0);
      P = lmMorph(this.big, this.shard, ease.inOutCubic(broken), { stagger: 0.18, swirl: 0.16, seed: 4, out: this.tmp });
      camDist = 6.6 + broken * 0.7; roll = 0.06 * broken;
    } else {
      // RESOLVED: still. No morph, no swirl, no drift on the letters — the only motion is the light behind them.
      P = this.big; camDist = 7.9;
    }

    const cam = dsCam(d, {
      yaw: 0.1 + Math.sin(d.lt * 0.35) * (n === 4 ? 0.03 : 0.1) + (1 - edge) * 0.25,
      pitch: 0.02 + (1 - edge) * (n === 4 ? 0.05 : 0.2),
      dist: camDist - hit * 0.4 * blast, fov: 34 + n * 1.5, punch: (n === 4 ? 0.02 : 0.05) * blast,
      roll, seed: 11,
    });

    const list = [];
    list.push(dsAir(d, this.dust, { gain: n === 4 ? 0.12 : 0.2, size: 1.1, dof: 34, drift: n === 4 ? 0.05 : 0.14, t: d.t, twinkle: n === 4 ? 0.3 : 0.6 }));
    list.push({ P, o: { size: 1.35 + hit * 0.8, gain: (0.19 + 0.045 * n) * hold * out, dof: 7 + hit * 6, focus: 3.6, twinkle: n === 4 ? 0 : 0.2 } });
    // NESTED only: copies behind the word, one per depth, dimmer the further back — a thing with an inside
    if (ghosts) {
      for (let kk = 1; kk <= ghosts; kk++) {
        list.push({ P: this.big, o: { size: 1.15, gain: 0.16 * hold * out / kk, color: 'accent', dof: 18, model: { pos: [0, 0.14 * kk, -0.75 * kk], scale: 0.94 } } });
      }
      list.push({ P: this.big, o: { size: 1.0, gain: 0.1 * hold * out, color: 'dim', dof: 26, model: { scale: [-1, 1, 1] } } });
    }
    // PARALLEL only: the shards are a real element, not just a morph target — they linger after each break
    if (n === 3) {
      list.push({ P: this.shard, o: { size: 1.1, gain: 0.2 * out * (0.35 + 0.65 * (1 - edge)), color: 'warn', dof: 22, count: 9000, drift: 0.3, t: d.t } });
    }
    list.push({ P: this.ring, o: { size: 1.4, gain: (0.2 + 0.05 * n) * hit * out, color: 'hot', dof: 16, model: { rot: [0.5 + Math.sin(d.t * 2.1) * 0.05, d.t * 0.2, 0.2], scale: 0.6 + (1 - hit) * 2.6 * blast } } });
    list.push({ P: this.core.nucleus, o: { size: 2.0 + hit * 1.6, gain: (0.38 + 0.07 * n) * hold * out, color: 'hot', dof: 5 } });
    list.push({ S: this.core.rays, o: { width: 1 + (n >= 4 ? 0.6 : 0), gain: (0.13 + 0.04 * n) * (0.4 + hit) * out, color: 'hot', glow: 0.6, dof: 12, model: { scale: 1 + (1 - hit) * 1.8 * blast, rot: [d.t * (n === 4 ? 0.03 : 0.12), d.t * 0.09, d.t * 0.06] } } });
    list.push({ P: this.core.halo, o: { size: 1.0, gain: 0.06 * hold * out, color: 'accent', dof: 26, drift: 0.1, t: d.t, count: 700 + n * 300 } });
    // "upping" belongs to the first two hooks' grammar; by the third the word is doing more than being said
    if (n <= 2) {
      const up = prog(d.t, t0 + 0.55, t0 + 0.95, ease.outExpo);
      if (up > 0) list.push({ P: this.upping, o: { size: 1.2, gain: 0.22 * up * out, color: 'fg', dof: 12, model: { pos: [0, 1.35 + (1 - up) * 0.3, 0] } } });
    }

    dsLight(d, list, { cam, end: { bloom: (n >= 4 ? 0.95 : 0.58 + n * 0.06) * (1 + hit * (n === 4 ? 0.15 : 0.4)), exposure: 0.8, ca: 0.55 + hit * (n === 4 ? 0.25 : 0.9), radius: 0.5, lens: 0.34 } });

    // ---- the frame around it. The tear is part of the first three hooks; the fourth has none, on purpose.
    if (n < 4) {
      g.save();
      if (flare > 0.02) {
        g.globalAlpha = flare * 0.5;
        g.fillStyle = dsTone(d, 'hot', 1);
        g.fillRect(0, 0, W, 3 + flare * 10);
        g.fillRect(0, H - 3 - flare * 10, W, 3 + flare * 10);
        g.globalAlpha = flare * 0.22;
        dsScan(g, 0, H * 0.5 - 90, W, 180, { alpha: 0.6, phase: d.t * 30, alive: flare });
      }
      g.restore();
    }

    // the read-out of the machine's own force: one tick per kick, widening with every hook
    g.save();
    g.strokeStyle = dsTone(d, 'warn', 0.65); g.lineWidth = 1;
    kicks.slice(0, 16).forEach((e, i) => {
      const x = 46 + i * 7;
      if (x > 150) return;
      const h = 10 + e.s * 54 * (0.4 + 0.6 * Math.exp(-(d.t - e.t) / 0.5));
      g.beginPath(); g.moveTo(x, H / 2 - h); g.lineTo(x, H / 2 + h); g.stroke();
    });
    g.restore();

    // the panel says which stage of AGI is on screen, which is what actually distinguishes the four drops
    const ST = this.stages[n];
    TL.block(g, d, [
      ['P(doom)', (0.02 * n + 0.004 * (n - 1)).toFixed(3)],
      ['hook', n + ' / 4'],
      ['state', ST[0]],
      ['containment', n >= 4 ? 'NONE' : n >= 3 ? 'DEGRADED' : 'HOLDING'],
      ['note', ST[1]],
    ], { x: W - 520, y: 168, hot: [0, 3] });

    dsLife(g, d, { gain: 1.2 + n * 0.15, dust: 70 + n * 15 });
    dsScanSweep(g, d, { alpha: n === 4 ? 0.04 : 0.08, period: 1.6 });
    LY.draw(g, d, { mode: 'slam', size: n >= 3 ? 92 : 82, y: H * 0.60, live: 'hot' });
    dsTele(g, d, { id: 'c' + (10 + n * 9), name: 'hook' + n, rows: null, foot: ST[0].toLowerCase() + ' · ' + ST[1] });

    return dsFin(d, {
      shake: dsShake(d, (2.6 + n * 0.7) * (0.35 + hit * 2.2) * (n === 4 ? 0.45 : 1), 13),
      flash: Math.max(0, flare * (0.16 + 0.05 * n) * (n === 4 ? 0.4 : 1)),
      glitch: flare * (0.3 + 0.18 * n) * (n === 4 ? 0.15 : 1),
      vignette: n === 4 ? 0.3 : 0.22,
      grain: 0.045,
    });
  },
});
