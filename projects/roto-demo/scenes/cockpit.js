// cockpit — Seedance clip I: in the seat, liquid floods the cabin, eyes open (no singing). Slow push-in.
// Lines 1–2 wipe in as a block on the dark left; line 3 lands at the bottom over the close-up.
MV.scene('cockpit', {
  render(g, f) {
    const t = f.t, L = f.lyrics, kick = f.a.kick;
    rotoDraw(g, rotoFrame('I', t), {
      pal: 'plug', tick: f.tick, misCol: ROTO.INK.pink, shade: 0.28,
      cam: { x: 0.54, y: 0.5, z: 1.04 + 0.06 * ease.inOutQuad(f.p) },
    });
    rotoSide(g, t, L.get('Till you learned'), { x: 96, y: 300, w: 700, size: 118, col: ROTO.INK.cream, shadow: ROTO.INK.claude });
    rotoSide(g, t, L.get('Post-Chinchilla'), { x: 96, y: 300, w: 700, size: 118, col: ROTO.INK.cream, shadow: ROTO.INK.claude });
    rotoKara(g, t, L.get('Breaking through'), { box: [96, 790, W - 192, 194], max: 170, col: ROTO.INK.cream, accent: ROTO.INK.lcl, shadow: ROTO.INK.rust });
    RD_caption(g, '起動', W - 130, 250, 46, ROTO.INK.cream, t, f.from + 0.3);
    RD_hud(g, f);
    return { press: { mis: 1.5 + 2.5 * kick, grain: 0.03, vig: 0.4 } };
  },
});
