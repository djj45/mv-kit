// transition-demo — no song: plain seconds on a 120 bpm grid. Every transition says what crosses the cut.
MV.timeline(({ T0, T1, land }) => {
  const bird = (g, k) => {                       // carried across the pan: one bird flies over the seam
    const x = lerp(260, 1660, k), y = 300 - 80 * Math.sin(Math.PI * k), w = 34 * (1 + 0.25 * Math.sin(k * 40));
    g.beginPath(); g.moveTo(x - w, y - 14); g.quadraticCurveTo(x - w / 2, y - 22, x, y); g.quadraticCurveTo(x + w / 2, y - 22, x + w, y - 14);
    TD.stroke(g, 4);
  };
  const shots = [
    ['room', T0],
    // the round window is the moon: push through it (lands on the bar line at 4 s)
    ['moon', land(4, 1.2), { fadeIn: 1.2, wipe: 'zoom', params: { match: ['window', 'moon'], shape: 'round' } }],
    // night → morning: time runs right; a bird crosses with the camera
    ['shore', 8, { fadeIn: 0.9, wipe: 'pan', params: { dir: 'right' }, carry: bird }],
    // the waves' strokes come apart and re-form as the character
    ['glyph', 11, { fadeIn: 1.4, wipe: 'reflow' }],
    // pull out: the character is the one painted on the vase
    ['room', land(14, 1.2), { fadeIn: 1.2, wipe: 'zoom', params: { match: ['char', 'mark'], blend: 'darken', end: true } }],
  ];
  return shots.map(([scene, from, tr = {}], i) => {
    const next = shots[i + 1], to = next ? next[1] + ((next[2] || {}).fadeIn || 0) : T1;
    return { scene, from, to, ...tr, params: tr.params || {} };
  });
});
