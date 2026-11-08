// Shared visual vocabulary; the recipes themselves remain in separate scene files.
const RD = {
  bg: '#101E29', ink: '#F0EEE5', dim: '#536A79', accent: '#F5AE68',
  beat(f, offset) { return MV.audio.timeOfBeat(MV.audio.beatAt(f.from) + offset); },
  phase(f, a, b) { return clamp((f.t - this.beat(f, a)) / (this.beat(f, b) - this.beat(f, a))); },
  paper(g) { g.fillStyle = this.bg; g.fillRect(0, 0, W, H); },
  disc(g, x, y, r, color = this.accent) {
    g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  },
  label(title, note) {
    MV.overlay(g => MV.decor(() => {
      BOX.text(g, title, 160, 180, { size: 52, color: this.ink, maxW: 1600 });
      BOX.text(g, note, 160, 930, { size: 30, color: this.ink, maxW: 1600 });
    }));
  },
};
