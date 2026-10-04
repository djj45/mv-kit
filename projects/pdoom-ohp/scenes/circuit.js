// scenes/circuit.js — your circuits: a wire drawn across the sheet that shakes worse and worse, then settles on
// "that's no surprise". The line is on the screen layer so the insert can push in on the trembling contact.
MV.scene('circuit', {
  init() {
    this.nodes = [[430, 600], [820, 470], [1210, 630], [1560, 520]];
  },
  anchors(f) { return { node: [this.nodes[1][0] - 70, this.nodes[1][1] - 70, 140, 140] }; },
  wire(f, amp) {
    const o = [];
    const pts = [[210, 600]].concat(this.nodes);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u);
        const n = noise1(x * 0.02 + f.t * 2.6, 3) * amp + noise1(x * 0.14 - f.t * 5.1, 8) * amp * 0.4;
        o.push([x, y + n]);
      }
    }
    return o;
  },
  render(g, f) {
    OHP.back(g, f, {});
    const L = f.lyrics.lineAt(f.t, f.from);
    const calm = L && /surprise/.test(L.text);
    const jitter = prog(f.t, f.from, f.lyrics.get('nervous').words[0].start + 0.9, ease.inQuad) * (calm ? 0.12 : 1);
    const amp = 5 + 26 * jitter;
    // the board: a faint grid to draw the circuit on, and a few components
    g.save(); g.globalAlpha = 0.22;
    for (let i = 0; i <= 14; i++) OHP.rule(g, f, [180, 180 + i * 62], [1740, 180 + i * 62], { w: 1, color: OHP.C.ink3 });
    g.restore();
    const wire = this.wire(f, amp);
    OHP.ink(g, f, wire, { w: 9, seed: 3, boil: 1.6, color: OHP.C.ink });
    for (let i = 0; i < this.nodes.length; i++) {
      const [x, y] = this.nodes[i];
      const w = (hash(i, 5, 2) - 0.5) * amp * 0.7;
      if (i === 0) { g.strokeStyle = OHP.C.ink; g.lineWidth = 8; g.beginPath(); g.arc(x, y + w, 34, 0, TAU); g.stroke(); }
      else if (i === 1) {
        g.save(); g.translate(x, y + w); g.rotate(0.05);
        g.strokeStyle = OHP.C.ink; g.lineWidth = 7; g.strokeRect(-70, -44, 140, 88);
        g.restore();
        g.save(); g.fillStyle = OHP.C.ink2; OHP.F.mono(g, 22); g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('CORE', x, y + w); g.restore();
      } else if (i === 2) {
        g.strokeStyle = OHP.C.ink; g.lineWidth = 7; g.beginPath();
        g.moveTo(x - 52, y + w - 26); g.lineTo(x + 52, y + w - 26); g.moveTo(x - 52, y + w + 26); g.lineTo(x + 52, y + w + 26); g.stroke();
      } else {
        g.strokeStyle = OHP.C.ink; g.lineWidth = 7;
        g.beginPath(); g.moveTo(x - 60, y + w); g.lineTo(x - 20, y + w - 34); g.lineTo(x + 20, y + w + 34); g.lineTo(x + 60, y + w); g.stroke();
      }
      if (i === 1) {
        g.fillStyle = 'rgba(200,52,42,' + (0.5 + 0.5 * jitter).toFixed(2) + ')';
        g.beginPath(); g.arc(x - 44, y + w + 30, 9 + 9 * jitter, 0, TAU); g.fill();
      }
    }
    // the hand holding the wire still (it is the wire that shakes, not the hand)
    const penX = 1560 + 90 * Math.sin(f.t * 0.7), penY = 520 + 26 * Math.cos(f.t * 1.1);
    if (!calm) { OHP.hand(g, f, { tip: [penX, penY], s: 0.68, ang: 0.35, alpha: 0.88 }); MV.focus(penX, penY, 'pen tip'); }
    else MV.focus(this.nodes[1][0], this.nodes[1][1], 'the chip');
    OHP.dust(g, f, {});
    OHP.slide(g, f, 2, { x: 120, y: 74 });
    // the line: on the screen layer, so the insert can punch in on the trembling contact
    MV.overlay(o => OHP.lyric(o, f, calm
      ? { x: 210, y: 880, size: 42, color: OHP.C.ink2, style: 'hand' }
      : { x: 210, y: 920, size: 60, color: OHP.C.ink, style: 'hand' }));
    return OHP.post(f, { shake: 3, snare: 0.04 });
  },
});
