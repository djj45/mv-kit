// turn — Seedance clip K: profile against the moon, she turns to camera and smiles. Slow push; the line wipes in
// on the empty left. "Was it all for show?": the camera pulls back and this frame is one print among the others,
// taped to a wall (the other prints are inked once, in init: prints don't boil).
const RD_PLATES = [
  ['I', 1.2, 'plug', 'COCKPIT'], ['J', 4.6, 'sea', 'P(DOOM)'], ['K5', 0, 'dc', 'CORRIDOR'],
  ['I', 5.5, 'plug', 'SYNC'], null, ['J', 7.5, 'sea', 'SELF-UPGRADE'],
  ['J', 2.0, 'sea', 'SEA'], ['K', 1.0, 'sea', 'ILYA'], ['I', 3.0, 'plug', 'FLOOD'],
];
MV.scene('turn', {
  init() {
    this.prints = RD_PLATES.map(p => {
      if (!p) return null;
      const c = mk(W / 2, H / 2);
      c.getContext('2d').drawImage(rotoCel(rotoFrame(p[0], 0, { at: p[1] }), { pal: p[2], tick: 7, misCol: ROTO.INK.pink, shade: 0.22, cam: { z: 1.03 } }), 0, 0, W / 2, H / 2);
      return c;
    });
  },
  render(g, f) {
    const t = f.t, L = f.lyrics, ilya = L.get('What did Ilya'), show = L.get('Was it all for show');
    const pull = ease.inOutCubic(prog(t, show.start, show.start + 1.7)), s = lerp(1, 0.4, pull);
    const cv = rotoCel(rotoFrame('K', t), { pal: 'sea', tick: f.tick, misCol: ROTO.INK.pink, shade: 0.22, cam: { x: 0.56, y: 0.5, z: 1.04 + 0.012 * f.lt } });
    if (pull <= 0) g.drawImage(cv, 0, 0);
    else {
      g.fillStyle = ROTO.INK.paper2; g.fillRect(0, 0, W, H);
      const sw = W * s, sh = H * s, gap = 0.16 * sw;
      RD_PLATES.forEach((p, k) => {
        const i = (k % 3) - 1, j = Math.floor(k / 3) - 1, cx = W / 2 + i * (sw + gap), cy = H / 2 + j * (sh + gap * 0.9);
        if (Math.abs(cx - W / 2) > W / 2 + sw || Math.abs(cy - H / 2) > H / 2 + sh) return;
        const m = 0.045 * sw;
        g.save(); g.translate(cx, cy); g.rotate(p ? (hash(k, 5) - 0.5) * 0.05 : 0);
        g.fillStyle = 'rgba(27,23,20,0.22)'; g.fillRect(-sw / 2 - m + 8 * s, -sh / 2 - m + 12 * s, sw + 2 * m, sh + 2.6 * m);   // shadow
        g.fillStyle = ROTO.INK.paper; g.fillRect(-sw / 2 - m, -sh / 2 - m, sw + 2 * m, sh + 2.6 * m);                             // the sheet
        g.drawImage(p ? this.prints[k] : cv, -sw / 2, -sh / 2, sw, sh);
        g.fillStyle = ROTO.INK.ink; g.font = ROTO.F.monoL(Math.max(10, 30 * s)); g.textBaseline = 'middle'; g.textAlign = 'left';
        g.fillText(`PLATE ${String(k + 1).padStart(2, '0')} · ${p ? p[3] : 'TURN'}`, -sw / 2, sh / 2 + 1.3 * m);
        g.fillStyle = 'rgba(242,181,68,0.75)'; g.fillRect(-0.08 * sw, -sh / 2 - m - 0.03 * sh, 0.16 * sw, 0.07 * sh);         // tape
        g.restore();
      });
    }
    rotoSide(g, t, ilya, { x: 96, y: 300, w: 640, size: 112, col: ROTO.INK.cream, shadow: ROTO.INK.rust });
    rotoKara(g, t, show, { box: [96, 790, W - 192, 194], max: 170, col: ROTO.INK.ink, accent: ROTO.INK.claude, shadow: ROTO.INK.pink, hold: 2 });
    // the HUD and caption belong to the film, not the wall: they go as the camera pulls back
    g.save(); g.globalAlpha = 1 - clamp(pull * 3); RD_caption(g, '見たもの', W - 130, 250, 46, ROTO.INK.cream, t, f.from + 0.2); g.restore();
    if (pull < 0.34) RD_hud(g, f, { a: 0.92 * (1 - pull * 3) });
    return { press: { mis: 1.5 + 1.5 * f.a.kick, grain: 0.03, vig: 0.35 }, fade: prog(t, f.to - 0.8, f.to) };
  },
});
