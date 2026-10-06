// Project settings. Keep the object below valid JSON: the Python tools read it too.
// field-demo — three shots about fields, on top of lumen.js + solid.js + sim.js (no song: placeholder lyrics on a
// 120 bpm grid). One field per shot: a magnetic field you can see in iron filings, a minimal surface you can walk
// through, and a flock that is its own field.
window.MV_PROJECT = {
  "title": "field-demo",
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
    "dipole",
    "gyroid",
    "flock"
  ],
  "post": {
    "grain": 0.035,
    "vignette": 0
  },
  "background": "#000000"
};
