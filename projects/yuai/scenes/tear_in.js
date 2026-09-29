// Shot 6 — her profile, close. On "泪" a drop of ink forms on her lower lid and runs down her cheek — it
// sinks in instead of falling; on "心" ink spreads inside her chest, only within her outline. On "学会放弃"
// the whole picture fades back to paper; the last beat before the chorus is blank but for the words.
MV.scene('tear_in', {
  render(g, f) {
    const t = f.t, A = INK.A;
    const L6 = f.lyrics.get('我的泪'), L7 = f.lyrics.get('学会放弃');
    const tTear = L6.words[2].start, tHeart = L6.words[5].start, tLet = L7.words[0].start;
    g.fillStyle = INK.paper; g.fillRect(0, 0, W, H);
    yuaiPaper(g, 1200);
    // a pale, uneven wash behind her, and far rain on the empty side
    inkSoft(g, s => { const gr = s.createRadialGradient(360, 700, 60, 360, 700, 900); gr.addColorStop(0, ink(A.qing * 0.9)); gr.addColorStop(1, ink(0)); s.fillStyle = gr; s.fillRect(0, 0, W, H); }, { grain: 0.5 });
    inkRain(g, t, { x0: 900, w: 1020, density: 0.6, n: 200, len: 40, speed: 800, angle: 0.1, alpha: A.qing * 0.9, width: 0.8, avoid: [{ x: W - 330, y: 110, w: 280, h: 640 }] });
    const z = keys(t, [[f.from, 1], [f.to, 1.05, ease.inOutQuad]]);
    g.save(); g.translate(560, 560); g.scale(z, z); g.translate(-560, -560);
    const geo = ycuHer(g, t, { bow: prog(t, tHeart, tLet + 1.5, ease.inOutQuad), tear: { t0: tTear, t1: tHeart - 0.05 } });
    ycuHeart(g, t, geo, tHeart);
    g.restore();
    // 学会放弃: back to paper; the heart goes last
    const white = keys(t, [[tLet, 0], [tLet + 1.7, 0.95, ease.inOutQuad]]);
    if (white > 0) { g.fillStyle = `rgba(237,230,214,${white})`; g.fillRect(0, 0, W, H); yuaiPaperVeil(g, white); }
    if (white > 0) { g.save(); g.translate(560, 560); g.scale(z, z); g.translate(-560, -560); ycuHeart(g, t, geo, tHeart, prog(t, tLet + 0.4, tLet + 1.7, ease.inQuad)); g.restore(); }
    yuaiLyrics(g, f);
  },
});
