// S40 tower — the tallest sky (F1, a vertical picture): blocks of light stack up into a tower to heaven and the
// camera tilts up with it; the words stack like blocks too. On the full band's return (the bar line after the
// first word): white flash, and the city below comes back on — all orange.
MV.scene('tower', akStill({
  art: 'F1',
  cam: f => ({ x: 0.5, y: lerp(0.86, 0.2, ease.inOutQuad(f.p)), z: 1 }),
  fx(g, f, map) {
    const band = f.audio.downbeats.find(d => d > f.from + 0.5), lit = f.t >= band;
    const nBlocks = Math.floor(prog(f.t, f.from, f.to - 0.3) * 48);
    for (let i = 0; i < nBlocks; i++) {
      const v = 0.96 - i * 0.019, [x, y] = map(0.5 + 0.02 * Math.sin(i * 1.3), v), w = 120 - i * 1.4, h = 0.017 * map.sh * map.scale;
      const age = f.t - (f.from + i / 48 * (f.to - 0.3 - f.from)), drop = age < 0.12 ? (1 - age / 0.12) * 60 : 0;
      // painted, not added: added orange on this blue sky turns pink
      g.save(); g.shadowColor = AK.signal; g.shadowBlur = 24; g.fillStyle = `rgba(${AK.sig},0.85)`; g.fillRect(x - w / 2, y - h - drop, w, h - 3);
      g.shadowBlur = 0; g.strokeStyle = `rgba(${AK.core},0.9)`; g.lineWidth = 2; g.strokeRect(x - w / 2, y - h - drop, w, h - 3); g.restore();
    }
    if (lit) { const [, by] = map(0.5, 0.98); g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, by - 300, 0, by); gr.addColorStop(0, 'rgba(255,106,26,0)'); gr.addColorStop(1, `rgba(255,106,26,${0.5 * prog(f.t, band, band + 0.3)})`); g.fillStyle = gr; g.fillRect(0, by - 300, W, 400); g.restore(); }
  },
  top(g, f) {   // the words stack like blocks: each new one drops in at the bottom and pushes the others up (reads top-down)
    const line = f.lyrics.get('Just transformers'), shown = line.words.filter(w => f.t >= w.start), n = shown.length;
    shown.forEach((w, j) => {
      const k = prog(f.t, w.start, w.start + 0.12, ease.outBack), lift = j < n - 1 ? prog(f.t, shown[j + 1].start, shown[j + 1].start + 0.12, ease.outCubic) : 0;
      const y = 940 - (n - 1 - j) * 84 + (1 - lift) * 84 * (j < n - 1 ? 1 : 0) - (1 - k) * 40;
      g.save(); g.font = `400 70px ${ILL.F.display}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.globalAlpha = clamp(k * 2); g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = AK.ink; g.strokeText(w.w, 160, y); g.fillStyle = AK.paper; g.fillText(w.w, 160, y); g.restore();
    });
  },
  post(f) { const band = f.audio.downbeats.find(d => d > f.from + 0.5); return { flash: 0.9 * pulse(f.t, band, 0.25) }; },
}));
