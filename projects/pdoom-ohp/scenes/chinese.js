// scenes/chinese.js — Searle's room: a box with a slot, cards in, answers out, question marks inside. On
// "shrooms" the whole room comes loose (misregistered like a bad print) and the bag is taped to the side.
MV.scene('chinese', {
  render(g, f) {
    const hash0 = f.lyrics.get('bag of shrooms');
    const trip = prog(f.t, hash0.words[hash0.words.length - 1].start - 0.1, hash0.words[hash0.words.length - 1].start + 1.1, ease.inOutQuad);
    OHP.back(g, f, { red: 0.12 * trip });
    const bx = 620, by = 250, bw = 720, bh = 520;
    const draw = (g2, dx, dy, col, a) => {
      g2.save(); g2.globalAlpha = a;
      OHP.block(g2, f, bx + dx, by + dy, bw, bh, { color: col, w: 9, seed: 3 });
      // slot
      OHP.block(g2, f, bx + 60 + dx, by + 200 + dy, 110, 34, { color: col, w: 6, seed: 4 });
      // answers coming out on the right
      for (let i = 0; i < 4; i++) OHP.block(g2, f, bx + bw - 40 + dx + i * 34, by + 120 + i * 70 + dy, 90, 44, { color: col, w: 5, seed: 10 + i });
      g2.restore();
    };
    if (trip > 0.02) { draw(g, -8 * trip, 3 * trip, '#8E3A32', 0.35); draw(g, 7 * trip, -3 * trip, '#2C5C9E', 0.35); }
    draw(g, 0, 0, OHP.C.ink, 1);
    // the question marks inside
    g.save(); g.fillStyle = OHP.C.ink2;
    for (let i = 0; i < 14; i++) {
      const x = bx + 90 + hash(i, 3, 5) * (bw - 200), y = by + 60 + hash(i, 5, 6) * (bh - 140);
      OHP.F.hand(g, 40 + hash(i, 7, 2) * 26); g.globalAlpha = 0.5 + 0.4 * hash(i, 9, 3);
      g.fillText('?', x + 4 * trip * noise1(f.t * 3 + i, 4), y);
    }
    g.restore();
    // the bag of shrooms taped to the side
    const BG = OHP.label(g, f, bx + bw + 90, by + 300, 300, 230, ['SHROOMS'], { size: 42, name: 'bag' });
    OHP.tape(g, bx + bw + 96, by + 310, -0.4, 70, 24);
    OHP.dust(g, f, {});
    OHP.slide(g, f, 8, { x: 120, y: 74 });
    MV.focus(bx + 60 + 60, by + 200 + 17, 'the slot');
    const L = f.lyrics.lineAt(f.t, f.from);
    const bagLine = L && /shrooms/.test(L.text);
    OHP.lyric(g, f, bagLine
      ? { x: 250, y: 930, size: 62, style: 'hand', maxW: 1420 }
      : { x: 250, y: 920, size: 60, style: 'hand', maxW: 1420 });
    return OHP.post(f, { shake: 5 + 8 * trip, snare: 0.05 });
  },
});

