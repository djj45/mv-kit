// loom — 乐章 8 第六镜（2:05.70–2:07.52，短）。VOID：一台织机在织一块"图"。
// HERO：PART.loom（4.0 × 2.6 的机框 + 22 根经线）≥58%。纬线一拍穿一根，织出的布从上面往下长；
// "by Loom" 唱到时，布上浮出机器自己的线框轮廓（THE CELL 的点阵）—— 它织出来的是它自己。
// 字区：T[41] 'weave'，放在上三分之一（织机占中下）。
MV.scene('loom', {
  init() {
    this.W0 = 4.0; this.H0 = 2.6; this.ZC = -0.15;      // 布面
    this.WARP = 22;
    const L = PART.loom(this.WARP, this.W0, this.H0, { wire: 0.016 });
    this.loomSegs = S3.wireSegs(L, { bright: 0.9 });
    // 纬线：12 根，从上往下排（用 upto 控制织到第几根）
    this.NW = 12;
    this.weftSegs = new Float32Array(this.NW * 8);
    for (let i = 0; i < this.NW; i++) {
      const y = this.H0 / 2 - (i + 0.5) * (this.H0 / this.NW), s = i * 8;
      this.weftSegs[s] = -this.W0 / 2; this.weftSegs[s + 1] = y; this.weftSegs[s + 2] = this.ZC;
      this.weftSegs[s + 3] = this.W0 / 2; this.weftSegs[s + 4] = y; this.weftSegs[s + 5] = this.ZC;
      this.weftSegs[s + 6] = 1; this.weftSegs[s + 7] = 3;
    }
    // 布上的"图"：THE CELL 的光圈（12 片，躺在织物平面里）织进布里 —— 它织出来的是它自己的眼睛
    const IP = PART.irisParts(12, { ro: 0.92, ri: 0.30, thick: 0.05, rn: 40 });
    const wire = PART.irisSegs(IP, 0.72);
    const pat = [], pts = [];
    for (let i = 0; i < wire.length; i += 8) {
      pat.push([[wire[i], wire[i + 1], this.ZC - 0.03], [wire[i + 3], wire[i + 4], this.ZC - 0.03]]);
      pts.push(wire[i], wire[i + 1], this.ZC - 0.02);
    }
    this.patSegs = LG.pairs(pat, { bright: 0.8 });
    this.patPts = new Float32Array(pts);
    // 梭子（自己在动的那一根）
    this.shuttle = new Float32Array(8);
  },

  render(g, f) {
    const cam = lmOrbit({ yaw: 0.30 + 0.08 * LK.in(f, f.dur), pitch: 0.10, dist: 6.6, fov: 33, target: [0, -0.05, 0] });
    const b0 = f.audio.beatAt(f.from);
    const db = f.beat - b0;                                    // 镜内过了几拍
    const nw = clamp(4 + Math.floor(db), 4, this.NW);          // 每拍穿一根纬线
    const bp = db - Math.floor(db);                            // 拍内相位：梭子正在横穿
    const yTop = this.H0 / 2 - (nw - 0.5) * (this.H0 / this.NW);
    const patK = prog(f.t, 127.08, 127.50, ease.outCubic);      // "by Loom"：布上浮出自己的图
    // 梭子：一拍从左到右，下一拍从右到左
    const dir = Math.floor(db) % 2 ? -1 : 1;                   // 一拍往右、一拍往左
    const sxx = lerp(-this.W0 * 0.5, this.W0 * 0.5, dir > 0 ? bp : 1 - bp);
    const sy = yTop - this.H0 / this.NW * 0.5;
    this.shuttle.set([sxx, sy, this.ZC + 0.12, sxx, sy, this.ZC + 0.12, 1, 3]);

    lmBegin(LK.palVoid());
    lmLines(cam, this.loomSegs, { width: 1.4, color: 'dim', gain: 0.62, glow: 0.45 });
    lmLines(cam, this.weftSegs, { width: 1.7, color: 'warn', gain: 0.85, glow: 0.7, upto: nw / this.NW });
    // 已经织出来的那块布：一层很淡的网格（布的质地），只在织到的范围内
    lmLines(cam, this.patSegs, { width: 1.1, color: 'accent', gain: 0.20 + 0.75 * patK, glow: 0.9, dash: [4, 7] });
    lmPoints(cam, this.patPts, { size: 1.6, color: 'accent', gain: 0.10 + 0.85 * patK, twinkle: 0.25, t: f.t });
    lmLines(cam, this.shuttle, { width: 4.6, color: 'accent', gain: 1.5, glow: 1.4 });

    const gl = lmGlow();                                       // 梭子尖上的一点白热：这一帧最亮
    const st = cam.project([sxx, sy, this.ZC + 0.12]);
    if (st) {
      BOLT.radial(gl, st[0], st[1], 60, LK.blue, 0.5);
      BOLT.plasma(gl, st[0], st[1], 8, f.t, { alpha: 0.55 });
      BOLT.draw(gl, BOLT.pathBetween([-this.W0 * 0.5 * 280 + 960, st[1]], [st[0], st[1]], { tick: f.tick, seed: 21, jag: 0.02, depth: 3 }),
        { w: 1.6, color: LK.blue, core: LK.arc, gain: 0.5 });
    }
    lmEnd(g, { bloom: 0.92 });

    lmTag(g, 'LOOM \u2014 WEFT ' + nw + ' / ' + this.NW + ' \u00b7 WARP ' + this.WARP, 120, 96,
      { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, patK > 0.05 ? 'THE CLOTH SHOWS ITSELF' : 'ONE WEFT PER BEAT', W - 120, 96,
      { size: 15, track: 0.3, color: patK > 0.05 ? 'accent' : 'dim', align: 'right' });
    TY.line(g, f, { reg: 'void', x: 960, y: 308, size: 132, align: 'center' });
    return { grain: 0.03, vignette: 0, flash: 0.05 * patK * (1 - patK) * 4 };
  },
});
