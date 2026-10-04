// scenes/clips.js — as paperclips fill the room: they come down out of the beam and pile up in the lower half,
// each one a function of the song time, none of them random.
MV.scene('clips', {
  init() {
    this.c = [];
    for (let i = 0; i < 150; i++) {
      const col = i % 5;
      this.c.push({
        t0: 96.5 + i * 0.016 + hash(i, 3, 7) * 0.5,                  // when it falls into the beam
        x: col % 2 === 0 ? 66 + hash(i, 5, 9) * 230 : 1180 + hash(i, 5, 9) * 660,   // a corridor for the words
        rot: (hash(i, 7, 2) - 0.5) * 2.4,
        s: 90 + hash(i, 11, 4) * 70,
        pileY: 760 + Math.floor(i / 12) * 26 + hash(i, 13, 5) * 18,
      });
    }
  },
  render(g, f) {
    OHP.back(g, f, { dim: 0.12, cold: 0.2 });
    let fall = null;
    for (const c of this.c) {
      const age = f.t - c.t0;
      if (age < 0) continue;
      const fallT = Math.min(1, age / (0.55 + c.x / 4000));
      const y = lerp(-160, c.pileY, ease.inQuad(fallT));
      OHP.clip(g, c.x + (1 - fallT) * 20 * noise1(f.t * 0.7 + c.x, 3), y, c.s, c.rot, 0.5);
      if (fallT < 1 && y > 90 && c.x > 140 && c.x < W - 140) fall = [c.x, y];   // only a clip well inside the frame
    }
    MV.focus(fall ? fall[0] : 900, fall ? fall[1] : 620, fall ? 'a falling clip' : 'the pile');
    // the light is being blocked: a soft dark band over the pile
    const pile = clamp((f.t - 96.5) / 2.2);
    g.save(); g.globalAlpha = 0.42 * pile;
    const bg2 = g.createLinearGradient(0, 560, 0, H);
    bg2.addColorStop(0, 'rgba(20,22,30,0)'); bg2.addColorStop(0.55, 'rgba(20,22,30,0.85)'); bg2.addColorStop(1, 'rgba(20,22,30,1)');
    g.fillStyle = bg2; g.fillRect(0, 560, W, H - 560); g.restore();
    OHP.dust(g, f, { gain: 0.7 });
    OHP.slide(g, f, 25, { x: 120, y: 74 });
    OHP.lyric(g, f, { x: 320, y: 520, size: 58, style: 'hand', color: '#2A2C33', maxW: 1300 });
    return OHP.post(f, { shake: 4 + 6 * pile, snare: 0.05, vignette: 0.5 });
  },
});

