// pdoom-ds — "AGI". Every pixel is drawn by code from the song time: WebGL point clouds and hairlines
// (kits/lumen.js) plus Canvas 2D typography. No generated images, no generated video, no still frames.
// The edit is timeline.js, the style law is TREATMENT.md, the shot list is SHOTS.md.
//
// "lint.lineTail": 0.3 — the song sings its lines back to back, so 11 of the 46 lines put their last word
// less than 0.65 s (the framework default) before the next line begins. No cut can change that; 0.3 keeps
// only the two genuinely tight ones ("moon" 280 ms, "Loom" 380 ms) visible as prompts to check by eye.
// Keep the object below valid JSON: the Python tools read it too.
window.MV_PROJECT = {
  "title": "AGI · P(doom)",
  "audio": "../../../pdoom-video/audio/pdoom.mp3",
  "data": [
    "../anime-pdoom/data/audio.js",
    "../anime-pdoom/data/lyrics.js"
  ],
  "from": 0.0,
  "to": 149.5,
  "fps": 30,
  "drawRate": 12,
  "width": 1920,
  "height": 1080,
  "kits": [
    "lumen"
  ],
  "scripts": [
    "../pdoom-akari/lib/fonts.js",
    "lib/ds.js",
    "lib/mind.js",
    "lib/telemetry.js",
    "lib/pmirror.js",
    "lib/lyric.js"
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
  "audioFadeOut": 3.0
};
