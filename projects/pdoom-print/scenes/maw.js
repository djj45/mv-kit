// "ChatGPT, please don't eat me alive": a mouth as big as the page — red gums, white teeth — opening while the name
// is sung, then closing one step per word ("please", "don't", "eat", "me") on a small printed person standing on
// its lower jaw, and slamming shut on "alive". The plea is typed below as a chat line.
MV.scene('maw', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('ChatGPT'), w = ln.words.map(x => x.start), c = S.g;
    PP.header(S, f, f.params.page);
    // gap between the jaws (px): opens during "ChatGPT,", steps shut on each word, slams on "alive"
    let gap = lerp(80, 430, ease.inOutCubic(clamp((tq - w[0]) / 1.8)));
    for (let i = 1; i <= 4; i++) gap -= 72 * ease.outCubic(clamp((tq - w[i]) / 0.12));
    gap = Math.max(0, gap - 160 * ease.inExpo(clamp((tq - w[5] + 0.06) / 0.08)));
    const cx = W / 2, mid = 420, mw = 1480, hw = mw / 2;
    // the opening is a lens: widest in the middle, the jaws meeting at the corners of the mouth
    const N = 48, xs = [...Array(N + 1)].map((_, i) => cx - hw + (i / N) * mw);
    const open = x => (gap / 2) * Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / hw, 2)));
    const jaw = dir => {                  // dir -1: upper jaw, +1: lower
      const outer = dir < 0 ? Math.max(96, mid - gap / 2 - 300) : mid + gap / 2 + 200;
      c.fillStyle = '#ff0000'; c.strokeStyle = '#000'; c.lineWidth = 8; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(cx - hw - 40, mid);
      xs.forEach(x => c.lineTo(x, mid + dir * open(x)));
      c.lineTo(cx + hw + 40, mid); c.quadraticCurveTo(cx + hw + 30, outer, cx + hw * 0.6, outer); c.lineTo(cx - hw * 0.6, outer);
      c.quadraticCurveTo(cx - hw - 30, outer, cx - hw - 40, mid); c.closePath(); c.fill(); c.stroke();
      // teeth along the gum line, pointing into the opening; the canines longer
      const n = 14;
      for (let i = 0; i < n; i++) {
        const xa = cx - hw * 0.86 + (i / n) * hw * 1.72, xb = xa + hw * 1.72 / n, xm = (xa + xb) / 2;
        const ya = mid + dir * open(xa), yb = mid + dir * open(xb), ym = mid + dir * open(xm);
        const len = Math.min(open(xm) * 0.95, (i === 2 || i === n - 3 ? 1.6 : 1) * 80 * (0.6 + 0.4 * Math.sqrt(1 - Math.pow((xm - cx) / hw, 2))));
        c.fillStyle = '#fff'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(xa + 3, ya); c.lineTo(xm, ym - dir * len); c.lineTo(xb - 3, yb); c.closePath(); c.fill(); c.stroke();
      }
    };
    // the person, pleading (kneels on "please"), on the floor of the mouth
    const dn = mid + gap / 2;
    if (gap > 40) PP.person(c, cx, dn - 10, Math.min(300, gap * 0.78), { pose: tq >= w[1] ? 'kneel' : 'stand' });
    jaw(1); jaw(-1);
    // the plea, typed as a chat line
    PP.lyric(S, f, ln, 20, 37, { x: 3, prefix: '> ', red: ['ALIVE'], width: 108 });
    const z = lerp(0.86, 0.98, ease.inQuad(f.p)), slam = pulse(t, w[5], 0.25);
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 20, z }, seed: f.tick, key: f.tick });
    return { shake: 3 * f.a.kick + 22 * slam, flash: 0.15 * pulse(t, w[5], 0.1) };
  },
});
