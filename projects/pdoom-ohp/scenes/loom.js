// scenes/loom.js — the loom: warp threads, a shuttle going across, and the cloth it weaves has the mark on it;
// on "recursive" the cloth shows three smaller copies of itself.
MV.scene('loom', {
  render(g, f) {
    OHP.back(g, f, { warm: 0.25 });
    const x0 = 220, y0 = 200, w = 1480, h = 640;
    // warp
    for (let i = 0; i <= 30; i++) {
      const x = x0 + i * (w / 30);
      OHP.ink(g, f, [[x, y0], [x, y0 + h]], { w: 2.4, color: 'rgba(46,92,158,0.5)', seed: i, boil: 0.5 });
    }
    // weft: laid down one pass per half bar
    const passes = 22;
    const done = clamp((f.t - f.from) / 4.2) * passes;
    for (let i = 0; i < Math.floor(done); i++) {
      const y = y0 + h - (i + 1) * (h / passes);
      OHP.ink(g, f, [[x0, y], [x0 + w, y + 4 * noise1(i, 3)]], { w: 9, color: 'rgba(35,38,46,0.55)', seed: 100 + i, boil: 0.7 });
    }
    // the shuttle
    const sp = (done % 1), sy = y0 + h - (Math.floor(done) + 0.5) * (h / passes);
    const sx = sp < 0.5 ? lerp(x0, x0 + w, sp * 2) : lerp(x0 + w, x0, (sp - 0.5) * 2);
    g.save(); g.translate(sx, sy); g.rotate(0.03);
    OHP.block(g, f, -80, -26, 160, 52, { color: OHP.C.ink, w: 7, seed: 44, fill: 'rgba(217,136,41,0.35)' });
    g.restore();
    MV.focus(sx, sy, 'the shuttle');
    // the mark, woven into the cloth
    const L43 = f.lyrics.get('recursive self-upgrade');
    const rec = prog(f.t, L43.words[0].start, L43.words[L43.words.length - 1].start, ease.inOutQuad);
    // The mark, woven into the cloth: MV.decor says "this is part of the picture, not the lyric" (the weft runs
    // through it, and that is what the shot means). Drawn whole; the small copies are big enough to read.
    const mark = (mx, my, ms, a) => MV.decor(() => {
      g.save(); g.globalAlpha = a;
      OHP.F.mark(g, 150 * ms); g.fillStyle = OHP.C.red; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('P(doom)', mx, my);
      g.restore();
    });
    mark(x0 + w / 2, y0 + h * 0.42, 1, 0.45 + 0.35 * done / passes);
    for (let i = 0; i < 2; i++) {
      const kk = clamp(rec * 1.6 - i * 0.35);
      if (kk <= 0) continue;
      mark(x0 + w / 2 + (i + 1) * 240 * kk, y0 + h * 0.42 + (i + 1) * 100 * kk, 0.72 - i * 0.16, 0.6 * kk);
    }
    OHP.dust(g, f, {});
    OHP.slide(g, f, 33, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 300, y: 920, size: 54, style: 'hand', maxW: 1320 });
    return OHP.post(f, { shake: 4, snare: 0.05 });
  },
});

