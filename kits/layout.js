// mv-kit — layout kit: text that stays where it is put. Add "layout" to project.kits.
//
// Taken from projects/pdoom-bolt, where three rounds of review went on text that slipped out of its table
// (a value under the line, a title touching the frame, a row too short for its two lines). The rule that ended it:
// never place text in a box with hand-written x / y. Use these; they measure the real ink, shrink to fit, keep a
// margin, and register every box with MV.box so `render.py qa` checks the result.
//
//   BOX.font(g, size, o)                  set g.font / letterSpacing from o: font (CSS family, or a function (g, size)
//                                         that sets them itself, e.g. a project's LK.mono), weight, track (em)
//   BOX.text(g, text, x, y, o)            one line: o.size, o.align, o.base, o.maxW (shrink until it fits), o.color,
//                                         o.alpha, o.keep (MV.keep it: the camera will not push it out of the frame)
//   BOX.center(g, text, cx, cy, o)        a short text with its real ink centred on a point: the number in a disc,
//                                         the letter in a square (textBaseline 'middle' centres the em box, not the ink)
//   BOX.panel(g, x, y, w, h, o)           a framed plate (o.fill, o.stroke, o.lw, o.pad); registered with MV.box.
//                                         Returns { x, y, w, h, pad }
//   BOX.lines(g, P, lines, o)             stack lines inside a panel from the top, all the same size, shrunk until they
//                                         fit P's height and width with P.pad around; o.gap = line spacing (× size)
//   BOX.table(g, x, y, cols, rows, o)     a ruled table: o.cw (number or per-column array), o.rh, o.color, o.lw.
//                                         Registers every cell. Returns T = { x, y, w, h, cw, rh, colX, rowY, cols, rows }
//   BOX.cell(g, T, col, row, text, o)     a text in a cell: centred on the row by its real ink (o.at: 0..1 of the row
//                                         height instead, for two lines per row), padded o.pad (12), shrunk to fit
//
// All of them take the size you would like and give back the size they used; nothing ever grows past what you asked.
// A table / panel owns the text its cell / lines put in it (MV.owner / MV.within), so `render.py qa` checks that text
// strictly (inside, with room) and reports any other text landing on it only as a clash.
(function (G) {
'use strict';
const MV = G.MV;

const BOX = {
  font(g, size, o) {
    o = o || {};
    if (typeof o.font === 'function') { o.font(g, size, o); return; }
    g.font = `${o.weight || 400} ${size}px ${o.font || 'sans-serif'}`;
    g.letterSpacing = `${(o.track || 0) * size}px`;
  },
  /** biggest size ≤ size at which `text` is at most maxW wide (and ≥ o.min, default 6) */
  fit(g, text, size, maxW, o) {
    o = o || {};
    BOX.font(g, size, o);
    const w = g.measureText(String(text)).width;
    if (maxW == null || w <= maxW || w <= 0) return size;
    const s = Math.max(o.min || 6, size * maxW / w * 0.995);
    BOX.font(g, s, o);
    return s;
  },
  text(g, text, x, y, o) {
    o = o || {};
    const s = String(text), size = BOX.fit(g, s, o.size || 24, o.maxW, o);
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.fillStyle = o.color || '#fff'; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    g.fillText(s, x, y);
    if (o.keep) {
      const m = g.measureText(s);
      MV.keep(g, x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent, m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
    }
    g.restore();
    return size;
  },
  /**
   * A short text (a number in a disc, a letter in a square, a mark in a circle) with its INK centred on (cx, cy).
   * textAlign 'center' + textBaseline 'middle' centres the em box instead: digits sit high or low, and a
   * letterSpacing (a tracked mono face) adds space after the last letter, pushing it off to the left.
   * Drawn without letterSpacing. o: size, font / weight (as BOX.font), color, alpha, maxW. Returns the size used.
   */
  center(g, text, cx, cy, o) {
    o = o || {};
    const s = String(text), size = BOX.fit(g, s, o.size || 24, o.maxW, o);
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.letterSpacing = '0px';
    g.fillStyle = o.color || '#fff'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const m = g.measureText(s);
    g.fillText(s, cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2,
                  cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
    g.restore();
    return size;
  },
  panel(g, x, y, w, h, o) {
    o = o || {};
    g.save();
    if (o.fill) { g.fillStyle = o.fill; g.fillRect(x, y, w, h); }
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lw || 1.5; g.strokeRect(x, y, w, h); }
    g.restore();
    const pad = o.pad == null ? Math.max(10, Math.min(w, h) * 0.08) : o.pad;
    const owner = MV.owner(o.name || 'panel');               // BOX.lines(g, P, …) draws as this owner: qa checks it strictly
    MV.box(g, x, y, w, h, { name: o.name || 'panel', owner });
    return { x, y, w, h, pad, owner };
  },
  lines(g, P, lines, o) {
    o = o || {};
    const L = lines.map(String), gap = o.gap == null ? 1.3 : o.gap;
    let size = o.size || 24;
    const availW = P.w - 2 * P.pad, availH = P.h - 2 * P.pad;
    // ink height of a line is about 0.75–1.0 em; n lines take (n − 1)·gap + 1 em
    size = Math.min(size, availH / ((L.length - 1) * gap + 1.0));
    for (const s of L) size = Math.min(size, BOX.fit(g, s, size, availW, o));
    BOX.font(g, size, o);
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.fillStyle = o.color || '#fff'; g.textAlign = 'left'; g.textBaseline = 'top';
    MV.within(P.owner, () => L.forEach((s, i) => g.fillText(s, P.x + P.pad, P.y + P.pad + i * size * gap)));
    g.restore();
    return size;
  },
  table(g, x, y, cols, rows, o) {
    o = o || {};
    const cw = Array.isArray(o.cw) ? o.cw.slice(0, cols) : new Array(cols).fill(o.cw || 150);
    while (cw.length < cols) cw.push(cw[cw.length - 1] || 150);
    const rh = o.rh || 30, w = cw.reduce((a, b) => a + b, 0), h = rows * rh;
    const colX = []; let acc = 0;
    for (const k of cw) { colX.push(x + acc); acc += k; }
    g.save(); g.strokeStyle = o.color || '#fff'; g.lineWidth = o.lw || 1;
    for (let i = 0; i <= rows; i++) { g.beginPath(); g.moveTo(x, y + i * rh); g.lineTo(x + w, y + i * rh); g.stroke(); }
    for (let i = 0; i <= cols; i++) { const cx = i < cols ? colX[i] : x + w; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx, y + h); g.stroke(); }
    g.restore();
    const owner = MV.owner(o.name || 'table');               // BOX.cell(g, T, …) draws as this owner: qa checks it strictly
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) MV.box(g, colX[c], y + r * rh, cw[c], rh, { name: 'cell', owner });
    return { x, y, w, h, cw, rh, cols, rows, colX, owner, rowY: Array.from({ length: rows }, (_, i) => y + i * rh) };
  },
  cell(g, T, col, row, text, o) {
    o = o || {};
    if (text == null || col < 0 || col >= T.cols || row < 0 || row >= T.rows) return 0;
    const s = String(text), pad = o.pad == null ? 12 : o.pad;
    // never taller than the row allows (with room above and below), never wider than the column
    let size = Math.min(o.size || 15, (T.rh - 2 * Math.max(3, pad * 0.4)) / 0.8);
    size = BOX.fit(g, s, size, T.cw[col] - 2 * pad, o);
    const m = g.measureText(s), inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const at = o.at == null ? 0.5 : o.at;                       // where the ink's middle sits, as a share of the row height
    const yMid = T.rowY[row] + T.rh * at;
    const base = clamp(yMid + inkH / 2 - m.actualBoundingBoxDescent,
                       T.rowY[row] + 3 + m.actualBoundingBoxAscent, T.rowY[row] + T.rh - 3 - m.actualBoundingBoxDescent);
    const x = o.align === 'right' ? T.colX[col] + T.cw[col] - pad : o.align === 'center' ? T.colX[col] + T.cw[col] / 2 : T.colX[col] + pad;
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.fillStyle = o.color || '#fff'; g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
    MV.within(T.owner, () => g.fillText(s, x, base));
    g.restore();
    return size;
  },
};

G.BOX = BOX;
})(window);
