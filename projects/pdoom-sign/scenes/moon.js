// 18 moon · 62.52–64.34 · B · #19「NVDA to the moon」
// Picture: a price line (34 px, yellow) rushing up to the right; the chart scales about the corner it comes from
// (CAM.keep with that corner as the anchor and the moon's rim as the safe edge), so the tip stops on the moon
// instead of leaving the top of the frame, and the world pulls back under it. The moon is a paper disc fixed in
// the sky, top right. focus: the tip of the line. Lyric: tape along the line's angle (−28°), M, at a fixed
// spot on the page — on the screen layer (MV.overlay), which is where it always was drawn (outside the world).
MV.scene('moon', {
  init() {
    const AX = 280, AY = 950, th = -28 * Math.PI / 180;
    const d = [Math.cos(th), Math.sin(th)], n = [-d[1], d[0]];
    const pts = [];
    for (let i = 0; i <= 260; i++) {
      const a = i * 7.2;
      const j = 32 * noise1(a / 190, 7) * clamp((1700 - a) / 360);      // the last stretch runs straight at the moon
      pts.push([AX + d[0] * a + n[0] * j, AY + d[1] * a + n[1] * j]);
    }
    this.AX = AX; this.AY = AY; this.line = pts;
    this.moon = [1580, 230, 165];
    this.safe = [180, 200, 1448, 1000];       // right edge = the moon's rim: the pull-back stops exactly there
  },
  /** the point at arc length L along the chart (its samples are 7.2 px apart) */
  tipAt(L) {
    const P = this.line, x = clamp(L, 0, (P.length - 1) * 7.2) / 7.2, i = Math.floor(x);
    const a = P[i], b = P[Math.min(P.length - 1, i + 1)], k = x - i;
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  },
  render(g, f) {
    SG.bg(g, 'B');
    const C = SG.C, AX = this.AX, AY = this.AY;
    const wMoon = f.lyrics.findWords('moon')[0].start;                  // 63.82: the tip lands on the moon here
    const t0 = f.from + 0.12, t1 = wMoon + 0.15;
    const L = lerp(230, 1323, ease.inOutQuad(clamp((f.t - t0) / (t1 - t0)))) + Math.max(0, f.t - t1) * 340;
    const tip = this.tipAt(L);
    const s = CAM.keep([tip, [AX, AY]], { anchor: [AX, AY], safe: this.safe });
    const world = fn => { g.save(); g.translate(AX, AY); g.scale(s, s); g.translate(-AX, -AY); fn(); g.restore(); };
    // the ground: rules in the world, so they pull back with the chart and never thin below the hairline
    world(() => {
      g.strokeStyle = C.ink2; g.lineWidth = SG.LW.rule / s;
      for (let k = 0; k <= 3; k++) { g.beginPath(); g.moveTo(AX, AY - k * 230); g.lineTo(AX + 1720, AY - k * 230); g.stroke(); }
      g.beginPath(); g.moveTo(AX, AY + 90); g.lineTo(AX, AY - 640); g.stroke();
    });
    // the moon, in front of the rules and behind the line
    g.save();
    g.fillStyle = C.paper; g.beginPath(); g.arc(this.moon[0], this.moon[1], this.moon[2], 0, TAU); g.fill();
    g.restore();
    // the price line
    world(() => {
      const P = this.line;
      g.strokeStyle = C.yellow; g.lineWidth = SG.LW.pict / s; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length; i++) {
        if (i * 7.2 >= L) { const k = (L - (i - 1) * 7.2) / 7.2; g.lineTo(lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k)); break; }
        g.lineTo(P[i][0], P[i][1]);
      }
      g.stroke();
    });
    const px = AX + (tip[0] - AX) * s, py = AY + (tip[1] - AY) * s;
    MV.focus(px, py, 'line tip');
    // The tape lies along the chart but off to the left, so it never covers the tip where it meets the moon. It is
    // drawn at a fixed (620, 540) in screen space — it never moved with the chart (the chart scales under CAM.keep
    // inside the world transform) — so it goes on the screen layer (MV.overlay) with the other captions: the slow
    // push leaves it alone and its keep box no longer holds the camera still.
    MV.overlay(o => WD.line(o, f, { treat: 'tape', angle: -28, size: 'M', x: 620, y: 540 }));
  },
});
