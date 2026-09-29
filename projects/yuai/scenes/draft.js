// Placeholder for shots not painted yet: paper, the lyric, and the shot's name in pale ink.
MV.scene('draft', {
  render(g, f) {
    yuaiPaper(g, 2600);
    yuaiLand(g, 2600, -1e9, 0.35);
    yuaiLyrics(g, f);
    g.font = `44px ${INK.FONT}`; g.fillStyle = ink(INK.A.dan); g.textBaseline = 'top';
    g.fillText(`${f.params.n}  ${f.params.label || f.entry.name}`, 120, 120);
  },
});
