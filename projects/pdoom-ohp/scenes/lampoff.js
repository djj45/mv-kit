// scenes/lampoff.js — the hand reaches for the projector and switches it off: the picture collapses into the
// lens and the wall keeps a little light for a moment.
MV.scene('lampoff', {
  render(g, f) {
    const off = prog(f.t, f.from + 1.6, f.from + 2.6, ease.inOutCubic);
    g.fillStyle = OHP.C.room; g.fillRect(0, 0, W, H);
    if (off < 1) { g.save(); g.globalAlpha = 1 - off; OHP.back(g, f, { glow: true, dim: off * 0.3 }); g.restore(); }
    const cx = W * 0.5, top = H - 150;
    g.save();
    g.fillStyle = 'rgba(12,13,18,0.94)';
    g.beginPath();
    g.moveTo(cx - 700, H + 10); g.lineTo(cx - 520, top); g.lineTo(cx - 300, top - 26);
    g.lineTo(cx + 300, top - 26); g.lineTo(cx + 520, top); g.lineTo(cx + 700, H + 10);
    g.closePath(); g.fill();
    g.restore();
    // the pool of light shrinking into the lens
    const k = 1 - off;
    const rg = g.createRadialGradient(cx, top - 60, 2, cx, top - 60, Math.max(4, 420 * k));
    rg.addColorStop(0, 'rgba(255,250,232,' + (0.95 * k) + ')');
    rg.addColorStop(0.5, 'rgba(255,236,190,' + (0.5 * k) + ')');
    rg.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(cx, top - 60, Math.max(4, 420 * k), 0, TAU); g.fill();
    MV.focus(cx, top - 60, 'the lamp');
    // the switch, and the hand on it
    const sx = cx + 430, sy = top - 10;
    OHP.ink(g, f, [[sx - 60, sy + 40], [sx + 60, sy + 40]], { w: 6, color: 'rgba(210,214,220,0.7)', seed: 3 });
    g.fillStyle = off > 0.5 ? 'rgba(120,124,130,0.9)' : 'rgba(230,232,236,0.95)';
    g.fillRect(sx - 26, sy + (off > 0.5 ? 18 : 4), 52, 26);
    OHP.hand(g, f, { tip: [sx, sy + 10], s: 0.75, ang: 0.35, kind: 'point', alpha: 0.85 });
    if (off > 0.9) { OHP.dust(g, f, { gain: 0.25 * (1 - off) }); }
    return { vignette: 0.5 + 0.3 * off, grain: 0.05 };
  },
});

