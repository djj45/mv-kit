// scenes/cdr.js — the black box: a flight recorder with a typed nameplate, two reels running, and a tape that
// ends before the accident does. Every readout is "--".
MV.scene('cdr', {
  render(g, f) {
    OHP.back(g, f, { cold: 0.35 });
    const x = 520, y = 260, w = 880, h = 520;
    OHP.block(g, f, x, y, w, h, { color: OHP.C.ink, w: 10, seed: 3 });
    g.save(); g.fillStyle = 'rgba(154,160,168,0.30)'; g.fillRect(x, y, w, h); g.restore();
    OHP.label(g, f, x + 260, y + h - 88, 360, 74, ['CDR'], { size: 46, name: 'cdr-plate' });
    // two reels
    const end = f.lyrics.get('single CDR').words[0].start;
    const stop = prog(f.t, end - 0.15, end + 0.5, ease.outCubic);
    for (let i = 0; i < 2; i++) {
      const cx = x + 250 + i * 380, cy = y + 220, R = 130;
      const spin = (f.t * (2.1 - i * 0.5)) * (1 - stop);
      const cr = []; for (let j = 0; j <= 30; j++) { const a = j / 30 * TAU; cr.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      OHP.ink(g, f, cr, { w: 8, color: OHP.C.ink, seed: 10 + i, boil: 1.2 });
      for (let s = 0; s < 5; s++) {
        const a = spin + s / 5 * TAU;
        OHP.ink(g, f, [[cx, cy], [cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9]], { w: 5, color: OHP.C.ink2, seed: 20 + i * 5 + s, boil: 0.6 });
      }
      g.fillStyle = OHP.C.ink; g.beginPath(); g.arc(cx, cy, 16, 0, TAU); g.fill();
      if (i === 1) MV.focus(cx, cy, 'the reel');
    }
    // the tape end, whipping
    if (stop > 0.05) {
      const wob = Math.sin(f.t * 9) * 40 * (1 - stop);
      OHP.ink(g, f, [[x + 630, y + 220], [x + 780 + wob, y + 150 + wob * 0.4], [x + 860 + wob * 1.4, y + 320 - wob]], { w: 6, color: OHP.C.ink, seed: 33, boil: 1.4 });
    }
    // readouts
    g.save(); OHP.F.mono(g, 34); g.fillStyle = OHP.C.ink2;
    g.fillText('ALT  --', x + 60, y + h + 70);
    g.fillText('SPD  --', x + 300, y + h + 70);
    g.fillText('REC  ' + (stop > 0.6 ? 'STOP' : 'ON'), x + 540, y + h + 70);
    g.restore();
    OHP.dust(g, f, {});
    OHP.slide(g, f, 22, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 360, y: 935, size: 58, style: 'hand', maxW: 1300 });
    return OHP.post(f, { shake: 3 + 6 * stop, snare: 0.04, vignette: 0.45 });
  },
});

