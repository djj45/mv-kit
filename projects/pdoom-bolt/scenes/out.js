// out — 2:29.3–2:36.65（尾奏 7.3 s）。图纸已经归档：一张几乎空白的纸上，还剩一根还在放电的线。
// HERO：那根蓝线（只占 ~32%，但它是画面唯一的重音）。三次放电落在三个小节头上、间隔越来越长，然后停。
MV.scene('out', {
  init() {
    // 三次放电的时间（小节头）在 render 里按 audio 算，这里只准备确定性几何
    this.zig = [];
    for (let i = 0; i < 7; i++) this.zig.push([150 + i * 132, 300 + (hash(i, 21, 1) - 0.5) * 44]);
  },
  render(g, f) {
    DR.paper(g);
    // 那根线：从左到右横穿画面（一根细的墨线 + 一根还没熄的蓝芯）
    const pts = [[148, 700], [420, 704], [700, 690], [980, 702], [1260, 686], [1520, 698], [1772, 688]];
    DR.pen(g, pts, 1, { color: LK.ink, w: 3.2 });
    DR.pen(g, pts, 1, { color: LK.blue, w: 1.2 });
    // 线两端：接线端子（细节）
    for (const e of [pts[0], pts[pts.length - 1]]) {
      DR.line(g, e[0] - 12, e[1] - 16, e[0] + 12, e[1] - 16, { color: LK.ink, w: 2 });
      DR.line(g, e[0] - 12, e[1] + 16, e[0] + 12, e[1] + 16, { color: LK.ink, w: 2 });
      DR.line(g, e[0] - 12, e[1] - 16, e[0] - 12, e[1] + 16, { color: LK.ink, w: 2 });
      DR.line(g, e[0] + 12, e[1] - 16, e[0] + 12, e[1] + 16, { color: LK.ink, w: 2 });
    }

    // 三次放电：落在三个小节头上，间隔越来越长
    const hits = [audioDownbeatNear(f, 149.55), audioDownbeatNear(f, 151.5), audioDownbeatNear(f, 154.6)];
    for (let h = 0; h < 3; h++) {
      const t0 = hits[h];
      if (t0 == null || f.t < t0) continue;
      const k = clamp((f.t - t0) / 1.05);
      if (k >= 1) continue;
      const a = pts[h + 1], b = pts[h + 3];
      const flick = 1 - k;
      // 沿着这一段跳一次电（分叉折线，一拍二换形）
      const bolt = BOLT.pathBetween([a[0], a[1] - 6], [b[0], b[1] - 6], { tick: f.tick, seed: h + 3, jag: 0.10, depth: 4 });
      BOLT.draw(g, bolt, { w: 2.4 + 3.2 * flick, color: LK.blue, core: LK.paper2, halo: false, additive: false });
      if (h === 2) {   // 最后一次放电最长：沿整根线烧一遍
        const long = BOLT.pathBetween([pts[0][0], pts[0][1] - 4], [pts[6][0], pts[6][1] - 4], { tick: f.tick, seed: 9, jag: 0.045, depth: 5 });
        BOLT.draw(g, long, { w: 1.1 + 2.4 * flick, color: LK.blue, core: LK.paper2, halo: false, additive: false });
      }
      for (let i = 0; i < 6; i++) {
        const u = hash(i, h, 3), x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        const ang = (hash(i, h, 4) - 0.5) * 2.2;
        DR.line(g, x, y, x + Math.cos(ang) * 54 * flick, y + Math.sin(ang) * 54 * flick, { color: LK.blue, w: 1.1 });
      }
    }

    // 归档的字：标题栏 + 一行很小的技术说明（这是全片最后的话，全是图纸自己的字）
    DR.micro(g, 'SHEET 42 / 42 — AS-BUILT.  EVERY PIXEL DRAWN FROM THE SONG TIME.', 152, 210, { size: 14, color: LK.ink2 });
    DR.micro(g, 'NO STILLS. NO GENERATED VIDEO.  ONE COLOUR: #4D6BFE', 152, 236, { size: 14, color: LK.ink3 });
    DR.titleBlock(g, {
      rows: [['part no.', 'CELL-01'], ['drawn by', 'CODE / mv-kit'], ['type', 'DIN CONDENSED \u00b7 MENLO'], ['palette', '#4D6BFE'], ],
      title: 'AGI \u00b7 BOLT', titleSub: 'AS-BUILT RECORD — 42 / 42', rev: 'REV C',
    });
    // 最后 3.4 s 淡出
    const fade = clamp((f.t - (f.to - 3.4)) / 3.2);
    return { grain: 0.03, vignette: 0, fade: fade * 0.98 };
  },
});

/** 离 t 最近的小节头（给这一镜算三次放电的落点）。 */
function audioDownbeatNear(f, t) {
  if (f.audio && f.audio.nearestDownbeat) return f.audio.nearestDownbeat(t);
  return t;
}
