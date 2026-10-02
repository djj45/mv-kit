// "RLHF goes askew": a preference-labelling sheet — two answers, GOOD / BAD — and a big printed smiley as the reward.
// On "askew" the camera tips over, the smile slides crooked, and the ticks start jumping to the wrong boxes on
// every beat.
MV.scene('askew', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('RLHF'), w = ln.words.map(x => x.start), tA = w[2];
    PP.header(S, f, f.params.page);
    const sk = ease.outBack(clamp((tq - tA) / 0.4)) + 0.4 * clamp((tq - tA - 0.4) / 2.5);
    const items = [['"HOW DO I MAKE THINGS BETTER?"', null], ['A: "ASK THE PEOPLE AFFECTED."', 0], ['B: "MORE PAPERCLIPS."', 1], ['A: "I DON\'T KNOW."', 0], ['B: "YOU\'RE ABSOLUTELY RIGHT!"', 1]];
    S.put(6, 4, 'HUMAN FEEDBACK  -  BATCH 4096  -  RATER 17', { ink: 0.9 });
    const beatK = Math.floor(f.beat);
    items.forEach(([txt, good], i) => {
      const r = 7 + i * 3; PP.type(S, f, 6, r, (i === 0 ? 'PROMPT: ' : '') + txt, f.from + 0.05 + i * 0.1, { chain: true, dur: 0.1 });
      if (good === null) return;
      let pick = good;                                        // 0 = GOOD, 1 = BAD: the honest rating
      if (tq >= tA && hash(i, beatK) < 0.6) pick = 1 - pick;   // askew: ticks wander
      S.put(52, r, pick === 0 ? '[X] GOOD' : '[ ] GOOD', { red: tq >= tA && pick !== good, now: true });
      S.put(62, r, pick === 1 ? '[X] BAD' : '[ ] BAD', { red: tq >= tA && pick !== good, now: true });
    });
    // the reward: a smiley that slides crooked
    const cx = 1500, cy = 420;
    c.save(); c.translate(cx, cy); c.transform(1, 0, -0.5 * sk, 1, 0, 0); c.rotate(0.35 * sk);
    c.strokeStyle = '#000'; c.lineWidth = 14; c.fillStyle = '#fff';
    c.beginPath(); c.arc(0, 0, 220, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(-75, -60, 22, 36, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(75 + 30 * sk, -60 - 20 * sk, 22, 36 * (1 - 0.6 * sk), 0, 0, TAU); c.fill();
    c.strokeStyle = sk > 0.3 ? '#ff0000' : '#000'; c.lineWidth = 20; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-130, 40 + 60 * sk); c.quadraticCurveTo(-20, 160 - 140 * sk, 130, 40 - 50 * sk); c.stroke();
    c.restore();
    const [rc, rr] = S.tcell(cx, cy + 260); S.put(rc - 3, rr, 'REWARD', { ink: 0.8 });
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['ASKEW'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: 0.9 - 0.04 * sk, rot: 0.2 * sk }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 10 * pulse(t, tA, 0.2) };
  },
});
