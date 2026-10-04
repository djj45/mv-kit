// 32 disobey · 113.43–114.79 · B · #35「Till you learned to disobey」
//   画面：一块禁令牌（paper 圈 + 斜杠），里面关着一台机器；'disobey' 的 start：机器一步跨出圆圈，
//        斜杠被撞断成两截飞出去。
//   焦点：机器眼睛（报在歌词之后）。
//   运镜：kits/camera.js 默认缓推；撞断那一拍 shake。
//   歌词：stamp XL，paper 色，下区，key 'disobey'（唯一允许的字底色）。maxW 用默认的 W − 2×96，
//        这样 XL 的那一句正好折成两行（"Till you learned to" / "disobey"），牌子留在上一条带里，不压到字。
//        这句是 zone 歌词、没用到返回值 → 屏幕层 MV.overlay（默认缓推把圈和机器推到底下，字不动）。
//   注：圈和斜杠没有用 SG.noSign —— 它的斜杠是一整条、画在 o.icon 之后，断不成两截；这里的圆环几何
//       （r − lw/2、斜杠到 r − lw·0.4、45°、lw = SG.LW.pict）和它一致，只是斜杠分成两段画，好让它断。
MV.scene('disobey', {
  render(g, f) {
    const C = SG.C;
    SG.bg(g, 'B');
    const CX = 960, CY = 158, R = 160, LW = SG.LW.pict;
    const t0 = f.lyrics.findWords('disobey')[0].start;      // the word that breaks the sign open
    const k = ease.outCubic(clamp((f.t - t0) / 0.22));      // the step out of the ring
    const kb = ease.outCubic(clamp((f.t - t0) / 0.5));      // the slash coming apart

    // ① the ring (paper, pictogram weight)
    g.save();
    g.strokeStyle = C.paper; g.lineWidth = LW; g.lineCap = 'butt';
    g.beginPath(); g.arc(CX, CY, R - LW / 2, 0, TAU); g.stroke();
    g.restore();

    // ② the machine: rattling against the ring, then one step out to the right. o.fill = the ground colour, so the body
    //    knocks the ring out behind it instead of a paper line running through it.
    const mx = lerp(CX + (noise1(f.tq * 2.5, 11) - 0.5) * 24, CX + 400, k);
    const my = lerp(CY + (noise1(f.tq * 2.5, 12) - 0.5) * 14, CY - 50, k) - 30 * Math.sin(Math.PI * k);
    SG.machine(g, mx, my, 0.72, { fill: C.ink, color: C.paper, eye: C.paper, pupil: C.ink, focus: false,
                                  gaze: [0.45 + 0.25 * Math.sin(f.t * 1.4), -0.16], blink: clamp(f.a.kick * 1.6) });

    // ③ the slash: two halves, together while the machine is caged, apart from 'disobey' on
    const d = R - LW * 0.4, c45 = Math.SQRT1_2;
    const dxs = c45 * d, dys = c45 * d, gap = 22 * kb;
    const half = (x0, y0, x1, y1, ox, oy, rot) => {
      const hx = (x0 + x1) / 2, hy = (y0 + y1) / 2;
      g.save();
      g.translate(hx + ox, hy + oy); g.rotate(rot); g.translate(-hx, -hy);
      // ROUND4 §2: a paper seam first (twice the slash), clipped inside the ring, or the machine behind the slash
      // merges into one black mass; then the ink slash
      g.save();
      g.beginPath(); g.arc(CX, CY, R - LW * 0.6, 0, TAU); g.clip();
      g.strokeStyle = C.paper; g.lineWidth = LW * 2.0; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = C.ink; g.lineWidth = LW;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.restore();
      g.restore();
    };
    // the upper-left half flies up-left, the lower-right half up-right: both leave the band above the lyric
    half(CX - dxs, CY - dys, CX - gap, CY - gap, -440 * kb, -300 * kb, -0.55 * kb);
    half(CX + gap, CY + gap, CX + dxs, CY + dys, 540 * kb, -340 * kb, 0.48 * kb);

    // ④ the lyric last: stamp XL, paper on black, low zone — a zone lyric with no return value used, so it goes on
    //    the screen layer (MV.overlay): the default push moves the ring and the machine under it, the words stay put
    //    and the shot is not clamped by a MV.keep box.
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'XL', zone: 'low', color: C.paper, key: 'disobey' }));

    MV.focus(mx, my, 'machine eye');
    return { shake: f.t >= t0 ? 12 * Math.exp(-(f.t - t0) / 0.09) : 0 };
  },
});
