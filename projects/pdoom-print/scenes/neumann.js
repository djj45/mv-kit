// "Now von Neumann's obsolete": the architecture every computer has had since 1945, printed as a block diagram —
// input, output, memory, control unit, ALU, the bus — and on "obsolete" crossed out in red and stamped.
MV.scene('neumann', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('von Neumann'), tOb = ln.words[3].start;
    PP.header(S, f, f.params.page);
    const t0 = f.from + 0.1, step = 0.227;
    const box = (i, c0, r0, c1, r1, title, lines) => {
      if (t < t0 + i * step) return;
      S.box(c0, r0, c1, r1, { title });
      lines.forEach((l, j) => S.put(c0 + 3, r0 + 2 + j, l, { ink: 0.85 }));
    };
    box(0, 44, 3, 88, 15, 'CENTRAL PROCESSING UNIT', []);
    box(1, 48, 6, 84, 9, 'CONTROL UNIT', ['FETCH  DECODE  EXECUTE']);
    box(2, 48, 11, 84, 14, 'ARITHMETIC / LOGIC', ['ADD  SUB  AND  OR']);
    box(3, 8, 6, 34, 12, 'INPUT', ['CARD READER', 'KEYBOARD']);
    box(4, 98, 6, 124, 12, 'OUTPUT', ['LINE PRINTER', '(THAT IS ME)']);
    box(5, 44, 20, 88, 28, 'MEMORY', ['PROGRAM AND DATA', 'IN THE SAME STORE', '4096 WORDS']);
    if (t >= t0 + 6 * step) {
      S.put(35, 9, '------>', {}); S.put(89, 9, '------>', {});
      for (let r = 16; r <= 19; r++) S.put(66, r, r === 19 ? 'V' : '|'); for (let r = 16; r <= 19; r++) S.put(62, r, r === 16 ? '^' : '|');
      S.put(70, 17, 'THE BUS', { ink: 0.8 }); S.put(70, 18, '(THE BOTTLENECK)', { ink: 0.7 });
    }
    S.put(8, 31, 'VON NEUMANN ARCHITECTURE, 1945', { ink: 0.8 });
    // obsolete: two red strokes across the whole diagram, then the stamp
    const k = clamp((tq - tOb) / 0.25);
    if (k > 0) {
      c.strokeStyle = '#ff0000'; c.lineWidth = 26; c.lineCap = 'round';
      c.beginPath(); c.moveTo(120, 90); c.lineTo(lerp(120, 1800, k), lerp(90, 720, k)); c.stroke();
      const k2 = clamp((tq - tOb - 0.12) / 0.25);
      if (k2 > 0) { c.beginPath(); c.moveTo(1800, 90); c.lineTo(lerp(1800, 120, k2), lerp(90, 720, k2)); c.stroke(); }

    }
    PP.stampText(S, f, 'OBSOLETE', 66, 13, 7, tOb + 0.3);
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['OBSOLETE'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.88, 0.95, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 14 * pulse(t, tOb + 0.3, 0.2) };
  },
});
