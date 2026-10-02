// "What did Ilya see? We'll never know": the eye, last time. It is open when we arrive, widens on "see?", its pupil
// searching; through "We'll never know" it closes, slowly, and where it was a red question mark is printed.
MV.scene('ilya', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('Ilya'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    const tSee = w[3], tNever = w[5], tKnow = w[6];
    let open = 1 + 0.15 * ease.outBack(clamp((tq - tSee) / 0.3));
    open *= 1 - ease.inOutQuad(clamp((tq - tNever) / (tKnow + 0.9 - tNever)));
    const look = tq < tSee ? [0.1 * Math.sin(tq * 2), 0] : [0.7 * Math.sin((tq - tSee) * 5.5), 0.35 * Math.cos((tq - tSee) * 4.1)];
    const tQ = tKnow + 1.1;
    if (open > 0.02 || tq < tNever) PP.eye(S.g, W / 2, 450, 920, { open, look, pupil: lerp(0.4, 0.3, clamp((tq - tSee) / 0.3)), traces: 22 });
    else if (tq < tQ) { S.g.strokeStyle = '#000'; S.g.lineWidth = 24; S.g.beginPath(); S.g.moveTo(W / 2 - 460, 450); S.g.bezierCurveTo(W / 2 - 200, 485, W / 2 + 200, 485, W / 2 + 460, 450); S.g.stroke(); }
    if (t >= tQ) S.banner('?', 66, 5, { h: 20, align: 'center', red: true, strike: 2 });
    S.reveal = t < tQ ? 1e9 : 5 * S.tch + (t - tQ) * 40 * S.tch; S.revealText = true;
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['ILYA', 'KNOW'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.9, 1.0, ease.inOutQuad(f.p)) }, seed: f.tick, key: f.tick });
    return { shake: 1.5 * f.a.kick * (1 - clamp((t - tNever) / 0.5)) };
  },
});
