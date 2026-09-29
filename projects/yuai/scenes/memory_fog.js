// Shot 11 — two parts (two timeline entries, params.part):
//  'eave': close under the eave. Water gathers at the tile ends and lets go on the beat (and on 一 / 滴 / 滴); every
//          drop rings out in the puddle below, which grows as the drops accumulate ("累积").
//  'fog':  inside, the window pane misted over. In the mist a memory surfaces in pale ink — the two of them from
//          behind under one umbrella; on "记忆" it starts to run down the glass with the water.
MV.scene('memory_fog', {
  render(g, f) { return f.params.part === 'fog' ? ymemFog(g, f) : ymemEave(g, f); },
});

const YMEM = { puddle: { x: 620, y: 900 } };

function ymemEave(g, f) {
  const t = f.t, A = INK.A, L = f.lyrics.get('窗外的雨滴'), w = L.words;
  yuaiPaper(g, 5000);
  // shade under the roof, a soft grey rain beyond
  inkSoft(g, s => { const gr = s.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, ink(A.qing * 1.6)); gr.addColorStop(0.55, ink(A.qing * 0.8)); gr.addColorStop(1, ink(A.qing * 0.3)); s.fillStyle = gr; s.fillRect(0, 0, W, H); }, { grain: 0.5 });
  inkRain(g, t, { density: 1.2, n: 220, len: 60, speed: 1100, angle: 0.06, alpha: A.qing * 1.4, avoid: [{ x: 1480, y: 100, w: 420, h: 800 }] });
  // the eave: roof wash above a gently rising line, round tile ends
  const eave = x => 175 - 0.07 * x + 12 * Math.sin(x / 260);
  g.beginPath(); g.moveTo(-20, -20); g.lineTo(W + 20, -20); for (let x = W + 20; x >= -20; x -= 20) g.lineTo(x, eave(x)); g.closePath();
  g.fillStyle = ink(A.dan * 1.05); g.fill();
  for (let i = 0; i < 21; i++) inkStroke(g, spline([[i * 95 - 20, eave(i * 95 - 20) - 5], [i * 95 + 60, -20]], 5), 7, { alpha: A.nong * 0.8, dry: 0.5, seed: 3000 + i, taper: BRUSH.both });
  const ends = []; for (let x = 40; x < W; x += 64) ends.push([x, eave(x) + 14]);
  inkStroke(g, spline([[-20, eave(-20) + 4], [700, eave(700) + 4], [W + 20, eave(W + 20) + 4]], 12), 16, { alpha: A.jiao, dry: 0.3, seed: 3050 });
  for (const [x, y] of ends) { g.fillStyle = ink(A.nong); g.beginPath(); g.ellipse(x, y, 17, 19, 0, 0, TAU); g.fill(); inkStrokePaper(g, spline([[x - 8, y - 4], [x, y - 9], [x + 8, y - 4]], 4), 2.2, 0.35, 3100 + x); }
  // the ground: a stone step edge and the puddle
  inkStroke(g, spline([[-20, 830], [600, 822], [1300, 835], [W + 20, 828]], 10), 9, { alpha: A.nong * 0.8, dry: 0.5, seed: 3060 });
  // drops: every beat from three tile ends in turn, plus one on each of 一 / 滴 / 滴
  const P = YMEM.puddle, drops = [];
  const beats = f.audio.beats.filter(b => b > f.from - 0.5 && b < f.to + 0.5);
  beats.forEach((b, i) => drops.push({ t: b, x: ends[[7, 10, 12][i % 3]][0] }));
  [5, 6, 7].forEach((k, i) => drops.push({ t: w[k].start, x: ends[8 + i][0], big: true }));
  const fallT = 0.38;
  let landed = 0;
  for (const d of drops) {
    const y0 = eave(d.x) + 30, u = (t - (d.t - fallT)) / fallT;
    if (u > 0 && u < 1) {                                          // falling: stretched as it speeds up
      const y = y0 + (P.y - y0) * u * u, len = 6 + 30 * u;
      g.fillStyle = ink(A.nong); g.beginPath(); g.ellipse(d.x, y, d.big ? 6 : 4.5, (d.big ? 7 : 5) + len * 0.3, 0, 0, TAU); g.fill();
    } else if (u <= 0) {                                           // gathering at the tile end
      const grow = clamp(1 + u * 1.5);
      g.fillStyle = ink(A.nong * grow); g.beginPath(); g.ellipse(d.x, y0 - 4 + 5 * grow, 4.5 * grow, 5.5 * grow, 0, 0, TAU); g.fill();
    }
    if (t >= d.t) landed += d.big ? 1.6 : 1;
  }
  // the puddle grows with what has landed; rings spread from every landing
  const size = 1 + 0.12 * landed + 0.9 * prog(t, w[8].start, w[9].start + 0.4, ease.outCubic);
  inkSoft(g, s => {
    pathSmooth(s, blobPts(P.x, P.y + 6, 190 * size, 51, 0.2, 60, 0.16)); s.fillStyle = ink(A.dan * 0.75); s.fill();
    pathSmooth(s, blobPts(P.x + 20, P.y + 3, 140 * size, 52, 0.25, 60, 0.12)); s.fillStyle = ink(A.dan * 0.35); s.fill();
    s.fillStyle = 'rgba(240,235,224,0.5)'; s.beginPath(); s.ellipse(P.x - 30 * size, P.y + 2, 60 * size, 5 * size, 0, 0, TAU); s.fill();   // a glint of sky
  }, { scale: 0.5, grain: 0.35 });
  for (const d of drops) {
    const age = t - d.t; if (age < 0 || age > 1.6) continue;
    for (let k = 0; k < (d.big ? 3 : 2); k++) {
      const a2 = age - k * 0.18; if (a2 <= 0) continue;
      const r = (d.big ? 30 : 20) + 150 * (1 - Math.exp(-a2 * 2.2)), al = (d.big ? A.nong : A.zhong) * (1 - a2 / 1.6);
      g.strokeStyle = ink(al); g.lineWidth = d.big ? 2.6 : 1.8; g.beginPath(); g.ellipse(d.x, P.y + 4, r, r * 0.16, 0, 0, TAU); g.stroke();
    }
  }
  yuaiLyrics(g, f);
}

function ymemFog(g, f) {
  const t = f.t, A = INK.A, L = f.lyrics.get('屋内的湿气'), w = L.words;
  const tRise = w[5].start, tFull = w[10].start, tMelt = w[11].start;
  yuaiPaper(g, 5200);
  // beyond the glass: a grey, rain-blurred landscape
  g.save(); g.globalAlpha = 0.45; g.filter = 'blur(3px)'; yuaiLand(g, 2200); g.filter = 'none'; g.restore();
  inkSoft(g, s => { s.fillStyle = ink(A.qing * 1.2); s.fillRect(0, 0, W, H); }, { grain: 0.5 });
  inkRain(g, t, { density: 1.0, n: 200, len: 50, speed: 900, angle: 0.06, alpha: A.qing * 1.2 });
  // the mist on the pane, with condensation
  g.fillStyle = 'rgba(240,235,224,0.55)'; g.fillRect(0, 0, W, H);
  const R = mulberry32(1111);
  for (let i = 0; i < 900; i++) { const x = R() * W, y = R() * H, r = 0.6 + R() * R() * 3.2; g.fillStyle = ink(A.qing * (0.5 + R())); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  // the memory surfacing in the mist
  const show = prog(t, tRise - 0.3, tFull, ease.inOutQuad), melt = prog(t, tMelt - 0.1, f.to + 0.8, ease.inQuad);
  if (show > 0) {
    g.save(); g.translate(0, 70 * melt * melt);
    const al = 0.5 * show * (1 - 0.35 * melt);
    yfigHimBack(g, t, { x: 690, y: 900, U: 62, alpha: al });
    yfigHerBack(g, t, { x: 880, y: 900, U: 58, alpha: al, umbrella: 1, umbrellaCx: -1.25, umbrellaR: 3.1, umbrellaRim: -8.2, umbrellaTilt: 0.05 });
    g.restore();
    // drips running down from the drawing
    if (melt > 0) for (let i = 0; i < 16; i++) {
      const x = 520 + 460 * hash(i, 1), y0 = 460 + 440 * hash(i, 2), d = hash(i, 3) * 0.3, u = prog(t, tMelt + d, tMelt + d + 1.2, ease.outQuad);
      if (u <= 0) continue;
      inkStroke(g, spline([[x, y0], [x + 3, y0 + 120 * u], [x - 2, y0 + 260 * u]], 8), 2.5 + 2.5 * hash(i, 4), { alpha: A.dan * 0.8, dry: 0.3, seed: 3200 + i, upto: 1, taper: BRUSH.hair, wet: 0.7 });
    }
  }
  // the window frame around the pane
  inkStroke(g, spline([[70, -20], [74, 540], [72, H + 20]], 8), 30, { alpha: A.nong, dry: 0.35, seed: 3300 });
  inkStroke(g, spline([[-20, 1010], [960, 1004], [W + 20, 1012]], 8), 34, { alpha: A.nong, dry: 0.35, seed: 3301 });
  yuaiLyrics(g, f);
}
