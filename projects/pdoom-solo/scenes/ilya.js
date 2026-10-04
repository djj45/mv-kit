// ilya — 歌词行 44 "What did Ilya see? We'll never know"（131.61–137.06）。
// 一间空的印坊：压印台上什么都没有，只有一把刻刀和一把空椅子；墙上还留着上一版印歪的残影（ghost 色）。
// 主角是空椅子的座位。极慢的缓推（camera kit 默认）+ 一道光斑在墙上慢慢地走。
// 字：中带 LABEL 44 px Menlo，屏幕层，像一行版边注。
(function () {
'use strict';
const IL = { FLOOR: 768, CHX: 1398, CHW: 358, SEAT: 828, LYRIC: [140, 664] };

MV.scene('ilya', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0, grain: 0.13, grainGap: 50 });

    // 墙：几道竖直的木板缝（ghost），墙面比纸再暗半档
    g.save(); g.globalAlpha = 0.35;
    for (let i = 0; i < 7; i++) {
      const x = 60 + i * 300;
      WD.contour(g, f, [[x, -20], [x + 6, 400], [x, IL.FLOOR]], 2.4, { color: WD.ghost, seed: 200 + i, boil: 0.4, prof: function () { return 1; } });
    }
    g.restore();

    // 上一版印歪的残影：一排小人 + 版框，整体错开、歪着
    g.save(); g.globalAlpha = 0.30;
    for (let i = 0; i < 5; i++) {
      WD.figure(g, f, 286 + i * 134, 476 - i * 7, 106, {
        color: WD.ghost, lw: 1.1, seed: 100 + i * 3,
        pose: { lean: 0.1, arms: [[-0.35, 0.55], [2.05, 0.62]] },
      });
    }
    WD.contour(g, f, [[196, 512], [1010, 470], [1030, 236], [214, 268], [196, 512]], 4, { color: WD.ghost, seed: 90, boil: 0.6, prof: function () { return 1; } });
    g.restore();

    // 从窗口进来的一道光斑：在墙上慢慢地走（排线的一档中间调）
    const ly = -300 + 640 * f.p;
    g.save(); g.globalAlpha = 0.5;
    WD.hatch(g, f, [[1290, ly], [1930, ly - 130], [1930, ly + 236], [1290, ly + 372]],
      { gap: 13, lw: 4.2, ang: 0.16, seed: 5, wob: 2.4 });
    g.restore();

    // 墙脚线
    WD.contour(g, f, [[-20, IL.FLOOR], [W + 20, IL.FLOOR - 6]], 4.5, { seed: 31, boil: 0.6, prof: function () { return 1; } });

    // 压印台：台面（排线，空的）+ 前沿（实黑）+ 台下交叉排线的影
    const face = [[170, 700], [1310, 692], [1392, 846], [70, 860]];
    WD.hatch(g, f, face, { gap: 13, lw: 3.6, ang: -0.06, seed: 11, wob: 2.6 });
    WD.contour(g, f, face.concat([face[0]]), 5, { seed: 12, boil: 0.7, prof: function () { return 1; } });
    const front = [[70, 860], [1392, 846], [1392, 1006], [70, 1026]];
    WD.carve(g, f, front, { seed: 14, jit: 3, seg: 70, holeA: 0.42 });
    // 前沿上三道白刀口：这块木头被刻过的痕迹
    for (let i = 0; i < 3; i++) {
      WD.gouge(g, f, [[260 + i * 190, 916 + i * 12], [520 + i * 190, 906 + i * 14], [700 + i * 170, 918 + i * 10]], 13,
        { seed: 150 + i, pw: 0.22, rough: 0.7 });
    }
    WD.crosshatch(g, f, [[-40, 1026], [1400, 1006], [1400, H + 40], [-40, H + 40]], { gap: 15, lw: 4, ang: -0.1, wob: 2.6 }, 16);

    // 台上那把刻刀（红版只描刀刃）
    WD.blade(g, f, 880 + 3 * Math.sin(f.t * 0.5), 792, 240, -0.10 + 0.004 * Math.sin(f.t * 0.62), { seed: 21 });

    // 空椅子：椅背是一块斜靠的板，座位面上什么都没有（留白），四条腿是黑
    const chx = IL.CHX, chw = IL.CHW, sy = IL.SEAT;
    const back = [[chx + 50, 598], [chx + chw - 24, 584], [chx + chw - 12, sy + 2], [chx + 34, sy + 12]];
    WD.hatch(g, f, back, { gap: 15, lw: 3.6, ang: -0.07, seed: 88, wob: 2 });
    WD.contour(g, f, back.concat([back[0]]), 6.5, { seed: 89, boil: 0.7, prof: function () { return 1; } });
    for (const lg of [[chx + 30, chx + 14], [chx + chw - 44, chx + chw - 62]]) {
      WD.carve(g, f, [[lg[0] - 9, sy + 40], [lg[0] + 9, sy + 40], [lg[1] + 11, 1048], [lg[1] - 11, 1048]],
        { seed: 74 + lg[0] * 0.01, jit: 1.6, seg: 40, holes: false });
    }
    const seat = [[chx, sy], [chx + chw, sy - 12], [chx + chw - 10, sy + 44], [chx + 10, sy + 54]];
    WD.hatch(g, f, seat, { gap: 12, lw: 3.2, ang: -0.08, seed: 71, wob: 2 });
    WD.contour(g, f, seat.concat([seat[0]]), 5.5, { seed: 72, boil: 0.7, prof: function () { return 1; } });
    WD.carve(g, f, [[seat[3][0], seat[3][1]], [seat[2][0], seat[2][1]], [seat[2][0], seat[2][1] + 20], [seat[3][0], seat[3][1] + 20]],
      { seed: 76, jit: 1.8, seg: 40, holes: false });

    MV.focus(chx + chw / 2, sy + 26, 'empty seat');
    MV.overlay(function (o) {
      WD.lyric(o, f, { x: IL.LYRIC[0], y: IL.LYRIC[1], size: 44, font: 'lbl', align: 'left', mode: 'label', color: WD.ink, maxW: 1500 });
    });
  },
});
})();
