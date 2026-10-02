// S49 recursive — over her shoulder (A2): the monitor shows this very frame, and that one shows it again; every
// beat the camera pushes one level deeper.
MV.scene('recursive', akCustom({
  init() { akArt('A2'); this.F = mk(W, H); },
  render(g, f) {
    const [u, v, w, h] = AK_SPOT.A2.screen, b = f.beat - Math.floor(f.audio.beatAt(f.from)), level = Math.floor(b), ph = ease.inOutCubic(clamp(b - level));
    const fg = this.F.getContext('2d'); fg.setTransform(1, 0, 0, 1, 0, 0); fg.fillStyle = '#000'; fg.fillRect(0, 0, W, H);
    const a2 = (akMotionOn(f) && akClipArt('A2v', 'A2', f.tq - f.from)) || akArt('A2');   // A2v when generated: she types on, every level
    const map = illCover(fg, a2, { x: 0.6, y: 0.45, z: 1.05 });
    const [x0, y0] = map(u, v), [x1, y1] = map(u + w, v + h), sw = x1 - x0, sh = sw * H / W, sy = y0 + ((y1 - y0) - sh) / 2;
    for (let i = 0; i < 5; i++) fg.drawImage(this.F, x0, sy, sw, sh);   // the screen holds the frame, five levels deep
    // push: one level per beat (scale by W/sw around the screen)
    const s = Math.pow(W / sw, ph), cx = lerp(W / 2, x0 + sw / 2, ph), cy = lerp(H / 2, sy + sh / 2, ph);
    g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-cx, -cy); g.drawImage(this.F, 0, 0); g.restore();
    akLy(g, f, { style: 'verse', x: 140, y: 930, hot: ['recursive', 'self-upgrade'] });
    return {};
  },
}));
