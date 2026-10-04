// Project settings. Keep the object below valid JSON: the Python tools read it too.
window.MV_PROJECT = {
  "title": "P(doom) — a lecture in 46 transparencies",
  "audio": "audio/pdoom.mp3",
  "from": 0.0,
  "to": 156.651,
  "fps": 30,
  "drawRate": 12,
  "width": 1920,
  "height": 1080,
  "kits": [
    "camera",
    "layout"
  ],
  "scripts": [
    "lib/ohp.js"
  ],
  "scenes": [
    "room", "circuit", "loss", "boss", "mouth", "hook", "foom", "chinese", "shoggoth", "eyes",
    "stable", "optimize", "atoms", "sydney", "basilisk", "moon", "flops", "reckoned", "net",
    "leftturn", "cdr", "gato", "clips", "fuse", "ortho", "transformers", "fence", "gpu", "rlhf",
    "loom", "ilya", "show", "lampoff", "after", "endcard"
  ],
  "post": {
    "grain": 0.055,
    "vignette": 0.38,
    "vignetteColor": "10,10,16",
    "flashColor": "255,244,222"
  },
  "qa": {
    "margin": 110
  },
  "cutHold": 0.2
};