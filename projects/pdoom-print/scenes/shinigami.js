// "with your shinigami eyes": a pair of eyes in red ink, so close the ribbon's weave shows in the strokes. They open
// on the line, glare on "shinigami", the pupils narrow to slits on "eyes". In the instrumental they close; then
// the printer slews the paper — the page runs up and out of the frame into the next section.
MV.scene('shinigami', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get('shinigami'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    const tClose = f.audio.downbeatBefore(w[3] + 2.4), tSlew = f.to - 0.95;
    let open = ease.outCubic(clamp((tq - w[0]) / 0.3)) * (1 + 0.12 * ease.outBack(clamp((tq - w[2]) / 0.25)));
    open *= 1 - ease.inOutQuad(clamp((tq - tClose) / 0.7));
    const slit = ease.outCubic(clamp((tq - w[3]) / 0.25));
    const look = [0.12 * Math.sin(tq * 0.9), 0.08 * Math.cos(tq * 1.1)];
    for (const s of [-1, 1]) PP.eye(S.g, W / 2 + s * 430, 440, 700, { open, red: true, tone: true, slit, look, pupil: 0.42, traces: 14 });
    PP.lyric(S, f, ln, 66, 34, { x: 3, align: 'center', red: ['SHINIGAMI', 'EYES'], width: 120 });
    // the slew: the paper runs up past the camera, accelerating, into the next section
    const slew = 2400 * ease.inQuad(clamp((t - tSlew) / (f.to - tSlew)));
    const z = lerp(1.1, 0.96, ease.inOutQuad(clamp((t - f.from) / (tClose - f.from))));
    prPrint(g, S, { cam: { x: W / 2, y: 500 + slew, z }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick * (1 - clamp((t - tClose) / 0.5)) };
  },
});
