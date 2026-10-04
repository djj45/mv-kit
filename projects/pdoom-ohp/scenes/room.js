// scenes/room.js — 0–5.70 s. The room: the lamp strikes on the first downbeat, the dust lights up, and the shadow
// hand writes the first line on the wall exactly as it is sung. On "sparks" the dust catches and becomes sparks.
MV.scene('room', {
  init() {
    this.rays = [];
    for (let i = 0; i <= 16; i++) this.rays.push([i / 16, hash(i, 3, 11)]);
  },
  anchors(f) { return { lamp: [W * 0.5 - 190, H - 170, 380, 170] }; },
  render(g, f) {
    const ign = prog(f.t, 0.20, 0.68, ease.outCubic);
    g.fillStyle = OHP.C.room; g.fillRect(0, 0, W, H);
    if (ign > 0.004) { g.save(); g.globalAlpha = ign; OHP.back(g, f, { glow: true }); g.restore(); }
    if (ign <= 0.004) { MV.focus(W * 0.5, H - 90, 'lamp'); return { vignette: 0.6 }; }
    // the machine, cropped by the bottom edge: a dark mass, light spilling around it, shafts going up the wall
    const cx = W * 0.5, top = H - 150;
    g.save();
    g.globalAlpha = ign * 0.9;
    for (const [u, h] of this.rays) {
      const x = cx + (u - 0.5) * 2.6 * W, a = 0.045 * (0.5 + 0.5 * h);
      g.fillStyle = 'rgba(255,246,222,' + a.toFixed(3) + ')';
      g.beginPath(); g.moveTo(cx - 260, H); g.lineTo(x - 130, -60); g.lineTo(x + 130, -60); g.lineTo(cx + 260, H); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(9,10,14,' + (0.94 * ign) + ')';
    g.beginPath();
    g.moveTo(cx - 700, H + 10); g.lineTo(cx - 520, top); g.lineTo(cx - 300, top - 26);
    g.lineTo(cx + 300, top - 26); g.lineTo(cx + 520, top); g.lineTo(cx + 700, H + 10);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(190,196,205,' + (0.5 * ign) + ')';           // the metal edge catching the lamp
    g.fillRect(cx - 302, top - 30, 604, 5);
    g.fillStyle = 'rgba(255,248,228,' + (0.85 * ign) + ')';
    g.beginPath(); g.ellipse(cx, top - 60, 330, 26, 0, 0, TAU); g.fill();
    g.globalAlpha = ign; g.fillStyle = 'rgba(255,252,238,0.9)';
    g.beginPath(); g.ellipse(cx, top - 60, 300 * (0.85 + 0.15 * f.a.low), 18, 0, 0, TAU); g.fill();
    g.restore();
    OHP.dust(g, f, { gain: ign, front: true });
    // the line, written by the hand as it is sung
    const info = OHP.lyric(g, f, { x: 230, y: 360, size: 66, maxW: 1460, align: 'left' });
    if (info) {
      let cur = info.toks[0];
      for (const tk of info.toks) if (tk.sung) cur = tk;
      const p = clamp((f.t - cur.start) / Math.max(0.08, cur.end - cur.start));
      const tip = [cur.x + cur.w * clamp(p * 1.7) + 76, info.y + cur.dy + 10];
      MV.focus(tip[0], tip[1], 'pen tip');
      OHP.hand(g, f, { tip: tip, s: 0.72, ang: 0.12, alpha: 0.88 });
      // "sparks": the dust right at the pen tip catches
      const sp = prog(f.t, f.lyrics.get('sparks of').words[0].start, f.lyrics.get('sparks of').words[0].start + 0.5);
      if (sp > 0) {
        for (let i = 0; i < 22; i++) {
          const a = hash(i, 7, 3) * TAU - 1.9, r = 46 + hash(i, 9, 4) * 160;
          const x = tip[0] + 130 + Math.cos(a) * r, y = tip[1] - 80 + Math.sin(a) * r * 0.6;
          const tw = 0.4 + 0.6 * noise1(f.t * 3 + i, 5);
          const fade = sp < 1 ? sp : Math.max(0, 1 - (f.t - f.lyrics.get('sparks of').words[0].start - 0.5) / 3.2);
          g.fillStyle = 'rgba(255,246,214,' + (0.85 * tw * fade).toFixed(3) + ')';
          g.beginPath(); g.arc(x, y, 1.6 + 2.6 * tw, 0, TAU); g.fill();
          if (i % 5 === 0) {
            g.strokeStyle = 'rgba(255,236,190,' + (0.5 * fade).toFixed(3) + ')'; g.lineWidth = 1.6;
            g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.moveTo(x, y - 9); g.lineTo(x, y + 9); g.stroke();
          }
        }
      }
    } else MV.focus(W * 0.5, H - 90, 'lamp');
    OHP.slide(g, f, 1, { x: 120, y: 74 });
    return OHP.post(f, { shake: 6, snare: 0.05, vignette: 0.42 + 0.16 * (1 - ign) });
  },
});
