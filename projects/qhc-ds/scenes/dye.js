// 镜头 6 — 上色（主歌第 8–11 句）。影人举在灯前，半透明的皮透着光；
// 他一遍一遍把靛青刷上衣服（每刷一遍透光度不同），"嫣然"时补上嘴角那一刀，
// "含苞待放"时她的手指第一次自己张开。
MV.scene('dye', {
  render(g, f) {
    const t = f.t;
    const lx = W * 0.15, ly = H * 0.66;
    const light = clamp(0.90 + 0.04 * noise1(t * 4.1, 17) + 0.05 * f.a.rms);
    screenCloth(g, { light, lx, ly, r0: H * 0.74, seed: 19 });
    lamp(g, lx, ly, t, { scale: 1.1, light: 1, h: 66 });

    const L1 = f.lyrics.get('釉色'), L2 = f.lyrics.get('韵味');
    const L3 = f.lyrics.get('而你'), L4 = f.lyrics.get('如含');
    const w = L1.words.concat(L2.words);                                        // 11 个字 = 五遍色
    let k = 0;
    for (const wd of w) k += clamp((t - wd.start) / Math.max(0.05, wd.end - wd.start)) / w.length;
    const mouth = prog(t, L3.words[3].start, L3.words[3].start + 0.35, ease.outCubic);  // "一"笑：补嘴角那一刀
    const open = prog(t, L4.words[2].start, L4.words[3].start + 0.5, ease.inOutCubic);  // "待"放：手指张开
    const pose = QHC.puppetPose(t, { mouth, open, arm: 0.22 });

    const LP = 900, zPup = 70, zHand = 260;
    const kOf = z => LP / (LP - z);
    const feet = [W * 0.50, H * 0.92], s = 1.42;
    const toLayer = (p, z) => { const r = kOf(zPup) / kOf(z); return [lx + (p[0] - lx) * r, ly + (p[1] - ly) * r]; };

    // 靛青是"一遍一遍刷"上去的：五道刷痕，一道比一道浓，中间留出还透光的琥珀
    const strokes = [
      { pts: [[-48, -302], [0, -314], [46, -298]], w: 54, tone: '84,130,176', a: 0.34 },
      { pts: [[-54, -252], [0, -266], [52, -248]], w: 58, tone: '62,110,158', a: 0.36 },
      { pts: [[-54, -198], [0, -214], [52, -194]], w: 64, tone: '44,90,140', a: 0.38 },
      { pts: [[-62, -136], [0, -154], [60, -132]], w: 72, tone: '28,68,116', a: 0.40 },
      { pts: [[-70, -66], [0, -86], [70, -62]], w: 86, tone: '16,46,86', a: 0.42 },
    ];
    const T = fn => c => { c.save(); c.translate(feet[0], feet[1]); c.scale(s, s); fn(c); c.restore(); };
    QHC.shadowed(g,
      T(c => QHC.puppetBody(c, pose)),
      T(c => QHC.puppetCut(c, pose)),
      c => {
        T(cc => QHC.puppetEdge(cc, pose))(c);
        c.save(); c.translate(feet[0], feet[1]); c.scale(s, s);
        strokes.forEach((st, i) => {                                            // 笔走到哪，色铺到哪
          const grow = clamp(k * strokes.length - i); if (grow <= 0) return;
          const seg = polylineUpTo(st.pts, grow); if (seg.length < 2) return;
          c.filter = 'blur(22px)';                                              // 先洇开的一圈（吃进皮里）
          brush(c, seg, st.w * 1.35, `rgba(${st.tone},${(st.a * 0.45).toFixed(3)})`, 'both');
          c.filter = 'blur(5px)';                                               // 再是笔按下去的那一道
          brush(c, seg, st.w, `rgba(${st.tone},${st.a.toFixed(3)})`, 'both');
        });
        c.filter = 'none'; c.restore();
      },
      { light: [lx, ly], z: zPup, L: LP, pen: 26, res: 1, blur: 0.8 });

    // 刷色的手：笔尖跟着"正在刷的那一道"走
    const ci = clamp(Math.floor(k * strokes.length), 0, strokes.length - 1);
    const segTip = polylineUpTo(strokes[ci].pts, clamp(k * strokes.length - ci));
    const cp = segTip.length ? segTip[segTip.length - 1] : strokes[ci].pts[0];
    const tipP = [feet[0] + (cp[0] + strokes[ci].w * 0.42) * s, feet[1] + (cp[1] - 10) * s];
    const at = toLayer(tipP, zHand);
    const brow = -2.35 + 0.25 * Math.sin(k * 6);
    const place = (c, extra) => {
      c.save(); c.translate(at[0], at[1]); c.rotate(brow);
      QHC.brush(c, { len: 210, s: 1.15, tip: 'rgba(42,92,143,0.95)' });
      c.translate(-118, 8); c.rotate(0.08);
      QHC.handHold(c, extra ? { s: 1.0, edge: extra } : { s: 1.0 });
      c.restore();
    };
    QHC.shadowed(g, c => place(c), null, c => place(c, (gg, pp) => {
      pp.fingers.forEach(ff => hideEdge(gg, ff, 12, { alpha: 0.22 }));
      hideEdge(gg, pp.thumb, 13, { alpha: 0.22 });
    }), { light: [lx, ly], z: zHand, L: LP, pen: 26, res: 0.5, alpha: clamp(0.25 + k * 3) });

    carveLyrics(g, f, {
      size: 66, y: Math.round(H * 0.175), weight: 500,
      lines: ['釉色', '韵味', '而你', '如含'].map(q => f.lyrics.get(q).i),
    });
    return { shake: 1.0 * f.a.kick, vignette: 0.34 + 0.16 * (1 - light) };
  },
});
