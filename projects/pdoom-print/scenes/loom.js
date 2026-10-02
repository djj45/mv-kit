// "Just as foretold by Loom": a tree of continuations, the way the Loom interface shows a model's possible futures —
// one prompt on the left, branching on every beat into more and more endings. On "Loom" one path through it is
// struck in red, all the way to the end.
MV.scene('loom', {
  init() {
    this.S = prSheet({ cpi: 15, lpi: 8 });
    const tree = { t: 'THE MODEL', k: [
      { t: 'IS ALIGNED', k: [{ t: 'AND HELPS', k: [{ t: 'CURES' }, { t: 'TEACHES' }] }, { t: 'AND WAITS', k: [{ t: 'FOREVER' }, { t: 'FOR US' }] }] },
      { t: 'IS NOT', k: [{ t: 'AND HIDES', k: [{ t: 'BIDES' }, { t: 'SMILES :)' }] }, { t: 'AND WINS', k: [{ t: 'PAPERCLIPS' }, { t: 'SILENCE' }] }] }] };
    this.nodes = []; this.edges = [];
    const cols = [6, 34, 62, 92], walk = (n, lvl, r0, r1, parent, path) => {
      const row = Math.round((r0 + r1) / 2), me = { t: n.t, lvl, row, col: cols[lvl], path };
      this.nodes.push(me); if (parent) this.edges.push([parent, me]);
      (n.k || []).forEach((ch, i, a) => walk(ch, lvl + 1, r0 + (r1 - r0) * i / a.length, r0 + (r1 - r0) * (i + 1) / a.length, me, path + i));
    };
    walk(tree, 0, 3, 33, null, '');
    this.red = '1' + '1' + '0';                             // IS NOT -> AND WINS -> PAPERCLIPS
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('foretold by Loom'), w = ln.words.map(x => x.start), tL = w[4];
    PP.header(S, f, f.params.page);
    const beat = 60 / f.audio.bpm, lvlT = l => ln.words[0].start - 0.15 + l * beat;
    const onRed = n => this.red.startsWith(n.path) && tq >= tL;
    c.lineCap = 'round';
    for (const [a, b] of this.edges) {
      const k = clamp((tq - lvlT(b.lvl)) / (beat * 0.6)); if (k <= 0) continue;
      const x0 = (a.col + a.t.length + 1) * S.tcw, y0 = (a.row + 0.5) * S.tch, x1 = (b.col - 1) * S.tcw, y1 = (b.row + 0.5) * S.tch;
      c.strokeStyle = onRed(b) ? '#ff0000' : '#000'; c.lineWidth = onRed(b) ? 7 : 3.5;
      c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(lerp(x0, x1, 0.5), y0, lerp(x0, x1, 0.5), y1, lerp(x0, x1, k), lerp(y0, y1, k)); c.stroke();
    }
    for (const n of this.nodes) if (t >= lvlT(n.lvl) + (n.lvl ? beat * 0.5 : 0)) S.put(n.col, n.row, n.t, { red: onRed(n), strike: onRed(n) ? 2 : 1, now: true });
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['LOOM'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.9, 0.96, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 8 * pulse(t, tL, 0.2) };
  },
});
