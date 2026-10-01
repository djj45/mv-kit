// Project settings. Keep the object below valid JSON: the Python tools read it too.
window.MV_PROJECT = {
  "title": "roto-demo",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "from": 112.97,
  "to": 142.06,
  "fps": 24,
  "drawRate": 12,
  "width": 1920,
  "height": 1080,
  "data": [
    "../anime-pdoom/data/audio.js",
    "../anime-pdoom/data/lyrics.js"
  ],
  "kits": [
    "roto"
  ],
  "scripts": [
    "lib/fonts.js",
    "lib/hud.js",
    "frames/I.js",
    "frames/K5.js",
    "frames/J.js",
    "frames/K.js"
  ],
  "scenes": [
    "cockpit",
    "corridor",
    "sea",
    "turn"
  ],
  "post": {
    "grain": 0,
    "vignette": 0,
    "press": {
      "mis": 1.5,
      "grain": 0.03,
      "vig": 0.35
    }
  },
  "background": "#F1ECE1"
};
