// A room: a round moon window on the left wall, a meiping vase on a table with 瓷 painted on its belly.
// anchors: window (the round window), mark (the character on the vase): the zooms in and out of this room use them.
const ROOM = { win: [1260, 420, 190], mark: [660, 690, 104] };
MV.scene('room', {
  cam(f) { return TD.cam(f.params.end ? 1.08 - 0.08 * ease.outCubic(f.p) : 1 + 0.06 * f.p); },
  anchors(f) {
    const c = this.cam(f), [wx, wy, wr] = ROOM.win, [mx, my, ms] = ROOM.mark;
    return { window: c.rect([wx - wr, wy - wr, 2 * wr, 2 * wr]), mark: c.rect([mx - ms / 2, my - ms / 2, ms, ms]) };
  },
  render(g, f) {
    const c = this.cam(f);
    g.fillStyle = TD.paper; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.scale(c.z, c.z); g.translate(-W / 2, -H / 2);
    // floor and table
    g.beginPath(); g.moveTo(0, 880); g.lineTo(W, 880); TD.stroke(g, 3);
    g.fillStyle = TD.wash; g.fillRect(400, 860, 520, 18);
    g.beginPath(); g.rect(400, 860, 520, 18); g.moveTo(440, 878); g.lineTo(440, 1000); g.moveTo(880, 878); g.lineTo(880, 1000); TD.stroke(g, 4);
    // the round window: night inside, a lattice, a double rim
    const [wx, wy, wr] = ROOM.win;
    g.save(); g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.clip();
    g.fillStyle = TD.night; g.fillRect(wx - wr, wy - wr, 2 * wr, 2 * wr);
    g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(wx + i * wr / 3, wy - wr); g.lineTo(wx + i * wr / 3, wy + wr); g.moveTo(wx - wr, wy + i * wr / 3); g.lineTo(wx + wr, wy + i * wr / 3); }
    TD.stroke(g, 3, 'rgba(30,58,138,0.5)'); g.restore();
    g.beginPath(); g.arc(wx, wy, wr, 0, TAU); TD.stroke(g, 6); g.beginPath(); g.arc(wx, wy, wr + 22, 0, TAU); TD.stroke(g, 3);
    // the vase: small mouth, full shoulder, slim foot
    const v = [[630, 470], [690, 470], [700, 500], [800, 560], [770, 760], [715, 860], [605, 860], [550, 760], [520, 560], [620, 500]];
    g.beginPath(); g.moveTo(...v[0]); g.lineTo(...v[1]); g.quadraticCurveTo(...v[2], 700, 520);
    g.bezierCurveTo(820, 540, 820, 640, 770, 760); g.quadraticCurveTo(740, 830, 715, 860); g.lineTo(605, 860);
    g.quadraticCurveTo(580, 830, 550, 760); g.bezierCurveTo(500, 640, 500, 540, 620, 520); g.quadraticCurveTo(620, 500, 630, 470); g.closePath();
    g.fillStyle = TD.pale; g.fill(); TD.stroke(g, 4);
    g.beginPath(); g.moveTo(552, 600); g.quadraticCurveTo(660, 620, 768, 600); g.moveTo(560, 790); g.quadraticCurveTo(660, 808, 760, 790); TD.stroke(g, 3);
    const [mx, my, ms] = ROOM.mark;
    g.fillStyle = TD.line; g.font = `${ms}px ${TD.serif}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('瓷', mx, my + ms * 0.04);
    g.restore();
  },
});
