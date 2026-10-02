// S38 fuse — ground level (E6): the cable is the fuse. On "lit" a spark catches and runs along it into the dark.
MV.scene('fuse', akStill({
  art: 'E6',
  cam: [[0, { z: 1.04 }], [1, { z: 1.14, y: 0.45 }, ease.inQuad]],
  fx(g, f, map) {
    const lit = f.lyrics.findWords('lit')[0].start, k = prog(f.t, lit, f.to, ease.inOutQuad); if (f.t < lit) return;
    const P = AK_SPOT.E6.cable.map(([u, v]) => map(u, v)), path = [];
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < 10; j++) { const s = j / 10; path.push([lerp(P[i][0], P[i + 1][0], s), lerp(P[i][1], P[i + 1][1], s)]); }
    path.push(P[P.length - 1]);
    const m = Math.floor(k * (path.length - 1)), [x, y] = path[m];
    akGlowPath(g, gg => { gg.beginPath(); path.slice(0, m + 1).forEach(([px, py], i) => (i ? gg.lineTo(px, py) : gg.moveTo(px, py))); }, 1.6, 0.5);
    akSpark(g, x, y, 20 * (1 - k * 0.55), f.t, { embers: 12, seed: 38 });
    illFlare(g, x, y, 260 * (1 - k * 0.5), AK.sig, 0.35);
  },
  ly: { style: 'quiet', x: 960, y: 960, size: 58, track: 6, colorOf: w => (/lit|fuse/.test(w.w) ? AK.signal : AK.paper) },
}));
