// Shot 12 — his end of the scroll, all in paler ink than hers. He stands at the foot of the stone bridge, facing
// right, towards her. The water that ran down her window comes in from the top of the frame as one line of ink,
// finds the river, runs under the bridge and gathers in a pool at his feet (by "雨爱"); on "延续" it carries on,
// unbroken, along the river and out of the frame towards her. The scroll glides left → right.
const YHISLINE = (() => {
  const ctrl = [[150, -60], [168, 200], [186, 480], [200, 700], [215, 806], [330, 812], [420, 818], [470, 900], [600, 912], [760, 914], [880, 905], [930, 862],
    [1000, 842], [1050, 836], [1120, 834], [1400, 840], [1700, 872], [1950, 925], [2300, 935], [2700, 925], [3100, 915], [3500, 905]];
  const pts = spline(ctrl, 10), L = polylineLength(pts);
  let acc = 0, pool = 0; for (let i = 1; i < pts.length; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (!pool && pts[i][0] >= 1045 && pts[i][1] < 845) pool = acc / L; }
  return { pts, pool: pool || 0.3 };
})();

MV.scene('his_view', {
  render(g, f) {
    const t = f.t, A = INK.A, S = YHISLINE;
    const L1 = f.lyrics.get('真希望', 1), L2 = f.lyrics.get('雨爱的秘密'), tAi = L2.words[1].start, tYan = L2.words[8].start;
    const cam = keys(t, [[f.from - 0.5, 60], [f.to + 0.8, 560, ease.inOutQuad]]);
    yuaiPaper(g, cam);
    g.save(); g.globalAlpha = 0.6; yuaiLand(g, cam); g.restore();
    g.save(); g.globalAlpha = 0.85; yuaiNear(g, cam); g.restore();
    inkRain(g, t, { density: 0.9, n: 240, len: 45, speed: 900, angle: 0.1, alpha: A.qing * 1.3, avoid: [{ x: 1480, y: 100, w: 420, h: 820 }] });
    // the line of ink
    const p = keys(t, [[f.from, 0], [L1.words[0].start + 0.4, 0.08], [tAi, S.pool, ease.inOutQuad], [tYan - 0.1, S.pool + 0.012], [f.to + 0.3, 1, ease.inQuad]]);
    g.save(); g.translate(-cam, 0);
    if (p > 0) {
      inkStroke(g, S.pts, 6.5, { alpha: A.nong, dry: 0.3, seed: 5000, upto: p, wet: 0.75, taper: s => 0.75 + 0.25 * Math.sin(s * 40) * 0 + 0.25 * (1 - Math.abs(s - 0.5)) });
      const head = cutPolyline(S.pts, p).pop();
      g.fillStyle = ink(A.jiao); g.beginPath(); g.ellipse(head[0], head[1], 6, 7, 0, 0, TAU); g.fill();
    }
    const poolAge = t - tAi;
    if (poolAge > 0) inkBloom(g, 1045, 840, poolAge, { r: 115, alpha: A.nong * 0.8, seed: 12, k: 1.6, sq: 0.2 });
    g.restore();
    // him, pale, at the bridge foot, facing her end
    yfigHim(g, t, { x: YHIS.x - cam, y: YHIS.bankY(YHIS.x), U: 62, dir: -1, alpha: 0.95 });
    yuaiLyrics(g, f);
  },
});
