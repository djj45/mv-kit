// corridor — Seedream still K5: her back, alone in an endless data-centre aisle. The still is only a plate: the
// camera pushes a step on every beat, the lines boil on twos, and on "askew" the whole frame (type included)
// rolls into a dutch angle.
MV.scene('corridor', {
  render(g, f) {
    const t = f.t, L = f.lyrics;
    const gpu = L.get('Hundred thousand'), rlhf = L.get('RLHF goes askew'), askew = rlhf.words[2];
    // push: one step per beat (eased inside the beat), continuous in t
    const steps = Math.floor(f.beat) + ease.outCubic(f.beatPhase) - Math.floor(MV.audio.beatAt(f.from));
    const roll = -0.13 * ease.outBack(prog(t, askew.start, askew.start + 0.22));
    const z = 1.1 + 0.022 * steps + Math.abs(roll) * 1.9;
    g.save();
    rotoDraw(g, rotoFrame('K5', t), { pal: 'dc', tick: f.tick, misCol: ROTO.INK.claude, cam: { x: 0.5, y: 0.5, z, rot: roll } });
    // GPU count: 1 → 100,000 across the line, ticking on the drawings
    const n = Math.round(Math.pow(10, 5 * prog(onTwos(t), gpu.words[0].start, gpu.words[2].start + 0.3, ease.inQuad)));
    if (t >= gpu.start) {
      g.font = ROTO.F.mono(40); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.fillStyle = ROTO.INK.navy; g.fillText(`× ${n.toLocaleString('en-US')} GPU`, 99, H - 93);
      g.fillStyle = ROTO.INK.cream; g.fillText(`× ${n.toLocaleString('en-US')} GPU`, 96, H - 96);
    }
    // lyrics in the ceiling (clear of the caption on the right); the second line rolls with the frame
    rotoKara(g, t, gpu, { box: [96, 196, W - 352, 170], max: 160, valign: 'top', col: ROTO.INK.cream, accent: ROTO.INK.claude, shadow: ROTO.INK.blue });
    g.save(); g.translate(W / 2, H / 2); g.rotate(-roll * 0.6); g.translate(-W / 2, -H / 2);
    rotoKara(g, t, rlhf, { box: [96, 196, W - 352, 170], max: 160, valign: 'top', col: ROTO.INK.cream, accent: ROTO.INK.claude, shadow: ROTO.INK.blue });
    g.restore();
    RD_caption(g, '十万の演算', W - 130, 250, 46, ROTO.INK.cream, t, f.from + 0.2);
    RD_hud(g, f);
    g.restore();
    return { press: { mis: 1.5 + 3 * f.a.kick, grain: 0.035, vig: 0.45 } };
  },
});
