// pdoom-print — the film's shared language on top of kits/print.js: typed lyrics, the running page header,
// the P(doom) dial, and the few drawings that come back (a person, an eye, a 3D surface rasteriser).
// Everything here is a pure function of the frame (f.t / f.tq). Pictures are painted in sheet px into S.g.
const PP = (() => {
  const up = s => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/—/g, '-').toUpperCase();
  const bare = s => up(s).replace(/[^A-Z0-9()']/g, '');

  // ---------------------------------------------------------------- P(doom): the number the film keeps raising
  // 0.02 at the start; each hook ("I'm upping my P(doom)") ratchets it on the word P(doom); 1.00 at the run-out
  const HOOKS = [[23.6, 0.10], [59.96, 0.35], [96.32, 0.70], [125.4, 0.99], [146.0, 1.0]];
  function pdoom(t) {
    let v = 0.02;
    for (const [at, val] of HOOKS) if (t >= at) v = lerp(v, val, ease.outCubic(clamp((t - at) / 0.35)));
    return v;
  }
  const fmt = (v, n = 2) => v.toFixed(n);
  const clock = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`; };

  /** The running header every page carries: program, page number, song clock, P(doom). Row 1 of the text grid. */
  function header(S, f, page, o = {}) {
    const row = o.row ?? 1, ink = o.ink ?? 0.85, now = true;
    S.put(4, row, `AGI.EXE   RUN 0451   PAGE ${String(page).padStart(3, '0')}`, { ink, now });
    const right = `T+${clock(f.t)}   P(DOOM)=${fmt(pdoom(f.t))}`;
    S.put(S.tcols - 4 - right.length, row, right, { ink, now, red: pdoom(f.t) >= 0.7 });
  }

  // ---------------------------------------------------------------- lyrics: typed onto the paper as they are sung
  /**
   * Lay a lyric line out on the text grid: words wrapped at `width` columns of x-expanded print. Returns
   * [{w, col, row, text}] (row = 0-based printed line within the block) and the row count.
   */
  function layout(ln, x, width, align) {
    const max = Math.max(4, Math.floor(width / x)), rows = [[]];
    let used = 0;
    ln.words.forEach(w => {
      const txt = up(w.w), need = (used ? 1 : 0) + txt.length;
      if (used && used + need > max) { rows.push([]); used = 0; }
      rows[rows.length - 1].push({ w, text: txt, at: used + (used ? 1 : 0) }); used += (used ? 1 : 0) + txt.length;
    });
    const out = [];
    rows.forEach((r, ri) => {
      const len = r.length ? r[r.length - 1].at + r[r.length - 1].text.length : 0;
      const shift = align === 'center' ? -Math.round(len * x / 2) : align === 'right' ? -len * x : 0;
      r.forEach(it => out.push({ ...it, row: ri, col: shift + it.at * x }));
    });
    return { items: out, rows: rows.length };
  }
  /**
   * Type one lyric line at (col, row) in x-expanded print. Each word is struck when it is sung: its characters
   * one after another from word.start, ≤ 28 ms apart and never past the word's end. o.red: words in red (or true
   * for the whole line); o.strike; o.width (columns, default to the right margin); o.align 'left' | 'center' |
   * 'right' (col is then the centre / right edge); o.prefix ('> ' typed before the first word, with it).
   * Returns the number of grid rows the block takes.
   */
  function lyric(S, f, ln, col, row, o = {}) {
    if (typeof ln === 'string') ln = f.lyrics.get(ln, o.nth || 0);
    const x = o.x || 3, xh = o.xh || x, width = o.width ?? (S.tcols - col - 4);
    const L = layout(ln, x, width, o.align), red = o.red === true ? null : new Set((o.red || []).map(bare));
    const t = f.t;
    if (o.prefix && t >= ln.words[0].start) S.put(col - o.prefix.length * x, row, o.prefix, { xw: x, xh, ink: 0.9, now: true });
    for (const it of L.items) {
      const w = it.w; if (t < w.start) continue;
      const n = it.text.length, dt = Math.min(0.028, Math.max(0.001, (w.end - w.start) * 0.8) / n);
      const isRed = o.red === true || (red && red.has(bare(w.w)));
      for (let k = 0; k < n; k++) {
        const tk = w.start + k * dt; if (t < tk) break;
        const ink = 0.72 + 0.28 * clamp((t - tk) / 0.05);
        S.put(col + it.col + k * x, row + it.row * xh, it.text[k], { xw: x, xh, red: isRed, strike: o.strike || 1, ink, now: true });
      }
    }
    return L.rows * xh;
  }
  /**
   * Type a string (not a lyric) from time t0: characters left to right dt apart (o.dt, 0.012 s), or with o.chain
   * scattered over o.dur seconds the way a chain printer fills a line. o.x / o.xw / o.xh, o.red, o.ink, o.strike.
   * Returns the time the last character lands.
   */
  function type(S, f, col, row, str, t0, o = {}) {
    const n = str.length, xw = o.xw || o.x || 1, dt = o.dt ?? 0.012;
    for (let k = 0; k < n; k++) {
      const tk = o.chain ? t0 + hash(k, row, col) * (o.dur ?? 0.15) : t0 + k * dt;
      if (f.t < tk || str[k] === ' ') continue;
      S.put(col + k * xw, row, str[k], { ...o, now: true, ink: (o.ink ?? 1) * (0.75 + 0.25 * clamp((f.t - tk) / 0.05)) });
    }
    return o.chain ? t0 + (o.dur ?? 0.15) : t0 + n * dt;
  }
  /** Several lines stacked from (col, row), o.gap rows between them (default 1). Returns the next free row. */
  function lyrics(S, f, qs, col, row, o = {}) {
    let r = row;
    qs.forEach((q, i) => {
      const ln = typeof q === 'string' ? f.lyrics.get(q) : q;
      const oo = Array.isArray(o.each) ? { ...o, ...o.each[i] } : o;
      r += lyric(S, f, ln, col, r, oo) + (o.gap ?? 1);
    });
    return r;
  }
  /** Rows a line would take (for placing blocks before they are typed). */
  function rowsOf(f, q, x = 3, width = 120) { const ln = typeof q === 'string' ? f.lyrics.get(q) : q; return layout(ln, x, width).rows * x; }
  /** Time of the nth word of the line containing q. */
  const word = (f, q, j, nth = 0) => f.lyrics.get(q, nth).words[j].start;

  // ---------------------------------------------------------------- drawings
  /**
   * A person, as a printer would draw one: round head, thick limbs with round ends. (x, y) = feet, h = height.
   * o.pose: 'stand' | 'kneel' | 'sit' | 'hang' (arms up) | 'reach' (one arm out) | 'walk'; o.phase for walk;
   * o.fill colour (default ink). Returns the head centre.
   */
  function person(g, x, y, h, o = {}) {
    // proportions for a silhouette that survives being printed in characters: slim limbs held away from the body
    const u = h / 8, col = o.fill || '#000', pose = o.pose || 'stand', ph = o.phase || 0, LW = 0.62 * u, AW = 0.5 * u;
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    const limb = (pts, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); };
    let hip = [x, y - 3.9 * u], neck = [x, y - 6.5 * u];
    const sw = Math.sin(ph) * 1.0 * u;
    if (pose === 'kneel') { hip = [x, y - 2.5 * u]; neck = [x + 0.5 * u, y - 5.1 * u]; limb([hip, [x + 1.6 * u, y - 1.1 * u], [x + 1.5 * u, y]], LW); limb([hip, [x - 1.0 * u, y - 0.15 * u], [x - 2.7 * u, y]], LW); }
    else if (pose === 'sit') { hip = [x, y - 2.3 * u]; neck = [x - 0.15 * u, y - 4.9 * u]; limb([hip, [x + 2.0 * u, y - 2.3 * u], [x + 2.0 * u, y]], LW); }
    else if (pose === 'walk') { limb([hip, [x + sw, y - 2 * u], [x + 1.6 * sw, y]], LW); limb([hip, [x - sw, y - 2 * u], [x - 1.6 * sw, y]], LW); }
    else { limb([hip, [x - 0.75 * u, y - 2 * u], [x - 0.95 * u, y]], LW); limb([hip, [x + 0.75 * u, y - 2 * u], [x + 0.95 * u, y]], LW); }
    // torso: a tapered wedge, wider at the shoulders
    const dx = neck[0] - hip[0], dy = neck[1] - hip[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    g.beginPath(); g.moveTo(hip[0] + nx * 0.55 * u, hip[1] + ny * 0.55 * u); g.lineTo(neck[0] + nx * 0.85 * u, neck[1] + ny * 0.85 * u);
    g.lineTo(neck[0] - nx * 0.85 * u, neck[1] - ny * 0.85 * u); g.lineTo(hip[0] - nx * 0.55 * u, hip[1] - ny * 0.55 * u); g.closePath(); g.fill();
    const sh = [neck[0], neck[1] + 0.3 * u], shl = [sh[0] - 0.75 * u, sh[1]], shr = [sh[0] + 0.75 * u, sh[1]];
    if (pose === 'hang') { limb([shl, [shl[0] - 0.8 * u, shl[1] - 1.7 * u], [shl[0] - 0.5 * u, shl[1] - 3.3 * u]], AW); limb([shr, [shr[0] + 0.8 * u, shr[1] - 1.7 * u], [shr[0] + 0.5 * u, shr[1] - 3.3 * u]], AW); }
    else if (pose === 'reach') { limb([shr, [shr[0] + 1.6 * u, shr[1] - 0.7 * u], [shr[0] + 3.0 * u, shr[1] - 1.5 * u]], AW); limb([shl, [shl[0] - 0.6 * u, shl[1] + 1.6 * u], [shl[0] - 0.7 * u, shl[1] + 3.0 * u]], AW); }
    else if (pose === 'kneel') { limb([shr, [shr[0] + 1.3 * u, shr[1] - 0.9 * u], [shr[0] + 1.2 * u, shr[1] - 2.3 * u]], AW); limb([shl, [shl[0] + 0.9 * u, shl[1] - 1.0 * u], [shl[0] + 0.9 * u, shl[1] - 2.4 * u]], AW); }
    else if (pose === 'sit') { limb([shr, [shr[0] + 1.2 * u, shr[1] + 1.3 * u], [shr[0] + 2.4 * u, shr[1] + 1.5 * u]], AW); limb([shl, [shl[0] + 0.6 * u, shl[1] + 1.7 * u], [shl[0] + 1.9 * u, shl[1] + 2.0 * u]], AW); }
    else { limb([shl, [shl[0] - 0.55 * u - sw * 0.5, shl[1] + 1.6 * u], [shl[0] - 0.6 * u - sw * 0.7, shl[1] + 3.0 * u]], AW); limb([shr, [shr[0] + 0.55 * u + sw * 0.5, shr[1] + 1.6 * u], [shr[0] + 0.6 * u + sw * 0.7, shr[1] + 3.0 * u]], AW); }
    const head = [neck[0] + (pose === 'sit' ? 0.25 * u : 0), neck[1] - 1.1 * u];
    g.beginPath(); g.arc(head[0], head[1], 0.9 * u, 0, TAU); g.fill();
    g.restore();
    return head;
  }

  /**
   * The eye (the film's only face): almond lids, an iris of radial traces like a circuit / camera aperture, a pupil.
   * o.open 0..1(+), o.look [dx, dy] (fraction of the iris radius), o.pupil (fraction of iris, .38), o.red (iris in
   * red ink), o.lash (lashes), o.tick (seed for the traces' pads). w = eye width.
   */
  function eye(g, cx, cy, w, o = {}) {
    const open = clamp(o.open ?? 1, 0, 1.3), hh = w * 0.34 * open, ir = w * 0.2, lk = o.look || [0, 0];
    const ix = cx + lk[0] * ir * 0.9, iy = cy + lk[1] * ir * 0.45 + hh * 0.08;
    const ink = o.red ? '#f00' : '#000';
    const upper = () => { g.moveTo(cx - w / 2, cy); g.bezierCurveTo(cx - w * 0.22, cy - hh * 1.25, cx + w * 0.22, cy - hh * 1.25, cx + w / 2, cy); };
    const lower = () => { g.bezierCurveTo(cx + w * 0.22, cy + hh * 1.0, cx - w * 0.22, cy + hh * 1.0, cx - w / 2, cy); };
    g.save();
    if (open > 0.03) {
      g.save(); g.beginPath(); upper(); lower(); g.closePath(); g.clip();
      // iris as line art (it prints cleanly): a heavy ring, radial traces with pads, a solid pupil, one catchlight
      g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
      const n = o.traces || 20, sp = o.spin || 0, pr = ir * (o.pupil ?? 0.38);
      if (o.tone) { g.fillStyle = o.red ? '#ffb0b0' : '#c8c8c8'; g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fill(); g.fillStyle = ink; }
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU + sp, r0 = pr * 1.12, r1 = ir * (0.62 + 0.26 * hash(i, 3)), jog = (hash(i, 5) - 0.5) * 0.3, a1 = a0 + jog, rm = lerp(r0, r1, 0.45);
        g.lineWidth = o.lw || w * 0.0045;
        g.beginPath(); g.moveTo(ix + Math.cos(a0) * r0, iy + Math.sin(a0) * r0); g.lineTo(ix + Math.cos(a0) * rm, iy + Math.sin(a0) * rm);
        g.lineTo(ix + Math.cos(a1) * rm * 1.12, iy + Math.sin(a1) * rm * 1.12); g.lineTo(ix + Math.cos(a1) * r1, iy + Math.sin(a1) * r1); g.stroke();
        g.beginPath(); g.arc(ix + Math.cos(a1) * r1, iy + Math.sin(a1) * r1, w * 0.009, 0, TAU); g.fill();
      }
      g.lineWidth = w * 0.016; g.beginPath(); g.arc(ix, iy, ir * 0.97, 0, TAU); g.stroke();
      g.lineWidth = w * 0.004; g.beginPath(); g.arc(ix, iy, ir * 0.86, 0, TAU); g.stroke();
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(ix, iy, pr * (1 - 0.72 * (o.slit || 0)), pr * (1 + 0.5 * (o.slit || 0)), 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ix - pr * 0.42 - ir * 0.1 * (o.slit || 0), iy - pr * 0.45, pr * 0.3, 0, TAU); g.fill();
      g.restore();
    }
    // lids, lashes, crease
    g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = w * 0.026; g.beginPath(); upper(); g.stroke();
    g.lineWidth = w * 0.014; g.beginPath(); g.moveTo(cx + w / 2, cy); lower(); g.stroke();
    if (o.lash !== false) {
      g.lineWidth = w * 0.011;
      for (let i = 1; i < 12; i++) {
        const s = i / 12, u1 = 1 - s;
        const bx = u1 * u1 * u1 * (cx - w / 2) + 3 * u1 * u1 * s * (cx - w * 0.22) + 3 * u1 * s * s * (cx + w * 0.22) + s * s * s * (cx + w / 2);
        const by = u1 * u1 * u1 * cy + 3 * u1 * u1 * s * (cy - hh * 1.25) + 3 * u1 * s * s * (cy - hh * 1.25) + s * s * s * cy;
        const dx = (s - 0.5) * w * 0.1, len = w * (0.04 + 0.025 * Math.sin(s * Math.PI));
        g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + dx * 0.3, by - len * 0.7, bx + dx, by - len); g.stroke();
      }
    }
    g.lineWidth = w * 0.01; g.beginPath(); g.moveTo(cx - w * 0.34, cy - hh * 1.0 - w * 0.05);
    g.bezierCurveTo(cx - w * 0.14, cy - hh * 1.3 - w * 0.08, cx + w * 0.14, cy - hh * 1.3 - w * 0.08, cx + w * 0.36, cy - hh * 0.95 - w * 0.05); g.stroke();
    g.restore();
    return [ix, iy, ir];
  }

  // ---------------------------------------------------------------- a tiny z-buffered rasteriser for 3D surfaces
  let RB = null;
  /**
   * Render a parametric surface to a grey canvas (shade: lit = paper, shadow = ink), transparent around it.
   * fn(u, v) → [x, y, z] in model space; rot [rx, ry, rz]; w × h output px; scale = px per model unit;
   * o.nu, o.nv (samples), o.light [x, y, z], o.amb (ambient .12), o.dist (camera distance for perspective, 0 = ortho),
   * o.red (paint in red ink). Returns the canvas.
   */
  function surface(w, h, fn, rot, scale, o = {}) {
    if (!RB || RB.w !== w || RB.h !== h) { RB = { w, h, cv: mk(w, h), z: new Float32Array(w * h), s: new Float32Array(w * h) }; RB.g = RB.cv.getContext('2d'); RB.im = RB.g.createImageData(w, h); }
    const Z = RB.z, Sh = RB.s; Z.fill(-1e9); Sh.fill(-1);
    const [rx, ry, rz] = rot, cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    const R = p => { let [x, y, z] = p; let t = y * cx - z * sx; z = y * sx + z * cx; y = t; t = x * cy + z * sy; z = -x * sy + z * cy; x = t; t = x * cz - y * sz; y = x * sz + y * cz; x = t; return [x, y, z]; };
    const L = o.light || [-0.5, -0.7, 0.6], ll = Math.hypot(...L), Ln = L.map(v => v / ll), amb = o.amb ?? 0.12, dist = o.dist || 0;
    const nu = o.nu || 220, nv = o.nv || 110, eps = 1e-3, rad = o.splat || 1;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const u = i / nu, v = j / nv, p = fn(u, v), pu = fn(u + eps, v), pv = fn(u, v + eps);
      const du = [pu[0] - p[0], pu[1] - p[1], pu[2] - p[2]], dv = [pv[0] - p[0], pv[1] - p[1], pv[2] - p[2]];
      let n = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
      const nl = Math.hypot(...n) || 1; n = R(n.map(q => q / nl));
      const q = R(p), k = dist ? dist / (dist - q[2]) : 1;
      const X = Math.round(w / 2 + q[0] * scale * k), Y = Math.round(h / 2 + q[1] * scale * k);
      let d = n[0] * Ln[0] + n[1] * Ln[1] + n[2] * Ln[2]; if (n[2] < 0) d = -d * 0.35;
      const sh = clamp(amb + (1 - amb) * Math.max(0, d));
      for (let yy = Y - rad + 1; yy <= Y + rad - 1 || yy === Y; yy++) for (let xx = X - rad + 1; xx <= X + rad - 1 || xx === X; xx++) {
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const idx = yy * w + xx; if (q[2] > Z[idx]) { Z[idx] = q[2]; Sh[idx] = sh; }
      }
    }
    const d = RB.im.data;
    for (let i = 0; i < w * h; i++) {
      const s = Sh[i], o4 = i * 4;
      if (s < 0) { d[o4 + 3] = 0; continue; }
      const v = Math.round(255 * Math.pow(s, o.gamma || 0.9));
      if (o.red) { d[o4] = 255; d[o4 + 1] = v; d[o4 + 2] = v; } else { d[o4] = d[o4 + 1] = d[o4 + 2] = v; }
      d[o4 + 3] = 255;
    }
    RB.g.putImageData(RB.im, 0, 0);
    return RB.cv;
  }

  // ---------------------------------------------------------------- warp: draw a picture, then lay it into S.g in
  // horizontal strips shifted by a sine (the shrooms). draw(ctx) paints in sheet px like S.g; amp in sheet px.
  let WARP = null;
  function warp(S, draw, amp, phase, freq = 0.012) {
    if (!WARP || WARP.width !== S.src.width || WARP.height !== S.src.height) WARP = mk(S.src.width, S.src.height);
    const w = WARP.getContext('2d');
    w.setTransform(1, 0, 0, 1, 0, 0); w.clearRect(0, 0, WARP.width, WARP.height);
    w.setTransform(S.SX / S.cw, 0, 0, S.SY / S.ch, 0, 0);
    draw(w);
    const g = S.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const sx = S.SX / S.cw, sy = S.SY / S.ch, step = 3;
    for (let y = 0; y < WARP.height; y += step) {
      const yy = y / sy, dx = amp * Math.sin(yy * freq + phase) * sx;
      g.drawImage(WARP, 0, y, WARP.width, step, dx, y, WARP.width, step);
    }
    g.restore();
  }

  // ---------------------------------------------------------------- characters as particles
  let SCR = null;
  /** The text-grid cells a painted shape covers, filled with chars (string cycled / fn): [{c, r, ch, red}]. Build once in init. */
  function cellsOf(draw, chars, o = {}) {
    if (!SCR) SCR = prSheet({ pic: false });
    SCR.clear(); SCR.stencil(draw, chars, o);
    return SCR.cells();
  }

  /**
   * A rubber stamp in the picture: a rotated double frame round a word, in red ink, landing with a squash.
   * k = 0..1 landing progress (scale 1.6 -> 1), size = letter height px.
   */
  function stamp(g, word, x, y, size, rot, k = 1, o = {}) {
    if (k <= 0) return;
    const s = lerp(1.6, 1, ease.outCubic(k)), col = o.color || '#ff0000';
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.font = `700 ${size}px "${PR.FONT}"`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(word).width + size * 0.9, h = size * 1.5;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = size * 0.1; g.strokeRect(-w / 2, -h / 2, w, h);
    g.lineWidth = size * 0.04; g.strokeRect(-w / 2 + size * 0.16, -h / 2 + size * 0.16, w - size * 0.32, h - size * 0.32);
    g.fillText(word, 0, size * 0.04);
    g.restore();
  }

  /**
   * A stamp that prints cleanly: BANNER letters (each made of itself) inside a double red frame on the text grid,
   * centred on (col, row). Shown from t0 with a hard landing (the scene adds the shake). Returns true once down.
   */
  function stampText(S, f, word, col, row, h, t0) {
    if (f.t < t0) return false;
    const wd = Math.round(word.length * h * 1.62 * 0.6 * S.tch / S.tcw + (word.length - 1) * 0.8), cl = Math.round(col - wd / 2);
    S.erase(cl - 3, row - 2, cl + wd + 2, row + h + 2);
    const [c0, c1] = S.banner(word, col, row, { h, align: 'center', red: true, strike: 2, track: 0.8 });
    S.box(c0 - 3, row - 2, c1 + 2, row + h + 2, { red: true, strike: 2, h: '=', v: '#', corner: '#', knock: false });
    S.box(c0 - 1, row - 1, c1, row + h + 1, { red: true, knock: false });
    return true;
  }

  // ---------------------------------------------------------------- small things
  /** A row of characters across the text grid (rules, tear-offs). */
  const rule = (S, row, ch = '-', o = {}) => S.put(o.c0 ?? 2, row, ch.repeat((o.c1 ?? S.tcols - 3) - (o.c0 ?? 2) + 1), o);
  /** Paper slew between shots: an eased camera y offset (px) over [t0, t1]. */
  const slew = (t, t0, t1, dist, e = ease.inOutCubic) => dist * e(clamp((t - t0) / (t1 - t0)));
  /** Printer judder: small camera shake on the kick, scaled by the section's energy. */
  const judder = (f, amt = 1) => amt * (3 + 9 * (f.section ? f.section.energy : 0.5)) * f.a.kick;
  /** A lyric slip dropping in under the lens just before its first word: 1 = still below the frame, 0 = in place. */
  const drop = (t, t0) => 1 - ease.outCubic(clamp((t - t0 + 0.12) / 0.16));
  /** Chain-printer reveal: y (sheet px) printed after t0 at `lps` lines per second of the text grid. */
  const reveal = (S, t, t0, lps) => (t < t0 ? -1 : (t - t0) * lps * S.tch);

  return { up, bare, pdoom, fmt, clock, header, layout, lyric, lyrics, type, warp, cellsOf, drop, stamp, stampText, rowsOf, word, person, eye, surface, rule, slew, judder, reveal };
})();
