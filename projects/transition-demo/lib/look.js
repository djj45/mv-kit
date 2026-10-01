// transition-demo — the shared look: paper, cobalt line, one wash colour, and a slow camera push.
const TD = {
  paper: '#F1EEE6', line: '#1E3A8A', wash: 'rgba(117,147,200,0.35)', pale: '#E6ECF4', night: '#C9D3E0',
  serif: '"Songti SC", "STSong", "Noto Serif CJK SC", "Noto Serif CJK TC", serif',
  /** Camera push about the frame centre: scale z at progress p. Returns { z, at([x, y]) -> screen, rect([x, y, w, h]) }. */
  cam(z) {
    const at = ([x, y]) => [W / 2 + z * (x - W / 2), H / 2 + z * (y - H / 2)];
    return { z, at, rect: ([x, y, w, h]) => { const [sx, sy] = at([x, y]); return [sx, sy, w * z, h * z]; } };
  },
  stroke(g, w = 4, col = TD.line) { g.lineWidth = w; g.strokeStyle = col; g.lineJoin = g.lineCap = 'round'; g.stroke(); },
};
