// mv-kit — camera kit: the camera language every project needs, in one place. Add "camera" to project.kits.
//
// Taken from projects/pdoom-bolt, where the user had to ask for each of these after the first cut (a weaker model
// does not think of them by itself, so here they are on by default):
//
//  ① push     No shot is truly still: every timeline entry creeps in slowly over its length (2.6–5.2 % by duration,
//             plus a few px of drift). entry.push: 0 turns it off for that entry, entry.push: 0.08 pushes harder;
//             project.camera.push: false turns the default off. Entries that dissolve into / out of a neighbour are
//             not pushed (the zoom would jump at the dissolve's end).
//  ② insert   Punch in on a detail and FOLLOW it: entry.insert = { at, dur, amt, x, y, ease }. Without x/y the point is
//             the scene's MV.focus(x, y) of this frame, so a moving subject (pen tip, flame, the growing edge) stays
//             pinned where it is on screen while everything around it streams past.
//  ③ warp     2D → 3D: the whole flat picture tilts into depth like a board turning on a stand.
//             entry.warp = { at, dur, from, to, pitch, dist, bg } — from / to are yaw in radians (0 = facing us,
//             0.6 ≈ 34°). Good at a change of register: a drawing stands up and turns away.
//  ④ keep     For the scene itself: CAM.keep(points, { anchor, safe, min }) returns the scale s ≤ 1 to draw the world
//             at (about `anchor`) so that every point stays inside the safe area. The fix for "the line runs out of
//             the picture": s follows the point, so the pull-back is exactly as fast as the subject.
//                 const s = CAM.keep([[tip.x, tip.y]], { anchor: [AX, AY] });
//                 g.translate(AX, AY); g.scale(s, s); g.translate(-AX, -AY);   // then draw the world
//             Report the subject with MV.focus too, so `render.py qa` can check it never leaves the frame.
//
// Zooms never push what the scene marked with MV.keep(g, x, y, w, h) (a lyric line) out of the frame: the camera
// zooms less instead. CAM.warpPlane(g, canvas, o) is exported for scenes that want the tilt on their own layer.
(function (G) {
'use strict';
const MV = G.MV;

const CAM = {
  /** push amount for an entry of `dur` seconds (fraction of the frame by the end of the shot) */
  pushFor(dur) { return clamp(0.020 + 0.0045 * dur, 0.026, 0.052); },

  /**
   * Scale s (≤ 1) about o.anchor so that every point lands inside o.safe ([x0, y0, x1, y1], default the frame minus
   * 7 % margins). o.min is the smallest scale allowed (0.25). Deterministic: depends only on the points given.
   */
  keep(points, o) {
    o = o || {};
    const [ax, ay] = o.anchor || [W / 2, H / 2];
    const sf = o.safe || [0.07 * W, 0.07 * H, 0.93 * W, 0.93 * H];
    let s = 1;
    for (const p of points) {
      const dx = p[0] - ax, dy = p[1] - ay;
      if (dx > 0 && ax + dx > sf[2]) s = Math.min(s, (sf[2] - ax) / dx);
      if (dx < 0 && ax + dx < sf[0]) s = Math.min(s, (sf[0] - ax) / dx);
      if (dy > 0 && ay + dy > sf[3]) s = Math.min(s, (sf[3] - ay) / dy);
      if (dy < 0 && ay + dy < sf[1]) s = Math.min(s, (sf[1] - ay) / dy);
    }
    return clamp(s, o.min == null ? 0.25 : o.min, 1);
  },

  /** redraw canvas `src` into g as a board turned by yaw (and pitch) in perspective; o.bg fills behind it */
  warpPlane(g, src, o) {
    const [w, h] = MV.sizeOf(src);                       // design units (an output-scale layer reports its design size)
    if (!WARPBUF || WARPBUF.width !== src.width || WARPBUF.height !== src.height) WARPBUF = src.__k ? mkHi(w, h) : mk(w, h);
    const b = WARPBUF.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'copy';
    b.drawImage(src, 0, 0);
    b.globalCompositeOperation = 'source-over';
    const yaw = o.yaw || 0, pitch = o.pitch || 0, dist = Math.max(0.35, o.dist == null ? 1.6 : o.dist);
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cx0 = w / 2, cy0 = h / 2 + (o.dy || 0);
    const P = x => { const zz = dist + (x / w) * sy; return { x: (x * cy) / Math.max(0.05, zz) * dist, s: dist / Math.max(0.05, zz) }; };
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = o.bg || '#000'; g.fillRect(0, 0, w, h);
    const N = o.strips || 110, sw = w / N;
    if (o.shadow !== false) {           // the board's shadow: just enough to see it has left the page
      g.save(); g.globalAlpha = 0.16 * Math.min(1, Math.abs(sy) * 4 + Math.abs(sp) * 3);
      g.fillStyle = '#000';
      const a = P(-w / 2), c = P(w / 2);
      g.fillRect(cx0 + a.x + 26, cy0 - h * cp / 2 + 34, (cx0 + c.x) - (cx0 + a.x), h * cp);
      g.restore();
    }
    for (let i = 0; i < N; i++) {
      const x0 = i * sw - cx0, x1 = (i + 1) * sw - cx0;
      const p0 = P(x0), p1 = P(x1);
      const dx = cx0 + p0.x, dw = (cx0 + p1.x) - dx;
      if (dw <= 0.01) continue;
      const s = (p0.s + p1.s) / 2, dh = h * cp * s, dy = cy0 - dh / 2 + (o.shiftY || 0) * s;
      g.drawImage(WARPBUF, i * sw, 0, sw + 0.6, h, dx, dy, dw + 0.6, dh);
    }
    g.restore();
  },
};
let WARPBUF = null;

/** the largest zoom z' ≤ z about (fx, fy) that keeps every MV.keep box at least `pad` px inside the frame */
function safeZoom(z, fx, fy, pad) {
  const K = MV.frameKeep || [];
  if (!K.length || z <= 1) return z;
  const lim = (p, f, lo, hi) => {
    const d = p - f;
    if (Math.abs(d) < 1e-6) return Infinity;
    return d > 0 ? (hi - p) / d + 1 : (lo - p) / d + 1;
  };
  let zm = z;
  for (const b of K) {
    if (b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > H) continue;            // wholly off the picture: nothing to keep
    // a box already closer to an edge than pad may not be pushed any further out than it already is: on that side
    // its own position is the limit (the zoom stops rather than carry a lyric off the frame)
    const x0 = Math.min(pad, b[0]), x1 = Math.max(W - pad, b[2]), y0 = Math.min(pad, b[1]), y1 = Math.max(H - pad, b[3]);
    zm = Math.min(zm, lim(b[0], fx, x0, x1), lim(b[2], fx, x0, x1), lim(b[1], fy, y0, y1), lim(b[3], fy, y0, y1));
  }
  return clamp(zm, 1, z);
}

MV.postFilter(function (src, q, t) {
  const act = MV.activeAt(t);
  if (!act.length) return;
  const e = act[act.length - 1], E = MV.entries, P = MV.project.camera || {};
  const dur = Math.max(0.2, e.to - e.from);
  const alone = !e.fadeIn && !E.some(o => o !== e && o.from < e.to && o.to > e.from);

  // ① push
  let z = 1;
  const amt = e.push != null ? e.push : P.push === false ? 0 : typeof P.push === 'number' ? P.push : CAM.pushFor(dur);
  if (alone && amt > 0) z *= 1 + amt * clamp((t - e.from) / dur);

  // ② insert: zoom in on a point and keep that point where it is on screen
  const ins = e.insert;
  let F = null;
  if (ins && t >= ins.at) {
    const k = prog(t, ins.at, ins.at + (ins.dur == null ? 1.1 : ins.dur), ins.ease || ease.inOutCubic);
    z *= 1 + (ins.amt == null ? 0.35 : ins.amt) * k;
    if (ins.x != null) F = { x: ins.x, y: ins.y };
    else {
      const mine = (MV.frameFocus || []).filter(f => f.entry === e);
      if (mine.length) F = mine[mine.length - 1];
    }
  }

  // ③ warp
  const wp = e.warp;
  if (wp) {
    const k = prog(t, wp.at, wp.at + (wp.dur == null ? 1.4 : wp.dur), wp.ease || ease.inOutCubic);
    const yaw = lerp(wp.from == null ? 0 : wp.from, wp.to == null ? 0 : wp.to, k);
    if (Math.abs(yaw) > 0.001 || wp.force) {
      CAM.warpPlane(src.getContext('2d'), src, { yaw, pitch: wp.pitch || 0, dist: wp.dist, bg: wp.bg || MV.project.background, dy: wp.dy, strips: wp.strips, shadow: wp.shadow });
      q.remapped = true;                 // render.py qa: this frame's text is not where it was drawn
    }
  }

  const fx = F ? F.x : W / 2, fy = F ? F.y : H / 2;
  // keep MV.keep boxes as far from the edge as qa wants lyrics (project.qa.margin, 96 px by default)
  if (z > 1) z = safeZoom(z, fx, fy, (P.keepPad != null ? P.keepPad : (MV.project.qa && MV.project.qa.margin) || 96) + 10);   // + the drift
  const ang = hash(Math.round(e.from * 10), 17, 3) * TAU, drift = alone && amt > 0 ? clamp((t - e.from) / dur) : 0;
  const zs = q.zoom || 1, Z = zs * z;
  const px = F ? -(Z - 1) * (fx - W / 2) : 0, py = F ? -(Z - 1) * (fy - H / 2) : 0;
  q.zoom = Z;
  const pan = Array.isArray(q.pan) ? q.pan : [0, 0];
  q.pan = [pan[0] + px + Math.cos(ang) * 7 * drift, pan[1] + py + Math.sin(ang) * 4 * drift];
});

G.CAM = CAM;
})(window);
