// scenes/gpu.js — a hundred thousand GPU: rack after rack growing across the sheet on the beat, a paperclip on
// every one of them. The camera steps in on the newest column.
MV.scene('gpu', {
  init() {
    this.cols = 10; this.rows = 3;
  },
  render(g, f) {
    OHP.back(g, f, { red: 0.25, cold: 0.15 });
    const x0 = 150, y0 = 290, cw = 172, chh = 170, gx = 16, gy = 20;
    const grown = Math.pow(prog(f.t, f.from, f.from + 3.2), 0.8) * this.cols;
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        const on = c + 0.001 < grown;
        // the newest column slides in from the right
        const slide = on ? ease.outCubic(clamp((grown - c) * 1.4)) : 0;
        if (!on) continue;
        const x = x0 + c * (cw + gx) + (1 - slide) * 260, y = y0 + r * (chh + gy);
        OHP.block(g, f, x, y, cw, chh, { color: OHP.C.ink, w: 6, seed: c * 7 + r, fill: r % 2 ? 'rgba(35,38,46,0.07)' : null });
        for (let k = 0; k < 3; k++) {                      // the slots on the front
          g.fillStyle = 'rgba(35,38,46,0.45)';
          g.fillRect(x + 22 + k * 46, y + 26, 34, chh - 90);
        }
        g.fillStyle = Math.floor(f.t * 6 + c + r) % 3 === 0 ? OHP.C.red : 'rgba(60,120,80,0.8)';
        g.beginPath(); g.arc(x + cw - 24, y + 20, 6, 0, TAU); g.fill();
        OHP.clip(g, x + 20, y + chh - 34, 40 + (c % 3) * 8, 0.15 + (r % 3) * 0.4, 0.4);
      }
      if (c === Math.min(this.cols - 1, Math.floor(grown))) {
        const x = x0 + c * (cw + gx) + cw, y = y0 + chh;
        MV.focus(x, y, 'the newest rack');
      }
    }
    OHP.dust(g, f, { gain: 1.1 });
    OHP.slide(g, f, 30, { x: 120, y: 74 });
    MV.overlay(o => OHP.lyric(o, f, { x: 200, y: 930, size: 60, style: 'hand', maxW: 1520 }));
    return OHP.post(f, { shake: 8 + 7 * f.a.kick, snare: 0.07 });
  },
});

