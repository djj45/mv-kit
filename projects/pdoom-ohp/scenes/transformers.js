// scenes/transformers.js — the stack: transformer block on transformer block, all the way off the top of the
// sheet, the top one smoking; on "disobey" one block steps out of line.
MV.scene('transformers', {
  init() { this.n = 11; },
  render(g, f) {
    OHP.back(g, f, { red: 0.3, warm: 0.2 });
    const bx = 420, bw = 700, bh = 96, gap = 14;
    const L35 = f.lyrics.get('learned to disobey');
    const out = prog(f.t, L35.words[0].start, L35.words[L35.words.length - 1].start + 0.4, ease.inOutQuad);
    const built = Math.min(this.n, Math.ceil(prog(f.t, f.from, f.from + 4.4) * this.n));
    for (let i = 0; i < this.n; i++) {
      if (i >= built) break;
      const y = H - 330 - i * (bh + gap);                     // the stack stands clear of the line's band
      const off = i === this.n - 1 ? out : 0;
      g.save();
      g.translate(bx + off * 300, y + off * -70); g.rotate(off * 0.5);
      OHP.block(g, f, 0, 0, bw, bh, { color: OHP.C.ink, w: 7, seed: i, fill: i === this.n - 1 ? 'rgba(200,52,42,0.20)' : null });
      g.save(); OHP.F.mono(g, 24); g.fillStyle = OHP.C.ink2;
      g.fillText('BLK ' + String(i + 1).padStart(2, '0'), 26, bh * 0.62); g.restore();
      for (let k = 0; k < 6; k++) {                       // little attention dots inside the block
        g.fillStyle = 'rgba(35,38,46,0.5)';
        g.beginPath(); g.arc(bw - 60 - k * 34, bh / 2, 7, 0, TAU); g.fill();
      }
      g.restore();
    }
    // the smoke off the top block
    if (built >= this.n) {
      const ty = H - 330 - (this.n - 1) * (bh + gap);
      for (let i = 0; i < 9; i++) {
        g.save(); g.globalAlpha = 0.13 * (1 - i / 9);
        g.fillStyle = '#6E6862';
        g.beginPath(); g.arc(bx + 560 + 40 * noise1(f.t * 0.6 + i, 3), ty - 40 - i * 42, 16 + i * 7, 0, TAU); g.fill();
        g.restore();
      }
      MV.focus(bx + 350, ty > 110 ? ty : H - 420, 'the top of the stack');   // off the top: the highest block left in frame
    } else MV.focus(bx + 350, H - 280, 'the stack going up');
    // the line: the shout, high on the right
    const L = f.lyrics.lineAt(f.t, f.from);
    if (L && /transformers all the way/.test(L.text)) {
      OHP.lyricBig(g, f, { x: 1130, y: 330, small: 60, bigSize: 104, big: t => /transformers/i.test(t), color: OHP.C.ink, bigColor: OHP.C.red, maxW: 600 });
    } else {
      OHP.lyric(g, f, { x: 250, y: 930, size: 58, style: 'hand', maxW: 1420 });
    }
    OHP.dust(g, f, { gain: 1.1 });
    OHP.slide(g, f, 28, { x: 120, y: 74 });
    return OHP.post(f, { shake: 7 + 8 * out, snare: 0.06 });
  },
});

