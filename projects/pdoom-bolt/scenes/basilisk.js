// basilisk — 17（60.58–62.54，VOID）。HERO：一条由线段绕成的螺旋（蛇形示意图，占中），绕着中心转，
// 最里面一只小光圈当眼睛（12 片叶片就是全片那只眼睛）。字在下。
// 拍点：每拍收一圈（画到的长度落到拍上）；唱到 "boom" 时螺旋炸开——线段往外飞、光圈全开、冲击环、单帧白闪。
const BAS_TURNS = 4, BAS_N = 352;

MV.scene('basilisk', {
  init() {
    // 对数螺线（外 → 内）：绕 4 圈收到 r = 0.30，正好把 ro = 0.245 的小光圈包在最里面。
    const pts = [];
    for (let i = 0; i <= BAS_N; i++) {
      const u = i / BAS_N, a = u * BAS_TURNS * TAU, r = 0.30 + 0.85 * Math.pow(1 - u, 0.92);
      pts.push([Math.cos(a) * r, Math.sin(a * 0.5) * 0.055, Math.sin(a) * r * 0.68]);
    }
    const seg = new Float32Array(BAS_N * 8), br = new Float32Array(BAS_N);
    for (let i = 0; i < BAS_N; i++) {
      const A = pts[i], B = pts[i + 1];
      br[i] = 0.30 + 0.70 * Math.pow(i / BAS_N, 0.7);            // 越往里越亮：光是被眼睛吸进去的
      seg.set([A[0], A[1], A[2], B[0], B[1], B[2], br[i], 0], i * 8);
    }
    this.pts = pts; this.br = br; this.seg = seg;
    this.scratch = new Float32Array(seg.length);                 // 炸开用的缓冲（init 里建好，render 里只填）
    this.eye = PART.irisParts(12, { ro: 0.245, ri: 0.052, thick: 0.018, rn: 40 });
    this.cam = lmOrbit({ yaw: 0, pitch: 0.86, dist: 5.55, fov: 22, shift: [0, -120] });
  },
  /** 一句里某个词开始的时间（扫一遍全片，确定性的；找不到就退回镜头开头）。 */
  word(f, s) {
    const L = f.lyrics.lines, q = String(s).toLowerCase();
    for (let i = 0; i < L.length; i++) for (let k = 0; k < L[i].words.length; k++) {
      const w = L[i].words[k];
      if (w.w.toLowerCase().indexOf(q) === 0) return w.start;
    }
    return f.from + 0.4;
  },
  /** 把一行歌词塞进 maxW（字体可能被替换，所以要量出来再定尺寸）。 */
  fit(g, text, size, maxW) {
    if (!text) return size;
    const w = LK.measure(g, text, size, { track: 0.02 });
    return w > maxW ? size * maxW / w : size;
  },
  render(g, f) {
    const boomT = Math.min(this.word(f, 'boom'), f.to - 0.34);
    const K = clamp((f.t - boomT) / 0.55);                        // 炸开进度
    const beats = f.audio.beats;
    let bi = 0;
    for (let i = 0; i < beats.length; i++) { const b = beats[i]; if (b > f.t) break; if (b >= f.from) bi++; }
    const coil = clamp((bi + ease.outCubic(f.beatPhase == null ? 0 : f.beatPhase)) / 3.6);
    const upto = K > 0.001 ? 1 : clamp(0.30 + 0.70 * coil);
    const spin = f.t * 0.5 + 0.24 * bi + 2.6 * ease.outCubic(K);

    // 炸开：每一段沿自己的半径往外飞 + 抛起来，同时变暗（几何是 init 里那一份，这里只位移）
    if (K > 0.001) {
      const e = ease.outCubic(K);
      for (let i = 0; i < BAS_N; i++) {
        const A = this.pts[i], B = this.pts[i + 1], s = i * 8;
        const ra = Math.hypot(A[0], A[2]) || 1e-3, rb = Math.hypot(B[0], B[2]) || 1e-3;
        const ga = e * (0.45 + 1.9 * hash(i, 11, 5)), gb = e * (0.45 + 1.9 * hash(i, 11, 6));
        const ya = e * (hash(i, 12, 7) - 0.30) * 1.8, yb = e * (hash(i, 12, 8) - 0.30) * 1.8;
        const fade = 1 - 0.82 * K;
        this.scratch.set([
          A[0] + (A[0] / ra) * ga, A[1] + ya, A[2] + (A[2] / ra) * ga,
          B[0] + (B[0] / rb) * gb, B[1] + yb, B[2] + (B[2] / rb) * gb,
          this.br[i] * fade, 0], s);
      }
    }

    lmBegin(LK.palVoid());
    const cam = this.cam;
    lmLines(cam, K > 0.001 ? this.scratch : this.seg, {
      width: 1.7, color: 'accent', gain: 0.40 + 0.26 * f.a.kick + 0.22 * K, glow: 0.7,
      upto: upto, model: { rot: [0, spin, 0] },
    });
    // 眼睛：小光圈（12 片），开度跟着歌走，炸开时全开
    const open = clamp(0.30 + 0.60 * LK.in(f, 1.05) + 0.16 * f.a.kick + 0.45 * K);
    lmLines(cam, PART.irisSegs(this.eye, open), {
      width: 1.9, color: 'fg', gain: 0.50 + 0.40 * K, glow: 0.85,
      model: { rot: [Math.PI / 2, spin * 1.7, 0] },
    });
    // 全帧唯一的最亮处：瞳孔
    const c = cam.project([0, 0, 0]) || [960, 424];
    const eyeR = 0.245 * cam.px(cam.focus);
    const gl = lmGlow();
    gl.save(); gl.globalCompositeOperation = 'lighter';
    BOLT.radial(gl, c[0], c[1], eyeR * (2.4 + 3.4 * K), LK.blue, 0.34 + 0.30 * K, { core: 0.16 });
    BOLT.plasma(gl, c[0], c[1], eyeR * (0.20 + 0.85 * K), f.t, { alpha: 0.40 + 0.4 * K });
    if (K > 0.002) BOLT.ring(gl, c[0], c[1], clamp(K * 1.2), { r0: eyeR, r1: 1150, color: LK.blue, core: LK.hot, w: 3.4, a: 0.8 });
    gl.restore();
    lmEnd(g, { bloom: 0.95 });

    lmTag(g, 'DIAGRAM 17 — BASILISK / SEGMENT COIL', 120, 96, { size: 15, track: 0.3, color: 'dim', align: 'left' });
    lmTag(g, 'TURNS ' + (upto * BAS_TURNS).toFixed(2) + ' / ' + BAS_TURNS, W - 120, 96, { size: 15, track: 0.3, color: 'accent', align: 'right' });
    const cur = TY.current(f, f.from);
    const size = this.fit(g, cur ? cur.line.text : '', 150, 1560);
    TY.line(g, f, { reg: 'void', treat: 'slam', x: 960, y: 930, size: size, since: f.from });
    return { grain: 0.03, vignette: 0, flash: f.t >= boomT && f.t < boomT + 0.07 ? 0.18 : 0 };
  },
});
