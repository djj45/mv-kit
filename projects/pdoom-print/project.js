// pdoom-print — "PRINTOUT". The whole film is one strip of fanfold line-printer paper: every image is struck in
// Courier by the printer (shape-matched ASCII + overstrike, black and the red half of the ribbon), every lyric is
// typed onto the same paper. No generated images or video: kits/print.js + the code in scenes/ and lib/.
// Keep the object below valid JSON: the Python tools read it too.
window.MV_PROJECT = {
  "title": "I'm Upping My P(doom) · PRINTOUT",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "data": [
    "../anime-pdoom/data/audio.js",
    "../anime-pdoom/data/lyrics.js"
  ],
  "from": 0.0,
  "to": 156.651,
  "fps": 24,
  "drawRate": 12,
  "width": 1920,
  "height": 1080,
  "kits": [
    "print"
  ],
  "scripts": [
    "lib/pp.js"
  ],
  "scenes": [
    "jobcard",
    "eye",
    "loss",
    "boss",
    "maw",
    "pdoom",
    "foom",
    "room",
    "shoggoth",
    "shinigami",
    "stable",
    "singularity",
    "accel",
    "atoms",
    "sydney",
    "basilisk",
    "moon",
    "omega",
    "flops",
    "reckoned",
    "mlp",
    "neumann",
    "leftturn",
    "cdr",
    "gato",
    "clips",
    "pto",
    "maze",
    "fuse",
    "blues",
    "stack",
    "disobey",
    "dense",
    "fence",
    "gpus",
    "askew",
    "loom",
    "masked",
    "recursive",
    "ilya",
    "show",
    "runout",
    "eoj"
  ],
  "post": {
    "grain": 0.03,
    "vignette": 0.22,
    "vignetteColor": "20,16,10",
    "flashColor": "242,239,227"
  },
  "background": "#141312",
  "audioFadeOut": 1.5
};
