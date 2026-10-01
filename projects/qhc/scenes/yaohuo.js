// S8 yaohuo — bar 26, the whole band comes in: inside the kiln, white heat. Flame tongues (火焰纹) outlined in
// pale cobalt over fire-white, the saggar's dark shape inside them, shaking on the kick; all going white.
MV.scene('yaohuo', {
  init() { this.L = pigmentLayers(); },
  render(g, f) {
    const t = f.t, tk = f.tick, tq = f.tq, L = this.L, kick = f.a.kick;
    L.clear();
    // the saggar and the vase inside, a dark shape fading into the heat
    const sag = [[760, 980], [760, 330], [1160, 330], [1160, 980]];
    const sagP = qhSmooth(sag, true, 1); qhFill(L.wet, sagP, 0.85 * (1 - f.p)); qhLine(L.dry, sagP, { w: 5, a: 0.95 * (1 - f.p), closed: true, seed: 3, tk });
    for (let i = 0; i < 26; i++) {
      const x = -60 + i * 80 + 20 * hash(i, 4), h = 300 + 420 * hash(i, 5) + 80 * kick, lean = 0.25 * noise1(i + tq * 0.8, 6);
      const fl = qhcFlame(x, H + 40, h, lean, tq, i * 3);
      qhLine(L.dry, fl, { w: 4.2, a: 0.75, closed: true, tk, seed: 10 + i, jit: 2 });
      qhLine(L.dry, qhcFlame(x + 6, H + 40, h * 0.6, lean, tq + 0.3, i * 3 + 1), { w: 3, a: 0.55, closed: true, tk, seed: 40 + i, jit: 2 });
    }
    g.fillStyle = QH.fire; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'multiply';
    pigmentDraw(g, L, { preset: 'cobalt', paper: 'none', ramp: [[0.3, '#DDE5F1'], [0.6, '#A9BEDD'], [1, '#6F8CC4']], halo: 0.3, spots: 0 });
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `rgba(255,252,246,${prog(t, f.from + 0.5, f.to, ease.inQuad) * 0.9})`; g.fillRect(0, 0, W, H);
    return { flash: 0.85 * pulse(t, f.from, 0.5), flashColor: '255,248,234', shake: 6 * kick };
  },
});
