// "Just transformers all the way!" — the drop. The camera lies down on the strip and dives along it: transformer
// blocks printed one after another, LAYER 001, 002, … for as far as the paper goes. The lyric rides on a slip torn
// off the same paper, laid over the lens.
MV.scene('stack', {
  init() {
    const S = (this.S = prSheet({ cpi: 10, lpi: 6, h: H * 15, pic: false }));
    const blockRows = 11, c0 = 36, c1 = 96, labels = ['MASKED MULTI-HEAD ATTENTION', 'ADD & NORM', 'FEED-FORWARD  (4 x D)', 'ADD & NORM'];
    for (let b = 0; b * blockRows + 10 < S.trows; b++) {
      const r = 2 + b * blockRows;
      S.box(c0, r, c1, r + 7, { title: `LAYER ${String(b + 1).padStart(3, '0')}` });
      labels.forEach((l, i) => { S.put(c0 + 4, r + 2 + i, '[ ' + l + ' ]'); if (i % 2 === 0) S.put(c1 - 9, r + 2 + i, '-->(+)'); });
      // a little attention map beside each block
      for (let y = 0; y < 6; y++) { let s = ''; for (let x = 0; x < 12; x++) s += x > y * 2 ? ' ' : '.:+*#@'[Math.min(5, Math.floor(hash(b, x, y) * 6))]; S.put(c1 + 6, r + 1 + y, s, { ink: 0.85 }); }
      S.put(c0 - 14, r + 3, 'X(' + (b + 1) + ')  --+', { ink: 0.85 });
      S.put((c0 + c1) / 2, r + 8, '|'); S.put((c0 + c1) / 2, r + 9, '|'); S.put((c0 + c1) / 2, r + 10, 'V');
    }
    this.L = prSheet({ pic: false });
  },
  render(g, f) {
    const S = this.S, t = f.t, lt = f.lt;
    const dist = 520 * lt + 900 * lt * lt;                     // the dive accelerates
    const cam = { x: W / 2 + 60 * Math.sin(lt * 1.3), y: 300 + dist, z: 0.5, tilt: 1.12, spin: 0.08 * Math.sin(lt * 0.8), fov: 1.1 };
    prPrint(g, S, { cam, seed: 1 });
    // the slip
    const L = this.L.clear(), ln = f.lyrics.get('Just transformers');
    PP.lyric(L, f, ln, 66, 37, { x: 3, align: 'center', red: ['ALL', 'THE', 'WAY!"'], width: 124 });
    const drop = PP.drop(t, ln.words[0].start);
    if (drop < 1) prSlip(g, L, [150, 37 * L.tch - 22 + 260 * drop, W - 300, 3 * L.tch + 44], { rot: -0.012, seed: 4 });
    return { shake: PP.judder(f, 1.4), flash: 0.5 * pulse(t, f.from, 0.2) };
  },
});
