// S22 prompt2 — the empty night train (C5); outside, the city's lights stream past, strung on orange threads.
// "Sydney," is written large across the window. From "please": her phone (C6), the input box a second time.
MV.scene('prompt2', akStill({
  arts: ['C5', 'C6'],
  art: f => (f.t < akWord(f, 'Sydney, please', 'please') ? 'C5' : 'C6'),
  clip: f => (f.t < akWord(f, 'Sydney, please', 'please') ? 'C5v' : 'C6v'),
  clipT: f => { const pl = akWord(f, 'Sydney, please', 'please'); return f.tq - (f.t < pl ? f.from : pl); },   // each clip from its picture's first drawing
  cam: f => (f.t < akWord(f, 'Sydney, please', 'please') ? { x: 0.5, z: 1.04 + 0.05 * prog(f.t, f.from, f.from + 3) } : { z: 1.08 + 0.05 * f.p }),
  // 动感: the carriage, then in to her face on the bar; on the phone, in to her thumbs
  snap: f => ({ shots: f.t < akWord(f, 'Sydney, please', 'please') ? [{ x: 0.5, z: 1.04 }, { x: 0.45, y: 0.3, z: 1.5 }] : [{ z: 1.08 }, { x: 0.42, y: 0.62, z: 1.32 }] }),
  fx(g, f, map) {
    const pl = akWord(f, 'Sydney, please', 'please');
    if (f.t < pl) {
      const [u, v, w, h] = AK_SPOT.C5.window, [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h);
      g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
      const R = mulberry32(22), prev = [];
      for (let i = 0; i < 40; i++) {
        const sp = 600 + R() * 900, x = x1 - ((f.t * sp + R() * 4000) % ((x1 - x0) + 400)) + 200, y = y0 + (0.2 + 0.75 * R()) * (y1 - y0);
        akDot(g, x, y, 2 + R() * 2, 0.8, f.tick, i); prev.push([x, y]);
        if (i % 3 === 1) akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(x, y); gg.lineTo(prev[i - 1][0], prev[i - 1][1]); }, 1, 0.6);
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,211,138,0.25)`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + sp * 0.06, y); g.stroke(); g.restore();
      }
      g.restore();
      const w0 = f.lyrics.get('Sydney').words[0];
      illOutline(g, 'Sydney,', f.t, w0.start, { x: 1420, y: 330, size: 130, over: w0.end - w0.start, drift: 3 });
    }
  },
  ly: f => (f.t < akWord(f, 'Sydney, please', 'please') ? { style: 'none' } : { style: 'prompt', words: [1, 5], box: [300, 860, 1320, 116], typing: 1 - prog(f.t, f.to - 0.3, f.to), sent: pulse(f.t, f.to - 0.12, 0.12) }),
}));
