// demo.js — palette, fonts and the lyric line shared by the three demo shots.
(function (G) {
'use strict';
const D = {
  paper: '#EEF0F4', ink: '#1A2233', ink2: '#7A8499', ink3: '#B8BFCC', red: '#E5482E',
  mono(g, size) { g.font = `500 ${size}px Menlo, "DejaVu Sans Mono", monospace`; g.letterSpacing = `${0.04 * size}px`; },
  display(g, size) { g.font = `700 ${size}px "Avenir Next Condensed", "DIN Condensed", "Helvetica Neue", "DejaVu Sans", sans-serif`; g.letterSpacing = '0px'; },
  /**
   * The line being sung, word by word: a word appears in ink on its start (never before), unsung words wait in a
   * pale grey. o: x, y, size, align, maxW. BOX.fit shrinks the whole line to maxW, MV.keep tells the camera not to push
   * it out of the frame (ignored when drawn on the screen layer, MV.overlay), and each word is its own fillText so
   * `render.py qa` can measure each one.
   */
  line(g, f, o) {
    const L = f.lyrics.lineAt(f.t, f.from);          // with f.from: a line sung out before this shot is not carried into it
    if (!L) return;
    const toks = f.lyrics.tokens(L), txt = toks.map(t => t.text).join(' ');
    const size = BOX.fit(g, txt, o.size || 120, o.maxW || W - 2 * 120, { font: D.display });
    const sp = g.measureText(' ').width, total = g.measureText(txt).width;
    let x = o.align === 'center' ? o.x - total / 2 : o.x;
    const m = g.measureText(txt);
    MV.keep(g, x, o.y - m.actualBoundingBoxAscent, total, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
    g.save(); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    for (const tk of toks) {
      const sung = f.t >= tk.start;
      g.fillStyle = sung ? (o.color || D.ink) : D.ink3;
      g.fillText(tk.text, x, o.y);
      x += g.measureText(tk.text).width + sp;
    }
    g.restore();
    return size;
  },
  paperBg(g) { g.fillStyle = D.paper; g.fillRect(0, 0, W, H); },
};
G.D = D;
})(window);
