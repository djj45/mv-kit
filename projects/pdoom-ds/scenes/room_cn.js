// room_cn — "Trapped in the Chinese room". A sealed wire room with symbols crawling on its walls and one small
// point walking around inside it, doing the work. The room is a box of light; the symbols are a field of running
// glyphs on all six faces. Nothing outside the box exists — the frame is the box, and the box is the whole world.
function S2v() { return 2.6; }
MV.scene('room_cn', {
  init() {
    const S = 2.6;
    this.box = LG.wirebox([S * 2, S * 2, S * 2], {});
    // The glyph walls: four vertical faces, each symbol tagged with its face (col[0]) and its column across the
    // face (col[1]). A whole column then crawls up its face as one, which is what turns a static texture into a
    // wall of running symbols — the "trapped in a room full of symbols" idea, literally moving.
    const n = 9000, P = new Float32Array(n * 3), glyph = [];
    const col = new Float32Array(n * 2);
    const rnd = mulberry32(101);
    for (let i = 0; i < n; i++) {
      const face = i % 4, u = rnd() * 2 - 1, v = rnd() * 2 - 1;
      if (face === 0) { P[i * 3] = -S; P[i * 3 + 2] = u * S; }
      else if (face === 1) { P[i * 3] = S; P[i * 3 + 2] = u * S; }
      else if (face === 2) { P[i * 3 + 2] = -S; P[i * 3] = u * S; }
      else { P[i * 3 + 2] = S; P[i * 3] = u * S; }
      P[i * 3 + 1] = v * S;
      col[i * 2] = face; col[i * 2 + 1] = u;
      glyph.push(Math.floor(rnd() * DS_GLYPH.length));
    }
    this.wall = P; this.glyph = glyph; this.col = col;
    this.wallT = new Float32Array(P.length);
    // the scan band: a horizontal ring of points that climbs the walls, so the room is visibly being read
    const band = [], bn = 700;
    for (let i = 0; i < bn; i++) {
      const a = (i / bn) * TAU, r0 = Math.abs(Math.cos(a)), r1 = Math.abs(Math.sin(a));
      const k = (r0 > r1 ? S / r0 : S / r1) * 0.995;
      band.push([Math.cos(a) * k, 0, Math.sin(a) * k]);
    }
    this.bandP = new Float32Array(band.flat());
    // the point that does the work: a small tight cloud, plus its trail
    this.worker = LG.gauss(700, 0.09, { seed: 102 });
    // the rule book: a slab of hairlines that never gets read
    const rules = [];
    for (let k = 0; k < 26; k++) {
      const y = -S + 0.35 + k * 0.185;
      rules.push([[-S + 0.3, y, -S + 0.25], [S * 0.1, y, -S + 0.25]]);
      rules.push([[-S + 0.3, y, S - 0.25], [S * 0.1, y, S - 0.25]]);
    }
    this.rules = LG.pairs(rules, { bright: 0.35 });
    this.dust = LG.ball(900, 5.5, { seed: 103 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const inA = dsIn(d, 0, 1.0, ease.outCubic);
    const outA = dsOut(d, 0.25);
    const S = 2.6;
    // the worker's route: a deterministic path inside the box, one lap per two bars
    const lap = (d.t / 3.636) % 1;
    const wx = Math.cos(lap * TAU) * 1.15, wz = Math.sin(lap * TAU * 2) * 0.9, wy = -0.5 + Math.sin(lap * TAU * 3) * 0.8;

    const p = ease.inOutCubic(clamp(d.lt / Math.max(0.01, d.dur)));
    const cam = dsCam(d, {
      yaw: 0.5 + p * 0.3, pitch: 0.16 - p * 0.1, dist: lerp(11.5, 8.2, p), fov: 34,
      punch: 0.005, seed: 26,
    });

    // every column of symbols crawls up its own face at its own speed, wrapping at the ceiling: a function of
    // t only, so the walls are alive in every single frame without any state between frames
    const W2 = this.wall, WT = this.wallT, S2 = 2 * S2v();
    for (let i = 0; i < this.col.length; i += 2) {
      const face = this.col[i], u = this.col[i + 1];
      const sp = 0.16 + (0.5 + 0.5 * hash(face * 31 + Math.round((u + 1) * 40), 7)) * 0.6;
      let y = this.wall[i * 1.5 + 1] + d.t * sp;
      y = ((y + S2v()) % S2 + S2) % S2 - S2v();                      // wrap into the box
      WT[i * 1.5] = W2[i * 1.5]; WT[i * 1.5 + 1] = y; WT[i * 1.5 + 2] = W2[i * 1.5 + 2];
    }
    WT.__v = (WT.__v || 0) + 1;
    // the glyph walls only light up where the worker is passing
    const list = [
      dsAir(d, this.dust, { gain: 0.16, size: 1.0, dof: 40, drift: 0.04, t: d.t }),
      { S: this.box, o: { width: 1, gain: (0.5 + d.low * 0.25) * inA * outA, color: 'accent', glow: 0.35, fog: 16, dof: 12, focus: 9, model: { rot: [0, Math.sin(d.t * 0.5) * 0.012, 0] } } },
      // the symbols crawl: twinkle makes individual glyphs flicker, drift slides them, and the hue breathes
      // on the kick so the sealed walls themselves are never a static texture
      { P: this.wallT, o: { dynamic: true, size: 1.1, gain: (0.16 + d.kick * 0.05) * inA * outA, color: 'dim', dof: 20, focus: 9, twinkle: 1.0, t: d.t } },
      { P: this.wall, o: { size: 2.2, gain: 0.8 * inA * outA, color: 'accent', dof: 10, focus: 9, count: 900, model: { pos: [wx, wy, wz] } } },
      { S: this.rules, o: { width: 1, gain: 0.3 * inA * outA, color: 'dim', glow: 0.2, dof: 16, model: { pos: [0, 0.4, 0] } } },
      // the scan: one lap of the room up the walls every 1.8 s, and its reflection going back down
      { P: this.bandP, o: { dynamic: true, size: 2.0 + d.kick * 0.8, gain: 0.95 * inA * outA, color: 'hot', dof: 8, focus: 9, model: { pos: [0, ((d.t / 1.8) % 1) * 5.2 - 2.6, 0] } } },
      { P: this.bandP, o: { dynamic: true, size: 1.4, gain: 0.4 * inA * outA, color: 'accent', dof: 12, focus: 9, model: { pos: [0, 2.6 - ((d.t / 2.6) % 1) * 5.2, 0] } } },
      { P: this.worker, o: { size: 2.2, gain: 1.0 * inA * outA, color: 'hot', dof: 6, focus: 9, model: { pos: [wx, wy, wz] } } },
      // the trail: the worker's own path, drawn as a faint line so you can see the loop it cannot leave
      { S: LG.seg(LG.curve(u => [Math.cos(u * TAU) * 1.15, -0.5 + Math.sin(u * TAU * 3) * 0.8, Math.sin(u * TAU * 2) * 0.9], 160).map(q => [q[0], q[1], q[2]]), { bright: 0.3 }), o: { width: 1, gain: 0.22 * inA * outA, color: 'accent', glow: 0.2, dof: 14 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.55, exposure: 0.86, ca: 0.4, radius: 0.5 } });

    g.save();
    g.globalAlpha = inA * outA;
    // the room's own read-out: it knows it is a room
    TL.block(g, d, [
      ['symbols', TL.num(9000)],
      ['understood', '0'],
      ['rulebook', 'SEALED'],
      ['exit', 'NONE'],
    ], { x: W - 460, y: H - 300, hot: [3] });
    // a fake lookup table at the left: the rules the worker is following without reading
    const rows = [];
    for (let i = 0; i < 7; i++) rows.push((hash(i, 4) * 0xffff | 0).toString(16).toUpperCase().padStart(4, '0') + '  →  ' + DS_GLYPH[Math.floor(hash(i, 6) * DS_GLYPH.length)]);
    TL.code(g, d, rows, 120, 200, { size: 15, per: 0.5, t0: f.from + 0.2 });
    TL.stamp(g, d, 'SYMBOL → SYMBOL', 120, 168, { size: 14, track: 5 });
    TL.stamp(g, d, 'NO SEMANTICS ATTACHED', 120, H - 120, { size: 13, track: 4, color: 'warn', alpha: 0.75 });
    g.restore();

    dsLife(g, d, { gain: 1.5, dust: 95 });
    dsScanSweep(g, d, { alpha: 0.13, period: 2.2 });
    dsScanSweep(g, d, { alpha: 0.06, period: 1.1 });
    dsTick(g, d, { x: W - 70, y: 130, rate: 129, label: 'sym/s' });
    dsTele(g, d, { id: 'c10', name: 'room', rows: null, foot: 'sealed box · 9 000 symbols, one worker' });
    LY.draw(g, d, { mode: 'plate', size: 23, y: H - 150 });

    return dsFin(d, { shake: dsShake(d, 0.6 + d.kick * 0.9, 31), vignette: 0.34, grain: 0.04 });
  },
});
