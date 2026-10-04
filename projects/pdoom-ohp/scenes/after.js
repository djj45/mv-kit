// scenes/after.js — the empty glass: one paperclip, a coffee ring, and the lamp cooling down. Almost nothing
// moves, and that is the point.
MV.scene('after', {
  render(g, f) {
    const cool = prog(f.t, f.from, f.to, ease.outQuad);
    g.fillStyle = OHP.C.room; g.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.30 * (1 - cool * 0.8); OHP.back(g, f, { cold: 0.4 }); g.restore();
    // the glass stage, seen straight on
    const x = 300, y = 300, w = 1320, h = 560;
    g.save();
    g.fillStyle = 'rgba(210,216,220,0.10)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(226,230,232,0.35)'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
    g.restore();
    // the coffee ring
    g.save();
    g.strokeStyle = 'rgba(120,78,44,0.35)'; g.lineWidth = 9;
    g.beginPath(); g.arc(x + 940, y + 200, 128, 0.3, TAU - 0.6); g.stroke();
    g.strokeStyle = 'rgba(120,78,44,0.18)'; g.lineWidth = 5;
    g.beginPath(); g.arc(x + 940, y + 200, 150, 1.1, TAU - 1.2); g.stroke();
    g.restore();
    // the last paperclip, metal
    g.save(); g.globalAlpha = 0.75; OHP.clip(g, x + 380, y + 330, 240, 0.35, 1, true); g.restore();
    MV.focus(x + 380, y + 330, 'the paperclip');
    // the lamp cooling: a dull dot that fades
    OHP.glowDot(g, W / 2, H - 90, 260 * (1 - cool), 'rgba(255,196,120,ALPHA)', 0.28 * (1 - cool));
    OHP.dust(g, f, { gain: 0.4 });
    return { vignette: 0.55, grain: 0.05, fade: clamp(cool - 0.75) * 0.6 };
  },
});

