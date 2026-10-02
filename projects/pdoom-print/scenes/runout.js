// The run-out (the last instrumental, the loudest part of the song): the camera pulls back and lies down, and the
// whole printout streams away from us — every image the film printed comes past again, one every couple of beats,
// faster and faster: P(DOOM)=1.00, the eye, the torus, FOOM, the paperclip, the mask, NO., the black hole, 1E30, AGI.
// Then the end of the paper goes by underneath, and the tail of the strip flies off into the dark.
MV.scene('runout', {
  init() {
    const gap = 1.15 * H, n = 10, ppg = 11 * W / 13.2;
    this.gap = gap; this.end = Math.ceil((9 * gap + H + 300) / ppg) * ppg;
    // all the type in one tall text sheet (one pass), the pictures each on their own sheet
    const T = (this.T = prSheet({ pic: false, h: this.end + 200 }));
    const row = y => Math.round(y / T.tch);
    for (let k = 0; k < n; k++) T.put(4, row(k * gap) + 1, `AGI.EXE   RUN 0451   PAGE ${String(40 + k).padStart(3, '0')}       P(DOOM)=1.00`, { ink: 0.8, red: true });
    for (let r = 0; r < T.trows; r++) if (r % 2 === 0 && (r * T.tch) % gap > H * 0.9 && hash(r, 5) > 0.2) T.put(8, r, `STEP ${String(Math.round(1e9 * Math.pow(1.03, r))).padStart(16, ' ')}   LOSS 0.0000   OUTPUT ${'#'.repeat(Math.floor(hash(r, 6) * 40))}`, { ink: 0.45 });
    const ban = (k, s, o = {}) => T.banner(s, 66, row(k * gap) + 8, { h: 15, align: 'center', strike: 3, track: 1.2, ...o });
    ban(0, 'P(DOOM)', { red: true, h: 11 }); T.put(48, row(0) + 25, '= 1.00', { x: 4, red: true, strike: 3 });
    ban(3, 'FOOM', { red: true }); ban(6, 'NO.', { red: true }); ban(8, '1E30', {}); ban(9, 'AGI', { red: true });
    // pictures
    const pic = (k, draw, o = {}) => { const S = prSheet({ cpi: 15, lpi: 8, oy: k * gap, crisp: o.crisp }); draw(S.g); return S; };
    this.P = [
      pic(1, c => PP.eye(c, W / 2, 470, 1200, { open: 1, pupil: 0.36, traces: 22 })),
      pic(2, c => { const tor = (u, v) => { const a = u * TAU, b = v * TAU; return [(1 + 0.45 * Math.cos(b)) * Math.cos(a), (1 + 0.45 * Math.cos(b)) * Math.sin(a), 0.45 * Math.sin(b)]; };
        c.filter = 'blur(1px)'; c.drawImage(PP.surface(420, 300, tor, [1.5, 0, 0.8], 120, { nu: 380, nv: 160, amb: 0.06, splat: 2 }), W / 2 - 560, 80, 1120, 800); c.filter = 'none'; }, { crisp: 1 }),
      pic(4, c => { c.save(); c.translate(W / 2, 470); c.rotate(-0.4); c.scale(4.2, 4.2); c.strokeStyle = '#ff0000'; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-30, 18); c.lineTo(52, 18); c.arc(52, 0, 18, Math.PI / 2, -Math.PI / 2, true); c.lineTo(-50, -18); c.arc(-50, -4, 14, -Math.PI / 2, Math.PI / 2, true); c.lineTo(40, 10); c.arc(40, 0, 10, Math.PI / 2, -Math.PI / 2, true); c.lineTo(-20, -10); c.stroke(); c.restore(); }),
      pic(5, c => { c.save(); c.translate(W / 2, 470); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 18; c.beginPath(); c.arc(0, 0, 330, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = '#000'; c.beginPath(); c.ellipse(-110, -80, 34, 54, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(110, -80, 34, 54, 0, 0, TAU); c.fill();
        c.lineWidth = 28; c.lineCap = 'round'; c.beginPath(); c.arc(0, 10, 200, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); c.restore(); }),
      pic(7, c => { const cx = W / 2, cy = 470, rh = 150; c.lineWidth = 46; c.strokeStyle = '#ff0000'; c.beginPath(); c.ellipse(cx, cy, rh * 2.9, rh * 1.8, 0, Math.PI, TAU); c.stroke();
        c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, rh, 0, TAU); c.fill(); c.lineWidth = 56; c.beginPath(); c.ellipse(cx, cy, rh * 2.9, rh * 0.58, 0, 0, Math.PI); c.stroke(); }),
    ];
    this.slip = prSheet({ pic: false });
  },
  render(g, f) {
    const t = f.t, dt = t - f.from, u = Math.max(0, dt - 0.9);
    const tiltK = ease.inOutCubic(clamp((dt - 0.7) / 0.9));
    const D = 60 * u * u + 500 * u, camY = H / 2 + D;
    const cam = { x: W / 2 + 80 * Math.sin(dt * 0.9) * tiltK, y: camY, z: lerp(0.9, 0.5, tiltK), tilt: 1.06 * tiltK, spin: 0.16 * Math.sin(dt * 0.65) * tiltK, fov: 1.15 };
    const vis = this.P.filter(S => S.oy + H > camY - 7 * H && S.oy < camY + 1.5 * H);
    prPrint(g, [this.T, ...vis], { cam, seed: f.tick, key: 'static', paperTo: this.end, fog: [9000, 26000] });
    // the last lyric goes with us for a moment on its slip, then drops away
    const ln = f.lyrics.get('Was it all for show'), L = this.slip.clear();
    PP.lyric(L, f, ln, 66, 37, { x: 3, align: 'center', red: ['SHOW?'], width: 124 });
    const away = ease.inCubic(clamp((dt - 0.5) / 0.5));
    if (away < 1) prSlip(g, L, [300, 37 * L.tch - 22 + 420 * away, W - 600, 3 * L.tch + 44], { rot: -0.01 + 0.1 * away, seed: 12 });
    return { shake: 3 + 7 * f.a.kick + 4 * f.a.snare, flash: 0.35 * pulse(t, f.from, 0.15) };
  },
});
