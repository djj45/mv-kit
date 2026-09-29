// Shot 8 — her profile again, now seen through a rain-beaded pane. On "呼" and "吸" her breath fogs the glass by
// her lips. From "雨滴" the camera pushes into one drop on the glass, and we are in the paper itself: from "渗"
// the ink runs out along the fibres from drop to drop, a net that covers the page by "爱"; on "里" the middle
// of it floods dark.

let YSEEP = null;
function yseepData() { return YSEEP || (YSEEP = (() => {
  const R = mulberry32(818), nodes = [{ x: W / 2, y: H / 2, r: 60 }];
  for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 8; gx++) {
    const x = 120 + gx * (W - 240) / 7 + (R() - 0.5) * 150, y = 110 + gy * (H - 220) / 4 + (R() - 0.5) * 120;
    if (Math.hypot(x - W / 2, y - H / 2) < 170) continue;
    if (x > W - 470 && y < 830) continue;                          // keep the lyric columns clean
    nodes.push({ x, y, r: 18 + 50 * R() * R() });
  }
  const edges = [], seen = new Set();
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [j, Math.hypot(b.x - a.x, b.y - a.y)]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 3);
    for (const [j, d] of near) { const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (seen.has(k) || d > 420) continue; seen.add(k);
      const pts = [], nx = -(nodes[j].y - a.y) / d, ny = (nodes[j].x - a.x) / d, seed = edges.length + 1;
      for (let s = 0; s <= 28; s++) { const u = s / 28, off = 26 * fbm1(u * 3 + seed * 1.7, seed) * Math.sin(Math.PI * u); pts.push([lerp(a.x, nodes[j].x, u) + nx * off, lerp(a.y, nodes[j].y, u) + ny * off]); }
      edges.push({ i, j, d: polylineLength(pts), pts, seed }); }
  });
  // shortest path from the middle (Dijkstra, small graph): when the ink reaches each node
  const dist = nodes.map(() => Infinity), done = nodes.map(() => false); dist[0] = 0;
  for (let it = 0; it < nodes.length; it++) {
    let u = -1; nodes.forEach((_, k) => { if (!done[k] && (u < 0 || dist[k] < dist[u])) u = k; }); if (u < 0 || dist[u] === Infinity) break; done[u] = true;
    for (const e of edges) { const v = e.i === u ? e.j : e.j === u ? e.i : -1; if (v >= 0 && dist[u] + e.d < dist[v]) dist[v] = dist[u] + e.d; }
  }
  const drops = []; for (let i = 0; i < 110; i++) drops.push({ x: 830 + R() * (W - 850), y: 20 + R() * (H - 40), r: 2 + R() * R() * 9, t0: 53.5 + R() * 5 });
  drops.push({ x: 868, y: 468, r: 9, t0: 53.0 });                      // the one we push into
  return { nodes, edges, dist, maxd: Math.max(...dist.filter(isFinite)), drops };
})()); }

MV.scene('breath_seep', {
  render(g, f) {
    const t = f.t, A = INK.A, S = yseepData();
    const L = f.lyrics.get('你的呼吸'), w = L.words;
    const tHu = w[2].start, tXi = w[3].start, tRain = w[5].start, tSeep = w[7].start, tAi = w[11].start, tLi = w[12].start;
    const push = prog(t, tRain, tSeep + 0.15, ease.inCubic), net = prog(t, tSeep - 0.35, tSeep + 0.1, ease.inOutQuad);
    // --- A: through the glass
    if (net < 1) {
      g.save();
      const z = Math.exp(lerp(0, Math.log(7), push)), fx = 868, fy = 468;
      g.translate(lerp(fx, W / 2, push), lerp(fy, H / 2, push)); g.scale(z, z); g.translate(-fx, -fy);
      yuaiPaper(g, 1500);
      inkSoft(g, s => { const gr = s.createLinearGradient(760, 0, W, 0); gr.addColorStop(0, ink(0)); gr.addColorStop(0.25, ink(A.qing * 1.2)); gr.addColorStop(1, ink(A.qing * 1.6)); s.fillStyle = gr; s.fillRect(0, 0, W, H); }, { grain: 0.4 });
      inkRain(g, t, { x0: 800, w: W - 800, density: 0.9, n: 220, len: 50, speed: 1000, angle: 0.08, alpha: A.dan * 0.7, width: 0.8 });
      ycuHer(g, t, { bow: 0.2 });
      // breath on the glass, twice
      for (const [tb, k, sd] of [[tHu, 1, 3], [tXi, 1.25, 7]]) {
        const age = t - tb; if (age <= 0) continue;
        const r = 150 * k * (1 - Math.exp(-age * 3.2)), a = 0.6 * Math.exp(-Math.max(0, age - 0.6) * 0.45);
        inkSoft(g, s => {
          s.filter = 'blur(6px)'; pathSmooth(s, blobPts(795, 505, Math.max(1, r), sd, 0.28, 48, 1.12));
          s.fillStyle = `rgba(241,236,225,${a})`; s.fill(); s.filter = 'none';
        }, { grain: 0.25 });
        const Rn = mulberry32(sd * 97);                               // condensation: tiny beads inside the fog
        for (let i = 0; i < 40; i++) { const an = Rn() * TAU, rr = Math.sqrt(Rn()) * r * 0.85, x = 795 + Math.cos(an) * rr, y = 505 + Math.sin(an) * rr * 1.12;
          g.fillStyle = ink(A.qing * 0.9 * a); g.beginPath(); g.arc(x, y, 0.8 + Rn() * 1.6, 0, TAU); g.fill(); }
      }
      // beads on the pane
      for (const d of S.drops) {
        const a = prog(t, d.t0, d.t0 + 0.2); if (a <= 0) continue;
        g.fillStyle = `rgba(245,240,229,${0.55 * a})`; g.beginPath(); g.arc(d.x, d.y, d.r, 0, TAU); g.fill();
        g.strokeStyle = ink(A.zhong * 0.8 * a); g.lineWidth = Math.max(0.8, d.r * 0.18); g.beginPath(); g.arc(d.x, d.y, d.r, 0.1 * Math.PI, 0.95 * Math.PI); g.stroke();
      }
      g.restore();
    }
    // --- B: inside the paper
    if (net > 0) {
      g.save(); g.globalAlpha = net;
      g.drawImage(YUAI.paper, 2000, 200, W / 2.2, H / 2.2, 0, 0, W, H);      // the paper, magnified
      const sp = S.maxd / Math.max(0.6, tAi - tSeep), grow = t - tSeep;
      for (const e of S.edges) {
        const [a, b] = S.dist[e.i] <= S.dist[e.j] ? [e.i, e.j] : [e.j, e.i];
        const u = (grow * sp - S.dist[a]) / e.d; if (u <= 0) continue;
        const pts = a === e.i ? e.pts : e.pts.slice().reverse();
        for (let k = 0; k < 3; k++) {
          const off = (k - 1) * 3.5, q = pts.map(([x, y], s) => [x + off * Math.sin(s * 0.7 + k), y + off * Math.cos(s * 0.5 + k)]);
          inkStroke(g, q, 1.4 + k * 0.6, { alpha: A.dan * (0.7 + 0.25 * k), dry: 0.45, seed: e.seed * 7 + k, upto: clamp(u), taper: BRUSH.hair, wet: 0.5 });
        }
      }
      S.nodes.forEach((n, i) => {
        const age = grow - S.dist[i] / sp; if (!(age > 0)) return;
        inkBloom(g, n.x, n.y, age, { r: n.r, alpha: i === 0 ? A.nong : lerp(A.dan, A.nong, hash(i, 2)), seed: 20 + i, k: 2.5 });
      });
      if (t > tLi) inkBloom(g, W / 2, H / 2, t - tLi, { r: 260, alpha: A.nong, seed: 4, k: 1.3 });
      g.restore();
    }
    yuaiLyrics(g, f);
    return { shake: 1.5 * f.a.kick };
  },
});
