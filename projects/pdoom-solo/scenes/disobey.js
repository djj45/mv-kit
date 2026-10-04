// disobey — S36：一排 WD.figure 小人挤成一块实黑，只有一个朝相反方向走，脚下的线被它踩断。
// 歌词高带 ink 118 px，印在人群上方的空纸里（不压在人群上）。
(function () {
'use strict';
const DBN = 10, DBX0 = 150, DBDX = 165, DBFY = 802;

MV.scene('disobey', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0 });
    const bob = noise1(f.tq * 3.3, 11) * 3.5;
    const drift = f.lt * 7;
    // 人群上面一层排线（墨在半路上）
    WD.hatch(g, f, [[40, 452], [1740, 452], [1740, 522], [40, 522]], { gap: 20, lw: 3, ang: -0.03, alpha: 0.5, seed: 15, wob: 6 });
    // 一排一模一样的小人
    for (let i = 0; i < DBN; i++) {
      WD.figure(g, f, DBX0 + i * DBDX + drift, DBFY, 340, { lw: 1.05, pose: { leg: Math.sin(f.tq * 5 + i * 1.7) * 0.35 }, seed: i * 3 });
    }
    // 挤成的一块实黑：盖住身体，只留一排头从上面冒出来
    WD.carve(g, f, [[80, DBFY + 4], [95, 542 + bob], [300, 524 + bob], [700, 518 + bob], [1100, 520 + bob], [1500, 528 + bob], [1690, 548 + bob], [1700, DBFY + 4]],
      { seed: 6.1 + f.tick * 0.13, jit: 5.2, seg: 56 });
    // 腿之间的缝：刻掉的白，黑块下面才有腿
    for (let i = 0; i <= DBN; i++) {
      const x = DBX0 + (i - 0.5) * DBDX + drift;
      WD.gouge(g, f, [[x - 10, 668], [x, 732], [x + 8, 812]], 20, { seed: 20 + i, pw: 0.25 });
    }
    // 脚下的线
    WD.carve(g, f, [[-60, 800], [1900, 800], [1900, 856], [-60, 856]], { seed: 8.3, jit: 2.4, seg: 60 });
    // 被踩断的一段
    WD.wipe(g, f, [[1688, 788], [1816, 794], [1824, 866], [1696, 870]], { seed: 9.7, jit: 4.5 });
    for (let i = 0; i < 3; i++) WD.gouge(g, f, [[1692 + i * 12, 802], [1748 + i * 16, 828], [1698 + i * 10, 852]], 7, { color: WD.red, seed: 60 + i, pw: 0.35 });
    // 反方向走的那一个
    const wx = 1790 - f.lt * 40;
    const step = Math.sin(f.tq * 5.2);
    const P = WD.figure(g, f, wx, DBFY, 330, { lw: 1.25, pose: { lean: -0.34, leg: step * 0.6, arms: [[1.35, 0.85], [1.95, 1.45]] }, seed: 91 });
    // 歌词：人群以上是空的，印在空纸里（不要底条）
    WD.lyric(g, f, { x: 150, y: 300, size: 118, align: 'left', maxW: 1440, mode: 'ink', color: WD.ink });
    MV.focus(wx, DBFY, 'the foot going the other way');   // 主角：反方向那个小人的脚
    return null;
  },
});
})();