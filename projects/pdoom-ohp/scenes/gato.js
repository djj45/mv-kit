// scenes/gato.js — the room goes dark and quiet: the projector's pool of light, a cat sitting in it, and the
// hand reaching for it — the only contact in the whole film.
MV.scene('gato', {
  render(g, f) {
    OHP.back(g, f, { dim: 0.26, cold: 0.4, glow: true });
    const cx = 880, cy = 780;
    OHP.cat(g, cx, cy, 1.75, 1.75, 'rgba(18,16,24,0.88)');
    MV.focus(cx, cy - 60, 'the cat');
    // the hand comes in from the right, slowly, and stops short
    const L27 = f.lyrics.get('Gato');
    const reach = prog(f.t, L27.words[0].start + 0.3, L27.words[L27.words.length - 1].end - 0.4, ease.inOutQuad);
    const hx = lerp(2000, cx + 300, reach), hy = lerp(900, cy - 200, reach);
    OHP.hand(g, f, { tip: [hx, hy], s: 0.8, ang: 0.5, kind: 'point', alpha: 0.8, alive: 0.4 });
    OHP.dust(g, f, { gain: 1.3, front: true });
    OHP.slide(g, f, 23, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 300, y: 330, size: 50, style: 'hand', color: '#DDD6C8', maxW: 1200, ghost: 0.2 });
    return OHP.post(f, { shake: 2, snare: 0.03, vignette: 0.5 });
  },
});

