// S54 monitor — pull out: the sunrise was a picture on a monitor in the morning lab (H4), she is asleep at the desk;
// below it the terminal reads P(doom) = ? and the caret blinks. Fade to black; small credit that the illustrations
// are AI-generated. Anchor `screen` for the zoom out of the previous shot.
MV.scene('monitor', {
  init() { akArt('H4'); akArt('H3'); },
  rect(map) { const [u, v, w, h] = AK_SPOT.H4.screen, [x0, y0] = map(u, v), [x1] = map(u + w, v + h), sw = x1 - x0; return [x0, y0, sw, sw * H / W]; },
  cam(f) { return { z: lerp(1.25, 1.05, ease.outCubic(f.p)), x: 0.52, y: 0.42 }; },
  anchors(f) { const g = mk(1, 1).getContext('2d'); return { screen: this.rect(illCover(g, akArt('H4'), this.cam(f))) }; },
  render(g, f) {
    const h4 = (akMotionOn(f) && akClipArt('H4v', 'H4', f.tq - f.from)) || akArt('H4');   // H4v when generated: she breathes in her sleep
    const map = illCover(g, h4, this.cam(f)), [x, y, w, h] = this.rect(map);
    g.drawImage(akArt('H3'), x, y, w, h);  // what the screen shows at rest: the last image (the zoom shows the real one)
    akText(g, 'P(doom) = ?', x + 20, y + h + 40, { size: 26 });
    akCaret(g, x + 220, y + h + 44, 26, f.beatPhase < 0.55);
    const end = f.to;
    if (f.t > end - 2.2) akText(g, '插画和动态片段由 AI 生成（Seedream / Seedance）· 歌曲 I\'m Upping My P(doom)', W - 120, H - 80, { size: 26, align: 'right', color: AK.paper, glow: false, alpha: prog(f.t, end - 2.2, end - 1.8) });
    return { fade: prog(f.t, end - 1.6, end - 0.1) };
  },
});
