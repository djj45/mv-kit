// scenes/loss.js — "a sudden drop in your training loss": the axes are ruled, the red grease-pencil curve falls
// off the bottom edge and the world shrinks with CAM.keep so the falling tip never leaves the frame.
MV.scene('loss', {
  init() {
    this.AX = 820; this.AY = 380; this.SX = 900; this.SY = 560;    // the origin sits under the circuit's red dot
    this.v = [];
    for (let i = 0; i <= 420; i++) {
      const u = i / 420;
      const base = 0.08 + 0.34 * (1 - Math.exp(-u * 7));
      const drop = u < 0.55 ? 0 : Math.pow((u - 0.55) / 0.45, 1.6) * 3.4;
      this.v.push(clamp(base + drop + 0.035 * noise1(u * 26, 3), 0, 4));
    }
  },
  anchors(f) { return { start: [this.AX - 190, this.AY + this.v[0] * this.SY - 190, 380, 380] }; },
  render(g, f) {
    OHP.back(g, f, {});
    const AX = this.AX, AY = this.AY, SX = this.SX, SY = this.SY;
    const u = clamp(0.10 + 0.95 * f.p, 0, 1);
    const n = Math.max(2, Math.round(420 * u));
    const P = [];
    for (let i = 0; i <= n; i++) P.push([AX + SX * i / 420, AY + this.v[i] * SY]);
    const tip = P[P.length - 1];
    const s = CAM.keep([tip], { anchor: [AX, AY], safe: [150, 150, W - 150, H - 150], min: 0.26 });
    g.save(); g.translate(AX, AY); g.scale(s, s); g.translate(-AX, -AY);
    OHP.axes(g, f, { x: AX, y: AY - 120, w: SX, h: SY + 120, nx: 6, ny: 4, labels: true, color: OHP.C.ink });
    g.save(); g.globalAlpha = 0.9;
    OHP.ink(g, f, P, { w: 9, color: OHP.C.red, seed: 5, boil: 1.5, grease: true, taper: t => 1 - 0.25 * t });
    g.restore();
    g.restore();
    const tx = AX + (tip[0] - AX) * s, ty = AY + (tip[1] - AY) * s;
    g.fillStyle = OHP.C.red;
    g.beginPath(); g.arc(tx, ty, 13 + 7 * f.a.kick, 0, TAU); g.fill();
    MV.focus(tx, ty, 'pen tip');
    OHP.hand(g, f, { tip: [tx, ty], s: 0.56 * s, ang: 0.42, alpha: 0.6 });
    OHP.dust(g, f, {});
    OHP.slide(g, f, 3, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 260, y: 165, size: 54, maxW: 1400 });     // across the top: the axes start below it
    return OHP.post(f, { shake: 4, snare: 0.05 });
  },
});
