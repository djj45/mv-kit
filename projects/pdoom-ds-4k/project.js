// AGI — 4K master for upload. Same edit and same scenes as projects/pdoom-ds; only the raster is bigger.
window.MV_PROJECT = {
  "title": "AGI 4K",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "data": [
    "../anime-pdoom/data/audio.js",
    "../anime-pdoom/data/lyrics.js"
  ],
  "from": 0.0,
  "to": 149.5,
  "fps": 30,
  "drawRate": 12,
  "width": 3840,
  "height": 2160,
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
    "title_rise",
    "agi_boot",
    "nervous",
    "pmirror",
    "loss_drop",
    "servant",
    "eat_alive",
    "hook_pdoom",
    "foom",
    "room_cn",
    "shrooms",
    "shoggoth",
    "shinigami",
    "stable_run",
    "singularity",
    "accel",
    "atoms",
    "sydney",
    "basilisk",
    "nvda",
    "omega",
    "flops",
    "reckoned",
    "backprop",
    "obsolete",
    "leftturn",
    "no_cdr",
    "prompt_plea",
    "paperclips",
    "killswitch",
    "nowhere",
    "fuse",
    "blues",
    "transformers",
    "disobey",
    "dense",
    "fence",
    "gpu",
    "askew",
    "loom",
    "masked",
    "recursive",
    "ilya",
    "show"
  ],
  "post": {
    "grain": 0.035,
    "vignette": 0
  },
  "background": "#000000",
  "lint": {
    "lineTail": 0.3
  },
  "audioFadeOut": 3.0,
  "timeline": "../pdoom-ds/timeline.js"
};
