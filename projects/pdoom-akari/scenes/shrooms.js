// S14 shrooms — the mushroom snack bag (B6). On "shrooms" the picture's hue starts turning and acid green
// floods in for one bar — the only time this colour is in the film.
MV.scene('shrooms', {
  init() { akArt('B6'); },
  render(g, f) {
    const at = f.lyrics.findWords('shrooms')[0].start, k = prog(f.t, at, at + 0.4), hue = k * (f.t - at) * 260;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const wob = k * Math.sin(f.tq * 9) * 0.015, art = akArt('B6');
    let cam = { z: 1.06 + 0.06 * f.p + k * 0.05, rot: wob };
    if (akMotionOn(f)) cam = illGroove(f, cam, art, akMotion(f));   // 动感: the bag rides the beat too
    illCover(g, art, cam, { filter: k > 0 ? `hue-rotate(${hue.toFixed(0)}deg) saturate(${1 + k})` : 'none' });
    if (k > 0) { g.save(); g.globalCompositeOperation = 'overlay'; g.fillStyle = `rgba(216,255,60,${0.45 * k})`; g.fillRect(0, 0, W, H); g.restore(); }
    akLy(g, f, { style: 'slant', x: 960, y: 930, size: 84, offColor: k > 0 ? AK.acid : AK.signal });
    if (akMotionOn(f)) akHud(g, f, akHudIn(f));
    return akCutHit(f, {});
  },
});
