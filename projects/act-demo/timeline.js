// The edit, cut on the lyrics and the beat. Every shot lists its reads: what the viewer has to understand, in order —
// [time, 'what', 'the MV.focus the eye should be on']. One read at a time, each ≥ 0.6 s (`check` says when one is too
// short), and the scene makes the read's object the subject as it starts (`qa`: read-unled).
MV.timeline(({ cut, word, T0, T1 }) => [
  { scene: 'wake', from: T0, to: cut('Your circuits'),
    reads: [[T0, 'Pip asleep on the floor', 'pip'],
            [1.6, 'a spark drifts in', 'spark'],
            [word('sparks'), 'Pip wakes with a start', 'pip'],
            [word('AGI'), 'stars in its eyes: it jumps for the spark', 'pip']] },
  { scene: 'chase', from: cut('Your circuits'), to: cut('now I'),
    reads: [[cut('Your circuits'), 'the spark zips off to the right', 'spark'],
            [6.5, 'Pip trots after it, nervous', 'pip'],
            [word('no'), 'Pip stops and turns to us: no surprise', 'pip'],
            [word('drop'), 'the spark drops off the edge', 'spark'],
            [11.34, 'Pip creeps to the edge and peers down', 'pip']] },
  { scene: 'boss', from: cut('now I'), to: T1,
    reads: [[cut('now I'), 'the spark rises back, bigger', 'spark'],
            [word('servant'), 'three Pips bow to it, one after another', 'pip'],
            [word('and'), 'they dance for it, each a little out of step', 'pip']] },
]);
