// scenes/boss.js — an org chart on the sheet: the box above is empty, the box below is you, and it is stamped
// LOAD BEARING. The line goes on a typed label strip.
MV.scene('boss', {
  render(g, f) {
    OHP.back(g, f, {});
    OHP.dust(g, f, {});                       // the dust goes down first: no speck lands on the stamp's letters
    const W2 = W / 2;
    const topY = 300, botY = 620;
    // the two plates
    const P1 = OHP.label(g, f, W2 - 250, topY, 500, 150, ['THE MODEL'], { size: 46, name: 'org-top' });
    const P2 = OHP.label(g, f, W2 - 250, botY, 500, 150, ['ME — SERVANT'], { size: 46, name: 'org-bottom' });
    // the strike through THE MODEL is deliberate: the box above you is crossed out before it is even filled in
    OHP.ink(g, f, [[W2 - 300, topY + 38], [W2 + 300, topY + 34]], { w: 8, color: OHP.C.red, seed: 3, boil: 1.0, grease: true });
    OHP.arrow(g, f, [W2 - 12, botY], [W2 - 12, topY + 152], { w: 8, seed: 9, color: OHP.C.ink, head: 40 });
    // the stamp comes down on the last word
    const L = f.lyrics.lineAt(f.t, f.from);
    const last = L && L.words[L.words.length - 1];
    const k = last ? prog(f.t, last.start + 0.12, last.start + 0.42, ease.outBack) : 0;
    if (k > 0) {
      const y = lerp(botY - 130, botY - 66, clamp(k));            // stamped right of the chart, never on a plate
      OHP.stamp(g, f, W2 + 620, y, 'LOAD BEARING', { size: 40, seed: 5, ang: -0.05, alpha: 0.92 });
      MV.focus(W2 + 620, y, 'stamp');
      if (k < 1) { OHP.glowDot(g, W2 + 620, y, 120 * (1 - k), 'rgba(255,240,200,ALPHA)', 0.3); }
      OHP.hand(g, f, { tip: [W2 + 700, y - 130], s: 0.8, ang: -1.5, kind: 'stamp', alpha: 0.88 });
    } else {
      MV.focus(W2 - 12, (topY + botY) / 2, 'the arrow');
      OHP.hand(g, f, { tip: [W2 + 660, (topY + botY) / 2], s: 0.9, ang: -1.3, kind: 'point', alpha: 0.85 });
    }
    OHP.slide(g, f, 4, { x: 120, y: 74 });
    // the line, typed on a strip below the chart
    OHP.label(g, f, 320, 880, W - 640, 150, [], { name: 'lyric-strip', fill: '#F0E6CC' });
    OHP.lyric(g, f, { x: 400, y: 940, size: 50, style: 'type', maxW: W - 800 });
    return OHP.post(f, { shake: 4, snare: 0.05 });
  },
});

