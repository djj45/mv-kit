// gpu — 38 (118.755–120.76) · rose · paid for by "Hundred thousand GPU".
// A hundred thousand little boxes as a grid — 400 wide, 250 deep, four hairline segments each, 400 000 segments
// of static geometry in 32 chunks — laid out as the compute floor and seen from just above it, so the near boxes
// read as boxes and the far ones close into a horizon of light. The wave of activation comes toward the camera row
// by row, so the boxes light in turn and the count in the middle of the frame climbs to exactly 100 000. The
// wavefront itself is the only thing at full gain.
MV.scene('gpu', {
  init() {
    const COLS = 400, ROWS = 250, N = COLS * ROWS;             // exactly 100 000
    const pitch = 0.062, box = pitch * 0.72, CH = 3125;        // 32 chunks, revealed from the far edge forward
    this.COLS = COLS; this.ROWS = ROWS; this.N = N; this.pitch = pitch; this.nch = Math.ceil(N / CH);
    const rnd = mulberry32(100000);
    this.chunks = [];
    for (let c0 = 0; c0 < N; c0 += CH) {
      const n = Math.min(CH, N - c0), S = new Float32Array(n * 4 * 8);
      let k = 0;
      for (let i = 0; i < n; i++) {
        const idx = c0 + i;
        const col = idx % COLS, row = Math.floor(idx / COLS);  // row-major: the wave is a row of light, not a column
        const x = (col - (COLS - 1) / 2) * pitch, z = (row - (ROWS - 1) / 2) * pitch;
        const y = (rnd() - 0.5) * 0.5, h = box * (0.82 + rnd() * 0.34);
        const b = 0.5 + rnd() * 0.5;
        const put = (ax, az, bx, bz) => {
          S[k] = x + ax; S[k + 1] = y; S[k + 2] = z + az;
          S[k + 3] = x + bx; S[k + 4] = y; S[k + 5] = z + bz;
          S[k + 6] = b; S[k + 7] = 0; k += 8;
        };
        put(-h, -h, h, -h); put(h, -h, h, h); put(h, h, -h, h); put(-h, h, -h, -h);
      }
      this.chunks.push(S);
    }
    // the wavefront: one hero point per column, standing where the activation has reached
    this.front = new Float32Array(COLS * 3);
    this.dust = LG.ball(2000, 10, { seed: 137 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const beats = Math.max(0, d.beat - d.audio.beatAt(d.from));
    const span = Math.max(0.5, d.audio.beatAt(d.to) - d.audio.beatAt(d.from));
    const wave = clamp((beats - 0.25) / (span * 0.86) + d.kick * 0.004);   // the sweep is written by the music
    const lit = wave * this.nch;
    const count = Math.round(this.N * wave);
    const z0 = -((this.ROWS - 1) / 2) * this.pitch, zw = z0 + wave * this.ROWS * this.pitch;
    for (let c = 0; c < this.COLS; c++) {
      this.front[c * 3] = (c - (this.COLS - 1) / 2) * this.pitch;
      this.front[c * 3 + 1] = 0.4;
      this.front[c * 3 + 2] = zw;
    }

    const cam = dsCam(d, {
      yaw: 0.03 + lt * 0.03 + Math.sin(lt * 0.28) * 0.04, pitch: 0.4,
      dist: lerp(9.4, 8.2, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.03,
      target: [0, 0, -zw * 0.3], seed: 41,
    });
    const list = [dsAir(d, this.dust, { gain: 0.15, size: 1.0, dof: 36, count: 900 })];
    for (let c = 0; c < this.nch; c++) {
      const k = clamp(lit - c);
      if (k <= 0.01) continue;
      const fresh = clamp(1 - (lit - c - 1));                 // the rows the wave has just passed stay brighter
      list.push({ S: this.chunks[c], o: { width: 1, gain: 0.34 + 0.5 * fresh, color: fresh > 0.2 ? 'hot' : 'accent', glow: fresh * 0.2, fog: 22, dyn: false } });
    }
    // the one thing at full gain: the line of light switching the rack on
    list.push({ P: this.front, dyn: true, o: { size: 1.9 + d.kick * 1.2, gain: 1.0, color: 'hot', dof: 7, blur: 1.0, fog: 26 } });
    dsLight(d, list, { cam, end: { bloom: 0.46 + d.kick * 0.24, exposure: 0.9, ca: 0.5 + d.kick * 0.3, radius: 0.48 } });

    dsTele(g, d, {
      id: 'c38', name: 'gpu',
      rows: [
        ['gpus', TL.num(count)],
        ['grid', '400 × 250'],
        ['util', (wave * 100).toFixed(1) + ' %'],
        ['power', TL.num(700 * wave) + ' MW'],
        ['cooling', wave > 0.8 ? 'AT LIMIT' : 'OK'],
      ],
      foot: 'rack 41 · 400 × 250 · each box one gpu',
    });
    // the count is the shot: display size, and it lands on 100 000
    dsLine(g, TL.num(count), W / 2, 142, { font: dsSans(92, 200), size: 92, color: dsTone(d, 'fg', 0.92), glow: 24, track: 7 });
    TL.stamp(g, d, 'GPU ONLINE', W / 2, 190, { color: 'accent', size: 13, align: 'center' });
    TL.gauge(g, d, W / 2 - 220, 216, 440, wave, { label: '', color: 'hot' });

    dsTick(g, d, { x: W - 150, y: H - 70, label: 'GPUs', rate: 41231, alpha: 0.5 });

    // the plate gives this line 'wave' — a hundred thousand GPU, drawn as a burst of amplitude.
    LY.draw(g, d, { mode: 'plate', size: 46, y: H - 152 });

    dsLife(g, d, { gain: 0.85, dust: 70 });
    dsScanSweep(g, d, { alpha: 0.05, period: 2.5 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.6 + 0.9 * d.kick, 42), vignette: 0.28, grain: 0.042 }, dsLifePost(d, { amount: 1.2 })));
  },
});
