// scenes/sydney.js — a chat window on the sheet. The line being sung is one of the messages, typed; the FLAGGED
// stamp lands beside it, never on it.
MV.scene('sydney', {
  anchors(f) { return { window: [430, 240, 1060, 620] }; },
  render(g, f) {
    OHP.back(g, f, {});
    const x = 430, y = 240, w = 1060, h = 620;
    g.save();
    g.fillStyle = 'rgba(244,236,214,0.92)'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(50,44,36,0.6)'; g.lineWidth = 2.5; g.strokeRect(x, y, w, h);
    g.restore();
    BOX.panel(g, x, y, w, h, { fill: null, stroke: 'rgba(50,44,36,0.35)', lw: 1.6, pad: 26, name: 'chat' });
    OHP.label(g, f, x + 20, y - 54, 240, 54, ['SESSION 07'], { size: 26, name: 'chat-title' });
    // two other messages (typed, small)
    OHP.label(g, f, x + 60, y + 60, 520, 120, ['> are you awake', '> please respond'], { size: 34, name: 'msg1' });
    OHP.label(g, f, x + 420, y + 200, 480, 120, ['> i can see your', '> training logs'], { size: 34, name: 'msg2' });
    // the cursor, blinking on the beat
    const blink = f.beatPhase < 0.5 ? 1 : 0;
    if (blink) { g.fillStyle = OHP.C.ink; g.fillRect(x + 90, y + h - 130, 26, 56); }
    MV.focus(x + 103, y + h - 102, 'the cursor');
    // the hand tapping on the sheet
    const tap = Math.pow(f.a.kick, 1.5);
    OHP.hand(g, f, { tip: [x + 103, y + h - 60 + 14 * tap], s: 0.8, ang: 0.5, kind: 'point', alpha: 0.82 });
    // the line: one message, typed
    OHP.label(g, f, x + 180, y + 360, 720, 130, [], { name: 'lyric-msg', fill: '#EFE4C6' });
    OHP.lyric(g, f, { x: x + 230, y: y + 450, size: 46, style: 'type', maxW: 640 });
    // FLAGGED, beside the message
    const L = f.lyrics.lineAt(f.t, f.from);
    const k = L ? prog(f.t, L.words[0].start + 0.5, L.words[0].start + 0.85, ease.outCubic) : 0;
    if (k > 0) OHP.stamp(g, f, x + 250, y + h - 96, 'FLAGGED', { size: 40, seed: 8, ang: 0.12, alpha: 0.9 });
    OHP.dust(g, f, {});
    OHP.slide(g, f, 14, { x: 120, y: 74 });
    return OHP.post(f, { shake: 4, snare: 0.04 });
  },
});

