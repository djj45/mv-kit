// "Hundred thousand GPU": the camera starts right on top of one printed chip, [##], and pulls back and back:
// rows and rows of them down the paper, a few busy ones flickering '@', and a counter on the slip racing to 100,000.
MV.scene('gpus', {
  init() {
    const S = (this.S = prSheet({ pic: false, oy: -2.5 * H, h: 6 * H }));
    for (let r = 1; r < S.trows - 1; r += 2) { let s = ''; for (let k = 0; k < 25; k++) s += '[##] '; S.put(4, r, s, { ink: 0.9 }); }
    this.base = S.txt.slice();
    this.slip = prSheet({ pic: false });
  },
  render(g, f) {
    const S = this.S, t = f.t, ln = f.lyrics.get('Hundred thousand'), w = ln.words.map(x => x.start);
    S.txt.set(this.base);
    for (let i = 0; i < 160; i++) {                       // busy chips: their insides flicker per drawing
      const r = 1 + 2 * Math.floor(hash(i, f.tick % 4, 1) * (S.trows / 2 - 1)), k = Math.floor(hash(i, 2) * 25);
      S.put(4 + k * 5 + 1, r, '@@', { red: hash(i, 3) > 0.7 });
    }
    S.dirtyTxt = true;
    const k = ease.inOutCubic(clamp((t - f.from) / (w[2] + 0.5 - f.from)));
    const z = Math.exp(lerp(Math.log(3.2), Math.log(0.3), k));
    prPrint(g, S, { cam: { x: W / 2 + lerp(-180, 0, k), y: lerp(H / 2 + 12, H / 2 - 600, k), z, tilt: 0.75 * k * k, rot: 0.02 }, seed: 1, fog: [3000, 9000] });
    const L = this.slip.clear(), drop = PP.drop(t, w[0]);
    const n = Math.round(100000 * Math.pow(clamp((t - w[0]) / (w[2] - w[0])), 3));
    L.put(66 - 12, 35, 'GPU: ' + n.toLocaleString('en-US').padStart(7, ' '), { x: 2, red: n >= 100000, strike: 2, now: true });
    PP.lyric(L, f, ln, 66, 38, { x: 3, align: 'center', red: ['GPU'], width: 124 });
    if (drop < 1) prSlip(g, L, [260, 35 * L.tch - 22 + 300 * drop, W - 520, 6 * L.tch + 44], { rot: -0.008, seed: 3 });
    return { shake: 2 * f.a.kick };
  },
});
