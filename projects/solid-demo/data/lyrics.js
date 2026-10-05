// Placeholder lyrics for the demo (there is no song): original lines, timed evenly word by word.
// A real project gets this file from analysis/align_lyrics.py.
window.MV_DATA = window.MV_DATA || {};
MV_DATA.lyrics = (() => {
  const L = [
    [0.5, 2.1, 'hold the light inside the glass'], [2.5, 3.9, 'it bends to find you'], [4.3, 5.5, '心是透明的'],
    [6.4, 8.0, 'room after room after room'], [8.5, 10.1, '一直走到光的尽头'], [10.65, 11.6, 'keep walking'],
    [12.7, 13.9, 'shake the plate'], [14.2, 15.9, 'the sand finds the quiet lines'], [16.3, 17.5, '安静的地方'],
  ];
  const cjk = s => /[㐀-鿿]/.test(s);
  return {
    version: 1,
    lines: L.map(([a, b, text]) => {
      const c = cjk(text), parts = c ? [...text] : text.split(' '), wt = parts.map(p => p.length + 1), tot = wt.reduce((s, x) => s + x, 0);
      let t = a;
      const words = parts.map((w, i) => { const d = (b - a) * wt[i] / tot, o = { w, start: +t.toFixed(3), end: +(t + d * 0.92).toFixed(3), conf: 1 }; if (c) o.join = true; t += d; return o; });
      return { text, start: a, end: b, words };
    }),
  };
})();
