// mv-kit — preview player (index.html in a browser) and the export hook used by tools/render.py.
//
// Preview keys: space play/pause · ←/→ ±1 s (shift ±5 s) · , / . one frame · [ / ] previous/next shot
//               l loop the current shot · d debug overlay (beats, onsets, lyrics, shots) · h hide UI · s save a PNG
// URL: ?t=12.3 start time · &debug=1 · &export=1 (used by the renderer)
(function (G) {
'use strict';
const MV = G.MV;

MV.start = async function () {
  const q = new URLSearchParams(location.search);
  let cv = document.getElementById('mv');
  if (!cv) { cv = document.createElement('canvas'); cv.id = 'mv'; document.body.appendChild(cv); }
  try { await document.fonts.ready; await MV.setup(); }
  catch (err) { fatal(err); return; }
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const P = MV.project;
  let lint = [];
  try { lint = MV.lint(); } catch (err) { console.error('MV.lint failed:', err); }

  if (q.has('export')) {
    document.body.classList.add('export');
    G.MV_EXPORT = {
      info: { title: P.title, from: P.from, to: P.to, fps: P.fps, width: W, height: H, audio: P.audio, warnings: MV.warnings, lint,
              shots: MV.entries.map(e => ({ name: e.name, scene: e.scene, from: e.from, to: e.to })) },
      frame(t, samples = 1, shutter = 0.5, type = 'image/png', quality = 0.95) { MV.lastError = null; MV.renderAt(ctx, t, { samples, shutter }); return cv.toDataURL(type, quality); },
      error: () => MV.lastError,
    };
    G.MV_READY = true;
    return;
  }

  // ---------------------------------------------------------------- preview
  const style = document.createElement('style');
  style.textContent = `
    html,body{margin:0;height:100%;background:#07060b;color:#cfc8da;font:12px/1.4 -apple-system,system-ui,sans-serif;overflow:hidden}
    #mv{position:absolute;inset:0;margin:auto;max-width:100vw;max-height:calc(100vh - 34px);aspect-ratio:${W}/${H};width:100vw;top:0;bottom:34px}
    #mvbar{position:fixed;left:0;right:0;bottom:0;height:34px;display:flex;align-items:center;gap:12px;padding:0 10px;background:#0d0b14}
    #mvstrip{flex:1;height:20px;cursor:pointer}
    #mvinfo{white-space:nowrap;font-variant-numeric:tabular-nums;min-width:330px}
    #mvwarn{position:fixed;left:10px;top:8px;color:#ffb070;white-space:pre-line}
    body.hideui #mvbar, body.hideui #mvwarn{display:none} body.hideui #mv{max-height:100vh;bottom:0}`;
  document.head.appendChild(style);
  const bar = document.createElement('div'); bar.id = 'mvbar';
  bar.innerHTML = `<span id="mvinfo"></span><canvas id="mvstrip" height="40"></canvas><span>space ▶ · d debug · [ ] shots · l loop · h hide · s PNG</span>`;
  document.body.appendChild(bar);
  const warn = document.createElement('div'); warn.id = 'mvwarn'; warn.textContent = MV.warnings.join('\n'); document.body.appendChild(warn);
  if (lint.length) console.warn(`mv-kit check: ${lint.length} timeline / lyric notes (red ticks on the shot strip)\n` + lint.map(w => `${w.t.toFixed(2).padStart(8)}  ${w.kind.padEnd(8)} ${w.msg}`).join('\n'));
  const info = document.getElementById('mvinfo'), strip = document.getElementById('mvstrip'), sg = strip.getContext('2d');

  const audio = new G.Audio(); audio.preload = 'auto'; if (P.audio) audio.src = P.audio;
  let audioOK = !!P.audio;
  audio.onerror = () => { audioOK = false; warn.textContent += `\naudio not found: ${P.audio} (preview plays silently)`; };
  let t = q.has('t') ? +q.get('t') : P.from, playing = false, loop = null, debug = q.has('debug'), clock0 = 0, t0 = 0, lastMs = 0;
  const range = () => loop ? [loop.from, loop.to] : [P.from, P.to];

  const draw = () => {
    const a = performance.now(); MV.renderAt(ctx, t); lastMs = performance.now() - a;
    if (debug) debugOverlay(ctx, t);
    const act = MV.activeAt(t), e = act[act.length - 1];
    info.textContent = `t ${t.toFixed(3)}  ·  bar ${Math.floor(MV.audio.barAt(t)) + 1}.${Math.floor(MV.audio.beatAt(t) - MV.audio.beatAt(MV.audio.downbeatBefore(t))) + 1}  ·  ${e ? e.name : '—'}${loop ? ' (loop)' : ''}  ·  ${lastMs.toFixed(0)} ms`;
    drawStrip();
  };
  const drawStrip = () => {
    const w = strip.clientWidth * devicePixelRatio; if (strip.width !== w) strip.width = w;
    const [a, b] = [P.from, P.to], X = s => (s - a) / (b - a) * strip.width;
    sg.clearRect(0, 0, strip.width, 40);
    MV.entries.forEach((e, i) => { sg.fillStyle = `hsl(${(i * 67) % 360},35%,${e === loop ? 45 : 28}%)`; sg.fillRect(X(e.from), 0, X(e.to) - X(e.from) - 1, 26); });
    sg.fillStyle = 'rgba(255,255,255,0.35)'; for (const d of MV.audio.downbeats) if (d >= a && d <= b) sg.fillRect(X(d), 26, 1, 14);
    sg.fillStyle = '#ff3b3b'; for (const w of lint) if (w.t >= a && w.t <= b) sg.fillRect(X(w.t) - 1, 0, 2, 8);   // MV.lint findings
    sg.fillStyle = '#ff7a3a'; sg.fillRect(X(t) - 1, 0, 3, 40);
  };
  const loopFrame = () => {
    if (!playing) return;
    t = audioOK ? audio.currentTime : t0 + (performance.now() - clock0) / 1000;
    const [a, b] = range();
    if (t >= b) { seek(a); }
    draw(); requestAnimationFrame(loopFrame);
  };
  const seek = s => { const [a, b] = range(); t = Math.min(b - 1e-3, Math.max(a, s)); if (playing) { if (audioOK) audio.currentTime = t; t0 = t; clock0 = performance.now(); } draw(); };
  const play = () => { playing = true; if (audioOK) { audio.currentTime = t; audio.play().catch(() => { audioOK = false; }); } t0 = t; clock0 = performance.now(); loopFrame(); };
  const pause = () => { playing = false; audio.pause(); draw(); };
  const shotIdx = () => { const act = MV.activeAt(t + 1e-4); return act.length ? act[act.length - 1].i : -1; };

  addEventListener('keydown', ev => {
    const k = ev.key;
    if (k === ' ') { ev.preventDefault(); playing ? pause() : play(); }
    else if (k === 'ArrowLeft' || k === 'ArrowRight') seek(t + (k === 'ArrowLeft' ? -1 : 1) * (ev.shiftKey ? 5 : 1));
    else if (k === ',' || k === '.') seek(t + (k === ',' ? -1 : 1) / P.fps);
    else if (k === '[' || k === ']') { const i = clamp(shotIdx() + (k === '[' ? -1 : 1), 0, MV.entries.length - 1); if (loop) loop = MV.entries[i]; seek(MV.entries[i].from); }
    else if (k === 'l') { loop = loop ? null : MV.entries[Math.max(0, shotIdx())]; draw(); }
    else if (k === 'd') { debug = !debug; draw(); }
    else if (k === 'h') { document.body.classList.toggle('hideui'); draw(); }
    else if (k === 's') { const a = document.createElement('a'); a.download = `frame-${t.toFixed(3)}.png`; a.href = cv.toDataURL('image/png'); a.click(); }
  });
  strip.addEventListener('mousedown', ev => { const r = strip.getBoundingClientRect(); seek(P.from + (ev.clientX - r.left) / r.width * (P.to - P.from)); });
  cv.addEventListener('click', () => (playing ? pause() : play()));
  addEventListener('resize', draw);
  draw();
};

function debugOverlay(g, t) {
  const A = MV.audio, L = MV.lyrics;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(20, 20, 620, 190);
  g.font = '600 22px ui-monospace, Menlo, monospace'; g.fillStyle = '#fff';
  const beat = A.beatAt(t), bar = A.barAt(t), sec = A.section(t), act = MV.activeAt(t);
  g.fillText(`t ${t.toFixed(3)}   beat ${beat.toFixed(2)}   bar ${(bar + 1).toFixed(2)}`, 36, 54);
  g.fillText(`shot ${act.map(e => e.name).join(' + ') || '—'}   section ${sec ? sec.name : '—'}`, 36, 84);
  // beat lamp + onset lamps
  const bp = 1 - (beat - Math.floor(beat));
  const lamp = (x, v, col, label) => { g.fillStyle = `rgba(${col},${0.15 + 0.85 * v})`; g.beginPath(); g.arc(x, 120, 14, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ccc'; g.font = '16px ui-monospace, monospace'; g.fillText(label, x - 18, 152); };
  lamp(50, Math.pow(bp, 4), '255,255,255', 'beat'); lamp(120, A.hit('kick', t), '255,90,40', 'kick'); lamp(190, A.hit('snare', t), '80,200,255', 'snare'); lamp(260, A.hit('hat', t, 0.05), '200,255,120', 'hat');
  ['rms', 'low', 'mid', 'high'].forEach((n, i) => { const v = A.env(n, t); g.fillStyle = '#555'; g.fillRect(320 + i * 75, 100, 60, 40); g.fillStyle = '#ffb070'; g.fillRect(320 + i * 75, 140 - 40 * v, 60, 40 * v); g.fillStyle = '#ccc'; g.fillText(n, 322 + i * 75, 160); });
  // lyric line with word progress
  const l = L.lineAt(t);
  if (l) {
    g.font = '700 26px system-ui, sans-serif'; let x = 36; const y = 196;
    for (const w of l.words) { const p = MV.Lyrics.wordProgress(w, t); g.fillStyle = p <= 0 ? '#777' : p >= 1 ? '#fff' : '#ff8a3d'; g.fillText(w.w, x, y); x += g.measureText(w.w + ' ').width; }
  }
  g.restore();
}

function fatal(err) {
  console.error(err);
  const d = document.createElement('pre'); d.style.cssText = 'color:#f88;padding:20px;white-space:pre-wrap;font:14px monospace';
  d.textContent = `mv-kit could not start:\n${err && err.stack ? err.stack : err}`; document.body.appendChild(d);
  G.MV_FATAL = String(err && err.stack ? err.stack : err);
}
MV.fatal = fatal;
})(window);
