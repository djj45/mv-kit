// 27 clips · 95.24–98.88 · P · 主角：最新那一排回形针的中心
//   TREATMENT.md §8 27（原文）：同一个刻度盘，但很小（R 220，画面左上），指针几乎不动（0.60 → 0.62）；地面上回形针
//   象形（两个嵌套的圆角长条线）每拍多一排，从下往上铺满下半画面。焦点：最新那一排回形针的中心。
//   歌词：#28 副歌（耳语版）`stamp` M（ink2 色——耳语）右上；#29「as paperclips fill the room」`label` S，at = 回形针堆。
//
// 这一镜横跨两句：#27 在切点前就唱完了，所以镜头开头 0.23 s 里 WD.current 是 null（不画歌词），#28 从它自己的
// 第一个字起才画；两句的 only 都从当前句的词表推出来，不写死词序号。
// 层级：#28 是 zone 歌词（右上，ink2 耳语）→ 屏幕层 MV.overlay；#29 是印在回形针堆上的引线 → 留在场景画布。
MV.scene('clips', {
  /** 一个回形针象形：外面一个大弯、里面套一个小弯，两个圆角长条一笔画出来（线宽按象形的 34·s 缩放） */
  clip(g, cx, cy, h, color) {
    const lw = h / 12, a = 2.2 * lw, top = cy - h / 2, bot = cy + h / 2;
    g.save();
    g.strokeStyle = color || SG.C.ink; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(cx, top + 3.2 * lw);                              // 里面那根的内端
    g.lineTo(cx, bot - a / 2);
    g.arc(cx + a / 2, bot - a / 2, a / 2, Math.PI, 0, true);   // 底下的小弯（顺时针过底）
    g.lineTo(cx + a, top + a);
    g.arc(cx, top + a, a, 0, Math.PI, true);                   // 顶上的大弯（过顶）
    g.lineTo(cx - a, bot - a / 2);
    g.stroke(); g.restore();
  },
  render(g, f) {
    SG.bg(g, 'P');
    const C = SG.C;
    const L28 = f.lyrics.get('upping my P', 2);           // 耳语版副歌
    const L29 = f.lyrics.get('as paperclips');
    // 同一个刻度盘，缩到画面左上；耳语版：指针几乎不动（0.60 → 0.62，整镜走完）
    SG.gauge(g, 400, 470, 220, lerp(0.60, 0.62, ease.inOutQuad(f.p)), { label: 'P(DOOM)' });
    // 回形针：每拍多一排，从地面往上铺满下半画面（最新的一排在最上面）
    const DY = 62, Y0 = 1035, H = 56;
    const born = [f.from];
    for (const b of f.audio.beats) if (b > f.from + 1e-4 && b <= f.t) born.push(b);
    for (let r = 0; r < born.length; r++) {
      const y = Y0 - r * DY, k = ease.outCubic(clamp((f.t - born[r]) / 0.10));   // 每排在自己的拍上"盖"下来
      for (let i = 0; i < 14; i++) {
        const jx = (hash(i, r, 3) * 2 - 1) * 6, jy = (hash(i, r, 11) * 2 - 1) * 4;
        this.clip(g, 220 + i * 118 + jx, y + jy, H * (1 + 0.18 * (1 - k)), C.ink);
      }
    }
    const top = [960, Y0 - (born.length - 1) * DY];       // 最新那一排的中心
    const cur = WD.current(f);
    if (cur && cur.i === L29.i) {
      // #29 的引线印在回形针堆上、跟着画面动，留在场景画布上（它报的 keep 限制推近是对的）
      WD.line(g, f, { treat: 'label', size: 'S', at: top, only: WD.words(f, cur.line).map(w => w.i), maxW: 900 });
    }
    // #28 是 zone 歌词、又没有用到 WD.line 的返回值：画进屏幕层 MV.overlay，默认缓推从字底下过去，
    // 不再被歌词的 keep 框钳住。only 从当前句的词表推出来，切句的第一帧不会指错词。
    MV.overlay(o => {
      const c = WD.current(f);
      if (!c || c.i !== L28.i) return;
      const m = WD.measure(o, f, { treat: 'stamp', size: 'M', maxW: 1400 });
      if (m) WD.line(o, f, { treat: 'stamp', size: 'M', color: C.ink2, zone: 'top', maxW: 1400,
                             x: W - SG.SAFE - m.w, only: WD.words(f, c.line).map(w => w.i) });   // 右上，耳语：ink2
    });
    MV.focus(top[0], top[1], 'newest row of clips');
  },
});
