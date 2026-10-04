// accel — "optimizing, accelerating"（45.06–49.56，约 4.5 s）。镜头被推进一串环列里，越往后越快。
// HERO：加速中的环列（每个环直径约 120% 画面宽，一串套着镜头）。镜头语言：cam 沿 +z 穿过环心
// （连续的 f.t，机械、没有手抖）；每个 kick 上整个环列顿一下。47.30 s（"accelerating" 唱到时）之后，
// 最近的几个环沿运动方向拖出速度线——把环的线段缓冲复制几份、越拖越暗。
// 字区：下部（treatment 'dimension'，字骑在一条刻度线上）；暗、锐利、不发光。一帧一处最亮：正在穿过的那只环。
MV.scene('accel', {
  init() {
    this.R = 3.7;                          // 环半径（世界单位）：最近的一只环直径约 1.9 倍画面宽
    this.N = 48;                           // 每个环的段数
    this.M = 76;                           // 环的数量
    this.GAP = 2.45;                       // 环的机械节距
    this.buf = new Float32Array(this.M * this.N * 8);        // 世界坐标线段，init 里建一次
    this.cen = new Float32Array(this.M * 2);                 // 每个环的环心（不在同一条直线上：环列是"偏的"）
    this.trail = new Float32Array(8 * this.N * 8 * 4);       // 速度线的输出缓冲（render 里填，不新建大数组）
    for (let i = 0; i < this.M; i++) {
      const z = -i * this.GAP;
      // 环心沿一个很缓的螺旋偏：镜头从环列中间穿过去，环一个一个掠过画面（不是同心隧道）
      const cx = 1.25 * Math.sin(i * 1.9), cy = 1.55 + 0.85 * Math.cos(i * 1.35);
      this.cen[i * 2] = cx; this.cen[i * 2 + 1] = cy;
      for (let k = 0; k < this.N; k++) {
        const a = k / this.N * TAU, b = (k + 1) / this.N * TAU, o = (i * this.N + k) * 8;
        this.buf[o] = cx + Math.cos(a) * this.R; this.buf[o + 1] = cy + Math.sin(a) * this.R; this.buf[o + 2] = z;
        this.buf[o + 3] = cx + Math.cos(b) * this.R; this.buf[o + 4] = cy + Math.sin(b) * this.R; this.buf[o + 5] = z;
        this.buf[o + 6] = 1; this.buf[o + 7] = 0;
      }
    }
  },
  /** 镜头走过的路程：慢起 → 越走越快，每个 kick 上整个环列被推一下（然后收住）。 */
  travel(f) {
    const lt = f.lt;
    const s = lerp(0.45, 4.4, ease.inQuad(clamp(lt / 4.5)));   // 0.45 → 4.4 单元 / 秒：四拍里涨十倍
    let d = 0.45 * lt + (s - 0.45) * lt * 0.5;
    for (const ev of f.audio.events('kick', f.t - 0.9, f.t).slice(-4)) d += 1.05 * Math.exp(-(f.t - ev.t) / 0.26);
    return d;
  },
  render(g, f) {
    const travel = this.travel(f);
    lmBegin(LK.palVoid());
    // 镜头贴着环心往 +z 走；一点横移和俯仰，让环是"套"上来的，不是贴片。
    // 起点偏 0.42 个节距：45.06 s 切进来的第一帧就在两只环之间，最近的环占画面一半宽。
    const COFF = 0.42 * this.GAP;
    const cam = lmCamera({
      // 眼高 1.55 = 环列轴心的高度：视线和环列轴线平行，最近的环只从画面上半掠过，
      // 下半留出一条黑带给字（字不许压在 HERO 上）。
      eye: [0.13 * Math.sin(f.t * 0.9), 1.55 + 0.07 * Math.sin(f.t * 0.7), travel + COFF],
      target: [0, 1.55, travel + COFF - 6],     // 朝 −z 看：环在 z 越来越负的方向上
      fov: 40, near: 0.05, far: 300, focus: 3.4,
    });
    // 最近的这只环就是 HERO 的焦点，也是全帧唯一的最亮处
    const lead = Math.max(0, Math.ceil(travel / this.GAP - 0.42));
    const leadZ = lead * this.GAP - travel - COFF;
    const heat = clamp(1 - Math.abs(leadZ) / 1.5);

    // 环列本体：远处亮一档、近处压暗（密度堆在最里面的那一圈），78 单元外淡出
    const vis = [];
    let vn = 0;
    for (let i = 0; i < this.M; i++) {
      const z = -i * this.GAP - travel - COFF;
      if (z > 0.3 || z < -55) continue;
      vis[vn * 3] = i; vis[vn * 3 + 1] = -i * this.GAP; vn++;   // 存世界 z；相机空间的 z 后面再减
    }
    const body = new Float32Array(vn * this.N * 8);
    for (let v = 0; v < vn; v++) {
      const i = vis[v * 3], dz = vis[v * 3 + 1] - travel - COFF;
      const br = 0.42 + 0.95 * Math.pow(clamp(-dz / 55), 1.15);
      for (let k = 0; k < this.N; k++) {
        const s = (i * this.N + k) * 8, o = (v * this.N + k) * 8;
        body[o] = this.buf[s]; body[o + 1] = this.buf[s + 1]; body[o + 2] = dz;
        body[o + 3] = this.buf[s + 3]; body[o + 4] = this.buf[s + 4]; body[o + 5] = dz;
        body[o + 6] = br; body[o + 7] = 0;
      }
    }
    lmLines(cam, body, { width: 1.15, color: LK.steel2, gain: 1, glow: 0.35, glowR: 3, fog: 150 });
    lmLines(cam, body, { width: 1, color: 'accent', gain: 0.9, glow: 0.5, fog: 150 });

    // 节距撑杆：把环列做成一台"机器"（每 60° 一道细纵梁，暗到几乎看不见）
    const rails = [];
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU + 0.26, c = Math.cos(a) * this.R, s = Math.sin(a) * this.R;
      rails.push(c, s, 0.2, c, s, -(this.M - 1) * this.GAP, 0.24, 0);
    }
    lmLines(cam, new Float32Array(rails), { width: 0.9, color: LK.steel2, gain: 1, glow: 0.2, fog: 150 });

    const gl = lmGlow();
    gl.save(); gl.globalCompositeOperation = 'lighter';

    // ── 速度线：47.30 s 之后，最近的 4 只环沿 −z 复制 4 份、亮度递减
    const spd = clamp((f.t - 47.30) / 1.1);
    if (spd > 0.001) {
      let tn = 0;
      for (let v = vn - 1; v >= 0 && v >= vn - 4; v--) {
        const i = vis[v * 3];
        const dz = vis[v * 3 + 1] - travel - COFF;        // 这只环在相机空间的位置
        if (dz > -3.2) continue;                          // 太贴脸的环不拖（会糊成一片）
        for (let c = 0; c < 4; c++) {
          const back = -1.15 - 0.85 * c;
          for (let k = 0; k < this.N; k++) {
            const s = (i * this.N + k) * 8, o = tn * 8;
            this.trail[o] = this.buf[s]; this.trail[o + 1] = this.buf[s + 1]; this.trail[o + 2] = dz + back;
            this.trail[o + 3] = this.buf[s + 3]; this.trail[o + 4] = this.buf[s + 4]; this.trail[o + 5] = dz + back;
            this.trail[o + 6] = (0.85 - 0.16 * c) * spd * clamp(-dz / 10);
            this.trail[o + 7] = 0;
            tn++;
          }
        }
      }
      if (tn) lmLines(cam, this.trail.subarray(0, tn * 8), { width: 1, color: LK.deep, gain: 1, glow: 0.6, glowR: 5 });
    }

    // ── 最近的这只环：细 + 亮（HERO 的焦点）
    const lcx = this.cen[lead * 2], lcy = this.cen[lead * 2 + 1];
    const ringSegs = [], spokes = [];
    for (let k = 0; k < this.N; k++) {
      const a = k / this.N * TAU, b = (k + 1) / this.N * TAU;
      ringSegs.push(lcx + Math.cos(a) * this.R, lcy + Math.sin(a) * this.R, leadZ,
        lcx + Math.cos(b) * this.R, lcy + Math.sin(b) * this.R, leadZ, 1.5, 0);
    }
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * TAU + Math.PI / 8;
      spokes.push(lcx + Math.cos(a) * this.R * 0.90, lcy + Math.sin(a) * this.R * 0.90, leadZ,
        lcx + Math.cos(a) * this.R * 1.05, lcy + Math.sin(a) * this.R * 1.05, leadZ, 0.55, 0);
    }
    lmLines(cam, new Float32Array(ringSegs), { width: 1.5, color: LK.ice, gain: 1, glow: 0.85, glowR: 4 });
    lmLines(cam, new Float32Array(spokes), { width: 1, color: LK.ice, gain: 0.9, glow: 0.5 });

    // 白热轮缘：整个画面只有这一处（在环心上，随穿过与否呼吸）
    const c0 = cam.project([lcx, lcy, leadZ]);
    if (c0) BOLT.plasma(gl, c0[0], c0[1], LK.PX(17 + 11 * heat), f.t, { color: LK.ice, core: '#FFFFFF', alpha: 0.30 + 0.45 * heat });
    gl.restore();
    lmEnd(g, { bloom: 0.78 + 0.35 * spd, exposure: 1, radius: 0.55 });

    // ── 泛光之后：锐利的东西。世界内读数只有一处，且贴着环列
    if (c0) {
      // 读数钉在左上的黑区（不压在环心那一团光上，也不压字）
      lmLabel(g, 340, 300, 'v ' + (0.45 + 4.0 * clamp(f.lt / f.dur)).toFixed(2) + ' u/s',
        { draw: LK.in(f, 0.5), dx: LK.PX(96), dy: LK.PX(-70), size: LK.PX(15), color: 'accent' });
    }
    lmTag(g, 'RING COLUMN ' + String(lead + 1).padStart(2, '0') + ' / ' + this.M, 142, 966,
      { size: LK.PX(15), track: 0.3, color: 'dim', align: 'left' });

    // 字：TREATMENT 里 line 14 是 'dimension'（字骑在尺寸线上），字号 140。
    // 这一句唱完有 31 个字符，108 号会顶到右边缘——按实际字数缩到能放进 [96, W-96] 的字号。
    // 位置压到画面最下沿（y 1006）：环列在这一带只剩最外面一圈很淡的弧，字不会压在环心那一团光上。
    const li = TY.current(f);
    const txt = li ? li.line.text : '';
    const size = txt ? Math.min(96, 1750 / (txt.length * 0.68)) : 96;
    TY.line(g, f, { reg: 'void', size: size, pos: [960, 958] });

    return { grain: 0.03, vignette: 0, shake: f.a.kick * 2.2, zoom: 1 + 0.012 * f.a.kick };
  },
});
