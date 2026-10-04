// scenes/net.js — forward MLP, backward, repeat: a hand-drawn network that lights up layer by layer and then runs
// backwards, until the line "von Neumann's obsolete" and a big red cross goes through the whole diagram.
MV.scene('net', {
  init() {
    this.L = [4, 6, 6, 3];
    this.nodes = [];
    for (let i = 0; i < this.L.length; i++) {
      const col = [];
      for (let j = 0; j < this.L[i]; j++) col.push([430 + i * 340, 260 + j * (520 / (this.L[i] - 1 || 1)) + (this.L[i] === 1 ? 260 : 0)]);
      this.nodes.push(col);
    }
  },
  render(g, f) {
    OHP.back(g, f, { red: 0.1 });
    const L24 = f.lyrics.get("von Neumann's obsolete");
    const late = f.t >= L24.words[0].start - 0.3;
    const back = f.t >= f.lyrics.get('backward').words[0].start;
    // edges
    for (let i = 0; i < this.nodes.length - 1; i++) for (const a of this.nodes[i]) for (const b of this.nodes[i + 1]) {
      OHP.ink(g, f, [a, b], { w: 1.6, color: 'rgba(60,64,72,0.35)', seed: i * 13 + a[1], boil: 0.4 });
    }
    // nodes: the active layer lights up, forward and then backward
    const seq = back ? [3, 2, 1, 0] : [0, 1, 2, 3];
    const phase = (f.beat % 2) / 2;
    const active = seq[Math.floor(f.t * 1.1) % 4];
    for (let i = 0; i < this.nodes.length; i++) for (const p of this.nodes[i]) {
      const on = i === active;
      g.save();
      g.fillStyle = on ? OHP.C.red : 'rgba(238,230,210,0.9)';
      g.strokeStyle = OHP.C.ink; g.lineWidth = 4;
      g.beginPath(); g.arc(p[0], p[1], on ? 30 + 6 * f.a.kick : 24, 0, TAU); g.fill(); g.stroke();
      g.restore();
    }
    const ap = this.nodes[active][0];
    MV.focus(ap[0], ap[1], 'the active layer');
    // the arrows between layers, reversing when the song says backward
    for (let i = 0; i < 3; i++) {
      const a = [430 + i * 340 + 60, 800], b = [430 + i * 340 + 280, 800];
      OHP.arrow(g, f, back ? [b[0], b[1] + 30] : a, back ? [a[0], a[1] + 30] : b, { w: 6, seed: i, color: OHP.C.ink2 });
    }
    if (late) {                                            // the cross
      const k = prog(f.t, L24.words[0].start, L24.words[L24.words.length - 1].start, ease.outCubic);
      OHP.ink(g, f, [[420, 200], [lerp(420, 1520, k), lerp(200, 800, k)]], { w: 22, color: OHP.C.red, seed: 31, grease: true });
      OHP.ink(g, f, [[1520, lerp(200, 230, k)], [lerp(1520, 420, k), lerp(230, 800, k)]], { w: 22, color: OHP.C.red, seed: 32, grease: true });
      OHP.hand(g, f, { tip: [lerp(420, 1520, k), lerp(200, 800, k)], s: 0.55, ang: -1.35, alpha: 0.85 });
    }
    OHP.dust(g, f, {});
    OHP.slide(g, f, 20, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 250, y: 930, size: 58, style: 'hand', maxW: 1420 });
    return OHP.post(f, { shake: 4 + 5 * f.a.kick, snare: 0.05 });
  },
});

