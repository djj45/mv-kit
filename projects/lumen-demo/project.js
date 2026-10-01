// Project settings. Keep the object below valid JSON: the Python tools read it too.
// A demo of kits/lumen.js (no song: placeholder lyrics on a 120 bpm grid) — six shots, one per palette / technique.
window.MV_PROJECT = {
  "title": "lumen-demo",
  "from": 0,
  "to": 24,
  "fps": 30,
  "drawRate": 12,
  "bpm": 120,
  "width": 1920,
  "height": 1080,
  "data": [
    "data/lyrics.js"
  ],
  "kits": [
    "lumen"
  ],
  "scripts": [],
  "scenes": [
    "boot",
    "galaxy",
    "arcs",
    "morph",
    "paper",
    "alert"
  ],
  "post": {
    "grain": 0.035,
    "vignette": 0
  },
  "background": "#000000"
};
