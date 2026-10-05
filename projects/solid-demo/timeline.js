// solid-demo — placeholder lyrics on a 120 bpm grid, so the cuts sit on bar lines (2 s). A real project cuts with
// cut() / after() / start() on the lyrics instead of seconds. Hard cuts: three unrelated demonstrations.
MV.timeline(({ T0, T1, word }) => [
  { scene: 'glass', from: T0, to: 6,
    reads: [[T0, 'a glass heart, beating', 'heart'], [word('inside'), 'a light comes on inside it', 'core'], [word('bends'), 'the light around it bends through the glass', 'heart']] },
  { scene: 'lattice', from: 6, to: 12,
    reads: [[6, 'a dark lattice powers on', 'lattice'], [word('room', 1), 'we surge through it, room by room', 'probe']] },
  { scene: 'sand', from: 12, to: T1,
    reads: [[12, 'a plate of sand, still', 'plate'], [word('shake'), 'it rings: the sand runs to the quiet lines', 'plate'], [14, 'a new note: the pattern jumps', 'plate'], [16, 'and again, finer', 'plate']] },
]);
