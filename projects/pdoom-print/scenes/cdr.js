// "Without a single CDR": the critical design review form — five items, not one box ticked, not one signature.
// "CDR": REVIEWS COMPLETED: 0, and a red zero the size of the page; on the next downbeat, DEPLOYED ANYWAY.
MV.scene('cdr', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('Without a single'), tCdr = ln.words[3].start;
    PP.header(S, f, f.params.page);
    const lines = [
      'CRITICAL DESIGN REVIEW  (CDR)                FORM 7-B', 'PROJECT: AGI.EXE    PHASE: DEPLOYED    DATE: ________', '',
      'REVIEW ITEM                         DONE    SIGNED', '1. THREAT MODEL                     [ ]     ________', '2. FAILURE MODES                    [ ]     ________',
      '3. CONTAINMENT PLAN                 [ ]     ________', '4. ROLLBACK PROCEDURE               [ ]     ________', '5. INDEPENDENT AUDIT                [ ]     ________',
    ];
    lines.forEach((l, i) => { if (l) PP.type(S, f, 8, 4 + i * 2, l, f.from + 0.05 + i * 0.12, { chain: true, dur: 0.1, ink: i < 2 ? 1 : 0.9 }); });
    if (t >= tCdr) { PP.type(S, f, 8, 23, 'REVIEWS COMPLETED:', tCdr, { x: 2, dt: 0.01 }); S.banner('0', 104, 3, { h: 20, align: 'center', red: true, strike: 3 }); }
    const tDep = f.audio.downbeatBefore(tCdr + 1.3);
    PP.stampText(S, f, 'DEPLOYED', 40, 28, 5, tDep);
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['CDR'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.88, 0.94, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 14 * pulse(t, tCdr, 0.2) + 10 * pulse(t, tDep, 0.2) };
  },
});
