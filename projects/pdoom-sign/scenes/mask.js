// 09 mask — 29.79–32.97 · P · #10 "See through the shoggoth's lies,"
//   picture: a big machine (s 2.0 — see the note below) wearing a smiley sticker over its eye; the sticker's lower
//     corner curls up further all through the shot and 34 px ink tentacles keep coming out from under it — one more
//     on every beat (the tentacles are drawn before the sticker, so their roots are hidden under it; flat ink, no
//     glow). Beside the machine stands a small warning triangle with the plate "MASK MAY SLIP" (mono, SG.plate + BOX).
//   camera: insert at 'lies,' − 0.4 s (1.0 s, 0.3). cut: hard.
//   lyric: `redact` L, low zone — laid out and redacted on the screen layer (MV.overlay; see the note below).
//   focus: the corner of the sticker that is lifting.
MV.scene('mask', {
  // The machine sits 66 px above the shot list's centre and at s 2.0 instead of 2.2: the lyric is a screen-layer
  // line now, so the insert punches in the full 0.3 (round 1's keep box clamped it) and the box's lower border was
  // dragged up across the first row of the redacted line — "through the shoggoth's" lost its top third to the black
  // frame (ink on ink). At 264 / s 2.0 the border's screen bottom lands ~35 px above the words' ink top at the end
  // of the punch, and the machine still fills the upper half of the frame.
  MX: 1080, MY: 264, MS: 2.0,
  /** the middle of the lifted corner of the sticker, in picture px */
  corner(rot, peel) {
    const a = rot * Math.PI / 180, w = 75 * this.MS * (1 - 0.5 * peel);
    return [this.MX + (w * Math.cos(a) - w * Math.sin(a)), this.MY + (w * Math.sin(a) + w * Math.cos(a))];
  },
  render(g, f) {
    const C = SG.C, MX = this.MX, MY = this.MY;
    SG.bg(g, 'P');
    const peel = clamp(0.12 + 0.44 * ease.outCubic(clamp((f.t - f.from - 0.2) / 1.9)) + 0.05 * f.a.kick);
    const corner = this.corner(-8, peel);
    SG.machine(g, MX, MY, this.MS, { mask: false, gaze: [0.25, 0.1], focus: false });
    // the tentacles: one more on every beat since the shot began. They wave up and out from under the lifted corner:
    // the insert really punches in 0.3 now that the lyric is on the screen layer, and a tentacle hanging down from
    // the corner would be dragged under the redacted line (ink on ink — qa: lyric-covered). The corner sits at
    // y ≈ 355, the line's first row ink top at 563: the fan ends at most ≈ 490 before the camera, ≈ 535 on screen.
    const bs = [];
    for (let i = 0; i < f.audio.beats.length; i++) { const b = f.audio.beats[i]; if (b >= f.from && b < f.to) bs.push(b); }
    for (let i = 0; i < Math.min(9, bs.length); i++) {
      const born = Math.max(f.from + 0.02, bs[i]);
      if (f.t < born) break;
      const k = ease.outCubic(clamp((f.t - born) / 0.5));
      const a0 = (-104 + i * 13 + 18 * (hash(i, 11) - 0.5)) * Math.PI / 180;
      const down = Math.max(0, Math.sin(a0));                       // the few that point down are kept short
      const len = (210 + 150 * hash(i, 5)) * (1 - 0.55 * down);
      const wob = noise1(f.tq * 0.8 + i * 4.1, 9) * 45 * (1 - 0.4 * down);
      const dx = Math.cos(a0), dy = Math.sin(a0);
      const pts = bez3(corner,
                       [corner[0] + dx * len * 0.40, corner[1] + dy * len * 0.40],
                       [corner[0] + dx * len * 0.72 - dy * wob, corner[1] + dy * len * 0.72 + dx * wob],
                       [corner[0] + dx * len - dy * wob * 1.5, corner[1] + dy * len + dx * wob * 1.5], 18);
      SG.poly(g, pts.slice(0, Math.max(2, Math.round(pts.length * k))), { color: C.ink, lw: SG.LW.pict });
    }
    SG.mask(g, MX, MY, this.MS, { mask: true, maskRot: -8, peel });      // the sticker, over the roots
    // The warning triangle and its plate. ROUND3 §1: the punch-in is real (z = 1.342 about the sticker corner at
    // (1206, 359)), so the sign has to sit where the camera cannot carry it over the edge. In scene coords the whole
    // group lives in x ≥ 380, y ∈ [163, 511]: its transformed rect is [178, 430]–[688, 543] — clear of the frame's
    // 96 px margin, clear of the machine (860+), and 20 px above the words' ink top (563) at full punch.
    SG.triangle(g, 580, 296, 200, { icon: (gg, cx, cy, r) => {
      gg.fillStyle = C.ink;
      gg.beginPath();
      gg.arc(cx - r * 0.42, cy - r * 0.25, r * 0.15, 0, Math.PI * 2);
      gg.arc(cx + r * 0.42, cy - r * 0.25, r * 0.15, 0, Math.PI * 2);
      gg.fill();
      gg.strokeStyle = C.ink; gg.lineWidth = 34; gg.lineCap = 'round';
      gg.beginPath(); gg.arc(cx, cy + r * 0.12, r * 0.52, 25 * Math.PI / 180, 155 * Math.PI / 180); gg.stroke();
    } });
    const WP = SG.plate(g, 440, 412, 380, 84, { name: 'mask note', pad: 18 });
    BOX.lines(g, WP, ['MASK MAY SLIP'], { size: 40, color: C.ink, font: SG.mono });
    // The redacted line goes on the screen layer (MV.overlay): bars and words together, drawn after the camera, so
    // the insert can punch in 0.3 on the lifting corner without pushing the sentence around, and the bars keep
    // covering exactly the words they cover here (the redaction is a lyric layout, not something printed on the
    // machine). The tentacles above are aimed away from this band for the same reason.
    MV.overlay(o => this.redact(o, f, WD.current(f) ? WD.words(f, WD.current(f).line) : []));
    MV.focus(corner[0], corner[1], 'sticker corner');
  },
  /**
   * The redaction, done here rather than with `treat: 'redact'`: that treatment slides each bar right by about
   * two word widths, so on a row of three words the bar of the first word comes to rest on top of the third and
   * rubs it out (lib/words.js — the word has to stay readable, §7.2). Here each bar is clipped to its own word's
   * slot and slides off to the right inside it, and the word itself is still a WD.line (stamp) at that spot.
   */
  redact(g, f, ws) {
    if (!ws.length) return;
    const size = SG.SIZE.L, maxW = 1620, lh = size * 1.14;
    SG.display(g, size);
    const sp = g.measureText(' ').width;
    const rows = []; let row = [], w = 0;
    for (const wd of ws) {
      const tw = g.measureText(wd.text).width;
      if (row.length && w + sp + tw > maxW) { rows.push(row); row = []; w = 0; }
      w = row.length ? w + sp + tw : tw;
      row.push(wd);
    }
    if (row.length) rows.push(row);
    const ink = WD.ink(g, f, { size });
    const asc = ink ? ink.asc : 135, desc = ink ? ink.desc : 45;
    const base0 = (H - SG.SAFE) - desc - (rows.length - 1) * lh;
    rows.forEach((r, ri) => {
      const rw = r.reduce((a, wd, i) => a + g.measureText(wd.text).width + (i ? sp : 0), 0);
      let x = 960 - rw / 2;
      const base = base0 + ri * lh;
      for (const wd of r) {
        // the bar starts at its own word's left edge and bleeds 0.10 em to the right: any bleed to the left eats the
        // gap to the previous word (qa: lyric-touch — a bar 0.16 em left of its word came within 0.06 em of "the")
        const tw = g.measureText(wd.text).width, br = size * 0.10;
        const sl = ease.outCubic(clamp((f.t - wd.start) / 0.05)) * (tw + br);   // ROUND4 §2: qa probes 0.05 s after the word, so the bar has to be off it by then
        g.save();
        g.beginPath(); g.rect(x, base - asc - size * 0.1, tw + br, size * 1.02); g.clip();
        g.translate(sl, 0);
        g.fillStyle = SG.C.ink;
        g.fillRect(x, base - asc - size * 0.1, tw + br, size * 1.02);
        g.restore();
        WD.line(g, f, { treat: 'stamp', size, y: base, align: 'left', x, only: [wd.i], maxW });
        x += tw + sp;
      }
    });
  },
});
