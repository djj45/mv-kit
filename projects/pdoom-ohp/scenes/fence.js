// scenes/fence.js — post-Chinchilla: the stack comes through the safety fence, and the posts break one at a time.
MV.scene('fence', {
  init() { this.n = 9; },
  render(g, f) {
    OHP.back(g, f, { red: 0.35 });
    const y0 = 760, x0 = 160, x1 = 1760, step = (x1 - x0) / (this.n - 1);
    const L37 = f.lyrics.get('safety fence');
    const hit = prog(f.t, f.from + 0.6, L37.words[L37.words.length - 1].end);
    for (let i = 0; i < this.n; i++) {
      const x = x0 + i * step;
      const broken = i < Math.round(hit * this.n);
      const lean = broken ? 0.6 + hash(i, 3, 7) * 0.5 : 0;
      g.save(); g.translate(x, y0); g.rotate(lean * (i % 2 ? 1 : -1) * 0.5);
      OHP.ink(g, f, [[0, 0], [0, -300 + (broken ? 60 : 0)]], { w: 12, color: broken ? OHP.C.ink2 : OHP.C.ink, seed: i, boil: 1.2 });
      g.restore();
      if (broken && lean > 0) {                            // the broken piece, falling
        const age = clamp((hit * this.n - i) * 0.4);
        g.save(); g.translate(x + lean * 220 * age, y0 - 240 - 520 * age * age); g.rotate(lean * 1.6);
        OHP.ink(g, f, [[-90, 0], [90, 0]], { w: 11, color: OHP.C.ink2, seed: i + 9, boil: 1.0 });
        g.restore();
      }
    }
    // the rails
    OHP.ink(g, f, [[x0, y0 - 300], [x1, y0 - 300]], { w: 8, color: OHP.C.ink2, seed: 31, upto: 1 - hit * 0.8 });
    OHP.ink(g, f, [[x0, y0 - 170], [x1, y0 - 170]], { w: 8, color: OHP.C.ink2, seed: 32, upto: 1 - hit * 0.5 });
    // the stack, arriving from the right
    for (let i = 0; i < 5; i++) {
      const x = lerp(1900, 1360, ease.outCubic(clamp(hit * 1.3)));
      OHP.block(g, f, x - 60, y0 - 520 + i * 110, 300, 96, { color: OHP.C.ink, w: 7, seed: 40 + i });
      OHP.clip(g, x + 140, y0 - 470 + i * 110, 60, 0.2, 0.45);
    }
    MV.focus(lerp(1900, 1360, ease.outCubic(clamp(hit * 1.3))) - 60, y0 - 300, 'the stack');
    OHP.dust(g, f, { gain: 1.1 });
    OHP.slide(g, f, 29, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 260, y: 930, size: 58, style: 'hand', maxW: 1400 });
    return OHP.post(f, { shake: 9 + 10 * hit, snare: 0.08 });
  },
});

