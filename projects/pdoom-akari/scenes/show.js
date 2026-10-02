// S51 show — G2 freezes; colour drains out of it into line art; in the pause bar everything stops but a small
// orange caret in the corner. The line art is computed once in init (edge detection on the picture).
MV.scene('show', {
  init() {
    const art = akArt('G2'), w = art.width, h = art.height, c = mk(w, h), cg = c.getContext('2d');
    cg.drawImage(art, 0, 0); const src = cg.getImageData(0, 0, w, h), d = src.data, out = cg.createImageData(w, h), o = out.data;
    const L = i => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4, gx = L(i + 4) - L(i - 4), gy = L(i + w * 4) - L(i - w * 4), e = clamp(Math.hypot(gx, gy) / 60);
      o[i] = o[i + 1] = o[i + 2] = 248 - 210 * e; o[i + 3] = 255;
    }
    cg.putImageData(out, 0, 0); this.lines = c;
  },
  render(g, f) {
    const cam = { z: 1.14 }, pause = f.audio.downbeats.find(d => d > f.from + 1), k = prog(f.t, f.from + 0.3, pause, ease.inOutQuad);
    illCover(g, akArt('G2'), cam); illCover(g, this.lines, cam, { alpha: k });
    akLy(g, f, { style: 'quiet', x: 960, y: 960, size: 68, track: 6, color: k > 0.5 ? AK.ink : AK.paper });
    if (f.t >= pause - 0.3) akCaret(g, W - 160, H - 110, 40, f.beatPhase < 0.55);
    return { grain: 0.04 * (1 - k) };
  },
});
