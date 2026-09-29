// 雨爱 — the opening sky (shots 1–2): one drop lands on blank paper and spreads into a rain cloud;
// three more drops gather into a second cloud that turns into his profile ("多变的表情"), which the
// wet paper then lets run down. Soft washes (inkSoft) with a few crisp brush marks on top.
// All positions are scroll-world coordinates; screen x = world x − camera.

/** Opening camera: still until the downbeat before the first line, then a slow right→left glide. */
function yuaiCamOpen(t) { return keys(t, [[12.85, 3640], [15.85, 3640], [26.6, 3240, ease.inOutQuad]]); }

const YSKY = (() => {
  const R = mulberry32(2026);
  const drop = { t: 13.6, x: 4250, y: 225 };
  const lobes = [];
  for (let i = 0; i < 9; i++) {
    const u = (i / 8 - 0.5) * 2, dx = u * 320 + (R() - 0.5) * 60, dy = u * u * 45 - 10 + (R() - 0.5) * 40;
    lobes.push({ dx, dy, r: (75 + 60 * R()) * (1.15 - 0.45 * Math.abs(u)), birth: drop.t + 0.1 + Math.abs(dx) / 330 + R() * 0.3, seed: 300 + i * 11 });
  }
  const tex = Array.from({ length: 7 }, (_, i) => ({ x: drop.x + (R() - 0.5) * 320, y: drop.y + (R() - 0.5) * 60, birth: drop.t + 0.15 + R() * 1.4, r: 50 + 50 * R(), seed: 40 + i }));
  // his profile, facing right (u across, v down, in a box face.h tall)
  const C = [[0.40, 0.00], [0.55, 0.01], [0.66, 0.06], [0.73, 0.14], [0.745, 0.22], [0.75, 0.30], [0.772, 0.34], [0.755, 0.372],
    [0.787, 0.43], [0.832, 0.49], [0.846, 0.515], [0.80, 0.532], [0.806, 0.565], [0.795, 0.585], [0.81, 0.605], [0.78, 0.635],
    [0.797, 0.69], [0.77, 0.73], [0.66, 0.765], [0.585, 0.79], [0.57, 0.86], [0.56, 0.93], [0.36, 0.93], [0.34, 0.84],
    [0.26, 0.74], [0.18, 0.62], [0.14, 0.46], [0.16, 0.30], [0.23, 0.14], [0.31, 0.05]];
  const face = { x: 3614, y: 365, h: 440 };
  const U = (u, v) => [face.x + (u - 0.47) * face.h, face.y + (v - 0.5) * face.h];
  const P = C.map(([u, v]) => U(u, v));
  const cx = face.x - 0.01 * face.h, cy = face.y + 0.04 * face.h;
  const loop0 = spline(P.concat([P[0]]), 6), N = 150;
  const prof = [];
  for (let k = 0; k < N; k++) { const p = cutPolyline(loop0, k / N).pop(), dx = p[0] - cx, dy = p[1] - cy; prof.push({ th: Math.atan2(dy, dx), r: Math.hypot(dx, dy), v: (p[1] - face.y) / face.h + 0.5 }); }
  const front = spline(P.slice(3, 19), 6);
  const eye = spline([U(0.615, 0.392), U(0.655, 0.405), U(0.695, 0.398)], 6);
  const brow = spline([U(0.60, 0.352), U(0.65, 0.340), U(0.71, 0.347)], 6);
  const feeders = [{ t: 18.85, x: face.x - 130, y: 330 }, { t: 19.6, x: face.x + 100, y: 450 }, { t: 20.35, x: face.x - 20, y: 560 }];
  const drips = [];
  for (let k = 0; k < 12; k++) { const q = prof.filter(p => p.v > 0.55)[(R() * 60) | 0] || prof[0]; drips.push({ th: q.th, r: q.r, len: 90 + 230 * R(), d: R() * 0.5, seed: 700 + k, w: 3 + 4 * R() }); }
  return { drop, lobes, tex, face, cx, cy, prof, front, eye, brow, feeders, drips };
})();

const Y_MORPH = [22.4, 24.1], Y_WASH = [24.95, 26.6];

/** Radius of a flowing cloud in direction th (ellipse rx × ry, edge noise animated by t). */
function yuaiCloudR(th, rx, ry, seed, t, rough = 0.26) {
  const c = Math.cos(th), s = Math.sin(th), base = 1 / Math.hypot(c / rx, s / ry);
  return base * (1 + rough * 1.6 * fbm2(c * 1.3 + t * 0.06, s * 1.3 - t * 0.03, seed, 3));
}
function yuaiCloudPath(s, x, y, rx, ry, seed, t, n = 110, rough, begin = true) {
  if (begin) s.beginPath();
  for (let k = 0; k <= n; k++) { const th = k / n * TAU, r = yuaiCloudR(th, rx, ry, seed, t, rough); const px = x + Math.cos(th) * r, py = y + Math.sin(th) * r * (Math.sin(th) > 0 ? 0.75 : 1); k ? s.lineTo(px, py) : s.moveTo(px, py); }
  s.closePath();
}

function yuaiSky(g, t, cam) {
  const S = YSKY, A = INK.A;
  const wash = prog(t, Y_WASH[0], Y_WASH[1], ease.inOutQuad);
  // --- the first drop and its cloud
  inkDrop(g, S.drop.x - cam, S.drop.y, S.drop.t, t, { fall: 0.55, dist: 420, size: 10 });
  const age = t - S.drop.t;
  if (age >= 0) {
    const x = S.drop.x - cam - 8 * age, y = S.drop.y + 25 * wash;
    // union of billows: one path of many sub-loops, filled once (overlaps do not darken)
    const lobesPath = (s, k, dy = 0) => { s.beginPath(); for (const L of S.lobes) { const la = t - L.birth; if (la < 0) continue; const r = L.r * k * (0.15 + 0.85 * (1 - Math.exp(-la * 1.4))) * (1 + 0.15 * wash); yuaiCloudPath(s, x + L.dx, y + L.dy + dy * L.r + 20 * wash, r * 1.12, r * 0.82, L.seed, t, 60, 0.24, false); } };
    inkSoft(g, s => {
      lobesPath(s, 1); s.fillStyle = ink(A.qing * 1.15 * (1 - 0.35 * wash)); s.fill();
      s.globalCompositeOperation = 'destination-out'; lobesPath(s, 0.8, -0.05); s.fillStyle = 'rgba(0,0,0,0.38)'; s.fill();   // pale middle, pooled rim
      s.globalCompositeOperation = 'source-over';
      lobesPath(s, 0.58, 0.28); s.fillStyle = ink(A.dan * 0.42 * (1 - 0.35 * wash)); s.fill();                            // heavy, rain-laden belly
      lobesPath(s, 0.3, 0.4); s.fillStyle = ink(A.dan * 0.4 * (1 - 0.35 * wash)); s.fill();
    }, { grain: 0.55 });
    for (const b of S.tex) { const ba = t - b.birth; if (ba >= 0) inkBloom(g, b.x - cam - 8 * age, b.y + 25 * wash, ba, { r: b.r, alpha: A.qing * 0.9 * (1 - 0.4 * wash), seed: b.seed, sq: 0.6, k: 1.4 }); }
    inkBloom(g, S.drop.x - cam, S.drop.y, age, { r: 90, alpha: A.jiao * (1 - prog(age, 0.25, 2.8)), seed: 1, sq: 0.85, k: 3 });
  }
  // --- the second cloud: fed by three drops, turns into his profile, then runs
  for (const fd of S.feeders) inkDrop(g, fd.x - cam, fd.y, fd.t, t, { fall: 0.45, dist: 380, size: 7, alpha: A.nong });
  const fedAt = S.feeders.reduce((acc, fd) => acc + (t > fd.t ? 1 - Math.exp(-(t - fd.t) * 1.3) : 0), 0) / 3;
  if (fedAt > 0) {
    const m = prog(t, Y_MORPH[0], Y_MORPH[1], ease.inOutCubic), x0 = S.cx - cam, y0 = S.cy;
    const pts = S.prof.map(p => {
      const rc = yuaiCloudR(p.th, 240 * fedAt, 175 * fedAt, 61, t, 0.3), rr = lerp(rc, p.r * (1 + 0.045 * noise1(p.th * 9 + t * 0.4, 62)), m) * (1 + 0.04 * wash);
      let px = x0 + Math.cos(p.th) * rr, py = y0 + Math.sin(p.th) * rr;
      py += wash * wash * (60 + 90 * clamp(p.v - 0.4) * (0.6 + 0.4 * noise1(p.th * 5, 9)));   // lower edge sags and runs
      return [px, py];
    });
    inkSoft(g, s => {
      pathSmooth(s, pts); s.fillStyle = ink(A.qing * 1.3 * (1 - 0.65 * wash)); s.fill();
      s.filter = 'blur(7px)';                                                            // (quarter res: ~28 px)
      s.globalCompositeOperation = 'destination-out';                                   // pale inside, pooled rim
      s.beginPath(); s.ellipse(x0 - 20, y0 + 10 + 40 * wash, 120, 170, 0.1, 0, TAU); s.fillStyle = 'rgba(0,0,0,0.4)'; s.fill();
      s.globalCompositeOperation = 'source-atop';
      s.beginPath(); s.ellipse(x0 - 105, y0 - 70 + 40 * wash, 80, 130, 0.35, 0, TAU); s.fillStyle = ink(A.qing * 0.9 * m * (1 - wash)); s.fill();   // hair mass
      s.globalCompositeOperation = 'source-over'; s.filter = 'none';
    }, { grain: 0.6 });
    for (const fd of S.feeders) { const fa = t - fd.t; if (fa >= 0) inkBloom(g, fd.x - cam, fd.y, fa, { r: 55, alpha: A.dan * (1 - m) * (1 - prog(fa, 1.5, 4)), seed: 60 + fd.t * 10, k: 2.5 }); }
    // brush marks that make it read as a face
    const lineA = 1 - prog(t, 24.95, 25.8);
    if (t > 23.45 && lineA > 0) {
      g.save(); g.globalAlpha = lineA; g.translate(-cam, 55 * wash * wash);
      inkStroke(g, S.front, 7, { alpha: A.dan * 1.2, dry: 0.4, seed: 31, upto: prog(t, 23.45, 24.25, ease.outQuad), wet: 0.55 });
      inkStroke(g, S.brow, 5, { alpha: A.dan * 1.1, dry: 0.5, seed: 32, upto: prog(t, 23.7, 24.0) });
      inkStroke(g, S.eye, 4, { alpha: A.zhong, dry: 0.3, seed: 33, upto: prog(t, 23.95, 24.2), taper: BRUSH.both });
      g.restore();
    }
    // drips
    if (wash > 0) for (const d of S.drips) {
      const u = prog(t, Y_WASH[0] + d.d, Y_WASH[1] + 0.3, ease.outQuad); if (u <= 0) continue;
      const x = x0 + Math.cos(d.th) * d.r, y = y0 + Math.sin(d.th) * d.r + 60 * wash * wash;
      inkStroke(g, spline([[x, y], [x + 4, y + d.len * 0.5], [x - 3, y + d.len]], 8), d.w, { alpha: A.dan * 0.7 * (1 - 0.4 * wash), dry: 0.3, seed: d.seed, upto: u, taper: BRUSH.hair, wet: 0.7 });
    }
  }
}

/** Shots 1–2 share one continuous picture; only the lyric changes. */
function yuaiOpening(g, f) {
  const t = f.t, cam = yuaiCamOpen(t);
  yuaiPaper(g, cam);
  yuaiLand(g, cam, keys(t, [[15.85, W + 320], [21.4, -420, ease.inOutQuad]]));
  yuaiSky(g, t, cam);
  yuaiLyrics(g, f);
}
