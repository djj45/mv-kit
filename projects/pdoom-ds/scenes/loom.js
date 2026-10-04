// loom — 40 (126.12–127.92) · rose · paid for by "Just as foretold by Loom".
// The loom: token rain (MX.rain, the same builder as masked) falling as the warp, and a weft thread carried
// across it left to right, one row per beat, so the weave is written by the music. Where the two cross, a point
// of light is left behind and the pattern starts to look like something — but never quite resolves. The warp does
// not hang there: it falls fast enough to see, the crossings pulse as the cloth takes up tension, and the shuttle
// at the end of the live thread is the only thing at full gain.
MV.scene('loom', {
  init() {
    this.warp = MX.rain(2400, { w: 14, spread: 6.8, h: 8.2, len: 1.4, seed: 41 });
    const ROWS = 12, SEGS = 14, x0 = -3.5, x1 = 3.5;            // the weft: 12 rows, each written by one beat
    this.ROWS = ROWS;
    this.weft = new Float32Array(ROWS * SEGS * 8);
    let k = 0;
    for (let r = 0; r < ROWS; r++) {
      const y = -2.3 + r * 0.42, b = 0.5 + hash(r, 8) * 0.5;
      for (let s = 0; s < SEGS; s++) {
        const xa = lerp(x0, x1, s / SEGS), xb = lerp(x0, x1, (s + 1) / SEGS);
        this.weft[k] = xa; this.weft[k + 1] = y; this.weft[k + 2] = 0.5;
        this.weft[k + 3] = xb; this.weft[k + 4] = y; this.weft[k + 5] = 0.5;
        this.weft[k + 6] = b; this.weft[k + 7] = 0;
        k += 8;
      }
    }
    // the crossings, ordered row by row so they appear as the shuttle passes
    const pts = [];
    for (let r = 0; r < ROWS; r++) {
      const y = -2.3 + r * 0.42;
      for (let c = 0; c < 34; c++) {
        const x = lerp(x0, x1, (c + 0.5) / 34);
        pts.push([x, y + 0.5 * (hash(r * 34 + c, 4) - 0.5), 0.5]);
      }
    }
    this.cross = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { this.cross[i * 3] = p[0]; this.cross[i * 3 + 1] = p[1]; this.cross[i * 3 + 2] = p[2]; });
    this.crossN = pts.length;
    this.dust = LG.ball(2000, 9, { seed: 163 });
  },
  render(g, f) {
    const d = dsFrame(f, 'rose');
    d.g = g;
    const lt = d.lt;
    const beats = Math.max(0, d.beat - d.audio.beatAt(d.from));
    const inShot = clamp(beats / 3.6);                       // 12 rows over the shot: 3 rows per beat
    const rows = clamp(inShot) * this.ROWS;
    const row = Math.min(this.ROWS - 1, Math.floor(rows));
    const rp = clamp(rows - row);                            // how far the shuttle is along the live row
    const shuttle = [lerp(-3.5, 3.5, rp), -2.3 + row * 0.42, 0.62];
    const crossN = Math.round(clamp(rows / this.ROWS) * this.crossN);
    const fall = beats * 0.85;                               // two weft rows of fall per beat: the loom advances

    const cam = dsCam(d, {
      yaw: 0.1 + lt * 0.05 + Math.sin(lt * 0.22) * 0.06, pitch: 0.04,
      dist: lerp(8.4, 6.9, clamp(lt / Math.max(0.2, d.dur))), fov: 34, punch: 0.03, seed: 61,
    });
    const list = [
      dsAir(d, this.dust, { gain: 0.16, size: 1.0, dof: 34, count: 900 }),
      // the warp: the token rain, falling. The buffer is long, so scrolling it down never wraps in this shot.
      { S: this.warp, o: { width: 1, gain: 0.42, color: 'dim', glow: 0.14, fog: 14, model: { pos: [Math.sin(lt * 0.8) * 0.12, -fall, 0] } } },
      { S: this.weft, o: { width: 1, gain: 0.5, color: 'accent', glow: 0.25, upto: clamp(rows / this.ROWS) } },
      // the cloth under tension: the crossings pulse, so the weave is never a still image
      { P: this.cross, o: { size: 1.5 + 0.25 * Math.sin(lt * 5.2), gain: 0.62, color: 'fg', count: crossN, dof: 8, focus: 7.8, twinkle: 0.45, t: d.t } },
      // the one thing at full gain: the shuttle, and the thread behind it is already lit
      { P: new Float32Array([shuttle[0], shuttle[1], shuttle[2]]), dyn: true, o: { size: 4.6 + d.kick * 2.6, gain: 1.15, color: 'hot', dof: 5, blur: 1.3 } },
    ];
    dsLight(d, list, { cam, end: { bloom: 0.52 + d.kick * 0.25, exposure: 0.86, ca: 0.45 + d.kick * 0.3, radius: 0.5 } });

    dsTele(g, d, {
      id: 'c40', name: 'loom',
      rows: [
        ['warp', '2 400'],
        ['weft', String(Math.round(rows)).padStart(2, '0') + ' / 12'],
        ['pick', 'twill 2/2'],
        ['pattern', (0.35 + 0.55 * inShot).toFixed(2)],
        ['legible', inShot > 0.6 ? 'ALMOST' : '...'],
      ],
      foot: 'as foretold',
    });
    TL.stamp(g, d, 'WARP 24 · WEFT 12 · PICK 1 PER BEAT', 110, 320, { color: 'dim', size: 13 });
    TL.gauge(g, d, 110, 356, 320, clamp(rows / this.ROWS), { label: 'CLOTH', color: 'accent' });
    dsLine(g, String(Math.round(rows)).padStart(2, '0'), 1452, 320, { font: dsSans(46, 200), size: 46, color: dsTone(d, 'accent', 0.9), glow: 14, align: 'left', track: 2 });
    TL.stamp(g, d, 'ROWS PICKED', 1452, 352, { color: 'dim', size: 12 });
    dsTick(g, d, { x: W - 150, y: H - 70, label: 'PICK', rate: 96, alpha: 0.5 });

    // the plate gives this line 'carve' — "foretold by Loom": woven, then cut. The sentence is cut out of the
    // light under the cloth, where the cloth is still being made.
    LY.draw(g, d, { mode: 'plate', size: 56, y: H - 215, pad: 30 });

    dsLife(g, d, { gain: 1.0, dust: 80 });
    dsScanSweep(g, d, { alpha: 0.13, period: 2.0 });
    return dsFin(d, Object.assign({ shake: dsShake(d, 0.5 + 0.7 * d.kick, 62), vignette: 0.26, grain: 0.04 }, dsLifePost(d, { amount: 1.4 })));
  },
});
