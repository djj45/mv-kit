// S50 see — the roof edge before dawn (G2): her face lit by a light we can't see; on "We'll never know" the reverse
// shot is only overexposed white. (The name is only in the words; no real person is drawn.)
MV.scene('see', akStill({
  art: 'G2',
  clip: 'G2v',   // the still until the clip is generated and packed
  cam: [[0, { z: 1.06 }], [1, { z: 1.14 }, ease.inOutQuad]],
  snap: { shots: [{ z: 1.06 }, { x: 0.5, y: 0.33, z: 1.5 }, { y: 0.45, z: 1.2 }] },   // 动感: wide, her lit face, the edge (until the white-out)
  fx(g, f, map) {
    const at = akWord(f, 'What did', "we'll"), [fx, fy] = map(...AK_SPOT.G2.face);
    illFlare(g, fx, fy, 900, '255,250,240', 0.2 + 0.1 * Math.sin(f.t * 3));
    if (f.t >= at) { const k = prog(f.t, at, at + 0.3); g.fillStyle = `rgba(255,250,242,${k})`; g.fillRect(0, 0, W, H); illFlare(g, W / 2, H / 2, 900, '255,255,255', k); }
  },
  ly: f => (f.t >= akWord(f, 'What did', "we'll") ? { style: 'quiet', x: 960, y: 960, size: 68, track: 6, color: '#3a3448' } : { style: 'quiet', x: 400, y: 900, size: 64, track: 4, maxW: 560, glow: 'rgba(10,14,40,0.9)' }),
}));
