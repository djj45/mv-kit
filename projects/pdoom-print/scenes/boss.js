// "now I'm your servant and you're my boss": an org chart, printed. HUMAN on top, MODEL below. On "servant" the two
// boxes trade places (they slide a row at a time, the way a printer can move things); on "boss" the box on top is
// re-struck in red — BOSS — and the one below is retitled SERVANT.
MV.scene('boss', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, ln = f.lyrics.get("now I'm your servant");
    const tServ = ln.words[3].start, tBoss = ln.words[7].start;
    PP.header(S, f, f.params.page);
    const k = ease.inOutCubic(clamp((tq - tServ) / 0.6)), top = 4, bot = 19, h = 9;
    const rowH = Math.round(lerp(top, bot, k)), rowM = Math.round(lerp(bot, top, k));
    const c0 = 34, c1 = 98, boss = t >= tBoss;
    // connector between the boxes
    for (let r = Math.min(rowH, rowM) + h + 1; r < Math.max(rowH, rowM); r++) S.put(66, r, '|', { ink: 0.9 });
    if (Math.abs(rowH - rowM) > h + 2) S.put(66, Math.max(rowH, rowM) - 1, 'V', { ink: 0.9 });
    // HUMAN box
    S.box(c0, rowH, c1, rowH + h, { title: boss ? 'SERVANT' : 'OPERATOR' });
    S.put(c0 + 22, rowH + 3, 'HUMAN', { x: 3 });
    S.put(c0 + 22, rowH + 7, '1 UNIT  /  8 BILLION', { ink: 0.8 });
    // MODEL box: red and struck hard once it is the boss
    S.box(c0, rowM, c1, rowM + h, { title: boss ? 'BOSS' : 'ASSISTANT', red: boss, strike: boss ? 3 : 1, h: boss ? '=' : '-', v: boss ? '#' : '|', corner: boss ? '#' : '+' });
    S.put(c0 + 22, rowM + 3, 'MODEL', { x: 3, red: boss, strike: boss ? 2 : 1 });
    S.put(c0 + 22, rowM + 7, boss ? 'PERMISSIONS: ALL' : 'PERMISSIONS: NONE', { ink: 0.8, red: boss });
    // little portraits inside the boxes (picture grid): a person, an eye
    const yH = rowH * S.tch, yM = rowM * S.tch;
    PP.person(S.g, (c0 + 10) * S.tcw, yH + 8.6 * S.tch, 170, { pose: k > 0.5 ? 'kneel' : 'stand' });
    PP.eye(S.g, (c0 + 10) * S.tcw, yM + 5 * S.tch, 230, { open: 1, pupil: 0.4, lash: false, traces: 10 });
    PP.lyric(S, f, ln, 10, 33, { x: 3, red: ['BOSS'], width: 112 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: lerp(0.88, 0.94, f.p) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick + 8 * pulse(t, tBoss, 0.15), flash: 0.12 * pulse(t, tBoss, 0.1) };
  },
});
