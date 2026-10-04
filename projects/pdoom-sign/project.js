// pdoom-sign — "SAFETY NOTICE". The whole film is an industrial safety notice: pictogram figures, warning
// triangles, hazard stripes, plates, a P(doom) gauge. Canvas 2D only, no generated images or video.
// Style law: TREATMENT.md (docs/briefs/pdoom-sign/TREATMENT.md). The edit is timeline.js, one file per shot in scenes/.
// Keep the object below valid JSON: the Python tools read it too.
window.MV_PROJECT = {
  "title": "SAFETY NOTICE",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "data": [
    "data/audio.js",
    "../anime-pdoom/data/lyrics.js"
  ],
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
    "lib/sign.js",
    "lib/words.js"
  ],
  "scenes": [
    "cover",
    "nervous",
    "drop",
    "servant",
    "maw",
    "hook",
    "foom",
    "room",
    "mask",
    "eyes",
    "stable",
    "singularity",
    "accel",
    "atoms",
    "sydney",
    "basilisk",
    "moon",
    "omega",
    "flops",
    "checklist",
    "layers",
    "obsolete",
    "leftturn",
    "cdr",
    "gato",
    "clips",
    "exit",
    "fuse",
    "ortho",
    "stack",
    "disobey",
    "fence",
    "gpu",
    "askew",
    "loom",
    "masked",
    "ilya",
    "show",
    "outro"
  ],
  "post": {
    "grain": 0.035,
    "vignette": 0
  },
  "background": "#F2EFE6",
  "qa": {
    "margin": 96,
    "typeRange": 3
  },
  "cutHold": 0.2,
  "lint": {
    "lineTail": 0.3
  }
};
