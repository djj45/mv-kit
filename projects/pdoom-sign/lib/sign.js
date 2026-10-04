// sign.js — the style law of "SAFETY NOTICE" in one file: palette, three type registers, the pictogram figure
// and machine, and the sign furniture (rounded triangle, prohibition ring, hazard stripes, arrow, chevron,
// plate, P(doom) gauge, rubber stamp). Every scene draws with SG and never writes a hex value of its own.
//
// Rules this file enforces (TREATMENT.md §2): three line widths only — pictogram 34, plate border 14, hairline 3;
// every sign is rounded (radius = 0.08 × side); flat fills, no gradient, no shadow, no blur; the only colour is yellow.
// Grid: SG.U = 24 px, safe margin SG.M = 96 px. Sizes: SG.SIZE.S/M/L/XL/XXL = 56/110/190/300/360.
(function (G) {
'use strict';
const MV = G.MV, TAU = Math.PI * 2, D2R = Math.PI / 180;

const SG = {
  U: 24, M: 96,
  // SAFE = M + U: where a lyric (or any text the camera may push) is actually placed. A box sitting exactly on M is
  // skipped by kits/camera.js (it counts as "already at the edge") and the default push drift then takes the ink
  // under qa's 96 px margin — one grid unit of slack fixes it. M stays the rule; SAFE is where we put things.
  SAFE: 120,
  C: { paper: '#F2EFE6', paper2: '#E4DFD3', ink: '#111111', ink2: '#6E6A63', yellow: '#FFC400' },
  LW: { pict: 34, plate: 14, rule: 3 },
  SIZE: { S: 56, M: 110, L: 190, XL: 300, XXL: 360 },
  F: {
    display: '"DIN Condensed", "Avenir Next Condensed", "Arial Narrow", "DejaVu Sans Condensed", sans-serif',
    heavy: '"Avenir Next Condensed", "DIN Condensed", "Arial Narrow", "DejaVu Sans Condensed", sans-serif',
    mono: 'Menlo, "DejaVu Sans Mono", monospace',
  },

  // ---------------------------------------------------------------- type: three registers
  /** shout — lyric body, big words on signs */
  display(g, size) { g.font = `700 ${size}px ${SG.F.display}`; g.letterSpacing = `${-0.01 * size}px`; },
  /** heavy — pure-lyric screens, OBSOLETE / APPROVED stamps */
  heavy(g, size) { g.font = `800 ${size}px ${SG.F.heavy}`; g.letterSpacing = '0px'; },
  /** machine — labels, numbers, scales, table contents; always upper case with wide tracking */
  mono(g, size, bold) { g.font = `${bold ? 700 : 400} ${size}px ${SG.F.mono}`; g.letterSpacing = `${0.12 * size}px`; },

  // ---------------------------------------------------------------- ground
  /** whole-frame background: 'P' paper | 'B' black | 'Y' yellow */
  bg(g, kind) {
    g.fillStyle = kind === 'B' ? SG.C.ink : kind === 'Y' ? SG.C.yellow : SG.C.paper;
    g.fillRect(0, 0, W, H);
  },
  /** the foreground colour on that ground: P → ink, B → paper, Y → ink */
  fg(kind) { return kind === 'P' || kind === 'Y' ? SG.C.ink : SG.C.paper; },

  // ---------------------------------------------------------------- geometry helpers
  /** rounded-rect path (does not paint) */
  rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r == null ? 0 : r, Math.min(Math.abs(w), Math.abs(h)) / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y); g.arcTo(x + w, y, x + w, y + r, r);
    g.lineTo(x + w, y + h - r); g.arcTo(x + w, y + h, x + w - r, y + h, r);
    g.lineTo(x + r, y + h); g.arcTo(x, y + h, x, y + h - r, r);
    g.lineTo(x, y + r); g.arcTo(x, y, x + r, y, r);
    g.closePath();
  },
  /** rounded polygon path through pts with corner radius r */
  rpoly(g, pts, r) {
    const n = pts.length;
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      const v1 = [a[0] - p[0], a[1] - p[1]], v2 = [b[0] - p[0], b[1] - p[1]];
      const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
      const rr_ = Math.min(r, l1 / 2, l2 / 2);
      const p1 = [p[0] + v1[0] / l1 * rr_, p[1] + v1[1] / l1 * rr_];
      const p2 = [p[0] + v2[0] / l2 * rr_, p[1] + v2[1] / l2 * rr_];
      if (i === 0) g.moveTo(p1[0], p1[1]); else g.lineTo(p1[0], p1[1]);
      g.arcTo(p[0], p[1], p2[0], p2[1], rr_);
    }
    g.closePath();
  },
  /** stroke a polyline in the pictogram weight (round caps and joins) */
  poly(g, pts, o) {
    o = o || {};
    g.save();
    g.strokeStyle = o.color || SG.C.ink; g.lineWidth = o.lw == null ? SG.LW.pict : o.lw;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke(); g.restore();
  },

  // ---------------------------------------------------------------- ① the figure
  // Pose: { lean, head:[dx,dy], armL:[shoulder,elbow], armR:[…], legL:[hip,knee], legR:[…], dy }
  // Angles in degrees, 0 = straight down, positive = swings toward the right of the picture; the second number
  // is the bend at the elbow / knee, relative to the segment above. armL / armR are the arms on the left and
  // right of the picture. head is the offset of the head centre from the neck (default [0, -30]).
  // Sizes: head r 30, torso 120, upper arm 70, forearm 60, thigh 80, shin 80 — all × s.
  POSE: {
    stand: { lean: 0, head: [0, -30], armL: [8, 6], armR: [-8, 6], legL: [-17, 5], legR: [17, -5] },
    kneel: { lean: 12, head: [0, -30], armL: [26, 44], armR: [-6, 22], legL: [78, -78], legR: [-18, -74], dy: 34 },
    reach: { lean: 8, head: [0, -30], armL: [70, 8], armR: [88, -4], legL: [-20, 8], legR: [22, -8] },
    carry: { lean: 6, head: [0, -30], armL: [96, -74], armR: [84, -74], legL: [-18, 8], legR: [18, -8] },
    cower: { lean: 16, head: [0, -26], armL: [162, -22], armR: [-162, 22], legL: [-20, -44], legR: [20, -44], dy: 40 },
    fall: { lean: 86, head: [0, -30], armL: [96, -30], armR: [74, -46], legL: [104, 10], legR: [86, 26], dy: 0 },
    sit: { lean: -8, head: [0, -30], armL: [30, 28], armR: [-14, 32], legL: [86, -84], legR: [92, -78], dy: 30 },
    point: { lean: 4, head: [0, -30], armL: [-8, 8], armR: [96, -2], legL: [-20, 6], legR: [20, -6] },
    /** gait phase k = 0..1 */
    walk(k) {
      const a = k * TAU, s1 = Math.sin(a), s2 = Math.sin(a + Math.PI);
      return { lean: 5, head: [0, -30], dy: -3 * Math.abs(Math.sin(2 * a)),
               armL: [-20 * s1, 12], armR: [-20 * s2, 12],
               legL: [26 * s1, -(s1 < 0 ? 38 * -s1 : 6)], legR: [26 * s2, -(s2 < 0 ? 38 * -s2 : 6)] };
    },
    /** gait phase k = 0..1, faster and lower */
    run(k) {
      const a = k * TAU, s1 = Math.sin(a), s2 = Math.sin(a + Math.PI);
      return { lean: 15, head: [0, -30], dy: -7 * Math.abs(Math.sin(2 * a)),
               armL: [-46 * s1, 62], armR: [-46 * s2, 62],
               legL: [42 * s1, -(s1 < 0 ? 78 * -s1 : 10)], legR: [42 * s2, -(s2 < 0 ? 78 * -s2 : 10)] };
    },
  },
  /** interpolate two poses, k = 0 → a, 1 → b */
  pose(a, b, k) {
    const L = (p, q) => p + (q - p) * k, A = (p, q) => [L(p[0], q[0]), L(p[1], q[1])];
    return { lean: L(a.lean || 0, b.lean || 0), dy: L(a.dy || 0, b.dy || 0), head: A(a.head || [0, -30], b.head || [0, -30]),
             armL: A(a.armL, b.armL), armR: A(a.armR, b.armR), legL: A(a.legL, b.legL), legR: A(a.legR, b.legR) };
  },

  /**
   * The pictogram figure. (x, y) is the hip; s = 1 is about 335 px tall. o.color, o.lw (default 34·s),
   * o.name (for MV.focus), o.focus === false to stay out of MV.focus (a background figure).
   */
  figure(g, x, y, s, pose, o) {
    o = o || {};
    const P = pose || SG.POSE.stand, L = (P.lean || 0) * D2R;
    const cl = Math.cos(L), sl = Math.sin(L);
    const hx = x, hy = y + (P.dy || 0) * s;
    const Wp = (u, v) => [hx + (u * cl - v * sl) * s, hy + (u * sl + v * cl) * s];   // body → picture
    const dir = a => [Math.sin(a * D2R - L), Math.cos(a * D2R - L)];                 // body angle → unit vector
    const seg = (p, a, len) => { const d = dir(a); return [p[0] + d[0] * len * s, p[1] + d[1] * len * s]; };
    const lw = o.lw == null ? SG.LW.pict * s : o.lw, col = o.color || SG.C.ink;
    const neck = Wp(0, -120), head = Wp(P.head[0], P.head[1] - 120);   // head is measured from the neck
    const shL = Wp(-34, -108), shR = Wp(34, -108);                     // shoulder joints at the torso's edge: the arms attach, then diverge
    const elL = seg(shL, P.armL[0], 70), haL = seg(elL, P.armL[0] + P.armL[1], 60);
    const elR = seg(shR, P.armR[0], 70), haR = seg(elR, P.armR[0] + P.armR[1], 60);
    const knL = seg([hx, hy], P.legL[0], 80), anL = seg(knL, P.legL[0] + P.legL[1], 80);
    const knR = seg([hx, hy], P.legR[0], 80), anR = seg(knR, P.legR[0] + P.legR[1], 80);
    g.save();
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const path of [[[hx, hy], neck], [[hx, hy], knL, anL], [[hx, hy], knR, anR], [shL, elL, haL], [shR, elR, haR]]) {
      g.beginPath();
      path.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.stroke();
    }
    g.fillStyle = col;
    g.beginPath(); g.arc(head[0], head[1], 30 * s, 0, TAU); g.fill();   // solid head: the ISO pictogram reads it as a head
    g.restore();
    if (o.focus !== false) MV.focus(head[0], head[1], o.name || 'figure');
    return { head, hip: [hx, hy], hand: haR, foot: [anL, anR] };
  },

  // ---------------------------------------------------------------- ② the machine
  /**
   * The machine: rounded square (side 220·s, radius 44·s) with one round eye (white r 44·s, pupil r 18·s).
   * (x, y) is the centre. o: gaze [dx,dy] (−1..1), blink 0..1, mask true|0..1, peel 0..1, maskRot,
   * color (body ink), eye (white), pupil, fill (body fill, default none), lw, name, focus === false.
   */
  machine(g, x, y, s, o) {
    o = o || {};
    const side = 220 * s, r = 44 * s, lw = (o.lw == null ? SG.LW.pict : o.lw) * s;
    const col = o.color || SG.C.ink, eyeC = o.eye || '#FFFFFF', pupC = o.pupil || SG.C.ink;
    const ex = x, ey = y;
    g.save();
    g.lineJoin = 'round';
    if (o.fill) { g.fillStyle = o.fill; SG.rr(g, x - side / 2, y - side / 2, side, side, r); g.fill(); }
    g.strokeStyle = col; g.lineWidth = lw;
    SG.rr(g, x - side / 2 + lw / 2, y - side / 2 + lw / 2, side - lw, side - lw, Math.max(0, r - lw / 2)); g.stroke();
    // eye: the white disc squashes shut when it blinks, the pupil slides with the gaze
    const blink = clamp(o.blink || 0), ry = 44 * s * (1 - 0.94 * blink);
    g.fillStyle = eyeC;
    g.beginPath(); g.ellipse(ex, ey, 44 * s, Math.max(1.5, ry), 0, 0, TAU); g.fill();
    if (ry > 6 * s) {
      const gz = o.gaze || [0, 0];
      g.fillStyle = pupC;
      g.beginPath(); g.arc(ex + gz[0] * 22 * s, ey + gz[1] * 22 * s, 18 * s, 0, TAU); g.fill();
    } else {
      g.strokeStyle = pupC; g.lineWidth = 8 * s; g.beginPath();
      g.moveTo(ex - 40 * s, ey); g.lineTo(ex + 40 * s, ey); g.stroke();
    }
    g.restore();
    if (o.mask) SG.mask(g, x, y, s, o);
    if (o.focus !== false) MV.focus(ex, ey, o.name || 'machine eye');
    return [ex, ey];
  },
  /** the smiley sticker of shot 09: yellow sticker over the eye, corner lifting (o.peel) */
  mask(g, x, y, s, o) {
    o = o || {};
    const k = o.mask === true ? 1 : clamp(o.mask), peel = clamp(o.peel || 0);
    const a = (o.maskRot == null ? -8 : o.maskRot) * D2R, w = 150 * s * k, h = 150 * s * k;
    const p = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2 - (h / 2) * peel], [w / 2 - (w / 2) * peel, h / 2], [-w / 2, h / 2]];
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = SG.C.yellow; g.strokeStyle = SG.C.ink; g.lineWidth = 10 * s;
    SG.rpoly(g, p, 16 * s); g.fill(); g.stroke();
    g.fillStyle = SG.C.ink;
    g.beginPath(); g.arc(-28 * s, -18 * s, 9 * s, 0, TAU); g.arc(28 * s, -18 * s, 9 * s, 0, TAU); g.fill();
    g.strokeStyle = SG.C.ink; g.lineWidth = 10 * s; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 4 * s, 42 * s, 25 * D2R, 155 * D2R); g.stroke();
    if (peel > 0.01) {   // the corner curling up: the eye shows through underneath
      g.fillStyle = SG.C.paper2; g.strokeStyle = SG.C.ink; g.lineWidth = 6 * s;
      SG.rpoly(g, [[w / 2 - (w / 2) * peel, h / 2 - (h / 2) * peel * 0.35], [w / 2, h / 2 - (h / 2) * peel], [w / 2 - (w / 2) * peel, h / 2]], 6 * s);
      g.fill(); g.stroke();
    }
    g.restore();
  },
  /** the eye centre of a machine (for MV.focus and inserts) */
  eyeAt(x, y, s, o) { return [x, y]; },

  // ---------------------------------------------------------------- sign furniture
  /** warning triangle: yellow, ink border, rounded corners; o.icon(g, cx, cy, r) draws inside (clipped) */
  triangle(g, x, y, size, o) {
    o = o || {};
    const w = size * 1.1547, h = size;
    const pts = [[x, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]];
    g.save(); g.lineJoin = 'round';
    SG.rpoly(g, pts, size * 0.08);
    g.fillStyle = o.fill || SG.C.yellow; g.fill();
    g.strokeStyle = o.border || SG.C.ink; g.lineWidth = o.lw == null ? SG.LW.plate : o.lw; g.stroke();
    if (o.icon) { g.save(); SG.rpoly(g, pts, size * 0.08); g.clip(); o.icon(g, x, y + size * 0.14, size * 0.24); g.restore(); }
    g.restore();
    return { x, y, size, w, h };
  },
  /** prohibition sign: ink ring + slash; o.icon is drawn under the slash */
  noSign(g, x, y, r, o) {
    o = o || {};
    const lw = o.lw == null ? SG.LW.pict : o.lw, col = o.color || SG.C.ink;
    g.save();
    if (o.fill) { g.fillStyle = o.fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    if (o.icon) { g.save(); g.beginPath(); g.arc(x, y, r - lw * 0.6, 0, TAU); g.clip(); o.icon(g, x, y, r * 0.62); g.restore(); }
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'butt';
    g.beginPath(); g.arc(x, y, r - lw / 2, 0, TAU); g.stroke();
    // the slash: a paper-coloured underlay first (o.halo, twice as wide), and both strokes clipped inside the ring —
    // a symbol drawn under it keeps a white gap instead of fusing into one black mass (qa: text-touch)
    const a = 45 * D2R, d = (r - lw * 0.4);
    const slash = () => { g.beginPath(); g.moveTo(x - d * Math.cos(a), y - d * Math.sin(a)); g.lineTo(x + d * Math.cos(a), y + d * Math.sin(a)); g.stroke(); };
    g.save();
    g.beginPath(); g.arc(x, y, r - lw * 0.6, 0, TAU); g.clip();
    // The halo is twice the slash (ROUND4 §2: the white seam between the slash and the symbol). A caller whose
    // symbol is large can ask for a wider seam with o.haloW — it has to scale with the symbol, or a small sign's
    // glyph ends up cut into fragments.
    g.strokeStyle = o.halo || SG.C.paper;
    g.lineWidth = Math.min(o.haloW || lw * 2.0, (r - lw) * 0.9); g.lineCap = 'butt'; slash();
    g.strokeStyle = col; g.lineWidth = lw; slash();
    g.restore();
    // o.over: a symbol drawn on top of the hollowed slash, with its own paper outline — the seam then runs *behind*
    // the symbol instead of cutting it into fragments (shot 19's omega; qa: text-touch)
    if (o.over) { g.save(); g.beginPath(); g.arc(x, y, r - lw * 0.6, 0, TAU); g.clip(); o.over(g, x, y, r); g.restore(); }
    g.restore();
    return { x, y, r };
  },
  /** hazard stripes: yellow ground, ink diagonals. o.angle (45), o.period (48), o.phase (px, drive with f.t) */
  stripes(g, x, y, w, h, o) {
    o = o || {};
    const ang = (o.angle == null ? 45 : o.angle) * D2R, per = o.period || 48, phase = o.phase || 0;
    const cx = x + w / 2, cy = y + h / 2, D = Math.hypot(w, h) * 0.75 + per * 2;
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    g.save();
    if (o.radius) { SG.rr(g, x, y, w, h, o.radius); g.clip(); } else { g.beginPath(); g.rect(x, y, w, h); g.clip(); }
    g.fillStyle = o.fill || SG.C.yellow; g.fillRect(x, y, w, h);
    g.strokeStyle = o.color || SG.C.ink; g.lineWidth = per / 2; g.lineCap = 'butt';
    const n = Math.ceil(D / per) + 2;
    for (let i = -n; i <= n; i++) {
      const off = i * per + (((phase % per) + per) % per);
      const px = cx + nx * off, py = cy + ny * off;
      g.beginPath(); g.moveTo(px - dx * D, py - dy * D); g.lineTo(px + dx * D, py + dy * D); g.stroke();
    }
    g.restore();
    return { x, y, w, h };
  },
  /** thick flat arrow from (x0,y0) to (x1,y1). o.w (40), o.head (90), o.color */
  arrow(g, x0, y0, x1, y1, o) {
    o = o || {};
    const w = o.w == null ? 40 : o.w, hd = o.head == null ? 90 : o.head, col = o.color || SG.C.ink;
    const ang = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
    const hl = Math.min(hd, L * 0.9), bx = x1 - Math.cos(ang) * hl * 0.92, by = y1 - Math.sin(ang) * hl * 0.92;
    const n = [-Math.sin(ang), Math.cos(ang)];
    g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(bx + Math.cos(ang) * w * 0.5, by + Math.sin(ang) * w * 0.5); g.stroke();
    g.fillStyle = col; g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(bx + n[0] * hl * 0.62, by + n[1] * hl * 0.62);
    g.lineTo(bx - n[0] * hl * 0.62, by - n[1] * hl * 0.62);
    g.closePath(); g.fill(); g.restore();
    return { x: x1, y: y1, angle: ang };
  },
  /** chevron ">" sign: size = height, pointing right. o.color, o.t */
  chevron(g, x, y, size, o) {
    o = o || {};
    const w = size * 0.58, t = o.t == null ? size * 0.26 : o.t;
    SG.poly(g, [[x - w / 2, y - size / 2], [x + w / 2, y], [x - w / 2, y + size / 2]], { color: o.color || SG.C.yellow, lw: t });
    return { x, y, size };
  },
  /**
   * A sign plate: rounded board + 14 px border (or a hazard-stripe frame), registered with MV.box so qa checks
   * any text put in it. Returns { x, y, w, h, pad, owner } — hand it to BOX.lines / BOX.text.
   * o: fill (paper2), border (ink), lw (14), pad, radius, stripes:true, name.
   */
  plate(g, x, y, w, h, o) {
    o = o || {};
    const lw = o.lw == null ? SG.LW.plate : o.lw;
    const r = o.radius == null ? Math.min(w, h) * 0.08 : o.radius;
    const pad = o.pad == null ? Math.max(28, Math.min(w, h) * 0.09) : o.pad;
    const owner = MV.owner(o.name || 'plate');
    if (o.fill !== false) { g.save(); g.fillStyle = o.fill || SG.C.paper2; SG.rr(g, x, y, w, h, r); g.fill(); g.restore(); }
    if (o.stripes) {
      g.save();
      SG.rr(g, x, y, w, h, r); SG.rr(g, x + lw, y + lw, w - 2 * lw, h - 2 * lw, Math.max(0, r - lw));
      g.clip('evenodd');
      SG.stripes(g, x, y, w, h, { angle: o.angle, period: o.period, phase: o.phase });
      g.restore();
    } else {
      g.save(); g.strokeStyle = o.border || SG.C.ink; g.lineWidth = lw; g.lineJoin = 'round';
      SG.rr(g, x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2)); g.stroke(); g.restore();
    }
    MV.box(g, x, y, w, h, { name: o.name || 'plate', pad, owner });
    return { x, y, w, h, pad, owner, fill: o.fill };
  },
  /**
   * The P(doom) gauge: 180° half dial, 0–0.5 paper2 / 0.5–0.8 yellow / 0.8–1 ink (paper on black), 11 major
   * ticks with mono numbers, a heavy needle and a hub. Returns the needle tip for MV.focus.
   * o: label ('P(DOOM)'), fg (ticks / needle / numbers), needle (needle colour, default fg), top (colour of the
   * 0.8–1 band), c0 / c1.
   */
  gauge(g, cx, cy, R, v, o) {
    o = o || {};
    const fg = o.fg || SG.C.ink, lw = R * 0.16, ra = R * 0.90;
    const bands = [[0, 0.5, o.c0 || SG.C.paper2], [0.5, 0.8, o.c1 || SG.C.yellow], [0.8, 1, o.top || fg]];
    g.save(); g.lineCap = 'butt';
    for (const [a, b, col] of bands) {
      g.beginPath(); g.arc(cx, cy, ra, Math.PI + a * Math.PI, Math.PI + b * Math.PI);
      g.strokeStyle = col; g.lineWidth = lw; g.stroke();
    }
    // ticks and numbers
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + i / 10 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
      g.strokeStyle = fg; g.lineWidth = R * (i % 5 === 0 ? 0.022 : 0.012);
      g.beginPath();
      g.moveTo(cx + ca * R * 0.72, cy + sa * R * 0.72);
      g.lineTo(cx + ca * R * 0.80, cy + sa * R * 0.80);
      g.stroke();
      const t = i % 2 === 0 ? String(i / 10).replace('0.', '.') : '';
      if (t) {
        // the .0 and 1 sit on the dial's foot, where the hazard strip runs: lift them clear of it (qa: text-touch)
        let ny = cy + sa * R * 0.60;
        if (Math.abs(ny - cy) < 30) ny = cy - 30;
        BOX.center(g, t, cx + ca * R * 0.60, ny, { size: R * 0.072, font: (gg, sz) => SG.mono(gg, sz, true), color: fg });
      }
    }
    // needle (v is not clamped to 1: the hook's last chorus holds it at 1.00 and trembles a degree either way)
    const a = Math.PI + clamp(v, -0.05, 1.05) * Math.PI;
    g.strokeStyle = o.needle || fg; g.lineWidth = R * 0.05; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78); g.stroke();
    g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, R * 0.055, 0, TAU); g.fill();
    g.restore();
    if (o.label !== false) {
      SG.mono(g, R * 0.085, true);
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.label || 'P(DOOM)', cx, cy + R * 0.30);
    }
    return [cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78];
  },
  /**
   * Rubber stamp: heavy text inside a 14 px rounded frame, rotated o.rot (−6°), pressed with o.k (0..1:
   * it comes down from 1.25× to 1×). o.color, o.lw, o.fill (ground colour: a yellow stamp stays legible on a black
   * machine).
   */
  stamp(g, text, x, y, size, o) {
    o = o || {};
    const k = clamp(o.k == null ? 1 : o.k), sc = 1 + 0.25 * (1 - k), col = o.color || SG.C.ink;
    const lw = o.lw == null ? SG.LW.plate : o.lw;
    g.save(); g.translate(x, y); g.rotate((o.rot == null ? -6 : o.rot) * D2R); g.scale(sc, sc);
    g.globalAlpha *= 0.15 + 0.85 * k;
    SG.heavy(g, size);
    const m = g.measureText(text), w = m.width + size * 1.0, h = size * 1.6;
    if (o.fill) { g.fillStyle = o.fill; SG.rr(g, -w / 2, -h / 2, w, h, h * 0.10); g.fill(); }   // a stamp on a dark shape needs its own ground
    g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round';
    SG.rr(g, -w / 2, -h / 2, w, h, h * 0.10); g.stroke();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 0, size * 0.05);
    g.restore();
    return { x, y, w: (g.measureText(text).width + size) * sc, h: size * 1.6 * sc };
  },
};

G.SG = SG;
})(window);
