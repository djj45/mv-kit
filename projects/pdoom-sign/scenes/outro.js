// 41 outro · 143.88–156.65 · P → B · 尾奏（无歌词）
//   画面：封面（01）回来了——同样的版式、同样的警戒条横带（横带和 mono 抬头条用的是 scenes/cover.js 的 init 里那几
//        个数：192 px 高、period 96、抬头 44 px mono 压在 SG.SAFE 的纸条上），只是人和机器换了位置：站在机器位置上
//        的是小人（s 1.4，髋 1260,574——01 里机位 1260,560），机器缩到了左下角小人原来的位置（s 0.9，中心 252,400
//        ——01 里小人的髋 252,408）。148 s 起整张封面像手册合上一样 warp 转走（看到书背），149.4–151.1 s 纸面同时
//        压黑，露出黑底；153 s 起黑底中间一行 mono「END OF NOTICE」（S 档，BOX.text），最后 0.6 s 淡出。
//   焦点：小人的头 → 封面中心。
//   歌词：无（封面上的 mono 字照常画，不是歌词；WD.line 在 143.9 之后本来就返回 null）。
//   运镜：camera kit 的 warp（timeline 上那一条）+ 默认缓推；小人的摆动、机器每拍的眼花就是这一镜的动作（横带照
//        01 那样不推相位）。
//
//   END OF NOTICE 画在**屏幕层**（MV.overlay）：warp 之后整张封面是一块转过去的板子，画在场景画布上的字会被
//   warpPlane 一起压扁；屏幕层在镜头和 warp 之后、颗粒之前画，字是正的黑底白字。第二轮之前这段是一个
//   MV.postFilter，在滤镜里用 MV.activeAt(t) 判断"现在是不是这一镜"——那是从 MV 里读状态，不是只由 t 决定，
//   而且覆盖层（MV.overlay）画在 postFilter **之后**，所以搬到这里既干净又不会被滤镜顺序咬到。
MV.scene('outro', {
  /** the same one-line head workaround scenes/cover.js uses (SG.figure measures P.head from the hip, not the neck) */

  init() {
    // Shot 01's cover furniture, painted once with cover.js's own numbers, so 41 is the same sheet of paper coming back.
    const band = mk(W, 192), b = band.getContext('2d'), title = 'SAFETY NOTICE — MODEL CLASS: GENERAL';
    const face = (gg, s) => SG.mono(gg, s, true);
    SG.stripes(b, 0, 0, W, 192, { period: 96 });
    BOX.font(b, 44, { font: face });
    const tw = b.measureText(title).width;
    b.fillStyle = SG.C.paper;
    b.fillRect(SG.SAFE - 36, 96 - 52, tw + 72, 104);
    BOX.text(b, title, SG.SAFE, 96, { size: 44, color: SG.C.ink, base: 'middle', font: face });
    this.band = band;
    this.close = [149.4, 1.7];        // the page goes dark as the board turns away (the timeline's warp ends at 151.0)
    this.end = 153.0;                 // the end card: the notice is over (the last 0.6 s of the shot fades it out)
  },

  render(g, f) {
    const C = SG.C, t = f.t;
    const closeK = clamp((t - this.close[0]) / this.close[1]);
    let head = null;
    if (closeK < 1) {
      SG.bg(g, 'P');
      g.drawImage(this.band, 0, 0);

      // The machine, now the little one at the bottom left where the figure stood, looking up at the figure (01's gaze
      // mirrored). Drawn first: the last MV.focus of the frame is the figure's head.
      const MX = 252, MY = 400, MS = 0.9, GZ = [0.86, 0.20];
      SG.machine(g, MX, MY, MS, { gaze: GZ, fill: C.paper2, blink: clamp(f.a.snare * 1.1), focus: false });
      // every kick: five short sparks spring out of the pupil (01's gesture, the same five hairlines)
      const k = clamp(f.a.kick);
      if (k > 0.04) {
        const px = MX + GZ[0] * 22 * MS, py = MY + GZ[1] * 22 * MS, r0 = 18 * MS + (1 - k) * 16;
        g.save();
        g.strokeStyle = C.yellow; g.lineWidth = SG.LW.rule; g.lineCap = 'round'; g.globalAlpha = 0.2 + 0.8 * k;
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU + 0.5 + hash(i, 7) * 0.7;
          g.beginPath();
          g.moveTo(px + Math.cos(a) * r0, py + Math.sin(a) * r0);
          g.lineTo(px + Math.cos(a) * (r0 + 8), py + Math.sin(a) * (r0 + 8));
          g.stroke();
        }
        g.restore();
      }

      // The figure, standing where the machine was: 01's pose mirrored (it leans toward the little machine now), with a
      // two-frame sway so the sheet is not dead before the warp takes it.
      const sway = 0.5 + 0.5 * Math.sin(f.tq * 1.05);
      const stand = Object.assign({}, SG.POSE.stand, { lean: -5, head: [-10, -30] });
      head = SG.figure(g, 1260, 574, 1.4, (SG.pose(stand, SG.POSE.reach, 0.06 * sway)), { focus: false }).head;

      if (closeK > 0) { g.save(); g.fillStyle = C.ink; g.globalAlpha = closeK; g.fillRect(0, 0, W, H); g.restore(); }
    } else SG.bg(g, 'B');
    const Hd = head || [W / 2, H / 2];
    MV.focus(t < 148 ? Hd[0] : W / 2, t < 148 ? Hd[1] : H / 2, t < 148 ? 'figure head' : 'cover centre');
    const fade = clamp((t - (f.to - 0.6)) / 0.6);
    // the end card, on the screen layer: the same fade the scene's return value puts on the picture, applied by hand —
    // the screen layer is composited after the fade, so without this the line would outlive the black it sits on
    if (t >= this.end && fade < 1) {
      MV.overlay(o => {
        o.save();
        o.globalAlpha = clamp((t - this.end) / 0.22) * (1 - fade);
        BOX.text(o, 'END OF NOTICE', W / 2, H / 2, { size: SG.SIZE.S, align: 'center', base: 'middle',
                                                    color: SG.C.paper, font: SG.mono, maxW: W - 2 * SG.SAFE });
        o.restore();
      });
    }
    return { fade };
  },
});
