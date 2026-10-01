// One big character, settling in. anchors: char (its square, for the pull-out onto the vase).
MV.scene('glyph', {
  size(f) { return 640 * (1.04 - 0.04 * ease.outCubic(clamp(f.lt / 1.5))); },
  anchors(f) { const s = this.size(f); return { char: [W / 2 - s / 2, H / 2 - s / 2, s, s] }; },
  render(g, f) {
    g.fillStyle = TD.paper; g.fillRect(0, 0, W, H);
    const s = this.size(f);
    g.fillStyle = TD.line; g.font = `${s}px ${TD.serif}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('瓷', W / 2, H / 2 + s * 0.04);
  },
});
