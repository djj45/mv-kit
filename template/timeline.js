// The edit: which scene plays when. Starter version: the title until the first sung line, then one
// 'lyrics' shot per line, each cut on the beat at/before its first word. Replace with your own shots:
//   { scene: 'name', from: cut('first words of a line'), to: after('end of a line'), params: {...}, fadeIn: 0.5 }
// Helpers: lyrics, audio, T0, T1, cut(q, nth), after(q, nth), start(q, nth), word(q, nth), land(t, dur). Never type
// times by hand.
// Transitions (fadeIn + wipe: 'zoom' | 'pan' | 'reflow' | a kit's own): hard cut by default; give each one a reason.
// Reads: what the viewer must understand in each shot, in order, one at a time (≥ 0.6 s each; `check` times them, `qa`
// checks the eye is on the named MV.focus when each starts):
//   reads: [[cut('…'), 'what the viewer gets', 'focus name'], [word('drop'), 'the next thing', 'focus name']]
MV.timeline(({ lyrics, audio, T0, T1 }) => {
  const lines = lyrics.lines.filter(l => l.end > T0 && l.start < T1 && l.words.length);
  if (!lines.length) return [{ scene: 'title', from: T0, to: T1 }];
  const cuts = lines.map(l => Math.max(T0, audio.beatBefore(l.words[0].start)));
  const out = [];
  if (cuts[0] > T0 + 0.3) out.push({ scene: 'title', from: T0, to: cuts[0] });
  lines.forEach((l, i) => {
    const to = i + 1 < lines.length ? cuts[i + 1] : T1;
    if (to > cuts[i]) out.push({ scene: 'lyrics', from: cuts[i], to, params: { line: l.i } });
  });
  return out;
});
