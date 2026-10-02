// "And you're optimizing, accelerating": a contour map of the loss landscape with a ball rolling down the gradient,
// zig-zagging into the minimum ("optimizing"). On "accelerating" the camera lies down on the strip and the paper
// runs: the training log printed below the map streams past, step counts growing by orders of magnitude.
// The lyric rides on a slip.
MV.scene('accel', {
  init() {
    this.A = prSheet({ cpi: 15, lpi: 8 });
    const L = (this.L = prSheet({ pic: false, h: H * 8, oy: H }));
    for (let r = 1; r < L.trows - 1; r++) {
      const step = Math.round(Math.pow(10, 1.2 + r / 40)), loss = 4 * Math.exp(-r / 70) + 0.02 * hash(r, 1), lr = 3e-4 * (1 + r / 100);
      const fmtE = v => v.toExponential(1).toUpperCase().replace('E+', 'E');
      L.put(8, r, `STEP ${String(step).padStart(12, ' ')}   LOSS ${loss.toFixed(4)}   LR ${fmtE(lr)}   TOK/S ${fmtE(1.2e6 * Math.pow(1.04, r))}   GPU ${String(8 * Math.pow(2, Math.floor(r / 30))).padStart(7, ' ')}`, { ink: 0.85, red: r % 37 === 0 });
    }
    this.slip = prSheet({ pic: false });
  },
  render(g, f) {
    const A = this.A.clear(), t = f.t, tq = f.tq, c = A.g, ln = f.lyrics.get("you're optimizing"), tOpt = ln.words[2].start, tAcc = ln.words[3].start;
    PP.header(A, f, f.params.page);
    // the landscape: level curves round a minimum, wobbly
    const mx = 1060, my = 470, lv = 9;
    c.strokeStyle = '#000'; c.lineWidth = 3;
    for (let k = 1; k <= lv; k++) {
      c.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * TAU, rr = k * 58 * (1 + 0.16 * Math.sin(3 * a + k * 0.7) + 0.08 * Math.cos(5 * a - k));
        const x = mx + Math.cos(a) * rr * 1.9, y = my + Math.sin(a) * rr * 0.75; i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath(); c.stroke();
    }
    c.fillStyle = '#000'; c.beginPath(); c.arc(mx, my, 10, 0, TAU); c.fill();
    // gradient descent: a zig-zag path from the rim to the minimum; the ball rides it from "And" to "accelerating"
    const path = []; for (let i = 0; i <= 40; i++) { const u = i / 40, e = Math.pow(1 - u, 1.4); path.push([mx - 880 * e * (0.9 + 0.1 * Math.cos(u * 30)) + 40 * e * Math.sin(u * 22), my - 300 * e * Math.cos(u * 19) * 0.9]); }
    const pr = ease.inOutQuad(clamp((tq - ln.words[0].start) / (tAcc - ln.words[0].start))), n = Math.floor(pr * 40);
    c.lineWidth = 4; c.setLineDash([2, 14]); c.lineCap = 'round'; c.beginPath(); path.slice(0, n + 1).forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p))); c.stroke(); c.setLineDash([]);
    const b = path[n]; c.fillStyle = '#ff0000'; c.beginPath(); c.arc(b[0], b[1], 26, 0, TAU); c.fill(); c.lineWidth = 5; c.stroke();
    A.put(8, 4, 'LOSS LANDSCAPE  (PROJECTED, 2 OF 10^12 DIMENSIONS)', { ink: 0.85 });
    if (tq >= tOpt) A.put(Math.round(mx / A.tcw) + 2, Math.round(my / A.tch) + 1, '<- MINIMUM', { ink: 0.9, now: true });
    // the run: tilt down onto the strip and accelerate along it
    const k = ease.inOutCubic(clamp((t - tAcc) / 0.55)), dt = Math.max(0, t - tAcc);
    const cam = { x: W / 2 + 40 * k, y: H / 2 + 120 * k + 1250 * dt * dt + 300 * dt, z: lerp(0.9, 0.55, k), tilt: 1.08 * k, spin: 0.05 * k * Math.sin(t * 1.3) };
    prPrint(g, [A, this.L], { cam, seed: f.tick, key: f.tick });
    const S = this.slip.clear();
    PP.lyric(S, f, ln, 66, 37, { x: 3, align: 'center', red: ['ACCELERATING,'], width: 124 });
    const drop = PP.drop(t, ln.words[0].start); if (drop < 1) prSlip(g, S, [140, 37 * S.tch - 22 + 260 * drop, W - 280, 3 * S.tch + 44], { rot: 0.008, seed: 9 });
    return { shake: 2 * f.a.kick + 3 * k * f.a.hat };
  },
});
