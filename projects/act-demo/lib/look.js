// look.js — act-demo's palette, floor, the spark, and the lyric line (shared by the three shots).
(function (G) {
'use strict';
const LK = {
  paper: '#EEF0F4', floor: '#E2E5EC', ink: '#1A2233', ink3: '#B8BFCC', red: '#E5482E',
  bg(g) { g.fillStyle = LK.paper; g.fillRect(0, 0, W, H); },
  /** the floor: flat ground from x0 to x1 at y; past x1 a ledge drops away */
  floor(g, y, x1 = W + 40) {
    g.fillStyle = LK.floor; g.fillRect(-40, y, x1 + 40, H - y + 40);
    g.strokeStyle = LK.ink; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-40, y); g.lineTo(x1, y); if (x1 < W) g.lineTo(x1, H + 40); g.stroke();
  },
  /** the spark: a red four-point star in a soft glow, r = radius of the star, k = 0..1 extra flare */
  spark(g, x, y, r, t, k = 0) {
    const gl = g.createRadialGradient(x, y, 0, x, y, r * (3.2 + 1.5 * k));
    gl.addColorStop(0, 'rgba(255,214,120,0.75)'); gl.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * (3.2 + 1.5 * k), 0, TAU); g.fill();
    const a = t * 1.6;
    g.fillStyle = LK.red; g.strokeStyle = LK.ink; g.lineWidth = Math.max(2, r * 0.08); g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 8; i++) { const b = a + i * Math.PI / 4, rr = (i % 2 ? 0.32 : 1) * r * (1 + 0.25 * k); g[i ? 'lineTo' : 'moveTo'](x + Math.cos(b) * rr, y + Math.sin(b) * rr); }
    g.closePath(); g.fill(); g.stroke();
  },
  /**
   * The line being sung, word by word, on the screen layer: a word turns ink on its start (never before), the rest
   * wait in pale grey. o: x, y, size, maxW. Each word is its own fillText so `render.py qa` measures each one.
   */
  line(g, f, o) {
    const L = f.lyrics.lineAt(f.t, f.from);
    if (!L) return;
    const toks = f.lyrics.tokens(L), txt = toks.map(t => t.text).join(' ');
    const font = (gg, s) => { gg.font = `700 ${s}px "Avenir Next Condensed", "DIN Condensed", "Helvetica Neue", "DejaVu Sans", sans-serif`; };
    const size = BOX.fit(g, txt, o.size || 80, o.maxW || W - 240, { font });
    font(g, size);
    const sp = g.measureText(' ').width;
    let x = o.x;
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    for (const tk of toks) {
      g.fillStyle = f.t >= tk.start ? LK.ink : LK.ink3;
      g.fillText(tk.text, x, o.y);
      x += g.measureText(tk.text).width + sp;
    }
  },
};
const lineDraw = LK.line;
LK.line = (g, f, o) => MV.lyric(() => lineDraw(g, f, o));
G.LK = LK;
})(window);
