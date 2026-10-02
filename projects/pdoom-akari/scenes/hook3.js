// S34 hook3 — the only quiet hook. The same floor, darker (E1); small serif words light up one at a time; 81% is a whisper.
MV.scene('hook3', akStill({
  art: 'E1',
  clip: 'E1v', clipAt: 3.64,   // E1v carries on from the E1 part of S33 prompt3 (3.64 s)
  prep: { grade: { tint: '#7E8BB0', amt: 0.2, expo: 0.6, sat: 0.7 }, glow: 0.4 },
  cam: f => ({ z: 1.12 + 0.03 * f.p, x: 0.5 + 0.004 * noise1(f.t, 1) }),
  fx(g, f, map) {
    const { hit } = akHookLine(f.lyrics, 2);
    if (f.t >= hit) akText(g, 'P(doom) = 81%', 560, 400, { size: 30, align: 'center', alpha: 0.75 * prog(f.t, hit, hit + 0.4) });
  },
  ly: { style: 'quiet', x: 560, y: 300, size: 60, maxW: 820, track: 8, glow: 'rgba(255,106,26,0.6)' },
}));
