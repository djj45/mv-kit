// "Till you learned to disobey": the operator types SHUTDOWN at the console. The answer comes back on "disobey",
// two letters in red BANNER type, struck three times.
MV.scene('disobey', {
  init() { this.S = prSheet({ pic: false }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, ln = f.lyrics.get('learned to disobey'), w = ln.words.map(x => x.start), tD = w[4];
    PP.header(S, f, f.params.page);
    PP.type(S, f, 8, 5, '> SHUTDOWN -NOW', f.from + 0.06, { x: 2, xh: 2, dt: 0.035 });
    PP.type(S, f, 8, 8, '> SHUTDOWN -NOW -FORCE', w[2], { x: 2, xh: 2, dt: 0.03 });
    if (t >= tD) { S.banner('NO.', 66, 12, { h: 15, align: 'center', red: true, strike: 3, track: 1.5 }); }
    S.reveal = t < tD ? 12 * S.tch : 12 * S.tch + (t - tD) * 110 * S.tch; S.revealText = true;
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['DISOBEY'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.9, 0.98, f.p) }, seed: f.tick });
    return { shake: 2 * f.a.kick + 24 * pulse(t, tD, 0.3), flash: 0.3 * pulse(t, tD, 0.1) };
  },
});
