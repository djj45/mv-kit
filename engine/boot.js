// mv-kit — loader. A project's index.html includes project.js, then this file. It loads, in order:
// the engine, the kits named in project.kits, the data files, project.scripts, scenes/<name>.js for
// every name in project.scenes, and timeline.js; then starts the preview (or the export hook).
// Plain <script> tags (no modules, no build step), so index.html also works straight from disk.
(function () {
  'use strict';
  const me = document.currentScript;
  const engine = me.src.replace(/boot\.js(\?.*)?$/, '');
  const P = window.MV_PROJECT || {};
  const optional = new Set();
  const data = P.data || ['data/audio.js', 'data/lyrics.js'];
  data.forEach(d => optional.add(d));
  const list = ['core.js', 'data.js', 'draw.js', 'engine.js', 'qa.js', 'transitions.js', 'player.js'].map(f => engine + f)
    .concat((P.kits || []).map(k => engine + '../kits/' + k + '.js'))
    .concat(data)
    .concat(P.scripts || [])
    .concat((P.scenes || []).map(s => 'scenes/' + s + '.js'))
    .concat([P.timeline || 'timeline.js']);
  window.MV_DATA = window.MV_DATA || {};
  const next = i => {
    if (i >= list.length) { window.MV.start(); return; }
    const s = document.createElement('script');
    s.src = list[i];
    s.onload = () => next(i + 1);
    s.onerror = () => {
      if (optional.has(list[i])) { next(i + 1); return; }
      const msg = `mv-kit: could not load ${list[i]}`;
      console.error(msg); window.MV_FATAL = msg;
      const d = document.createElement('pre'); d.style.cssText = 'color:#f88;padding:20px;font:14px monospace'; d.textContent = msg; document.body.appendChild(d);
    };
    document.head.appendChild(s);
  };
  window.addEventListener('error', ev => { window.MV_FATAL = window.MV_FATAL || `${ev.message} (${ev.filename}:${ev.lineno})`; });
  next(0);
})();
