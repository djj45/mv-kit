// 镜头 9 — 刻字（副歌第 5、6 句）。影人在幕上走了一段（转身、水袖，一拍二）；
// 镜头推近到竹签下端的握把，他一刀一刀刻字；再拉远——幕上影人的影子和幕后他握签的手影重成一个。
MV.scene('inscribe', {
  render(g, f) {
    const t = f.t;
    const L1 = f.lyrics.get('在瓶'), L2 = f.lyrics.get('就当');
    const W1 = L1.words;
    const wet = clamp(0.45 + 0.25 * prog(t, f.from, f.from + 6));
    const light = clamp(0.95 - 0.14 * wet + 0.03 * noise1(t * 4.3, 9));
    const lx = W * 0.50, ly = H * 0.62;
    const feet = [W * 0.50, H * 0.660], s = 1.15;
    const walk = prog(t, W1[0].start, W1[2].start, ease.outCubic) * (1 - prog(t, W1[5].start - 0.4, W1[5].end, ease.inOutQuad));
    const pose = QHC.puppetPose(t, { walk, arm: 0.25, handle: true });

    // 镜头：走到一半推近到签子下端的握把，再拉远
    const ZM = 1.45;                                                          // 推太近影人就整个出画了
    const zoom = keys(t, [[W1[0].start, 1], [W1[3].start, 1], [W1[5].end, ZM], [L2.words[0].start, ZM],
      [L2.words[4].start, 1.03], [L2.end, 1]]);
    const rodPt = [feet[0] + 46 * s, feet[1] + 150 * s];                       // 取景框上半是她的裙摆，下半是握把
    const camX = lerp(W * 0.5, rodPt[0], prog(zoom, 1, ZM)), camY = lerp(H * 0.55, rodPt[1], prog(zoom, 1, ZM));
    const CAM = c => { c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-camX, -camY); };

    screenCloth(g, { light, lx, ly, r0: H * 0.95, wet, seed: 11 });   // 幕布铺满画面，不跟着镜头推近

    const LP = 900, zPup = 34, zKnife = 200;
    const kOf = z => LP / (LP - z);
    const toLayer = (p, z) => { const r = kOf(zPup) / kOf(z); return [lx + (p[0] - lx) * r, ly + (p[1] - ly) * r]; };

    // 刻字：一个字一个字刻穿握把
    const carved = clamp((prog(t, W1[3].start, W1[5].end + 0.4, ease.inOutQuad)) * 2);
    const CH = ['青', '花'];
    const chLocal = i => [46, 424 - i * 50];                                   // 握把（局部 y 330..446）上的位置
    const T = fn => c => { c.save(); CAM(c); c.translate(feet[0], feet[1]); c.scale(s, s); fn(c); c.restore(); };
    QHC.shadowed(g,
      T(c => QHC.puppetBody(c, pose)),
      c => {
        T(cc => QHC.puppetCut(cc, pose))(c);
        c.save(); CAM(c); c.translate(feet[0], feet[1]); c.scale(s, s);
        for (let i = 0; i < 2; i++) {
          const a = clamp(carved - i); if (a <= 0.02) continue;
          c.save(); c.translate(chLocal(i)[0], chLocal(i)[1]); c.rotate(-Math.PI / 2);
          c.beginPath(); c.rect(-34, -24, 68 * a, 48); c.clip();
          c.font = `600 56px ${SHADOW.FONT_SEAL}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(CH[i], 0, 0);
          c.restore();
        }
        c.restore();
      },
      T(c => QHC.puppetEdge(c, pose)),
      { light: [lx, ly], z: zPup, L: LP, pen: 26, res: 1, blur: 0.8 });

    // 刻刀：刀尖跟着正在刻的那个字
    const ci = clamp(Math.floor(carved), 0, 1);
    const cp = [feet[0] + (chLocal(ci)[0] + 22) * s, feet[1] + chLocal(ci)[1] * s];
    const kAt = toLayer(cp, zKnife);
    const KL = 188;
    const place = (c, extra) => {
      c.save(); c.translate(kAt[0], kAt[1]); c.rotate(-1.05 + 0.25 * Math.sin(carved * 3)); c.translate(-KL, 6);
      QHC.knife(c, { len: KL });
      c.translate(-46, -4); c.rotate(-0.08);
      QHC.handHold(c, extra ? { s: 0.95, edge: extra } : { s: 0.95 });
      c.restore();
    };
    QHC.shadowed(g, c => place(c), null, c => place(c, (gg, pp) => {
      pp.fingers.forEach(ff => hideEdge(gg, ff, 12, { alpha: 0.24 }));
      hideEdge(gg, pp.thumb, 13, { alpha: 0.26 });
    }), { light: [lx, ly], z: zKnife, L: LP, pen: 26, res: 0.5, alpha: clamp(prog(t, W1[2].end, W1[3].start) * 1.4) * (1 - prog(t, L2.words[2].start, L2.words[5].start)) });

    // 拉远之后：他握签的手影，和幕上她的影子重成一个
    const back = prog(t, L2.words[2].start, L2.words[5].start, ease.inOutQuad);
    if (back > 0.02) QHC.rodGrip(g, { lx, ly, feet, s, u: lerp(0.44, 0.30, back), alpha: back, zHand: 130 });

    screenRain(g, t, { amount: 0.8, hits: f.audio.events('kick', f.from, f.to).map(e => e.t), n: 150, len: 74, wind: 0.12, seed: 13, life: 3.0 });

    const band = [W * 0.5 - 560, H * 0.185 - 96, W * 0.5 + 560, H * 0.185 + 46];
    carveLyrics(g, f, {
      size: 66, y: Math.round(H * 0.185), weight: 500,
      lines: ['在瓶', '就当'].map(q => f.lyrics.get(q).i),
    });
    return { shake: 1.5 * f.a.kick, vignette: 0.34 + 0.14 * wet };
  },
});
