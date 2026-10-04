// scenes/atoms.js — a drawn figure comes apart into a cloud of dots on "atoms" and the dots rearrange into
// something else on "rearranging"; they only move on the beat.
MV.scene('atoms', {
  init() {
    this.dots = [];
    const fig = [];
    for (let i = 0; i < 420; i++) {
      const u = hash(i, 3, 11), v = hash(i, 7, 5);
      // a body: head disc + trunk + arms + legs, sampled
      let p;
      if (i % 7 === 0) { const a = u * TAU; p = [Math.cos(a) * 34, -250 + Math.sin(a) * 34]; }
      else if (i % 7 < 4) p = [(v - 0.5) * 60, -215 + u * 130];
      else if (i % 7 === 4) p = [(v - 0.5) * 280, -180 + u * 40];
      else if (i % 7 === 5) p = [(v - 0.5) * 60 - 20, -85 + u * 85];
      else p = [(v - 0.5) * 60 + 20, -85 + u * 85];
      fig.push(p);
      // the scatter and the target: a spiral of dots, then a ring
      const a2 = u * TAU * 3 + v, r2 = 40 + 300 * v;
      this.dots.push({
        f: p,
        s: [(hash(i, 2, 3) - 0.5) * 1500, (hash(i, 4, 6) - 0.5) * 800],
        t: [Math.cos(a2) * r2, Math.sin(a2) * r2 * 0.8],
        h: hash(i, 9, 4),
      });
    }
  },
  render(g, f) {
    OHP.back(g, f, {});
    const L15 = f.lyrics.get('atoms rearranging');
    const w1 = L15.words[0], w2 = L15.words[L15.words.length - 1];
    const k1 = prog(f.t, w1.start, w1.start + 1.2, ease.inOutCubic);
    const k2 = prog(f.t, w2.start, w2.start + 1.1, ease.inOutCubic);
    const beat = Math.round(f.beat);
    const jitter = (hash(beat, 7, 3) - 0.5) * 6;
    const cx = 900, cy = 540;
    for (let i = 0; i < this.dots.length; i++) {
      const d = this.dots[i];
      const x = lerp(lerp(cx + d.f[0], cx + d.s[0], k1), cx + d.t[0], k2) + jitter * d.h;
      const y = lerp(lerp(cy + d.f[1], cy + d.s[1], k1), cy + d.t[1], k2) + jitter * (1 - d.h);
      g.fillStyle = i % 23 === 0 ? OHP.C.red : OHP.C.ink;
      g.beginPath(); g.arc(x, y, 3.4 + 2.4 * d.h, 0, TAU); g.fill();
    }
    MV.focus(cx, cy, 'the dots');
    OHP.dust(g, f, {});
    OHP.slide(g, f, 13, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 260, y: 930, size: 60, style: 'hand', maxW: 1400 });
    return OHP.post(f, { shake: 5 + 6 * k1 * (1 - k2), snare: 0.05 });
  },
});

