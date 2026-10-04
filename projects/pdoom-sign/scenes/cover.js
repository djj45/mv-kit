// 01 cover · 0.000–5.701 · P · 手册封面：警戒条横带 + 机器 + 站在左下的小人
//   画面：顶部 192 px 高的警戒条横带，上面压一行 mono「SAFETY NOTICE — MODEL CLASS: GENERAL」；中间偏右一台机器
//        （s = 1.4，中心 1260, 560）；左下一个小人（s = 0.9，站立，看向机器）；机器眼里每个底鼓闪一下黄色小火花
//        （5 根 8 px 短线，从瞳孔向外弹）。
//   焦点：机器的眼睛（SG.eyeAt）。 运镜：insert（'AGI' 的 start，1.2 s，amt 0.35，camera kit 跟着 MV.focus 推进）。
//   歌词：stamp L，下区，左对齐 x = SG.SAFE，key 'AGI'；**屏幕层**（MV.overlay，镜头推它不动）。 切出：硬切。
MV.scene('cover', {
  /**
   * SG.figure draws a pose's head at P.head measured from the HIP, while SG.POSE's own comment (and every pictogram
   * there is) puts it 30 units above the NECK — i.e. 150 above the hip, with the torso's 120 in between. Reported to
   * the parent; this −120 is that one-line workaround, to be deleted (and the calls simplified) when lib/sign.js
   * measures the head from the neck.
   */

  init() {
    // The cover's fixed furniture, painted once: the 192 px hazard band and the mono line on it. The line sits on a
    // paper strip stuck over the tape — black type crossing the black diagonals could not be read.
    const band = mk(W, 192), b = band.getContext('2d'), title = 'SAFETY NOTICE — MODEL CLASS: GENERAL';
    const face = (gg, s) => SG.mono(gg, s, true);
    SG.stripes(b, 0, 0, W, 192, { period: 96 });
    BOX.font(b, 44, { font: face });
    const tw = b.measureText(title).width;
    b.fillStyle = SG.C.paper;
    b.fillRect(SG.SAFE - 36, 96 - 52, tw + 72, 104);
    BOX.text(b, title, SG.SAFE, 96, { size: 44, color: SG.C.ink, base: 'middle', font: face });
    this.band = band;
  },

  render(g, f) {
    SG.bg(g, 'P');
    g.drawImage(this.band, 0, 0);

    // The figure, lower left: standing, leaning a little toward the machine. A pictogram has no face, so the lean and
    // the head pushed off the neck's axis are the whole of "looking at it". It is drawn before the machine so that
    // the machine's eye is the LAST MV.focus of the frame — the timeline's insert follows that one.
    const FX = 252, FY = 408, FS = 0.9;
    SG.figure(g, FX, FY, FS, (Object.assign({}, SG.POSE.stand, { lean: 5, head: [10, -30] })), { name: 'the figure' });

    // The machine, middle right: the cover's hero. Side 220 × 1.4, its gaze on the figure. It sits 70 px right and
    // 60 px above the shot list's 1260, 560: the timeline's insert really punches in 35 % now that the lyric is on
    // the screen layer (round 2, §4), and at the end of the shot the box's ink border would otherwise be dragged
    // left/up under the lyric's right end ('of' lands on it — qa: lyric-covered / lyric-faint).
    const MX = 1330, MY = 500, MS = 1.4, GZ = [-0.86, -0.22];
    const eye = SG.eyeAt(MX, MY, MS);
    SG.machine(g, MX, MY, MS, { gaze: GZ, fill: SG.C.paper2, name: 'machine eye' });

    // Every kick: five short sparks spring out of the pupil (8 px long, hairline weight — the third of the film's
    // three line widths) and fade with the hit's decay.
    const k = clamp(f.a.kick);
    if (k > 0.04) {
      const px = eye[0] + GZ[0] * 22 * MS, py = eye[1] + GZ[1] * 22 * MS;
      const r0 = 18 * MS + (1 - k) * 16;                 // from the pupil's rim, flying outward as the kick decays
      g.save();
      g.strokeStyle = SG.C.yellow; g.lineWidth = SG.LW.rule; g.lineCap = 'round'; g.globalAlpha = 0.2 + 0.8 * k;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU + 0.5 + hash(i, 7) * 0.7;
        g.beginPath();
        g.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0);
        g.lineTo(px + Math.cos(a) * (r0 + 8), py + Math.sin(a) * (r0 + 8));
        g.stroke();
      }
      g.restore();
    }

    // The lyric is a screen-layer line (MV.overlay): drawn after the camera, so the insert follows the eye and
    // punches in 35 % without dragging the words — on the scene canvas the words' MV.keep box used to clamp that
    // insert to a couple of per cent. maxW 1030 breaks it as "I see sparks of" / "AGI in your eyes": both rows stay
    // clear of the machine at every zoom (see MX/MY above) and one word more on the first row would put the key
    // word's yellow block right beside the eye the shot is pushing into.
    MV.overlay(o => WD.line(o, f, { treat: 'stamp', size: 'L', zone: 'low', align: 'left', x: SG.SAFE, maxW: 1030, key: 'AGI' }));
    return {};
  },
});
