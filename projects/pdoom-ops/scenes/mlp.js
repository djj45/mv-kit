// mlp — "Forward MLP, backward, repeat": a network of six layers; a wave of activation sweeps
// forward on "forward", sweeps back on "backward", and loops on "repeat" — the lyric is the program.
MV.scene('mlp', {
  init() {
    const rnd = mulberry32(26), sizes = [5, 8, 11, 11, 8, 4];
    this.layers = sizes.map((n, L) => {
      const P = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) P.set([L * 258 - 645, (i - (n - 1) / 2) * 92, 0], i * 3);
      return P;
    });
    this.edges = [];                                     // [layerIdx, i, j]
    sizes.forEach((n, L) => { if (!sizes[L + 1]) return; for (let i = 0; i < n; i++) for (let j = 0; j < sizes[L + 1]; j++) if (rnd() < 0.5) this.edges.push([L, i, j]); });
    this.stars = OPS.mkStars(240, 171);
  },
  render(g, f) {
    lmBegin('ice');
    const cam = lmScreen(), at = { pos: [W / 2, H / 2 + 40, 0] };
    lmPoints(cam, this.stars, { size: 1.3, gain: 0.22, twinkle: 0.4, t: f.t, fog: 90 });
    // the wave: forward → backward → forward across the shot, twice (repeat)
    const L = MV.lyrics.get('Forward MLP');
    const tF = L.words[0].start, tB = L.words[1].start, tR = L.words[2].start;
    const sweep = f.t < tB ? clamp((f.t - tF) / 0.7) : f.t < tR ? 2 - clamp((f.t - tB) / 0.7) : 2 + clamp((f.t - tR) / (f.to - tR)) * 2;
    const pos = 5 * (1 - Math.abs(1 - (sweep % 2)));      // 0→5→0 ping-pong
    const gl = lmGlow();
    this.edges.forEach(([li, i, j], k) => {
      const a = [this.layers[li][i * 3], this.layers[li][i * 3 + 1]], b = [this.layers[li + 1][j * 3], this.layers[li + 1][j * 3 + 1]];
      const near = 1 - Math.min(1, Math.abs(li - pos));
      OPS.stroke(gl, [[a[0] + W / 2, a[1] + H / 2 + 40], [b[0] + W / 2, b[1] + H / 2 + 40]], { color: near > 0.55 ? 'accent' : 'dim', alpha: 0.2 + 0.6 * near, width: 1 + near });
    });
    // layer plates, so the network reads as architecture and not loose dots
    this.layers.forEach((P, li) => {
      const n = P.length / 3, x = P[0] + W / 2, near = Math.max(0, 1 - Math.abs(li - pos));
      const top = P[1] + H / 2 + 40, bot = P[(n - 1) * 3 + 1] + H / 2 + 40;
      OPS.stroke(gl, [[x - 70, top - 52], [x + 70, top - 52], [x + 70, bot + 52], [x - 70, bot + 52]], { color: near > 0.55 ? 'accent' : 'dim', alpha: 0.35 + 0.5 * near, width: 1.6, closed: true });
      lmPoints(cam, P, { size: 4.2, gain: 0.6 + 1.2 * near, color: near > 0.5 ? 'hot' : 'fg', model: at });
    });
    ['embed', 'attn ×4', 'mlp', 'attn ×4', 'unembed', 'out'].forEach((s, li) => {
      const x = this.layers[li][0] + W / 2;
      OPS.tick(gl, s, x, 990, { size: 15, color: 'dim', alpha: 0.85 });
    });
    lmEnd(g);
    const fx = W / 2 - 750 + pos * 300;
    MV.focus(fx, H / 2 + 40, 'wavefront');
    OPS.lyr(f, o => OPS.hud(o, f, { rows: [['pass', sweep < 1 ? 'FWD' : sweep < 2 ? 'BWD' : 'REP'], ['layers', '6×MLP']] }));
    return {};
  },
});
