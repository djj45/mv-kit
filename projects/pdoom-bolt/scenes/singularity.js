// singularity — 乐章 4 的爆点（约 41.2–45.1 s）。全片最亮的一镜，也是唯一允许出现电青 #7FF3FF 的 3.7 秒。
// HERO：被点燃的核心（占 85%）。结构：内爆 → 点火 → 冲击环 → 电弧爬满三道具环。
// 拍点：点火的瞬间落在 kick 上；之后每拍一个冲击环；字的电弧扫过跟着拍。
MV.scene('singularity', {
  init() {
    const N = 5200;
    this.N = N;
    this.P0 = LG.ball(N, 1.5, { seed: 3 });          // 散着的等离子
    this.P1 = LG.ball(N, 0.20, { seed: 4 });         // 被压到一点
    this.P2 = LG.ball(N, 2.05, { seed: 5 });         // 炸开（不铺满画面：冲击靠环和电弧，不靠星云）
    this.out = new Float32Array(N * 3);
    this.cell = PART.cellParts({ R: 1 });
    this.wires = [S3.wireSegs(this.cell.frame, { bright: 0.6 })].concat(this.cell.rings.map(r => S3.wireSegs(r, { bright: 0.8 })));
    this.pins = this.cell.pins.map(p => S3.wireSegs(p, { bright: 0.7 }));
    this.iris = PART.irisParts(12, { ro: 0.92, ri: 0.09, thick: 0.04, rn: 64 });
  },
  render(g, f) {
    const t0 = f.from;
    const lt = f.t - t0;
    const IGNITE = 1.05;                                  // 内爆结束、点火的瞬间
    const ph = clamp((lt - IGNITE) / 0.30);               // 点火 0..1
    const burst = clamp((lt - IGNITE - 0.06) / 0.5);      // 冲击波
    const live = lt > IGNITE;                             // 已经点着了
    lmBegin(LK.palVoid());
    const cam = lmOrbit({ yaw: 0.42 + lt * 0.10, pitch: 0.24 + 0.06 * Math.sin(lt * 0.7), dist: 6.6 - 1.1 * ease.outCubic(clamp(lt / 1.3)), fov: 34 });

    // 三道具环 + 外框 + 电极（结构：光最暗的一层）
    for (let i = 0; i < this.wires.length; i++) {
      const w = this.wires[i];
      lmLines(cam, w, { width: i === 0 ? 1.3 : 1.0, color: i === 0 ? 'fg' : 'accent', gain: i === 0 ? 0.16 : 0.30 + 0.30 * ph, glow: 0.4 });
    }
    for (const p of this.pins) lmLines(cam, p, { width: 1.0, color: 'dim', gain: 0.5 });
    // 内爆 / 炸开的等离子
    if (!live) {
      const k = ease.inCubic(clamp(lt / IGNITE));
      lmMorph(this.P0, this.P1, k, { out: this.out, stagger: 0.35, swirl: 0.9, seed: 7 });
    } else {
      const k = ease.outExpo(clamp((lt - IGNITE) / 0.85));
      lmMorph(this.P1, this.P2, k, { out: this.out, stagger: 0.2, swirl: 0.5, seed: 8 });
    }
    lmPoints(cam, this.out, { size: 1.1 + 0.7 * ph, gain: 0.26 + 0.4 * ph, dof: 2.6, twinkle: live ? 0.45 : 0.12, t: f.t, dynamic: true });

    // 电弧 + 白热核心 + 冲击环（全部画进泛光层）
    const gl = lmGlow();
    gl.save();
    const c = cam.project([0, 0, 0]);
    const cx = c[0], cy = c[1];
    if (live) {
      // 电极 → 核心的电弧，每个 tick 换形
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + Math.PI / 6;
        const e = cam.project([Math.cos(a) * 2.05, Math.sin(a) * 2.05, 0]);
        BOLT.strike(gl, [e[0], e[1]], [cx + (hash(i, 3, f.tick) - 0.5) * 18, cy + (hash(i, 5, f.tick) - 0.5) * 18],
          { tick: f.tick + i * 7, seed: i + 2, w: 3.4 * (0.5 + ph), jag: 0.18, branch: 2, branchLen: 70 });
      }
      // 白热核心 + 一圈电青（全片唯一一次）
      BOLT.plasma(gl, cx, cy, LK.PX(30 + 60 * ph), f.t, { color: LK.blue, core: '#FFFFFF', alpha: 0.5 + 0.5 * ph });
      gl.save(); gl.globalCompositeOperation = 'lighter';
      BOLT.radial(gl, cx, cy, LK.PX(300 * ph + 60), LK.rare, 0.28 * ph, { core: 0.25 });
      gl.restore();
      // 冲击环：每个 kick 一个，从核心扩到画外
      const ks = f.audio.events('kick', t0, f.t).slice(-4);
      ks.forEach((ev, i) => {
        const k = clamp((f.t - ev.t) / 1.1);
        if (k <= 0 || k >= 1) return;
        BOLT.ring(gl, cx, cy, k, { r0: 20, r1: 980, color: i === ks.length - 1 ? LK.arc : LK.blue, core: LK.rare, w: 4, a: 0.55 });
      });
    } else {
      // 点火前：只有一圈很细的、正在收紧的环
      gl.strokeStyle = LK.a(LK.blue, 0.7); gl.lineWidth = 2;
      gl.beginPath(); gl.arc(cx, cy, LK.PX(230 * (1 - ease.inCubic(clamp(lt / IGNITE)) * 0.82)), 0, TAU); gl.stroke();
    }
    gl.restore();
    lmEnd(g, { bloom: live ? 1.05 : 0.7, exposure: live ? 1.0 : 0.9, ca: 0.18 });

    // 泛光之后：锐利的字 + 一处读数（贴着主角）
    const nm = cam.project([0, 0, 0]);
    lmLabel(g, nm[0] + LK.PX(150), nm[1] - LK.PX(60), 'CORE ' + (live ? 'LIT' : 'ARMED'), { draw: LK.in(f, 0.5), dx: LK.PX(60), dy: LK.PX(-70), size: LK.PX(15), color: 'accent' });
    lmTag(g, 'T + ' + lt.toFixed(2) + ' s  /  ' + (live ? 'IGNITION' : 'IMPLOSION'), 120, 96, { size: LK.PX(15), track: 0.3, color: 'dim', align: 'left' });
    TY.line(g, f, { reg: 'void', x: 150, y: 214, size: 116, align: 'left', words: [0, 3] });
    TY.line(g, f, { reg: 'void', x: 960, y: 898, size: 208, align: 'center', words: [3, 5] });

    // 点火那一瞬：3 帧负片 + 白闪 + 撕裂
    const neg = lt > IGNITE - 0.02 && lt < IGNITE + 0.075;
    return {
      grain: 0.03, vignette: 0,
      flash: clamp((ph - 0.05) * (1 - ph) * 3.2) + f.a.kick * 0.10,
      invert: neg ? 1 : 0,
      glitch: neg ? 0.5 : clamp((lt - IGNITE - 0.1) / 1.2) * 0.25 * (1 - clamp((lt - IGNITE) / 2)),
      shake: f.a.kick * 9 + burst * (1 - burst) * 14,
      zoom: 1 + 0.03 * Math.sin(lt * 2.2) * ph,
    };
  },
});
