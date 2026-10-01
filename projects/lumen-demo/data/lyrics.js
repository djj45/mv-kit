// Placeholder lyrics for the demo (there is no song): original lines, timed evenly word by word.
// A real project gets this file from analysis/align_lyrics.py.
window.MV_DATA = window.MV_DATA || {};
MV_DATA.lyrics = (() => {
  const L = [
    [0.55, 2.3, 'wake up in the static'], [2.5, 3.7, 'count the lights'],
    [4.15, 5.9, 'every point a heartbeat'], [6.1, 7.6, 'every line a vow'],
    [8.2, 9.9, '从一粒光开始'], [10.15, 11.7, '连成一句话'],
    [12.2, 13.9, '把名字拆成星尘'], [14.2, 15.7, '再拼回你'],
    [16.3, 17.9, 'plot me on paper'], [18.1, 19.6, 'where the curve begins'],
    [20.05, 21.2, 'signal lost'], [21.5, 23.0, 'say it again'],
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
