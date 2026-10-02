// S29 corridor — the data-centre aisle in one-point perspective (D1), her back small in the middle. Pulses of light
// run along the rack LEDs: into the depth on "Forward", back out on "backward", out-in-out-in on "repeat".
MV.scene('corridor', akStill({
  art: 'D1',
  clip: 'D1v',   // the still until the clip is generated and packed
  cam: [[0, { z: 1.03 }], [1, { z: 1.15 }, ease.inOutQuad]],
  snap: { shots: [{ z: 1.03 }, { x: 0.47, y: 0.42, z: 1.4 }, { y: 0.38, z: 1.5 }] },   // 动感: her back, then down the corridor
  fx(g, f, map) {
    const [vx, vy] = map(...AK_SPOT.D1.vp), line = f.lyrics.get('Forward MLP'), w = q => line.words.find(x => x.w.toLowerCase().startsWith(q));
    const fw = w('forward').start, bw = w('backward').start, rp = w('repeat');
    // depth s: 0 at the camera, 1 at the vanishing point
    let s = null;
    if (f.t >= fw && f.t < fw + 0.9) s = ease.inQuad(prog(f.t, fw, fw + 0.9));
    else if (f.t >= bw && f.t < bw + 0.7) s = 1 - ease.outQuad(prog(f.t, bw, bw + 0.7));
    else if (f.t >= rp.start) { const k = (f.t - rp.start) / 0.45, i = Math.floor(k); if (i < 4) s = i % 2 ? 1 - (k - i) : k - i; }
    if (s == null) return;
    for (const side of [-1, 1]) for (const row of [0.25, 0.5, 0.75]) {
      const x0 = vx + side * W * 0.46, y0 = vy + (row - 0.5) * H * 1.1;
      const x = lerp(x0, vx, s), y = lerp(y0, vy, s), tail = 0.12;
      const xs = lerp(x0, vx, clamp(s - tail)), ys = lerp(y0, vy, clamp(s - tail));
      akGlowPath(g, gg => { gg.beginPath(); gg.moveTo(xs, ys); gg.lineTo(x, y); }, 3 * (1 - s) + 0.6, 0.9);
      akDot(g, x, y, 6 * (1 - s) + 1.5, 1, f.tick, side * 10 + row * 4);
    }
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ['Forward', 'backward,', 'repeat'] },
}));
