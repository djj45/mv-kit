// scenes/endcard.js — the end card, drawn on the last sheet: the mark, a line of typed credits, one paperclip in
// the corner, and then the lamp goes out for good.
MV.scene('endcard', {
  render(g, f) {
    const out = prog(f.t, f.to - 1.9, f.to - 0.2, ease.inOutQuad);
    OHP.back(g, f, { warm: 0.12, dim: out * 0.9 });
    OHP.sheetEdge(g, { m: 60 });
    // the mark, in red grease pencil, hand-sized
    g.save();
    OHP.F.mark(g, 210, { track: 0.03 });
    g.fillStyle = OHP.C.red; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('P(doom)', W / 2, 400);
    g.restore();
    OHP.ink(g, f, [[W / 2 - 330, 500], [W / 2 + 330, 486]], { w: 9, color: OHP.C.red, seed: 5, grease: true });
    // typed credits
    g.save();
    OHP.F.type(g, 34); g.fillStyle = OHP.C.ink; g.textAlign = 'center';
    const lines = ['a lecture in 46 transparencies', 'drawn with a marker on an overhead projector', 'song: P(doom) — lyrics and music by the original artist'];
    for (let i = 0; i < lines.length; i++) g.fillText(lines[i], W / 2, 620 + i * 62);
    OHP.F.type(g, 28); g.fillStyle = OHP.C.ink2;
    g.fillText('every frame drawn in code — no generated images', W / 2, 840);
    g.restore();
    OHP.clip(g, W - 300, 930, 150, -0.4, 1, true);
    MV.focus(W / 2, 400, 'the mark');
    OHP.dust(g, f, { gain: 0.8 });
    return { vignette: 0.42, grain: 0.055, fade: out * 0.85 };
  },
});

