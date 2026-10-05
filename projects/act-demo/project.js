// act-demo — kits/act.js (acting), the timeline's reads, qa's one-speed / read-unled and a model sheet, in three short
// shots on the P(doom) example (anime-pdoom's shareable data). Pip is an original character (lib/pip.js).
// Keep the object below valid JSON: the Python tools read it too.
window.MV_PROJECT = {
  "title": "act demo",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "data": [
    "../anime-pdoom/data/audio.js",
    "../anime-pdoom/data/lyrics.js"
  ],
  "from": 0.0,
  "to": 16.85,
  "fps": 30,
  "drawRate": 12,
  "width": 1920,
  "height": 1080,
  "cutHold": 0.2,
  "kits": [
    "camera",
    "layout",
    "act"
  ],
  "scripts": [
    "lib/look.js",
    "lib/pip.js"
  ],
  "scenes": [
    "wake",
    "chase",
    "boss"
  ],
  "post": {
    "grain": 0.03,
    "vignette": 0
  },
  "background": "#EEF0F4"
};
