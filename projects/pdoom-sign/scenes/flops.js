// 20 flops · 66.15–69.34 · B · #21「One E thirty FLOPs a second」
// Pure lyric screen #2: one huge number (heavy XXL, paper) that jumps with the words — 1 → 1E → 1E30 →
// 1E30 FLOP → 1E30 FLOP/S — over the lyric itself (count's own stamp, M, low zone, paper). Nothing else is on
// the page. focus: the last digit of the number (the count treatment reports it). Camera: the default push.
// Both the number and its lyric go on the screen layer (MV.overlay): drawn after the camera, they never move.
// The cut lands on the beat (66.154) and 'One' is two frames later: before the first word the page would be a
// blank black frame, so the number's slot stands there empty — a paper outline exactly where the number prints
// (the count treatment's own box: x ± w/2, numY − 0.72 size … + 0.08 size) — and the number covers it.
MV.scene('flops', {
  init(MV) { this.line = MV.lyrics.get('One E thirty'); },
  render(g, f) {
    SG.bg(g, 'B');
    // the steps are keyed to the words of the line this shot is on: before its first word there is no number yet
    const T = { one: '1', e: '1E', thirty: '1E30', flops: '1E30 FLOP', second: '1E30 FLOP/S' };
    const cur = WD.current(f), steps = [];
    if (cur) {
      for (const w of WD.words(f, cur.line)) {
        const s = T[w.text.toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (s) steps.push([w.i, s]);
      }
    }
    MV.overlay(o => {
      // ROUND3 §2: the first two frames carry nothing — the outlined empty readout round 2 drew here read as an
      // unfinished frame; the shot opens on black and the first number lands on 'One'.
      WD.line(o, f, { treat: 'count', steps, size: 'XXL', lyricSize: 'M', numY: 470, zone: 'low', color: SG.C.paper });
    });
    if (!steps.length) MV.focus(W / 2, 470, 'number');
  },
});
