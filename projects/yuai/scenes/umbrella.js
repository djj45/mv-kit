// Shot 10 — she stands on the bank in the rain, her back to us. On "我" one sweep of 焦墨 paints an oil-paper
// umbrella over her (the canopy stroke, the wash flooding it, ribs, shaft) and she raises it; on the long notes of
// "Rainie Love" the camera eases back and the rain falls all around the umbrella but not under it.
MV.scene('umbrella', {
  render(g, f) {
    const t = f.t, A = INK.A, L = f.lyrics.get('Rainie'), w = L.words;
    const tU = w[0].start, tLong = w[8].start;
    const cam = keys(t, [[f.from, 3380], [f.to + 0.8, 3250, ease.inOutQuad]]);
    yuaiPaper(g, cam);
    inkSoft(g, s => { const gr = s.createLinearGradient(0, 0, 0, H * 0.6); gr.addColorStop(0, ink(A.qing * 1.5)); gr.addColorStop(1, ink(0)); s.fillStyle = gr; s.fillRect(0, 0, W, H); }, { grain: 0.5 });
    g.save(); g.globalAlpha = 0.7; yuaiLand(g, cam); g.restore();
    yuaiNear(g, cam);
    const z = keys(t, [[f.from, 1.22], [tLong, 1.18], [f.to + 0.6, 1.0, ease.inOutQuad]]), fx = 760, fy = 560;
    g.save(); g.translate(fx, fy); g.scale(z, z); g.translate(-fx, -fy);
    const um = prog(t, Math.max(tU, f.from + 0.42), tU + 1.35);
    const box = yfigHerBack(g, t, { x: 760, y: 1010, U: 86, umbrella: um, look: prog(t, tLong, tLong + 1.5, ease.inOutQuad) * 0.6 });
    const avoid = [{ x: 1500, y: 100, w: 400, h: 820 }];                          // the lyric column
    if (box && um > 0.5) avoid.push({ x: box.x0 + 10, y: box.y0 + 40, w: box.x1 - box.x0 - 20, h: 1200 });
    inkRain(g, t, { x0: -200, w: W + 400, y0: -150, h: H + 300, density: 2.0 * (0.8 + 0.4 * f.a.rms), n: 320, len: 55, speed: 1000, angle: 0.1, alpha: A.dan * 0.95, avoid });
    // drops bouncing off the canopy
    if (box && um > 0.7) for (let i = 0; i < 14; i++) {
      const tk = f.tick, u = hash(tk, i, 5), life = hash(tk >> 1, i, 6);
      const x = lerp(box.x0 + 30, box.x1 - 30, u), y = box.y0 + 28 + 80 * Math.pow(Math.abs(u - 0.5) * 2, 2) - 14 * life;
      g.fillStyle = ink(A.dan * (1 - life)); g.beginPath(); g.arc(x, y, 1.6 + 1.5 * hash(i, tk, 7), 0, TAU); g.fill();
    }
    g.restore();
    yuaiLyrics(g, f);
  },
});
