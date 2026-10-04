// scenes/flops.js — One E thirty FLOPs a second: the number itself, as big as a marker can write it, landing on
// the sheet like a stamp, with the units typed above it. Nothing is drawn over the digits.
MV.scene('flops', {
  render(g, f) {
    OHP.back(g, f, { red: 0.2 });
    const bar = Math.floor(f.bar);
    const num = '1e30';                                        // the line says one e thirty: the exponent never moves
    const mant = (1 + 0.9 * hash(bar, 3, 7)).toFixed(1);       // what rolls is the reading underneath
    const land = prog(f.t, f.from, f.from + 0.42, ease.outCubic);
    g.save();
    g.translate(300, 620); g.scale(1 + 0.04 * (1 - land), 1 + 0.04 * (1 - land)); g.rotate(-0.012 * (1 - land));
    OHP.F.mark(g, 300, { track: 0.02 });
    g.fillStyle = OHP.C.red; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(num, 0, 0);
    const m = g.measureText(num);
    g.restore();
    // the units, typed above the number (small, and out of everything's way)
    g.save(); OHP.F.type(g, 32); g.fillStyle = OHP.C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText('FLOPs / second', 300, 764);                                 // under the number: clear of the new sheet's shadow
    OHP.F.mono(g, 22); g.fillStyle = OHP.C.ink2;
    g.fillText('x' + mant + '  (reading)', W - 420, 140); g.restore();      // the number rolls, the line does not
    OHP.clip(g, 300 + m.width + 120, 520, 130, 0.2, 0.5);                   // clipped to the right of the number
    OHP.dust(g, f, {});
    OHP.slide(g, f, 18, { x: 120, y: 74 });
    MV.focus(300 + m.width * 0.5, 460, 'the number');
    OHP.lyric(g, f, { x: 260, y: 925, size: 52, style: 'hand', maxW: 1400 });
    return OHP.post(f, { shake: 6 + 14 * (1 - land), snare: 0.06 + 0.08 * (1 - land) });
  },
});
