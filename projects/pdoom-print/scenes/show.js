// "Was it all for show?": the song nearly stops, and so does the printer. An almost empty page; the last question
// typed in the middle of it, a word at a time, larger than anything before it.
MV.scene('show', {
  init() { this.S = prSheet({ pic: false }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, ln = f.lyrics.get('Was it all for show');
    PP.header(S, f, f.params.page, { ink: 0.6 });
    PP.lyric(S, f, ln, 66, 15, { x: 4, align: 'center', red: ['SHOW?'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.86, 0.94, ease.inOutQuad(f.p)) }, seed: f.tick, ink: 0.95 });
    return { shake: 0 };
  },
});
