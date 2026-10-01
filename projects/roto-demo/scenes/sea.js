// sea — Seedance clip J: the last chorus on the orange sea, lip-synced, the point-up move on "P(doom)".
// Full-width karaoke along the bottom. On the sung "P(doom)" the print slips (plate jumps, white flash); on
// "recursive" the frame is printed into itself, sheet inside sheet.
MV.scene('sea', {
  render(g, f) {
    const t = f.t, L = f.lyrics;
    const first = L.lines[L.get('RLHF goes askew').i + 1];                 // "I'm upping my P(doom)" (this chorus)
    const pd = first.words[first.words.length - 1], rec = L.get('recursive'), recW = rec.words[1];
    const breathe = 0.012 * Math.sin(f.lt * 1.3);
    const cv = rotoCel(rotoFrame('J', t), { pal: 'sea', tick: f.tick, misCol: ROTO.INK.pink, shade: 0.22, cam: { x: 0.5, y: 0.48, z: 1.04 + breathe } });
    g.drawImage(cv, 0, 0);
    // recursive: the print, printed into itself
    const r = ease.outExpo(prog(t, recW.start, recW.start + 0.5));
    if (r > 0) {
      for (let k = 1; k <= 5; k++) {
        const s = Math.pow(0.5, k) * (1 + (1 - r) * 0.8), rot = (k % 2 ? 1 : -1) * 0.05 * k * r;
        g.save(); g.translate(W / 2, H * 0.44); g.rotate(rot); g.scale(s, s);
        g.fillStyle = ROTO.INK.paper; g.fillRect(-W / 2 - 40, -H / 2 - 40, W + 80, H + 80);   // the sheet's margin
        g.drawImage(cv, -W / 2, -H / 2);
        g.restore();
      }
    }
    for (const q of [first.text, 'Just as foretold', 'From masked', 'recursive'])
      rotoKara(g, t, q === first.text ? first : L.get(q), { box: [96, 700, W - 192, 284], max: 200, col: ROTO.INK.ink, accent: ROTO.INK.cream, shadow: ROTO.INK.alarm });
    RD_caption(g, '橙の海', W - 130, 250, 46, ROTO.INK.ink, t, f.from + 0.2);
    RD_hud(g, f, { col: ROTO.INK.ink });
    const slip = pulse(t, pd.start, 0.35);
    return { shake: 5 * f.a.kick, press: { mis: 1.5 + 2 * f.a.kick + 5 * slip, grain: 0.03, vig: 0.3, flash: 0.45 * slip } };
  },
});
