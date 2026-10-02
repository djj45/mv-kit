// S16 shinigami — her eye again, now at night (A3; A3v once generated: she blinks). As the eye opens again on
// "shinigami" an orange HUD ring lights up in the pupil and turns; it rides on the pupil (measured from the clip by
// tools/eyetrack.py) and goes dark whenever the lid comes down. On "eyes" we see through it: the night crossing (B8)
// as an object detector sees it — every person head to toe, umbrellas, bags, traffic lights, each with a class label
// whose confidence keeps flickering.
// A3v is packed from 1.0 s into the clip: eye open, then her one blink (shut 0.42–1.17 s into the pack). The blink
// plays AK_SHINI.fast× — a crisp blink right after the cut — so the eye opens again just after "shinigami" starts,
// and from there the clip runs at its own speed.
const AK_SHINI = { fast: 2.6 };
const akShiniEyes = f => f.lyrics.findWords('eyes')[1].start;
const akShiniBlink = () => { const e = AK_SPOT.A3v && AK_SPOT.A3v.eye, p = (window.MV_FRAMES || {}).A3v; return e && p && p.images && e.blinks.length ? e.blinks[0] : null; };
/** Seconds into the A3v pack: fast through the blink, then real time. */
function akShiniCT(f) {
  const u = f.tq - f.from, b = akShiniBlink();
  if (!b) return u;
  const ur = b[1] / AK_SHINI.fast;
  return u < ur ? u * AK_SHINI.fast : b[1] + (u - ur);
}
/** When the ring lights: on the first drawing that shows the eye open again after the blink (drawings change on the
 *  12-per-second grid, like f.tq), or on "shinigami" when there is no clip. */
function akShiniIgnite(f) {
  const b = akShiniBlink(), rate = MV.drawRate;
  return b ? Math.ceil((f.from + b[1] / AK_SHINI.fast) * rate - 1e-6) / rate : f.lyrics.findWords('shinigami')[0].start;
}
/** The HUD ring in a pupil: k 0..1 draws it on (with a flash), a its opacity (the lid), t turns it. */
function akHudRing(g, x, y, r, t, k, a) {
  if (k <= 0 || a <= 0) return;
  illFlare(g, x, y, r * 0.55, AK.sig, 0.3 * a * k);                                     // the pupil lit from inside
  if (k < 1) { illFlare(g, x, y, r * (0.5 + 1.4 * k), AK.sig, 0.9 * a * (1 - k)); illFlare(g, x, y, r * 0.35, AK.core, 0.8 * a * (1 - k)); }
  akGlowPath(g, gg => { gg.beginPath(); gg.arc(x, y, r, t * 2, t * 2 + TAU * 0.8 * k); }, 2, 0.9 * a);
  akGlowPath(g, gg => { gg.beginPath(); gg.arc(x, y, r * 0.7, -t * 3, -t * 3 + TAU * 0.4 * k); }, 1.5, 0.7 * a);
  akGlowPath(g, gg => {                                                                  // a scale of ticks, turning slowly
    gg.beginPath();
    for (let i = 0; i < 36; i++) {
      if (i / 36 > k) break;
      const th = t * 0.5 + (i / 36) * TAU, r0 = r * (i % 3 ? 1.12 : 1.08), r1 = r * 1.2;
      gg.moveTo(x + Math.cos(th) * r0, y + Math.sin(th) * r0); gg.lineTo(x + Math.cos(th) * r1, y + Math.sin(th) * r1);
    }
  }, 0.9, 0.55 * a);
}
MV.scene('shinigami', akStill({
  arts: ['A3', 'B8'],
  art: f => (f.t < akShiniEyes(f) ? 'A3' : 'B8'),
  clip: f => (f.t < akShiniEyes(f) ? 'A3v' : null),
  clipT: akShiniCT,
  prep: { grade: { tint: '#3F5FA0', amt: 0.35, expo: 0.75, sat: 0.8 }, glow: 0.2 },
  cam: f => (f.t < akShiniEyes(f) ? { z: 1.12 + 0.1 * f.p } : { z: 1.04 + 0.04 * f.p }),
  fx(g, f, map) {
    const at = akShiniEyes(f);
    if (f.t < at) {
      const eye = akEye('A3v', akShiniCT(f)), [u, v] = AK_SPOT.A3.pupil;
      const [px, py] = map(u + (eye ? eye.dx : 0), v + (eye ? eye.dy : 0)), r = 120 * map.scale * 1.4;
      const ig = akShiniIgnite(f), k = prog(f.t, ig, ig + 0.2, ease.outCubic);
      akHudRing(g, px, py, r, f.t, k, eye ? ease.inOutCubic(prog(eye.open, 0.35, 0.8)) : 1);
      return;
    }
    akDetect(g, map, AK_SPOT.B8.det, f, at);   // every person, umbrella, bag and traffic light in the crossing, as a detector sees them
  },
  post(f) { const ig = akShiniIgnite(f); return { flash: f.t >= ig && f.t < ig + 1 / 12 ? 0.12 : 0 }; },   // the ring lights: one drawing of flash
  ly: { style: 'verse', x: 140, y: 930, hot: ['shinigami'] },
}));
