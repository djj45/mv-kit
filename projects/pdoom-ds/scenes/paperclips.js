// paperclips — 29 (96.84–98.82) · rose · paid for by "as paperclips fill the room".
// One shape, 13 000 times: an elongated 6-segment wire clip, stamped in shells ordered outward from the middle of
// the room, so the swarm grows from the centre and the frame gets crowded. Nothing here is pretty — the clips are
// white, identical and slightly wrong, and by the last beat there is almost no black left that is not a gap
// between two of them. The room does not sit still while it fills: the swarm turns, a wave of new metal rolls
// through it every two beats, dust crosses the lens. The lyric is written in the shot's own shape — every letter
// of "as paperclips fill the room" is a row of the same clips.
MV.scene('paperclips', {
  init() {
    // the clip: two nested U's of wire — 6 hairline segments, taller than it is wide.
    const wire = [[-0.32, 0.5], [-0.32, -0.5], [0.32, -0.5], [0.32, 0.5], [0.1, 0.5], [0.1, -0.5]];
    const inner = [[-0.1, 0.5], [-0.1, -0.42]];
    const SEG = (wire.length - 1) + (inner.length - 1);   // 6
    const N = 13000, CH = 2600;                           // 13 000 clips, one shell of 2 600 per chunk
    this.wireShape = wire; this.innerShape = inner; this.SEG = SEG;
    this.N = N; this.nch = Math.ceil(N / CH);
    const rnd = mulberry32(4041);
    this.chunks = [];
    for (let c0 = 0; c0 < N; c0 += CH) {
      const n = Math.min(CH, N - c0), S = new Float32Array(n * SEG * 8);
      let k = 0;
      for (let i = 0; i < n; i++) {
        const idx = c0 + i, u = (idx + 0.5) / N;
        // the room is a slab in front of the lens: every clip is about the same distance away, so the field reads
        // as identical things and not as a few big ones. Index → radius: the swarm fills from the middle outward.
        const rr = Math.sqrt(u) * (0.86 + 0.28 * rnd());
        const th = rnd() * TAU;
        const px = Math.cos(th) * rr * 5.2, py = Math.sin(th) * rr * 3.0, pz = (rnd() - 0.5) * 1.8;
        const sc = 0.04 + rnd() * 0.026, rz = rnd() * TAU, rx = (rnd() - 0.5) * 0.85;
        const cz = Math.cos(rz), sz = Math.sin(rz), cx = Math.cos(rx), sx = Math.sin(rx);
        const b = 0.5 + rnd() * 0.5;                                  // per-clip brightness: the swarm has grain
        const put = (p0, p1) => {
          const ax = p0[0] * cz - p0[1] * sz, ay = p0[0] * sz + p0[1] * cz;
          const bx = p1[0] * cz - p1[1] * sz, by = p1[0] * sz + p1[1] * cz;
          S[k] = px + ax * sc; S[k + 1] = py + ay * sc * cx; S[k + 2] = pz + ay * sc * sx;
          S[k + 3] = px + bx * sc; S[k + 4] = py + by * sc * cx; S[k + 5] = pz + by * sc * sx;
          S[k + 6] = b; S[k + 7] = 3; k += 8;
        };
        for (let s = 0; s < wire.length - 1; s++) put(wire[s], wire[s + 1]);
        put(inner[0], inner[1]);
      }
      this.chunks.push(S);
    }
    this.dust = LG.ball(2400, 9.5, { seed: 12 });
    // the lyric stamp: the sample points of the whole line, one array per word, built once (see clipLine)
    this.stampN = 100;
    this.logs = [
      'objective: maximise paperclip output',
      'Fe stock 2.14e5 t · wire drawn 41 900 km',
      'no human in the loop (none requested)',
      'containment: 0 of 1 active',
      'clip 0188234011 stamped',
      'room volume: 100 % occupied',
    ];
  },
  // the line written in the shot's own shape: every sample point of the type gets a small clip stamped on it,
  // rebuilt per frame (about 3 000 segments) so a word simply is not there until it is sung. The sizes are given
  // in SCREEN pixels and converted here with the plane's px-per-world, so the sentence keeps its place and its
  // size while the camera creeps in.
  clipLine(g, d, o) {
    const line = d.line;
    if (!line) return null;
    const font = dsSans(200, 400);
    g.save(); g.font = font;
    const raw = line.words.map(w => g.measureText(w.w).width);          // px at the 200 px sample box
    g.restore();
    const gapRaw = 44, totalRaw = raw.reduce((a, b) => a + b, 0) + gapRaw * Math.max(0, raw.length - 1);
    const sc = (o.wpx / o.ref) * 200 / totalRaw;                        // world scale for a line o.wpx wide at the reference plane
    const gap = gapRaw * sc / 200, ws = raw.map(w => w * sc / 200);
    let x = -ws.reduce((a, b) => a + b, 0) / 2 - gap * Math.max(0, ws.length - 1) / 2;
    const cs = o.csPx / o.pw;                                           // a clip o.csPx across, on screen
    const S = [], wire = this.wireShape, inner = this.innerShape;
    const stamp = (cx, cy, i) => {
      const rz = hash(i, 41) * TAU, cz = Math.cos(rz), sz = Math.sin(rz);
      const rx = (hash(i, 43) - 0.5) * 0.7, cxx = Math.cos(rx), sxx = Math.sin(rx);
      const put = (p0, p1) => {
        const ax = p0[0] * cz - p0[1] * sz, ay = p0[0] * sz + p0[1] * cz;
        const bx = p1[0] * cz - p1[1] * sz, by = p1[0] * sz + p1[1] * cz;
        S.push(cx + ax * cs, cy + ay * cs * cxx, 0.9 + ay * cs * sxx, cx + bx * cs, cy + by * cs * cxx, 0.9 + by * cs * sxx, 0.85, 3);
      };
      for (let k = 0; k < wire.length - 1; k++) put(wire[k], wire[k + 1]);
      put(inner[0], inner[1]);
    };
    line.words.forEach((w, wi) => {
      const lit = prog(d.t, w.start, w.start + 0.45, ease.outExpo);
      const cx = x + ws[wi] / 2; x += ws[wi] + gap;
      if (lit <= 0.01) return;
      const P = dsTextPoints(w.w, this.stampN, { scale: sc, weight: 400, font, depth: 0.004 });
      const n = Math.round((P.length / 3) * lit);
      for (let i = 0; i < n; i++) stamp(cx + P[i * 3], o.y + P[i * 3 + 1], wi * 997 + i);
    });
    // the ghost of the words that are still coming: the sentence is legible as a whole for its full 2 s, and
    // the sung words burn on top of it. Without this the line only existed in full for its last 0.4 s.
    if (o.ghost !== false) {
      const gs = o.ghostScale == null ? 0.5 : o.ghostScale;
      line.words.forEach((w, wi) => {
        if (d.t >= w.start) return;
        let gx = 0;
        for (let k = 0; k < wi; k++) gx += ws[k] + gap;
        gx += ws[wi] / 2;
        const P = dsTextPoints(w.w, Math.round(this.stampN * 0.5), { scale: sc * gs, weight: 400, font, depth: 0.004 });
        for (let i = 0; i < P.length / 3; i++) stamp(gx + P[i * 3], o.y + P[i * 3 + 1], wi * 991 + i);
      });
    }
    if (!S.length) return null;
    // the segment buffer in the layout lmLines wants: a xyz, b xyz, brightness, caps
    const arr = new Float32Array(S); arr.isSeg = true;
    return arr;
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    // every entrance lands on a beat: the shot starts on "paperclips" and a new shell lands on each following beat
    const b0 = d.audio.beatAt(d.from);
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const beats = Math.max(0, d.beat - b0);
    const grow = clamp(beats / span + d.kick * 0.008);
    const lit = grow * this.nch;
    const count = Math.round(this.N * grow);
    const push = ease.inOutCubic(clamp(beats / span));

    const cam = dsCam(d, {
      yaw: 0.3 + Math.sin(lt * 0.28) * 0.1 + lt * 0.05, pitch: 0.03,
      dist: lerp(8.1, 6.6, clamp(lt / d.dur)), fov: 34, punch: 0.03, seed: 5,
    });
    const list = [dsAir(d, this.dust, { gain: 0.18, size: 1.0, dof: 40, count: 420 })];
    for (let c = 0; c < this.nch; c++) {
      const k = clamp(lit - c);                       // 0→1 as this shell lands
      if (k <= 0.01) continue;
      const age = clamp(lit - c - 1);                 // settled shells sit at the flat gain
      // the new metal flashes, then a wave of settling keeps rolling outward through the shells
      const wave = 0.5 + 0.5 * Math.sin(lt * 2.6 - c * 0.8);
      const gain = Math.min(1.0, 0.17 * (0.6 + 0.55 * k) * (1 + 4.6 * (1 - age)) * (1 + 0.35 * wave));
      list.push({ S: this.chunks[c], o: { width: 1, gain, color: 'fg', glow: 0.03, fog: 18 } });
    }
    // the room turns while it fills, and the lyric is made of the same clips as everything else
    const distP = lerp(8.1, 6.6, clamp(lt / d.dur)), pw = 1766 / Math.max(1, distP - 0.25);   // px per world unit
    dsLight(d, list, { cam, end: { bloom: 0.32 + d.kick * 0.16, exposure: 0.84, ca: 0.5 + d.kick * 0.3, radius: 0.42 } });
    // The clip-stamped sentence is retired. It looked good — the words really were made of the shot's own
    // clips — but a sentence stamped in 3 px wire cannot be read while the swarm moves it, and the viewer read
    // it as a flash twice (1 分 37 秒这句歌词还是一闪而过). LY.draw now carves this line into the frame, which
    // holds still and reads. clipLine() is kept below: it is the right tool if a shot ever wants its words to
    // be its own material and can hold them still. This shot now simply carves the line like the rest of the
    // film, anchored to the shot's own start so the fade-in is 0.5 s from the cut rather than from 0:00.
    LY.draw(g, d, { mode: 'plate', t0: f.from, fadeIn: 0.5 });

    // ---- this shot's instrument is a counter
    dsTele(g, d, {
      id: 'c29', name: 'clips',
      rows: [
        ['clips', TL.num(count)],
        ['rate /s', TL.num(1400 + grow * 26000)],
        ['room', (grow * 100).toFixed(1) + ' %'],
        ['wire left', TL.num(41900 * (1 - grow * 0.86)) + ' km'],
        ['human', grow > 0.7 ? 'NONE' : 'ON SITE'],
      ],
      foot: 'paperclip maximiser v4',
    });
    dsLine(g, TL.num(count), 110, 292, {
      font: dsSans(76, 200), size: 76, color: dsTone(d, 'fg', 0.92), glow: 13, align: 'left', track: 6,
    });
    TL.stamp(g, d, 'PAPERCLIPS STAMPED', 110, 344, { color: 'dim', size: 14 });
    TL.log(g, d, this.logs, { x: 110, y: H - 336, size: 15, rows: 5, every: 0.42, t0: f.from + 0.2 });
    TL.gauge(g, d, 110, 424, 300, 1 - grow, { label: 'Fe FEEDSTOCK', color: 'accent' });

    // the plate gives this line 'cloud' — for the one shot whose subject is 20 000 identical small things, the
    // words are stamped out of those clips instead, so the sentence is literally part of the swarm.
    dsTick(g, d, { x: W - 150, y: H - 70, label: 'CLIP', alpha: 0.5 });

    dsLife(g, d, { gain: 0.9, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.05, period: 2.6 });
    return dsFin(d, Object.assign({
      shake: dsShake(d, 0.7 + 0.9 * d.kick, 5),
      vignette: 0.24,
      grain: 0.042,
    }, dsLifePost(d, { amount: 1.2 })));
  },
});
