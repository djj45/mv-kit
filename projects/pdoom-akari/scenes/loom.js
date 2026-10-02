// S47 loom — all code: orange warp and weft weave a tapestry, and the cells it has woven are the night's pictures.
MV.scene('loom', akCustom({
  init() { this.ids = ['A1', 'A7', 'B2', 'B4', 'B7', 'C2', 'C7', 'C8', 'C9', 'D1', 'D3', 'E1', 'E3', 'E7', 'F1', 'F2', 'B8', 'C10', 'D2', 'E5']; this.ids.forEach(id => akArt(id)); },
  render(g, f) {
    g.fillStyle = '#0B0A14'; g.fillRect(0, 0, W, H);
    const cols = 8, rows = 5, x0 = 200, y0 = 120, cw = (W - 400) / cols, ch = (H - 380) / rows, k = prog(f.lt, 0, f.dur - 0.15);
    const cells = cols * rows, done = k * cells;
    for (let c = 0; c < cells; c++) {
      const a = clamp(done - c); if (a <= 0) break;
      const j = Math.floor(c / cols), i = j % 2 ? cols - 1 - (c % cols) : c % cols, x = x0 + i * cw, y = y0 + j * ch, img = akArt(this.ids[c % this.ids.length]);
      g.save(); g.globalAlpha = a; g.beginPath(); g.rect(x + 3, y + 3, cw - 6, ch - 6); g.clip();
      const s = Math.max(cw / img.width, ch / img.height); g.drawImage(img, x + cw / 2 - img.width * s / 2, y + ch / 2 - img.height * s / 2, img.width * s, img.height * s); g.restore();
    }
    for (let i = 0; i <= cols; i++) akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(x0 + i * cw, y0); gg.lineTo(x0 + i * cw, y0 + rows * ch); }, 1.2, 0.7);
    const shuttleRow = Math.min(rows - 1, Math.floor(done / cols)), sx = x0 + ((Math.floor(done / cols) % 2 ? cols - (done % cols) : done % cols)) * cw;
    for (let j = 0; j <= shuttleRow + 1 && j <= rows; j++) akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(x0, y0 + j * ch); gg.lineTo(j === shuttleRow + 1 ? sx : x0 + cols * cw, y0 + j * ch); }, 1.2, 0.8);
    akDot(g, sx, y0 + (shuttleRow + 1) * ch, 7, 1, f.tick);
    akLy(g, f, { style: 'quiet', x: 960, y: 1000, size: 64, track: 6, colorOf: w => (/Loom/.test(w.w) ? AK.signal : AK.paper) });
    return {};
  },
}));
