// Placeholder for shots not painted yet: glaze-white, the lyric, the shot's name.
MV.scene('draft', {
  render(g, f) {
    g.fillStyle = QH.glaze; g.fillRect(0, 0, W, H);
    qhLyrics(g, f, W - 200, 150, { fired: f.t > 56 });
    g.font = `44px ${QH.FONT}`; g.fillStyle = QH.rawD; g.textBaseline = 'top';
    g.fillText(`${f.params.n}  ${f.params.label || f.entry.name}`, 120, 120);
  },
});
