// Shot 4 — the same take pushes in on her and the glass. Water runs down the pane and washes the view out
// ("看不清"); on "我也不想看清" she lowers her head.
MV.scene('glass_blur', {
  render(g, f) {
    const L = f.lyrics.get('看不清'), tB = L.words[3].start;             // 我也不想看清
    yroomShot(g, f, {
      cam: t => { const e = prog(t, f.from, f.to + 0.5, ease.inOutSine || ease.inOutQuad), z = Math.exp(lerp(0, Math.log(1.45), e)); return { z, rx: 760, ry: 560, sx: 760, sy: 560 }; },
      rain: t => keys(t, [[f.from, 1.25], [f.to, 1.45]]),
      wash: t => keys(t, [[f.from, 0], [L.words[0].start + 0.3, 0.45], [L.words[2].start + 0.8, 0.6], [tB + 1.6, 1]]),
      pose: t => ({ lift: 1 - prog(t, tB - 0.4, tB + 1.2, ease.inOutQuad), bow: prog(t, tB - 0.2, tB + 2.2, ease.inOutQuad) }),
    });
    yuaiLyrics(g, f);
  },
});
