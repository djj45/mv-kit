// Shot 3 — pull back: the landscape of shots 1–2 turns out to be the view through her window. Rain starts
// on "下雨了"; she lifts her head a little towards the window.
MV.scene('window_rain', {
  render(g, f) {
    const L = f.lyrics.get('下雨了'), t1 = L.words[0].start, t2 = f.lyrics.get('下雨了').words[3].start;
    yroomShot(g, f, {
      cam: t => yroomPullBack(prog(t, f.from, f.from + 3.4, ease.inOutCubic)),
      rain: t => keys(t, [[t1 - 0.15, 0], [t1 + 0.6, 0.45], [t2, 1], [f.to, 1.25]]),
      pose: t => ({ lift: prog(t, t2 - 0.2, t2 + 1.8, ease.inOutQuad) }),
    });
    yuaiLyrics(g, f);
  },
});
