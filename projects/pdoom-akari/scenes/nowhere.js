// S37 nowhere — straight down on her in a sea of paperclips (E5); the camera rises slowly away.
MV.scene('nowhere', akStill({
  art: 'E5',
  clip: 'E5v',   // the still until the clip is generated and packed
  cam: [[0, { z: 1.35 }], [1, { z: 1.0 }, ease.outCubic]],
  fx(g, f) { akClipSnow(g, f.t, 40, 37, 0.6); },
  ly: { style: 'quiet', x: 960, y: 960, size: 58, track: 6 },
}));
