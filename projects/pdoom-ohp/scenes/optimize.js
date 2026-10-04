// scenes/optimize.js — the descent: step after step drawn as arrows down the sheet, faster and faster, until the
// last ones run off the bottom edge. The lyric is on the screen layer so the insert can follow the newest arrow.
MV.scene('optimize', {
  init() {
    this.steps = [];
    for (let i = 0; i < 260; i++) this.steps.push([hash(i, 3, 7), hash(i, 5, 9), hash(i, 11, 2)]);
  },
  render(g, f) {
    OHP.back(g, f, {});
    const n = Math.min(260, Math.floor(Math.pow(prog(f.t, f.from, f.to), 0.62) * 260));
    const run = f.a.rms;
    let tip = [0, 0];
    for (let i = 0; i < n; i++) {
      const s = this.steps[i];
      const u = i / 260;
      const x = 180 + s[0] * 1560;
      const y = 190 + u * 680 + s[1] * 80 - run * 40 * s[2];      // the bottom band stays clear for the line
      const len = 60 + s[2] * 90;
      const a = -0.6 + s[2] * 0.5;
      const b = [x + Math.cos(a) * len, y + Math.sin(a) * len];
      OHP.ink(g, f, [[x, y], b], { w: 6 + 3 * s[1], color: i % 17 === 0 ? OHP.C.red : OHP.C.ink, seed: i, boil: 0.9, tick: f.tick });
      OHP.ink(g, f, [[b[0] - 14, b[1] - 8], b, [b[0] - 16, b[1] + 12]], { w: 5, color: i % 17 === 0 ? OHP.C.red : OHP.C.ink, seed: i + 5, boil: 0.9, tick: f.tick });
      tip = b;
    }
    if (n > 0) MV.focus(tip[0], tip[1], 'the newest step');
    else MV.focus(W / 2, H / 2, 'the sheet');
    OHP.dust(g, f, {});
    OHP.slide(g, f, 12, { x: 120, y: 74 });
    MV.overlay(o => OHP.lyric(o, f, { x: 200, y: 930, size: 62, style: 'hand', maxW: 1520 }));
    return OHP.post(f, { shake: 4 + 5 * f.a.kick, snare: 0.05 });
  },
});

