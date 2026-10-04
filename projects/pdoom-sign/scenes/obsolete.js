// 23 obsolete · 77.52–81.15 · P · #24「Now von Neumann's obsolete」
// Picture: an old computer pictogram — a box, two tape reels that spin and wind down, a row of switches. It
// rattles on every kick; at 'obsolete' start a prohibition slash is drawn from the top left to the bottom right
// across it and an OBSOLETE stamp comes down over the machine (heavy XL). The stamp is a thing in the picture;
// the lyric is a separate line above it. focus: the centre of the tape reels (they turn, slower and slower).
// Lyric: stamp M, top zone, key 'obsolete' — on the screen layer (MV.overlay), so the rattle and the push stay off it.
MV.scene('obsolete', {
  /** one reel: a 34 px ring, three spokes, a hub and a marker on the rim so the winding down is visible */
  reel(g, x, y, r, ang) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.strokeStyle = SG.C.ink; g.lineWidth = SG.LW.pict; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    for (let i = 0; i < 3; i++) {
      const a = i * TAU / 3;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * (r - 20), Math.sin(a) * (r - 20)); g.stroke();
    }
    g.fillStyle = SG.C.ink;
    g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
    g.beginPath(); g.arc(r - 34, 0, 16, 0, TAU); g.fill();
    g.restore();
  },
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    // the reels wind down: the speed is 30·e^(−1.1·t) rad/s, so the angle has this closed form
    const ang = 30 * (1 - Math.exp(-1.1 * (f.t - f.from))) / 1.1;
    const jolt = -6 * f.a.kick;                       // the old machine rattles on the beat
    g.save(); g.translate(0, jolt);
    g.save();
    g.strokeStyle = C.ink; g.lineWidth = SG.LW.pict; g.lineJoin = 'round';
    SG.rr(g, 730, 330, 460, 460, 37); g.stroke();
    g.restore();
    this.reel(g, 850, 470, 80, ang);
    this.reel(g, 1070, 470, 80, -ang);
    for (let i = 0; i < 7; i++) {                     // the row of switches: a fixed pattern, all but two down
      const x = 793 + i * 50, on = hash(i, 5) > 0.55;
      g.save();
      g.fillStyle = on ? C.ink : C.paper;
      g.strokeStyle = C.ink; g.lineWidth = SG.LW.plate; g.lineJoin = 'round';
      SG.rr(g, x, 650, 34, 60, 8); g.fill(); g.stroke();
      g.restore();
    }
    BOX.text(g, 'UNIT 01', 780, 765, { size: 40, font: SG.mono, color: C.ink2, maxW: 220 });
    g.restore();
    // 'obsolete': the slash is drawn across the whole machine, left top to right bottom
    const wObs = f.lyrics.findWords('obsolete')[0].start;
    const kSlash = ease.outCubic(clamp((f.t - wObs) / 0.42));
    if (kSlash > 0) SG.poly(g, [[520, 300], [520 + 930 * kSlash, 300 + 600 * kSlash]], { lw: SG.LW.pict, color: C.ink });
    // a yellow ground under the stamp (ROUND4 §1): black type on the black machine merged into one mass (qa: text-touch),
    // and a yellow stamp over a black drawing is the same language as the yellow blocks behind key words
    if (f.t >= wObs) SG.stamp(g, 'OBSOLETE', 960, 560, 240, { k: ease.outCubic(clamp((f.t - wObs) / 0.25)), rot: -6, fill: SG.C.yellow });
    MV.focus(850, 470 + jolt, 'tape reel');
    // key only once 'obsolete' is sung (see scenes/basilisk.js: words.js lays the yellow block out with the whole
    // sentence, so the key word would otherwise wait 2.3 s as a block of empty yellow).
    // The lyric goes on the screen layer (MV.overlay): a top-zone caption, drawn after the camera, so the slow push
    // and the machine's kick rattle no longer move the words (and the push is no longer clamped by their keep box).
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'M', zone: 'top', key: f.t >= wObs ? 'obsolete' : null }));
    return {};
  },
});
