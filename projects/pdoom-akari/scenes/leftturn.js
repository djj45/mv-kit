// S31 leftturn — back in the aisle (D1); on "turn" the camera whips left (smeared, speed lines across the cut) onto
// the racks (D3); on "there you are" the picture's own LEDs leave their racks and gather into one huge eye that opens.
MV.scene('leftturn', akCustom({
  init() {
    akArt('D1'); const art = akArt('D3'), [gu, gv, gw, gh] = AK_SPOT.D3.grid, R = mulberry32(31);
    // the LEDs: the picture's own lit points (or a grid on a placeholder), in art coords
    this.leds = art.isPlaceholder
      ? Array.from({ length: 64 * 30 }, (_, k) => ({ u: gu + gw * ((k % 64) + 0.5) / 64, v: gv + gh * (Math.floor(k / 64) + 0.5) / 30 }))
      : akLights('D3', 1400, [0, 0, 1, 1]).map(p => ({ u: p.u, v: p.v }));
    this.leds.forEach(l => { l.ph = R(); });
    // the eye: an almond outline, an iris ring, a pupil (art coords, centred in the grid box); the LEDs farthest
    // from the centre become the outline, the nearest the pupil, so the light flows inward
    const n = this.leds.length, cu = gu + gw / 2, cv = gv + gh / 2, ar = W / H;
    const eye = Array.from({ length: n }, (_, k) => {
      const s = k / n;
      if (s < 0.45) { const a = s / 0.45 * TAU, top = a < Math.PI; return [cu + Math.cos(a) * 0.36 * gw, cv + (top ? -1 : 1) * Math.abs(Math.sin(a)) * 0.22 * gh]; }
      if (s < 0.8) { const a = (s - 0.45) / 0.35 * TAU * 3, r = 0.1 + 0.02 * ((s * 37) % 1); return [cu + Math.cos(a) * r * 0.56 * gw, cv + Math.sin(a) * r * gh]; }
      const a = (s - 0.8) / 0.2 * TAU * 5, r = 0.05 * ((s * 91) % 1); return [cu + Math.cos(a) * r * 0.56 * gw, cv + Math.sin(a) * r * gh];
    });
    const d = l => Math.hypot((l.u - cu) * ar, l.v - cv);
    this.leds.sort((a, b) => d(b) - d(a));
    this.eye = eye;
  },
  render(g, f) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const line = f.lyrics.get('Sharp left turn'), turn = line.words.find(w => w.w === 'turn').start, there = line.words.find(w => w.w === 'there').start;
    const whip = prog(f.t, turn - 0.08, turn + 0.25, ease.inOutCubic);
    if (whip < 0.5) {
      illCover(g, akArt('D1'), { z: 1.1, x: 0.5 - whip * 0.6 }, { filter: whip > 0 ? `blur(${(whip * 50).toFixed(0)}px)` : 'none' });
    } else {
      const map = illCover(g, akArt('D3'), { z: 1.05, x: 0.5 + (1 - whip) * 0.5 }, { filter: whip < 1 ? `blur(${((1 - whip) * 50).toFixed(0)}px)` : 'none' });
      const [gu, gv, gw, gh] = AK_SPOT.D3.grid, k = prog(f.t, there, there + 0.9, ease.inOutCubic);
      this.leds.forEach((l, i) => {
        const [eu, ev] = this.eye[i], [x, y] = map(lerp(l.u, eu, k), lerp(l.v, ev, k));
        const on = k > 0 ? 0.6 + 0.4 * k : (hash(Math.floor(f.t * 6 + l.ph * 6), i) < 0.25 ? 0.7 : 0.15);
        if (k <= 0 && !this.leds.isGrid && on < 0.5) return;   // the real LEDs are already in the picture: only add the blinks
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = k > 0.5 ? `rgba(${AK.sig},${on})` : `rgba(220,231,236,${on})`; g.fillRect(x - 3, y - 2, 6, 4); g.restore();
      });
      if (k > 0.6) { const [cx, cy] = map(gu + gw / 2, gv + gh / 2); illFlare(g, cx, cy, 500, AK.sig, 0.25 * k); akDot(g, cx, cy, 14 * k, k, f.tick); }
    }
    if (whip > 0 && whip < 1) { g.save(); g.fillStyle = 'rgba(255,248,238,0.35)'; const R = mulberry32(f.tick); for (let i = 0; i < 40; i++) g.fillRect(0, R() * H, W, 1 + R() * 3); g.restore(); }
    akLy(g, f, { style: 'verse', x: 140, y: 930, hot: ['turn'] });
    return {};
  },
}));
