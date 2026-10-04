// The video cover: one scene, rendered through the film's own pipeline.
window.MV_PROJECT = {
  "title": "AGI cover",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "data": [
    "../anime-pdoom/data/audio.js",
    "../anime-pdoom/data/lyrics.js"
  ],
  "from": 0.0,
  "to": 6.0,
  "fps": 30,
  "drawRate": 12,
  "width": 1920,
  "height": 1080,
  "kits": [
    "lumen"
  ],
  "scripts": [
    "../pdoom-akari/lib/fonts.js",
    "../pdoom-ds/lib/ds.js",
    "../pdoom-ds/lib/mind.js",
    "../pdoom-ds/lib/telemetry.js",
    "../pdoom-ds/lib/pmirror.js",
    "../pdoom-ds/lib/lyric.js"
  ],
  "scenes": [
    "cover"
  ],
  "post": {
    "grain": 0.03,
    "vignette": 0.42
  },
  "background": "#000000",
  "lint": {
    "lineTail": 0.3
  },
  "audioFadeOut": 3.0,
  "timeline": "timeline.js"
};
