// S36 killswitch — an empty chair, the red button under its cover, a beach postcard (E4); a sticky note
// "OUT OF OFFICE", the button's little lamp slowly blinking.
MV.scene('killswitch', akStill({
  art: 'E4',
  cam: [[0, { z: 1.06 }], [1, { z: 1.12, x: 0.53 }, ease.inOutQuad]],
  fx(g, f, map) {
    const [bx, by] = map(...AK_SPOT.E4.button), [cx, cy] = map(...AK_SPOT.E4.chair), k = prog(f.lt, 0.2, 0.45, ease.outBack);
    g.save(); g.translate(cx + 40, cy - 60); g.rotate(-0.08); g.scale(k, k); g.fillStyle = '#F3E27A'; g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 10; g.fillRect(-120, -80, 240, 160);
    g.shadowBlur = 0; g.fillStyle = '#2a2230'; g.font = `700 34px ${ILL.F.gothic}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('OUT OF', 0, -22); g.fillText('OFFICE', 0, 24); g.restore();
    illFlare(g, bx, by - 30, 40, '255,60,40', 0.7 * (0.5 + 0.5 * Math.sin(f.t * 2.5)));
    akClipSnow(g, f.t, 30, 36, 0.5);
  },
  ly: { style: 'quiet', x: 960, y: 960, size: 58, track: 6 },
}));
