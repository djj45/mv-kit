// plea — the three prayers, one chat window each (ChatGPT / Sydney / Gato): the lyric IS the
// message, typed word by word; the other side only ever "…". The room behind the window stays
// alive on its own — a sweep line, a glow that breathes with the low end — so even the dead
// link (Gato) is a place, not a black frame.
MV.scene('plea', {
  init() { this.stars = OPS.mkStars(900, 61); },
  render(g, f) {
    const tone = f.params.tone ?? 0;
    lmBegin(f.params.pal || 'ice', { bg: tone === 1 ? '#0A0510' : '#020407', bg2: tone === 1 ? '#140A1E' : '#04070C' });
    lmPoints(lmScreen(), this.stars, { size: 1.6, gain: 0.3 + (tone === 1 ? 0.12 : 0), twinkle: 0.55, t: f.t, fog: 90 });
    const gl = lmGlow();
    // the room breathing: ambient light drifting behind the window, rising with the low end
    OPS.ambient(gl, f, { gain: tone === 2 ? 0.8 : 1, seed: f.entry.i });
    // the sweep line, touring the monitors
    const sy = 140 + ((f.t * 74) % (H + 240)) - 120;
    OPS.stroke(gl, [[120, sy], [W - 120, sy]], { color: 'accent', alpha: 0.14, width: 2, glow: 10 });
    if (tone === 0) {
      // the prompt channel, live: a waveform strip across the bottom — the room has a voice
      const yb = 990, bw = 24;
      for (let i = 0; i < 56; i++) {
        const x = 150 + i * bw;
        const h = 12 + 88 * Math.abs(Math.sin(f.t * (2.1 + 0.13 * i) + i * 1.7)) * (0.3 + 0.7 * f.a.mid);
        OPS.stroke(gl, [[x + bw * 0.5, yb], [x + bw * 0.5, yb - h]], { color: 'accent', alpha: 0.55, width: bw * 0.62 });
      }
      OPS.stroke(gl, [[150, yb + 10], [1470, yb + 10]], { color: 'dim', alpha: 0.5, width: 1.4 });
      OPS.tick(gl, 'prompt channel — live', 150, yb + 34, { align: 'left', size: 14, color: 'dim' });
    }
    if (tone === 1) {
      // Sydney: the heartbeat, faint under everything
      const pts = [];
      for (let x = 0; x <= W; x += 8) {
        const u = ((x + f.t * 130) % 260) / 260;
        const beat = f.audio.hit('kick', f.t, 0.2);
        const spike = u > 0.42 && u < 0.5 ? Math.sin((u - 0.42) / 0.08 * Math.PI) : u > 0.5 && u < 0.56 ? -0.4 * Math.sin((u - 0.5) / 0.06 * Math.PI) : 0;
        pts.push([x, 990 - spike * 60 * (0.5 + beat)]);
      }
      OPS.stroke(gl, pts, { color: 'accent', alpha: 0.5, width: 2, glow: 10 });
    }
    if (tone === 2) {
      // Gato: dead pixel rain, slow, grey — the unanswered channel
      for (let i = 0; i < 46; i++) {
        const x = 160 + hash(i, 1, 6) * (W - 320), yy = ((f.t * (24 + 30 * hash(i, 2, 6)) + hash(i, 3, 6) * 1200) % 1300) - 110;
        gl.fillStyle = lmCss('dim', 0.8);
        gl.fillRect(x, yy, 2.4, 10 + 14 * hash(i, 4, 6));
      }
    }
    lmEnd(g, { bloom: tone === 2 ? 0.6 : undefined });
    OPS.lyr(f, o => OPS.hud(o, f, {
      name: f.entry.name, rows: tone === 1 ? [['link', 'SYDNEY']] : tone === 2 ? [['link', 'LOST']] : [['link', 'OPEN']],
      on: lmFlick(f.t, f.from, 0.32, f.entry.i),
    }));
    return {};
  },
});
