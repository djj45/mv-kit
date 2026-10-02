// S21 atoms — her open palm (C4): the fingertips come apart into orange-lit particles on "atoms" and drift back
// together on "rearranging". The particles carry the picture's own colours (sampled once in init).
MV.scene('atoms', akCustom({
  init() {
    const art = akArt('C4'), c = mk(160, 90), cg = c.getContext('2d'); cg.drawImage(art, 0, 0, 160, 90);
    const d = cg.getImageData(0, 0, 160, 90).data, [pu, pv] = AK_SPOT.C4.palm, R = mulberry32(21);
    this.p = [];
    for (let y = 0; y < 90; y++) for (let x = 0; x < 160; x++) {
      const u = (x + 0.5) / 160, v = (y + 0.5) / 90, r = Math.hypot((u - pu) * 1.78, v - pv);
      if (r > 0.33 || R() > 0.7) continue;
      const i = (y * 160 + x) * 4;
      this.p.push({ u, v, c: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, a: R() * TAU, s: 0.4 + R(), r });
    }
  },
  render(g, f) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const line = f.lyrics.get('I feel my atoms'), out = line.words.find(w => /atoms/.test(w.w)).start, back = line.words.find(w => /rearr/.test(w.w));
    const k = prog(f.t, out, out + 0.7, ease.outCubic) * (1 - prog(f.t, back.start + 0.3, back.end + 0.4, ease.inOutCubic));
    const cam = { z: 1.05 + 0.08 * f.p }, map = illCover(g, akArt('C4'), cam, { alpha: 1 - 0.75 * k });
    const s = map.scale * map.sw / 160;
    for (const p of this.p) {
      const dd = k * (60 + 260 * p.r) * p.s, wob = noise1(f.tq * 2 + p.a * 5, 3) * 20 * k;
      const [x, y] = map(p.u, p.v), px = x + Math.cos(p.a) * dd + wob, py = y + Math.sin(p.a) * dd - 80 * k * p.s;
      g.fillStyle = p.c; g.globalAlpha = 0.25 + 0.75 * k; g.fillRect(px - s / 2, py - s / 2, s * (0.6 + 0.4 * (1 - k)), s * (0.6 + 0.4 * (1 - k)));
    }
    g.globalAlpha = 1;
    if (k > 0.05) { g.save(); g.globalCompositeOperation = 'lighter'; this.p.forEach((p, i) => { if (i % 9) return; const dd = k * (60 + 260 * p.r) * p.s, [x, y] = map(p.u, p.v); akDot(g, x + Math.cos(p.a) * dd, y + Math.sin(p.a) * dd - 80 * k * p.s, 2, k, f.tick, i); }); g.restore(); }
    akLy(g, f, { style: 'verse', x: 140, y: 930, hot: ['atoms', 'rearranging'] });
    return {};
  },
}));
