// S27 flops — the city from above (C10): every lit window blinks on the beat; a dot-font counter rolls 1 → 10^30.
MV.scene('flops', akStill({
  art: 'C10',
  cam: [[0, { z: 1.04 }], [1, { z: 1.16, rot: 0.03 }, ease.inOutQuad]],
  snap: { shots: [{ z: 1.04 }, { x: 0.32, y: 0.62, z: 1.32 }, { x: 0.68, y: 0.58, z: 1.28, rot: 0.03 }] },   // 动感: across the city on the bar
  fx(g, f, map) {
    const ph = f.beatPhase, b = Math.floor(f.beat);
    akLights('C10', 220, [0, 0, 1, 1]).forEach((p, i) => { if (hash(b, i, 4) < 0.5) { const [x, y] = map(p.u, p.v); akDot(g, x, y, 2.2, 1 - ph * 0.8, f.tick, i); } });
    const e = Math.floor(lerp(0, 30, prog(f.lt, 0.2, f.dur * 0.8, ease.inQuad)));
    const mant = e < 30 ? (1 + hash(f.tick, 3) * 8.99).toFixed(2) : '1.00';
    akText(g, `${mant}E+${String(e).padStart(2, '0')}`, W / 2, H * 0.42, { size: 150, align: 'center', base: 'middle' });
    akText(g, 'FLOP / s', W / 2, H * 0.42 + 120, { size: 44, align: 'center', base: 'middle', color: AK.paper });
  },
  ly: { style: 'slant', x: 960, y: 940, size: 84 },
}));
