// gpus — "Hundred thousand GPU": the datacenter aisle, racks sliding past forever, a hot glow at
// the end of the corridor, the counter rolling to 100,000. The insert dives down the aisle.
MV.scene('gpus', {
  init() {
    this.sp = 620;                                     // rack spacing in z
    this.facePts = [];                                  // per-rack face points (unit rack, reused)
    const rnd = mulberry32(33);
    for (let i = 0; i < 64; i++) this.facePts.push([(rnd() - 0.5) * 1.8, (rnd() - 0.5) * 2.2, 0]);
  },
  render(g, f) {
    lmBegin('ember');
    const roll = f.t * 260;                             // dolly down the aisle
    const cam = lmCamera({ eye: [0, -40, 240 + (roll % this.sp)], target: [0, -20, -1800], fov: 42, shift: [0, 40] });
    // racks: pairs of rows facing the aisle, extending to the fog
    const first = Math.floor(roll / this.sp);
    let ahead = null;
    for (let i = 0; i < 7; i++) {
      const zi = -(i * this.sp) + (roll % this.sp);
      for (const sx of [-300, 300]) {
        const at = [sx, 0, zi];
        lmLines(cam, LG.wirebox([180, 460, 460], { at }), { width: 1.3, color: 'dim', gain: 0.75, fog: 26 });
        // blinking status points on the rack face (the aisle side)
        const face = new Float32Array(this.facePts.length * 3);
        this.facePts.forEach(([u, v], k) => {
          const x = at[0] + Math.sign(sx) * -95, y = at[1] + v * 210, z = at[2] + Math.sign(sx) * -10 - 30;
          face.set([x + u * 8, y, z], k * 3);
        });
        lmPoints(cam, face, { size: 2.4, gain: 0.85, color: hash(first + i, sx > 0 ? 1 : 2, 4) > 0.6 ? 'accent' : 'hot', twinkle: 0.85, t: f.t + first + i, fog: 30 });
      }
      if (i >= 4) ahead = cam.project([0, -20, zi - this.sp * 2.2]);
    }
    // the hot light at the end of the corridor
    const gl = lmGlow();
    const E = ahead || cam.project([0, -20, -4200]);
    if (E) { gl.fillStyle = lmCss('hot', 0.5 + 0.2 * f.a.low); glow(gl, lmCss('hot', 0.9), 90); gl.beginPath(); gl.arc(E[0], E[1], 60 + 20 * Math.sin(f.t * 3), 0, TAU); gl.fill(); }
    // the count, rolling up in the light itself — this shot is the number
    const n = lmCount(f.t, f.from, f.to, 98431, 100000, ease.outQuad);
    gl.save(); gl.font = `600 84px ${LM_MONO}`; gl.letterSpacing = '4px'; gl.textAlign = 'center';
    gl.fillStyle = lmCss('hot', 0.96); glow(gl, lmCss('hot', 0.7), 40);
    gl.fillText(lmFmt(n), W / 2, 742);
    gl.font = `400 19px ${LM_MONO}`; gl.letterSpacing = '5px';
    gl.fillStyle = lmCss('accent', 0.9);
    gl.fillText('G P U   O N L I N E', W / 2, 792);
    gl.restore();
    lmEnd(g, { bloom: 1.2 });
    if (E) MV.focus(W / 2, 712, 'gpu count');
    OPS.lyr(f, o => { OPS.hud(o, f, { rows: [['gpu', lmFmt(n)], ['load', '100%']] }); });
    return { shake: 3 * f.a.kick };
  },
});
