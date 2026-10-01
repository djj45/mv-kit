// S11 pingdi — L18. The vase lies upside down: its base fills the frame — the unglazed foot ring (fine sandy
// clay), the glazed well inside, a double circle. His hand writes the mark in two columns, 「烟雨」 on the right,
// 「年製」 on the left, one character to every three sung syllables; when the brush lifts, the cobalt spreads a
// pale halo into the glaze.
const QS11 = {};
MV.scene('pingdi', {
  init(MV) {
    QS11.L = pigmentLayers(); QS11.H = qhStickerLayers(); QS11.line = MV.lyrics.get('在瓶底');
    // the foot ring: sandy clay, painted once
    const c = QS11.ring = mk(W, H), g = c.getContext('2d'), cx = W / 2, cy = H / 2 + 10;
    const im = g.createImageData(W, H), R = mulberry32(9);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const r = Math.hypot(x - cx, y - cy); if (r > 470 || r < 386) continue;
      const i = (y * W + x) * 4, n = R(), shade = 1 - 0.14 * Math.pow(Math.abs((r - 428) / 42), 2);
      const base = [222, 206, 178].map(v => v * shade * (0.93 + 0.1 * n));
      if (R() < 0.012) base.forEach((v, k) => (base[k] = v * 0.7));
      im.data[i] = base[0]; im.data[i + 1] = base[1]; im.data[i + 2] = base[2];
      im.data[i + 3] = 255 * clamp(Math.min(470 - r, r - 386) / 1.5);
    }
    g.putImageData(im, 0, 0);
    // a thin iron-red "burnt" line where glaze meets clay (火石红)
    g.strokeStyle = 'rgba(176,112,80,0.55)'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 388, 0, TAU); g.stroke();
    QS11.c = [cx, cy];
  },
  render(g, f) {
    const t = f.t, tk = f.tick, L = QS11.L, [cx, cy] = QS11.c, w = QS11.line.words;
    L.clear();
    const circ = r => { const p = []; for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
    qhLine(L.dry, circ(318), { w: 4.2, a: 0.92, closed: true, seed: 1, dot: false });
    qhLine(L.dry, circ(300), { w: 2.6, a: 0.88, closed: true, seed: 2, dot: false });
    // the four characters, each over three syllables
    const chars = [['烟', cx + 14, cy - 190], ['雨', cx + 14, cy + 20], ['年', cx - 226, cy - 190], ['製', cx - 226, cy + 20]];
    let pen = null, cur = 0;
    chars.forEach(([ch, x, y], i) => {
      const ws = w.slice(i * 3, i * 3 + 3), a = ws[0].start, b = i < 3 ? w[i * 3 + 3].start - 0.08 : ws[2].start + 0.5;
      const k = prog(t, a, b, ease.inOutQuad);
      const p = qhcMark(L.dry, ch, x, y, 212, 168, k, { w: 12.5 });
      if (k > 0 && k < 1) { pen = p; cur = i; }
      if (k >= 1 && i === 3 && !pen) pen = null;
    });
    const done = w[11].start + 0.5, halo = prog(t, done, done + 0.9, ease.outQuad);
    g.fillStyle = '#E9ECE6'; g.fillRect(0, 0, W, H);
    // the vase's shadow, the glazed well
    const sg = g.createRadialGradient(cx + 30, cy + 40, 400, cx + 30, cy + 40, 560); sg.addColorStop(0, 'rgba(70,80,100,0.3)'); sg.addColorStop(1, 'rgba(70,80,100,0)');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    const cv = pigmentComp(L, { preset: 'cobalt', halo: 0.7 + 0.8 * halo, seed: 12 });
    g.save(); g.beginPath(); g.arc(cx, cy, 392, 0, TAU); g.clip(); g.drawImage(cv, 0, 0);
    const gl = g.createRadialGradient(cx - 120, cy - 140, 20, cx, cy, 392); gl.addColorStop(0, 'rgba(255,255,255,0.18)'); gl.addColorStop(0.7, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(60,70,90,0.12)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H); g.restore();
    g.drawImage(QS11.ring, 0, 0);
    // the hand, from the right; after the last stroke it lifts away
    const lift = prog(t, done - 0.2, done + 0.7, ease.inCubic);
    const Hs = QS11.H; Hs.clear();
    const p0 = pen || [cx - 118, cy + 190];
    if (lift < 1 && t > w[0].start - 0.6) {
      const arrive = ease.outCubic(prog(t, w[0].start - 0.6, w[0].start));
      qhcHand(Hs, lerp(W + 300, p0[0], arrive) + lift * 500, p0[1] - lift * 300, -Math.PI / 2 + 0.6, 0.95, { tk, side: 1 });
      qhSticker(g, Hs, { preset: 'cobalt', seed: 21, spots: 0 });
    }
    qhcLyrics(g, f, 330, 170);
  },
});
