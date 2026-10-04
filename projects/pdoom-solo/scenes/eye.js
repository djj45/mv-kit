// eye — 一只刻出来的眼睛：上眼睑是一块实黑（眉毛是几道刀口），虹膜是一圈放射刻线，
// 瞳孔是一块留白，火花从瞳孔里一道道飞出来（每一道是一刀刻出来的白，末端点蓝墨）。
// 画面下半是一整片空纸 —— 歌词印在那里，不压眼睛（第一轮它压在上眼睑上）。
(function () {
'use strict';
const EYEX = 960, EYEY = 470, IR = 250, PR = 128;

MV.scene('eye', {
  render: function (g, f) {
    WD.ground(g, f, { ox: 0, oy: 0 });
    const gaze = Math.sin(f.t * 0.8) * 38, lift = Math.sin(f.t * 0.55 + 1) * 14;
    const cx = EYEX + gaze, cy = EYEY + lift;
    const grow = 1 + 0.06 * f.p;                       // 眼睛自己在放大：这是这一镜的"推"

    // 上眼睑 + 眉：一整块实黑
    const lid = [[-40, -40], [W + 40, -40], [W + 40, 150], [1620, 250], [1180, 330], [760, 330], [320, 250], [-40, 150]];
    WD.carve(g, f, lid, { seed: 4.4, jit: 5.5, seg: 90 });
    // 眉毛：三道刀口
    for (let i = 0; i < 3; i++) {
      WD.gouge(g, f, [[380 + i * 26, 60 + i * 34], [820 + i * 18, 26 + i * 36], [1300 - i * 30, 44 + i * 34], [1560, 84 + i * 32]], 18 - i * 3, { seed: 60 + i });
    }
    // 下眼睑：只留虹膜两侧很短的两段，中间让给歌词
    WD.hatch(g, f, [[120, 690], [420, 660], [560, 672], [560, 736], [420, 724], [120, 754]], { gap: 14, lw: 5, ang: -0.05, seed: 9, wob: 3 });
    WD.hatch(g, f, [[1800, 690], [1500, 660], [1360, 672], [1360, 736], [1500, 724], [1800, 754]], { gap: 14, lw: 5, ang: -0.05, seed: 10, wob: 3 });

    // 虹膜：一圈放射状的刻线
    g.save();
    g.beginPath(); g.arc(cx, cy, IR * grow, 0, Math.PI * 2); g.clip();
    WD.carve(g, f, WD.circlePts(cx, cy, IR * grow + 30, 40), { seed: 6.1, jit: 4, holes: false });
    for (let i = 0; i < 84; i++) {
      const a = i / 84 * Math.PI * 2 + noise1(i * 1.7, 3) * 0.03;
      const r0 = PR * grow * 1.15, r1 = IR * grow * (0.72 + 0.28 * hash(i, 5));
      WD.gouge(g, f, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], 5.5, { seed: 100 + i, pw: 0.15, rough: 0.5 });
    }
    g.restore();
    g.save(); g.beginPath(); g.arc(cx, cy, IR * grow, 0, Math.PI * 2); g.strokeStyle = WD.ink; g.lineWidth = 7; g.stroke(); g.restore();

    // 瞳孔：一块留白（刻穿的洞）
    WD.wipe(g, f, WD.circlePts(cx, cy, PR * grow, 34), { seed: 8.8, jit: 3 });
    // 瞳孔边上一圈红：AGI 就在里面
    g.save(); g.strokeStyle = WD.red; g.lineWidth = 5; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(cx, cy, PR * grow + 7, -0.5, Math.PI * 1.35); g.stroke(); g.restore();

    // 火花：一拍一道，从瞳孔里飞出来（不往下飞到歌词那一带）
    const b0 = Math.floor(f.audio.beatAt(f.from));
    g.save();
    for (let i = 0; i < 14; i++) {
      const tb = f.audio.timeOfBeat(b0 + 1 + i);
      const k = prog(f.t, tb, tb + 0.42, ease.outCubic);
      if (k <= 0) continue;
      const a = -Math.PI * 0.98 + hash(i, 21) * Math.PI * 1.55;      // 主要往上、往两边
      const len = (140 + 320 * hash(i, 33)) * k;
      const x0 = cx + Math.cos(a) * PR * grow * 0.9, y0 = cy + Math.sin(a) * PR * grow * 0.9;
      const x1 = cx + Math.cos(a) * (PR * grow * 0.9 + len), y1 = Math.min(700, cy + Math.sin(a) * (PR * grow * 0.9 + len));
      const mx = (x0 + x1) / 2 - Math.sin(a) * 24 * k, my = (y0 + y1) / 2 + Math.cos(a) * 24 * k;
      WD.gouge(g, f, [[x0, y0], [mx, my], [x1, y1]], 16, { seed: 200 + i, pw: 0.32 });   // 黑里的白
      WD.contour(g, f, [[x0, y0], [mx, my], [x1, y1]], 3.4, { seed: 260 + i, boil: 0.7, prof: function () { return 1; } });  // 纸上的黑
      g.globalAlpha = 0.85 * k;
      g.fillStyle = WD.blue;
      g.beginPath(); g.arc(x1, y1, 7 + 5 * f.a.onset * k, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
    g.restore();

    MV.focus(cx, cy, 'pupil');
    // 歌词印在眼睛下面那片空纸上（不要底条）；insert 在这一镜里会推进瞳孔，字在屏幕层不受影响
    MV.overlay(function (o) {
      WD.lyric(o, f, { x: 960, y: 960, size: 96, align: 'center', mode: 'ink', color: WD.ink, maxW: 1560, hot: [7, 8] });
    });
  },
});
})();
