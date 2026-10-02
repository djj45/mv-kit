// S06 drop — on "drop" the curve falls off a cliff and the camera dives with it; an inverted impact frame with
// focus lines; then A5: she jolts upright, ガタッ. A2v / A5v when generated (A2v carries on from S05 loss, 1.16 s;
// A5v starts on the impact, her jolt is its first move).
MV.scene('drop', {
  init() { akArt('A2'); akArt('A5'); },
  render(g, f) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const hit = 0.28;                                     // the cut to her, ~ half a beat after the word
    if (f.lt < hit) {
      const k = prog(f.lt, 0, hit, ease.inCubic);
      const a2 = (akMotionOn(f) && akClipArt('A2v', 'A2', 1.16 + f.tq - f.from)) || akArt('A2');
      const map = illCover(g, a2, { x: 0.68, y: lerp(0.43, 0.55, k), z: lerp(1.25, 1.9, k), rot: 0.06 * k });
      const [u, v, w, h] = AK_SPOT.A2.screen, [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h);
      akLossCurve(g, [x0, y0, x1 - x0, y1 - y0], f.t, { head: 0.8 + 0.2 * prog(f.lt, 0, 0.18), fall: prog(f.lt, 0, 0.2, ease.inQuad) });
      upLines(g, -f.t * 3, 'rgba(255,248,238,0.35)', 40, 9);
    } else {
      const k = prog(f.lt, hit, hit + 0.25, ease.outCubic);
      const a5 = (akMotionOn(f) && akClipArt('A5v', 'A5', Math.max(0, f.tq - f.from - hit))) || akArt('A5');
      const map = illCover(g, a5, { x: 0.5, y: 0.45, z: lerp(1.25, 1.08, k), rot: lerp(-0.05, -0.02, k) });
      const [fx, fy] = map(...AK_SPOT.A5.face);
      focusLines(g, fx, fy, 120, 330, `rgba(18,12,34,${0.55 * (1 - prog(f.lt, hit + 0.3, hit + 1.2))})`, 3, f.tick, 10);
      sfx(g, 'ガタッ', W * 0.77, H * 0.26, 170, 0.12, f.t, f.from + hit + 0.02, { font: ILL.F.display, stroke: '#fffaf0', fill: '#15121F' });
    }
    akLy(g, f, { style: 'verse', x: 140, y: H - 150, hot: ['drop', 'loss,'] });
    const inv = f.lt >= hit && f.lt < hit + 2 / 24;
    return { invert: inv, shake: f.lt >= hit ? 14 * (1 - prog(f.lt, hit, hit + 0.4)) : 0 };
  },
});
