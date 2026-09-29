// Shot 13 — the rain stops. The camera draws back until the whole scroll is in frame: him at the bridge on the
// left, her under the eave on the right, all the mountains between. The ink clouds wash away and leave an arc of
// bare paper across the sky between them — a rainbow in black and white. They do not meet. On the last bar the
// whole painting fades back to paper.
MV.scene('rainbow', {
  render(g, f) {
    const t = f.t, A = INK.A, SW = YUAI.SW;
    const L17 = f.lyrics.get('我相信'), L18 = f.lyrics.get('彩虹的美丽');
    const tKan = L17.words[6].start, tCai = L18.words[0].start, tHong = L18.words[1].start, tMei = L18.words[3].start;
    const s = Math.exp(keys(t, [[f.from, Math.log(0.55)], [tCai + 0.3, Math.log(W / SW), ease.inOutCubic]]));
    const cx = 2880, cy = 700, sx = 960, sy = 760, X = wx => sx + (wx - cx) * s, Y = wy => sy + (wy - cy) * s;
    yuaiPaper(g, 1200);
    g.save(); g.translate(sx, sy); g.scale(s, s); g.translate(-cx, -cy);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(YUAI.land, 0, 0); g.drawImage(YUAI.near, 0, 0);
    yfigHer(g, t, { x: 5390, y: YSHORE.ground, U: 63, walk: 0, dir: 1 });
    yfigHim(g, t, { x: YHIS.x, y: YHIS.bankY(YHIS.x), U: 62, dir: -1 });
    const rainLeft = 1 - prog(t, f.from, tKan, ease.inOutQuad);
    if (rainLeft > 0) inkRain(g, t, { x0: -200, y0: -400, w: SW + 400, h: H + 800, density: 1.4 * rainLeft, n: 700, len: 110, speed: 2200, angle: 0.1, alpha: A.dan * rainLeft, width: 2.2 });
    g.restore();
    // the arc: from his feet to hers, its crown high in the sky
    const xl = X(YHIS.x + 60), xr = X(5390 - 60), foot = Y(840), top = 150, acx = (xl + xr) / 2, arx = (xr - xl) / 2, ary = foot - top;
    const arcPts = n => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI + Math.PI * i / n; return [acx + arx * Math.cos(a), foot + ary * Math.sin(a)]; });
    const reveal = prog(t, tCai - 0.1, tHong + 0.9, ease.inOutQuad);
    // ink clouds over the sky, washing away; the arc is left bare
    const cloud = keys(t, [[f.from, 1], [tKan, 0.8], [tHong + 0.6, 0.32, ease.inOutQuad], [tMei + 0.6, 0.16]]);
    inkSoft(g, sg => {
      const open = 1 - cloud;                                               // the clouds part from the middle
      for (let m = 0; m < 3; m++) {
        const mx = W * (0.2 + 0.3 * m) + (m - 1) * 420 * open + 30 * noise1(t * 0.2 + m, 7), my = 150 + 40 * (m % 2) - 30 * open;
        const lobes = s2 => { s2.beginPath(); for (let i = 0; i < 7; i++) { const u = (i / 6 - 0.5) * 2; yuaiCloudPath(s2, mx + u * 250, my + u * u * 30 + 20 * hash(m, i), 95 * (1.1 - 0.35 * Math.abs(u)), 70 * (1.1 - 0.35 * Math.abs(u)), 70 + m * 10 + i, t, 50, 0.24, false); } };
        lobes(sg); sg.fillStyle = ink(A.dan * 0.9 * cloud); sg.fill();
        sg.globalCompositeOperation = 'destination-out'; sg.save(); sg.translate(mx, my - 8); sg.scale(0.8, 0.78); sg.translate(-mx, -my); lobes(sg); sg.restore();
        sg.fillStyle = 'rgba(0,0,0,0.4)'; sg.fill(); sg.globalCompositeOperation = 'source-over';
      }
      const gr = sg.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, ink(A.qing * 1.4 * Math.max(cloud, 0.5))); gr.addColorStop(1, ink(0)); sg.fillStyle = gr; sg.fillRect(0, 0, W, 640);
      if (reveal > 0) {                                                  // the white band of the arc
        const pts = cutPolyline(arcPts(80), reveal);
        sg.globalCompositeOperation = 'destination-out'; sg.lineCap = 'round'; sg.lineJoin = 'round'; sg.filter = 'blur(3px)';
        sg.strokeStyle = 'rgba(0,0,0,1)'; sg.lineWidth = 64; sg.beginPath(); pts.forEach((p, i) => (i ? sg.lineTo(p[0], p[1]) : sg.moveTo(p[0], p[1]))); sg.stroke();
        sg.filter = 'none'; sg.globalCompositeOperation = 'source-over';
      }
    }, { grain: 0.5 });
    // the rainbow's "colours": five ink tones in thin bands at its edges
    if (reveal > 0) {
      const glow = prog(t, tMei - 0.2, tMei + 1.2, ease.inOutQuad);
      [[-44, A.qing * 0.9], [-36, A.qing * 0.55], [36, A.qing * 0.55], [44, A.qing * 0.9], [52, A.qing * 0.4]].forEach(([off, al], k) => {
        const pts = cutPolyline(Array.from({ length: 81 }, (_, i) => { const a = Math.PI + Math.PI * i / 80; return [acx + (arx + off) * Math.cos(a), foot + (ary + off) * Math.sin(a)]; }), reveal);
        inkStroke(g, pts, 2.2 + 0.8 * k % 2, { alpha: al * (0.6 + 0.6 * glow), dry: 0.5, seed: 6000 + k, taper: BRUSH.both, wet: 0.4 });
      });
      if (glow > 0) inkSoft(g, sg => { sg.lineCap = 'round'; sg.strokeStyle = `rgba(246,242,233,${0.5 * glow})`; sg.lineWidth = 50; sg.beginPath(); arcPts(80).forEach((p, i) => (i ? sg.lineTo(p[0], p[1]) : sg.moveTo(p[0], p[1]))); sg.stroke(); });
    }
    // the last bar: back to paper
    const veil = prog(t, f.to - 2.9, f.to - 0.4, ease.inOutQuad);
    if (veil > 0) { g.fillStyle = `rgba(237,230,214,${veil})`; g.fillRect(0, 0, W, H); yuaiPaperVeil(g, veil); }
    yuaiLyrics(g, f, 1 - prog(t, f.to - 1.6, f.to - 0.2));
  },
});
