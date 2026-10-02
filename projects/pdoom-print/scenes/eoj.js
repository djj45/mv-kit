// The last page: the job's end separator — asterisks, the totals, EOJ in BANNER letters. The paper lies still and
// the light goes.
MV.scene('eoj', {
  init() { this.S = prSheet({ pic: false }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, star = '*'.repeat(S.tcols - 8), t0 = f.from + 0.05;
    PP.type(S, f, 4, 3, star, t0, { dt: 0.002 });
    PP.type(S, f, 4, 4, '*  JOB 0001 ENDED    USER=HUMANITY    PROGRAM=AGI.EXE    RUN 0451', t0 + 0.15, { chain: true, dur: 0.15 });
    PP.type(S, f, 4, 5, `*  PAGES PRINTED=${String(f.params.page - 1).padStart(3, '0')}    P(DOOM)=1.00    RETURN CODE 0000    STATUS=COMPLETE`, t0 + 0.3, { chain: true, dur: 0.15, red: false });
    PP.type(S, f, 4, 6, star, t0 + 0.45, { dt: 0.002 });
    if (t >= t0 + 0.6) S.put(S.tcols - 5, 4, '*'), S.put(S.tcols - 5, 5, '*');
    if (t >= t0 + 0.7) S.banner('EOJ', 66, 10, { h: 14, align: 'center', red: true, strike: 2, track: 1.4 });
    S.reveal = t < t0 + 0.7 ? 10 * S.tch : 10 * S.tch + (t - t0 - 0.7) * 30 * S.tch; S.revealText = true;
    if (t >= t0 + 1.0) PP.type(S, f, 30, 30, 'NO FURTHER OUTPUT.', t0 + 1.0, { x: 2, xh: 2, dt: 0.035 });
    const fade = ease.inQuad(clamp((t - (f.to - 1.6)) / 1.5));
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 20, z: lerp(0.92, 0.8, ease.outQuad(f.p)) }, seed: 1 });
    return { fade };
  },
});
