// kit-demo — the camera and layout kits, and what `render.py qa` checks, in three short shots on the P(doom) example
// (anime-pdoom's shareable data). Copy from here: every pattern below is the one the user had to ask for by hand in
// projects/pdoom-bolt. Keep the object below valid JSON: the Python tools read it too.
window.MV_PROJECT = {
  "title": "kit demo",
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
  "kits": [
    "camera",
    "layout"
  ],
  "scripts": [
    "lib/demo.js"
  ],
  "scenes": [
    "sheet",
    "fall",
    "board"
  ],
  "post": {
    "grain": 0.03,
    "vignette": 0
  },
  "background": "#EEF0F4"
};
