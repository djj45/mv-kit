// Shot 5 — outside, her end of the scroll. They stand under the eave; on "离开你" she walks out into the rain
// and away along the bank, shrinking into the mist; his pale ink is drawn out of him ("抽离") until only a
// paper-white figure is left in the shade. The scroll glides right → left.
MV.scene('leave', {
  render(g, f) {
    const t = f.t, tq = f.tq, A = INK.A;
    const L1 = f.lyrics.get('离开你'), L2 = f.lyrics.get('不忍揭晓');
    const tGo = L1.words[0].start + 0.1, d0 = L1.words[3].start, d1 = L2.end + 0.3;
    const cam = keys(t, [[f.from, 3840], [f.to + 0.8, 3680, ease.inOutQuad]]);
    yuaiPaper(g, cam);
    yuaiLand(g, cam);
    // mist gathering over the far path, where she is going
    const mist = prog(t, 41.5, 45.2, ease.inOutQuad);
    if (mist > 0) inkSoft(g, s => { const gr = s.createRadialGradient(4250 - cam, 720, 20, 4250 - cam, 720, 520); gr.addColorStop(0, `rgba(237,230,214,${0.85 * mist})`); gr.addColorStop(1, 'rgba(237,230,214,0)'); s.fillStyle = gr; s.fillRect(0, 0, W, H); });
    yuaiNear(g, cam);
    yuaiEaveDrips(g, t, cam, f.audio);
    // him, under the eave
    yfigHim(g, t, { x: 5470 - cam, y: YSHORE.ground, U: 66, drain: prog(t, d0, d1, ease.inOutQuad), d0, d1 });
    // her: out from under the eave and away along the bank
    const tau = tq - tGo, dist = tau <= 0 ? 0 : tau < 0.7 ? 175 * tau * tau / 1.4 : 175 * (tau - 0.35);
    const x = 5360 - dist, U = 63 * lerp(1, 0.45, smoothstep(5250, 4250, x));
    yfigHer(g, t, { x: x - cam, y: yuaiBankY(x), U, phase: dist / (1.1 * U) * Math.PI, walk: clamp(tau / 0.6), alpha: 1 - 0.65 * smoothstep(4750, 4250, x) });
    // rain, kept off the lyrics and out from under the roof
    inkRain(g, t, { density: 1.1, n: 300, len: 46, speed: 900, angle: 0.12, alpha: A.dan * 0.9,
      avoid: [{ x: 250, y: 110, w: 260, h: 640 }, { x: YSHORE.eaveX0 - cam + 30, y: -60, w: 3000, h: YSHORE.ground + 60 }] });
    yuaiLyrics(g, f);
  },
});
