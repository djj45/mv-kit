// scenes/shoggoth.js — the shoggoth: a mass of black scribble with a friendly face taped on. On "lies" the face
// slides off and the eyes underneath are already looking at you.
MV.scene('shoggoth', {
  init() {
    this.loops = [];
    for (let k = 0; k < 7; k++) {
      const pts = [];
      for (let i = 0; i <= 34; i++) {
        const a = i / 34 * TAU, r = 0.62 + 0.38 * fbm1(Math.cos(a) * 2.2 + k * 3.1, 7, 3) + 0.12 * fbm1(Math.sin(a) * 3.0 - k, 11, 2);
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      this.loops.push(pts);
    }
  },
  render(g, f) {
    OHP.back(g, f, {});
    const cx = 900, cy = 520, R = 330;
    const lies = f.lyrics.get("shoggoth's lies").words.slice(-1)[0];
    const off = prog(f.t, lies.start + 0.05, lies.start + 0.6, ease.inQuad);
    // the mass: loops of black scribble, filled
    for (let k = 0; k < this.loops.length; k++) {
      const pts = this.loops[k].map(p => [cx + p[0] * R * (1 + k * 0.012), cy + p[1] * R * (0.92 + k * 0.01)]);
      const wob = (hash(f.tick, k, 3) - 0.5) * 6;
      g.save();
      g.beginPath(); pathSmooth(g, pts.map(p => [p[0] + wob, p[1] - wob]));
      g.fillStyle = k === 0 ? '#1C1F27' : 'rgba(28,31,39,0.55)';
      g.fill(); g.restore();
    }
    // eyes underneath (they are only seen once the face comes off)
    for (let i = 0; i < 22; i++) {
      const a = hash(i, 3, 7) * TAU, r = R * (0.18 + 0.66 * hash(i, 5, 9));
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.9;
      const blink = 1 - 0.5 * Math.max(0, noise1(f.t * 2.4 + i * 1.7, 5));
      g.fillStyle = '#F2ECD8';
      g.beginPath(); g.ellipse(x, y, 26, 15 * blink, hash(i, 7, 2) * 0.6, 0, TAU); g.fill();
      g.fillStyle = '#151820';
      g.beginPath(); g.arc(x + 3 * noise1(f.t + i, 3), y, 7.5 * blink + 1, 0, TAU); g.fill();
    }
    // the friendly face on a card, sliding off
    const fy = cy - 150 - off * 520, fa = 1 - off * 0.15;
    g.save(); g.globalAlpha = fa;
    g.translate(cx - 40 - off * 620, fy); g.rotate(0.06 + off * 0.5);
    g.fillStyle = '#F4ECD6'; g.fillRect(-230, -130, 460, 260);
    g.strokeStyle = 'rgba(60,52,40,0.5)'; g.lineWidth = 3; g.strokeRect(-230, -130, 460, 260);
    OHP.ink(g, f, [[-130, -40], [-70, -70], [-40, -40]], { w: 9, color: '#1C1F27', seed: 21, boil: 1.0 });
    OHP.ink(g, f, [[40, -40], [70, -70], [130, -40]], { w: 9, color: '#1C1F27', seed: 22, boil: 1.0 });
    OHP.ink(g, f, [[-110, 40], [-40, 90], [50, 82], [120, 30]], { w: 10, color: '#1C1F27', seed: 23, boil: 1.2 });
    g.fillStyle = '#1C1F27';
    g.beginPath(); g.arc(-80, -55, 12, 0, TAU); g.fill();
    g.beginPath(); g.arc(80, -55, 12, 0, TAU); g.fill();
    g.restore();
    OHP.dust(g, f, {});
    OHP.slide(g, f, 9, { x: 120, y: 74 });
    MV.focus(cx, cy, off > 0.4 ? 'the eyes' : 'the face');
    // the line stands on a patch of clean wall (the ink rubbed off), so nothing crosses it
    OHP.erase(g, 300, 880, 1320, 140, {});
    OHP.lyric(g, f, { x: 360, y: 935, size: 62, style: 'hand', maxW: 1200 });
    return OHP.post(f, { shake: 5, snare: 0.05 });
  },
});

