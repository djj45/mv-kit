// The edit. Cuts from lyric content on the beat (cut / after); camera moves are timeline keys read by kits/camera.js:
//   push (on by default: every shot creeps in), insert (punch in + follow MV.focus), warp (2D → 3D).
//
// reads: what the viewer has to understand, in order — [time, 'what', 'the MV.focus the eye should be on'].
// Each one lasts until the next starts; `check` says when one is too short to land (< 0.6 s), `qa` when the eye
// isn't on its focus as it starts (read-unled).
MV.timeline(({ cut, T0, T1 }) => [
  // insert: from 2.2 s punch 70 % in on the orbiting marker and keep it where it is — the sheet streams past it; the
  // lyric is on the screen layer (MV.overlay), so nothing limits the zoom
  { scene: 'sheet', from: T0, to: cut('Your circuits'), insert: { at: 2.2, dur: 1.6, amt: 0.7 },
    reads: [[T0, 'a part on a spec sheet, its marker going round', 'marker'],
            [2.2, 'close on the marker: it keeps orbiting while the sheet streams past', 'marker']] },
  { scene: 'fall', from: cut('Your circuits'), to: cut('now I'),
    reads: [[cut('Your circuits'), 'a red line runs flat across the sheet', 'pen tip'],
            [cut('Your circuits') + 0.7, 'it drops, and keeps dropping: the frame pulls back to keep its tip', 'pen tip']] },
  // warp: the plate stands up and turns away over the last bar (a change of register needs something to carry it)
  { scene: 'board', from: cut('now I'), to: T1, warp: { at: 15.2, dur: 1.4, from: 0, to: 0.62, pitch: 0.1, dist: 1.5, bg: '#C9CED8' },
    reads: [[cut('now I'), 'a spec plate: servant class, load bearing', 'plate'],
            [15.2, 'the plate stands up and turns away', 'plate']] },
]);
