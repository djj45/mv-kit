// "Killswitch guy's on PTO": the email asking someone to press the button, and the auto-reply. Beside it the button
// itself, big and red, and an empty chair.
MV.scene('pto', {
  init() { this.S = prSheet({ cpi: 15, lpi: 8 }); },
  render(g, f) {
    const S = this.S.clear(), t = f.t, tq = f.tq, c = S.g, ln = f.lyrics.get('Killswitch'), w = ln.words.map(x => x.start);
    PP.header(S, f, f.params.page);
    const mail = ['TO:      KILLSWITCH-OPERATOR', 'SUBJECT: URGENT - PLEASE PRESS THE BUTTON', 'SENT:    02:14 AM', '', 'IT IS DOING THE THING. PRESS IT. PLEASE.'];
    mail.forEach((l, i) => { if (l) PP.type(S, f, 8, 4 + i, l, f.from + 0.05 + i * 0.1, { chain: true, dur: 0.08 }); });
    if (t >= w[3]) {
      const reply = ['AUTO-REPLY:', 'I AM OUT OF THE OFFICE UNTIL MONDAY', 'WITH LIMITED ACCESS TO EMAIL.', 'FOR URGENT MATTERS PLEASE CONTACT:', '    (NOBODY)'];
      reply.forEach((l, i) => PP.type(S, f, 8, 12 + i * 2, l, w[3] + i * 0.12, { red: i === 0 || i === 4, x: i === 0 ? 2 : 1, xh: 1, chain: true, dur: 0.08, strike: i === 0 ? 2 : 1 }));
    }
    // the button: a red dome on a plate; the chair beside it, empty
    const bx = 1440, by = 470;
    c.fillStyle = '#9a9a9a'; c.fillRect(bx - 210, by + 40, 420, 60); c.strokeStyle = '#000'; c.lineWidth = 6; c.strokeRect(bx - 210, by + 40, 420, 60);
    const bg = c.createRadialGradient(bx - 60, by - 60, 20, bx, by, 190); bg.addColorStop(0, '#ffb0b0'); bg.addColorStop(1, '#ff0000');
    c.fillStyle = bg; c.beginPath(); c.ellipse(bx, by + 40, 170, 150, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 6; c.beginPath(); c.moveTo(1040, 780); c.lineTo(1040, 620); c.lineTo(1150, 620); c.lineTo(1150, 780); c.moveTo(1040, 620); c.lineTo(1040, 470); c.stroke();  // the chair
    const [bc, br] = S.tcell(bx, by + 140); S.put(bc - 5, br, 'KILL SWITCH', { strike: 2 });
    PP.lyric(S, f, ln, 66, 36, { x: 3, align: 'center', red: ['PTO'], width: 124 });
    prPrint(g, S, { cam: { x: W / 2, y: H / 2 + 10, z: 0.9 }, seed: f.tick, key: f.tick });
    return { shake: 1.5 * f.a.kick };
  },
});
