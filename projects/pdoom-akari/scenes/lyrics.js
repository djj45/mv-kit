// Starter scene: kinetic lyric typography that follows the song. One timeline entry per lyric line
// (params.line = line index). Replace it with your own scenes once the treatment is written.
MV.scene('lyrics', {
  render(g, f) {
    const line = f.lyrics.lines[f.params.line];
    const sec = f.section, hue = sec ? (hash(sec.label.charCodeAt(0), 7) * 360) | 0 : 250;
    // background: section colour, breathing with the bass
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `hsl(${hue},45%,${8 + 10 * f.a.low}%)`); gr.addColorStop(1, `hsl(${(hue + 40) % 360},55%,${4 + 6 * f.a.rms}%)`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // beat grid: a pulse ring per beat, bar progress at the bottom
    const bp = 1 - f.beatPhase;
    g.strokeStyle = `hsla(${hue},80%,70%,${0.35 * Math.pow(bp, 3)})`; g.lineWidth = 3;
    g.beginPath(); g.arc(W / 2, H / 2, 200 + 600 * (1 - bp), 0, TAU); g.stroke();
    g.fillStyle = `hsla(${hue},80%,70%,0.6)`; g.fillRect(0, H - 6, W * f.barPhase, 6);
    if (!line) return;
    // the line, word by word: sung words light up, the active word pops
    const size = 110;
    g.font = `800 ${size}px system-ui, -apple-system, "Hiragino Sans", "Noto Sans CJK SC", sans-serif`;
    const toks = f.lyrics.tokens(line);
    const width = karaoke(g, toks, f.t, 0, -1e4, { font: g.font, showUnsung: true, draw: () => {} });
    const x0 = W / 2 - Math.min(width, W - 200) / 2, sc = Math.min(1, (W - 200) / width);
    g.save(); g.translate(x0, H / 2 + size * 0.35); g.scale(sc, sc);
    karaoke(g, toks, f.t, 0, 0, {
      font: g.font, showUnsung: true,
      draw(g, tk, x, y, st) {
        const pop = st.age >= 0 ? ease.outBack(clamp(st.age / 0.15)) : 0;
        const s = st.age >= 0 ? lerp(1.35, 1, pop) : 1;
        g.translate(x + st.w / 2, y - size * 0.35); g.scale(s, s); g.translate(-st.w / 2, size * 0.35);
        g.fillStyle = st.age < 0 ? 'rgba(255,255,255,0.22)' : st.active ? `hsl(${(hue + 180) % 360},90%,70%)` : '#fff';
        g.fillText(tk.text, 0, 0);
      },
    });
    g.restore();
    return { shake: 6 * f.a.snare, flash: 0.08 * f.a.kick };
  },
});
