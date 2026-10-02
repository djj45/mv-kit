// S53 hairclip — she leans on the fence at sunrise and smiles for the first time (H2); the point of light floats down
// and settles on the orange clip behind her ear (close-up H3 from the bar where it lands); ding on the kick.
MV.scene('hairclip', akStill({
  arts: ['H2', 'H3'], day: true,
  art: f => (f.t < f.audio.downbeats.find(d => d > f.from + 3) ? 'H2' : 'H3'),
  clip: f => (f.t < f.audio.downbeats.find(d => d > f.from + 3) ? 'H2v' : 'H3v'),
  clipT: f => { const land = f.audio.downbeats.find(d => d > f.from + 3); return f.tq - (f.t < land ? f.from : land); },
  cam: f => (f.t < f.audio.downbeats.find(d => d > f.from + 3) ? { z: 1.04 + 0.04 * f.p } : { z: 1.08 + 0.04 * f.p }),
  groove: 0.35,
  fx(g, f, map) {
    const land = f.audio.downbeats.find(d => d > f.from + 3);
    if (f.t < land) {
      const [cx, cy] = map(...AK_SPOT.H2.clip), k = prog(f.t, f.from + 0.3, land, ease.inOutQuad);
      akSpark(g, lerp(W * 0.8, cx, k) + Math.sin(k * 7) * 40 * (1 - k), lerp(-40, cy, k), 14, f.t, { embers: 3, seed: 53 });
    } else {
      const [cx, cy] = map(...AK_SPOT.H3.clip), a = f.t - land;
      illFlare(g, cx, cy, 300, AK.sig, 0.6 * (1 - prog(a, 0, 0.6)) + 0.2);
      akDot(g, cx, cy, 10, 0.9, f.tick);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(${AK.core},${1 - prog(a, 0, 0.4)})`; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + 0.4, r0 = 30, r1 = 30 + 140 * ease.outCubic(prog(a, 0, 0.4)); g.beginPath(); g.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); g.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); g.stroke(); }
      g.restore();
    }
  },
  ly: { style: 'none' },
}));
