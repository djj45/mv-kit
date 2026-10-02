// S13 room — the paper room (B5). A blank note slides out of the slot and words write themselves on it, one
// character at a time: "你确定，/被关在房间里的是我吗？" — she is the one sitting in the room. B5v: she looks up from
// the manual at the slot and freezes (packed from 0.7–2.35 s of the clip: the lamp redraws itself after 2.4 s).
/** A paper note with lines of text; only the first `shown` characters are written yet. */
function akNote(g, x, y, w, h, lines, rot, shown = Infinity) {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#FBF5E6'; g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 14; g.fillRect(-w / 2, -h / 2, w, h);
  g.shadowBlur = 0; g.fillStyle = '#2a2230';
  const fs = h / (lines.length * 1.45 + 0.5), lh = fs * 1.45;
  g.font = `700 ${fs}px ${ILL.F.mincho}`; g.textAlign = 'left'; g.textBaseline = 'middle';
  let left = shown;
  lines.forEach((ln, i) => {
    const chars = [...ln], lw = g.measureText(ln).width, n = Math.max(0, Math.min(chars.length, left));
    g.fillText(chars.slice(0, n).join(''), -lw / 2, (i - (lines.length - 1) / 2) * lh);
    left -= chars.length;
  });
  g.restore();
}
const AK_ROOM_NOTE = ['你确定，', '被关在房间里的是我吗？'];
MV.scene('room', akStill({
  art: 'B5',
  cam: [[0, { z: 1.05 }], [1, { z: 1.1 }]],
  // 动感: in on her and the desk on the bar line, while the words are still writing themselves
  snap: { shots: [{ z: 1.05 }, { x: 0.64, y: 0.55, z: 1.3 }] },
  clip: 'B5v',
  fx(g, f, map) {
    const [sx, sy] = map(...AK_SPOT.B5.slot), s = map.scale;
    const kin = prog(f.lt, 0.05, 0.3, ease.outCubic), total = AK_ROOM_NOTE.join('').length, sc = lerp(0.3, 1, kin);
    const shown = Math.floor(prog(f.lt, 0.32, 0.95) * total + 1e-6);   // whole characters, so it reads as writing
    // pushed out of the slot: starts small inside the window opening, grows as it falls to rest clear of her face and the HUD
    akNote(g, sx - lerp(0, 85, kin) * s, sy + lerp(0, 205, kin) * s, 460 * s * sc, 170 * s * sc, AK_ROOM_NOTE, lerp(0.06, -0.035, kin), shown);
  },
  ly: { style: 'slant', x: 960, y: 930, size: 84 },
}));
