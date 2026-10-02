// S43 fence — the roof fence close up (F3): on each sung word a streak of light tears out a piece of the mesh and
// the pieces fly off (cut from the picture itself).
MV.scene('fence', akCustom({
  init() { akArt('F3'); },
  render(g, f) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const cam = { z: 1.05 + 0.05 * f.p }, art = akArt('F3'), words = f.lyrics.get('Breaking through each').words;
    // the backdrop behind the fence: the picture, blurred and darker (city bokeh)
    illCover(g, art, cam, { filter: 'blur(16px) brightness(1.1) saturate(1.2)' });
    const holes = words.map((w, i) => ({ t: w.start, x: W * (0.18 + 0.16 * i), y: H * (0.35 + 0.25 * Math.sin(i * 2.3)), r: 150 + 30 * i }));
    // the fence = picture with the torn holes cut out
    if (!this.L) this.L = mk(W, H);
    const lg = this.L.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
    illCover(lg, art, cam); lg.globalCompositeOperation = 'destination-out';
    for (const h of holes) if (f.t >= h.t) { lg.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, r = h.r * (0.7 + 0.5 * hash(k, h.x | 0)); k ? lg.lineTo(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r) : lg.moveTo(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r); } lg.fill(); }
    g.drawImage(this.L, 0, 0);
    for (const h of holes) {
      const a = f.t - h.t; if (a < 0) continue;
      for (let k = 0; k < 7; k++) {   // shards: pieces of the picture flying away
        const ang = hash(k, h.x | 0, 3) * TAU, sp = 500 + 600 * hash(k, 9), px = h.x + Math.cos(ang) * sp * a, py = h.y + Math.sin(ang) * sp * a + 600 * a * a, sz = 60;
        if (a > 1) continue;
        g.save(); g.globalAlpha = 1 - a; g.translate(px, py); g.rotate(a * 6 * (hash(k, 2) - 0.5)); g.beginPath(); g.rect(-sz / 2, -sz / 2, sz, sz); g.clip(); g.translate(-h.x, -h.y); g.drawImage(this.L, 0, 0); g.restore();
      }
      akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(h.x - h.r * 1.4, h.y + h.r * 0.6); gg.lineTo(h.x + h.r * 1.4, h.y - h.r * 0.6); }, 5, 1 - prog(a, 0, 0.3));
    }
    akLy(g, f, { style: 'slant', x: 960, y: 930, size: 88 });
    return { shake: 8 * f.a.kick };
  },
}));
