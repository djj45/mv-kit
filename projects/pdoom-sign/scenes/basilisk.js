// 17 basilisk · 60.25–62.52 · P · #18「I hear the basilisk boom」
// Picture: one giant warning triangle (SG.triangle, size 760) and, inside it, the basilisk — a single 34 px
// S-curve with a head, undulating on the drawing tick. At 'boom' start three ink shock rings leave the triangle's
// centre (spreading out, thinning from the pictogram weight down to the hairline) and the frame shakes 14.
// focus: the snake's head. Camera: the default push.
// Lyric: stamp L, low zone, key 'boom' — on the screen layer (MV.overlay), so the shake and the push stay off it.
MV.scene('basilisk', {
  /** the body: an S sampled along the vertical parameter u, head and tail held still while the middle sways */
  body(cx, cy, amp, phase) {
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const u = i / 48;
      const env = Math.pow(Math.sin(Math.PI * u), 0.7);
      pts.push([cx + amp * Math.sin(TAU * u + phase) * env, cy - 230 + 460 * u]);
    }
    return pts;
  },
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C, cx = 960, cy = 420, size = 760, iy = cy + size * 0.14;
    SG.triangle(g, cx, cy, size, {
      icon: (gg, ix) => {
        SG.poly(gg, this.body(ix, iy, 104, f.tq * 1.4), { lw: SG.LW.pict, color: C.ink });
        gg.save();
        gg.fillStyle = C.ink; gg.beginPath(); gg.arc(ix, iy - 230, 33, 0, TAU); gg.fill();
        gg.fillStyle = C.yellow; gg.beginPath(); gg.arc(ix + 12, iy - 241, 9, 0, TAU); gg.fill();
        gg.restore();
      },
    });
    // 'boom': three rings out of the centre of the triangle — thick at the start, a hairline by the time they go.
    // ROUND4 §2: the rings skip the caption's band — the words are ink on paper, and a ring running through them
    // reads as struck through (qa: lyric-touch).
    const cap = WD.measure(g, f, { treat: 'stamp', size: 'L', zone: 'low' });
    const band = cap ? [cap.y - 12, cap.y + cap.h + 12] : null;
    const boomT = f.lyrics.findWords('boom')[0].start;
    for (let i = 0; i < 3; i++) {
      const k = clamp((f.t - boomT - i * 0.10) / 0.85);
      if (k <= 0 || k >= 1) continue;
      g.save();
      g.strokeStyle = C.ink;
      g.lineWidth = lerp(SG.LW.pict, SG.LW.rule, Math.pow(k, 0.8));
      if (band) { g.beginPath(); g.rect(0, 0, W, band[0]); g.rect(0, band[1], W, H - band[1]); g.clip(); }
      g.beginPath(); g.arc(cx, cy, 40 + 1180 * ease.outCubic(k), 0, TAU); g.stroke();
      g.restore();
    }
    MV.focus(cx, iy - 230, 'basilisk head');
    // key only once 'boom' is sung: words.js lays the yellow block out with the whole sentence, so passing the key
    // up front would park a block of empty yellow at the bottom of the frame for the first 1.8 s of the shot.
    // The lyric is on the screen layer (MV.overlay): drawn after the camera, so this shot's 14 px shake and the
    // camera's push no longer ride on it. That retires round 1's `y: 928` (it was lifted off the low zone only
    // because the shake on top of the push took the ink to the 96 px margin): back on the low zone the ink's bottom
    // sits at the safe line, 120 px from the edge, and the sign's base line — which used to be carried into the
    // caption's cap tops by the shake — now stays 5 px above them (a few px of cap top during the shake's extremes).
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'L', zone: 'low', key: f.t >= boomT ? 'boom' : null }));
    return { shake: 14 * Math.max(f.a.kick, pulse(f.t, boomT, 0.45)) };
  },
});
