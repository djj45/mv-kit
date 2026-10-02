// "Too late now, we lit the fuse": a fuse of '-' winds across the page to a round black bomb. On "lit" a red spark
// starts down it; what it has burnt is left as a trail of dots, and it is still burning when we cut away.
MV.scene('fuse', {
  init() {
    this.S = prSheet({ cpi: 15, lpi: 8 });
    this.path = []; for (let i = 0; i <= 220; i++) { const u = i / 220; this.path.push([160 + u * 1340, 300 + 190 * Math.sin(u * 9.5) * (1 - 0.4 * u)]); }
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('lit the fuse'), w = ln.words.map(x => x.start), tLit = w[4];
    PP.header(S, f, f.params.page);
    // the bomb
    const [ex, ey] = this.path[this.path.length - 1], bx = ex + 140, by = ey + 60;
    c.fillStyle = '#000'; c.beginPath(); c.arc(bx, by + 60, 150, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(bx - 55, by + 5, 30, 0, TAU); c.fill();
    c.fillStyle = '#000'; c.fillRect(bx - 40, by - 110, 80, 40);
    // burning: the spark's position along the fuse
    const burn = tq < tLit ? 0 : Math.min(0.92, (tq - tLit) * 0.36);
    const n = this.path.length, ib = Math.floor(burn * n);
    let acc = 0;
    for (let i = 1; i < n; i++) {
      acc += Math.hypot(this.path[i][0] - this.path[i - 1][0], this.path[i][1] - this.path[i - 1][1]);
      if (acc < S.tcw * 0.9) continue; acc = 0;
      const [cc, rr] = S.tcell(...this.path[i]);
      S.put(cc, rr, i < ib ? '.' : '-', { now: true, ink: i < ib ? 0.6 : 1, strike: i < ib ? 1 : 2 });
    }
    if (burn > 0) {
      const [sx, sy] = this.path[Math.max(1, ib)];
      const [cc, rr] = S.tcell(sx, sy); S.put(cc, rr, '*', { red: true, strike: 3, now: true });
      for (let k = 0; k < 6; k++) { const a = hash(f.tick, k) * TAU, d = 1 + hash(f.tick, k, 2) * 2; S.put(Math.round(cc + Math.cos(a) * d * 1.6), Math.round(rr + Math.sin(a) * d), hash(k, f.tick, 3) > 0.5 ? '*' : '+', { red: true, now: true }); }
    }
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['LIT', 'FUSE'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2 + 60 * burn, y: H / 2 + 10, z: lerp(0.9, 1.0, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 8 * pulse(t, tLit, 0.2), flash: 0.15 * pulse(t, tLit, 0.1) };
  },
});
