// scenes/foom.js — the same curve as the loss shot, now going straight up out of the sheet on FOOM, burning the
// top edge of the acetate as it goes.
MV.scene('foom', {
  render(g, f) {
    const boom = f.lyrics.get('future goes FOOM').words.slice(-1)[0];
    const k = prog(f.t, boom.start - 0.15, boom.start + 0.75, ease.inCubic);
    OHP.back(g, f, { red: 0.10 + 0.30 * k, warm: 0.10 + 0.30 * k });   // the whole wall heats up as the curve goes
    const x0 = 240, y0 = 800, x1 = 1180;
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, x = lerp(x0, x1, u);
      const creep = Math.max(0, f.t - (boom.start + 0.6)) * 26;   // the curve keeps climbing after the burst
      const y = y0 - Math.pow(u, 5.5) * (1450 * (0.25 + 0.75 * k) + creep) - 40 * u;
      pts.push([x, y]);
    }
    const tip = pts[pts.length - 1];
    const s = CAM.keep([[tip[0], Math.min(tip[1], 40)]], { anchor: [x0, y0], safe: [130, 120, W - 130, H - 150], min: 0.55 });
    g.save(); g.translate(x0, y0); g.scale(s, s); g.translate(-x0, -y0);
    OHP.ink(g, f, pts, { w: 10, color: OHP.C.red, seed: 7, grease: true, boil: 1.6 });
    g.restore();
    const tx = x0 + (tip[0] - x0) * s, ty = y0 + (tip[1] - y0) * s;
    if (ty > 90) MV.focus(tx, ty, 'the curve'); else MV.focus(tx, 70, 'the burnt edge');   // off the top: watch the scorch
    if (k > 0.02) {
      OHP.glowDot(g, tx, Math.max(ty, 30), 120 * k, 'rgba(255,196,120,ALPHA)', 0.5 * k);
      OHP.sparks(g, f, tx, Math.max(ty, 40), 190 * k, 26, 4, boom.start, 1.6);
      // the scorch mark on the top edge of the sheet
      g.save(); g.globalAlpha = 0.55 * k;
      const sc = g.createRadialGradient(tx, 0, 6, tx, 0, 220);
      sc.addColorStop(0, 'rgba(90,58,32,0.85)'); sc.addColorStop(0.5, 'rgba(120,80,40,0.35)'); sc.addColorStop(1, 'rgba(120,80,40,0)');
      g.fillStyle = sc; g.beginPath(); g.ellipse(tx, 6, 230, 70, 0, 0, TAU); g.fill(); g.restore();
    }
    OHP.dust(g, f, { gain: 1 + k, front: true });
    OHP.slide(g, f, 7, { x: 120, y: 74 });
    OHP.lyricBig(g, f, { x: 300, y: 920, small: 72, bigSize: 170, big: t => /FOOM/i.test(t), color: OHP.C.ink, bigColor: OHP.C.red, maxW: 1600 });
    return OHP.post(f, { shake: 12 * k, snare: 0.09 * k });
  },
});

