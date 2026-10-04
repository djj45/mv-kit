// scenes/fuse.js — the killswitch with a PTO note on it, and the same curve as before, now burning along the
// sheet as a fuse. Three lines of the song, three places on the picture.
MV.scene('fuse', {
  render(g, f) {
    OHP.back(g, f, { red: 0.22, warm: 0.15 });
    // the button
    const bx = 1250, by = 420, br = 150;
    g.save();
    g.fillStyle = 'rgba(200,52,42,0.85)';
    g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
    g.strokeStyle = OHP.C.ink; g.lineWidth = 8; g.stroke();
    g.restore();
    OHP.label(g, f, bx - 200, by + 190, 400, 120, ['PTO — back', 'next week'], { size: 34, name: 'pto' });
    OHP.tape(g, bx + 196, by + 184, -0.35, 78, 26);                    // the corner of the note, clear of the words
    // the fuse: from the button's left side, off the sheet
    const L32 = f.lyrics.get('lit the fuse');
    const lit = L32.words[L32.words.length - 1];
    const k = prog(f.t, lit.start - 1.2, lit.start + 1.6, ease.linear);
    const pts = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([lerp(bx - br - 130, 130, u), by + 210 + Math.sin(u * 6) * 40 + u * 280]); }
    OHP.burn(g, f, pts, k, { w: 12, seed: 17, color: '#4A423A', burnt: '#241E1A' });
    const hx = lerp(bx - br, 140, clamp(k)), hy = by + 220 + Math.sin(clamp(k) * 6) * 40 + clamp(k) * 260;
    MV.focus(hx, hy, 'the burning head');
    if (k > 0.02) OHP.sparks(g, f, hx, hy, 120, 16, 9, lit.start - 1.2, 2.4);
    OHP.dust(g, f, { gain: 1.1, front: true });
    OHP.slide(g, f, 26, { x: 120, y: 74 });
    // the three lines sit in three different places
    const L = f.lyrics.lineAt(f.t, f.from);
    const which = L ? (/Killswitch/.test(L.text) ? 0 : /nowhere/.test(L.text) ? 1 : 2) : 0;
    const where = [[300, 380, 54], [300, 920, 60], [700, 880, 62]][which];
    OHP.lyric(g, f, { x: where[0], y: where[1], size: where[2], style: 'hand', maxW: which === 1 ? 900 : 1300 });
    return OHP.post(f, { shake: 6 + 8 * f.a.kick, snare: 0.06 });
  },
});

