// pip.js — Pip, the act-demo's character: a mustard gumdrop with stub arms, two feet and a sprout. An original design,
// drawn in plain Canvas 2D so it can be read in one sitting. Everything it does comes from kits/act.js poses:
//   PIP.draw(g, x, y, u, pose, t)   (x, y) = the point between its feet on the ground; u = size unit (body 8u × 9u).
// pose: everything an ACT pose carries (dx dy sq rot aL aR lookX lookY walk view flip smear, mood squint emote emoteK
// emoteAge) plus col (body colour) and sprout (extra bend of the sprout, radians).
// The face for each mood is here (FACE); the way each mood MOVES is ACT.moods. MV.model('pip') at the end registers
// its model sheet (render.py model → out/model-pip.png).
(function (G) {
'use strict';
const frac = x => x - Math.floor(x);
const C = { body: '#F2B33D', dark: '#C9851C', light: '#FFD978', ink: '#1A2233', white: '#FFFDF7', blush: '#EE7A5C', red: '#E5482E' };

// mood → face: eyes (one name, or [left, right]) and mouth
const FACE = {
  neutral: ['dot', 'small'], happy: ['happy', 'smile'], excited: ['wide', 'open'], laugh: ['closed', 'open'],
  love: ['heart', 'smile'], shy: ['dot', 'wobble'], proud: ['closed', 'smile'], smug: ['narrow', 'smirk'],
  relieved: ['closed', 'smile'], sad: ['sad', 'frown'], cry: ['sad', 'open'], angry: ['angry', 'flat'],
  furious: ['angry', 'open'], scared: ['wide', 'wobble'], surprised: ['wide', 'O'], confused: [['narrow', 'wide'], 'wobble'],
  thinking: ['dot', 'flat'], idea: ['wide', 'grin'], determined: ['angry', 'flat'], sleepy: ['closed', 'o'],
  bored: ['narrow', 'flat'], nervous: ['dot', 'wobble'], suspicious: ['narrow', 'flat'], disgusted: ['closed', 'wobble'],
  dizzy: ['swirl', 'wobble'], cool: ['narrow', 'smirk'], starstruck: ['star', 'open'], ko: ['x', 'wobble'],
  playful: [['closed', 'dot'], 'grin'], mischief: ['narrow', 'grin'], hopeful: ['wide', 'smile'],
};
const BLUSH = { happy: 0.4, love: 0.8, shy: 1, laugh: 0.5, hopeful: 0.4, starstruck: 0.5 };

/** the body outline (a gumdrop: wide flat bottom, dome top), width scaled by wk for the side views */
function bodyPath(g, u, wk) {
  const w = 4 * u * wk, b = -1.1 * u, top = -9.2 * u;
  g.beginPath();
  g.moveTo(-w + 0.9 * u * wk, b);
  g.quadraticCurveTo(-w, b, -w, b - 1.1 * u);
  g.bezierCurveTo(-w, -5.4 * u, -w * 0.8, top, 0, top);
  g.bezierCurveTo(w * 0.8, top, w, -5.4 * u, w, b - 1.1 * u);
  g.quadraticCurveTo(w, b, w - 0.9 * u * wk, b);
  g.closePath();
}

function eye(g, kind, x, y, u, o) {
  const lx = (o.lookX || 0) * 0.35 * u, ly = (o.lookY || 0) * 0.35 * u, sq = clamp(o.squint || 0), ink = C.ink;
  g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 0.32 * u; g.lineCap = 'round';
  const line = (pts) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(x + a * u, y + b * u) : g.moveTo(x + a * u, y + b * u))); g.stroke(); };
  if (sq > 0.6 || kind === 'closed') return line([[-0.5, 0.1], [0, 0.3], [0.5, 0.1]]);
  const h = 1 - sq * 0.8;
  switch (kind) {
    case 'happy': return line([[-0.55, 0.3], [0, -0.25], [0.55, 0.3]]);
    case 'narrow': g.beginPath(); g.ellipse(x + lx, y + 0.15 * u, 0.5 * u, 0.28 * u * h, 0, 0, TAU); g.fill(); return line([[-0.7, -0.15], [0.7, -0.15]]);
    case 'wide':
      g.fillStyle = C.white; g.beginPath(); g.ellipse(x, y, 0.85 * u, 1.05 * u * h, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(x + lx, y + ly, 0.32 * u, 0, TAU); g.fill(); return;
    case 'sad': g.beginPath(); g.ellipse(x + lx, y + ly + 0.1 * u, 0.42 * u, 0.7 * u * h, 0, 0, TAU); g.fill();
      return line(x < 0 ? [[-0.7, -0.8], [0.4, -1.2]] : [[-0.4, -1.2], [0.7, -0.8]]);
    case 'angry': g.beginPath(); g.ellipse(x + lx, y + ly + 0.15 * u, 0.42 * u, 0.6 * u * h, 0, 0, TAU); g.fill();
      return line(x < 0 ? [[-0.7, -1.2], [0.5, -0.65]] : [[-0.5, -0.65], [0.7, -1.2]]);
    case 'star': {
      g.fillStyle = C.red; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 0.42 : 1.05) * u; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r * h); }
      g.closePath(); g.fill(); g.lineWidth = 0.18 * u; g.stroke(); return;
    }
    case 'heart': g.fillStyle = C.red; heart(g, x, y, 0.75 * u); g.fill(); return;
    case 'x': line([[-0.5, -0.5], [0.5, 0.5]]); return line([[-0.5, 0.5], [0.5, -0.5]]);
    case 'swirl': g.lineWidth = 0.22 * u; g.beginPath(); for (let i = 0; i <= 30; i++) { const a = i / 30 * TAU * 2, r = 0.08 * u + i / 30 * 0.6 * u; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.stroke(); return;
    default: // dot
      g.beginPath(); g.ellipse(x + lx, y + ly, 0.42 * u, 0.72 * u * h, 0, 0, TAU); g.fill();
      g.fillStyle = C.white; g.beginPath(); g.arc(x + lx - 0.12 * u, y + ly - 0.3 * u * h, 0.12 * u, 0, TAU); g.fill();
  }
}

function mouth(g, kind, x, y, u) {
  g.strokeStyle = C.ink; g.fillStyle = C.ink; g.lineWidth = 0.3 * u; g.lineCap = 'round'; g.lineJoin = 'round';
  const P = pts => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(x + a * u, y + b * u) : g.moveTo(x + a * u, y + b * u))); };
  switch (kind) {
    case 'smile': P([[-0.7, -0.1], [-0.25, 0.3], [0.25, 0.3], [0.7, -0.1]]); g.stroke(); return;
    case 'grin': P([[-0.9, -0.2], [0.9, -0.2], [0.5, 0.45], [-0.5, 0.45]]); g.closePath(); g.fill(); return;
    case 'open': g.beginPath(); g.ellipse(x, y + 0.15 * u, 0.6 * u, 0.5 * u, 0, 0, Math.PI); g.closePath(); g.fill(); return;
    case 'O': g.beginPath(); g.ellipse(x, y + 0.1 * u, 0.42 * u, 0.6 * u, 0, 0, TAU); g.fill(); return;
    case 'o': g.beginPath(); g.arc(x, y, 0.25 * u, 0, TAU); g.fill(); return;
    case 'frown': P([[-0.6, 0.3], [-0.2, -0.05], [0.2, -0.05], [0.6, 0.3]]); g.stroke(); return;
    case 'wobble': P([[-0.7, 0.1], [-0.35, -0.1], [0, 0.1], [0.35, -0.1], [0.7, 0.1]]); g.stroke(); return;
    case 'smirk': P([[-0.5, 0.1], [0.3, 0.1], [0.7, -0.2]]); g.stroke(); return;
    case 'flat': P([[-0.55, 0.05], [0.55, 0.05]]); g.stroke(); return;
    default: P([[-0.3, 0.05], [0.3, 0.05]]); g.stroke();   // small
  }
}

function heart(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; g[i ? 'lineTo' : 'moveTo'](x + 16 * Math.pow(Math.sin(a), 3) * r / 16, y - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 16); }
  g.closePath();
}

/** a reaction mark by the head, drawn as shapes (never letters): spark heart sweat ! ? zzz cloud anger steam stars music dots bulb */
function emote(g, kind, x, y, u, k, age) {
  if (!kind || k <= 0.01) return;
  const s = u * ease.outBack(clamp(k)), ink = C.ink;
  g.save(); g.translate(x, y); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = 0.28 * s;
  const bob = Math.sin(age * 5) * 0.15 * s;
  switch (kind) {
    case 'spark': case 'stars': {
      const n = kind === 'stars' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const a = age * 3 + i * TAU / n, cx = n > 1 ? Math.cos(a) * 1.6 * s : 0, cy = n > 1 ? Math.sin(a) * 0.5 * s : bob;
        g.fillStyle = C.light; g.beginPath();
        for (let j = 0; j < 8; j++) { const b = j * Math.PI / 4, r = (j % 2 ? 0.25 : 0.9) * s; g[j ? 'lineTo' : 'moveTo'](cx + Math.cos(b) * r, cy + Math.sin(b) * r); }
        g.closePath(); g.fill(); g.stroke();
      }
      break;
    }
    case 'heart': g.fillStyle = C.red; heart(g, 0, bob, 0.9 * s); g.fill(); g.lineWidth = 0.2 * s; g.stroke(); break;
    case 'sweat': g.fillStyle = '#8EC5E8'; g.beginPath(); g.moveTo(0, -0.9 * s + bob); g.quadraticCurveTo(0.7 * s, 0.1 * s + bob, 0, 0.5 * s + bob); g.quadraticCurveTo(-0.7 * s, 0.1 * s + bob, 0, -0.9 * s + bob); g.fill(); g.lineWidth = 0.18 * s; g.stroke(); break;
    case '!': g.fillStyle = ink; g.beginPath(); g.moveTo(-0.32 * s, -1.4 * s); g.lineTo(0.32 * s, -1.4 * s); g.lineTo(0.15 * s, 0.2 * s); g.lineTo(-0.15 * s, 0.2 * s); g.closePath(); g.fill();
      g.beginPath(); g.arc(0, 0.75 * s, 0.25 * s, 0, TAU); g.fill(); break;
    case '?': g.lineWidth = 0.34 * s; g.beginPath(); g.arc(0, -0.75 * s, 0.6 * s, Math.PI, Math.PI * 2.4); g.quadraticCurveTo(0, -0.1 * s, 0, 0.25 * s); g.stroke();
      g.fillStyle = ink; g.beginPath(); g.arc(0, 0.85 * s, 0.22 * s, 0, TAU); g.fill(); break;
    case 'zzz': for (let i = 0; i < 3; i++) {
      const ph = frac(age * 0.6 + i / 3), z = (0.35 + 0.35 * ph) * s, zx = (0.6 + 1.2 * ph) * s, zy = -ph * 2.6 * s;
      g.globalAlpha = 1 - ph; g.lineWidth = 0.2 * s; g.beginPath(); g.moveTo(zx - z, zy - z); g.lineTo(zx + z, zy - z); g.lineTo(zx - z, zy + z); g.lineTo(zx + z, zy + z); g.stroke();
    } break;
    case 'dots': for (let i = 0; i < 3; i++) { g.fillStyle = ink; g.globalAlpha = 0.3 + 0.7 * ((Math.floor(age * 4) % 3) >= i ? 1 : 0); g.beginPath(); g.arc((i - 1) * 0.6 * s, 0, 0.2 * s, 0, TAU); g.fill(); } break;
    case 'bulb': g.fillStyle = C.light; g.beginPath(); g.arc(0, -0.4 * s, 0.75 * s, 0, TAU); g.fill(); g.stroke(); g.fillStyle = ink; g.fillRect(-0.3 * s, 0.3 * s, 0.6 * s, 0.4 * s); break;
    case 'music': g.fillStyle = ink; g.beginPath(); g.ellipse(-0.3 * s, 0.5 * s + bob, 0.32 * s, 0.24 * s, -0.4, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(0, 0.5 * s + bob); g.lineTo(0, -1 * s + bob); g.lineTo(0.6 * s, -0.7 * s + bob); g.stroke(); break;
    case 'anger': g.strokeStyle = C.red; for (const [a, b] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.beginPath(); g.moveTo(a * 0.2 * s, b * 0.7 * s); g.quadraticCurveTo(a * 0.2 * s, b * 0.2 * s, a * 0.7 * s, b * 0.2 * s); g.stroke(); } break;
    case 'steam': g.strokeStyle = '#9AA3B5'; for (let i = 0; i < 2; i++) { const ph = frac(age * 1.5 + i / 2); g.globalAlpha = 1 - ph; g.beginPath(); for (let j = 0; j <= 8; j++) g[j ? 'lineTo' : 'moveTo']((i - 0.5) * 1.2 * s + Math.sin(j + age * 6) * 0.25 * s, -ph * 2 * s - j * 0.2 * s); g.stroke(); } break;
    case 'cloud': g.fillStyle = '#9AA3B5'; g.beginPath(); for (const [cx, cy, r] of [[-0.6, 0, 0.55], [0, -0.3, 0.7], [0.6, 0, 0.55]]) { g.moveTo(cx * s + r * s, cy * s + bob); g.arc(cx * s, cy * s + bob, r * s, 0, TAU); } g.fill(); break;
  }
  g.restore();
}

const PIP = {
  C, FACE,
  /** Pip standing at (x, y) (between its feet, on the ground), unit u. See the header for the pose fields. */
  draw(g, x, y, u, p = {}, t = 0) {
    const view = p.view || 'front', flip = p.flip ? -1 : 1, sm = clamp(p.smear || 0);
    const side = view === 'side', q = view === 'q', back = view === 'back' || view === 'qback';
    const wk = side ? 0.74 : q || view === 'qback' ? 0.9 : 1;
    const [sx, sy] = ACT.squash(p.sq || 0), air = Math.max(0, -(p.dy || 0));
    const face = FACE[p.mood] || FACE.neutral, eyes = Array.isArray(face[0]) ? face[0] : [face[0], face[0]];
    const col = p.col || C.body, lw = 0.34 * u;
    g.save();
    // shadow stays on the ground and shrinks as Pip leaves it
    g.fillStyle = 'rgba(26,34,51,0.16)'; g.beginPath(); g.ellipse(x + (p.dx || 0) * u, y, 3.6 * u * wk / (1 + 0.15 * air), 0.55 * u / (1 + 0.15 * air), 0, 0, TAU); g.fill();
    g.translate(x + (p.dx || 0) * u, y + (p.dy || 0) * u); g.rotate(p.rot || 0); g.scale(flip * sx * (1 + sm * 0.3), sy);
    g.lineWidth = lw; g.strokeStyle = C.ink; g.lineJoin = 'round'; g.lineCap = 'round';
    // feet: two stubs, stepping with the walk phase
    const ph = p.walk == null ? null : p.walk * Math.PI;
    for (const s of [-1, 1]) {
      const st = ph == null ? 0 : Math.sin(ph + (s > 0 ? Math.PI : 0)), lift = Math.max(0, st) * 0.7 * u, fx = s * 1.7 * u * wk + (ph == null ? 0 : st * 0.8 * u);
      g.fillStyle = s > 0 && (side || q) ? C.dark : col;
      g.beginPath(); g.ellipse(fx, -0.45 * u - lift, 1.05 * u, 0.55 * u, 0, 0, TAU); g.fill(); g.stroke();
    }
    // arms: rounded stubs from the shoulders; the far arm in a side view sits behind the body, darker
    // (in the side view both arms swing at the body's middle, pointing the way Pip faces; the far one is behind)
    const arm = (s, a, far) => {
      const ox = side ? (far ? 0 : 0.5 * u) : s * 3.55 * u * wk, sd = side ? 1 : s;
      const oy = (side ? -3.5 : -5.2) * u, L = 2.7 * u, ex = ox + sd * Math.cos(a) * L, ey = oy - Math.sin(a) * L;
      g.strokeStyle = C.ink; g.lineWidth = 1.25 * u + 2 * lw; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = far ? C.dark : col; g.lineWidth = 1.25 * u; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = lw;
    };
    const aL = p.aL ?? 0.2, aR = p.aR ?? 0.2;
    if (side) arm(-1, aL, true);
    // the sprout: bends against the lean and the bounce (follow-through), plus whatever the scene adds
    const bend = -(p.rot || 0) * 1.8 + (p.sq || 0) * 1.2 + (p.sprout || 0), sx0 = (q ? 0.9 : side ? 1.6 : 0) * u, sy0 = -9.1 * u;
    g.strokeStyle = C.ink; g.lineWidth = lw * 1.1;
    g.beginPath(); g.moveTo(sx0, sy0); g.quadraticCurveTo(sx0 + bend * 1.2 * u, sy0 - 1.2 * u, sx0 + (0.6 + bend * 2) * u, sy0 - 2 * u); g.stroke();
    g.fillStyle = '#7DB35A'; g.beginPath(); g.ellipse(sx0 + (0.6 + bend * 2) * u + 0.55 * u, sy0 - 2 * u, 0.75 * u, 0.36 * u, -0.5 + bend, 0, TAU); g.fill(); g.lineWidth = lw * 0.8; g.stroke();
    // body
    g.lineWidth = lw; g.strokeStyle = C.ink;
    bodyPath(g, u, wk); g.fillStyle = col; g.fill();
    g.save(); bodyPath(g, u, wk); g.clip();
    g.fillStyle = C.dark;                                   // the turned-away side: a darker strip
    if (q) g.fillRect(-4.5 * u, -10 * u, 1.4 * u, 10 * u);
    if (view === 'qback') g.fillRect(-4.5 * u, -10 * u, 6 * u, 10 * u);
    if (view === 'back') { g.globalAlpha = 0.45; g.fillRect(-4.5 * u, -10 * u, 9 * u, 10 * u); g.globalAlpha = 1; }
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(-1.6 * u * wk, -7.4 * u, 0.9 * u, 1.4 * u, -0.4, 0, TAU); g.fill();
    g.restore();
    bodyPath(g, u, wk); g.stroke();
    if (sm > 0.05) {                                       // smear lines on the in-between drawings of a turn
      g.strokeStyle = `rgba(26,34,51,${0.5 * sm})`; g.lineWidth = lw * 0.7;
      for (const yy of [-7, -5, -3]) { g.beginPath(); g.moveTo(-5.5 * u, yy * u); g.lineTo(-7.5 * u, yy * u); g.stroke(); }
    }
    // face (front, 3/4 and side views only)
    if (!back) {
      const fx = q ? 1.1 * u : side ? 1.6 * u : 0, gap = side ? 0 : q ? 1.25 * u : 1.55 * u;
      const bl = BLUSH[p.mood] || 0;
      if (bl) { g.fillStyle = C.blush; g.globalAlpha = 0.45 * bl; for (const s of side ? [1] : [-1, 1]) { g.beginPath(); g.ellipse(fx + s * (gap + 0.8 * u), -4.9 * u, 0.7 * u, 0.4 * u, 0, 0, TAU); g.fill(); } g.globalAlpha = 1; }
      if (side) eye(g, eyes[1], fx + 0.4 * u, -6.4 * u, u, p);
      else { eye(g, eyes[0], fx - gap, -6.4 * u, u, p); eye(g, eyes[1], fx + gap, -6.4 * u, u, p); }
      mouth(g, face[1], fx + (side ? 0.5 * u : 0), -4.6 * u, u * (side ? 0.65 : 1));
    }
    if (side) arm(1, aR, false); else { arm(-1, aL, false); arm(1, aR, false); }
    g.restore();
    // the emote pops by the head (screen space, never mirrored)
    emote(g, p.emote, x + (p.dx || 0) * u + 4.6 * u * flip, y + (p.dy || 0) * u - 10.2 * u * sy, u, p.emoteK ?? 1, p.emoteAge ?? t);
    return { head: [x + (p.dx || 0) * u, y + (p.dy || 0) * u - 6.4 * u * sy] };   // where the face is (for MV.focus)
  },
  emote,
};

// ------------------------------------------------------------------ model sheet: render.py model → out/model-pip.png
const SHEET_U = 21;
const MOODS = ['neutral', 'happy', 'sleepy', 'surprised', 'starstruck', 'nervous', 'smug', 'thinking', 'scared', 'sad', 'angry', 'love'];
MV.model('pip', {
  cell: [300, 400], ground: 0.84, guides: [SHEET_U * 9.2, SHEET_U * 6.4], bg: '#EEF0F4',   // head top, eye line
  rows: [
    { label: 'views', items: ['front', 'q', 'side', 'qback', 'back', 'q (flip)'].map(v => ({ label: v, pose: { view: v.split(' ')[0], flip: v.includes('flip') } })) },
    { label: 'moods', items: MOODS.slice(0, 6).map(m => ({ label: m, pose: t => ({ ...ACT.feel(m, t), emoteK: 1, emoteAge: 0.3 }) })) },
    { label: 'moods', items: MOODS.slice(6).map(m => ({ label: m, pose: t => ({ ...ACT.feel(m, t), emoteK: 1, emoteAge: 0.3 }) })) },
    { label: 'jump · take', items: [
      { label: 'crouch', pose: ACT.jump(0.95, 1, 1.5) }, { label: 'rise', pose: ACT.jump(1.12, 1, 1.5) }, { label: 'top', pose: ACT.jump(1.25, 1, 1.5) },
      { label: 'land', pose: ACT.jump(1.5, 1, 1.5) }, { label: 'take (squash)', pose: { ...ACT.take(0.99, 1), mood: 'surprised' } }, { label: 'take (stretch)', pose: { ...ACT.take(1.04, 1), mood: 'surprised' } }] },
    { label: 'arms · walk', items: [
      { label: 'aL aR 1.3', pose: { aL: 1.3, aR: 1.3, mood: 'happy' } }, { label: 'aL −1 aR 0.6', pose: { aL: -1, aR: 0.6 } },
      { label: 'walk 0', pose: { view: 'side', walk: 0 } }, { label: 'walk .5', pose: { view: 'side', walk: 0.5 } },
      { label: 'walk 1', pose: { view: 'side', walk: 1 } }, { label: 'turn smear', pose: { view: 'q', smear: 0.55 } }] },
  ],
  draw(g, x, y, pose, t) { PIP.draw(g, x, y, SHEET_U, pose, t); },
});

G.PIP = PIP;
})(window);
