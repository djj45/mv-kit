// pigment-demo — no lyrics: plain seconds.
MV.timeline(({ T0, T1 }) => [
  { scene: 'swatch', from: T0, to: 4 },
  { scene: 'fill', from: 4, to: T1 },
]);
