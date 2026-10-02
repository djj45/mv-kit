// S01 lab — dusk, the empty lab (A1). Slow push toward the one monitor with a blinking orange caret; dust in the
// sun shafts; the title in dot type. Anchor `monitor` for the zoom into the screen.
MV.scene('lab', akStill({
  art: 'A1',
  cam: [[0, { x: 0.5, y: 0.5, z: 1.0 }], [0.15, { z: 1.0 }], [1, { x: 0.5, y: 0.49, z: 1.32 }, ease.inOutCubic]],
  fx(g, f, map) {
    const [u, v, w, h] = AK_SPOT.A1.monitor, [x, y] = map(u, v), s = map.scale;
    illRays(g, f.t, ...map(1.02, 0.12), 2.45, 0.22, W * 1.2, '255,206,140', 0.12, { seed: 4 });
    illDust(g, f.t, { box: [W * 0.25, 0, W * 0.75, H], n: 70, size: 2.6, color: '255,226,180', alpha: 0.6 });
    akCaret(g, x - w * map.sw * s * 0.25, y + h * map.sh * s * 0.15, 30 * s, f.beatPhase < 0.55);
    // title, top left, before the first word
    const a = prog(f.t, 0.4, 1.0) * (1 - prog(f.t, 3.0, 3.6));
    akText(g, "I'm Upping My P(doom)", 140, 170, { size: 30, alpha: a, color: AK.paper, glowColor: 'rgba(0,0,0,0)' });
    akText(g, '灯 · AKARI', 140, 212, { size: 26, alpha: a * 0.9 });
  },
  ly: { style: 'verse', x: 140, y: 930, hot: ['sparks', 'AGI'] },
  anchors(f) {
    const cam = illCam(f.p, [[0, { x: 0.5, y: 0.5, z: 1.0 }], [0.15, { z: 1.0 }], [1, { x: 0.5, y: 0.49, z: 1.32 }, ease.inOutCubic]]);
    const art = akArt('A1'), sw = art.width, sh = art.height, s = Math.max(W / sw, H / sh) * cam.z;
    const [u, v, w, h] = AK_SPOT.A1.monitor, cx = clamp(cam.x * sw, W / 2 / s, sw - W / 2 / s), cy = clamp(cam.y * sh, H / 2 / s, sh - H / 2 / s);
    const x = W / 2 + (u * sw - cx) * s, y = H / 2 + (v * sh - cy) * s, ww = w * sw * s, hh = ww * H / W;
    return { monitor: [x - ww / 2, y - hh / 2, ww, hh] };
  },
  post: f => ({ fade: 1 - prog(f.t, 0, 1.4, ease.outQuad) }),
}));
