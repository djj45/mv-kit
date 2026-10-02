// 0:00 — the paper comes up out of the dark: a job separator page, the kind a mainframe printed before every job.
// The job card types itself on the first beats; "sparks" spits red stars over the page; "AGI" drops in as BANNER
// letters (each made of itself), red, struck twice. The first lyric is typed underneath as it is sung.
MV.scene('jobcard', {
  init() { this.S = prSheet({ pic: false }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, A = f.audio;
    const b = i => A.timeOfBeat(i);                                   // beat i of the song
    const star = '*'.repeat(S.tcols - 8);
    PP.type(S, f, 4, 3, star, b(0), { dt: 0.002 });
    PP.type(S, f, 4, 4, '*  JOB 0001    USER=HUMANITY    PROGRAM=AGI.EXE    CLASS=A    PRIORITY=ASAP', b(1), { chain: true, dur: 0.18 });
    PP.type(S, f, 4, 5, '*  PRINTER=LP01    FORMS=GREENBAR-14.875    LINES=66    RUN 0451    STATUS=STARTING', b(2), { chain: true, dur: 0.18 });
    PP.type(S, f, 4, 6, star, b(3), { dt: 0.002 });
    if (t >= b(1)) S.put(S.tcols - 5, 4, '*'); if (t >= b(2)) S.put(S.tcols - 5, 5, '*');
    // the job's control cards and the system's replies, one per eighth note, under where the banner will land
    const jcl = ["//AGI      JOB  (0451),'HUMANITY',CLASS=A,MSGCLASS=X", "//STEP1    EXEC PGM=TRAIN,PARM='SCALE=MAX,STOP=NEVER'",
      '//WEIGHTS  DD   DSN=MODEL.WEIGHTS,DISP=(NEW,KEEP)', '//DATA     DD   DSN=INTERNET.ALL,DISP=SHR', '//SAFETY   DD   DUMMY',
      'IEF236I ALLOC. FOR AGI STEP1', 'IEF142I AGI STEP1 - STEP WAS EXECUTED - COND CODE 0000'];
    jcl.forEach((l, i) => PP.type(S, f, 22, 23 + i, l, b(3) + i * 0.227, { chain: true, dur: 0.1, ink: i === 4 ? 1 : 0.72, red: i === 4 }));
    // sparks: red stars struck one after another from "sparks", where the banner will land
    const ln = f.lyrics.get('I see sparks'), tSp = ln.words[2].start, tAgi = ln.words[4].start;
    for (let i = 0; i < 34; i++) {
      const ti = tSp + i * 0.028; if (t < ti) break;
      const c = 14 + Math.floor(hash(i, 7) * 104), r = 8 + Math.floor(hash(i, 8) * 14);
      S.put(c, r, '*+*'[i % 3], { red: true, strike: i % 3 === 0 ? 2 : 1, now: true });
    }
    // AGI: block letters, printed row by row (fast) from the word
    if (t >= tAgi - 0.02) S.banner('AGI', 66, 8, { h: 14, align: 'center', red: true, strike: 2, track: 1.4 });
    S.reveal = t < tAgi ? 8 * S.tch : 8 * S.tch + (t - tAgi + 0.02) * 80 * S.tch; S.revealText = true;
    PP.lyric(S, f, ln, 66, 33, { x: 3, align: 'center', red: ['SPARKS', 'AGI'], width: 96 });
    // the paper comes up out of the printer over the first two beats, then the camera settles in
    const rise = 760 * Math.pow(1 - ease.outCubic(clamp((t - f.from) / 1.3)), 1);
    const z = lerp(0.84, 0.92, ease.inOutQuad(f.p));
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 40 + rise, z }, seed: 1 });
    return { fade: 1 - clamp((t - f.from) / 0.35), shake: 2 * f.a.kick + 10 * pulse(t, tAgi, 0.15), flash: 0.18 * pulse(t, tAgi, 0.1) };
  },
});
