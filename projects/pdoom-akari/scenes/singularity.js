// S19 singularity — the skyline pans (C2); thread after thread of orange light leaps from a window to one point
// in the sky, a new batch on every sung word.
MV.scene('singularity', akStill({
  art: 'C2', day: true,
  cam: f => ({ x: lerp(0.3, 0.62, ease.inOutQuad(f.p)), y: 0.5, z: 1.02 }),
  fx(g, f, map) {
    const pts = akLights('C2', 90, [0, 0.5, 1, 0.92]), [sx, sy] = map(...AK_SPOT.C2.sky), line = f.lyrics.get('But now the singularity');
    const ws = line.words, R = mulberry32(19);
    pts.forEach((p, i) => {
      const w = ws[i % ws.length], born = w.start + R() * 0.3, k = prog(f.t, born, born + 0.9, ease.inOutCubic);
      if (k <= 0) return;
      const [x, y] = map(p.u, p.v);
      if (x < -400 || x > W + 400) return;
      akDot(g, x, y, 2.2, 1, f.tick, i);
      akThread(g, x, y, sx, sy, k, { lift: 80 + R() * 160, bend: (R() - 0.5) * 200, w: 1.1, alpha: 0.7 });
    });
    akDot(g, sx, sy, 6 + 6 * prog(f.lt, 0, f.dur), 1, f.tick, 99);
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ["singularity's"] },
}));
