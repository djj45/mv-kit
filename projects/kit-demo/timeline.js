// The edit. Cuts from lyric content on the beat (cut / after); camera moves are timeline keys read by kits/camera.js:
//   push (on by default: every shot creeps in), insert (punch in + follow MV.focus), warp (2D → 3D).
MV.timeline(({ cut, T0, T1 }) => [
  // insert: from 2.2 s punch 70 % in on the orbiting marker and keep it where it is — the sheet streams past it; the
  // lyric is on the screen layer (MV.overlay), so nothing limits the zoom
  { scene: 'sheet', from: T0, to: cut('Your circuits'), insert: { at: 2.2, dur: 1.6, amt: 0.7 } },
  { scene: 'fall', from: cut('Your circuits'), to: cut('now I') },
  // warp: the plate stands up and turns away over the last bar (a change of register needs something to carry it)
  { scene: 'board', from: cut('now I'), to: T1, warp: { at: 15.2, dur: 1.4, from: 0, to: 0.62, pitch: 0.1, dist: 1.5, bg: '#C9CED8' } },
]);
