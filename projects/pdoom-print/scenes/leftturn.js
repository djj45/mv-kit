// "Sharp left turn and there you are": the camera drives up a printed road; on "turn" it rolls ninety degrees to the
// left in a quarter of a second and the road now runs up the screen; "there you are": at the end of it, the eye.
// The lyric rides on a slip (the page is on its side).
MV.scene('leftturn', {
  init() {
    const S = (this.S = prSheet({ cpi: 15, lpi: 8, oy: -700, h: 2300 }));
    this.slip = prSheet({ pic: false });
  },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('Sharp left turn'), w = ln.words.map(x => x.start), oy = S.oy;
    const tTurn = w[2], tThere = w[4];
    const P = (x, y) => [x, y - oy];                          // paper -> sheet px
    // the road: up the page from the bottom, a hard corner, then left
    const cx = 1180, top = 420, half = 95;
    c.strokeStyle = '#000'; c.lineWidth = 7; c.lineJoin = 'miter';
    c.beginPath(); c.moveTo(...P(cx - half, 1500)); c.lineTo(...P(cx - half, top + half)); c.lineTo(...P(150, top + half)); c.stroke();
    c.beginPath(); c.moveTo(...P(cx + half, 1500)); c.lineTo(...P(cx + half, top - half)); c.lineTo(...P(150, top - half)); c.stroke();
    c.lineWidth = 6; c.setLineDash([40, 34]);
    c.beginPath(); c.moveTo(...P(cx, 1500)); c.lineTo(...P(cx, top)); c.lineTo(...P(150, top)); c.stroke(); c.setLineDash([]);
    // a warning sign at the corner: red chevrons
    c.fillStyle = '#ff0000';
    for (let i = 0; i < 3; i++) { const x = cx + 170 + i * 0; const y = top - 60 + i * 70; c.beginPath(); c.moveTo(...P(x + 60, y)); c.lineTo(...P(x, y + 30)); c.lineTo(...P(x + 60, y + 60)); c.lineTo(...P(x + 60, y + 40)); c.lineTo(...P(x + 30, y + 30)); c.lineTo(...P(x + 60, y + 20)); c.closePath(); c.fill(); }
    // the eye, drawn on its side so it is upright once the camera has turned
    const open = ease.outCubic(clamp((tq - tThere) / 0.4));
    c.save(); c.translate(...P(330, top)); c.rotate(-Math.PI / 2);
    PP.eye(c, 0, 0, 560, { open, look: [0, 0.1], pupil: 0.36, traces: 16 }); c.restore();
    const [ec, er] = S.tcell(...P(cx + 120, 1250));
    S.put(ec, er, 'SAFE ZONE ^', { ink: 0.8 }); S.put(ec, er + 1, 'KEEP STRAIGHT', { ink: 0.8 });
    // camera: up the road, the roll at the corner, then along the new road to the eye
    const k = ease.inOutCubic(clamp((t - tTurn + 0.08) / 0.24));
    const up = ease.inOutQuad(clamp((t - f.from) / (tTurn - f.from)));
    const along = ease.inOutCubic(clamp((t - tTurn) / (tThere + 0.5 - tTurn)));
    const cam = { x: lerp(cx, 620, along), y: lerp(1150, top, Math.min(1, up * 1.0)), z: lerp(1.05, 0.95, along), rot: -Math.PI / 2 * k };
    prPrint(g, S, { cam, seed: f.tick, key: f.tick });
    const L = this.slip.clear(), drop = PP.drop(t, w[0]);
    PP.lyric(L, f, ln, 66, 37, { x: 3, align: 'center', red: ['TURN', 'YOU'], width: 124 });
    if (drop < 1) prSlip(g, L, [160, 37 * L.tch - 22 + 260 * drop, W - 320, 3 * L.tch + 44], { rot: -0.006, seed: 6 });
    return { shake: 2 * f.a.kick + 10 * pulse(t, tTurn, 0.25) };
  },
});
