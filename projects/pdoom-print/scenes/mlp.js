// "Forward MLP, backward, repeat": a little network printed as nodes and wires. "Forward": black '>' run along
// the wires left to right and the nodes they reach strike '@'; "backward": red '<' run back; "repeat": both, again
// and again, faster, on the beat.
MV.scene('mlp', {
  init() {
    this.S = prSheet({ cpi: 15, lpi: 8 });
    const layers = [4, 7, 7, 3], xs = [260, 720, 1180, 1640];
    this.nodes = layers.map((n, li) => [...Array(n)].map((_, i) => [xs[li], 140 + (i + 0.5) * (620 / n)]));
    this.edges = [];
    for (let li = 0; li < 3; li++) for (const [a, A] of this.nodes[li].entries()) for (const [b, B] of this.nodes[li + 1].entries())
      if (hash(li, a, b) < 0.55) this.edges.push({ li, A, B, k: this.edges.length });
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('Forward MLP'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    c.strokeStyle = '#000'; c.lineWidth = 2.5;
    for (const e of this.edges) { c.beginPath(); c.moveTo(...e.A); c.lineTo(...e.B); c.stroke(); }
    // passes: [start, dir] — forward on "Forward", backward on "backward", then alternating every beat on "repeat"
    const passes = [[w[0], 1], [w[2], -1]];
    const beat = 60 / f.audio.bpm;
    for (let k = 0; k < 6; k++) passes.push([w[3] + k * beat * 0.5, k % 2 ? -1 : 1]);
    let lit = new Set();
    for (const [p0, dir] of passes) {
      const dur = p0 >= w[3] ? beat * 0.5 : 0.9, u = (tq - p0) / dur; if (u < 0 || u > 1.15) continue;
      const pos = dir > 0 ? u * 3 : 3 - u * 3;           // position in layers 0..3
      for (const e of this.edges) {
        const v = pos - e.li; if (v < 0 || v > 1) continue;
        const x = lerp(e.A[0], e.B[0], v), y = lerp(e.A[1], e.B[1], v), [cc, rr] = S.tcell(x, y);
        S.put(cc, rr, dir > 0 ? '>' : '<', { red: dir < 0, strike: 2, now: true });
      }
      lit.add(Math.round(pos));
    }
    this.nodes.forEach((ns, li) => ns.forEach(([x, y]) => {
      const on = lit.has(li);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 34, 0, TAU); c.fill(); c.lineWidth = 7; c.stroke();
      if (on) { c.fillStyle = '#000'; c.beginPath(); c.arc(x, y, 22, 0, TAU); c.fill(); }
    }));
    ['INPUT', 'HIDDEN 1', 'HIDDEN 2', 'OUTPUT'].forEach((l, i) => S.put(Math.round(this.nodes[i][0][0] / S.tcw) - Math.floor(l.length / 2), 32, l, { ink: 0.8 }));
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['BACKWARD,'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: 0.9 }, seed: f.tick, key: f.tick });
    return { shake: 2.5 * f.a.kick };
  },
});
