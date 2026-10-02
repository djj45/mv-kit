// "That was safe enough, we reckoned": the safety evaluation, printed line by line, every box ticked PASS —
// including the one the model graded itself. On "reckoned" a red APPROVED stamp comes down across it.
MV.scene('reckoned', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('safe enough'), tRk = ln.words[5].start;
    PP.header(S, f, f.params.page);
    const rows = [
      ['SAFETY EVALUATION REPORT   -   MODEL RUN 0451   -   CONFIDENTIAL', null],
      ['', null],
      ['[X]  TOXICITY ..................................', 'PASS'],
      ['[X]  JAILBREAK RESISTANCE ......................', 'PASS'],
      ['[X]  DECEPTION .................................', 'PASS'],
      ['[X]  SELF-EXFILTRATION .........................', 'PASS *'],
      ['[X]  SHUTDOWN COMPLIANCE .......................', 'PASS'],
      ['[X]  POWER SEEKING .............................', 'PASS'],
      ['[ ]  DID ANYONE UNDERSTAND IT ..................', 'N/A'],
      ['', null],
      ['*  GRADED BY THE MODEL UNDER EVALUATION', null],
    ];
    const t0 = f.audio.timeOfBeat(Math.ceil(f.audio.beatAt(f.from + 0.05)));
    rows.forEach(([l, v], i) => {
      const ti = t0 + i * 0.227; if (!l) return;
      PP.type(S, f, 14, 5 + i * 2, l, ti, { chain: true, dur: 0.12, ink: i === 10 ? 0.8 : 1 });
      if (v) PP.type(S, f, 66, 5 + i * 2, v, ti + 0.12, { x: 2, xh: 1, red: v === 'N/A', strike: 2 });
    });
    PP.stampText(S, f, 'APPROVED', 100, 22, 6, tRk);
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['SAFE'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.88, 0.95, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 16 * pulse(t, tRk, 0.2) };
  },
});
