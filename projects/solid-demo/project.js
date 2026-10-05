// Project settings. Keep the object below valid JSON: the Python tools read it too.
// A demo of kits/solid.js + kits/sim.js on top of lumen.js (no song: placeholder lyrics on a 120 bpm grid) — three
// shots, one per new capability: a glass surface, a raymarched structure, a million-grain simulation.
window.MV_PROJECT = {
  "title": "solid-demo",
  "from": 0,
  "to": 18,
  "fps": 30,
  "drawRate": 12,
  "bpm": 120,
  "width": 1920,
  "height": 1080,
  "data": [
    "data/lyrics.js"
  ],
  "kits": [
    "lumen",
    "solid",
    "sim"
  ],
  "scripts": [],
  "scenes": [
    "glass",
    "lattice",
    "sand"
  ],
  "post": {
    "grain": 0.035,
    "vignette": 0
  },
  "background": "#000000"
};
