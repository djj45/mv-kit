// The edit: one entry per shot, cut on sung syllables / beats (CUT is computed from the lyrics in lib/cues.js).
MV.timeline(() => [
  { scene: 'rooftop', from: CUT.s1, to: CUT.s2 },   // Chat · G
  { scene: 'sky', from: CUT.s2, to: CUT.s3 },       // P · T,
  { scene: 'face', from: CUT.s3, to: CUT.s3b },     // please don't
  { scene: 'eye', from: CUT.s3b, to: CUT.s4 },      // eat me
  { scene: 'alive', from: CUT.s4, to: CUT.s5 },     // alive
  { scene: 'hook', from: CUT.s5, to: CUT.s6 },      // I'm upping my P(doom)
  { scene: 'foom', from: CUT.s6, to: T1 },          // 'cause the future goes FOOM
]);
