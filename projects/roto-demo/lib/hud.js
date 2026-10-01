// roto-demo shared pieces: the corner HUD (drawing counter + P(DOOM) meter) and the vertical Mincho caption.
// Project globals are prefixed RD_ (scripts share one global scope).

/** P(DOOM) reading at t: climbs line by line, pins at 99.9 on the sung "P(doom)", then breaks. */
function RD_pdoom(L, t) {
  const at = q => L.get(q).words[0].start;
  const pd = L.findWords('P(doom)').filter(w => w.start > at('RLHF goes askew'))[0];
  const k = keys(t, [[at('Till you learned'), 61], [at('Hundred thousand'), 74, ease.outCubic], [at('RLHF goes askew'), 86, ease.outCubic],
    [pd.start, 92], [pd.start + 0.12, 99.9, ease.outExpo]]);
  const broken = t > L.get('Just as foretold').words[0].start;
  return { value: k / 100, text: broken ? (tick(t) % 2 ? 'ERR' : '∞%') : `${k.toFixed(k > 99 ? 1 : 0)}%`, hot: k > 90 || broken };
}
function RD_hud(g, f, o = {}) {
  rotoHud(g, f.t, {
    col: o.col, a: o.a,
    left: [`T+${f.t.toFixed(2)}s`, `DRAWING ${String(f.tick).padStart(5, '0')} · ${MV.drawRate}/s · ${f.entry.scene.toUpperCase()}`],
    meter: { label: 'P(DOOM)', ...RD_pdoom(f.lyrics, f.t) },
  });
}
/** Vertical Mincho caption, revealed top-down over `dur` seconds from `at`. */
function RD_caption(g, text, x, y, size, col, t, at, dur = 0.5) {
  const ch = [...text], n = Math.ceil(ch.length * clamp((t - at) / dur));
  g.save(); g.font = ROTO.F.mincho(size); g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < n; i++) g.fillText(ch[i], x, y + size * 1.05 * i + size / 2);
  g.restore();
}
