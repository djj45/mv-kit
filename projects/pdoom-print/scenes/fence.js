// "Breaking through each safety fence": the camera lies down and charges up the strip; every beat it meets another
// fence printed across the paper — SAFETY FENCE 1, 2, 3 … — and the middle of it bursts apart as we go through.
// The lyric rides on a slip.
MV.scene('fence', {
  init() {
    this.gap = 14; this.n = 12; this.S = prSheet({ pic: false, oy: -this.n * this.gap * (W / 13.2 / 6) - 200, h: this.n * this.gap * (W / 13.2 / 6) + 1400 });
    this.slip = prSheet({ pic: false });
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, A = f.audio, ln = f.lyrics.get('safety fence'), w = ln.words.map(x => x.start);
    const rowH = S.tch, b0 = A.beatAt(f.from), bNow = A.beatAt(t) - b0;
    const fenceY = i => -i * this.gap * rowH;                          // paper y of fence i (i = 1.. ahead)
    const adv = Math.floor(bNow) + ease.inOutCubic(bNow - Math.floor(bNow));   // one fence per beat, surging on the beat
    const camY = H / 2 + 300 - adv * this.gap * rowH;
    for (let i = 1; i <= this.n; i++) {
      const yf = fenceY(i), row = Math.round((yf - S.oy) / rowH), age = (H / 2 + 300 - (i - 0.35) * this.gap * rowH - camY) / (this.gap * rowH) * (60 / A.bpm);
      const broke = age > 0;
      for (let c = 6; c <= S.tcols - 8; c += 2) {
        const mid = Math.abs(c - 66) < 18, ch = c % 8 === 6 ? '#' : '=', red = i % 3 === 0;
        if (!broke || !mid) { S.put(c, row, ch, { x: 2, red, strike: 2, now: true }); if (c % 8 === 6) S.put(c, row - 2, '#', { x: 2, red, strike: 2, now: true }); continue; }
        const side = c < 66 ? -1 : 1, sp = 18 + 30 * hash(i, c), fly = Math.min(age, 0.6);
        S.put(Math.round(c + side * sp * fly * 2), Math.round(row + 26 * fly * fly + hash(c, i) * 6 * fly), hash(c, i, 2) > 0.5 ? '/' : '\\', { x: 2, red, now: true });
      }
      S.put(10, row - 4, `SAFETY FENCE ${i}  -  DO NOT CROSS`, { x: 2, ink: 0.85, now: true });
    }
    prPrint(g, S, { cam: { x: W / 2, y: camY, z: 0.6, tilt: 1.12, spin: 0.03 * Math.sin(t * 2) }, seed: 1, fog: [7000, 18000] });
    const L = this.slip.clear(), drop = PP.drop(t, w[0]);
    PP.lyric(L, f, ln, 66, 37, { x: 3, align: 'center', red: ['FENCE'], width: 124 });
    if (drop < 1) prSlip(g, L, [150, 37 * L.tch - 22 + 260 * drop, W - 300, 3 * L.tch + 44], { rot: 0.01, seed: 8 });
    return { shake: 4 * f.a.kick + 6 * f.a.snare };
  },
});
