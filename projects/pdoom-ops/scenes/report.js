// report — the coda: the light goes out and the whole film collapses into a printed incident
// report (lumen's paper mode — light becomes ink). Fields fill in one by one, the stamp comes
// down on FOOM, the last line is typed, and then the lamp is switched off: paper, cursor, dark.
MV.scene('report', {
  render(g, f) {
    lmBegin('paper');
    const cam = lmScreen();
    const gl = lmGlow();
    // registration marks, like a printed form
    for (const [mx, my] of [[120, 120], [W - 120, 120], [120, H - 120], [W - 120, H - 120]]) OPS.stroke(gl, [[mx - 12, my], [mx + 12, my]], { color: 'dim', alpha: 0.8, width: 1.2 }), OPS.stroke(gl, [[mx, my - 12], [mx, my + 12]], { color: 'dim', alpha: 0.8, width: 1.2 });
    // the report body — one line per 0.55 s, typed
    const lines = [
      'INCIDENT REPORT            NO. 001',
      '',
      'SUBJECT    training run 001 — "pdoom"',
      'FACILITY   operations, night shift',
      'P(DOOM)    100.0 %   (was 2 %)',
      'STATUS     FOOM',
      'CAUSE      a sudden drop in training loss',
      '           a sharp left turn (no CDR)',
      '           paperclips',
      'OPERATOR   typing',
      'LESSONS    none recorded',
    ];
    const shown = Math.min(lines.length, Math.floor((f.lt - 0.2) / 0.92));
    let cursor = null;
    lines.forEach((ln, i) => {
      if (i > shown) return;
      const part = i === shown ? ln.slice(0, Math.floor((f.lt - 0.2 - i * 0.92) / 0.02)) : ln;
      gl.save(); gl.font = `500 ${i === 0 ? 40 : 30}px ${LM_MONO}`; gl.letterSpacing = '2px';
      gl.fillStyle = lmCss(i === 0 ? 'fg' : /P\(DOOM\)|STATUS|FOOM/.test(ln) ? 'warn' : 'fg', 0.92);
      gl.fillText(part, 330, 330 + i * 62);
      if (i === shown && shown < lines.length) {
        gl.fillStyle = lmCss('accent', 0.9);
        gl.fillRect(330 + gl.measureText(part).width + 6, 330 + i * 62 - 26, 15, 34);
        cursor = [330 + gl.measureText(part).width, 330 + i * 62];
      }
      gl.restore();
    });
    // after the form is full, the operator is still there: a cursor breathing on the last line,
    // and the desk lamp's slow pass over the paper — the page is never a still frame
    if (shown >= lines.length) {
      const cy = 330 + (lines.length - 1) * 62, dots = '.'.repeat(1 + Math.floor(f.t * 2) % 3);
      gl.save(); gl.font = `500 30px ${LM_MONO}`; gl.letterSpacing = '2px';
      gl.fillStyle = lmCss('fg', 0.92); gl.fillText(`OPERATOR: still typing${dots}`, 330, cy + 72);
      gl.fillStyle = lmCss('accent', (Math.floor(f.t * 1.6) % 2) ? 0.9 : 0.15);
      gl.fillRect(330 + 460 + 14, cy + 72 - 26, 15, 34);
      gl.restore();
    }
    { // the lamp passing over the page (ink mode: a soft shadow band, drifting)
      const lx = ((f.lt * 0.06) % 1.4 - 0.2) * W;
      const rg = gl.createLinearGradient(lx - 500, 0, lx + 500, 0);
      rg.addColorStop(0, 'rgba(25,25,27,0)'); rg.addColorStop(0.5, 'rgba(25,25,27,0.05)'); rg.addColorStop(1, 'rgba(25,25,27,0)');
      gl.fillStyle = rg; gl.fillRect(0, 0, W, H);
    }
    // the stamp: FOOM — CERTIFIED, thumping down partway
    const st = prog(f.lt, 11.0, 11.42, ease.outBack);
    if (st > 0) {
      gl.save(); gl.translate(1210, 840); gl.rotate(-0.22); gl.scale(1 + (1 - st) * 1.4, 1 + (1 - st) * 1.4);
      gl.globalAlpha = clamp(st) * 0.92;
      gl.strokeStyle = lmCss('warn', 0.95); gl.lineWidth = 5;
      gl.beginPath(); gl.arc(0, 0, 128, 0, TAU); gl.stroke();
      gl.font = `700 56px ${LM_MONO}`; gl.letterSpacing = '6px'; gl.textAlign = 'center'; gl.textBaseline = 'middle';
      gl.fillStyle = lmCss('warn', 0.95);
      gl.fillText('FOOM', 0, -16);
      gl.font = `400 17px ${LM_MONO}`; gl.letterSpacing = '3px';
      gl.fillText('C E R T I F I E D', 0, 40);
      gl.restore();
    }
    lmEnd(g, { bloom: 0 });
    MV.focus(st > 0 ? 1210 : (cursor ? cursor[0] + 300 : 960), st > 0 ? 840 : (cursor ? cursor[1] : 540), st > 0 ? 'stamp' : 'typing');
    // no HUD chrome on paper — the corner marks are the frame
    // the lights go out: the last seconds fade to black (audio fades with it)
    const fade = prog(f.t, f.to - 2.6, f.to - 0.35);
    return { fade };
  },
});
