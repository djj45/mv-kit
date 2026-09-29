// Starter scene: the title, one letter per beat, for the intro before the first sung line.
MV.scene('title', {
  render(g, f) {
    g.fillStyle = '#0b0a12'; g.fillRect(0, 0, W, H);
    const title = MV.project.title.toUpperCase(), n = [...title].length;
    const beats = f.beat - f.audio.beatAt(f.from);             // beats since the shot started
    g.font = `900 120px system-ui, -apple-system, "Hiragino Sans", "Noto Sans CJK SC", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const shown = [...title].slice(0, Math.max(0, Math.floor(beats) + 1)).join('');
    g.fillStyle = '#fff'; g.fillText(shown.padEnd(n, ' '), W / 2, H / 2);
    const bp = 1 - f.beatPhase;
    g.strokeStyle = `rgba(255,255,255,${0.4 * bp * bp})`; g.lineWidth = 2;
    g.beginPath(); g.arc(W / 2, H / 2, 260 + 80 * (1 - bp), 0, TAU); g.stroke();
    return { fade: 1 - prog(f.t, f.from, f.from + 0.6) };
  },
});
