// "Trapped in the Chinese room, with a bag of shrooms": a room in one-point perspective, drawn in thin lines so it
// prints as / \ | _; a person at a desk with the rule book; through a slot in the back wall a slip comes in
// (U+4E2D) and another goes back out (U+6587) — symbols handled without being understood. "bag": a sack by the
// chair. "shrooms": mushrooms push up through the floor tiles and the whole picture starts to swim.
MV.scene('room', {
  init() { this.S = prSheet({ cpi: 20, lpi: 10 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq;
    const l1 = f.lyrics.get('Trapped in the Chinese'), l2 = f.lyrics.get('with a bag of shrooms');
    const tCh = l1.words[3].start, tRoom = l1.words[4].start, tBag = l2.words[2].start, tSh = l2.words[4].start;
    PP.header(S, f, f.params.page);
    const B = [700, 220, 1220, 540], F = [330, 70, 1590, 820];          // back wall, front opening (x0, y0, x1, y1)
    const draw = c => {
      c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#000';
      const line = (a, b, w = 4) => { c.lineWidth = w; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
      const L = (u, v) => [lerp(B[0], F[0], v) + u * lerp(B[2] - B[0], F[2] - F[0], v), 0];    // helpers below
      // back wall, the four receding edges, the front frame
      c.lineWidth = 5; c.strokeRect(B[0], B[1], B[2] - B[0], B[3] - B[1]);
      line([B[0], B[1]], [F[0], F[1]], 5); line([B[2], B[1]], [F[2], F[1]], 5); line([B[2], B[3]], [F[2], F[3]], 5); line([B[0], B[3]], [F[0], F[3]], 5);
      // floor tiles: rays to the back edge, and rows getting closer together with distance
      for (let k = 1; k < 8; k++) { const u = k / 8; line([lerp(B[0], B[2], u), B[3]], [lerp(F[0], F[2], u), F[3]], 2.5); }
      for (let k = 1; k < 6; k++) { const v = Math.pow(k / 6, 1.6), y = lerp(B[3], F[3], v); line([lerp(B[0], F[0], v), y], [lerp(B[2], F[2], v), y], 2.5); }
      // the slot in the back wall
      c.fillStyle = '#000'; c.fillRect(890, 330, 140, 22);
      // desk + chair + person + book
      c.lineWidth = 5; c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(880, 590); c.lineTo(1150, 590); c.lineTo(1190, 640); c.lineTo(840, 640); c.closePath(); c.fill(); c.stroke();
      line([850, 640], [850, 760], 5); line([1180, 640], [1180, 760], 5); line([905, 640], [905, 720], 4); line([1125, 640], [1125, 720], 4);
      c.fillStyle = '#000'; c.beginPath(); c.moveTo(960, 600); c.lineTo(1080, 600); c.lineTo(1094, 622); c.lineTo(946, 622); c.closePath(); c.fill();
      line([1020, 598], [1020, 624], 3);
      line([700, 640], [700, 790], 5); line([700, 700], [790, 700], 5); line([790, 700], [790, 790], 5);   // chair
      PP.person(c, 760, 790, 330, { pose: 'sit' });
      if (tq >= tBag) {          // the bag
        const k = ease.outBack(clamp((tq - tBag) / 0.25)), bx = 560, by = 800;
        c.fillStyle = '#555'; c.beginPath(); c.ellipse(bx, by - 60 * k, 58 * k, 66 * k, 0, 0, TAU); c.fill(); c.lineWidth = 5; c.stroke();
        line([bx - 24 * k, by - 124 * k], [bx + 24 * k, by - 124 * k], 9);
      }
      if (tq >= tSh) for (let i = 0; i < 7; i++) {          // shrooms through the floor
        const k = ease.outBack(clamp((tq - tSh - i * 0.045) / 0.3)); if (k <= 0) continue;
        const px = [450, 1290, 640, 1420, 1060, 380, 1530][i], py = [800, 790, 770, 815, 805, 760, 760][i], hh = (60 + 45 * hash(i, 2)) * k, r = (42 + 26 * hash(i, 3)) * k;
        c.fillStyle = '#fff'; c.fillRect(px - 11 * k, py - hh, 22 * k, hh); c.lineWidth = 4; c.strokeRect(px - 11 * k, py - hh, 22 * k, hh);
        c.fillStyle = '#ff0000'; c.beginPath(); c.arc(px, py - hh, r, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#fff'; for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(px + (j - 1) * r * 0.48, py - hh - r * (0.42 + 0.18 * (j % 2)), r * 0.14, 0, TAU); c.fill(); }
      }
    };
    const wob = 42 * ease.inOutQuad(clamp((tq - tSh) / 0.6));
    if (wob > 0.5) PP.warp(S, draw, wob, tq * 7); else draw(S.g);
    // the slips: in through the slot on "Chinese", back out on "room" (text grid)
    const [sc, sr] = S.tcell(960, 340);
    if (t >= tCh) { const k = ease.outCubic(clamp((t - tCh) / 0.3)); S.put(sc - 4, Math.round(lerp(sr, sr + 6, k)), 'U+4E2D', { red: true, now: true, strike: 2 }); }
    if (t >= tRoom) { const k = ease.outCubic(clamp((t - tRoom) / 0.3)); S.put(sc + 1, Math.round(lerp(sr + 6, sr - 4, k)), 'U+6587', { now: true, strike: 2 }); }
    S.put(8, 4, 'RULE 4096:', { ink: 0.85 }); S.put(8, 5, 'IF SYMBOL = U+4E2D', { ink: 0.85 }); S.put(8, 6, 'THEN RETURN U+6587', { ink: 0.85 }); S.put(8, 7, '(DO NOT ASK WHY)', { ink: 0.7 });
    PP.lyrics(S, f, [l1, l2], 10, 35, { x: 3, gap: 0, red: ['ROOM,', 'SHROOMS'], width: 112 });
    const sway = clamp((tq - tSh) / 0.6);
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 15, z: lerp(0.88, 0.95, f.p), rot: 0.025 * sway * Math.sin(t * 2.6) }, seed: f.tick, key: f.tick });
    return { shake: 2 * f.a.kick };
  },
});
