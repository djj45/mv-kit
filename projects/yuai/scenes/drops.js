// Shot 7 — the chorus lands. Hard cut from the blank page: ink falls on the paper like rain. Every sung
// character drops a large blot, every kick a medium one, and a fine drizzle keeps coming; tones range from
// 清墨 to 焦墨 so they pile up in layers. "一滴滴" are three crisp 焦墨 drops.
const YDROPS = { cache: null };

function ydropsList(f) {
  if (YDROPS.cache && YDROPS.cache.from === f.from) return YDROPS.cache.list;
  const A = INK.A, list = [], R = mulberry32(707);
  const keep = (x, y) => !(x > W - 360 && y < 820);                           // leave the lyric column clear
  const place = (r) => { for (let k = 0; k < 30; k++) { const x = 140 + R() * (W - 280), y = 110 + R() * (H - 220); if (keep(x, y)) return [x, y]; } return [W / 2, H / 2]; };
  // one big blot per sung character
  const line = f.lyrics.get('听雨的声音'), crisp = new Set([5, 6, 7]);
  line.words.forEach((w, i) => {
    const [x, y] = place(); const c = crisp.has(i);
    list.push({ t: w.start, x, y, r: c ? 95 + 25 * R() : 120 + 70 * R(), a: c ? A.jiao : lerp(A.dan, A.nong, R()), k: c ? 3.2 : 1.6, seed: 10 + i, big: true, dilute: !c });
  });
  // a medium one on every kick
  for (const e of f.audio.events('kick', f.from - 0.05, f.to + 1)) {
    const [x, y] = place(); list.push({ t: e.t, x, y, r: 55 + 40 * R(), a: lerp(A.qing * 1.3, A.zhong, R()), k: 2.2, seed: 40 + list.length });
  }
  // drizzle
  for (let i = 0; i < 140; i++) {
    const t = f.from + 0.05 + i * (f.to - f.from + 0.6) / 140 + (R() - 0.5) * 0.05, x = 60 + R() * (W - 120), y = 60 + R() * (H - 120);
    list.push({ t, x, y, r: 12 + 30 * R() * R(), a: lerp(A.qing * 0.9, A.dan * 1.1, R()), k: 3, seed: 100 + i });
  }
  // splashes: satellites thrown out around the big and the kick drops, and a darker wet core
  for (const d of list.slice()) {
    if (!(d.big || d.r > 50)) continue;
    const n = d.big ? 7 + ((R() * 5) | 0) : 4 + ((R() * 3) | 0);
    for (let k = 0; k < n; k++) {
      const ang = R() * TAU, dist = d.r * (0.95 + R() * 0.8), sz = 3 + R() * R() * (d.big ? 12 : 7);
      list.push({ t: d.t + 0.02 + R() * 0.07, x: d.x + Math.cos(ang) * dist, y: d.y + Math.sin(ang) * dist * 0.9, r: sz, a: Math.min(0.95, d.a * (1 + 0.3 * R())), k: 5, seed: 300 + list.length, dilute: false, sat: true });
    }
    if (d.dilute !== false) list.push({ t: d.t + 0.08, x: d.x + (R() - 0.5) * d.r * 0.3, y: d.y + (R() - 0.5) * d.r * 0.3, r: d.r * (0.3 + 0.15 * R()), a: Math.min(0.9, d.a * 1.5), k: 1.4, seed: 500 + list.length });
  }
  list.sort((a, b) => a.t - b.t);
  YDROPS.cache = { from: f.from, list };
  return list;
}

MV.scene('drops', {
  render(g, f) {
    const t = f.t;
    yuaiPaper(g, 600);
    const z = keys(t, [[f.from, 1], [f.to + 0.5, 1.05]]);
    g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
    for (const d of ydropsList(f)) {
      if (d.big || d.r > 40) inkDrop(g, d.x, d.y, d.t, t, { fall: d.big ? 0.32 : 0.25, dist: d.big ? 520 : 300, size: d.big ? 9 : 6, alpha: Math.min(0.95, d.a * 1.2) });
      const age = t - d.t; if (age < 0) continue;
      inkBloom(g, d.x, d.y, age, { r: d.r, alpha: d.a, seed: d.seed, k: d.k, dilute: d.dilute !== false, sq: d.sat ? 0.8 + 0.4 * hash(d.seed, 1) : 1 });
    }
    g.restore();
    yuaiLyrics(g, f);
    return { shake: 2.5 * f.a.kick };
  },
});
