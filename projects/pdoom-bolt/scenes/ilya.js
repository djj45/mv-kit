// ilya — 乐章 9 的第一镜（2:11.15–2:16.61，全片最大的一只眼）。VOID。
// HERO：闭合中的 12 片光圈（外径 2.2 世界单位 → 直径 ≈1470 px，占画面 ≥82%）≥80%。
// 节奏：每个小节头合 1/4（131.15 / 132.97 / 134.79 / 136.61），合上前中心留着一点白
// （BOLT.plasma 的一小点）；"know"（134.34）唱完之后那点白熄掉，最后半小节只剩叶片在合。
// 这一镜要慢、要大、要空：镜头几乎不动，画面里除了光圈和那点白没有别的东西。
// 字区：T[44] 'quiet'，放在最下面一条（光圈之内，但那一带只有很暗的叶片）。
MV.scene('ilya', {
  init() {
    this.P = PART.irisParts(12, { ro: 2.2, ri: 0.22, thick: 0.05, rn: 48 });
    this.segs = PART.irisSegs(this.P, 0);      // 占位，每帧按开度重算
  },

  /** 这一帧合到几分之几：小节头各 1/4，落点是小节头（外加速度是连续的）。 */
  closure(f) {
    const bars = f.audio.downbeats;
    let k = 0;
    for (const b of bars) {
      if (b < f.from - 0.05) continue;                            // 只数这一镜里的小节头
      if (f.t <= b - 0.34) break;
      k += 0.25 * ease.outCubic(clamp((f.t - (b - 0.34)) / 0.46));
    }
    // 最后一拍把剩下的这 1/4 合完：切点上眼睛是全合的
    return clamp(k + 0.25 * ease.inCubic(prog(f.t, f.to - 0.75, f.to - 0.08)), 0, 1);
  },

  render(g, f) {
    const cl = this.closure(f);                     // 0 = 全开，1 = 合上
    const open = cl;                                // PART 的 open：1 = 中心只剩 ri
    const cam = lmOrbit({ yaw: 0.10 + 0.05 * LK.in(f, f.dur), pitch: 0.10, dist: 6.4 - 0.5 * cl, fov: 30, target: [0, -0.42, 0] });
    const segs = PART.irisSegs(this.P, open);
    const hole = PART.irisHole(this.P, open);       // 中心孔的半径（世界单位）

    lmBegin(LK.palVoid());
    // 光圈本体：暗钢蓝的线框（它把整个画面填满，但一点都不抢）
    lmLines(cam, segs, { width: 1.25, color: 'warn', gain: 0.26 + 0.20 * cl, glow: 0.40 });
    // 外圈：一道更亮的环（这只眼睛的镜筒）
    const ringSegs = PART.irisSegs({ blades: [], pivot: [], ring: this.P.ring, hub: null, ri: this.P.ri, ro: this.P.ro, n: 12, L: this.P.L, w: this.P.w }, open);
    lmLines(cam, ringSegs, { width: 2.0, color: 'accent', gain: 0.50 + 0.30 * cl, glow: 0.8 });

    const gl = lmGlow();
    // 中心孔里的那一点白：合上前它一直在（这是这一镜唯一最亮的地方）
    const die = 1 - prog(f.t, 134.50, 135.30, ease.inOutCubic);   // "know"（134.34）之后熄掉
    const cp = cam.project([0, 0, 0]);
    if (cp && die > 0.001) {
      const pulse = 1 + 0.10 * Math.sin(f.t * 2.2) + 0.25 * f.a.kick;
      const r = clamp(hole * 315 * 0.055, 3.0, 15) * pulse * (0.45 + 0.55 * die);   // 就是一小点白
      BOLT.plasma(gl, cp[0], cp[1], r, f.t, { alpha: 0.85 * die, color: LK.blue, core: '#FFFFFF' });
      // 孔沿上的一圈极细的亮环：告诉眼睛"里面还有东西"
      gl.save(); gl.globalCompositeOperation = 'lighter';
      gl.strokeStyle = LK.a(LK.ice, 0.35 * die); gl.lineWidth = 1.2;
      gl.beginPath(); gl.arc(cp[0], cp[1], Math.max(6, hole * 336), 0, TAU); gl.stroke();
      gl.restore();
    }
    lmEnd(g, { bloom: 0.95 });

    lmTag(g, 'IRIS \u2014 CLOSING \u00b7 ' + Math.round(cl * 100) + '%', 120, 96,
      { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, die > 0.02 ? 'ONE WHITE POINT INSIDE' : 'AND THEN IT IS DARK', W - 120, 96,
      { size: 15, track: 0.3, color: die > 0.02 ? 'accent' : 'dim', align: 'right' });
    TY.line(g, f, { reg: 'void', x: 960, y: 268, size: 128, align: 'center' });   // 最后那一问：挪到上方，大一点，留白给合上的眼
    return { grain: 0.03, vignette: 0 };
  },
});
