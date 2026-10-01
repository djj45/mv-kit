// arcs — ember palette, the warm data-film look. Each sung character lights a node on a gently curved row; dust
// arcs grow from it back to every earlier character (height by distance), the newest in amber. The characters
// sit under their nodes, so the row *is* the lyric. Chapter tag top left, tracked label above.
MV.scene('arcs', {
  init(MV) {
    const lines = MV.lyrics.lines.filter(l => l.start >= 8 && l.start < 12);
    this.rows = lines.map(l => {
      const toks = MV.lyrics.tokens(l), n = toks.length;
      const node = i => { const u = n > 1 ? i / (n - 1) : 0.5, x = lerp(-3.1, 3.1, u); return [x, -0.08 * x * x + 0.1, 0]; };
      const arcs = [];
      for (let j = 1; j < n; j++) for (let i = 0; i < j; i++) {
        const a = node(j), b = node(i), h = 0.3 * Math.abs(a[0] - b[0]) + 0.15;
        const pts = LG.curve(u => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + Math.sin(Math.PI * u) * h, Math.sin(Math.PI * u) * 0.12 * (i - j)], 64);
        arcs.push({ i, j, dust: LG.along(pts, 700, { even: true, jitter: 0.012, seed: i * 31 + j }), line: LG.seg(pts) });
      }
      return { line: l, toks, nodes: toks.map((_, i) => node(i)), arcs };
    });
    this.stars = LG.stars(2200, 30, { seed: 21 });
  },
  render(g, f) {
    const t = f.t, cam = lmOrbit({ yaw: -0.08 + f.lt * 0.03, pitch: 0.14, dist: 7.4, fov: 36, target: [0, 0.35, 0] });
    lmBegin('ember');
    lmPoints(cam, this.stars, { size: 1, gain: 0.4, twinkle: 0.5, t });
    // the row being sung (the previous one fades as the next begins)
    const labels = [];
    this.rows.forEach((r, ri) => {
      const next = this.rows[ri + 1], out = next ? 1 - prog(t, next.line.start - 0.3, next.line.start + 0.1) : 1;
      if (t < r.line.start - 0.2 || out <= 0) return;
      const last = r.toks.reduce((k, tk, i) => (t >= tk.start ? i : k), -1);
      for (const a of r.arcs) {
        const s = r.toks[a.j].start, grow = prog(t, s, s + 0.55, ease.outCubic);
        if (grow <= 0) continue;
        const hot = a.j === last, fade = hot ? 1 : 0.55;
        lmPoints(cam, a.dust, { size: 1.1, gain: (hot ? 0.9 : 0.42) * out, count: grow * 700, color: hot ? 'accent' : 'fg' });
        lmLines(cam, a.line, { width: 0.6, gain: 0.35 * fade * out, glow: 0, upto: grow, color: hot ? 'accent' : 'fg' });
      }
      r.nodes.forEach((p, i) => {
        const on = prog(t, r.toks[i].start, r.toks[i].start + 0.12);
        if (on <= 0) return;
        const hot = i === last, pulse = hot ? Math.pow(1 - clamp((t - r.toks[i].start) / 0.6), 2) : 0;
        lmPoints(cam, new Float32Array(p), { size: 7 + 8 * pulse, gain: (1.5 + pulse) * on * out, color: hot ? 'hot' : 'fg' });
        const q = cam.project(p);
        if (q) labels.push({ x: q[0], y: q[1] + 58, ch: r.toks[i].text, a: on * out, hot });
      });
    });
    lmEnd(g);
    g.save(); g.font = `300 44px ${LM_SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const l of labels) { g.globalAlpha = l.a; g.shadowColor = lmCss('fg', 0.4); g.shadowBlur = 14; g.fillStyle = lmCss(l.hot ? 'hot' : 'fg', 0.95); g.fillText(l.ch, l.x, l.y); }
    g.restore();
    lmSection(g, 2, 5, '连线', 'CONSTELLATION', { alpha: lmFlick(t, f.from + 0.3, 0.4) });
    lmTag(g, 'EVERY NODE · ONE SYLLABLE · EVERY ARC · ONE GLANCE BACK', W / 2, 168, { alpha: 0.9 * prog(f.lt, 0.8, 1.4) });
  },
});
