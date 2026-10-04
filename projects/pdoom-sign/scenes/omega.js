// 19 omega · 64.34–66.15 · P · #20「The Omega Point's coming soon」
// Picture: a round prohibition sign (SG.noSign) with a giant Ω inside it — a heavy glyph used as a pictogram, not
// as a lyric — pushed at us from R 90 to R 420 over the shot. The four corners carry a mono countdown
// (T−03 / T−02 / T−01) that steps on every beat. focus: the middle of the Ω.
// Lyric: stamp, top zone — on the screen layer (MV.overlay). M, not the L of the shot list: at L this line wraps
// into two rows and the second row lands on the sign (ink on ink); at M it stays one row, 313–1607, clear of the
// countdown in the corners.
MV.scene('omega', {
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C, cx = 960, cy = 680;
    // The sign grows from far to near (r 150 → 420, the shot list's s 0.3 → 1.4). Below ~150 the ring, the
    // hollowed slash and the symbol would be inside a 300 px disc and the sign reads as a blob.
    const r = lerp(150, 420, ease.outCubic(clamp((f.t - f.from) / (f.dur - 0.12))));
    const gsize = (r - SG.LW.pict) * 1.5;                 // the Ω is sized off the ring's inner radius
    SG.noSign(g, cx, cy, r, {
      lw: SG.LW.pict, haloW: SG.LW.pict + 0.18 * gsize,
      // The Ω sits ON the hollowed slash, with a paper outline of its own (ROUND4 §2): the seam then runs behind the
      // symbol, so the ring of the Ω is never cut into fragments — under the slash it merged with it into a black
      // blob (qa: text-touch 66 %). Centred by its real ink (ROUND4 §1).
      over: (gg, ix, iy) => {
        SG.display(gg, gsize);
        gg.letterSpacing = '0px'; gg.textAlign = 'left'; gg.textBaseline = 'alphabetic'; gg.lineJoin = 'round';
        const m = gg.measureText('Ω');
        const gx = ix - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
        const gy = iy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        gg.strokeStyle = C.paper; gg.lineWidth = gsize * 0.14; gg.strokeText('Ω', gx, gy);
        gg.fillStyle = C.ink; gg.fillText('Ω', gx, gy);
      },
    });
    // the countdown: one step per beat, the same reading in all four corners of the page
    const n = Math.max(0, Math.round(f.beat) - Math.round(f.audio.beatAt(f.from)));
    const txt = 'T−' + String(clamp(3 - n, 1, 3)).padStart(2, '0');
    SG.mono(g, SG.SIZE.S, true); g.fillStyle = C.ink;
    g.textBaseline = 'top'; g.textAlign = 'left'; g.fillText(txt, SG.SAFE, SG.SAFE);
    g.textAlign = 'right'; g.fillText(txt, W - SG.SAFE, SG.SAFE);
    g.textBaseline = 'bottom';
    g.textAlign = 'left'; g.fillText(txt, SG.SAFE, H - SG.SAFE);
    g.textAlign = 'right'; g.fillText(txt, W - SG.SAFE, H - SG.SAFE);
    MV.focus(cx, cy, 'omega centre');
    // The lyric goes on the screen layer (MV.overlay): it is a top-zone caption, drawn after the camera, so the
    // push no longer moves it and its keep box no longer clamps the push. M rather than the shot list's L: at L this
    // line wraps onto the sign; at M it stays one row, clear of the corner countdown.
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'M', zone: 'top' }));
  },
});
