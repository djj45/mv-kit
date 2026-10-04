// scenes/rlhf.js — RLHF goes askew: the preference points line up in a tidy row and then the whole ordering
// falls apart. (The next shot reflows these dots into the hook's strokes.)
MV.scene('rlhf', {
  init() {
    this.p = [];
    for (let i = 0; i < 180; i++) this.p.push([hash(i, 3, 7), hash(i, 5, 9), hash(i, 11, 2)]);
  },
  render(g, f) {
    OHP.back(g, f, { red: 0.3 });
    const L39 = f.lyrics.get('askew');
    const askew = L39.words[L39.words.length - 1];
    const k = prog(f.t, askew.start - 0.15, askew.start + 0.9, ease.inQuad);
    const cx = 900, cy = 560, beat = Math.round(f.beat);
    for (let i = 0; i < this.p.length; i++) {
      const d = this.p[i];
      const u = i / this.p.length;
      // tidy: a row of pairs sorted by "preference"; askew: a collapsing heap
      const ax = 240 + u * 1440, ay = 620 + Math.sin(u * 12) * 60;
      const bx = cx + (d[0] - 0.5) * 1500, by = cy + (d[1] - 0.5) * 700 + 220 * (1 - d[2]);
      const x = lerp(ax, bx, k) + (hash(beat, i, 3) - 0.5) * 10 * k;
      const y = lerp(ay, by, k) + (hash(beat, i, 5) - 0.5) * 10 * k;
      const sorted = !k;
      g.fillStyle = d[2] > 0.86 ? OHP.C.red : (sorted ? 'rgba(46,92,158,0.85)' : 'rgba(46,92,158,0.6)');
      g.beginPath(); g.arc(x, y, 7 + 5 * d[0], 0, TAU); g.fill();
    }
    MV.focus(k > 0.5 ? cx : 900, k > 0.5 ? cy + 120 : 620, k > 0.5 ? 'the heap' : 'the row');
    // a sorting ruler above the row
    OHP.ink(g, f, [[240, 500], [1680, 500]], { w: 5, color: OHP.C.ink2, seed: 21, upto: 1 - k });
    OHP.dust(g, f, {});
    OHP.slide(g, f, 31, { x: 120, y: 74 });
    MV.overlay(o => OHP.lyricBig(o, f, { x: 260, y: 930, small: 68, bigSize: 110, big: t => /askew/i.test(t), color: OHP.C.ink, bigColor: OHP.C.red, maxW: 1500 }));
    return OHP.post(f, { shake: 7 + 26 * k, snare: 0.06 + 0.1 * k, flash: 0.12 * k });
  },
});

