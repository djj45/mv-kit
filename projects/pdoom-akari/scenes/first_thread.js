// S17 first_thread — one bar, no words: the blue-hour skyline, its windows dark (C2off: C2 with every lit window
// painted out by tools/lightsoff.py). Far off one window lights, and a thread of orange light climbs from it to a
// point in the sky; as it climbs the city's windows come on behind it one by one — spreading out from that first
// window, ahead of the thread first — each with an orange flash, some flickering like a tube light, until every
// window on screen is lit when the thread reaches the sky (the city S19 pans across, all lit). A window is switched
// on by drawing its box (AK_SPOT.C2.lit) from the lit picture over the dark one.
const AK_FT = { grow: [0.3, 1.6] };   // the thread grows over these seconds of the shot; the windows follow it
/** Seconds into the shot when each lit window of C2 comes on (by its distance from the first window, ahead of the thread sooner). */
function akFirstLitTimes() {
  if (AK_FT.times) return AK_FT.times;
  const [u0, v0] = AK_SPOT.C2.window, asp = 3456 / 1296, R = mulberry32(17), inv = y => (y < 0.5 ? Math.cbrt(y / 4) : 1 - Math.cbrt(2 * (1 - y)) / 2);
  const key = AK_SPOT.C2.lit.map(([u, v, w, h]) => {
    const dx = (u + w / 2 - u0) * asp, dy = v + h / 2 - v0, d = Math.hypot(dx, dy);
    return d * (1 - 0.45 * (d ? dx / d : 0)) + R() * 0.05;
  });
  const vis = AK_SPOT.C2.lit.map(([u, , w], i) => (u + w / 2 < 0.66 ? key[i] : 0)), kmax = Math.max(...vis);
  const first = key.indexOf(Math.min(...key));
  return (AK_FT.times = key.map((k, i) => (i === first ? 0.05 : lerp(AK_FT.grow[0], AK_FT.grow[1], inv(clamp(k / kmax))))));
}
MV.scene('first_thread', akStill({
  arts: ['C2off', 'C2'],
  art: 'C2off', day: true,
  cam: f => ({ x: lerp(0.18, 0.26, f.p), y: 0.5, z: 1.02 }),
  fx(g, f, map) {
    const lit = akArt('C2'), times = akFirstLitTimes(), lt = f.tq - f.from, s = map.scale;
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    AK_SPOT.C2.lit.forEach(([u, v, w, h], i) => {
      const on = lt - times[i];
      if (on < 0) return;
      const ph = Math.floor(on * MV.drawRate + 1e-6), flick = hash(i, 3) < 0.4;
      g.globalAlpha = ph === 1 && flick ? 0.3 : ph === 3 && flick && hash(i, 4) < 0.5 ? 0.6 : 1;   // a tube light catching
      const [x, y] = map(u, v);
      g.drawImage(lit, u * lit.width, v * lit.height, w * lit.width, h * lit.height, x, y, w * map.sw * s, h * map.sh * s);
      if (ph < 3) { g.globalAlpha = 1; illFlare(g, x + w * map.sw * s / 2, y + h * map.sh * s / 2, Math.max(w * map.sw, h * map.sh) * s * 0.7, AK.sig, 0.4 * (1 - ph / 3)); }
    });
    g.restore();
    const [wx, wy] = map(...AK_SPOT.C2.window), [sx, sy] = map(...AK_SPOT.C2.sky);
    akDot(g, wx, wy, 3, prog(f.lt, 0, 0.2), f.tick);
    akThread(g, wx, wy, sx, sy, prog(f.lt, AK_FT.grow[0], AK_FT.grow[1], ease.inOutCubic), { lift: 140, bend: 80 });
  },
  ly: { style: 'none' },
}));
