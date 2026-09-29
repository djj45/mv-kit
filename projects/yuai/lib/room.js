// 雨爱 — her room (shots 3–4): a wooden window whose opening shows the scroll's landscape, two lattice
// casements swung open into the room, and her, seen from behind, sitting by the window.
// Shot 3 starts zoomed so that the window opening IS the frame of shot 2 (a seamless pull-back), rain
// begins on "下雨了"; shot 4 pushes in while the glass runs with water and the view washes out.
// Room coordinates = screen coordinates at zoom 1.

const YROOM = {
  O: { x: 580, y: 170, w: 880, h: 495 },          // window opening, 16:9 so it can fill the frame
  her: { x: 430, y: 600, u: 150 },                 // her head centre and scale (1 unit = head height)
};
YROOM.O.cx = YROOM.O.x + YROOM.O.w / 2; YROOM.O.cy = YROOM.O.y + YROOM.O.h / 2;

MV.onInit(() => {
  YROOM.S0 = W / YROOM.O.w;                         // zoom at which the opening fills the screen
  YROOM.view = mk(W, H);                            // the landscape seen through the window (transparent)
  YROOM.soft = mk(W / 4, H / 4);                    // blurred copy of it (water on the glass)
  YROOM.art = yroomPaint(2);                        // static room painting at 2× (stays crisp while zooming)
});

// ---------------------------------------------------------------- static room (painted once)
function yroomPaint(k) {
  const c = mk(W * k, H * k), g = c.getContext('2d'), O = YROOM.O, A = INK.A;
  g.scale(k, k);
  // dim interior: a mottled, uneven wash (darker towards the corners), with a soft hole where the daylight comes in
  {
    const lw = 240, lh = 135, lo = mk(lw, lh), lg = lo.getContext('2d'), im = lg.createImageData(lw, lh);
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const u = x / lw, v = y / lh, i = (y * lw + x) * 4;
      const corner = Math.min(1, Math.hypot(u - 0.53, (v - 0.4) * 1.3) * 1.25);
      const m = 0.55 + 0.45 * fbm2(x * 0.035, y * 0.035, 17, 4) + 0.25 * fbm2(x * 0.012, y * 0.08, 19, 2);
      const [r, gg, b] = INK.rgb.split(',').map(Number);
      im.data[i] = r; im.data[i + 1] = gg; im.data[i + 2] = b; im.data[i + 3] = 255 * clamp(A.qing * (0.2 + 0.55 * corner) * m, 0, 0.3);
    }
    lg.putImageData(im, 0, 0);
    const wl = mk(W, H), wg = wl.getContext('2d'); wg.imageSmoothingEnabled = true; wg.imageSmoothingQuality = 'high'; wg.drawImage(lo, 0, 0, W, H);
    wg.globalCompositeOperation = 'destination-out'; wg.filter = 'blur(18px)'; wg.fillStyle = '#000'; wg.fillRect(O.x - 6, O.y - 6, O.w + 12, O.h + 12); wg.filter = 'none';
    wg.globalCompositeOperation = 'source-over'; granulate(wg, W, H, 88, 0.5, 1 / 30);
    g.drawImage(wl, 0, 0);
  }
  const st = (pts, w, o) => inkStroke(g, pts, w, { alpha: A.nong, dry: 0.35, wet: 0.6, ...o });
  const line = (x0, y0, x1, y1, n = 6) => spline(Array.from({ length: n }, (_, i) => [lerp(x0, x1, i / (n - 1)) + (hash(i, x0 | 0, 5) - 0.5) * 2, lerp(y0, y1, i / (n - 1)) + (hash(i, y0 | 0, 6) - 0.5) * 2]), 6);
  // lattice casements, swung open into the room (a quad: hinge edge at the post, outer edge nearer us)
  const shutter = (hx, ox, seed) => {
    const q = [[hx, O.y - 12], [hx, O.y + O.h + 8], [ox, O.y + O.h + 40], [ox, O.y - 40]];
    const P = (u, v) => [lerp(lerp(q[0][0], q[3][0], u), lerp(q[1][0], q[2][0], u), v), lerp(lerp(q[0][1], q[3][1], u), lerp(q[1][1], q[2][1], u), v)];
    g.fillStyle = ink(A.qing * 0.22); g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.fill();
    for (let i = 1; i < 3; i++) { const a = P(i / 3, 0.03), b = P(i / 3, 0.97); st(line(a[0], a[1], b[0], b[1]), 3.2, { alpha: A.zhong, dry: 0.3, seed: seed + i, taper: BRUSH.both }); }
    for (let j = 1; j < 7; j++) { const a = P(0.03, j / 7), b = P(0.97, j / 7); st(line(a[0], a[1], b[0], b[1], 4), 2.8, { alpha: A.zhong, dry: 0.3, seed: seed + 20 + j, taper: BRUSH.both }); }
    const e = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
    for (let i = 0; i < 4; i++) { const a = P(...e[i]), b = P(...e[i + 1]); st(line(a[0], a[1], b[0], b[1]), 9, { seed: seed + 50 + i }); }
  };
  shutter(O.x - 14, O.x - 128, 300);
  shutter(O.x + O.w + 14, O.x + O.w + 104, 400);
  // frame: posts, head beam, sill
  st(line(O.x - 12, O.y - 30, O.x - 12, O.y + O.h + 20), 20, { seed: 11 });
  st(line(O.x + O.w + 12, O.y - 30, O.x + O.w + 12, O.y + O.h + 20), 20, { seed: 12 });
  st(line(O.x - 60, O.y - 18, O.x + O.w + 60, O.y - 16), 22, { seed: 13, dry: 0.45 });
  st(line(O.x - 120, O.y + O.h + 22, O.x + O.w + 110, O.y + O.h + 20), 28, { seed: 14, dry: 0.4 });
  st(line(O.x - 100, O.y + O.h + 44, O.x + O.w + 90, O.y + O.h + 42), 7, { seed: 15, alpha: A.zhong, dry: 0.5 });
  // lattice header above the beam (回纹-ish grid)
  const hy0 = O.y - 118, hy1 = O.y - 34;
  st(line(O.x - 12, hy0, O.x + O.w + 12, hy0), 10, { seed: 16 });
  for (let i = 0; i <= 10; i++) { const x = O.x + O.w * i / 10; st(line(x, hy0 + 6, x, hy1), 2.6, { seed: 60 + i, alpha: A.zhong, taper: BRUSH.both }); }
  for (let j = 1; j < 2; j++) { const y = lerp(hy0, hy1, j / 2); st(line(O.x, y, O.x + O.w, y, 10), 2.6, { seed: 90 + j, alpha: A.zhong, taper: BRUSH.both }); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

/** inkSoft, but into an arbitrary context at its current transform (init-time helper). */
function inkSoftInto(g, fn) {
  const s = mk(W / 4, H / 4), sg = s.getContext('2d'); sg.scale(0.25, 0.25); fn(sg);
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, W, H); g.restore();
}

// ---------------------------------------------------------------- her (drawn live, on twos)
/**
 * Her, from behind: narrow sloping shoulders, slim neck, long hair gathered low at the nape.
 * pose: { lift (0..1 looks up at the window), bow (0..1 head lowered) }.
 * Bowing seen from behind: the crown tips forward and down while the nape hairline rises — the neck
 * shows MORE, never less.
 */
function yroomHer(g, t, pose) {
  const A = INK.A, { x: hx, y: hy, u: U } = YROOM.her, tk = tick(t);
  const br = Math.sin(t * TAU / 4.6) * 0.01;                      // breathing
  const bow = pose.bow || 0, lift = pose.lift || 0;
  const J = (p, i) => [p[0] + (hash(tk, i, 31) - 0.5) * 0.006, p[1] + (hash(tk, i, 32) - 0.5) * 0.006];   // line boil (units)
  const P = (u, v, i = 0) => { const q = J([u, v + (v > 0.72 ? br : 0)], i); return [hx + q[0] * U, hy + q[1] * U]; };
  const S = (pts, base = 0) => spline(pts.map((p, i) => P(p[0], p[1], base + i)), 7);
  // head (and everything attached to it) — lift: a little up and towards the window; bow: crown down, nape up
  const Hd = (u, v, i) => P(u + 0.03 * lift, v - 0.035 * lift + bow * lerp(0.13, -0.08, clamp((v + 0.55) / 1.2)), i);
  const HS = (pts, base) => spline(pts.map((p, i) => Hd(p[0], p[1], base + i)), 7);
  const body = [[-0.15, 0.8], [-0.42, 0.89], [-0.66, 1.0], [-0.81, 1.19], [-0.88, 1.5], [-0.91, 1.95], [-0.94, 2.6], [-0.96, 3.6],
    [0.96, 3.6], [0.93, 2.62], [0.9, 1.97], [0.87, 1.52], [0.8, 1.21], [0.67, 1.02], [0.44, 0.9], [0.15, 0.81]];
  const fillPoly = pts => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = INK.paper; g.fill(); };
  // 1. paper inside her silhouette and her neck (hides the window behind her)
  fillPoly(S(body, 100));
  fillPoly([Hd(-0.14, 0.45, 120), Hd(0.14, 0.45, 121), P(0.16, 0.84, 122), P(-0.16, 0.84, 123)]);
  // 2. outlines of the cardigan (白描)
  const o = { alpha: A.nong, dry: 0.28, wet: 0.7 };
  inkStroke(g, S([[-0.17, 0.81], [-0.42, 0.89], [-0.66, 1.0], [-0.81, 1.19], [-0.88, 1.5], [-0.92, 1.97], [-0.95, 2.7], [-0.97, 3.6]], 0), 5.5, { ...o, seed: 501 });
  inkStroke(g, S([[0.17, 0.82], [0.44, 0.9], [0.67, 1.02], [0.8, 1.21], [0.87, 1.52], [0.91, 1.99], [0.94, 2.7], [0.97, 3.6]], 10), 5.5, { ...o, seed: 502 });
  inkStroke(g, S([[-0.66, 1.5], [-0.63, 2.0], [-0.62, 2.7]], 20), 3, { ...o, seed: 503, taper: BRUSH.both, alpha: A.zhong });
  inkStroke(g, S([[0.65, 1.52], [0.62, 2.05], [0.61, 2.75]], 25), 3, { ...o, seed: 504, taper: BRUSH.both, alpha: A.zhong });
  inkStroke(g, S([[-0.21, 0.84], [0, 0.93], [0.21, 0.85]], 30), 4, { ...o, seed: 505, taper: BRUSH.both });          // collar
  inkStroke(g, S([[-0.38, 1.25], [-0.32, 1.45], [-0.26, 1.7]], 35), 2.4, { ...o, seed: 506, taper: BRUSH.both, alpha: A.dan });   // folds
  inkStroke(g, S([[0.36, 1.28], [0.3, 1.5], [0.24, 1.78]], 40), 2.4, { ...o, seed: 507, taper: BRUSH.both, alpha: A.dan });
  inkStroke(g, S([[-0.5, 2.65], [-0.15, 2.74], [0.22, 2.7]], 45), 2.2, { ...o, seed: 508, taper: BRUSH.both, alpha: A.dan });
  inkStroke(g, S([[-0.84, 2.2], [-0.76, 2.3]], 50), 2, { ...o, seed: 509, taper: BRUSH.both, alpha: A.dan });
  // neck: slim, from under the hair to the collar
  inkStroke(g, spline([Hd(-0.14, 0.46, 60), P(-0.145, 0.66, 61), P(-0.17, 0.82, 62)], 6), 2.6, { ...o, seed: 510, taper: BRUSH.both });
  inkStroke(g, spline([Hd(0.14, 0.46, 63), P(0.145, 0.66, 64), P(0.17, 0.83, 65)], 6), 2.6, { ...o, seed: 511, taper: BRUSH.both });
  // 3. hair: a soft wet mass over the head, gathered low, falling down her back
  const tail = [[0.05, 0.6], [0.2, 0.92], [0.25, 1.45], [0.2, 2.0], [0.06, 2.4], [-0.07, 2.0], [-0.13, 1.45], [-0.12, 0.92], [-0.06, 0.6]];
  const headHair = [[0, -0.55], [0.27, -0.49], [0.43, -0.22], [0.45, 0.1], [0.37, 0.38], [0.2, 0.56], [0, 0.62], [-0.2, 0.56], [-0.37, 0.38], [-0.45, 0.1], [-0.43, -0.22], [-0.27, -0.49]];
  const hairPath = (s) => {
    s.beginPath(); HS(headHair.concat([headHair[0]]), 200).forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.closePath();
    const tp = spline(tail.map((p, i) => (i === 0 || i === tail.length - 1 ? Hd(p[0], p[1], 220 + i) : P(p[0] + 0.02 * bow, p[1] - 0.04 * bow * (p[1] < 1.2 ? 1 : 0), 220 + i))), 7);
    tp.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.closePath();
  };
  g.save(); hairPath(g); g.fillStyle = INK.paper; g.fill(); g.restore();                // opaque under the wash
  inkSoft(g, s => { hairPath(s); s.fillStyle = ink(A.nong * 0.9); s.fill(); }, { scale: 0.5, grain: 0.35 });
  g.save(); hairPath(g); g.clip();                                                     // 飞白: paper showing through the hair
  for (let i = 0; i < 7; i++) {
    const u = -0.28 + 0.56 * i / 6;
    inkStrokePaper(g, HS([[u * 0.5, -0.44 + Math.abs(u) * 0.3], [u * 0.95, 0.0], [u * 0.6, 0.4]], 320 + i * 3), 5 + 3 * hash(i, 4), 0.35, 580 + i);
  }
  inkStrokePaper(g, spline([Hd(0.02, 0.66, 340), P(0.08, 1.3, 341), P(0.04, 2.0, 342)], 6), 4, 0.3, 590);
  g.restore();
  for (let i = 0; i < 15; i++) {
    const u = -1 + 2 * i / 14, e = Math.abs(u);                                           // -1 … 1 across the head
    const pts = [[u * 0.26, -0.52 + e * 0.06], [u * 0.4, -0.25 + e * 0.02], [u * 0.43, 0.08], [u * 0.33, 0.38], [u * 0.12, 0.58], [u * 0.03, 0.62]];
    inkStroke(g, HS(pts, 240 + i * 6), 2.2 + 1.2 * hash(i, 9), { alpha: A.jiao * (0.55 + 0.35 * hash(i, 8)), dry: 0.6, seed: 520 + i, taper: BRUSH.both, wet: 0.15 });
  }
  for (let i = 0; i < 6; i++) {
    const u = -0.08 + 0.05 * i;
    inkStroke(g, spline([Hd(u, 0.62, 280 + i), P(u + 0.07, 1.25, 285 + i), P(u - 0.03 + 0.02 * bow, 2.0, 290 + i), P(u + 0.02, 2.35, 295 + i)], 7), 2.8, { alpha: A.jiao, dry: 0.6, seed: 540 + i, taper: BRUSH.both, wet: 0.2 });
  }
  inkStroke(g, spline([Hd(0.42, 0.14, 300), Hd(0.49, 0.34, 301), Hd(0.45, 0.52, 302)], 6), 1.0, { alpha: A.zhong, dry: 0.4, seed: 560, taper: BRUSH.hair });   // stray strand
  inkStroke(g, spline([Hd(-0.03, 0.61, 303), Hd(0.11, 0.64, 304)], 4), 4.5, { alpha: A.jiao, dry: 0.1, seed: 561, taper: BRUSH.both });                   // hair tie
}

/** A dry-brush stroke in paper colour (飞白 highlights inside an ink mass). */
function inkStrokePaper(g, pts, w, a, seed) {
  const keep = INK.rgb; INK.rgb = '237,230,214';
  try { inkStroke(g, pts, w, { alpha: a, dry: 0.7, wet: 0, seed, taper: BRUSH.both }); } finally { INK.rgb = keep; }
}

// ---------------------------------------------------------------- the window view and the glass
function yroomView(t, cam, washed, vo = {}) {
  const v = YROOM.view.getContext('2d');
  v.setTransform(1, 0, 0, 1, 0, 0); v.globalAlpha = 1; v.globalCompositeOperation = 'source-over'; v.filter = 'none';
  v.clearRect(0, 0, W, H);
  if (vo.rainSky > 0) inkSoft(v, s => {                                       // a low, heavy rain sky
    const gr = s.createLinearGradient(0, 0, 0, H * 0.62); gr.addColorStop(0, ink(INK.A.qing * 1.6 * vo.rainSky)); gr.addColorStop(1, ink(0));
    s.fillStyle = gr; s.fillRect(0, 0, W, H);
  }, { grain: 0.5 });
  yuaiLand(v, cam);
  yuaiSky(v, t, cam);
  if (vo.fade > 0) { v.save(); v.globalCompositeOperation = 'destination-out'; v.fillStyle = `rgba(0,0,0,${clamp(vo.fade)})`; v.fillRect(0, 0, W, H); v.restore(); }
  if (washed > 0) {                      // water on the glass: blurred copy crossfades in
    const s = YROOM.soft.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, W / 4, H / 4);
    s.filter = `blur(${1 + 3 * washed}px)`; s.drawImage(YROOM.view, 0, 0, W / 4, H / 4); s.filter = 'none';
    v.globalAlpha = washed; v.globalCompositeOperation = 'source-over';
    v.save(); v.globalCompositeOperation = 'destination-out'; v.fillStyle = `rgba(0,0,0,${0.35 * washed})`; v.fillRect(0, 0, W, H); v.restore();
    v.imageSmoothingEnabled = true; v.drawImage(YROOM.soft, 0, 0, W, H); v.globalAlpha = 1;
  }
  return YROOM.view;
}

const YGLASS = (() => {
  const R = mulberry32(77), O = YROOM.O, riv = [], drops = [];
  for (let i = 0; i < 10; i++) riv.push({ x: O.x + 40 + (i + R() * 0.8) / 10 * (O.w - 80), y0: O.y + R() * O.h * 0.3, t0: 32.6 + R() * 4.4, v: 35 + R() * 55, ph: R() * 6, w: 2 + R() * 1.6, seed: 800 + i });
  for (let i = 0; i < 90; i++) drops.push({ x: O.x + 10 + R() * (O.w - 20), y: O.y + 10 + R() * (O.h - 20), t0: 32.35 + R() * 5.2, r: 2 + R() * R() * 6 });
  return { riv, drops };
})();

function yroomGlass(g, t, amt) {
  const O = YROOM.O, A = INK.A;
  g.save(); g.beginPath(); g.rect(O.x, O.y, O.w, O.h); g.clip();
  // pale film of water
  g.fillStyle = `rgba(237,230,214,${0.32 * amt})`; g.fillRect(O.x, O.y, O.w, O.h);
  // static drops
  for (const d of YGLASS.drops) {
    const a = prog(t, d.t0, d.t0 + 0.25); if (a <= 0) continue;
    g.fillStyle = `rgba(245,240,228,${0.45 * a})`; g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU); g.fill();
    g.strokeStyle = ink(A.dan * 0.8 * a); g.lineWidth = 1; g.beginPath(); g.arc(d.x, d.y, d.r, 0.15 * Math.PI, 0.95 * Math.PI); g.stroke();
  }
  // rivulets: a head that slides down (stick–slip), leaving a clear, wavering trail
  const tq = onTwos(t);
  for (const r of YGLASS.riv) {
    const age = tq - r.t0; if (age <= 0) continue;
    const yh = r.y0 + r.v * age + 14 * Math.sin(age * 2.1 + r.ph); if (yh <= r.y0 + 2) continue;
    const pts = []; for (let y = r.y0; y <= Math.min(yh, O.y + O.h + 20); y += 8) pts.push([r.x + 3 * noise1(y / 60, r.seed) + (y - r.y0) * 0.015, y]);
    if (pts.length < 2) continue;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(244,239,227,0.45)'; g.lineWidth = r.w; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.strokeStyle = ink(A.dan * 0.5); g.lineWidth = 0.9; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0] + r.w * 0.6, p[1]) : g.moveTo(p[0] + r.w * 0.6, p[1]))); g.stroke();
    const h = pts[pts.length - 1];
    g.fillStyle = 'rgba(246,242,232,0.8)'; g.beginPath(); g.ellipse(h[0], h[1], r.w * 1.1, r.w * 1.5, 0, 0, TAU); g.fill();
    g.strokeStyle = ink(A.zhong * 0.8); g.lineWidth = 1.3; g.beginPath(); g.ellipse(h[0], h[1], r.w * 1.1, r.w * 1.5, 0, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- the shot
/**
 * One continuous take for shots 3–4. o.cam(t) → {z, rx, ry, sx, sy}: room point (rx, ry) is drawn at screen
 * point (sx, sy) with zoom z. o.rain(t) density, o.wash(t) 0..1 (glass film + blur), o.pose(t) → {lift, bow}.
 */
function yroomShot(g, f, o) {
  const t = f.t, cam = yuaiCamOpen(t), O = YROOM.O;
  yuaiPaper(g, cam);
  const c = o.cam(t), wash = o.wash ? o.wash(t) : 0;
  const view = yroomView(t, o.viewCam ? o.viewCam(t) : cam, wash, { rainSky: o.rainSky ? o.rainSky(t) : 0, fade: o.viewFade ? o.viewFade(t) : 0 });
  g.save();
  g.translate(c.sx, c.sy); g.scale(c.z, c.z); g.translate(-c.rx, -c.ry);
  g.drawImage(view, O.x, O.y, O.w, O.h);
  const dens = o.rain(t);
  if (dens > 0) { g.save(); g.beginPath(); g.rect(O.x, O.y, O.w, O.h); g.clip(); inkRain(g, t, { x0: O.x, y0: O.y, w: O.w, h: O.h, density: dens, n: 260, len: 34, speed: 700, angle: 0.12, alpha: INK.A.dan * 0.95, width: 0.8 / Math.max(1, c.z * 0.8), seed: 5 }); g.restore(); }
  if (wash > 0) yroomGlass(g, t, wash);
  const fog = o.fog ? o.fog(t) : null;                                           // breath spreading on the glass
  if (fog && fog.a > 0) {
    g.save(); g.beginPath(); g.rect(O.x, O.y, O.w, O.h); g.clip();
    inkSoft(g, s => { s.filter = 'blur(10px)'; pathSmooth(s, blobPts(fog.x, fog.y, Math.max(1, fog.r), 23, 0.22, 60)); s.fillStyle = `rgba(241,236,225,${fog.a})`; s.fill(); s.filter = 'none'; }, { grain: 0.2 });
    g.restore();
  }
  g.imageSmoothingEnabled = true; g.drawImage(YROOM.art, 0, 0, W, H);
  yroomHer(g, t, o.pose(t));
  g.restore();
}

/** Pull back from "the opening fills the screen" (e = 0) to the room at zoom 1 (e = 1). */
function yroomPullBack(e) {
  const O = YROOM.O;
  return { z: Math.exp(lerp(Math.log(YROOM.S0), 0, e)), rx: O.cx, ry: O.cy, sx: lerp(W / 2, O.cx, e), sy: lerp(H / 2, O.cy, e) };
}
