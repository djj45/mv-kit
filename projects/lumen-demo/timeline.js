// lumen-demo — placeholder lyrics on a 120 bpm grid, so cuts sit on bar lines (2 s). A real project cuts with
// cut() / after() / start() on the lyrics instead of seconds.
MV.timeline(({ T0, T1 }) => [
  { scene: 'boot', from: T0, to: 4 },
  { scene: 'galaxy', from: 4, to: 8 },
  { scene: 'arcs', from: 7.6, to: 12, fadeIn: 0.6 },          // ice → ember: a slow cross-fade
  { scene: 'morph', from: 12, to: 16 },
  { scene: 'paper', from: 16, to: 20 },
  { scene: 'alert', from: 19.75, to: T1, fadeIn: 0.5, wipe: 'glitch' },
]);
