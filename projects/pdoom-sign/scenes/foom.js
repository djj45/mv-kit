// 07 foom — 24.34–26.16 · B · #7 "'cause the future goes FOOM"
//   picture: an explosion pictogram (yellow disc + 12 thick radial rays) swelling from r 40 about the frame centre,
//     blowing out to the corners on the start of 'FOOM' (that one beat is the only moment in the shot allowed past
//     35 % yellow — two frames, §3; the swell is eased so it stays under that until the last few frames). After the
//     blow-out the fireball settles to r 430 and holds.
//   camera: the kit's push, shake on every kick (the blast breathes with it). cut: hard, on the frame it blows out.
//   lyric: the first four words `stamp` M top zone (paper on black); 'FOOM' alone XXL heavy, ink, centred on the
//     yellow blast — two WD.line calls, o.only, both on the screen layer (MV.overlay) so the words are drawn after
//     the explosion. focus: the centre of the blast.
MV.scene('foom', {
  render(g, f) {
    const C = SG.C, CX = 960, CY = 540;
    SG.bg(g, 'B');
    // everything keys off the start of the word FOOM: never a typed time, never the line we hope for
    const cur = WD.current(f), ws = cur ? WD.words(f, cur.line) : [];
    const iF = ws.findIndex(w => /^foom/i.test(w.text));
    const tF = iF >= 0 ? ws[iF].start : f.from + (f.to - f.from) * 0.72;
    const HOLD = 2 / 30;                                     // the blast fills the frame for exactly two frames
    const RSET = 460;                                        // … then it settles here: yellow 33 % + rays ≈ 35 %
    const k = prog(f.t, f.from, tF, ease.inCubic);           // a slow swell, then it goes off
    let r;
    if (f.t < tF) r = 40 + 560 * k + 26 * f.a.kick;
    else if (f.t < tF + HOLD) r = 600;
    else r = lerp(600, RSET, prog(f.t, tF + HOLD, tF + HOLD + 0.22, ease.outCubic));
    // the rays reach further than the disc for those two frames, so the blast really does take the whole frame
    const rayF = keys(f.t, [[tF - 0.001, 1.45], [tF, 1.78], [tF + HOLD, 1.78], [tF + HOLD + 0.26, 1.33]]);
    g.save();
    g.strokeStyle = C.yellow; g.lineWidth = SG.LW.pict; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = (-90 + i * 30) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const out = Math.max(r * rayF, r + 96);                 // while the disc is a dot the rays are still rays
      g.beginPath();
      g.moveTo(CX + ca * r * 0.5, CY + sa * r * 0.5);
      g.lineTo(CX + ca * out, CY + sa * out);
      g.stroke();
    }
    g.restore();
    g.fillStyle = C.yellow;
    g.beginPath(); g.arc(CX, CY, r, 0, Math.PI * 2); g.fill();
    // lyric: the first four words up top at M, then FOOM alone — heavy, ink, and fitted so that the whole word
    // stays on the yellow (an ink word that hangs over the edge of the blast would simply not be there).
    // Both calls go on the screen layer (MV.overlay), so the words are laid over the fireball *after* it: drawn in
    // the scene they were painted before the blast's rays reached the top of the frame, and for the blow-out the
    // rays ran under the words of the moment (qa: lyric-faint on ''cause'). Nothing here uses WD.line's return
    // value, and the blast is centred on the frame while the kit's push zooms about the frame centre — so 'FOOM'
    // stays on the yellow exactly as drawn, and the shot has no insert whose punch the words could clamp.
    let fsz = SG.SIZE.XXL;
    if (iF > 0) {
      for (let it = 0; it < 6; it++) {
        SG.heavy(g, fsz);
        const m = g.measureText(ws[iF].text);
        const need = Math.hypot(Math.max(m.actualBoundingBoxLeft, m.actualBoundingBoxRight),
                                Math.max(m.actualBoundingBoxAscent, m.actualBoundingBoxDescent)) + 14;
        if (need <= RSET || fsz < 120) break;
        fsz *= RSET / need * 0.98;
      }
    }
    MV.overlay(o => {
      if (iF > 0) {
        WD.line(o, f, { treat: 'stamp', size: 'M', zone: 'top', align: 'left', x: SG.SAFE, maxW: 1400,
                        color: C.paper, only: ws.slice(0, iF).map(w => w.i) });
        WD.line(o, f, { treat: 'stamp', size: fsz, face: 'heavy', zone: 'mid', align: 'center', maxW: 1400,
                        color: C.ink, only: [ws[iF].i] });
      } else {
        WD.line(o, f, { treat: 'stamp', size: 'M', zone: 'top', align: 'left', x: SG.SAFE, maxW: 1400, color: C.paper });
      }
    });
    MV.focus(CX, CY, 'blast centre');
    return { shake: (5 + 10 * k) * f.a.kick };
  },
});
