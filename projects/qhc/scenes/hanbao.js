// S6 hanbao — L10–L11, the stillest shot. Close on the powdery glaze: under it, the ghost of her empty face and of
// the peony. Where the peony's heart is, a warm grey-pink shows through (釉里红 under raw glaze), brightening and
// dimming with the voice. L11: the bud's ghost trembles a little on every beat, as if about to open — and doesn't.
const QS6 = {};
MV.scene('hanbao', {
  init(MV) { QS6.L = pigmentLayers(); QS6.l11 = MV.lyrics.get('如含'); },
  render(g, f) {
    const t = f.t, L = QS6.L;
    const z = lerp(2.7, 3.3, ease.inOutQuad(f.p)), cx = lerp(214, 196, f.p), cy = lerp(200, 214, f.p);
    // the tremble: from L11, a small shiver on each beat
    const tr = t >= QS6.l11.words[0].start - 0.1 ? Math.pow(1 - f.beatPhase, 4) : 0;
    const jx = tr * 2.2 * Math.sin(f.beat * 7.1), jy = tr * 1.4 * Math.cos(f.beat * 5.3);
    const tx = W / 2 - cx * z + jx, ty = H / 2 - cy * z + jy;
    L.clear(); qhcPanelAFlat(L, tx, ty, z, { tk: 0 });
    pigmentDraw(g, L, { preset: 'raw', offset: [-tx, -ty], scale: z * 0.7, seed: 3 });
    g.fillStyle = 'rgba(239,235,228,0.9)'; g.fillRect(0, 0, W, H);
    // the warm heart under the glaze, breathing with the voice
    const hx = tx + 150 * z, hy = ty + 244 * z, br = 0.35 + 0.65 * clamp(f.a.mid * 1.4 + 0.15 * f.a.vocals);
    const R = (70 + 26 * br) * z / 2.7;
    const gr = g.createRadialGradient(hx, hy, 0, hx, hy, R);
    gr.addColorStop(0, `rgba(190,140,136,${0.5 * br})`); gr.addColorStop(0.45, `rgba(200,160,152,${0.28 * br})`); gr.addColorStop(1, 'rgba(210,180,170,0)');
    g.fillStyle = gr; g.fillRect(hx - R, hy - R, 2 * R, 2 * R);
    qhcBodyShade(g, tx, ty, z, { a: 0.22, room: '#E9E4DA' });
    qhcLyrics(g, f, 1700, 180);
  },
});
