// show — shot 44, 02:17.4–02:29.5, ice. The out: the longest shot in the film and the last thing on screen.
// Lyric: "Was it all for show?" (line 45) — the last words in the film, in the plate's 'ghost' treatment: the
// sentence written into the picture word by word with its own dimmer echo behind it (see SHW_sung below).
//
// Everything the film built comes back at once, thinned: the stack (MX.layers) behind, the lattice (MX.cage)
// around, token rain (MX.rain) falling through, the aperture (MX.eye) in front and the core (MX.core) inside
// it. One motif lands per beat after the cut, so the whole vocabulary is back exactly on the song's last hard
// hit (2:20.2) — and from there nothing is ever added, only taken away.
//
// It has to read as a deceleration and not as a stopped frame. Measured on the first cut this shot changed by
// 0.25 of luma a frame (film mean 1.74; a shot's frame-to-frame motion lands near a tenth of its mean luma, so
// a frame this dark needs real movement, not a wobble): the camera's push eased to a full stop at 6.4 s, the
// rain's fall reached zero, the aperture's close was one smooth 1.75-bar move and everything else held still.
// Now every motif keeps living after it arrives, and each one is aimed at a different part of the frame:
//
//   aperture  the diaphragm hunts (±24 % at 0.40 Hz) *and* closes in five visible increments, one per downbeat
//   core      pulses on the low end — the one thing in the frame the song is still driving
//   stack     settles with a bar-long bob and drifts 0.35 world units a second toward the lens, so its 1 575
//             hairlines keep sweeping outward through the edges of the frame
//   rain      falls, slows, never stops (0.08 world units a second on the last frame), and is bright enough
//             to be seen doing it
//   camera    one push that decelerates, a creep that never does, and a 210 px lateral drift across the frame
//   light     the whole layer breathes on the low end, the air keeps crossing the lens, two CRT lines keep
//             sweeping the frame and the post never quite settles (dsLifePost)
//
// The 12 s is *experienced as three shots*: two hard reframings (f.lt, nothing crosses the seam) land on
// downbeats — 2:22.06, the instant the aperture starts to close, and 2:25.70 — so the ending is the wide room,
// then the same room from the other side and closer, then the core alone. Only the camera and the composition
// jump at those two frames; the music, the motifs, the close, the lyric and the fade run straight through them,
// and the light is out by 2:29.4 as it was before. Measured on the film: 1.25 a frame over the first 8 s (no
// frame under 0.25), 1.12 over 2:17.4–2:23, 1.55 over 2:23–2:27, 0.38 over the last 2.4 s where the fade is doing
// the work by design, and 0.00 / max 0 / nothing lit at 2:29.4. The first cut read 0.25 / 73 % still.

// LY's modes draw a line the moment the line starts. This hands them a line that stops at the word being sung,
// so no word is in the frame before its own `start` (the film's one lyric rule) and the last sentence is written
// by the song instead of pasted in whole — the echoes behind it still lag by LY's own 0.16 s steps, which is
// what the plate means by "the sentence said twice, the second time dimmer".
function SHW_sung(line, t) {
  if (!line) return null;
  const words = [];
  for (const w of line.words) if (w.start <= t) words.push(w);
  if (!words.length) return null;
  return { start: line.start, end: words[words.length - 1].end, text: words.map(w => w.w).join(' '), words };
}

// The aperture's ring is D_lip() from ilya.js: MX.eye's iris is a broad annulus, and this shot wants the
// hairline lip of it, so the hole in the middle is empty and the core is what you see through it.
MV.scene('show', {
  init(MV) {
    // Bars since the cut — the cut lands on a sung word, not on a bar, so the shot counts bars from the bar it
    // starts in; every entrance below lands on a beat of that grid.
    const e = (MV.entries || []).find(x => x.scene === 'show');
    this.bar0 = e && MV.audio ? Math.floor(MV.audio.barAt(e.from + 0.02)) : null;

    this.stack = MX.layers(7, 225, { size: 1.5, spread: 0.42 });
    this.cage = MX.cage(1.65, { rings: 5, seg: 60 });
    // the rain is the shot's fast thing while the light is still up: longer streaks, a taller band to fall
    // through, and enough of them to be read as weather rather than noise
    this.rain = MX.rain(1300, { w: 9, spread: 12, h: 11, len: 0.55, seed: 44 });
    const E = MX.eye(1.30, { n: 6200, pupil: 1 });
    this.iris = D_lip(E.iris, 1.30 * 0.82, 1.30 * 0.99);   // the aperture's ring: the shot's one full-gain thing
    this.body = E.iris;                                     // and the haze of the iris it belongs to
    this.core = MX.core(0.50, { n: 1500, halo: 1000, rays: 14 });
    this.dust = LG.ball(2600, 7.5, { seed: 23 });
    // the blades close with the iris: the same ticks as ilya's opening, turning one half turn as they shut
    const bl = [];
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU, r0 = 1.02 * 1.30, r1 = 1.12 * 1.30 + hash(k, 5) * 0.05 * 1.30;
      bl.push([[Math.cos(a) * r0, Math.sin(a) * r0, 0], [Math.cos(a) * r1, Math.sin(a) * r1, 0]]);
    }
    this.blades = LG.pairs(bl, { bright: 0.45 });
    this.logs = [
      'tokens_out 8 412 006 221  ok',
      'no operator present',
      'checkpoint written: agi-final',
      'power down in 4.0 s',
    ];
    // The two intra-shot cuts and the five increments of the close are the song's own downbeats, not seconds I
    // liked: the first downbeat past 4 s (2:22.06) and past 7.5 s (2:25.70) are the reframings, and every
    // downbeat from the first one is one visible step of the aperture closing.
    const dbs = (e && MV.audio && MV.audio.downbeats ? MV.audio.downbeats : []).filter(x => e && x > e.from + 0.1 && x < e.to - 0.4);
    const rel = dbs.map(x => x - (e ? e.from : 0));
    this.cut1 = rel.filter(x => x > 4.0)[0] || 4.68;
    this.cut2 = rel.filter(x => x > 7.5)[0] || 8.32;
    this.steps = rel.filter(x => x > 4.0);
    if (this.steps.length < 3) this.steps = [4.68, 6.50, 8.32, 10.14, 11.95];
  },
  render(g, f) {
    const d = dsFrame(f, 'ice');
    d.g = g;
    const lt = d.lt;
    const bar = this.bar0 == null ? lt / 1.82 : d.bar - this.bar0;
    // one motif per beat: stack, lattice, rain, core — all of it back on the beat before the last hard hit
    const back = (k) => prog(bar, 1.0 + k * 0.25, 1.25 + k * 0.25, ease.outCubic);
    const stackOn = back(0), cageOn = back(1), rainOn = back(2), coreOn = back(3);

    // ---- the three framings of the ending: 0 the wide room, 1 the room from the other side, 2 the core alone
    const seg = lt < this.cut1 ? 0 : lt < this.cut2 ? 1 : 2;
    const sl = seg === 0 ? lt : seg === 1 ? lt - this.cut1 : lt - this.cut2;
    const settle = 1 - clamp(sl / 0.22);         // the new setup is still arriving for its first fifth of a second
    const CAM = [
      { yaw: 0.13, pitch: 0.20, dist: 8.40, shift: [0, -130] },
      { yaw: -0.30, pitch: 0.11, dist: 7.30, shift: [-130, -60] },
      { yaw: 0.05, pitch: 0.26, dist: 6.35, shift: [80, -30] },
    ][seg];

    // the out: the light leaves the frame rather than being cut off — fastest in the middle, with a long slow tail
    const life = 1 - prog(lt, 6.8, 12.0, ease.inOutQuad);
    // the aperture closes onto the core in visible increments: one downbeat, one step, each eased over ~0.3 bar
    const step = 1 / this.steps.length;
    let close = 0;
    for (let i = 0; i < this.steps.length; i++) close += step * prog(lt, this.steps[i], this.steps[i] + 0.55, ease.inOutCubic);
    // the diaphragm is hunting: on top of those increments the aperture breathes ±20 % at 0.40 Hz, which is the
    // largest thing moving in the frame while the light is still up
    const hunt = 1 + 0.24 * Math.sin(TAU * 0.40 * lt) + 0.05 * noise1(lt * 0.6, 7);
    // the camera: one push that decelerates to almost nothing, then a creep that never stops, and a slow drift
    // across the frame — two incommensurate frequencies (0.11 and 0.23 Hz, ~5 px a frame at the peak) so the pan
    // never stops to turn around, which a single sine does twice a cycle
    const push = ease.outCubic(clamp(lt / 5.0));
    const creep = 0.055 * lt;
    const sway = 210 * Math.sin(TAU * 0.11 * lt) + 85 * Math.sin(TAU * 0.23 * lt + 2.1) + 45 * noise1(lt * 0.13, 5);
    // the machine's own breath, on the low end: nothing in this frame is ever exactly still
    const breath = 1 + 0.55 * d.low + 0.10 * d.kick;
    const pulse = 1 + 0.85 * d.low + 1.0 * d.kick;        // and the core answers the low end hardest
    const panel = 1 - prog(lt, 8.6, 10.2, ease.inOutCubic);   // the instrument goes dark before the light does

    const cam = dsCam(d, {
      yaw: CAM.yaw + Math.sin(lt * 0.19) * 0.03 + lt * 0.006,
      pitch: CAM.pitch + sl * 0.004 + settle * 0.06,
      dist: CAM.dist - push * 0.9 - creep + settle * 0.55 + 0.5 * (1 - life),
      fov: 36, shift: [CAM.shift[0] + sway, CAM.shift[1] + sway * 0.3], punch: 0.035, seed: 31,
    });

    const list = [
      dsAir(d, this.dust, { gain: 0.20 * life * breath, size: 1.05, dof: 30, count: Math.round(2400 * (0.35 + 0.65 * life)) }),
    ];
    // the stack: the same 7 layers, thinned, the signal still walking up it once a bar and the whole stack
    // settling — each layer bobbing with the bar, the lower ones lagging — while the stack drifts 0.35 world
    // units a second toward the lens, so its hairlines keep sweeping outward through the edges of the frame
    if (stackOn > 0.001) {
      const u0 = d.barPhase;
      const dz = -1.6 + 0.35 * lt;
      for (let l = 0; l < this.stack.n; l++) {
        const fire = Math.max(0, 1 - Math.abs(l / (this.stack.n - 1) - u0) / 0.22);
        const bob = (1 - 0.55 * (l / (this.stack.n - 1))) * (0.075 * Math.sin(TAU * (bar - l * 0.09)) + 0.025 * noise1(d.t * 0.6, l + 3));
        list.push({
          P: this.stack.planes[l],
          o: { size: 1.15 + fire * 0.3, gain: 0.42 * stackOn * life * breath * (0.5 + fire), color: 'dim', dof: 9, focus: 7.4, twinkle: 0.3, t: d.t, drift: 0.012, model: { pos: [0, bob, dz] } },
        });
        list.push({ S: this.stack.wire[l], o: { width: 1, gain: 0.20 * stackOn * life * breath, color: 'dim', glow: 0.15, fog: 16, model: { pos: [0, bob, dz] } } });
      }
    }
    // the lattice: the cage the film spent forty shots inside, turning slower than the eye can see
    if (cageOn > 0.001) list.push({ S: this.cage, o: { width: 1, gain: 0.24 * cageOn * life * breath, color: 'dim', glow: 0.12, fog: 20, model: { rot: [0, lt * 0.115, 0] } } });
    // token rain: it falls, it slows, and it never stops — 2.5 world units of easing plus a creep it keeps
    if (rainOn > 0.001) list.push({ S: this.rain, o: { width: 1, gain: 0.38 * rainOn * life * breath, color: 'dim', glow: 0.1, fog: 24, model: { pos: [0, -(2.5 * (1 - Math.exp(-lt / 5)) + 0.08 * lt), -0.6] } } });
    // the aperture: the shot's one full-gain thing while the lyric is being sung, then it closes onto the core
    const eyeScale = (1 - 0.93 * close) * hunt;
    list.push({ P: this.body, o: { size: 1.2, gain: 0.13 * life * breath, color: 'accent', dof: 6, focus: 7.4, twinkle: 0.35, t: d.t, drift: 0.014, model: { scale: eyeScale } } });
    list.push({ P: this.iris, o: { size: 1.35, gain: 1.0 * (1 - 0.78 * close) * life * breath * (1 + d.kick * 0.2), color: 'accent', dof: 5, focus: 7.4, twinkle: 0.18, t: d.t, model: { scale: eyeScale } } });
    list.push({ S: this.blades, o: { width: 1, gain: 0.26 * life * breath * (0.7 + 0.5 * d.kick), color: 'dim', glow: 0.2, model: { scale: 1 + 0.25 * close, rot: [0, 0, close * 0.55 + lt * 0.02] } } });
    // the core: dim behind the aperture, pulsing on the low end, then the only light left in the film
    if (coreOn > 0.001) {
      const nu = (1 + 0.7 * close) * pulse * (1 - 0.85 * prog(lt, 9.6, 11.9, ease.inOutCubic));
      list.push({
        P: this.core.halo,
        o: { size: 1.05, gain: 0.18 * coreOn * life * breath, color: 'accent', dof: 22, focus: 7.4, drift: 0.035, t: d.t, twinkle: 0.4, count: Math.round(1000 * (0.15 + 0.85 * life)) },
      });
      list.push({ P: this.core.nucleus, o: { size: 1.5, gain: 1.4 * (0.22 + 0.68 * close) * coreOn * life * breath * pulse, color: close > 0.35 ? 'hot' : 'fg', dof: 4, focus: 7.4, model: { scale: nu } } });
      list.push({ S: this.core.rays, o: { width: 1, gain: 0.17 * coreOn * life * breath, color: 'hot', glow: 0.4, dof: 8, model: { rot: [0, 0, lt * 0.05] } } });
    }
    dsLight(d, list, {
      cam,
      end: { bloom: 0.5 + 0.25 * life, exposure: lerp(0.86, 0.66, 1 - life) * (1 + 0.06 * d.low), ca: 0.45, radius: 0.55 },
    });

    // ---- the house activity layer: dust crossing the lens, and two CRT lines the frame cannot lose
    dsLife(g, d, { gain: 1.05 * life, dust: 300 });

    // ---- the panel: live while the lyric is, dark long before the frame is
    g.save();
    g.globalAlpha = panel;
    const rows = seg === 0
      ? [['layers', '7 · 225 wide'], ['aperture', close > 0.5 ? 'CLOSING' : 'OPEN'], ['tokens_out', TL.num(TL.roll(d.t, 8.412e9, 7))], ['answer', '—']]
      : seg === 1
        ? [['aperture', 'CLOSING ' + Math.round(close * 100) + '%'], ['levels', 'six, all inside each other'], ['tokens_out', TL.num(TL.roll(d.t, 8.412e9, 7))], ['answer', '—']]
        : [['aperture', Math.round(close * 100) + '%'], ['power down', Math.max(0, 12.1 - lt).toFixed(1) + ' s'], ['core', d.low > 0.5 ? 'FIRING' : 'holding'], ['answer', '—']];
    TL.block(g, d, rows, { x: W - 500, y: 168, hot: [1] });
    TL.log(g, d, this.logs, { x: W - 640, y: H - 250, size: 15, rows: 4, every: 0.9, t0: f.from + 0.5 });
    g.restore();
    dsTele(g, d, { id: 'c44', name: 'show', rows: null, foot: 'the out · everything the film built, at dim', on: panel });

    // the last words in the film: plate 'ghost' — the sentence assembling word by word with its own dimmer echo
    LY.draw(g, d, { mode: 'plate', line: SHW_sung(d.line, d.t), size: 52, y: H - 170, off: [22, -12], alpha: 1 - prog(lt, 8.4, 9.8, ease.inOutCubic) });

    dsScanSweep(g, d, { alpha: 0.055, period: 5.3 });
    dsScanSweep(g, d, { alpha: 0.035, period: 8.1 });

    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.25 + 0.55 * (1 - close) * life),
      flash: 0.12 * Math.max(0, 1 - prog(lt, 2.65, 2.95)),      // the song's last hard hit, at 2:20.2
      vignette: 0.18 + 0.22 * (1 - life),
      fade: prog(lt, 10.9, 11.95, ease.inCubic),                // and then the frame itself
    }, dsLifePost(d, { amount: 2.6 })));
  },
});
