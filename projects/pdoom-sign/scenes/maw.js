// 05 maw · 16.610–22.519 · P · 全片第一个纯歌词画面：一词一行的字墙，后面压着一个只露一角的巨大警告三角
//   画面：wall——一词一行（"ChatGPT," 单独一行），heavy 铺满画面宽，正在唱的那一行垫黄；墙后面（底层，ink2 线）
//        一个巨大的「手卷入滚轮」警告三角的轮廓，只露一角，慢慢地往上飘。
//   焦点：正在唱的那一行的中心（wall 处理自己报）。 运镜：warp（21.6 s 起整面字墙立起来转走，露出黑底，接副歌）。
//   歌词：wall，一词一行。 切出：硬切到 hook（副歌）。
MV.scene('maw', {
  render(g, f) {
    SG.bg(g, 'P');

    // The warning triangle behind the wall: an ink2 outline far too big for the page, so only its top corner is on
    // screen. It drifts up and out while the sentence is sung — behind "ChatGPT," at first, then between the words.
    const ax = 1600 + 110 * f.p, ay = 140 - 60 * f.p, side = 3002, h = 2600;
    SG.rpoly(g, [[ax, ay], [ax + side / 2, ay + h], [ax - side / 2, ay + h]], side * 0.08);
    g.save();
    g.strokeStyle = SG.C.ink2; g.lineWidth = SG.LW.pict; g.lineJoin = 'round';
    g.stroke();
    g.restore();

    // The wall itself — the row being sung gets the yellow block, and the treatment reports its centre as the focus.
    // It stays on the scene canvas (round 2 §4 migrates lyric zones to the screen layer): here the wall *is* the
    // picture, and the shot's one camera move is the warp at 21.6 s, which tilts this canvas away — a screen-layer
    // wall would hang flat in front of the turning page. The shot has no insert, so nothing is clamped by the wall's
    // MV.keep either (and its keep box spans the frame width, which kits/camera.js skips anyway).
    WD.line(g, f, { treat: 'wall' });
    return {};
  },
});
