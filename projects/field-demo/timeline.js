// field-demo — placeholder lyrics on a 120 bpm grid, so the cuts sit on bar lines (2 s). A real project cuts with
// cut() / after() / start() on the lyrics instead of seconds. Hard cuts: three unrelated fields, one per shot.
//
// Every read is one thing the viewer has to find, understand and keep; they are timed on the words of the placeholder
// lyrics and each shot's scene turns its subject into the last MV.focus it reports at exactly that moment.
MV.timeline(({ T0, T1, word }) => [
  { scene: 'dipole', from: T0, to: 6,
    reads: [[0.25, 'a bar magnet sunk in a tray of iron dust', 'magnet'],
            [word('under'), 'the magnet is on: every filing turns to face it', 'filings'],
            [word('turn,'), 'a second magnet slides in from the right', 'magnet2'],
            [word('lines'), 'the lines now run from pole to pole', 'filings'],
            [word('field'), 'the field lifts off the tray', 'arcs'],
            [5.2, 'N to S, through the air', 'arcs']] },
  { scene: 'gyroid', from: 6, to: 12,
    reads: [[word('nothing'), 'a surface grows out of the dark', 'ball'],
            [word('is'), 'nothing on it is flat', 'ball'],
            [word('the', 3), 'we drop inside it', 'probe'],
            [word('all'), 'every wall is the same wall', 'probe'],
            [11.4, 'out again: the whole of it is one surface, no edges', 'ball']] },
  { scene: 'flock', from: 12, to: T1,
    reads: [[12.35, 'a flock turning as one body', 'flock'],
            [word('and', 1), 'nobody in it is leading', 'flock'],
            [word('turn', 1), 'something fast comes in from the left', 'hawk'],
            [word('有'), 'the flock splits around it', 'flock'],
            [word('令'), 'and closes again behind it', 'flock'],
            [word('hold'), 'the shape holds', 'flock']] },
]);
