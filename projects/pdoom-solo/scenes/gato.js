// gato — S28：全曲最安静处（鼓几乎没了）。一只猫的剪影蹲在版面上，尾巴是一根会慢慢摆的白刀口，
// 一个小人的手从左边伸向它。最慢的缓推，但猫尾巴和手动。歌词印在猫上面的空纸里（高带）。
(function () {
'use strict';
const GX = 1270, GY = 826;                              // 猫的脚底中点

MV.scene('gato', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0 });
    const br = noise1(f.tq * 1.7, 5) * 3.2;             // 呼吸：一拍二
    // 猫的黑影：一块宽的水洼，歌词刻在里面
    WD.carve(g, f, [[90, 1120], [70, 920], [200, 848], [420, 806], [780, 792], [1140, 788], [1520, 796], [1770, 824], [1870, 906], [1850, 1120]],
      { seed: 3.3 + f.tick * 0.21, jit: 4.6, seg: 52 });
    // 影子上面一层排线（墨在半路上）
    WD.hatch(g, f, [[60, 700], [1880, 700], [1880, 796], [60, 796]], { gap: 22, lw: 3, ang: -0.03, alpha: 0.42, seed: 14, wob: 6 });
    // 猫：实黑剪影
    const cy = GY + br;
    WD.carve(g, f, [[GX - 252, cy], [GX - 238, cy - 122], [GX - 202, cy - 228], [GX - 128, cy - 288], [GX - 20, cy - 302],
                    [GX + 88, cy - 274], [GX + 154, cy - 198], [GX + 180, cy - 96], [GX + 188, cy]],
      { seed: 5.1, jit: 4.4, seg: 46 });
    // 耳朵
    WD.carve(g, f, [[GX - 152, cy - 284], [GX - 130, cy - 374], [GX - 72, cy - 302]], { seed: 6.2, jit: 2.4, holes: false });
    WD.carve(g, f, [[GX - 8, cy - 304], [GX + 40, cy - 394], [GX + 98, cy - 288]], { seed: 7.4, jit: 2.4, holes: false });
    // 眯着的一条眼缝：刻掉的白
    WD.gouge(g, f, [[GX - 96, cy - 208], [GX - 56, cy - 216], [GX - 18, cy - 208]], 10, { seed: 9.2, pw: 0.3 });
    // 尾巴：一根白刀口，慢慢摆
    const sw = Math.sin(f.t * 0.62);
    const tail = [];
    for (let i = 0; i <= 6; i++) {
      const u = i / 6;
      tail.push([GX + 146 + 306 * u + sw * 30 * u, cy - 42 - 336 * u * u + sw * 66 * u]);
    }
    WD.contour(g, f, tail, 36, { color: WD.ink, seed: 11.2, boil: 1.1, prof: function (u) { return 1 - 0.45 * u * u; } });
    WD.gouge(g, f, tail, 9, { seed: 12.4, pw: 0.18, rough: 0.8 });        // 尾巴中间那道白刀口
    // 小人的手：从左边伸过来（在歌词带上方）
    const hx = 782 + 24 * Math.sin(f.t * 0.5), hy = 636 + 11 * Math.sin(f.t * 0.44 + 1);
    WD.contour(g, f, [[190, 742], [420, 688], [hx - 46, hy + 26]], 36, { color: WD.ink, seed: 25, boil: 1.3, prof: function () { return 1; } });
    const tip = WD.hand(g, f, hx, hy, 208, -0.14, { color: WD.ink, seed: 21 });
    MV.focus(tip[0], tip[1], 'fingertip');              // 主角：伸出的指尖
    // 歌词：猫和手以上是一整片空纸，印在那里（不要底条）
    WD.lyric(g, f, { x: 960, y: 300, size: 100, align: 'center', maxW: 1520, mode: 'ink', color: WD.ink });
    return null;
  },
});
})();