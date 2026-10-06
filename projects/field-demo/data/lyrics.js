// Placeholder lyrics for the demo (there is no song): original lines, timed evenly word by word on the 120 bpm grid.
// A real project gets this file from analysis/align_lyrics.py.
window.MV_DATA = window.MV_DATA || {};
MV_DATA.lyrics = (() => {
  const L = [
    [0.45, 1.75, 'a magnet under iron dust'], [2.25, 3.85, 'turn, and the lines appear'], [4.25, 5.85, 'the field lifts off the tray'],
    [6.45, 7.95, 'nothing in here is flat'], [8.50, 10.05, 'the walls are all one wall'], [10.50, 11.90, '走进去就不想出来'],
    [12.50, 13.90, 'one turns, and all of them turn'], [14.40, 15.80, '没有人下命令'], [16.25, 17.75, 'hold the shape, hold it'],
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
