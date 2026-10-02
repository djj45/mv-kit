// S20 accel — a cut on every beat: light trails (C3) and the city at night (C10) alternate, pushing faster each
// time; speed lines from the third beat. akMontage picks the picture of beat k.
MV.scene('accel', akCustom({
  init() { akArt('C3'); akArt('C10'); },
  render(g, f) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const b0 = Math.round(f.audio.beatAt(f.from)), b = Math.floor(f.beat + 0.02) - b0, ph = f.beat - Math.floor(f.beat + 0.02) + 0.02;
    const id = b % 2 ? 'C10' : 'C3', speed = 1 + b * 0.35;
    const map = illCover(g, akArt(id), { x: 0.5 + 0.06 * Math.sin(b * 2.1), y: 0.5 + 0.05 * Math.cos(b * 1.7), z: 1.05 + 0.18 * speed * ease.outCubic(clamp(ph)), rot: (b % 2 ? 1 : -1) * 0.02 * b });
    if (id === 'C10') akLights('C10', 120, [0, 0, 1, 1]).forEach((p, i) => { if (hash(b, i) < 0.4) { const [x, y] = map(p.u, p.v); akDot(g, x, y, 2, 1 - ph, f.tick, i); } });
    if (b >= 2) focusLines(g, W / 2, H / 2, 60 + 20 * b, 420 - 25 * b, `rgba(255,248,238,${0.12 + 0.04 * b})`, 7 + b, f.tick, 6);
    akLy(g, f, { style: 'slant', x: 960, y: 930, size: 88 });
    return { zoom: 1 + 0.03 * (1 - ph) };
  },
}));
